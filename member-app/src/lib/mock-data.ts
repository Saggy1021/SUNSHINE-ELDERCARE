import {
  MemberProfile,
  Subscription,
  CareVisit,
  EmergencyContact,
  Receipt,
  Invoice,
  CarePlan,
  CommunityEvent,
  SupportIssue,
  IssueCategory,
} from './types';

export const MOCK_MEMBER_PROFILE: MemberProfile = {
  id: 'mp_mock_001',
  userId: 'usr_mock_001',
  memberId: 'SEC/S/1001/SAKR',
  firstName: 'Sakuntala',
  lastName: 'Roy',
  dateOfBirth: '1948-04-12',
  gender: 'Female',
  bloodGroup: 'O+',
  serviceAddress: 'Flat 4B, Greenfield Heights, Rajarhat Main Road, Kolkata 700136',
  nearestLandmark: 'Opposite City Centre 2',
  mobileNumber: '+91 98300 11223',
  alternateNumber: '+91 98301 44556',
  email: 'sakuntala.roy@example.com',
  medicalConditions: 'Hypertension, Mild Osteoarthritis, Managed Type 2 Diabetes',
  idProofType: 'Aadhaar Card',
};

export const MOCK_ACTIVE_SUBSCRIPTION: Subscription = {
  id: 'sub_mock_001',
  userId: 'usr_mock_001',
  carePlanId: 'plan_shield_shine',
  variantType: 'SINGLE',
  durationMonths: 12,
  startDate: '2026-04-01T00:00:00.000Z',
  endDate: '2027-03-31T23:59:59.000Z',
  status: 'ACTIVE',
  carePlan: {
    id: 'plan_shield_shine',
    slug: 'shield-shine',
    name: 'Shield Shine',
    active: true,
    variants: [
      {
        id: 'var_001',
        variantType: 'SINGLE',
        monthlyBasePrice: 4500,
        monthlyGst: 810,
        monthlyTotal: 5310,
        services: [
          { id: 'srv_1', serviceName: 'Weekly Vital Health Monitoring', serviceNote: 'BP, Blood Sugar, SpO2 checks' },
          { id: 'srv_2', serviceName: 'Dedicated Care Manager', serviceNote: '24/7 telephonic care coordination' },
          { id: 'srv_3', serviceName: 'Emergency SOS Hospital Escort', serviceNote: 'Priority ambulance assistance' },
          { id: 'srv_4', serviceName: 'Bi-monthly Doctor Home Visit', serviceNote: 'Comprehensive geriatric check-up' },
          { id: 'srv_5', serviceName: 'Prescription & Medicine Delivery', serviceNote: 'Doorstep monthly delivery' },
          { id: 'srv_6', serviceName: 'Accompanied Outings & Lab Visits', serviceNote: 'Caregiver companion support' },
        ],
      },
    ],
  },
};

export const MOCK_CARE_VISITS: CareVisit[] = [
  {
    id: 'visit_001',
    date: 'Today, 4:30 PM',
    time: '16:30',
    caregiverName: 'Ananya Banerjee',
    caregiverDesignation: 'Senior Care Attendant',
    caregiverPhone: '+91 98765 43210',
    status: 'SCHEDULED',
    taskSummary: 'Routine vital stats (BP & Sugar check) + evening mobility walk',
    vitalVitalsTaken: false,
  },
  {
    id: 'visit_002',
    date: 'Tomorrow, 10:30 AM',
    time: '10:30',
    caregiverName: 'Dr. Debabrata Sen',
    caregiverDesignation: 'Geriatric Consulting Physician',
    caregiverPhone: '+91 98311 22334',
    status: 'SCHEDULED',
    taskSummary: 'Bi-monthly comprehensive geriatric physical assessment',
    vitalVitalsTaken: false,
  },
  {
    id: 'visit_003',
    date: '8 Nov 2026',
    time: '11:00',
    caregiverName: 'Ananya Banerjee',
    caregiverDesignation: 'Senior Care Attendant',
    caregiverPhone: '+91 98765 43210',
    status: 'COMPLETED',
    taskSummary: 'Blood pressure stable (128/82), fasting sugar normal (114 mg/dL)',
    vitalVitalsTaken: true,
  },
];

export const MOCK_EMERGENCY_CONTACT: EmergencyContact = {
  fullName: 'Arindam Roy',
  relationship: 'Son (Primary Care Sponsor)',
  phone: '+91 98301 23456',
  alternatePhone: '+91 98302 34567',
  email: 'arindam.roy@example.com',
  sosHospital: 'Apollo Gleneagles Hospital, EM Bypass, Kolkata',
};

