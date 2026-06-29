import React from 'react';
import { Loader2 } from 'lucide-react';

export default function PaymentLoader({ label = 'Processing payment…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <Loader2 className="w-8 h-8 text-rose-600 animate-spin" />
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export function PaymentButton({
  loading,
  disabled,
  children,
  onClick,
}: {
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-extrabold text-xs uppercase tracking-widest disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
