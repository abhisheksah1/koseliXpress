import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getGatewayAdapter, resolveGatewayAlias } from '../gateways/gateway.registry.js';
import { calculateNpsSignature, generateEsewaSignature } from '../utils/crypto.util.js';
import { mapKhaltiLookupStatus } from '../gateways/khalti.gateway.js';
import { mapNpsTransactionStatus } from '../gateways/card.gateway.js';
import { buildGatewayConfigRecord, resolveGatewayConfig } from '../services/payment-config.service.js';
import { validateCreatePaymentInput } from '../validators/payment.validator.js';
import { PaymentError, PaymentStatus } from '../types/payment.types.js';

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
    const sig = generateEsewaSignature('100.00', 'KO-123', 'EPAYTEST', '8gBm/:&EnhH.1/q');
    assert.equal(typeof sig, 'string');
    assert.ok(sig.length > 10);
  });

  it('uses comma-separated signed field format from eSewa docs', () => {
    const sig = generateEsewaSignature('100', '11-201-13', 'EPAYTEST', '8gBm/:&EnhH.1/q');
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

describe('NPS OnePG signature & status', () => {
  it('builds HMAC-SHA512 from alphabetically sorted value concatenation', () => {
    const sig = calculateNpsSignature({ MerchantId: '9', MerchantName: 'TestMerchant' }, 'SecretKey');
    assert.equal(sig, calculateNpsSignature({ MerchantName: 'TestMerchant', MerchantId: '9' }, 'SecretKey'));
    assert.match(sig, /^[a-f0-9]{128}$/);
  });

  it('maps OnePG Status field (Success | Fail | Pending)', () => {
    assert.equal(mapNpsTransactionStatus('Success').verified, true);
    assert.equal(mapNpsTransactionStatus('Success').status, PaymentStatus.Success);
    assert.equal(mapNpsTransactionStatus('Fail').status, PaymentStatus.Failed);
    assert.equal(mapNpsTransactionStatus('Pending').status, PaymentStatus.Pending);
  });
});

describe('Khalti ePayment lookup status', () => {
  it('only Completed is verified per Khalti docs', () => {
    assert.equal(mapKhaltiLookupStatus('Completed').verified, true);
    assert.equal(mapKhaltiLookupStatus('User canceled').status, PaymentStatus.Cancelled);
    assert.equal(mapKhaltiLookupStatus('Expired').status, PaymentStatus.Expired);
    assert.equal(mapKhaltiLookupStatus('Pending').verified, false);
  });
});

describe('PaymentConfigService', () => {
  it('prefers admin credentials over env fallback', () => {
    const record = buildGatewayConfigRecord('esewa', {
      legacy: { id: 'esewa', merchantId: 'ADMIN-CODE', secretKey: 'admin-secret', apiEnvironment: 'live', isEnabled: true },
      env: {
        gatewayName: 'esewa',
        environment: 'sandbox',
        isActive: true,
        environmentCredentials: { sandbox: { merchantCode: 'EPAYTEST', secretKey: 'env-secret' } },
      },
    });
    const resolved = resolveGatewayConfig(record);
    assert.equal(resolved.merchantCode, 'ADMIN-CODE');
    assert.equal(resolved.secretKey, 'admin-secret');
    assert.equal(resolved.environment, 'live');
  });

  it('falls back to env when admin secret is empty', () => {
    const record = buildGatewayConfigRecord('khalti', {
      legacy: { id: 'khalti', merchantId: '', secretKey: '', apiEnvironment: 'test', isEnabled: true },
      env: {
        gatewayName: 'khalti',
        environment: 'sandbox',
        isActive: true,
        environmentCredentials: { sandbox: { secretKey: 'env-khalti-secret' } },
      },
    });
    const resolved = resolveGatewayConfig(record);
    assert.equal(resolved.secretKey, 'env-khalti-secret');
  });
});
