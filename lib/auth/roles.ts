export const ROLES = {
  USER: 'USER',
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
  CAREGIVER: 'CAREGIVER',
  COORDINATOR: 'COORDINATOR',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];
