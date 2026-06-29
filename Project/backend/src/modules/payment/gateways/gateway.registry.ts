import { PaymentGatewayAdapter } from '../types/payment.types.js';
import { esewaGateway } from './esewa.gateway.js';
import { khaltiGateway } from './khalti.gateway.js';
import { fonepayStaticGateway, fonepayDynamicGateway, fonepayGateway } from './fonepay.gateway.js';
import { cardGateway, npsGateway } from './card.gateway.js';

const registry = new Map<string, PaymentGatewayAdapter>();

function register(adapter: PaymentGatewayAdapter): void {
  registry.set(adapter.gatewayId, adapter);
}

register(esewaGateway);
register(khaltiGateway);
register(fonepayGateway);
register(fonepayStaticGateway);
register(fonepayDynamicGateway);
register(cardGateway);
register(npsGateway);

export function getGatewayAdapter(gatewayId: string): PaymentGatewayAdapter | null {
  const id = gatewayId.trim().toLowerCase();
  if (id === 'fonepay') return fonepayGateway;
  if (id === 'card' || id === 'nps') return cardGateway;
  return registry.get(id) || null;
}

export function listGatewayAdapters(): PaymentGatewayAdapter[] {
  return Array.from(registry.values());
}

export function resolveGatewayAlias(gatewayId: string): string {
  const id = gatewayId.trim().toLowerCase();
  if (id === 'nps') return 'card';
  if (id.startsWith('fonepay')) return id;
  return id;
}
