import httpStatus from 'http-status';
import Stripe from 'stripe';
import prisma from '../../lib/prisma';
import stripe from '../../lib/stripe';
import ApiError from '../../utils/ApiError';
import config from '../../config';
import { Prisma, Role, PaymentStatus } from '../../../prisma/generated/index.js';
import { TCreatePaymentPayload, TPaymentFilters } from './payment.interface';

const paymentIncludes = {
  booking: {
    include: {
      service: { include: { category: true } },
      customer: { select: { id: true, name: true, email: true } },
      technician: { select: { id: true, name: true, email: true } },
    },
  },
} satisfies Prisma.PaymentInclude;

const createPayment = async (customerId: number, payload: TCreatePaymentPayload) => {
  const { bookingId, paymentMethod } = payload;

  if (!bookingId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'bookingId is required');
  }

  const booking = await prisma.booking.findUnique({
    where: { id: Number(bookingId) },
    include: { service: true, payment: true },
  });

  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Booking not found');
  }

  if (booking.customerId !== customerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You can only pay for your own bookings');
  }

  if (booking.status !== 'ACCEPTED') {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Payment can only be made for an ACCEPTED booking (current status: ${booking.status})`,
    );
  }

  if (booking.payment) {
    throw new ApiError(httpStatus.CONFLICT, 'This booking has already been paid for');
  }

  const amount = Number(booking.service.price);
  const amountInCents = Math.round(amount * 100);

  let paymentIntent: Stripe.PaymentIntent;

  try {
    // Using a Stripe test payment-method token ('pm_card_visa') with confirm: true
    // so this can be fully exercised from Postman - no frontend/Stripe.js needed.
    // In a real client-facing app, you'd instead return the client_secret here and
    // let the frontend confirm the payment with Stripe.js/Elements.
    paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      payment_method_types: ['card'],
      payment_method: paymentMethod || 'pm_card_visa',
      confirm: true,
      metadata: {
        bookingId: String(booking.id),
        customerId: String(customerId),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payment failed';
    throw new ApiError(httpStatus.BAD_REQUEST, `Stripe error: ${message}`);
  }

  return prisma.payment.create({
    data: {
      bookingId: booking.id,
      customerId,
      amount,
      method: paymentIntent.payment_method_types?.[0] || 'card',
      provider: 'STRIPE',
      transactionId: paymentIntent.id,
      status: paymentIntent.status === 'succeeded' ? 'COMPLETED' : 'PENDING',
      paidAt: paymentIntent.status === 'succeeded' ? new Date() : null,
    },
    include: paymentIncludes,
  });
};

const handleWebhookEvent = async (rawBody: Buffer, signature: string) => {
  if (!config.payment.stripe_webhook_secret) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'STRIPE_WEBHOOK_SECRET is not configured',
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      config.payment.stripe_webhook_secret,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid signature';
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Webhook signature verification failed: ${message}`,
    );
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    await prisma.payment.updateMany({
      where: { transactionId: paymentIntent.id },
      data: { status: 'COMPLETED', paidAt: new Date() },
    });
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    await prisma.payment.updateMany({
      where: { transactionId: paymentIntent.id },
      data: { status: 'FAILED' },
    });
  }
};

const getPayments = async (requester: { id: number; role: Role }, filters: TPaymentFilters) => {
  const { status, bookingId } = filters;

  const where: Prisma.PaymentWhereInput = {};

  if (status) {
    where.status = status as PaymentStatus;
  }

  if (bookingId) {
    where.bookingId = Number(bookingId);
  }

  if (requester.role === 'CUSTOMER') {
    where.customerId = requester.id;
  }
  // ADMIN sees everything, optionally narrowed by the filters above

  return prisma.payment.findMany({
    where,
    include: paymentIncludes,
    orderBy: { id: 'desc' },
  });
};

const getPaymentById = async (requester: { id: number; role: Role }, id: number) => {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: paymentIncludes,
  });

  if (!payment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Payment not found');
  }

  const canAccess = requester.role === 'ADMIN' || payment.customerId === requester.id;

  if (!canAccess) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have access to this payment');
  }

  return payment;
};

export const PaymentService = {
  createPayment,
  handleWebhookEvent,
  getPayments,
  getPaymentById,
};