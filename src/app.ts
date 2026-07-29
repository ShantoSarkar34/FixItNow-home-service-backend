import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import httpStatus from 'http-status';
import globalErrorHandler from './middlewares/globalErrorHandler.js';
import notFound from './middlewares/notFound.js';
import { AuthRoutes } from './modules/auth/auth.route.js';
import { TechnicianPrivateRoutes, TechnicianRoutes } from './modules/technician/technician.route.js';
import { CategoryAdminRoutes } from './modules/category/category.route.js';
import { ServiceRoutes, TechnicianServiceRoutes } from './modules/service/service.route.js';
import { BookingRoutes, TechnicianBookingRoutes } from './modules/booking/booking.route.js';
import { PaymentRoutes } from './modules/payment/payment.route.js';
import { ReviewRoutes } from './modules/review/review.route.js';
import { AdminRoutes } from './modules/admin/admin.route.js';
import config from './config/index.js';


const app: Application = express();

// Core middlewares
const allowedOrigins = [
  "http://localhost:3000",
  "https://fixitnow-service.vercel.app",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/', (req: Request, res: Response) => {
  res.status(httpStatus.OK).json({
    success: true,
    message: 'FixItNow API is running...!',
  });
});

// TODO: mount module routers here, e.g.
app.use('/api/auth', AuthRoutes);
app.use('/api/admin/categories', CategoryAdminRoutes);
app.use('/api/services', ServiceRoutes);
app.use('/api/technicians', TechnicianRoutes);
app.use('/api/technician', TechnicianPrivateRoutes);
app.use('/api/technician/services', TechnicianServiceRoutes);
app.use('/api/bookings', BookingRoutes);
app.use('/api/technician/bookings', TechnicianBookingRoutes);
app.use('/api/payments', PaymentRoutes);
app.use('/api/reviews', ReviewRoutes);
app.use('/api/admin', AdminRoutes);


app.use(notFound);
app.use(globalErrorHandler);

export default app;
