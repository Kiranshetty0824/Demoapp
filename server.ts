import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { GoogleGenAI } from '@google/genai';
import PDFDocument from 'pdfkit';

// --- CONFIG ---
const prisma = new PrismaClient();
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// --- MIDDLEWARE ---
app.use(helmet({
  contentSecurityPolicy: false, // Disable for Vite dev
}));
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// --- AUTH UTILS ---
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- API ROUTES ---

// Admin: Generate Organizer Code
app.post('/api/admin/generate-code', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'ADMIN') return res.sendStatus(403);
  const { collegeName } = req.body;
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const organizerCode = await prisma.organizerCode.create({
    data: { code, collegeName }
  });
  res.json(organizerCode);
});

// Admin: Assign Task
app.post('/api/admin/tasks', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'ADMIN') return res.sendStatus(403);
  const { title, description, deadline, organizerId } = req.body;
  const admin = await prisma.admin.findUnique({ where: { userId: req.user.id } });
  if (!admin) return res.status(403).json({ error: 'Not an admin' });

  const task = await prisma.task.create({
    data: {
      title,
      description,
      deadline: new Date(deadline),
      organizerId,
      adminId: admin.id
    }
  });
  res.json(task);
});

// Organizer: Get Tasks
app.get('/api/organizer/tasks', authenticateToken, async (req: any, res) => {
  const organizer = await prisma.organizer.findUnique({ where: { userId: req.user.id } });
  if (!organizer) return res.sendStatus(403);
  const tasks = await prisma.task.findMany({
    where: { organizerId: organizer.id },
    include: { admin: { include: { user: true } } }
  });
  res.json(tasks);
});

// Organizer: Get Profile (Admin + Tasks)
app.get('/api/organizer/profile', authenticateToken, async (req: any, res) => {
  const organizer = await prisma.organizer.findUnique({
    where: { userId: req.user.id },
    include: {
      tasks: {
        include: { admin: { include: { user: true } } },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!organizer) return res.sendStatus(404);

  // Find the admin who assigned them (if any)
  let admin = null;
  if (organizer.adminId) {
    admin = await prisma.admin.findUnique({
      where: { id: organizer.adminId },
      include: { user: true }
    });
  }

  res.json({ organizer, admin });
});

// File Upload (Simulated for Banner)
app.post('/api/upload', authenticateToken, async (req: any, res) => {
  // In a real app, use multer and S3. Here we return a placeholder from Picsum based on a random seed
  const seed = Math.random().toString(36).substring(7);
  const url = `https://picsum.photos/seed/${seed}/1200/600`;
  res.json({ url });
});

// Organizer: Mark Attendance
app.post('/api/organizer/scan', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'ORGANIZER') return res.sendStatus(403);
  const { ticketId } = req.body;

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { booking: { include: { student: true, event: true } } }
  });

  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  if (ticket.isScanned) return res.status(400).json({ error: 'Ticket already scanned' });

  // Mark as scanned
  await prisma.ticket.update({
    where: { id: ticketId },
    data: { isScanned: true, scannedAt: new Date() }
  });

  // Record Attendance
  await prisma.attendance.create({
    data: {
      studentId: ticket.booking.studentId,
      eventId: ticket.booking.eventId
    }
  });

  res.json({ success: true, student: ticket.booking.student });
});

