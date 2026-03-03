import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { GoogleGenAI } from '@google/genai';
import PDFDocument from 'pdfkit';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import multer from 'multer';
import cron from 'node-cron';
import QRCode from 'qrcode';

// --- CONFIG ---
const prisma = new PrismaClient();
const app = express();
app.set('trust proxy', 1);
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'collevento-prod-secret-2026';
const SERVER_SECRET = process.env.SERVER_SECRET || 'qr-hmac-secret-key';

// --- DIRECTORY SETUP ---
const UPLOAD_DIRS = [
  'public/uploads/event-banners',
  'public/uploads/payment-qr',
  'public/uploads/certificate-templates',
  'public/uploads/ticket-pdfs',
  'public/uploads/certificate-pdfs',
  'public/uploads/payment-proofs'
];

UPLOAD_DIRS.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// --- MULTER SETUP ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const bucket = req.body.bucket || 'event-banners';
    cb(null, `public/uploads/${bucket}`);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// --- MIDDLEWARE ---
app.use(helmet({
  contentSecurityPolicy: false, 
}));
app.use(cors());
app.use(express.json());
app.use('/public', express.static('public'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
});
app.use('/api/', limiter);

// --- SERVER STARTUP ---
async function ensureAdminCode() {
  try {
    const count = await prisma.adminCode.count();
    if (count === 0) {
      const hash = await bcrypt.hash('kiru@08', 10);
      await prisma.adminCode.create({ data: { code_hash: hash } });
      console.log('Default Admin Code created: kiru@08');
    }
  } catch (e) {
    console.error('Failed to ensure admin code:', e);
  }
}
ensureAdminCode();

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

const generateQRPayload = (data: any) => {
  const payload = JSON.stringify({ ...data, timestamp: Date.now() });
  const signature = crypto.createHmac('sha256', SERVER_SECRET).update(payload).digest('hex');
  return JSON.stringify({ payload, signature });
};

const verifyQRPayload = (qrString: string) => {
  try {
    const { payload, signature } = JSON.parse(qrString);
    const expectedSignature = crypto.createHmac('sha256', SERVER_SECRET).update(payload).digest('hex');
    if (signature !== expectedSignature) return null;
    return JSON.parse(payload);
  } catch (e) {
    return null;
  }
};

// --- API ROUTES ---

// 1. Auth: OTP Send
app.post('/api/auth/otp/send', async (req, res) => {
  const { phone } = req.body;
  const otp = '0808'; // Fixed for testing as requested
  await prisma.oTPLog.create({
    data: {
      phone,
      otp,
      expires_at: new Date(Date.now() + 5 * 60 * 1000)
    }
  });
  console.log(`[TESTING OTP] Fixed OTP 0808 for ${phone}`); 
  res.json({ message: 'OTP sent successfully' });
});

