import {
  CreatePaymentDto,
  PaymentError,
  PaymentStatus,
  VerifyPaymentDto,
  GatewayCredentials,
} from '../types/payment.types.js';
import { getGatewayAdapter, resolveGatewayAlias } from '../gateways/gateway.registry.js';
import { paymentRepository } from '../repositories/payment.repository.js';
import { paymentConfigRepository } from '../repositories/payment-config.repository.js';
import { paymentLogService } from './payment-log.service.js';
import { paymentEventService } from './payment-event.service.js';
import { validateCreatePaymentInput, validateVerifyPaymentInput, assertAmountMatch } from '../validators/payment.validator.js';
import { generateIdempotencyHash, generatePaymentId } from '../utils/crypto.util.js';
import { withExponentialBackoff } from '../utils/retry.util.js';
import crypto from 'crypto';

export class PaymentService {
  async listActiveGateways() {
    const configs = await paymentConfigRepository.loadAll();
    return configs.map((g) => ({
      id: g.gatewayName,
      name: g.gatewayName,
      isActive: g.isActive,
      environment: g.environment,
      hasCredentials: !!(g.merchantCode || g.secretKey || g.publicKey || g.username),
    }));
  }

  async getGatewayCredentials(gateway: string, requireActive = true): Promise<GatewayCredentials> {
    const normalized = gateway.trim().toLowerCase();
    const candidates = Array.from(
      new Set([normalized, resolveGatewayAlias(normalized), normalized === 'card' ? 'nps' : ''].filter(Boolean)),
    );

    let config: GatewayCredentials | null = null;
    for (const name of candidates) {
      config = await paymentConfigRepository.getByGateway(name);
      if (config) break;
    }
    if (!config) {
      throw new PaymentError(`Gateway "${gateway}" is not configured.`, 'GATEWAY_NOT_CONFIGURED', 404);
    }
    if (requireActive && !config.isActive) {
      throw new PaymentError(`Gateway "${gateway}" is disabled.`, 'GATEWAY_DISABLED', 400);
    }
    return config;
  }

  async createPayment(input: CreatePaymentDto) {
    validateCreatePaymentInput(input);
    const gatewayName = resolveGatewayAlias(input.gateway);
    const adapter = getGatewayAdapter(gatewayName);
    if (!adapter) throw new PaymentError(`Unsupported gateway "${input.gateway}".`, 'UNSUPPORTED_GATEWAY', 400);

    const credentials = await this.getGatewayCredentials(gatewayName);

    if (input.idempotencyKey) {
      const hash = generateIdempotencyHash(input.idempotencyKey);
      const existing = await paymentRepository.findByIdempotencyKey(hash);
      if (existing) {
        return {
          paymentId: existing.paymentId,
          status: existing.status,
          duplicate: true,
          gatewayReference: existing.gatewayReference,
        };
      }
    }

    const paymentId = generatePaymentId();

    await paymentLogService.info('payment.create', `Creating payment for order ${input.orderRef}`, {
      gateway: gatewayName,
      payload: { amount: input.amount, currency: input.currency },
    });

    paymentEventService.emit(paymentId, PaymentStatus.Processing, 'Payment started');

    const initResult = await adapter.initializePayment(credentials, input);

    const record = await paymentRepository.createPayment({
      paymentId,
      orderId: input.orderId,
      orderRef: input.orderRef,
      gateway: gatewayName,
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      status: initResult.status,
      gatewayReference: initResult.gatewayReference,
      verified: false,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      customerName: input.customerName,
      idempotencyKey: input.idempotencyKey ? generateIdempotencyHash(input.idempotencyKey) : undefined,
      metadata: input.metadata,
    });

    await paymentRepository.logTransaction({
      paymentId,
      gateway: gatewayName,
      type: 'initiate',
      requestPayload: input as unknown as Record<string, unknown>,
      responsePayload: initResult as unknown as Record<string, unknown>,
      status: initResult.status,
      success: true,
    });

    paymentEventService.emit(paymentId, PaymentStatus.Processing, 'Redirecting to payment gateway');

    return {
      paymentId: record.paymentId,
      status: record.status,
      redirectUrl: initResult.redirectUrl,
      formAction: initResult.formAction,
      formFields: initResult.formFields,
      gatewayReference: initResult.gatewayReference,
      duplicate: false,
    };
  }

