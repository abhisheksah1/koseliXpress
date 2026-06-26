import React from 'react';

type CheckoutStepBannerProps = {
  step: 1 | 2;
  label: string;
};

export function CheckoutStepBanner({ step, label }: CheckoutStepBannerProps) {
  return (
    <div className="flex items-center gap-3 pb-3 mb-1 border-b border-pink-100">
      <span className="shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-[#E91E63] to-[#C2185B] text-white text-[11px] font-black flex items-center justify-center shadow-sm shadow-pink-500/25">
        {step}
      </span>
      <div>
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#E91E63] block leading-none mb-1">
          Step {step} of 2
        </span>
        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">{label}</span>
      </div>
    </div>
  );
}

type CheckoutSectionProps = {
  number: number;
  title: string;
  badge?: 'mandatory' | 'optional';
  children: React.ReactNode;
};

export function CheckoutSection({ number, title, badge, children }: CheckoutSectionProps) {
  return (
    <div className="checkout-section-card relative overflow-hidden">
      <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-pink-50">
        <span className="w-6 h-6 rounded-lg bg-[#FCE4EC] text-[#E91E63] flex items-center justify-center font-black text-xs">
          {number}
        </span>
        <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex-1">{title}</h4>
        {badge === 'mandatory' && (
          <span className="text-[8px] bg-[#FCE4EC] text-[#C2185B] border border-pink-200/80 px-2 py-0.5 rounded-md uppercase font-bold tracking-wider">
            Mandatory
          </span>
        )}
        {badge === 'optional' && (
          <span className="text-[8px] bg-slate-50 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-md uppercase font-bold tracking-wider">
            Optional
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

type CheckoutFieldProps = {
  label: string;
  required?: boolean;
  mono?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function CheckoutField({ label, required, mono, children, className = '' }: CheckoutFieldProps) {
  return (
    <div className={className}>
      <label className={`block text-[9.5px] font-bold uppercase mb-1.5 text-slate-500 tracking-wide ${mono ? 'font-mono' : ''}`}>
        {label}{required ? ' *' : ''}
      </label>
      {children}
    </div>
  );
}

export const checkoutInputClass =
  'w-full px-3.5 py-2.5 border border-pink-100 rounded-xl text-xs transition focus:outline-none focus:ring-2 focus:ring-[#E91E63]/15 focus:border-[#E91E63]/40 bg-[#FFF8FA] text-slate-800 placeholder:text-slate-400 font-medium';

export const checkoutSelectClass =
  'w-full px-3.5 py-2.5 border border-pink-100 rounded-xl text-xs bg-[#FFF8FA] transition focus:outline-none focus:ring-2 focus:ring-[#E91E63]/15 focus:border-[#E91E63]/40 font-semibold text-slate-800 appearance-none cursor-pointer';

export function CheckoutSubheading({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase font-bold tracking-[0.18em] text-violet-600 font-mono block">
      {children}
    </span>
  );
}
