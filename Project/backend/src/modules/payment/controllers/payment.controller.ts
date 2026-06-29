import { Request, Response } from 'express';
import { paymentService } from '../services/payment.service.js';
import { paymentEventService } from '../services/payment-event.service.js';
import { asyncHandler } from './payment.controller.helpers.js';
import { paymentConfigRepository } from '../repositories/payment-config.repository.js';
import { paymentRepository } from '../repositories/payment.repository.js';
import { mergeGatewayConfigs, getEnvGatewayDefaults } from '../../../services/paymentGatewayService.js';
import { maskSecret } from '../utils/mask.util.js';

export const createPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.createPayment({
    orderId: req.body.orderId,
    orderRef: req.body.orderRef,
    gateway: req.body.gateway,
    amount: Number(req.body.amount),
    currency: req.body.currency || 'NPR',
    customerName: req.body.customerName,
    customerEmail: req.body.customerEmail,
    customerPhone: req.body.customerPhone,
    successUrl: req.body.successUrl,
    failureUrl: req.body.failureUrl,
    returnUrl: req.body.returnUrl,
    idempotencyKey: req.headers['idempotency-key'] as string | undefined,
    metadata: req.body.metadata,
  });
  res.status(result.duplicate ? 200 : 201).json(result);
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.verifyPayment({
    paymentId: req.body.paymentId,
    orderRef: req.body.orderRef || req.body.transaction_uuid || req.body.purchase_order_id,
    gateway: req.body.gateway,
    gatewayReference: req.body.gatewayReference || req.body.pidx || req.body.merchantTxnId || req.body.transaction_uuid,
    amount: req.body.amount !== undefined ? Number(req.body.amount) : undefined,
    currency: req.body.currency,
    rawPayload: req.body,
  });
  res.json(result);
});

export const getPaymentStatus = asyncHandler(async (req, res) => {
  const result = await paymentService.getPaymentStatus(req.params.id);
  res.json(result);
});

export const listGateways = asyncHandler(async (_req, res) => {
  const gateways = await paymentService.listActiveGateways();
  res.json({ gateways });
});

export const paymentWebhook = asyncHandler(async (req, res) => {
  const gateway = req.params.gateway;
  const result = await paymentService.handleWebhook(gateway, req.body, req.headers as Record<string, string>);
  res.json(result);
});

export const subscribePaymentEvents = (req: Request, res: Response): void => {
  paymentEventService.subscribe(req.params.id, res);
};

// Legacy compatibility handlers
export const legacyInitiateEsewa = asyncHandler(async (req, res) => {
  const result = await paymentService.createPayment({
    orderId: req.body.transactionUuid,
    orderRef: req.body.transactionUuid,
    gateway: 'esewa',
    amount: Number(req.body.amount),
    currency: 'NPR',
    successUrl: req.body.successUrl,
    failureUrl: req.body.failureUrl,
  });
  res.json({ action: result.formAction, fields: result.formFields });
});

export const legacyInitiateKhalti = asyncHandler(async (req, res) => {
  const result = await paymentService.createPayment({
    orderId: req.body.purchase_order_id,
    orderRef: req.body.purchase_order_id,
    gateway: 'khalti',
    amount: Number(req.body.amount),
    currency: 'NPR',
    returnUrl: req.body.return_url,
    customerName: req.body.customer_info?.name,
    customerEmail: req.body.customer_info?.email,
    customerPhone: req.body.customer_info?.phone,
  });
  res.json({ payment_url: result.redirectUrl, pidx: result.gatewayReference, ...result });
});

export const legacyVerifyKhalti = asyncHandler(async (req, res) => {
  const result = await paymentService.verifyPayment({ gateway: 'khalti', gatewayReference: req.body.pidx, rawPayload: req.body });
  res.json({ ...result, verified: result.verified, pidx: req.body.pidx, status: result.verified ? 'Completed' : 'Pending' });
});

export const legacyVerifyEsewa = asyncHandler(async (req, res) => {
  const result = await paymentService.verifyPayment({
    gateway: 'esewa',
    gatewayReference: req.body.transaction_uuid,
    amount: req.body.total_amount,
    rawPayload: req.body,
  });
  res.json(result);
});

export const legacyInitiateNps = asyncHandler(async (req, res) => {
  const result = await paymentService.createPayment({
    orderId: req.body.merchantTxnId,
    orderRef: req.body.merchantTxnId,
    gateway: 'nps',
    amount: Number(req.body.amount),
    currency: 'NPR',
  });
  const redirectUrl = result.redirectUrl || '';
  const processId = redirectUrl ? new URL(redirectUrl).searchParams.get('ProcessId') : null;
  const gatewayUrl = redirectUrl.split('?')[0] || '';
  res.json({
    code: '0',
    message: 'Success',
    data: { ProcessId: processId },
    gatewayUrl,
    redirectUrl,
  });
});

export const legacyCheckNpsStatus = asyncHandler(async (req, res) => {
  const result = await paymentService.verifyPayment({ gateway: 'nps', gatewayReference: req.body.merchantTxnId, rawPayload: req.body });
  res.json({ code: result.verified ? '0' : '1', data: { Status: result.verified ? 'Success' : 'Pending', MerchantTxnId: req.body.merchantTxnId }, verified: result.verified });
});

export const legacyGetGateways = asyncHandler(async (_req, res) => {
  const stored = await paymentRepository.getLegacyApiStoreGateways();
  const merged = mergeGatewayConfigs(stored as never[], getEnvGatewayDefaults());
  res.json({ paymentGateways: merged });
});

export const legacySyncGateways = asyncHandler(async (req, res) => {
  await paymentRepository.syncLegacyApiStoreGateways(req.body.paymentGateways);
  paymentConfigRepository.invalidateCache();
  res.json({ success: true, message: 'Payment gateways synced.' });
});

export const legacyEnvStatus = asyncHandler(async (_req, res) => {
  const envDefaults = getEnvGatewayDefaults();
  res.json({
    configured: envDefaults.map((gw) => ({
      id: gw.id,
      merchantId: gw.merchantId ? maskSecret(gw.merchantId) : '',
      hasSecretKey: !!gw.secretKey,
      hasPublicKey: !!gw.publicKey,
      apiEnvironment: gw.apiEnvironment,
      isEnabled: gw.isEnabled,
      extraSettings: gw.extraSettings
        ? Object.fromEntries(Object.entries(gw.extraSettings).map(([k, v]) => [k, v ? maskSecret(v) : '']))
        : {},
    })),
  });
});

export const legacyTestGateway = asyncHandler(async (req, res) => {
  const result = await paymentService.testGatewayConnection(req.params.gatewayId);
  res.json(result);
});
