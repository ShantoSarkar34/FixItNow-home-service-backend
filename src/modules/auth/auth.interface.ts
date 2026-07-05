import { Role } from '../../../prisma/generated/index.js';

export type TRegisterPayload = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: Extract<Role, 'CUSTOMER' | 'TECHNICIAN'>;
};

export type TLoginPayload = {
  email: string;
  password: string;
};