// PDF Generation (Ticket)
app.get('/api/tickets/:id/pdf', async (req, res) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: req.params.id },
    include: { booking: { include: { student: { include: { user: true } }, event: true } } }
  });

  if (!ticket) return res.status(404).send('Ticket not found');

  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=ticket-${ticket.id}.pdf`);
  doc.pipe(res);

  doc.fontSize(25).text('COLLEVENTO TICKET', { align: 'center' });
  doc.moveDown();
  doc.fontSize(16).text(`Event: ${ticket.booking.event.title}`);
  doc.text(`Student: ${ticket.booking.student.user.fullName || 'Student'}`);
  doc.text(`Venue: ${ticket.booking.event.venue}`);
  doc.text(`Date: ${ticket.booking.event.date.toDateString()}`);
  doc.moveDown();
  doc.text(`Ticket ID: ${ticket.id}`, { align: 'center' });
  doc.end();
});

// Auth
app.post('/api/auth/guest', async (req, res) => {
  const user = await prisma.user.create({
    data: { role: 'GUEST' }
  });
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
  res.json({ token, user });
});

app.post('/api/auth/otp/send', async (req, res) => {
  const { phone } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await prisma.oTPLog.create({
    data: {
      phone,
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    }
  });
  console.log(`[OTP] Sent ${otp} to ${phone}`); // Mock Twilio
  res.json({ message: 'OTP sent' });
});

app.post('/api/auth/otp/verify', async (req, res) => {
  const { phone, otp } = req.body;
  const log = await prisma.oTPLog.findFirst({
    where: { phone, otp, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' }
  });

  if (!log) return res.status(400).json({ error: 'Invalid or expired OTP' });

  let user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    user = await prisma.user.create({ data: { phone, role: 'STUDENT' } });
  }

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
  res.json({ token, user });
});

// Events
app.get('/api/events', async (req, res) => {
  const events = await prisma.event.findMany({
    where: { status: 'APPROVED' },
    include: { 
      organizer: { include: { user: true } },
      _count: { select: { bookings: true } }
    }
  });
  res.json(events);
});

app.get('/api/events/:id', async (req, res) => {
  const event = await prisma.event.findUnique({
    where: { id: req.params.id },
    include: { 
      organizer: { include: { user: true } },
      _count: { select: { bookings: true } }
    }
  });
  res.json(event);
});

app.post('/api/events', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'ORGANIZER') return res.sendStatus(403);
  const organizer = await prisma.organizer.findUnique({ where: { userId: req.user.id } });
  if (!organizer || !organizer.isApproved) return res.status(403).json({ error: 'Organizer not approved' });

  const event = await prisma.event.create({
    data: {
      ...req.body,
      organizerId: organizer.id,
      status: 'PENDING'
    }
  });
  res.json(event);
});

// Bookings
app.post('/api/bookings', authenticateToken, async (req: any, res) => {
  const { eventId } = req.body;
  const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
  if (!student) return res.status(400).json({ error: 'Not a student' });

  const booking = await prisma.booking.create({
    data: {
      studentId: student.id,
      eventId,
      status: 'PAID' // Mocking successful payment for now
    }
  });

  // Generate Ticket
  const ticket = await prisma.ticket.create({
    data: {
      bookingId: booking.id,
      qrCode: `TICKET-${booking.id}-${Date.now()}` // Simplified HMAC for demo
    }
  });

  res.json({ booking, ticket });
});

// Organizer Dashboard Stats
app.get('/api/organizer/stats', authenticateToken, async (req: any, res) => {
  const organizer = await prisma.organizer.findUnique({ where: { userId: req.user.id } });
  if (!organizer) return res.sendStatus(403);

  const events = await prisma.event.findMany({ where: { organizerId: organizer.id } });
  const eventIds = events.map(e => e.id);
  
  const bookings = await prisma.booking.findMany({ where: { eventId: { in: eventIds } } });
  const attendance = await prisma.attendance.findMany({ where: { eventId: { in: eventIds } } });

  res.json({
    totalEvents: events.length,
    totalRegistrations: bookings.length,
    totalRevenue: bookings.reduce((acc, curr) => acc + 100, 0), // Mock price
    attendanceRate: bookings.length > 0 ? (attendance.length / bookings.length) * 100 : 0
  });
});

// --- SOCKET.IO ---
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('chat:message', async (data) => {
    const { userId, message } = data;
    
    // Save user message
    await prisma.chatMessage.create({
      data: { userId, message, role: 'user' }
    });

    // Gemini Response
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: message,
      config: {
        systemInstruction: "You are COLLEVENTO AI, a helpful assistant for a college event platform. Help students with bookings and organizers with management."
      }
    });

    const aiMessage = response.text || "I'm sorry, I couldn't process that.";
    
    // Save AI message
    await prisma.chatMessage.create({
      data: { userId, message: aiMessage, role: 'assistant' }
    });

    socket.emit('chat:response', { message: aiMessage });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// --- VITE SETUP ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => res.sendFile(path.resolve('dist', 'index.html')));
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
