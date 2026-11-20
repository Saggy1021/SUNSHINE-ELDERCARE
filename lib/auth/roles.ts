export const ROLES = {
  // Canonical (New)
  OWNER: 'OWNER',
  MEMBER: 'MEMBER',
  EMPLOYEE: 'EMPLOYEE',
  
  // EmergencyOS
  EMERGENCY_OPERATOR: 'EMERGENCY_OPERATOR',
  EMERGENCY_SUPERVISOR: 'EMERGENCY_SUPERVISOR',

  // Legacy (Transition phase)
  USER: 'USER',
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
  CAREGIVER: 'CAREGIVER',
  COORDINATOR: 'COORDINATOR',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];
