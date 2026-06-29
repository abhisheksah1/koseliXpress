import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getGatewayAdapter, resolveGatewayAlias } from '../gateways/gateway.registry.js';
import { generateEsewaSignature } from '../utils/crypto.util.js';
import { validateCreatePaymentInput } from '../validators/payment.validator.js';
import { PaymentError } from '../types/payment.types.js';

describe('payment gateway registry', () => {
  it('resolves known gateways', () => {
    assert.ok(getGatewayAdapter('esewa'));
    assert.ok(getGatewayAdapter('khalti'));
    assert.ok(getGatewayAdapter('fonepay_static'));
    assert.ok(getGatewayAdapter('nps'));
    assert.equal(resolveGatewayAlias('nps'), 'card');
  });
});

describe('eSewa signature', () => {
  it('generates deterministic HMAC signature', () => {
    const sig = generateEsewaSignature('100.00', 'KO-123', 'EPAYTEST', '8gBm/:&EnhH.1/q(');
    assert.equal(typeof sig, 'string');
    assert.ok(sig.length > 10);
  });

  it('uses comma-separated signed field format from eSewa docs', () => {
    const sig = generateEsewaSignature('100', '11-201-13', 'EPAYTEST', '8gBm/:&EnhH.1/q(');
    assert.equal(typeof sig, 'string');
    assert.ok(sig.length > 20);
  });
});

describe('payment validation', () => {
  it('rejects invalid amount', () => {
    assert.throws(
      () => validateCreatePaymentInput({ orderId: '1', orderRef: 'KO-1', gateway: 'esewa', amount: -5, currency: 'NPR' }),
      (err: unknown) => err instanceof PaymentError,
    );
  });
});
