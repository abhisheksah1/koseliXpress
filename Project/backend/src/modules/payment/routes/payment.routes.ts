import { Router } from 'express';
import {
  createPayment,
  verifyPayment,
  getPaymentStatus,
  listGateways,
  paymentWebhook,
  subscribePaymentEvents,
  legacyInitiateEsewa,
  legacyInitiateKhalti,
  legacyVerifyKhalti,
  legacyVerifyEsewa,
  legacyInitiateNps,
  legacyCheckNpsStatus,
  legacyNpsNotification,
  legacyGetGateways,
  legacySyncGateways,
  legacyEnvStatus,
  legacyTestGateway,
} from '../controllers/payment.controller.js';
import {
  getAdminPaymentConfig,
  updateAdminPaymentConfig,
  testAdminPaymentConfig,
} from '../controllers/admin-payment.controller.js';
import { paymentRateLimit, validateWebhookSecret } from '../middleware/payment.middleware.js';
import { paymentErrorHandler } from '../controllers/payment.controller.helpers.js';

const router = Router();

// Rate limit checkout / verify only — not admin config or webhooks
const checkoutLimit = paymentRateLimit;

// New REST API
router.post('/create', checkoutLimit, createPayment);
router.post('/verify', checkoutLimit, verifyPayment);
router.post('/webhook/:gateway', validateWebhookSecret, paymentWebhook);
router.get('/status/:id', getPaymentStatus);
router.get('/gateways', listGateways);
router.get('/events/:id', subscribePaymentEvents);

// Admin API (no rate limit — internal configuration)
router.get('/admin/payment-config', getAdminPaymentConfig);
router.put('/admin/payment-config', updateAdminPaymentConfig);
router.post('/admin/payment-config/test', testAdminPaymentConfig);
router.post('/admin/payment-config/test/:gatewayId', testAdminPaymentConfig);

// Legacy compatibility (/api/payment/*)
router.post('/initiate-esewa', checkoutLimit, legacyInitiateEsewa);
router.post('/initiate-khalti', checkoutLimit, legacyInitiateKhalti);
router.post('/verify-khalti', checkoutLimit, legacyVerifyKhalti);
router.post('/verify-esewa', checkoutLimit, legacyVerifyEsewa);
router.post('/initiate-nps', checkoutLimit, legacyInitiateNps);
router.post('/check-nps-status', checkoutLimit, legacyCheckNpsStatus);
router.get('/nps/notification', legacyNpsNotification);
router.get('/get-gateways', legacyGetGateways);
router.post('/sync-gateways', legacySyncGateways);
router.get('/env-status', legacyEnvStatus);
router.post('/test/:gatewayId', legacyTestGateway);

router.use(paymentErrorHandler);

export default router;