// 2. Auth: OTP Verify & Registration
app.post('/api/auth/otp/verify', async (req, res) => {
  const { phone, otp, name, email, college, role, adminCode, orgCode } = req.body;
  
  // If it's a firebase-backed request (mocked OTP), we skip OTP check
  if (otp !== '0808') {
    const log = await prisma.oTPLog.findFirst({
      where: { phone, otp, expires_at: { gt: new Date() } },
      orderBy: { created_at: 'desc' }
    });
    if (!log) return res.status(400).json({ error: 'Invalid or expired OTP' });
  }

  let user = await prisma.user.findFirst({ 
    where: { 
      OR: [
        { phone: phone },
        { email: phone }
      ]
    } 
  });

  // If user exists, just log them in
  if (user && !name) {
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
    return res.json({ token, user });
  }

  // If user doesn't exist and no info provided, signal frontend to ask for info
  if (!user && !name) {
    return res.json({ success: true, newUser: true });
  }

  // Registration Flow
  if (!user) {
    // Admin Code Check
    if (role === 'ADMIN') {
      if (!adminCode) return res.status(400).json({ error: 'Admin access code required' });
      const codes = await prisma.adminCode.findMany();
      let valid = false;
      for (const c of codes) {
        if (await bcrypt.compare(adminCode, c.code_hash)) {
          valid = true;
          break;
        }
      }
      if (!valid) return res.status(403).json({ error: 'Invalid admin access code' });
    }

    // Organizer Code Check
    let mentorAdminId = null;
    if (role === 'ORGANIZER') {
      if (!orgCode) return res.status(400).json({ error: 'Organizer registration code required' });
      const validCode = await prisma.organizerCode.findUnique({ where: { code: orgCode, active: true } });
      if (!validCode) return res.status(403).json({ error: 'Invalid or inactive organizer code' });
      mentorAdminId = validCode.admin_id;
    }

    user = await prisma.user.create({
      data: {
        phone,
        email,
        name,
        college,
        role,
        phone_verified: true,
        email_verified: false
      }
    });

    // Create role specific records
    if (role === 'STUDENT') {
      await prisma.student.create({ data: { user_id: user.id, college } });
    } else if (role === 'ORGANIZER') {
      await prisma.organizer.create({ 
        data: { 
          user_id: user.id, 
          college, 
          approved: true, 
          admin_id: mentorAdminId 
        } 
      });
      // Deactivate the code after use
      await prisma.organizerCode.update({
        where: { code: orgCode },
        data: { active: false }
      });
    } else if (role === 'ADMIN') {
      await prisma.admin.create({ data: { user_id: user.id, college } });
    }
  }

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
  res.json({ token, user });
});

// 3. Auth: Guest Login
app.post('/api/auth/guest', async (req, res) => {
  const user = await prisma.user.create({
    data: {
      role: 'GUEST',
      name: 'Guest User',
      college: 'Public'
    }
  });
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
  res.json({ token, user });
});

// 4. Admin: Organizer Management
app.get('/api/admin/organizers', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'ADMIN') return res.sendStatus(403);
  const admin = await prisma.admin.findUnique({ where: { user_id: req.user.id } });
  if (!admin) return res.sendStatus(403);

  const organizers = await prisma.organizer.findMany({
    where: { admin_id: admin.id },
    include: { user: true }
  });
  res.json(organizers);
});

app.delete('/api/admin/organizers/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'ADMIN') return res.sendStatus(403);
  const admin = await prisma.admin.findUnique({ where: { user_id: req.user.id } });
  if (!admin) return res.sendStatus(403);

  // Ensure this admin is the mentor
  const organizer = await prisma.organizer.findUnique({ where: { id: req.params.id } });
  if (!organizer || organizer.admin_id !== admin.id) return res.sendStatus(403);

  await prisma.organizer.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

app.post('/api/admin/organizer-codes', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'ADMIN') return res.sendStatus(403);
  const { college, code } = req.body;
  const admin = await prisma.admin.findUnique({ where: { user_id: req.user.id } });
  if (!admin) return res.sendStatus(403);

  const orgCode = await prisma.organizerCode.create({
    data: {
      code,
      college,
      admin_id: admin.id
    }
  });
  res.json(orgCode);
});

app.get('/api/admin/events/pending', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'ADMIN') return res.sendStatus(403);
  const admin = await prisma.admin.findUnique({ where: { user_id: req.user.id } });
  if (!admin) return res.sendStatus(403);

  const events = await prisma.event.findMany({
    where: { 
      approved: false,
      organizer: { admin_id: admin.id }
    },
    include: { organizer: { include: { user: true } } }
  });
  res.json(events);
});

app.post('/api/admin/tasks', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'ADMIN') return res.sendStatus(403);
  const { title, description, deadline, organizer_id } = req.body;
  const admin = await prisma.admin.findUnique({ where: { user_id: req.user.id } });
  if (!admin) return res.sendStatus(403);

  const task = await prisma.task.create({
    data: {
      title,
      description,
      deadline: new Date(deadline),
      organizer_id,
      admin_id: admin.id
    }
  });
  res.json(task);
});

