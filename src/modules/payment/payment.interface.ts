export type TCreatePaymentPayload = {
  bookingId: number;
  paymentMethod?: string;
};

export type TPaymentFilters = {
  status?: string;
  bookingId?: string;
};