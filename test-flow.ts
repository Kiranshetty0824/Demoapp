import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();
const SERVER_SECRET = 'qr-hmac-secret-key';

const generateQRPayload = (data: any) => {
  const payload = JSON.stringify({ ...data, timestamp: Date.now() });
  const signature = crypto.createHmac('sha256', SERVER_SECRET).update(payload).digest('hex');
  return JSON.stringify({ payload, signature });
};

async function runTest() {
  console.log('Starting automated test flow (Direct DB)...');
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
    console.log('✅ Admin created');

    // 2. Create Organizer Code
    const orgCode = await prisma.organizerCode.create({
      data: { code: 'ORG123', college: 'IITB', admin_id: admin.id }
    });
    console.log('✅ Organizer code created');

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
    console.log('✅ Organizer registered and mentored by Admin');

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
    console.log('✅ Task assigned to Organizer');

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
    console.log('✅ Event created (Pending Approval)');

    // 6. Admin Approves Event
    await prisma.event.update({
      where: { id: event.id },
      data: { approved: true }
    });
    console.log('✅ Event approved by Admin');

    // 7. Register Student
    const studentUser = await prisma.user.create({
      data: { phone: '1122334455', name: 'Test Student', role: 'STUDENT', college: 'IITB' }
    });
    const student = await prisma.student.create({ data: { user_id: studentUser.id, college: 'IITB' } });
    console.log('✅ Student registered');

    // 8. Book Event
    const booking = await prisma.booking.create({
      data: { user_id: student.id, event_id: event.id, status: 'PAID' }
    });
    console.log('✅ Event booked');

    // 9. Generate Ticket
    const ticket = await prisma.ticket.create({
      data: {
        booking_id: booking.id,
        ticket_code: 'TEST-TKT',
        qr_payload: generateQRPayload({ ticket_id: booking.id, user_id: student.id, event_id: event.id })
      }
    });
    console.log('✅ Ticket generated');

    console.log('🚀 ALL TESTS PASSED SUCCESSFULLY');
  } catch (e) {
    console.error('❌ Test failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