// 5. Organizer: Register with Code
app.post('/api/organizer/register-code', authenticateToken, async (req: any, res) => {
  const { code } = req.body;
  const orgCode = await prisma.organizerCode.findUnique({ where: { code, active: true } });
  if (!orgCode) return res.status(400).json({ error: 'Invalid or inactive code' });

  const organizer = await prisma.organizer.findUnique({ where: { user_id: req.user.id } });
  if (!organizer) return res.status(400).json({ error: 'User is not an organizer' });

  await prisma.organizer.update({
    where: { id: organizer.id },
    data: { approved: true, admin_id: orgCode.admin_id }
  });

  await prisma.organizerCode.update({
    where: { id: orgCode.id },
    data: { active: false }
  });

  res.json({ success: true });
});

// 6. Events: Management
app.get('/api/events', async (req, res) => {
  const events = await prisma.event.findMany({
    where: { approved: true },
    include: { organizer: { include: { user: true } }, _count: { select: { bookings: true } } }
  });
  res.json(events);
});

app.post('/api/events', authenticateToken, upload.single('banner'), async (req: any, res) => {
  if (req.user.role !== 'ORGANIZER') return res.sendStatus(403);
  const organizer = await prisma.organizer.findUnique({ where: { user_id: req.user.id } });
  if (!organizer || !organizer.approved) return res.status(403).json({ error: 'Organizer not approved' });

  const { title, description, category, venue, date, time, capacity, price } = req.body;
  const banner_url = req.file ? `/public/uploads/event-banners/${req.file.filename}` : null;

  const event = await prisma.event.create({
    data: {
      title,
      description,
      category,
      venue,
      date: new Date(date),
      time,
      capacity: parseInt(capacity),
      price: parseFloat(price),
      banner_url,
      organizer_id: organizer.id,
      approved: false // Requires admin approval
    }
  });
  res.json(event);
});

app.patch('/api/admin/events/:id/approve', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'ADMIN') return res.sendStatus(403);
  const admin = await prisma.admin.findUnique({ where: { user_id: req.user.id } });
  if (!admin) return res.sendStatus(403);

  const event = await prisma.event.findUnique({ 
    where: { id: req.params.id },
    include: { organizer: true }
  });

  if (!event || event.organizer.admin_id !== admin.id) {
    return res.status(403).json({ error: 'Unauthorized to approve this event' });
  }

  const updatedEvent = await prisma.event.update({
    where: { id: req.params.id },
    data: { approved: true }
  });
  io.emit('event:approved', updatedEvent);
  res.json(updatedEvent);
});

app.delete('/api/admin/events/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'ADMIN') return res.sendStatus(403);
  const admin = await prisma.admin.findUnique({ where: { user_id: req.user.id } });
  if (!admin) return res.sendStatus(403);

  const event = await prisma.event.findUnique({ 
    where: { id: req.params.id },
    include: { organizer: true }
  });

  if (!event || event.organizer.admin_id !== admin.id) {
    return res.status(403).json({ error: 'Unauthorized to reject this event' });
  }

  await prisma.event.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// 7. Bookings & Payments
app.post('/api/bookings', authenticateToken, async (req: any, res) => {
  const { event_id } = req.body;
  const student = await prisma.student.findUnique({ where: { user_id: req.user.id } });
  if (!student) return res.status(400).json({ error: 'Only students can book' });

  const event = await prisma.event.findUnique({ where: { id: event_id } });
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const booking = await prisma.booking.create({
    data: {
      user_id: student.id,
      event_id,
      status: 'PENDING'
    }
  });

  // Create Payment record
  await prisma.payment.create({
    data: {
      booking_id: booking.id,
      amount: event.price,
      status: 'PENDING'
    }
  });

  res.json(booking);
});

app.post('/api/payments/verify', authenticateToken, upload.single('proof'), async (req: any, res) => {
  const { booking_id } = req.body;
  const proof_url = req.file ? `/public/uploads/payment-proofs/${req.file.filename}` : null;

  const payment = await prisma.payment.update({
    where: { booking_id },
    data: { status: 'PAID', proof_url }
  });

  const booking = await prisma.booking.update({
    where: { id: booking_id },
    data: { status: 'PAID' },
    include: { event: true, student: { include: { user: true } } }
  });

  // Generate Ticket
  const ticket_code = `TKT-${booking.id.substring(0, 8)}-${Date.now()}`;
  const qr_payload = generateQRPayload({
    ticket_id: booking.id,
    user_id: booking.user_id,
    event_id: booking.event_id
  });

  const ticket = await prisma.ticket.create({
    data: {
      booking_id: booking.id,
      ticket_code,
      qr_payload
    }
  });

  // Generate PDF
  const pdfPath = `public/uploads/ticket-pdfs/ticket-${ticket.id}.pdf`;
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(pdfPath));
  doc.fontSize(25).text('COLLEVENTO TICKET', { align: 'center' });
  doc.moveDown();
  doc.fontSize(14).text(`Event: ${booking.event.title}`);
  doc.text(`Student: ${booking.student.user.name}`);
  doc.text(`Venue: ${booking.event.venue}`);
  doc.text(`Date: ${booking.event.date.toDateString()} at ${booking.event.time}`);
  doc.text(`Ticket Code: ${ticket_code}`);
  
  // Add QR Code
  const qrDataUrl = await QRCode.toDataURL(qr_payload);
  doc.image(qrDataUrl, { fit: [150, 150], align: 'center' });
  
  doc.end();

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { pdf_url: `/${pdfPath}` }
  });

  io.emit('booking:new', { event_id: booking.event_id });
  res.json({ ticket });
});

