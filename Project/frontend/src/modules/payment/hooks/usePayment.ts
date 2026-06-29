import { useCallback, useState } from 'react';
import { PaymentToastMessage, PaymentToastVariant } from '../types/payment.types';

let toastCounter = 0;

export function usePaymentToast() {
  const [toasts, setToasts] = useState<PaymentToastMessage[]>([]);

  const push = useCallback((title: string, variant: PaymentToastVariant = 'info', message?: string) => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => [...prev, { id, title, message, variant }]);
    if (variant !== 'loading') {
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    }
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, push, dismiss };
}

export function usePaymentStatusSSE(paymentId: string | null, onStatus?: (status: string, message?: string) => void) {
  const [status, setStatus] = useState<string>('pending');

  const subscribe = useCallback(() => {
    if (!paymentId) return () => undefined;
    const source = new EventSource(`/api/payments/events/${paymentId}`);
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { status: string; message?: string };
        setStatus(data.status);
        onStatus?.(data.status, data.message);
      } catch {
        /* ignore */
      }
    };
    return () => source.close();
  }, [paymentId, onStatus]);

  return { status, subscribe };
}
