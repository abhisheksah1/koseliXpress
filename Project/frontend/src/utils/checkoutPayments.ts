import { PaymentGateway } from '../types';

export type CheckoutPaymentSlotId = 'cod' | 'esewa' | 'khalti' | 'fonepay' | 'cards';

export interface CheckoutPaymentSlot {
  id: CheckoutPaymentSlotId;
  gatewayIds: string[];
  displayName: string;
}

/** Checkout payment options shown to customers */
export const CHECKOUT_PAYMENT_SLOTS: CheckoutPaymentSlot[] = [
  { id: 'cod', gatewayIds: ['cod'], displayName: 'Cash on Delivery (COD)' },
  { id: 'esewa', gatewayIds: ['esewa'], displayName: 'eSewa Wallet Payment' },
  { id: 'khalti', gatewayIds: ['khalti'], displayName: 'Khalti Mobile Wallet' },
  { id: 'fonepay', gatewayIds: ['fonepay_static', 'fonepay_dynamic'], displayName: 'Fonepay QR Pay' },
  { id: 'cards', gatewayIds: ['nps'], displayName: 'Visa / Mastercard' },
];

export function isGatewayCurrencyCompatible(gw: PaymentGateway, currencyCode: string): boolean {
  const code = currencyCode.toUpperCase();
  if (gw.acceptableCurrencies && gw.acceptableCurrencies.length > 0) {
    return gw.acceptableCurrencies.map((c) => c.toUpperCase()).includes(code);
  }
  if (gw.id === 'cod' || gw.id === 'esewa' || gw.id === 'khalti' || gw.id.startsWith('fonepay')) {
    return code === 'NPR';
  }
  if (gw.id === 'nps') {
    return code === 'NPR' || code === 'USD';
  }
  return true;
}

/** Prefer enabled gateway for a slot; otherwise first configured record */
export function resolveGatewayForSlot(
  gateways: PaymentGateway[] | undefined,
  slotId: CheckoutPaymentSlotId,
): PaymentGateway | undefined {
  const slot = CHECKOUT_PAYMENT_SLOTS.find((s) => s.id === slotId);
  if (!slot) return undefined;

  const enabled = slot.gatewayIds
    .map((id) => gateways?.find((g) => g.id === id))
    .find((g) => g?.isEnabled);
  if (enabled) return enabled;

  return slot.gatewayIds.map((id) => gateways?.find((g) => g.id === id)).find(Boolean);
}

export function resolveGatewayIdForSlot(
  gateways: PaymentGateway[] | undefined,
  slotId: CheckoutPaymentSlotId,
): string {
  const gw = resolveGatewayForSlot(gateways, slotId);
  if (gw) return gw.id;
  const slot = CHECKOUT_PAYMENT_SLOTS.find((s) => s.id === slotId);
  return slot?.gatewayIds[0] ?? slotId;
}

export interface CheckoutPaymentOption {
  slotId: CheckoutPaymentSlotId;
  gatewayId: string;
  gateway: PaymentGateway | null;
  displayName: string;
  isSelectable: boolean;
  unavailableReason?: string;
}

export function getCheckoutPaymentOptions(
  gateways: PaymentGateway[] | undefined,
  currencyCode: string,
): CheckoutPaymentOption[] {
  return CHECKOUT_PAYMENT_SLOTS.map((slot) => {
    const gateway = resolveGatewayForSlot(gateways, slot.id) ?? null;
    const gatewayId = gateway?.id ?? slot.gatewayIds[0];
    const displayName = gateway?.name || slot.displayName;

    if (!gateway) {
      return {
        slotId: slot.id,
        gatewayId,
        gateway: null,
        displayName,
        isSelectable: false,
        unavailableReason: 'Not configured by admin',
      };
    }

    if (!gateway.isEnabled) {
      return {
        slotId: slot.id,
        gatewayId: gateway.id,
        gateway,
        displayName,
        isSelectable: false,
        unavailableReason: 'Not available — disabled by admin',
      };
    }

    if (!isGatewayCurrencyCompatible(gateway, currencyCode)) {
      return {
        slotId: slot.id,
        gatewayId: gateway.id,
        gateway,
        displayName,
        isSelectable: false,
        unavailableReason: `Not available for ${currencyCode}`,
      };
    }

    return {
      slotId: slot.id,
      gatewayId: gateway.id,
      gateway,
      displayName,
      isSelectable: true,
    };
  });
}

export function getFirstSelectablePaymentGatewayId(
  gateways: PaymentGateway[] | undefined,
  currencyCode: string,
): string | null {
  return getCheckoutPaymentOptions(gateways, currencyCode).find((o) => o.isSelectable)?.gatewayId ?? null;
}

export function isPaymentGatewaySelectable(
  gateways: PaymentGateway[] | undefined,
  currencyCode: string,
  gatewayId: string,
): boolean {
  return getCheckoutPaymentOptions(gateways, currencyCode).some(
    (o) => o.gatewayId === gatewayId && o.isSelectable,
  );
}

export function getSlotIdForGatewayId(gatewayId: string): CheckoutPaymentSlotId | null {
  for (const slot of CHECKOUT_PAYMENT_SLOTS) {
    if (slot.gatewayIds.includes(gatewayId)) return slot.id;
  }
  return null;
}

/** Admin quick-toggle: Fonepay slot controls both static & dynamic records */
export function applyCheckoutSlotEnabled(
  gateways: PaymentGateway[],
  slotId: CheckoutPaymentSlotId,
  isEnabled: boolean,
): PaymentGateway[] {
  const slot = CHECKOUT_PAYMENT_SLOTS.find((s) => s.id === slotId);
  if (!slot) return gateways;

  return gateways.map((gw) =>
    slot.gatewayIds.includes(gw.id) ? { ...gw, isEnabled } : gw,
  );
}

export function isCheckoutSlotEnabled(
  gateways: PaymentGateway[] | undefined,
  slotId: CheckoutPaymentSlotId,
): boolean {
  const slot = CHECKOUT_PAYMENT_SLOTS.find((s) => s.id === slotId);
  if (!slot) return false;
  return slot.gatewayIds.some((id) => gateways?.find((g) => g.id === id)?.isEnabled);
}
