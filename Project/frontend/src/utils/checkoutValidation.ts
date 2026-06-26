export type CheckoutFieldValidation = {
  ok: boolean;
  missing: string[];
  message: string;
};

function isFilled(value: string | undefined | null): boolean {
  return !!(value && value.trim().length > 0);
}

export function validateSenderFields(
  senderName: string,
  senderEmail: string,
  senderPhone: string,
): CheckoutFieldValidation {
  const missing: string[] = [];
  if (!isFilled(senderName)) missing.push('Sender Full Name');
  if (!isFilled(senderEmail)) missing.push('Sender Email');
  if (!isFilled(senderPhone)) missing.push('Sender Phone');
  return {
    ok: missing.length === 0,
    missing,
    message: missing.length
      ? `Please complete: ${missing.join(', ')}.`
      : '',
  };
}

export function validateRecipientFields(params: {
  receiverName: string;
  receiverPhone: string;
  deliveryAddress: string;
  deliveryDistrictId: string;
  manualDeliveryDistrict: string;
  districtsCount: number;
  districtsList: { id: string; name: string }[];
}): CheckoutFieldValidation {
  const missing: string[] = [];
  if (!isFilled(params.receiverName)) missing.push('Receiver Name');
  if (!isFilled(params.receiverPhone)) missing.push('Receiver Phone');
  if (!isFilled(params.deliveryAddress)) missing.push('Detailed Address');

  if (params.districtsCount > 0) {
    const id = params.deliveryDistrictId.trim();
    if (!id) {
      missing.push('District / City (select from dropdown)');
    } else if (!params.districtsList.some((d) => d.id === id)) {
      missing.push('District / City (choose a valid location)');
    }
  } else if (!isFilled(params.manualDeliveryDistrict)) {
    missing.push('District / City');
  }

  return {
    ok: missing.length === 0,
    missing,
    message: missing.length
      ? `Please complete recipient delivery fields: ${missing.join(', ')}.`
      : '',
  };
}

export function resolveDeliveryDistrict(
  districtsList: { id: string; name: string; chargeNPR: number }[],
  deliveryDistrictId: string,
  manualDeliveryDistrict: string,
): { id: string; name: string; chargeNPR: number } | null {
  if (districtsList.length > 0) {
    return districtsList.find((d) => d.id === deliveryDistrictId.trim()) ?? null;
  }
  const name = manualDeliveryDistrict.trim();
  if (!name) return null;
  return { id: 'manual-district', name, chargeNPR: 0 };
}

/** Default Nepal delivery zones when admin has not configured any */
export const DEFAULT_DELIVERY_DISTRICTS = [
  { id: 'dist-kathmandu', name: 'Kathmandu', chargeNPR: 150 },
  { id: 'dist-lalitpur', name: 'Lalitpur', chargeNPR: 150 },
  { id: 'dist-bhaktapur', name: 'Bhaktapur', chargeNPR: 200 },
  { id: 'dist-pokhara', name: 'Pokhara', chargeNPR: 350 },
  { id: 'dist-chitwan', name: 'Chitwan', chargeNPR: 400 },
  { id: 'dist-other', name: 'Other / Outside Valley', chargeNPR: 500 },
];
