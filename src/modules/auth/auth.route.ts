import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import auth from '../../middlewares/auth.js';
import { forgotPasswordLimiter } from '../../middlewares/rateLimiter.js';
 
const router = Router();
 
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/logout', AuthController.logout);
router.get('/me', auth(), AuthController.getMe);
router.patch('/me', auth(), AuthController.updateMe);

router.get('/google', AuthController.googleRedirect);
router.get('/google/callback', AuthController.googleCallback);
router.get('/facebook', AuthController.facebookRedirect);
router.get('/facebook/callback', AuthController.facebookCallback);

router.post('/forgot-password', forgotPasswordLimiter, AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
 
export const AuthRoutes = router;