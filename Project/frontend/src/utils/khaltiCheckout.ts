import {
  type PendingRedirectCheckout,
  savePendingRedirectCheckout,
  loadPendingRedirectCheckout,
  clearPendingRedirectCheckout,
  finalizeRedirectCheckoutOrder,
} from './pendingCheckout';

export const KHALTI_PENDING_CHECKOUT_KEY = 'koseli_pending_redirect_checkout';
export type PendingKhaltiCheckout = PendingRedirectCheckout;

export function savePendingKhaltiCheckout(payload: PendingRedirectCheckout): void {
  savePendingRedirectCheckout({ ...payload, paymentGateway: 'khalti' });
}

export function loadPendingKhaltiCheckout(): PendingRedirectCheckout | null {
  return loadPendingRedirectCheckout();
}

export function clearPendingKhaltiCheckout(): void {
  clearPendingRedirectCheckout();
}

/** Finalize order after Khalti lookup confirms Completed */
export function finalizeKhaltiCheckoutOrder(
  state: Parameters<typeof finalizeRedirectCheckoutOrder>[0],
  pending: PendingRedirectCheckout,
  khaltiMeta: { pidx: string; transaction_id: string | null; total_amount_paisa: number },
) {
  return finalizeRedirectCheckoutOrder(state, pending, {
    paymentMethod: 'KHALTI',
    transactionRef: khaltiMeta.transaction_id || khaltiMeta.pidx,
  });
}

export {
  savePendingRedirectCheckout,
  loadPendingRedirectCheckout,
  clearPendingRedirectCheckout,
  finalizeRedirectCheckoutOrder,
} from './pendingCheckout';

export type { PendingRedirectCheckout } from './pendingCheckout';
