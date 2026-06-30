import { Request, Response } from 'express';
import { paymentService } from '../services/payment.service.js';
import { paymentEventService } from '../services/payment-event.service.js';
import { asyncHandler } from './payment.controller.helpers.js';
import { paymentConfigRepository } from '../repositories/payment-config.repository.js';
import { paymentRepository } from '../repositories/payment.repository.js';
import { mergeGatewayConfigs, getEnvGatewayDefaults } from '../../../services/paymentGatewayService.js';
import { maskSecret } from '../utils/mask.util.js';
import { PaymentStatus } from '../types/payment.types.js';
import { LegacyPaymentGateway } from '../types/payment-config.types.js';

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
    metadata: {
      website_url: req.body.website_url,
      purchase_order_name: req.body.purchase_order_name,
    },
  });
  res.json({ payment_url: result.redirectUrl, pidx: result.gatewayReference, ...result });
});

export const legacyVerifyKhalti = asyncHandler(async (req, res) => {
  const result = await paymentService.verifyPayment({
    gateway: 'khalti',
    gatewayReference: req.body.pidx,
    rawPayload: req.body,
  });
  const raw = result.raw as {
    status?: string;
    total_amount?: number;
    transaction_id?: string | null;
    fee?: number;
    refunded?: boolean;
    pidx?: string;
  } | undefined;
  res.json({
    verified: result.verified,
    pidx: raw?.pidx || req.body.pidx,
    status: raw?.status || (result.verified ? 'Completed' : 'Pending'),
    total_amount: raw?.total_amount ?? (result.amount !== undefined ? Math.round(result.amount * 100) : undefined),
    transaction_id: raw?.transaction_id ?? null,
    fee: raw?.fee ?? 0,
    refunded: raw?.refunded ?? false,
    environment: result.environment,
  });
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
    successUrl: req.body.responseUrl,
    metadata: req.body.transactionRemarks ? { transactionRemarks: req.body.transactionRemarks } : undefined,
  });
  const processId = result.formFields?.ProcessId || null;
  res.json({
    code: '0',
    message: 'Success',
    data: { ProcessId: processId },
    formAction: result.formAction,
    formFields: result.formFields,
    gatewayUrl: result.formAction,
  });
});

export const legacyCheckNpsStatus = asyncHandler(async (req, res) => {
  const result = await paymentService.verifyPayment({
    gateway: 'nps',
    gatewayReference: req.body.merchantTxnId,
    rawPayload: req.body,
  });
  const raw = result.raw as {
    code?: string | number;
    message?: string;
    data?: { Status?: string; Amount?: string; GatewayReferenceNo?: string; MerchantTxnId?: string };
  } | undefined;
  const apiCode = raw?.code ?? '0';
  const status =
    raw?.data?.Status ||
    (result.verified ? 'Success' : result.status === PaymentStatus.Failed ? 'Fail' : 'Pending');
  res.json({
    code: apiCode,
    message: raw?.message || 'Success',
    data: {
      Status: status,
      MerchantTxnId: raw?.data?.MerchantTxnId || req.body.merchantTxnId,
      Amount: raw?.data?.Amount || (result.amount !== undefined ? String(result.amount) : undefined),
      GatewayReferenceNo: raw?.data?.GatewayReferenceNo,
    },
    verified: result.verified,
  });
});

/** OnePG Notification URL — GET ?MerchantTxnId=&GatewayTxnId= → plain text "received" */
export const legacyNpsNotification = asyncHandler(async (req, res) => {
  const merchantTxnId = String(req.query.MerchantTxnId || req.query.merchantTxnId || '').trim();
  const gatewayTxnId = String(req.query.GatewayTxnId || req.query.gatewayTxnId || '').trim();

  if (!merchantTxnId) {
    res.status(400).type('text/plain').send('missing MerchantTxnId');
    return;
  }

  const webhookId = `nps:${merchantTxnId}:${gatewayTxnId || 'none'}`;
  const isNew = await paymentRepository.logWebhook({
    webhookId,
    gateway: 'nps',
    eventType: 'notification',
    payload: { MerchantTxnId: merchantTxnId, GatewayTxnId: gatewayTxnId },
    processed: false,
    duplicate: false,
  });

  if (!isNew) {
    res.type('text/plain').send('already received');
    return;
  }

  try {
    await paymentService.verifyPayment({
      gateway: 'nps',
      gatewayReference: merchantTxnId,
      rawPayload: { MerchantTxnId: merchantTxnId, GatewayTxnId: gatewayTxnId },
    });
  } catch {
    // OnePG expects "received" even if status check is temporarily unavailable
  }

  res.type('text/plain').send('received');
});

export const legacyGetGateways = asyncHandler(async (_req, res) => {
  const stored = await paymentRepository.getLegacyApiStoreGateways();
  const merged = mergeGatewayConfigs(stored as never[], getEnvGatewayDefaults());
  res.json({ paymentGateways: merged });
});

export const legacySyncGateways = asyncHandler(async (req, res) => {
  const gateways = (req.body.paymentGateways || []) as LegacyPaymentGateway[];
  await paymentRepository.syncLegacyApiStoreGateways(gateways);
  await paymentConfigRepository.syncLegacyGateways(gateways);
  paymentConfigRepository.invalidateCache();
  res.json({ success: true, message: 'Payment gateway configuration saved.' });
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
