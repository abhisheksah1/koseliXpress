import React from 'react';
import { AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { PaymentToastMessage } from '../types/payment.types';

const variantStyles: Record<PaymentToastMessage['variant'], string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  loading: 'border-slate-200 bg-white text-slate-800',
  info: 'border-sky-200 bg-sky-50 text-sky-900',
};

function ToastIcon({ variant }: { variant: PaymentToastMessage['variant'] }) {
  if (variant === 'success') return <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
  if (variant === 'error') return <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />;
  if (variant === 'loading') return <Loader2 className="w-5 h-5 text-rose-600 animate-spin shrink-0" />;
  return <Info className="w-5 h-5 text-sky-600 shrink-0" />;
}

export default function PaymentToastStack({
  toasts,
  onDismiss,
}: {
  toasts: PaymentToastMessage[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto border rounded-xl shadow-lg px-4 py-3 flex items-start gap-3 ${variantStyles[toast.variant]}`}
        >
          <ToastIcon variant={toast.variant} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">{toast.title}</p>
            {toast.message && <p className="text-xs mt-0.5 opacity-90">{toast.message}</p>}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="text-xs font-bold opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
