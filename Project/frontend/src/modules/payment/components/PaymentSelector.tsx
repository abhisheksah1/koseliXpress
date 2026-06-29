import React from 'react';
import GatewayCard from './GatewayCard';
import { CheckoutPaymentOption } from '../../../utils/checkoutPayments';

interface PaymentSelectorProps {
  options: CheckoutPaymentOption[];
  selectedGatewayId: string;
  onSelect: (gatewayId: string) => void;
}

export default function PaymentSelector({ options, selectedGatewayId, onSelect }: PaymentSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {options.map((option) => (
        <GatewayCard
          key={option.slotId}
          gatewayId={option.gatewayId}
          displayName={option.displayName}
          logoUrl={option.gateway?.logoUrl}
          selected={selectedGatewayId === option.gatewayId}
          disabled={!option.isSelectable}
          unavailableReason={option.unavailableReason}
          onSelect={() => {
            if (option.isSelectable) onSelect(option.gatewayId);
          }}
        />
      ))}
    </div>
  );
}
