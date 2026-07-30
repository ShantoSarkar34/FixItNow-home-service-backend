import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import auth from '../../middlewares/auth.js';
 
const router = Router();
 
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/logout', AuthController.logout);
router.get('/me', auth(), AuthController.getMe);
router.patch('/me', auth(), AuthController.updateMe);
 
export const AuthRoutes = router;