# Koseli Xpress Payment Module

Production-ready payment subsystem with gateway adapter pattern, MongoDB persistence, SSE realtime status, webhooks, and admin credential management.

## Architecture

```
backend/src/modules/payment/
├── gateways/          # Adapter implementations (eSewa, Khalti, Fonepay, Card/NPS)
├── services/          # Business logic (PaymentService, config cache, SSE events)
├── repositories/      # MongoDB + legacy ApiStore merge
├── controllers/       # HTTP handlers
├── routes/            # Express router
├── models/            # Mongoose schemas
├── validators/        # Input validation
├── utils/             # Crypto, retry, masking
└── tests/             # Unit tests
```

## MongoDB Collections

| Collection | Purpose |
|------------|---------|
| `payments` | Payment records with status, amount, verification |
| `payment_transactions` | Gateway request/response audit trail |
| `payment_logs` | Admin & system logs (secrets masked) |
| `payment_webhooks` | Idempotent webhook storage |
| `payment_gateway_configs` | Admin-managed credentials |

Run migration: `npm run migrate:payment`

## Environment Variables

See project `.env` — never commit secrets.

Credential priority: **Admin DB → ApiStore legacy → .env fallback**

Config cache TTL: 60 seconds (auto-refresh, no restart required).

## API Endpoints

### Public

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/payments/create` | Create & initialize payment |
| POST | `/api/payments/verify` | Server-side verification |
| POST | `/api/payments/webhook/:gateway` | Webhook handler |
| GET | `/api/payments/status/:id` | Payment status |
| GET | `/api/payments/gateways` | Active gateways |
| GET | `/api/payments/events/:id` | SSE realtime status |

### Admin

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/payments/admin/payment-config` | List configs (masked) |
| PUT | `/api/payments/admin/payment-config` | Update configs |
| POST | `/api/payments/admin/payment-config/test` | Test connection |

### Legacy (backward compatible)

All existing `/api/payment/*` routes remain mounted on the same router.

## Payment Flow

```
Customer selects gateway → POST /payments/create → Redirect/form → Provider
→ Return URL → POST /payments/verify → Order finalized → SSE success event
```

## Gateway Adapters

Each adapter implements:

- `initializePayment()`
- `verifyPayment()`
- `checkStatus()`
- `refundPayment()`
- `handleWebhook()`
- `testConnection()`

Add a new gateway: create `gateways/mygateway.gateway.ts` and register in `gateway.registry.ts`.

## Frontend Module

```
frontend/src/modules/payment/
├── components/   PaymentSelector, GatewayCard, PaymentToast, PaymentLoader
├── hooks/        usePaymentToast, usePaymentStatusSSE
├── services/     paymentApi
└── constants/    gatewayMeta, toast copy
```

## Testing

```bash
cd backend
npm run test:payment
```

## Security

- Secrets never sent to frontend (masked in admin API)
- HMAC signature verification (eSewa, NPS)
- Webhook secret header validation
- Rate limiting on payment routes
- Idempotency keys for create/webhook
- Exponential backoff on verification retries

## Deployment

1. Set `.env` credentials
2. `npm run migrate:payment`
3. Enable gateways in Admin → Settings → Payment Gateways
4. Configure NPS return URL: `{APP_URL}/payment/nps/callback`
5. Set `PAYMENT_WEBHOOK_SECRET` for webhook endpoints
