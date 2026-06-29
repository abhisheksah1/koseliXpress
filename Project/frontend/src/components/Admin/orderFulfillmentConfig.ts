import { OrderStatus } from '../../types';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'Payment Pending',
  [OrderStatus.PAID]: 'Order Received',
  [OrderStatus.PREPARING]: 'Preparing',
  [OrderStatus.SHIPPED]: 'Dispatch',
  [OrderStatus.DELIVERED]: 'Delivered',
  [OrderStatus.CANCELLED]: 'Cancelled',
};

/** Compact labels for inline selects so text is never truncated */
export const ORDER_STATUS_SHORT: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'Pending',
  [OrderStatus.PAID]: 'Received',
  [OrderStatus.PREPARING]: 'Preparing',
  [OrderStatus.SHIPPED]: 'Shipped',
  [OrderStatus.DELIVERED]: 'Delivered',
  [OrderStatus.CANCELLED]: 'Cancelled',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
  pending: 'Pending',
};

export const ORDER_STATUS_BADGE: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'bg-amber-50 text-amber-700 border-amber-200/60',
  [OrderStatus.PAID]: 'bg-sky-50 text-sky-700 border-sky-200/60',
  [OrderStatus.PREPARING]: 'bg-violet-50 text-violet-700 border-violet-200/60',
  [OrderStatus.SHIPPED]: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
  [OrderStatus.DELIVERED]: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  [OrderStatus.CANCELLED]: 'bg-slate-100 text-slate-600 border-slate-200/60',
};

export const PAYMENT_STATUS_BADGE: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  failed: 'bg-rose-50 text-rose-700 border-rose-200/60',
  refunded: 'bg-slate-100 text-slate-600 border-slate-200/60',
  pending: 'bg-amber-50 text-amber-700 border-amber-200/60',
};

export const PREMIUM_INPUT =
  'w-full px-3.5 py-2.5 text-xs font-medium text-slate-800 bg-white border border-pink-100 rounded-xl shadow-sm transition-all duration-150 placeholder:text-slate-400 focus:outline-none focus:border-[#E91E63]/40 focus:ring-2 focus:ring-[#E91E63]/15';

export const PREMIUM_SELECT =
  'w-full px-3.5 py-2.5 text-xs font-medium text-slate-800 bg-white border border-pink-100 rounded-xl shadow-sm cursor-pointer transition-all duration-150 focus:outline-none focus:border-[#E91E63]/40 focus:ring-2 focus:ring-[#E91E63]/15 hover:border-pink-200 appearance-none';

export const TABLE_HEAD =
  'bg-gradient-to-r from-pink-50/80 via-white to-rose-50/50 border-b border-pink-100/60 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500';

export const TABLE_WRAPPER =
  'bg-white border border-pink-100/80 rounded-2xl overflow-hidden shadow-sm';

export const PAGINATION_BAR =
  'bg-gradient-to-r from-pink-50/40 to-white border-t border-pink-100/60 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500';