// 8. Attendance Scanning
app.post('/api/attendance/scan', authenticateToken, async (req: any, res) => {
  const { qr_payload } = req.body;
  const data = verifyQRPayload(qr_payload);
  if (!data) return res.status(400).json({ error: 'Invalid QR signature' });

  const ticket = await prisma.ticket.findUnique({
    where: { booking_id: data.ticket_id },
    include: { booking: { include: { student: { include: { user: true } } } } }
  });

  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  if (ticket.attended) return res.status(400).json({ error: 'Already attended' });

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { attended: true }
  });

  await prisma.attendance.create({
    data: {
      ticket_id: ticket.id,
      event_id: data.event_id,
      scanned_by: req.user.id
    }
  });

  // Generate Certificate automatically after attendance
  const certPath = `public/uploads/certificate-pdfs/cert-${ticket.id}.pdf`;
  const doc = new PDFDocument({ layout: 'landscape' });
  doc.pipe(fs.createWriteStream(certPath));
  doc.fontSize(40).text('CERTIFICATE OF PARTICIPATION', { align: 'center' });
  doc.moveDown();
  doc.fontSize(20).text('This is to certify that', { align: 'center' });
  doc.fontSize(30).text(ticket.booking.student.user.name || 'Student', { align: 'center', underline: true });
  doc.fontSize(20).text(`has successfully participated in ${data.event_id}`, { align: 'center' });
  doc.end();

  await prisma.certificate.create({
    data: {
      ticket_id: ticket.id,
      pdf_url: `/${certPath}`
    }
  });

  io.emit('attendance:updated', { event_id: data.event_id });
  res.json({ success: true, student: ticket.booking.student.user });
});

// 9. Dashboards
app.get('/api/dashboards/student', authenticateToken, async (req: any, res) => {
  const student = await prisma.student.findUnique({
    where: { user_id: req.user.id },
    include: { bookings: { include: { event: true, ticket: true } } }
  });
  res.json(student);
});

app.get('/api/dashboards/organizer', authenticateToken, async (req: any, res) => {
  const organizer = await prisma.organizer.findUnique({
    where: { user_id: req.user.id },
    include: { events: { include: { _count: { select: { bookings: true } } } }, tasks: true }
  });
  res.json(organizer);
});

app.patch('/api/organizer/tasks/:id/complete', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'ORGANIZER') return res.sendStatus(403);
  const organizer = await prisma.organizer.findUnique({ where: { user_id: req.user.id } });
  if (!organizer) return res.sendStatus(403);

  const task = await prisma.task.update({
    where: { id: req.params.id, organizer_id: organizer.id },
    data: { status: 'COMPLETED' }
  });
  res.json(task);
});

