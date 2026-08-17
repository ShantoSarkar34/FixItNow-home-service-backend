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

export type TOAuthProfile = {
  provider: 'GOOGLE' | 'FACEBOOK';
  providerId: string;
  email: string;
  name: string;
  photo?: string;
};

export type TForgotPasswordPayload = {
  email: string;
};

export type TResetPasswordPayload = {
  token: string;
  password: string;
};