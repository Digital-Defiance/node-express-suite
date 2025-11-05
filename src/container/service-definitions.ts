export const ServiceKeys = {
  JWT: 'jwt',
  EMAIL: 'email',
  ECIES: 'ecies',
  KEY_WRAPPING: 'keyWrapping',
  ROLE: 'role',
  USER: 'user',
  BACKUP_CODE: 'backupCode',
} as const;

export type ServiceKey = typeof ServiceKeys[keyof typeof ServiceKeys];
