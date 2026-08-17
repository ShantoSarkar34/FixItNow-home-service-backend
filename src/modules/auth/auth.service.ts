import crypto from "crypto";
import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import { OAuth2Client } from "google-auth-library";
import prisma from "../../lib/prisma.js";
import redis from "../../lib/redis.js";
import { sendPasswordResetEmail } from "../../lib/email.js";
import ApiError from "../../utils/ApiError.js";
import config from "../../config/index.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt.js";
import {
  TForgotPasswordPayload,
  TLoginPayload,
  TOAuthProfile,
  TRegisterPayload,
  TResetPasswordPayload,
} from "./auth.interface.js";

const ALLOWED_REGISTER_ROLES = ["CUSTOMER", "TECHNICIAN"];

const registerUser = async (payload: TRegisterPayload) => {
  if (!payload.name || !payload.email || !payload.password || !payload.role) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "name, email, password and role are required"
    );
  }

  if (!ALLOWED_REGISTER_ROLES.includes(payload.role)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "role must be either CUSTOMER or TECHNICIAN"
    );
  }

  if (payload.password.length < 6) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "password must be at least 6 characters"
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (existingUser) {
    throw new ApiError(
      httpStatus.CONFLICT,
      "An account with this email already exists"
    );
  }

  const hashedPassword = await bcrypt.hash(
    payload.password,
    config.bcrypt_salt_rounds
  );

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      password: hashedPassword,
      phone: payload.phone,
      role: payload.role,
      authProvider: "LOCAL",
    },
  });

  const tokenPayload = { id: user.id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  const { password, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, accessToken, refreshToken };
};

const loginUser = async (payload: TLoginPayload) => {
  if (!payload.email || !payload.password) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "email and password are required"
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid email or password");
  }

  if (user.status === "BANNED") {
    throw new ApiError(httpStatus.FORBIDDEN, "This account has been banned");
  }

  // OAuth-only accounts have no password - guard before bcrypt.compare, which
  // would otherwise throw a confusing error on a null hash.
  if (!user.password) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `This account uses ${
        user.authProvider === "GOOGLE" ? "Google" : "Facebook"
      } sign-in. Please use that method, or reset your password to set one for email/password login.`
    );
  }

  const isPasswordValid = await bcrypt.compare(payload.password, user.password);

  if (!isPasswordValid) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid email or password");
  }

  const tokenPayload = { id: user.id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  const { password, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, accessToken, refreshToken };
};

const refreshAccessToken = async (token: string) => {
  let decoded;

  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      "Invalid or expired refresh token"
    );
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.id } });

  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "User no longer exists");
  }

  if (user.status === "BANNED") {
    throw new ApiError(httpStatus.FORBIDDEN, "This account has been banned");
  }

  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return { accessToken };
};

const getMe = async (userId: number) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const { password, ...userWithoutPassword } = user;

  return userWithoutPassword;
};

const updateMe = async (
  userId: number,
  payload: { name?: string; phone?: string; address?: string; photo?: string }
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      name: payload.name,
      phone: payload.phone,
      address: payload.address,
      photo: payload.photo,
    },
  });

  const { password, ...userWithoutPassword } = updated;
  return userWithoutPassword;
};

// ===================== OAUTH =====================