  async verifyPayment(input: VerifyPaymentDto) {
    validateVerifyPaymentInput(input);
    const gatewayName = resolveGatewayAlias(input.gateway);
    const adapter = getGatewayAdapter(gatewayName);
    if (!adapter) throw new PaymentError(`Unsupported gateway "${input.gateway}".`, 'UNSUPPORTED_GATEWAY', 400);

    const credentials = await this.getGatewayCredentials(gatewayName, false);
    let paymentRecord = input.paymentId
      ? await paymentRepository.findByPaymentId(input.paymentId)
      : input.orderRef
        ? await paymentRepository.findByOrderRef(input.orderRef)
        : null;

    if (paymentRecord?.verified && paymentRecord.status === PaymentStatus.Success) {
      return { verified: true, duplicate: true, status: paymentRecord.status, paymentId: paymentRecord.paymentId };
    }

    paymentEventService.emit(paymentRecord?.paymentId || input.paymentId || 'unknown', PaymentStatus.Processing, 'Verifying payment');

    const verifyResult = await withExponentialBackoff(
      () => adapter.verifyPayment(credentials, input),
      { label: `${gatewayName}-verify` },
    );

    if (paymentRecord && input.amount !== undefined) {
      assertAmountMatch(paymentRecord.amount, verifyResult.amount ?? paymentRecord.amount);
    }

    const paymentId = paymentRecord?.paymentId || input.paymentId || generatePaymentId();
    const nextStatus = verifyResult.verified ? PaymentStatus.Success : verifyResult.status;

    if (paymentRecord) {
      await paymentRepository.updatePayment(paymentRecord.paymentId, {
        status: nextStatus,
        verified: verifyResult.verified,
        transactionId: verifyResult.transactionId,
        gatewayReference: verifyResult.gatewayReference || paymentRecord.gatewayReference,
        paidAt: verifyResult.paidAt,
      });
    }

    await paymentRepository.logTransaction({
      paymentId,
      gateway: gatewayName,
      type: 'verify',
      requestPayload: input as unknown as Record<string, unknown>,
      responsePayload: verifyResult as unknown as Record<string, unknown>,
      status: nextStatus,
      success: verifyResult.verified,
    });

    await paymentLogService.info('payment.verify', `Verification ${verifyResult.verified ? 'success' : 'pending'}`, {
      paymentId,
      gateway: gatewayName,
    });

    paymentEventService.emit(paymentId, nextStatus, verifyResult.verified ? 'Payment successful' : 'Verification pending');

    return {
      verified: verifyResult.verified,
      duplicate: false,
      status: nextStatus,
      paymentId,
      transactionId: verifyResult.transactionId,
      gatewayReference: verifyResult.gatewayReference,
      amount: verifyResult.amount,
      environment: credentials.environment,
      ...verifyResult,
    };
  }

  async getPaymentStatus(paymentId: string) {
    const record = await paymentRepository.findByPaymentId(paymentId);
    if (!record) throw new PaymentError('Payment not found.', 'NOT_FOUND', 404);
    return {
      paymentId: record.paymentId,
      orderRef: record.orderRef,
      gateway: record.gateway,
      amount: record.amount,
      currency: record.currency,
      status: record.status,
      verified: record.verified,
      transactionId: record.transactionId,
      gatewayReference: record.gatewayReference,
      paidAt: record.paidAt,
    };
  }

  async handleWebhook(gateway: string, payload: Record<string, unknown>, headers: Record<string, string>) {
    const gatewayName = resolveGatewayAlias(gateway);
    const adapter = getGatewayAdapter(gatewayName);
    if (!adapter) throw new PaymentError('Unsupported webhook gateway.', 'UNSUPPORTED_GATEWAY', 400);

    const credentials = await this.getGatewayCredentials(gatewayName, false);
    const webhookId = String(payload.id || payload.webhookId || crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'));

    const isNew = await paymentRepository.logWebhook({
      webhookId,
      gateway: gatewayName,
      eventType: String(payload.type || payload.event || ''),
      payload,
      signature: headers['stripe-signature'] || headers['x-webhook-signature'],
      processed: false,
      duplicate: false,
    });

    if (!isNew) {
      return { accepted: true, duplicate: true };
    }

    const result = await adapter.handleWebhook(credentials, payload, headers);
    await paymentLogService.info('payment.webhook', 'Webhook processed', { gateway: gatewayName, payload });

    if (result.paymentId && result.status) {
      paymentEventService.emit(result.paymentId, result.status);
    }

    return result;
  }

  async testGatewayConnection(gateway: string) {
    const gatewayName = resolveGatewayAlias(gateway);
    const adapter = getGatewayAdapter(gatewayName);
    if (!adapter) throw new PaymentError(`Gateway "${gateway}" not supported.`, 'UNSUPPORTED_GATEWAY', 400);
    const credentials = await this.getGatewayCredentials(gatewayName, false);
    return adapter.testConnection(credentials);
  }

  async updateAdminConfig(configs: GatewayCredentials[], updatedBy?: string) {
    for (const config of configs) {
      await paymentConfigRepository.upsertConfig({ ...config, updatedBy });
    }
    paymentConfigRepository.invalidateCache();
    await paymentLogService.info('admin.config.update', 'Payment gateway configuration updated', { actor: updatedBy, payload: configs.map((c) => c.gatewayName) });
    return { success: true };
  }

  async getAdminConfigs() {
    const configs = await paymentConfigRepository.loadAll(true);
    return configs.map((c) => ({
      ...c,
      secretKey: c.secretKey ? `${c.secretKey.slice(0, 4)}…` : '',
      password: c.password ? '******' : '',
    }));
  }
}

export const paymentService = new PaymentService();
