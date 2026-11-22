import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import dns from 'dns';

// Ensure Windows environments resolve MongoDB Atlas SRV records
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

import User from '../models/User.js';
import EmergencyContact from '../models/EmergencyContact.js';
import GuardianConnection from '../models/GuardianConnection.js';
import Incident from '../models/Incident.js';
import Helpline from '../models/Helpline.js';
import Emergency from '../models/Emergency.js';

dotenv.config();

const seedData = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/narisafe';

  try {
    await mongoose.connect(mongoUri, {
      dbName: 'narisafe',
      serverSelectionTimeoutMS: 10000,
    });
    console.log('[NariSafe Seeder] Connected to MongoDB Atlas successfully.');

    // Clear existing collections
    await User.deleteMany({});
    await EmergencyContact.deleteMany({});
    await GuardianConnection.deleteMany({});
    await Incident.deleteMany({});
    await Helpline.deleteMany({});
    await Emergency.deleteMany({});

    console.log('[NariSafe Seeder] Cleared existing records.');

    // Passwords
    const adminPass = await bcrypt.hash('Admin@123', 10);
    const userPass = await bcrypt.hash('User@123', 10);
    const guardianPass = await bcrypt.hash('Guardian@123', 10);

    // 1. Create Users
    const admin = await User.create({
      name: 'NariSafe Administrator',
      email: 'admin@narisafe.org',
      passwordHash: adminPass,
      phone: '+91 98765 00000',
      role: 'admin',
      safetyStatus: 'safe',
    });

    const priya = await User.create({
      name: 'Priya Sharma',
      email: 'priya@narisafe.org',
      passwordHash: userPass,
      phone: '+91 98765 11111',
      role: 'user',
      safetyStatus: 'safe',
      emergencyInfo: {
        bloodGroup: 'B+',
        medicalNotes: 'Asthmatic, carries inhaler',
        homeAddress: 'Apt 402, Green Glen Layout, Bengaluru',
      },
      lastKnownLocation: {
        latitude: 28.6139,
        longitude: 77.2090,
        address: 'Janpath Road, Connaught Place, New Delhi',
        updatedAt: new Date(),
      },
    });

    const rajesh = await User.create({
      name: 'Rajesh Sharma',
      email: 'rajesh@narisafe.org',
      passwordHash: guardianPass,
      phone: '+91 98765 22222',
      role: 'guardian',
      safetyStatus: 'safe',
    });

    console.log('[NariSafe Seeder] Seeded Users (Admin, User, Guardian).');

    // 2. Emergency Contacts for Priya
    await EmergencyContact.create({
      userId: priya._id,
      name: 'Rajesh Sharma',
      phone: '+91 98765 22222',
      relationship: 'Father',
      email: 'rajesh@narisafe.org',
      isPrimary: true,
    });

    await EmergencyContact.create({
      userId: priya._id,
      name: 'Ananya Sharma',
      phone: '+91 98765 33333',
      relationship: 'Sister',
      email: 'ananya@gmail.com',
      isPrimary: false,
    });

    await EmergencyContact.create({
      userId: priya._id,
      name: 'Sneha Patel',
      phone: '+91 98765 44444',
      relationship: 'Colleague / Roommate',
      email: 'sneha.p@gmail.com',
      isPrimary: false,
    });

    console.log('[NariSafe Seeder] Seeded Emergency Contacts.');

    // 3. Guardian Connection between Priya and Rajesh
    await GuardianConnection.create({
      userId: priya._id,
      guardianId: rajesh._id,
      invitationStatus: 'accepted',
      relationshipTag: 'Father',
      permissions: {
        liveLocation: true,
        emergencyAlerts: true,
        routeMonitoring: true,
      },
    });

    console.log('[NariSafe Seeder] Seeded Guardian Connection.');

    // 4. Sample Incidents
    const baseLat = 28.6139;
    const baseLng = 77.2090;

    await Incident.create([
      {
        reporterId: priya._id,
        incidentType: 'Harassment',
        description: 'Repeated catcalling and aggressive whistling by a group outside the transit subway gate after 8:30 PM.',
        locationName: 'Metro Station Gate 4, Outer Circle',
        latitude: baseLat + 0.005,
        longitude: baseLng - 0.003,
        severity: 'high',
        status: 'verified',
        anonymous: false,
        verifiedBy: admin._id,
        adminNotes: 'Forwarded to local Pink Patrol unit for enhanced surveillance.',
      },
      {
        reporterId: null,
        incidentType: 'Poor Lighting',
        description: 'Street lights completely broken along a 400-meter stretch behind the commercial plaza. Extremely dark after 7 PM.',
        locationName: 'Service Road Behind City Mall',
        latitude: baseLat - 0.008,
        longitude: baseLng + 0.006,
        severity: 'medium',
        status: 'verified',
        anonymous: true,
        verifiedBy: admin._id,
        adminNotes: 'Municipal lighting grievance #DL-2026-991 logged.',
      },
      {
        reporterId: null,
        incidentType: 'Stalking',
        description: 'Individual on an unnumbered black scooter followed pedestrian walking towards residential block for 3 blocks.',
        locationName: 'Sector 4 Avenue, Near Park Boundary',
        latitude: baseLat + 0.012,
        longitude: baseLng + 0.009,
        severity: 'critical',
        status: 'verified',
        anonymous: true,
        verifiedBy: admin._id,
        adminNotes: 'CCTV footage requested from nearby apartment society.',
      },
      {
        reporterId: priya._id,
        incidentType: 'Suspicious Activity',
        description: 'Group loitering near unlit ATM vestibule, obstructing sidewalk.',
        locationName: 'Market Complex Block C',
        latitude: baseLat - 0.004,
        longitude: baseLng - 0.008,
        severity: 'low',
        status: 'under_review',
        anonymous: false,
      },
      {
        reporterId: null,
        incidentType: 'Eve Teasing',
        description: 'Verbal harassment and blocking pedestrian sidewalk near bus stop.',
        locationName: 'Main Ring Road Bus Shelter',
        latitude: baseLat + 0.015,
        longitude: baseLng - 0.007,
        severity: 'high',
        status: 'verified',
        anonymous: true,
        verifiedBy: admin._id,
      },
    ]);

    console.log('[NariSafe Seeder] Seeded Incidents.');

    // 5. Helplines Directory
    await Helpline.create([
      {
        name: 'National Emergency Response Support System (ERSS)',
        number: '112',
        category: 'Emergency',
        description: 'All-in-one unified emergency number for Police, Fire, Ambulance, and Disaster across India.',
        isNational: true,
        state: 'National',
        availableHours: '24x7',
      },
      {
        name: 'Women Helpline (Domestic Abuse & Distress)',
        number: '181',
        category: 'Women Safety',
        description: 'National 24x7 toll-free helpline providing counseling, rescue, and shelter assistance to women.',
        isNational: true,
        state: 'National',
        availableHours: '24x7',
      },
      {
        name: 'Police Women Special Cell (Women in Distress)',
        number: '1091',
        category: 'Police',
        description: 'Dedicated police emergency cell for immediate intervention in harassment, eve teasing, or stalking.',
        isNational: true,
        state: 'National',
        availableHours: '24x7',
      },
      {
        name: 'Police Emergency Response',
        number: '100',
        category: 'Police',
        description: 'Direct police control room dispatch.',
        isNational: true,
        state: 'National',
        availableHours: '24x7',
      },
      {
        name: 'Emergency Medical Ambulance Service',
        number: '108',
        category: 'Medical',
        description: 'Toll-free emergency medical transport and paramedic response.',
        isNational: true,
        state: 'National',
        availableHours: '24x7',
      },
      {
        name: 'Childline Emergency Care & Protection',
        number: '1098',
        category: 'Child',
        description: '24x7 emergency phone service for children in need of aid and protection.',
        isNational: true,
        state: 'National',
        availableHours: '24x7',
      },
      {
        name: 'National Cyber Crime Reporting Helpline',
        number: '1930',
        category: 'Cyber Crime',
        description: 'For cyber harassment, financial fraud, impersonation, and non-consensual image sharing.',
        isNational: true,
        state: 'National',
        availableHours: '24x7',
      },
      {
        name: 'National Commission for Women (NCW) Cell',
        number: '7827170170',
        category: 'Legal Aid',
        description: 'NCW 24x7 helpline for women facing violence, workplace abuse, or legal distress.',
        isNational: true,
        state: 'National',
        availableHours: '24x7',
      },
    ]);

    console.log('[NariSafe Seeder] Seeded Helplines Directory.');
    console.log('\n======================================================');
    console.log('✅ Demo Credentials Seeded to MongoDB Atlas:');
    console.log('   Admin:    admin@narisafe.org  /  Admin@123');
    console.log('   User:     priya@narisafe.org  /  User@123');
    console.log('   Guardian: rajesh@narisafe.org /  Guardian@123');
    console.log('======================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('[NariSafe Seeder Error]', err.message);
    process.exit(1);
  }
};

seedData();
