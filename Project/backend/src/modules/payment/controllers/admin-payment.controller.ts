import { Request, Response } from 'express';
import { paymentService } from '../services/payment.service.js';
import { asyncHandler } from './payment.controller.helpers.js';
import { GatewayCredentials } from '../types/payment.types.js';

export const getAdminPaymentConfig = asyncHandler(async (_req, res) => {
  const configs = await paymentService.getAdminConfigs();
  res.json({ configs });
});

export const updateAdminPaymentConfig = asyncHandler(async (req, res) => {
  const configs = (req.body.configs || req.body.paymentGateways || []) as GatewayCredentials[];
  const updatedBy = req.headers['x-admin-user'] as string | undefined;
  const result = await paymentService.updateAdminConfig(configs, updatedBy);
  res.json(result);
});

export const testAdminPaymentConfig = asyncHandler(async (req, res) => {
  const gateway = req.body.gateway || req.params.gatewayId;
  const result = await paymentService.testGatewayConnection(gateway);
  res.json(result);
});
