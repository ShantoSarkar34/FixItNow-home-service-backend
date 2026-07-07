import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import ApiError from '../../utils/ApiError';
import { PaymentService } from './payment.service';
import { TCreatePaymentPayload, TPaymentFilters } from './payment.interface';

const createPayment = catchAsync(async (req: Request, res: Response) => {
  const payment = await PaymentService.createPayment(
    req.user!.id,
    req.body as TCreatePaymentPayload,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Payment processed successfully',
    data: payment,
  });
});

const getPayments = catchAsync(async (req: Request, res: Response) => {
  const payments = await PaymentService.getPayments(
    { id: req.user!.id, role: req.user!.role },
    req.query as unknown as TPaymentFilters,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payments retrieved successfully',
    data: payments,
  });
});

const getPaymentById = catchAsync(async (req: Request, res: Response) => {
  const payment = await PaymentService.getPaymentById(
    { id: req.user!.id, role: req.user!.role },
    Number(req.params.id),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment retrieved successfully',
    data: payment,
  });
});

// Stripe calls this directly (no auth cookie, no JSON body parsing) - see app.ts
// for the raw-body wiring this route requires.
const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'];

  if (!signature || Array.isArray(signature)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Missing Stripe-Signature header');
  }

  await PaymentService.handleWebhookEvent(req.body, signature);

  res.status(httpStatus.OK).json({ received: true });
});

export const PaymentController = {
  createPayment,
  getPayments,
  getPaymentById,
  handleWebhook,
};