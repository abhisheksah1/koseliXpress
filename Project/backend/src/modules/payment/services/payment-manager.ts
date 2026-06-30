/**
 * PaymentManager — facade for checkout payment operations.
 * Configuration is resolved dynamically via PaymentConfigService (Admin → .env → defaults).
 */
import { paymentService } from './payment.service.js';
import { paymentConfigRepository } from '../repositories/payment-config.repository.js';
import { paymentConfigService } from './payment-config.service.js';
import { CreatePaymentDto, VerifyPaymentDto } from '../types/payment.types.js';
import { ResolvedGatewayConfig } from '../types/payment-config.types.js';

export class PaymentManager {
  async getGatewayConfig(gateway: string) {
    const credentials = await paymentConfigRepository.getByGateway(gateway, true);
    if (!credentials) return null;
    return credentials;
  }

  async getResolvedConfig(gateway: string): Promise<ResolvedGatewayConfig | null> {
    const creds = await this.getGatewayConfig(gateway);
    if (!creds) return null;
    return paymentConfigService.resolveRecord({
      gatewayName: creds.gatewayName,
      environment: creds.environment,
      isActive: creds.isActive,
      environmentCredentials: {},
      merchantCode: creds.merchantCode,
      secretKey: creds.secretKey,
      publicKey: creds.publicKey,
      callbackUrl: creds.callbackUrl,
      verifyUrl: creds.verifyUrl,
      extraSettings: creds.extraSettings,
    });
  }

  listActiveGateways() {
    return paymentService.listActiveGateways();
  }

  createPayment(input: CreatePaymentDto) {
    return paymentService.createPayment(input);
  }

  verifyPayment(input: VerifyPaymentDto) {
    return paymentService.verifyPayment(input);
  }

  testGateway(gatewayId: string) {
    return paymentService.testGatewayConnection(gatewayId);
  }
}

export const paymentManager = new PaymentManager();
