import React from 'react';
import { Trash2, Ticket, CheckCircle2, Gift, Minus, Plus } from 'lucide-react';
import { DatabaseState, CartItem, CurrencySettings } from '../../types';
import { CheckoutSubheading } from './CheckoutUI';
import {
  getCheckoutPaymentOptions,
  getFirstSelectablePaymentGatewayId,
  isPaymentGatewaySelectable,
} from '../../utils/checkoutPayments';
import { PaymentSelector } from '../../modules/payment';

interface CheckoutSummaryProps {
  isLight: boolean;
  state: DatabaseState;
  cartItems: CartItem[];
  onUpdateCartItems: (items: CartItem[]) => void;
  selectedCurrency: CurrencySettings;
  onSelectCurrency: (currency: CurrencySettings) => void;
  rate: number;
  selectedFeeIds: string[];
  setSelectedFeeIds: (ids: string[]) => void;
  serviceFeeInputs: Record<string, { text?: string; imageUrl?: string }>;
  setServiceFeeInputs: React.Dispatch<React.SetStateAction<Record<string, { text?: string; imageUrl?: string }>>>;
  couponCode: string;
  setCouponCode: (code: string) => void;
  couponFeedback: string | null;
  handleApplyCoupon: () => void;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  handleSubmitCheckout: () => void;
  subtotalConverted: number;
  totalFeesConverted: number;
  deliveryChargeConverted: number;
  timeSlotChargeConverted?: number;
  discountConverted: number;
  grandTotalConverted: number;
  selectedDistrict: any;
  preferredDeliveryDate?: string;
  checkoutFieldErrors?: string[];
}

