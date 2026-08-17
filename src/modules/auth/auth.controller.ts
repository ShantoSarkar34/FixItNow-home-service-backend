import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import ApiError from "../../utils/ApiError.js";
import config from "../../config/index.js";
import { setAuthCookies, clearAuthCookies } from "../../utils/cookies.js";
import { AuthService } from "./auth.service.js";

const register = catchAsync(async (req: Request, res: Response) => {
  const { accessToken, refreshToken, user } = await AuthService.registerUser(
    req.body
  );

  setAuthCookies(res, { accessToken, refreshToken });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "User registered successfully",
    data: user,
  });
});

const login = catchAsync(async (req: Request, res: Response) => {
  const { accessToken, refreshToken, user } = await AuthService.loginUser(
    req.body
  );

  setAuthCookies(res, { accessToken, refreshToken });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Logged in successfully",
    data: user,
  });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Refresh token not found");
  }

  const { accessToken } = await AuthService.refreshAccessToken(token);

  setAuthCookies(res, { accessToken });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Access token refreshed successfully",
  });
});

const logout = catchAsync(async (req: Request, res: Response) => {
  clearAuthCookies(res);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Logged out successfully",
  });
});

const getMe = catchAsync(async (req: Request, res: Response) => {
  const user = await AuthService.getMe(req.user!.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User retrieved successfully",
    data: user,
  });
});

const updateMe = catchAsync(async (req: Request, res: Response) => {
  const { name, phone, address, photo } = req.body;
  const user = await AuthService.updateMe(req.user!.id, {
    name,
    phone,
    address,
    photo,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile updated successfully",
    data: user,
  });
});

// ===================== OAUTH =====================
// These redirect the browser rather than returning JSON, including on failure -
// mid-OAuth-dance the user's browser is navigating, not making an API call that
// expects a JSON error body. Errors are surfaced via a `?error=` query param on
// the frontend callback URL instead of throwing to the global error handler.

const googleRedirect = (req: Request, res: Response) => {
  res.redirect(AuthService.getGoogleAuthUrl());
};

const googleCallback = catchAsync(async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code || typeof code !== "string") {
    return res.redirect(
      `${config.frontend_url}/auth/callback?error=missing_code`
    );
  }

  try {
    const { accessToken, refreshToken } =
      await AuthService.handleGoogleCallback(code);
    setAuthCookies(res, { accessToken, refreshToken });
    res.redirect(`${config.frontend_url}/auth/callback`);
  } catch (error) {
    console.error(
      "Google OAuth callback failed:",
      error instanceof Error ? error.message : error
    );
    res.redirect(`${config.frontend_url}/auth/callback?error=oauth_failed`);
  }
});

const facebookRedirect = (req: Request, res: Response) => {
  res.redirect(AuthService.getFacebookAuthUrl());
};

const facebookCallback = catchAsync(async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code || typeof code !== "string") {
    return res.redirect(
      `${config.frontend_url}/auth/callback?error=missing_code`
    );
  }

  try {
    const { accessToken, refreshToken } =
      await AuthService.handleFacebookCallback(code);
    setAuthCookies(res, { accessToken, refreshToken });
    res.redirect(`${config.frontend_url}/auth/callback`);
  } catch (error) {
    console.error(
      "Facebook OAuth callback failed:",
      error instanceof Error ? error.message : error
    );
    res.redirect(`${config.frontend_url}/auth/callback?error=oauth_failed`);
  }
});

// ===================== PASSWORD RESET =====================

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.forgotPassword(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
  });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.resetPassword(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
  });
});

export const AuthController = {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  updateMe,
  googleRedirect,
  googleCallback,
  facebookRedirect,
  facebookCallback,
  forgotPassword,
  resetPassword,
};
