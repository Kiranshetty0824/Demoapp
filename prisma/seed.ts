import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clean up
  await prisma.attendance.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.event.deleteMany();
  await prisma.organizer.deleteMany();
  await prisma.student.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding data...');

  // Create Admin
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@college.edu',
      fullName: 'Admin User',
      collegeName: 'IIT Bombay',
      role: 'ADMIN',
      isVerified: true,
      admin: {
        create: { collegeName: 'IIT Bombay' }
      }
    }
  });

  // Create Organizer
  const organizerUser = await prisma.user.create({
    data: {
      email: 'organizer@college.edu',
      fullName: 'Event Lead',
      collegeName: 'IIT Bombay',
      role: 'ORGANIZER',
      isVerified: true,
      organizer: {
        create: { collegeName: 'IIT Bombay', isApproved: true }
      }
    }
  });

  const organizer = await prisma.organizer.findFirst({ where: { userId: organizerUser.id } });

  // Create Events
  await prisma.event.createMany({
    data: [
      {
        title: 'TechX 2024',
        description: 'The ultimate technical symposium featuring hackathons, coding challenges, and tech talks from industry leaders.',
        date: new Date('2024-10-15T09:00:00Z'),
        venue: 'Main Auditorium',
        category: 'Technical',
        capacity: 500,
        price: 299,
        bannerUrl: 'https://picsum.photos/seed/tech/1200/600',
        status: 'APPROVED',
        organizerId: organizer!.id
      },
      {
        title: 'Rhythm & Beats',
        description: 'A grand cultural night showcasing the best of music, dance, and drama from across the campus.',
        date: new Date('2024-10-20T18:00:00Z'),
        venue: 'Open Air Theater',
        category: 'Cultural',
        capacity: 1000,
        price: 150,
        bannerUrl: 'https://picsum.photos/seed/dance/1200/600',
        status: 'APPROVED',
        organizerId: organizer!.id
      },
      {
        title: 'Startup Pitch Fest',
        description: 'Pitch your ideas to real investors and win seed funding for your college startup.',
        date: new Date('2024-11-05T10:00:00Z'),
        venue: 'Seminar Hall 1',
        category: 'Entrepreneurship',
        capacity: 200,
        price: 0,
        bannerUrl: 'https://picsum.photos/seed/startup/1200/600',
        status: 'APPROVED',
        organizerId: organizer!.id
      }
    ]
  });

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
