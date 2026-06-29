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

router.use(paymentRateLimit);

// New REST API
router.post('/create', createPayment);
router.post('/verify', verifyPayment);
router.post('/webhook/:gateway', validateWebhookSecret, paymentWebhook);
router.get('/status/:id', getPaymentStatus);
router.get('/gateways', listGateways);
router.get('/events/:id', subscribePaymentEvents);

// Admin API
router.get('/admin/payment-config', getAdminPaymentConfig);
router.put('/admin/payment-config', updateAdminPaymentConfig);
router.post('/admin/payment-config/test', testAdminPaymentConfig);
router.post('/admin/payment-config/test/:gatewayId', testAdminPaymentConfig);

// Legacy compatibility (/api/payment/*)
router.post('/initiate-esewa', legacyInitiateEsewa);
router.post('/initiate-khalti', legacyInitiateKhalti);
router.post('/verify-khalti', legacyVerifyKhalti);
router.post('/verify-esewa', legacyVerifyEsewa);
router.post('/initiate-nps', legacyInitiateNps);
router.post('/check-nps-status', legacyCheckNpsStatus);
router.get('/get-gateways', legacyGetGateways);
router.post('/sync-gateways', legacySyncGateways);
router.get('/env-status', legacyEnvStatus);
router.post('/test/:gatewayId', legacyTestGateway);

router.use(paymentErrorHandler);

export default router;
