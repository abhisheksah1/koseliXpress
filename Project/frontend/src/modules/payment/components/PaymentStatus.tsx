import React from 'react';
import { PaymentStatus } from '../types/payment.types';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  [PaymentStatus.Pending]: { label: 'Pending', className: 'bg-amber-100 text-amber-800' },
  [PaymentStatus.Processing]: { label: 'Processing', className: 'bg-sky-100 text-sky-800' },
  [PaymentStatus.Success]: { label: 'Success', className: 'bg-emerald-100 text-emerald-800' },
  [PaymentStatus.Failed]: { label: 'Failed', className: 'bg-red-100 text-red-800' },
  [PaymentStatus.Cancelled]: { label: 'Cancelled', className: 'bg-slate-100 text-slate-700' },
  [PaymentStatus.Expired]: { label: 'Expired', className: 'bg-orange-100 text-orange-800' },
};

export default function PaymentStatusBadge({ status }: { status: string }) {
  const meta = STATUS_LABELS[status] || { label: status, className: 'bg-slate-100 text-slate-700' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${meta.className}`}>
      {meta.label}
    </span>
  );
}
