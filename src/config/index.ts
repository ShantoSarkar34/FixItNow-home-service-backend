import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Did you create a .env file?');
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  database_url: process.env.DATABASE_URL,
  app_base_url: (
    process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 5000}`
  ).replace(/\/+$/, ''),
  frontend_url: (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, ''),

  jwt: {
    access_secret: process.env.JWT_ACCESS_SECRET as string,
    access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN || '7d',
    refresh_secret: process.env.JWT_REFRESH_SECRET as string,
    refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  bcrypt_salt_rounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 12,

  payment: {
    stripe_secret_key: process.env.STRIPE_SECRET_KEY,
    stripe_webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
    sslcommerz_store_id: process.env.SSLCOMMERZ_STORE_ID,
    sslcommerz_store_password: process.env.SSLCOMMERZ_STORE_PASSWORD,
  },

  oauth: {
    google: {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      callback_url: process.env.GOOGLE_CALLBACK_URL,
    },
    facebook: {
      app_id: process.env.FACEBOOK_APP_ID,
      app_secret: process.env.FACEBOOK_APP_SECRET,
      callback_url: process.env.FACEBOOK_CALLBACK_URL,
    },
  },

  redis_url: process.env.REDIS_URL || 'redis://localhost:6379',

  email: {
    resend_api_key: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM || 'FixItNow <onboarding@resend.dev>',
  },

  password_reset: {
    expires_in_seconds: Number(process.env.PASSWORD_RESET_EXPIRES_IN_SECONDS) || 900,
  },
};

export default config;