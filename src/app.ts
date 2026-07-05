import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import httpStatus from 'http-status';
import globalErrorHandler from './middlewares/globalErrorHandler';
import notFound from './middlewares/notFound';
import { AuthRoutes } from './modules/auth/auth.route';

const app: Application = express();

// Core middlewares
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/', (req: Request, res: Response) => {
  res.status(httpStatus.OK).json({
    success: true,
    message: 'FixItNow API is running...',
  });
});

// TODO: mount module routers here, e.g.
app.use('/api/auth', AuthRoutes);

app.use(notFound);
app.use(globalErrorHandler);

export default app;