const getGoogleAuthUrl = (): string => {
  const params = new URLSearchParams({
    client_id: config.oauth.google.client_id || "",
    redirect_uri: config.oauth.google.callback_url || "",
    response_type: "code",
    scope: "openid profile email",
    access_type: "offline",
    prompt: "consent",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

const getFacebookAuthUrl = (): string => {
  const params = new URLSearchParams({
    client_id: config.oauth.facebook.app_id || "",
    redirect_uri: config.oauth.facebook.callback_url || "",
    response_type: "code",
    scope: "email,public_profile",
  });

  return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
};

const findOrCreateOAuthUser = async (profile: TOAuthProfile) => {
  let user =
    profile.provider === "GOOGLE"
      ? await prisma.user.findFirst({ where: { googleId: profile.providerId } })
      : await prisma.user.findFirst({
          where: { facebookId: profile.providerId },
        });

  if (!user) {
    const existingByEmail = await prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (existingByEmail) {
      user = await prisma.user.update({
        where: { id: existingByEmail.id },
        data:
          profile.provider === "GOOGLE"
            ? {
                googleId: profile.providerId,
                photo: existingByEmail.photo || profile.photo,
              }
            : {
                facebookId: profile.providerId,
                photo: existingByEmail.photo || profile.photo,
              },
      });
    }
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: profile.name,
        email: profile.email,
        photo: profile.photo,
        role: "CUSTOMER",
        authProvider: profile.provider,
        googleId:
          profile.provider === "GOOGLE" ? profile.providerId : undefined,
        facebookId:
          profile.provider === "FACEBOOK" ? profile.providerId : undefined,
      },
    });
  }

  if (user.status === "BANNED") {
    throw new ApiError(httpStatus.FORBIDDEN, "This account has been banned");
  }

  const tokenPayload = { id: user.id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  return { accessToken, refreshToken };
};

const googleClient = new OAuth2Client(
  config.oauth.google.client_id,
  config.oauth.google.client_secret,
  config.oauth.google.callback_url
);

const handleGoogleCallback = async (code: string) => {
  const { tokens } = await googleClient.getToken(code);

  if (!tokens.id_token) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Google did not return an ID token"
    );
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: tokens.id_token,
    audience: config.oauth.google.client_id,
  });

  const payload = ticket.getPayload();

  if (!payload?.email) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Google account has no email associated"
    );
  }

  return findOrCreateOAuthUser({
    provider: "GOOGLE",
    providerId: payload.sub,
    email: payload.email,
    name: payload.name || payload.email.split("@")[0],
    photo: payload.picture,
  });
};

const handleFacebookCallback = async (code: string) => {
  const tokenParams = new URLSearchParams({
    client_id: config.oauth.facebook.app_id || "",
    client_secret: config.oauth.facebook.app_secret || "",
    redirect_uri: config.oauth.facebook.callback_url || "",
    code,
  });

  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?${tokenParams.toString()}`
  );
  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    error?: { message: string };
  };

  if (!tokenData.access_token) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      tokenData.error?.message || "Facebook token exchange failed"
    );
  }

  const profileRes = await fetch(
    `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${tokenData.access_token}`
  );
  const profile = (await profileRes.json()) as {
    id: string;
    name: string;
    email?: string;
    picture?: { data?: { url?: string } };
  };

  if (!profile.email) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Your Facebook account has no email associated. Please use a different sign-in method, or add an email to your Facebook account first."
    );
  }

  return findOrCreateOAuthUser({
    provider: "FACEBOOK",
    providerId: profile.id,
    email: profile.email,
    name: profile.name,
    photo: profile.picture?.data?.url,
  });
};

// ===================== PASSWORD RESET =====================

const forgotPassword = async (payload: TForgotPasswordPayload) => {
  if (!payload.email) {
    throw new ApiError(httpStatus.BAD_REQUEST, "email is required");
  }

  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (user) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    // node-redis v4 SET-with-expiry syntax: options object, not ioredis's
    // trailing 'EX', seconds arguments.
    await redis.set(
      `password-reset:${hashedToken}`,
      JSON.stringify({ userId: user.id }),
      {
        EX: config.password_reset.expires_in_seconds,
      }
    );

    const resetUrl = `${config.frontend_url}/reset-password?token=${rawToken}`;

    try {
      await sendPasswordResetEmail(user.email, user.name, resetUrl);
    } catch (error) {
      console.error(
        "Failed to send password reset email:",
        error instanceof Error ? error.message : error
      );
    }
  }

  return {
    message: "If the email is registered, a password reset link has been sent.",
  };
};

const resetPassword = async (payload: TResetPasswordPayload) => {
  const { token, password } = payload;

  if (!token || !password) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "token and password are required"
    );
  }

  if (password.length < 6) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "password must be at least 6 characters"
    );
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const redisKey = `password-reset:${hashedToken}`;

  const stored = await redis.get(redisKey);

  if (!stored) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "This reset link is invalid or has expired"
    );
  }

  const { userId } = JSON.parse(stored) as { userId: number };

  const hashedPassword = await bcrypt.hash(password, config.bcrypt_salt_rounds);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  await redis.del(redisKey);

  return {
    message: "Password has been reset successfully. You can now log in.",
  };
};

export const AuthService = {
  registerUser,
  loginUser,
  refreshAccessToken,
  getMe,
  updateMe,
  getGoogleAuthUrl,
  getFacebookAuthUrl,
  handleGoogleCallback,
  handleFacebookCallback,
  forgotPassword,
  resetPassword,
};