app.get('/api/dashboards/admin', authenticateToken, async (req: any, res) => {
  const stats = {
    totalUsers: await prisma.user.count(),
    totalEvents: await prisma.event.count(),
    pendingEvents: await prisma.event.count({ where: { approved: false } }),
    totalBookings: await prisma.booking.count()
  };
  res.json(stats);
});

// 10. Automated Test Flow
app.post('/api/test/flow', async (req, res) => {
  try {
    // Cleanup
    await prisma.certificate.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.event.deleteMany();
    await prisma.task.deleteMany();
    await prisma.organizer.deleteMany();
    await prisma.student.deleteMany();
    await prisma.admin.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organizerCode.deleteMany();

    // 1. Create Admin
    const adminUser = await prisma.user.create({
      data: { phone: '1234567890', name: 'Test Admin', role: 'ADMIN', college: 'IITB' }
    });
    const admin = await prisma.admin.create({ data: { user_id: adminUser.id, college: 'IITB' } });

    // 2. Create Organizer Code
    const orgCode = await prisma.organizerCode.create({
      data: { code: 'ORG123', college: 'IITB', admin_id: admin.id }
    });

    // 3. Register Organizer
    const orgUser = await prisma.user.create({
      data: { phone: '0987654321', name: 'Test Org', role: 'ORGANIZER', college: 'IITB' }
    });
    const organizer = await prisma.organizer.create({ 
      data: { 
        user_id: orgUser.id, 
        college: 'IITB', 
        approved: true, 
        admin_id: admin.id 
      } 
    });

    // 4. Create Task for Organizer
    await prisma.task.create({
      data: {
        title: 'Setup Event',
        description: 'Prepare the hall',
        deadline: new Date(Date.now() + 86400000),
        organizer_id: organizer.id,
        admin_id: admin.id
      }
    });

    // 5. Create Event (Pending Approval)
    const event = await prisma.event.create({
      data: {
        title: 'Test Event',
        description: 'Test Desc',
        category: 'Tech',
        venue: 'Hall A',
        date: new Date(),
        time: '10:00 AM',
        capacity: 100,
        price: 0,
        organizer_id: organizer.id,
        approved: false
      }
    });

    // 6. Admin Approves Event
    await prisma.event.update({
      where: { id: event.id },
      data: { approved: true }
    });

    // 7. Register Student
    const studentUser = await prisma.user.create({
      data: { phone: '1122334455', name: 'Test Student', role: 'STUDENT', college: 'IITB' }
    });
    const student = await prisma.student.create({ data: { user_id: studentUser.id, college: 'IITB' } });

    // 8. Book Event
    const booking = await prisma.booking.create({
      data: { user_id: student.id, event_id: event.id, status: 'PAID' }
    });

    // 9. Generate Ticket
    const ticket = await prisma.ticket.create({
      data: {
        booking_id: booking.id,
        ticket_code: 'TEST-TKT',
        qr_payload: generateQRPayload({ ticket_id: booking.id, user_id: student.id, event_id: event.id })
      }
    });

    res.json({ success: true, message: 'End-to-end test flow completed successfully' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- CRON JOBS ---
cron.schedule('0 0 * * *', async () => {
  // Clean expired OTPs
  await prisma.oTPLog.deleteMany({ where: { expires_at: { lt: new Date() } } });
  console.log('Cron: Cleaned expired OTPs');
});

// --- SOCKET.IO ---
io.on('connection', (socket) => {
  socket.on('chat:message', async (data) => {
    const { userId, message } = data;
    await prisma.chatMessage.create({ data: { user_id: userId, message, role: 'user' } });
    
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: message,
      config: { systemInstruction: "You are COLLEVENTO AI. Help users with event management." }
    });
    
    const aiMsg = response.text || "Error processing request";
    await prisma.chatMessage.create({ data: { user_id: userId, message: aiMsg, role: 'assistant' } });
    socket.emit('chat:response', { message: aiMsg });
  });
});

// --- VITE SETUP ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
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