export const MOCK_RECEIPTS: Receipt[] = [
  {
    id: 'rec_mock_001',
    receiptNumber: 'SEC-REC-2026-1001',
    invoiceId: 'inv_mock_001',
    amount: 54000,
    currency: 'INR',
    paymentMethod: 'ONLINE (Razorpay UPI)',
    paymentDate: '2026-04-01',
    relatedPlanName: 'Shield Shine — Single (12 Months)',
    downloadUrl: '/api/receipts/rec_mock_001/download',
  },
  {
    id: 'rec_mock_002',
    receiptNumber: 'SEC-REC-2025-0842',
    invoiceId: 'inv_mock_000',
    amount: 50400,
    currency: 'INR',
    paymentMethod: 'ONLINE (Razorpay Netbanking)',
    paymentDate: '2025-04-01',
    relatedPlanName: 'Semi-Shield Shine — Single (12 Months)',
    downloadUrl: '/api/receipts/rec_mock_002/download',
  },
];

export const MOCK_INVOICES: Invoice[] = [
  {
    id: 'inv_mock_001',
    invoiceNumber: 'SEC-INV-2026-1001',
    total: 54000,
    issueDate: '2026-04-01',
    status: 'PAID',
    downloadUrl: '/api/invoices/inv_mock_001/download',
  },
];

export const MOCK_AVAILABLE_PLANS: CarePlan[] = [
  {
    id: 'plan_shield_shine',
    slug: 'shield-shine',
    name: 'Shield Shine',
    active: true,
    variants: [
      {
        id: 'v_ss_s',
        variantType: 'SINGLE',
        monthlyBasePrice: 4500,
        monthlyGst: 810,
        monthlyTotal: 5310,
        services: [],
      },
      {
        id: 'v_ss_c',
        variantType: 'COUPLE',
        monthlyBasePrice: 7500,
        monthlyGst: 1350,
        monthlyTotal: 8850,
        services: [],
      },
    ],
  },
  {
    id: 'plan_semi_shield',
    slug: 'semi-shield-shine',
    name: 'Semi Shield Shine',
    active: true,
    variants: [
      {
        id: 'v_sss_s',
        variantType: 'SINGLE',
        monthlyBasePrice: 3200,
        monthlyGst: 576,
        monthlyTotal: 3776,
        services: [],
      },
    ],
  },
  {
    id: 'plan_life_line',
    slug: 'life-line-care',
    name: 'Life Line Care',
    active: true,
    variants: [
      {
        id: 'v_llc_s',
        variantType: 'SINGLE',
        monthlyBasePrice: 6500,
        monthlyGst: 1170,
        monthlyTotal: 7670,
        services: [],
      },
    ],
  },
];

export const MOCK_COMMUNITY_EVENTS: CommunityEvent[] = [
  {
    id: 'ev_001',
    dateBadge: '09 SAT',
    title: "Women's Day Celebration & Adda",
    category: 'Community & Culture',
    time: '11:00 AM – 1:30 PM',
    location: 'Rajarhat Sunshine Lounge',
    description: 'An afternoon of nostalgia, acoustic Rabindra Sangeet, herbal tea, and storytelling celebrating senior women members.',
  },
  {
    id: 'ev_002',
    dateBadge: '14 THU',
    title: 'Geriatric Joint Mobility & Chair Yoga',
    category: 'Health & Wellness',
    time: '9:30 AM – 10:45 AM',
    location: 'Greenfield Heights Clubhouse',
    description: 'Gentle mobility session guided by certified senior physiotherapist focusing on knee, hip and spinal flexibility.',
  },
  {
    id: 'ev_003',
    dateBadge: '22 FRI',
    title: 'Seasonal Ayurvedic Immunity & Diet Talk',
    category: 'Nutritional Care',
    time: '4:00 PM – 5:30 PM',
    location: 'Online Webinar & Home Stream',
    description: 'Expert consultation on seasonal diet planning and diabetic-friendly nutrition for senior citizens.',
  },
];

export const ISSUE_CATEGORIES: { id: IssueCategory; label: string; description: string }[] = [
  {
    id: 'SERVICE_COMPLAINT',
    label: 'Service Complaints',
    description: 'Concerns regarding quality or scope of eldercare support received.',
  },
  {
    id: 'STAFF_COMPLAINT',
    label: 'Staff-related Complaints',
    description: 'Feedback or conduct issues regarding caregivers or attendants.',
  },
  {
    id: 'PAYMENT_ISSUE',
    label: 'Payment-related Issues',
    description: 'Questions regarding invoices, payment receipts, or Razorpay charges.',
  },
  {
    id: 'APPOINTMENT_ISSUE',
    label: 'Appointment-related Issues',
    description: 'Rescheduling, delays, or missed doctor/caregiver home visits.',
  },
  {
    id: 'GENERAL_QUERY',
    label: 'General Queries',
    description: 'General support, plan change requests, or member assistance.',
  },
];

export const MOCK_ISSUES: SupportIssue[] = [
  {
    id: 'issue_001',
    ticketNumber: 'SEC-TKT-2026-089',
    category: 'APPOINTMENT_ISSUE',
    categoryLabel: 'Appointment-related Issues',
    subject: 'Request to reschedule Wednesday visit to 11 AM',
    description: 'Dr. Sen visit needs to be moved 30 minutes earlier due to family lunch schedule.',
    status: 'IN_REVIEW',
    createdAt: '2026-11-10T14:30:00.000Z',
  },
];
