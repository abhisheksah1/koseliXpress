import React from 'react';
import { ChevronDown } from 'lucide-react';

const inputBase =
  'w-full px-3.5 py-2.5 text-sm text-slate-800 bg-white border border-pink-100 rounded-xl shadow-sm transition-all duration-150 placeholder:text-slate-400 focus:outline-none focus:border-[#E91E63]/40 focus:ring-2 focus:ring-[#E91E63]/15';

const selectBase =
  'admin-premium-select w-full appearance-none pl-3.5 pr-10 py-2.5 text-sm font-medium text-slate-800 bg-white border border-pink-100 rounded-xl shadow-sm cursor-pointer transition-all duration-150 focus:outline-none focus:border-[#E91E63]/40 focus:ring-2 focus:ring-[#E91E63]/15 hover:border-pink-200';

export function AdminLabel({
  children,
  hint,
  required,
}: {
  children: React.ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div className="mb-1.5">
      <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {children}
        {required && <span className="text-[#E91E63] ml-0.5">*</span>}
      </label>
      {hint && <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{hint}</p>}
    </div>
  );
}

export function AdminInput({
  label,
  hint,
  required,
  className = '',
  mono,
  ...props
}: {
  label?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  mono?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'>) {
  return (
    <div className={className}>
      {label && <AdminLabel hint={hint} required={required}>{label}</AdminLabel>}
      <input
        {...props}
        className={`${inputBase} ${mono ? 'font-mono' : ''}`}
      />
    </div>
  );
}

export function AdminTextarea({
  label,
  hint,
  required,
  className = '',
  ...props
}: {
  label?: string;
  hint?: string;
  required?: boolean;
  className?: string;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>) {
  return (
    <div className={className}>
      {label && <AdminLabel hint={hint} required={required}>{label}</AdminLabel>}
      <textarea {...props} className={`${inputBase} resize-y min-h-[80px]`} />
    </div>
  );
}

export function AdminSelect({
  label,
  hint,
  required,
  className = '',
  selectClassName = '',
  children,
  ...props
}: {
  label?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  selectClassName?: string;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className'>) {
  return (
    <div className={className}>
      {label && <AdminLabel hint={hint} required={required}>{label}</AdminLabel>}
      <div className="relative">
        <select {...props} className={`${selectBase} ${selectClassName}`}>
          {children}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E91E63]/50 pointer-events-none" />
      </div>
    </div>
  );
}

export function AdminSection({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-pink-100/80 bg-gradient-to-br from-white to-pink-50/30 p-5 shadow-sm ${className}`}>
      <div className="mb-4 pb-3 border-b border-pink-100/60">
        <h5 className="text-sm font-bold text-slate-800">{title}</h5>
        {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function AdminPrimaryButton({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#E91E63] to-[#C2185B] hover:from-[#D81B60] hover:to-[#AD1457] rounded-xl shadow-md shadow-pink-900/15 transition disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function AdminGhostButton({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:border-pink-200 hover:bg-pink-50/50 rounded-xl transition ${className}`}
    >
      {children}
    </button>
  );
}

export function AdminCatalogStyles() {
  return (
    <style>{`
      .admin-premium-select option {
        background: #fff;
        color: #1e293b;
        padding: 8px;
      }
      .admin-catalog-tab-active {
        background: linear-gradient(135deg, #E91E63 0%, #C2185B 100%) !important;
        color: #fff !important;
        box-shadow: 0 4px 14px rgba(233, 30, 99, 0.25);
      }
    `}</style>
  );
}