export default function CheckoutSummary({
  isLight,
  state,
  cartItems,
  onUpdateCartItems,
  selectedCurrency,
  onSelectCurrency,
  rate,
  selectedFeeIds,
  setSelectedFeeIds,
  serviceFeeInputs,
  setServiceFeeInputs,
  couponCode,
  setCouponCode,
  couponFeedback,
  handleApplyCoupon,
  paymentMethod,
  setPaymentMethod,
  handleSubmitCheckout,
  subtotalConverted,
  totalFeesConverted,
  deliveryChargeConverted,
  timeSlotChargeConverted,
  discountConverted,
  grandTotalConverted,
  selectedDistrict,
  preferredDeliveryDate,
  checkoutFieldErrors = [],
}: CheckoutSummaryProps) {
  React.useEffect(() => {
    if (!selectedDistrict) return;
    
    const validFeeIds = selectedFeeIds.filter(id => {
      const f = state.serviceFees.find(fee => fee.id === id);
      if (!f || !f.isActive) return false;
      
      const isAll = f.allowedAllLocations !== false;
      const isAllowed = isAll || f.allowedDistricts?.includes(selectedDistrict.id);
      if (!isAllowed) return false;
      
      const leadDays = f.locationLeadTimes?.[selectedDistrict.id] || 0;
      if (preferredDeliveryDate && leadDays > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selDate = new Date(preferredDeliveryDate);
        selDate.setHours(0, 0, 0, 0);
        const diff = selDate.getTime() - today.getTime();
        const dayDiff = Math.round(diff / (1000 * 60 * 60 * 24));
        if (dayDiff < leadDays) return false;
      }
      return true;
    });

    if (validFeeIds.join(',') !== selectedFeeIds.join(',')) {
      setSelectedFeeIds(validFeeIds);
    }
  }, [selectedDistrict, preferredDeliveryDate, state.serviceFees, selectedFeeIds, setSelectedFeeIds]);

  const getEarliestDateString = (days: number) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    return target.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const checkoutPaymentOptions = getCheckoutPaymentOptions(state.paymentGateways, selectedCurrency.code);
  const hasSelectablePayment = checkoutPaymentOptions.some((o) => o.isSelectable);
  const selectedPaymentOption = checkoutPaymentOptions.find((o) => o.gatewayId === paymentMethod);

  return (
    <div className="space-y-5 text-left lg:sticky lg:top-0">
      
      {/* Gift Hamper Selection */}
      <div className="checkout-section-card">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-pink-50">
          <span className="flex items-center gap-2 text-[11px] font-bold text-slate-800 uppercase tracking-wider">
            <Gift className="w-4 h-4 text-[#E91E63]" />
            Gift Hamper Selection
          </span>
          <span className="text-[10px] font-mono bg-[#FCE4EC] text-[#C2185B] border border-pink-200/80 px-2.5 py-0.5 rounded-lg font-bold">
            {cartItems.reduce((acc, i) => acc + i.quantity, 0)} Items
          </span>
        </div>

        <div className="space-y-2.5 max-h-[240px] overflow-y-auto pr-1">
          {cartItems.map((item, itemIdx) => {
            const prod = state.products.find(p => p.id === item.productId);
            if (!prod) return null;
            const itemUnitPrice = item.selectedPrice !== undefined 
              ? item.selectedPrice 
              : (prod.discountPrice && prod.discountPrice > 0 && prod.discountPrice < prod.price ? prod.discountPrice : prod.price);
            const convertedProdPrice = itemUnitPrice * rate;

            return (
              <div key={item.productId + '-' + itemIdx} className="checkout-item-row p-3 space-y-2">
                <div className="flex gap-3 items-center">
                  {(prod.images && prod.images[0]) ? (
                    <img 
                      src={prod.images[0]} 
                      className="w-12 h-12 rounded-lg object-cover border border-pink-100 shrink-0 bg-pink-50" 
                      alt="" 
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg border border-pink-100 bg-[#FCE4EC] flex items-center justify-center shrink-0">
                      <Gift className="w-5 h-5 text-[#E91E63]/60" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h5 className="truncate text-xs font-bold text-slate-800">{prod.name}</h5>
                    <span className="font-mono text-[10px] text-slate-500 font-semibold">
                      {selectedCurrency.symbol} {convertedProdPrice.toLocaleString()} each
                    </span>
                    
                    {item.selectedVariations && item.selectedVariations.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.selectedVariations.map((vOpt, vOptIdx) => (
                          <span 
                            key={vOptIdx} 
                            className="inline-block text-[8px] font-mono px-1.5 py-0.5 rounded-md bg-white text-[#C2185B] border border-pink-100"
                          >
                            {vOpt.name}: <span className="font-black">{vOpt.value}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 items-center shrink-0">
                    <div className="checkout-qty-control">
                      <button
                        type="button"
                        onClick={() => {
                          const copy = [...cartItems];
                          if (copy[itemIdx].quantity > 1) {
                            copy[itemIdx].quantity--;
                            onUpdateCartItems(copy);
                          }
                        }}
                        className="px-2 py-1.5 text-slate-600 hover:bg-pink-50 transition border-0 bg-transparent cursor-pointer flex items-center"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 py-1.5 font-mono font-bold text-xs text-slate-800 min-w-[28px] text-center bg-[#FFF8FA]">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const copy = [...cartItems];
                          copy[itemIdx].quantity++;
                          onUpdateCartItems(copy);
                        }}
                        className="px-2 py-1.5 text-slate-600 hover:bg-pink-50 transition border-0 bg-transparent cursor-pointer flex items-center"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const copy = cartItems.filter((_, idx) => idx !== itemIdx);
                        onUpdateCartItems(copy);
                      }}
                      className="p-1.5 hover:bg-red-50 text-[#E91E63] rounded-lg transition cursor-pointer border-0 bg-transparent"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Card Messages details if custom written */}
                {(item.customMessage || item.customImageUrl) && (
                  <div className="p-2 bg-white rounded border border-rose-100 space-y-1 text-[10px]">
                    {item.customMessage && (
                      <div className="leading-normal text-slate-700 font-medium font-sans">
                        <span className="font-mono text-[8px] uppercase tracking-wider text-rose-600 font-bold block">Card Hand message:</span>
                        "{item.customMessage}"
                      </div>
                    )}
                    {" "}
                    {item.customImageUrl && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[8px] uppercase tracking-wider text-rose-600 font-bold">Photo Attachment:</span>
                        <img src={item.customImageUrl} className="w-6 h-6 object-cover rounded border border-rose-100" alt="Preview" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const copy = [...cartItems];
                        copy[itemIdx] = { ...copy[itemIdx], customMessage: undefined, customImageUrl: undefined };
                        onUpdateCartItems(copy);
                      }}
                      className="text-[9px] text-rose-500 hover:text-rose-600 font-semibold underline block cursor-pointer border-0 bg-transparent p-0 mt-0.5"
                    >
                      Clear details
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Premium Add-ons */}
      <div className="checkout-section-card space-y-3.5">
        <CheckoutSubheading>Premium Add-ons & Wrapping</CheckoutSubheading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(() => {
            const activeAndAllowedFees = state.serviceFees.filter(f => {
              if (!f.isActive) return false;
              
              // 1. Check district permission
              const isAll = f.allowedAllLocations !== false;
              const isAllowed = !selectedDistrict || isAll || f.allowedDistricts?.includes(selectedDistrict.id);
              if (!isAllowed) return false;

              // 2. Check lead time (availability constraint)
              const leadDays = (selectedDistrict && f.locationLeadTimes) ? (f.locationLeadTimes[selectedDistrict.id] || 0) : 0;
              if (selectedDistrict && preferredDeliveryDate && leadDays > 0) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const selDate = new Date(preferredDeliveryDate);
                selDate.setHours(0, 0, 0, 0);
                const diff = selDate.getTime() - today.getTime();
                const dayDiff = Math.round(diff / (1000 * 60 * 60 * 24));
                if (dayDiff < leadDays) {
                  return false; // Not fulfillable, hide from view entirely
                }
              }

              return true;
            });

            if (activeAndAllowedFees.length === 0) {
              return (
                <div className="text-center py-5 bg-[#FFF8FA] border border-pink-100 rounded-xl text-xs font-medium text-slate-500 w-full col-span-full">
                  No service add-ons are available for the selected delivery options.
                </div>
              );
            }

            return activeAndAllowedFees.map(f => {
              const isChecked = selectedFeeIds.includes(f.id);
              const convertedFee = f.feeAmountNPR * rate;
              const showTextInput = f.inputType === 'text' || f.inputType === 'both';
              const showImageInput = f.inputType === 'image' || f.inputType === 'both';
              const currentInput = serviceFeeInputs[f.id] || { text: '', imageUrl: '' };

              return (
                <div key={f.id} className={`w-full space-y-2 min-w-0 ${isChecked && f.inputType && f.inputType !== 'none' ? 'md:col-span-2' : ''}`}>
                  <label 
                    className={`flex flex-col sm:flex-row justify-between items-start gap-2 p-3 rounded-xl border select-none transition ${
                      isChecked 
                        ? 'bg-[#FCE4EC]/50 border-[#E91E63]/35 text-slate-800 font-semibold cursor-pointer' 
                        : 'bg-white border-pink-100 text-slate-700 hover:bg-[#FFF8FA] cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFeeIds([...selectedFeeIds, f.id]);
                          } else {
                            setSelectedFeeIds(selectedFeeIds.filter(id => id !== f.id));
                          }
                        }}
                        className="w-4 h-4 rounded text-[#E91E63] focus:ring-[#E91E63] border-pink-200 cursor-pointer mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[11.5px] font-semibold text-slate-800 leading-snug block">{f.name}</span>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-[#E91E63] font-bold shrink-0 sm:ml-2 mt-0.5">
                      +{selectedCurrency.symbol}{convertedFee.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    </span>
                  </label>

                  {/* Customer custom inputs section based on option type */}
                  {isChecked && f.inputType && f.inputType !== 'none' && (
                    <div className="bg-white border border-rose-100 p-3 sm:p-4 rounded-xl space-y-3.5 shadow-xs animate-in slide-in-from-top-1 duration-200 text-xs font-semibold text-slate-700 text-left">
                      
                      {showTextInput && (
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold text-slate-800 font-sans">
                            {(() => {
                              const rawLabel = f.inputLabel || "Enter custom text / greeting for this option:";
                              return rawLabel.replace(/""/g, '').replace(/\\\"\\\"/g, '').replace(/\"\"/g, '').trim();
                            })() || "Your custom message / note details"}
                          </label>
                          <input
                            type="text"
                            value={currentInput.text || ''}
                            onChange={(e) => {
                              setServiceFeeInputs((prev: any) => ({
                                ...prev,
                                [f.id]: {
                                  ...prev[f.id],
                                  text: e.target.value
                                }
                              }));
                            }}
                            placeholder="Write your custom message here..."
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 bg-slate-50/50 hover:bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs font-medium transition"
                          />
                        </div>
                      )}

                      {showImageInput && (
                        <div className="space-y-2 pt-2 border-t border-dashed border-rose-100 mt-2">
                          <label className="block text-[11px] font-bold text-slate-800 font-sans">
                            {f.inputType === 'both' ? 'Upload accompanying design or photo reference:' : (() => {
                              const rawLabel = f.inputLabel || "Upload Photo:";
                              return rawLabel.replace(/""/g, '').replace(/\\\"\\\"/g, '').replace(/\"\"/g, '').trim();
                            })()}
                          </label>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-[72px_minmax(0,1fr)] items-stretch sm:items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                            {/* Image thumbnail placeholder */}
                            <div className="w-full sm:w-16 h-28 sm:h-16 bg-white rounded-lg border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden relative shadow-2xs">
                              {currentInput.imageUrl ? (
                                <>
                                  <img 
                                    src={currentInput.imageUrl} 
                                    alt="Uploaded preview" 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setServiceFeeInputs((prev: any) => ({
                                        ...prev,
                                        [f.id]: {
                                          ...prev[f.id],
                                          imageUrl: undefined
                                        }
                                      }));
                                    }}
                                    className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition duration-150 cursor-pointer text-xs"
                                    title="Remove uploaded image"
                                  >
                                    ✕
                                  </button>
                                </>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-bold font-sans text-center px-2">No Photo</span>
                              )}
                            </div>

                            {/* Upload controls */}
                            <div className="min-w-0 flex flex-col justify-center space-y-2">
                              <input
                                type="file"
                                accept="image/png, image/jpeg, image/jpg, image/webp"
                                id={`file-customer-${f.id}`}
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      const imgHtml = new Image();
                                      imgHtml.onload = () => {
                                        const maxDim = 800; // Optimal resolution for performance & quality
                                        let w = imgHtml.width;
                                        let h = imgHtml.height;
                                        if (w > maxDim || h > maxDim) {
                                          if (w > h) {
                                            h = Math.round((h * maxDim) / w);
                                            w = maxDim;
                                          } else {
                                            w = Math.round((w * maxDim) / h);
                                            h = maxDim;
                                          }
                                        }
                                        const canvas = document.createElement('canvas');
                                        canvas.width = w;
                                        canvas.height = h;
                                        const ctx = canvas.getContext('2d');
                                        if (ctx) {
                                          ctx.drawImage(imgHtml, 0, 0, w, h);
                                          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
                                          setServiceFeeInputs((prev: any) => ({
                                            ...prev,
                                            [f.id]: {
                                              ...prev[f.id],
                                              imageUrl: compressedBase64
                                            }
                                          }));
                                        } else {
                                          setServiceFeeInputs((prev: any) => ({
                                            ...prev,
                                            [f.id]: {
                                              ...prev[f.id],
                                              imageUrl: event.target?.result as string
                                            }
                                          }));
                                        }
                                      };
                                      imgHtml.onerror = () => {
                                        setServiceFeeInputs((prev: any) => ({
                                          ...prev,
                                          [f.id]: {
                                            ...prev[f.id],
                                            imageUrl: event.target?.result as string
                                          }
                                        }));
                                      };
                                      imgHtml.src = event.target?.result as string;
                                    };
                                    reader.onerror = () => {
                                      alert('Failed to read and process image file.');
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                              <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2">
                                <label
                                  htmlFor={`file-customer-${f.id}`}
                                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg shadow-xs transition cursor-pointer text-center w-full sm:w-auto"
                                >
                                  {currentInput.imageUrl ? "📸 Change Image" : "📸 Upload Photo"}
                                </label>
                                {currentInput.imageUrl && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setServiceFeeInputs((prev: any) => ({
                                        ...prev,
                                        [f.id]: {
                                          ...prev[f.id],
                                          imageUrl: undefined
                                        }
                                      }));
                                    }}
                                    className="px-2.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10px] uppercase tracking-wider rounded-lg transition cursor-pointer w-full sm:w-auto"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                              <p className="text-[10px] leading-relaxed text-slate-500 font-medium break-words">
                                Accepted formats: JPG, JPEG, PNG, WEBP. Max recommended size 5MB.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Coupon */}
      <div className="checkout-section-card space-y-3">
        <CheckoutSubheading>Apply Promotional Coupon</CheckoutSubheading>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Ticket className="w-4 h-4 text-[#E91E63]/50 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="E.G. KOSELIFEST"
              className="pl-10 pr-3 py-2.5 text-xs font-mono font-bold border border-pink-100 rounded-xl uppercase w-full focus:outline-none focus:border-[#E91E63]/40 focus:ring-2 focus:ring-[#E91E63]/10 bg-[#FFF8FA] text-slate-800"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={handleApplyCoupon}
            className="px-5 bg-[#1e293b] text-white hover:bg-[#0f172a] font-bold tracking-wide rounded-xl transition py-2.5 cursor-pointer font-mono text-xs border-0 shadow-sm"
          >
            Verify
          </button>
        </div>
        {couponFeedback && (
          <div className="text-[10px] font-bold text-[#E91E63]">{couponFeedback}</div>
        )}
      </div>

      {/* Billing Configuration */}
      <div className="checkout-section-card space-y-4">
        <CheckoutSubheading>Billing Configuration</CheckoutSubheading>

        {/* Currency Selector */}
        <div className="flex justify-between items-center p-3 bg-[#FFF8FA] border border-pink-100 rounded-xl">
          <span className="text-[10.5px] font-semibold text-slate-700">Display Currency</span>
          <div className="flex p-0.5 rounded-lg border bg-white border-pink-100 gap-1">
            {state.currencies.map(curr => {
              const isSelected = curr.code === selectedCurrency.code;
              return (
                <button
                  key={curr.code}
                  type="button"
                  onClick={() => onSelectCurrency(curr)}
                  className={`px-3 py-1 text-[10px] font-mono font-bold rounded-md transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-[#E91E63] text-white border-[#E91E63] shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-pink-50 border-transparent'
                  }`}
                >
                  {curr.code}
                </button>
              );
            })}
          </div>
        </div>

        {/* Payment methods */}
        <div className="space-y-2.5">
          <span className="text-[10.5px] font-bold text-slate-700 block">Choose Payment Method</span>
          <PaymentSelector
            options={checkoutPaymentOptions}
            selectedGatewayId={paymentMethod}
            onSelect={setPaymentMethod}
          />

          {!hasSelectablePayment && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[10.5px] text-amber-900 leading-relaxed">
              No payment methods are currently enabled. Ask the store admin to enable COD, eSewa, Khalti, Fonepay, or Visa/Mastercard under{' '}
              <strong>Admin → Settings → Payment Gateways</strong>.
            </div>
          )}
        </div>

        {/* Custom payment details instruction (static text or receiver QRs) */}
        <div className="pt-1.5">
          {(() => {
            const activeGateway = (state.paymentGateways || []).find(g => g.id === paymentMethod);
            if (!activeGateway) {
              if (paymentMethod === 'cod') {
                return (
                  <div className="p-3 border border-rose-105 rounded-xl text-[10.5px] leading-relaxed bg-rose-50/10 text-slate-600">
                    <span className="font-bold text-slate-800 block mb-0.5">Cash On Delivery terms:</span>
                    Please arrange the exact amount count of <span className="text-rose-600 font-mono font-extrabold">{selectedCurrency.symbol} {grandTotalConverted.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span> in cash. Settle with our delivery rider during delivery.
                  </div>
                );
              }
              return null;
            }

            if (activeGateway.id === 'manual') {
              return (
                <div className="p-3.5 border border-rose-150 rounded-xl space-y-3 bg-rose-50/5 text-left">
                  <div className="flex justify-between items-center pb-2 border-b border-rose-100/50">
                    <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-[#a855f7]">
                      Direct Bank / QR Transfer
                    </span>
                    <span className="text-[8.5px] bg-[#f3e8ff] text-[#7e22ce] border border-[#e9d5ff] rounded px-1.5 py-0.5 font-bold uppercase font-mono">
                      Offline Verify
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    {activeGateway.extraSettings?.bankName && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Bank Name:</span>
                        <span className="font-bold text-slate-800">{activeGateway.extraSettings.bankName}</span>
                      </div>
                    )}
                    {activeGateway.extraSettings?.accountName && (
                      <div className="flex justify-between items-start">
                        <span className="text-slate-500 h-full">Account Holder:</span>
                        <span className="font-bold text-right max-w-[170px] break-all">{activeGateway.extraSettings.accountName}</span>
                      </div>
                    )}
                    {activeGateway.extraSettings?.accountNumber && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Account Number:</span>
                        <span className="font-mono font-bold bg-white text-rose-600 px-2 py-0.5 rounded border border-rose-150 select-all cursor-pointer">
                          {activeGateway.extraSettings.accountNumber}
                        </span>
                      </div>
                    )}
                    {activeGateway.extraSettings?.branchName && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Branch Location:</span>
                        <span className="font-semibold text-slate-800">{activeGateway.extraSettings.branchName}</span>
                      </div>
                    )}
                  </div>

                  {activeGateway.extraSettings?.qrImageUrl && (
                    <div className="flex flex-col items-center justify-center p-3 rounded-lg border border-rose-100 text-center space-y-1.5 mt-1 bg-white">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-[#10b981] font-mono">Scan Receiver QR to Pay</span>
                      <img
                        src={activeGateway.extraSettings.qrImageUrl}
                        alt="Direct Scan Receiver QR"
                        className="w-32 h-32 object-contain rounded-lg border border-rose-100"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {activeGateway.extraSettings?.instructions && (
                    <div className="p-2.5 border border-rose-100 rounded-lg text-[10px] leading-relaxed text-slate-500 font-medium">
                      <span className="font-bold block mb-0.5 text-slate-800">Verification Steps:</span>
                      {activeGateway.extraSettings.instructions}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div className="p-3 border border-rose-100 rounded-xl text-xs space-y-2 bg-white">
                <div className="flex justify-between items-center pb-1.5 border-b border-rose-50/80">
                  <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-rose-600">
                    Secure Gateway: {activeGateway.name}
                  </span>
                  <span className="text-[8.5px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded px-1.5 font-bold uppercase font-mono">
                    Security Shield
                  </span>
                </div>

                <div className="text-[11px] space-y-1.5 text-slate-600">
                  <div>
                    This checkout utilizes Merchant ID <span className="font-mono px-1 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-705">{activeGateway.merchantId}</span> with instant settlement hashes.
                  </div>

                  {activeGateway.id === 'fonepay_static' && (
                    <div className="flex flex-col items-center justify-center p-3 rounded-lg border border-rose-100 text-center space-y-2 mt-2 bg-rose-50/10">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-600 font-mono">Scan Fonepay QR Code to Pay</span>
                      {activeGateway.extraSettings?.qrImageUrl ? (
                        <img
                          src={activeGateway.extraSettings.qrImageUrl}
                          alt="Fonepay Static QR"
                          className="w-36 h-36 object-contain rounded-lg border border-rose-100 bg-white"
                        />
                      ) : (
                        <div className="w-32 h-32 flex items-center justify-center text-[10px] italic rounded bg-rose-100 text-slate-400">
                          No QR Image
                        </div>
                      )}
                      <p className="text-[9px] max-w-xs text-slate-500 leading-normal">
                        Transfer the exact total of <span className="text-rose-600 font-mono font-extrabold">{selectedCurrency.symbol} {grandTotalConverted.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>. Our payment queue will listen dynamically!
                      </p>
                    </div>
                  )}

                  {activeGateway.apiEnvironment === 'test' && (
                    <div className="text-[10px] font-mono leading-normal p-2 rounded border border-rose-200/50 bg-rose-50 text-rose-700">
                      [Simulator active] Checkouts in test environment accept automatic click completions.
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Order Settlement Review & CTA */}
      <div className="checkout-settlement-card p-5 rounded-2xl space-y-4">
        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-800 font-mono block">Order Settlement Review</span>
        
        <div className="space-y-2 font-sans text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Items Subtotal:</span>
            <span className="font-mono text-slate-800 font-semibold">{selectedCurrency.symbol} {subtotalConverted.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
          </div>
          
          {totalFeesConverted > 0 && (
            <div className="flex justify-between text-slate-650">
              <span>Premium Services Fees:</span>
              <span className="font-mono text-slate-800">+{selectedCurrency.symbol} {totalFeesConverted.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
            </div>
          )}

          {deliveryChargeConverted > 0 && (
            <div className="flex justify-between text-slate-650">
              <span>Delivery & Packaging Fee :</span>
              <span className="font-mono text-slate-800 font-medium">+{selectedCurrency.symbol} {deliveryChargeConverted.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
            </div>
          )}

          {timeSlotChargeConverted !== undefined && timeSlotChargeConverted > 0 && (
            <div className="flex justify-between text-slate-650">
              <span>Preferred Delivery Time Slot:</span>
              <span className="font-mono text-slate-800">+{selectedCurrency.symbol} {timeSlotChargeConverted.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
            </div>
          )}

          {discountConverted > 0 && (
            <div className="flex justify-between text-emerald-600 font-bold">
              <span>Coupon Code Deduction:</span>
              <span className="font-mono">-{selectedCurrency.symbol} {discountConverted.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
            </div>
          )}

          <div className="flex justify-between font-bold text-sm pt-3 border-t border-pink-100 text-slate-900">
            <span>Grand Final Total ({selectedCurrency.code}):</span>
            <span className="font-mono text-[#E91E63] font-extrabold text-base">{selectedCurrency.symbol} {grandTotalConverted.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
          </div>
        </div>

        {selectedCurrency.code !== 'NPR' && (
          <div className="p-2.5 border border-pink-200/60 bg-[#FFF8FA] text-[10.5px] leading-relaxed text-slate-600 rounded-xl flex items-start gap-1.5">
            <span className="text-[#E91E63] text-xs mt-0.5">⚠️</span>
            <span>
              Final settlement will be based on NPR and may vary slightly due to currency conversion.
            </span>
          </div>
        )}

        {checkoutFieldErrors.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[10.5px] text-amber-900 leading-relaxed">
            <strong className="block mb-1">Complete required fields (Step 1 — left column):</strong>
            {checkoutFieldErrors.join(' · ')}
          </div>
        )}

        <button
          onClick={handleSubmitCheckout}
          type="button"
          disabled={!hasSelectablePayment || !!(selectedPaymentOption && !selectedPaymentOption.isSelectable)}
          className="checkout-pay-btn w-full py-3.5 text-white font-extrabold text-xs uppercase tracking-[0.15em] rounded-xl transition cursor-pointer border-0 mt-1 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {hasSelectablePayment ? 'Proceed to Pay' : 'No Payment Method Available'}
        </button>
      </div>

    </div>
  );
}
