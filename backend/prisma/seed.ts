import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding College Verification Database...');

  const passwordHash = await bcrypt.hash('Password@123', 10);

  // 1. Seed Principal (Super Admin)
  const principal = await prisma.user.upsert({
    where: { email: 'principal@college.edu' },
    update: {},
    create: {
      email: 'principal@college.edu',
      phoneNumber: '9876543210',
      passwordHash,
      role: 'SUPER_ADMIN',
    },
  });
  console.log('Seeded Principal (Super Admin): principal@college.edu');

  // 2. Seed Office Staff (Admin)
  const officeAdmin = await prisma.user.upsert({
    where: { email: 'admin@college.edu' },
    update: {},
    create: {
      email: 'admin@college.edu',
      phoneNumber: '9876543211',
      passwordHash,
      role: 'ADMIN',
    },
  });
  console.log('Seeded Office Admin: admin@college.edu');

  // 3. Seed Sample Student 1: Ananya Joseph (BCA 2024-2028, Christian, Female, EWS = true)
  const s1User = await prisma.user.upsert({
    where: { email: 'ananya.joseph@student.college.edu' },
    update: {},
    create: {
      email: 'ananya.joseph@student.college.edu',
      phoneNumber: '9876543212',
      passwordHash,
      role: 'STUDENT',
      studentProfile: {
        create: {
          firstName: 'Ananya',
          lastName: 'Joseph',
          admissionNumber: '24BCA001',
          address: 'House #42, St. Marys Lane, Kochi, Kerala',
          bloodGroup: 'O+',
          timePeriodOfStudy: '2024-2028',
          firstNameMalayalam: 'അനന്യ',
          lastNameMalayalam: 'ജോസഫ്',
          permanentAddress: 'House #42, St. Marys Lane, Kochi, Kerala - 682001',
          courseAdmitted: 'BCA',
          quota: 'Merit',
          gender: 'Female',
          dob: '2006-05-14',
          nationality: 'Indian',
          religion: 'Christian',
          caste: 'RCSC',
          annualIncome: 85000,
          isEws: true, // Income < 100000
          parentName: 'Joseph K',
          parentOccupation: 'Farmer',
          guardianName: 'Joseph K',
          guardianOccupation: 'Farmer',
          bankAccountName: 'Ananya Joseph',
          bankName: 'State Bank of India',
          bankBranch: 'MG Road, Kochi',
          bankAccountNumber: '38192039102',
          bankIfscCode: 'SBIN0001234',
          prevInstitutionName: 'St. Teresa Higher Secondary School',
          prevCourse: 'Computer Science',
          prevRegisterNumber: 'PLUS2-2024-8901',
          prevBoardUniversity: 'Kerala State Board (DHSE)',
          prevPeriodOfStudy: '2022-2024',
          prevPercentage: 92.5,
          apaarId: 'APAAR-9812-4012-3391',
          verificationStatus: 'SUBMITTED',
        },
      },
    },
  });
  console.log('Seeded Student 1: Ananya Joseph (24BCA001)');

  // 4. Seed Sample Student 2: Rahul Nair (BCA 2024-2028, Hindu, Male, EWS = false)
  const s2User = await prisma.user.upsert({
    where: { email: 'rahul.nair@student.college.edu' },
    update: {},
    create: {
      email: 'rahul.nair@student.college.edu',
      phoneNumber: '9876543213',
      passwordHash,
      role: 'STUDENT',
      studentProfile: {
        create: {
          firstName: 'Rahul',
          lastName: 'Nair',
          admissionNumber: '24BCA002',
          address: 'Krishnan Kripa, Trivandrum, Kerala',
          bloodGroup: 'A+',
          timePeriodOfStudy: '2024-2028',
          firstNameMalayalam: 'രാഹുൽ',
          lastNameMalayalam: 'നായർ',
          permanentAddress: 'Krishnan Kripa, Palayam, Trivandrum - 695001',
          courseAdmitted: 'BCA',
          quota: 'Management',
          gender: 'Male',
          dob: '2006-03-22',
          nationality: 'Indian',
          religion: 'Hindu',
          caste: 'Nair',
          annualIncome: 240000,
          isEws: false,
          parentName: 'Krishnan Nair',
          parentOccupation: 'Accountant',
          guardianName: 'Krishnan Nair',
          guardianOccupation: 'Accountant',
          bankAccountName: 'Rahul Nair',
          bankName: 'Federal Bank',
          bankBranch: 'Palayam Branch',
          bankAccountNumber: '10293847561',
          bankIfscCode: 'FDRL0001002',
          prevInstitutionName: 'Model Boys HSS',
          prevCourse: 'BioMath',
          prevRegisterNumber: 'PLUS2-2024-5512',
          prevBoardUniversity: 'Kerala State Board (DHSE)',
          prevPeriodOfStudy: '2022-2024',
          prevPercentage: 81.2,
          apaarId: 'APAAR-4491-1029-8812',
          verificationStatus: 'CORRECTION_REQUIRED',
          fieldFlags: JSON.stringify({
            prevPercentage: {
              status: 'FLAGGED_ERROR',
              reason: 'Plus Two certificate indicates 81.2% while 85% was entered initially. Please verify.',
              flaggedAt: new Date().toISOString(),
            },
          }),
        },
      },
    },
  });
  console.log('Seeded Student 2: Rahul Nair (24BCA002)');

  // 5. Seed Sample Student 3: Muhammed Rafi (B.Com 2024-2027, Muslim, Male, EWS = true)
  const s3User = await prisma.user.upsert({
    where: { email: 'muhammed.rafi@student.college.edu' },
    update: {},
    create: {
      email: 'muhammed.rafi@student.college.edu',
      phoneNumber: '9876543214',
      passwordHash,
      role: 'STUDENT',
      studentProfile: {
        create: {
          firstName: 'Muhammed',
          lastName: 'Rafi',
          admissionNumber: '24BCM015',
          address: 'Baitul Noor, Calicut, Kerala',
          bloodGroup: 'B+',
          timePeriodOfStudy: '2024-2027',
          firstNameMalayalam: 'മുഹമ്മദ്',
          lastNameMalayalam: 'റാഫി',
          permanentAddress: 'Baitul Noor, Beach Road, Calicut - 673001',
          courseAdmitted: 'B.Com',
          quota: 'Merit',
          gender: 'Male',
          dob: '2005-11-08',
          nationality: 'Indian',
          religion: 'Muslim',
          caste: 'Mappila',
          annualIncome: 60000,
          isEws: true,
          parentName: 'Abdul Khader',
          parentOccupation: 'Driver',
          guardianName: 'Abdul Khader',
          guardianOccupation: 'Driver',
          bankAccountName: 'Muhammed Rafi',
          bankName: 'Canara Bank',
          bankBranch: 'Calicut Main',
          bankAccountNumber: '55123984710',
          bankIfscCode: 'CNRB0002100',
          prevInstitutionName: 'Govt. Model HSS Calicut',
          prevCourse: 'Commerce',
          prevRegisterNumber: 'PLUS2-2024-1188',
          prevBoardUniversity: 'Kerala State Board (DHSE)',
          prevPeriodOfStudy: '2022-2024',
          prevPercentage: 88.0,
          apaarId: 'APAAR-7712-9901-2244',
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(),
        },
      },
    },
  });
  console.log('Seeded Student 3: Muhammed Rafi (24BCM015)');

  console.log('Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
