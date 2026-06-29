import React from 'react';
import { GatewayLogo } from './icons/GatewayIcons';
import { GATEWAY_META } from '../constants/gatewayMeta';

interface GatewayCardProps {
  gatewayId: string;
  displayName: string;
  logoUrl?: string;
  selected: boolean;
  disabled?: boolean;
  unavailableReason?: string;
  onSelect: () => void;
}

export default function GatewayCard({
  gatewayId,
  displayName,
  logoUrl,
  selected,
  disabled,
  unavailableReason,
  onSelect,
}: GatewayCardProps) {
  const meta = GATEWAY_META[gatewayId] || GATEWAY_META.esewa;
  const resolvedLogo = logoUrl || meta.logoUrl;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border p-3 min-h-[92px] transition-all text-center ${
        selected
          ? 'border-rose-500 bg-rose-50 shadow-md ring-2 ring-rose-200'
          : disabled
            ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
            : 'border-rose-100 bg-white hover:border-rose-300 hover:shadow-sm cursor-pointer'
      }`}
    >
      <GatewayLogo gatewayId={gatewayId} logoUrl={resolvedLogo} className="w-10 h-10" />
      <span className={`text-[10px] font-bold leading-tight ${disabled ? 'text-slate-400' : 'text-slate-800'}`}>
        {displayName}
      </span>
      {disabled && unavailableReason && (
        <span className="text-[8.5px] text-slate-400 leading-snug px-1">{unavailableReason}</span>
      )}
      {selected && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500" aria-hidden="true" />
      )}
    </button>
  );
}
