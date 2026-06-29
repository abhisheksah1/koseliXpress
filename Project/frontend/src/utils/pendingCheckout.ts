import { CartItem, DatabaseState, LeadStatus, Order, OrderStatus } from '../types';

export const PENDING_CHECKOUT_KEY = 'koseli_pending_redirect_checkout';

export type PendingRedirectCheckout = {
  refId: string;
  paymentGateway: 'khalti' | 'esewa' | 'nps';
  cartItems: CartItem[];
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  deliveryDistrictId: string;
  deliveryDistrictName: string;
  deliveryAddress: string;
  orderNote?: string;
  preferredDeliveryDate?: string;
  selectedFeeIds: string[];
  serviceFeeInputs: Record<string, { text?: string; imageUrl?: string }>;
  appliedCouponId?: string;
  selectedTimeSlotId?: string;
  selectedTimeSlotLabel?: string;
  grandTotalBase: number;
  grandTotalConverted: number;
  currencyCode: string;
  exchangeRate: number;
  deliveryChargeBase: number;
  totalFeesBase: number;
  timeSlotChargeBase: number;
  pidx?: string;
  merchantTxnId?: string;
  createdAt: string;
};

export function savePendingRedirectCheckout(payload: PendingRedirectCheckout): void {
  sessionStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify(payload));
}

export function loadPendingRedirectCheckout(): PendingRedirectCheckout | null {
  try {
    const raw = sessionStorage.getItem(PENDING_CHECKOUT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingRedirectCheckout;
  } catch {
    return null;
  }
}

export function clearPendingRedirectCheckout(): void {
  sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
}

/** Finalize order after redirect gateway confirms payment */
export function finalizeRedirectCheckoutOrder(
  state: DatabaseState,
  pending: PendingRedirectCheckout,
  paymentMeta: {
    paymentMethod: string;
    transactionRef?: string | null;
  },
): DatabaseState {
  const products = [...state.products];

  pending.cartItems.forEach((item) => {
    const prodIdx = products.findIndex((p) => p.id === item.productId);
    if (prodIdx < 0) return;
    const prod = products[prodIdx];
    if (prod.isHamper && prod.hamperItems?.length) {
      prod.hamperItems.forEach((subItem) => {
        const subIdx = products.findIndex((p) => p.id === subItem.productId);
        if (subIdx >= 0) {
          products[subIdx].stock = Math.max(0, products[subIdx].stock - item.quantity * subItem.quantity);
        }
      });
    } else {
      products[prodIdx].stock = Math.max(0, products[prodIdx].stock - item.quantity);
    }
  });

  const appliedCoupon = pending.appliedCouponId
    ? state.coupons.find((c) => c.id === pending.appliedCouponId)
    : undefined;

  const newOrder: Order = {
    id: `ord-${Date.now()}`,
    refId: pending.refId,
    customerName: pending.senderName,
    customerEmail: pending.senderEmail || 'guest@customer.com',
    customerPhone: pending.senderPhone,
    shippingAddress: `${pending.deliveryAddress}, ${pending.deliveryDistrictName}`,
    senderName: pending.senderName,
    senderEmail: pending.senderEmail,
    senderPhone: pending.senderPhone,
    receiverName: pending.receiverName,
    receiverPhone: pending.receiverPhone,
    deliveryDistrict: pending.deliveryDistrictName,
    deliveryAddress: pending.deliveryAddress,
    orderNote: pending.orderNote,
    preferredDeliveryDate: pending.preferredDeliveryDate,
    deliveryChargeAmount: pending.deliveryChargeBase,
    items: pending.cartItems.map((item) => {
      const prod = state.products.find((p) => p.id === item.productId);
      return {
        productId: item.productId,
        productName: prod?.name || 'Unknown Product',
        quantity: item.quantity,
        selectedPrice: item.selectedPrice ?? prod?.price ?? 0,
        customMessage: item.customMessage,
        customImageUrl: item.customImageUrl,
        selectedVariations: item.selectedVariations,
      };
    }),
    totalAmountBase: pending.grandTotalBase,
    totalAmount: pending.grandTotalConverted,
    currency: pending.currencyCode,
    exchangeRate: pending.exchangeRate,
    additionalServiceFeeAmount: pending.totalFeesBase,
    additionalServiceFeeAdded: state.serviceFees
      .filter((f) => pending.selectedFeeIds.includes(f.id))
      .map((f) => f.name)
      .join(', '),
    serviceFeeDetails: state.serviceFees
      .filter((f) => pending.selectedFeeIds.includes(f.id))
      .map((f) => ({
        id: f.id,
        name: f.name,
        text: pending.serviceFeeInputs[f.id]?.text,
        imageUrl: pending.serviceFeeInputs[f.id]?.imageUrl,
      })),
    couponCodeUsed: appliedCoupon?.code,
    paymentMethod: paymentMeta.paymentMethod,
    status: OrderStatus.PENDING,
    paymentStatus: 'paid',
    stockAdjusted: true,
    selectedTimeSlot: pending.selectedTimeSlotLabel,
    timeSlotChargeAmount: pending.timeSlotChargeBase || undefined,
    createdAt: pending.createdAt,
  };

  const leads = state.leads.map((lead) =>
    lead.customerPhone === pending.senderPhone && lead.status === LeadStatus.FAILED
      ? { ...lead, status: LeadStatus.RECOVERED }
      : lead,
  );

  const coupons = state.coupons.map((c) =>
    appliedCoupon && c.id === appliedCoupon.id
      ? { ...c, usesCount: (c.usesCount || 0) + 1 }
      : c,
  );

  return {
    ...state,
    products,
    orders: [newOrder, ...state.orders],
    leads,
    coupons,
  };
}
