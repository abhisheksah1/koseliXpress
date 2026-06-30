import React, { useState, useEffect } from 'react';
import { DatabaseState, Product, CurrencySettings, CartItem, Order, OrderStatus, Lead, LeadStatus } from '../../types';
import { ShoppingBag, X, CheckCircle2, CreditCard, Trash2, Plus, Minus, ArrowRight, Gift } from 'lucide-react';
import { isProductOutOfStock } from '../../utils/stockUtils';
import CheckoutForms from './CheckoutForms';
import CheckoutSummary from './CheckoutSummary';
import GiftLoungeBackdrop from './GiftLoungeBackdrop';
import { CheckoutStepBanner } from './CheckoutUI';
import { sendOrderStatusEmail } from '../../utils/emailHelper';
import { getWhatsAppNotificationUrl } from '../../utils/whatsappHelper';
import { initiateEsewaCheckout, initiateKhaltiCheckout, initiateNpsCheckout } from '../../utils/paymentHelpers';
import { savePendingRedirectCheckout, type PendingRedirectCheckout } from '../../utils/pendingCheckout';
import {
  getFirstSelectablePaymentGatewayId,
  isPaymentGatewaySelectable,
} from '../../utils/checkoutPayments';
import {
  resolveDeliveryDistrict,
  validateRecipientFields,
  validateSenderFields,
} from '../../utils/checkoutValidation';

interface CartDrawerProps {
  state: DatabaseState;
  onUpdateState: (newState: DatabaseState) => void;
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateCartItems: (items: CartItem[]) => void;
  selectedCurrency: CurrencySettings;
  onSelectCurrency: (currency: CurrencySettings) => void;
  customerUser?: { email: string; name: string } | null;
  cartClickCount?: number;
}

export default function CartDrawer({
  state,
  onUpdateState,
  isOpen,
  onClose,
  cartItems,
  onUpdateCartItems,
  selectedCurrency,
  onSelectCurrency,
  customerUser,
  cartClickCount,
}: CartDrawerProps) {
  // Hardcode isLight to true for theme-based brand color consistency
  const isLight = true;

  const [viewMode, setViewMode] = useState<'cart' | 'checkout'>('cart');

  // Switch back to cart list view on drawer open or cart click trigger
  useEffect(() => {
    if (isOpen) {
      setViewMode('cart');
    }
  }, [isOpen, cartClickCount]);

  // Sender contact details
  const [senderName, setSenderName] = useState<string>('');
  const [senderEmail, setSenderEmail] = useState<string>('');
  const [senderPhone, setSenderPhone] = useState<string>('');

  // Pre-fill sender details if customer is logged in via Google SSO
  useEffect(() => {
    if (isOpen && customerUser) {
      if (!senderName) setSenderName(customerUser.name);
      if (!senderEmail) setSenderEmail(customerUser.email);
    }
  }, [isOpen, customerUser]);

  // Recipient coordinates
  const [receiverName, setReceiverName] = useState<string>('');
  const [receiverPhone, setReceiverPhone] = useState<string>('');
  const [deliveryDistrictId, setDeliveryDistrictId] = useState<string>('');
  const [manualDeliveryDistrict, setManualDeliveryDistrict] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [checkoutFieldErrors, setCheckoutFieldErrors] = useState<string[]>([]);
  const [orderNote, setOrderNote] = useState<string>('');

  // Delivery calendar timeline
  const [preferredDeliveryDate, setPreferredDeliveryDate] = useState<string>('');
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState<string>('');

  // Promotional details
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponFeedback, setCouponFeedback] = useState<string | null>(null);

  // Gateway payment parameters
  const [selectedFeeIds, setSelectedFeeIds] = useState<string[]>([]);
  const [serviceFeeInputs, setServiceFeeInputs] = useState<Record<string, { text?: string; imageUrl?: string }>>({});
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [checkoutComplete, setCheckoutComplete] = useState<boolean>(false);
  const [orderSummaryRef, setOrderSummaryRef] = useState<string>('');
  const [isOrderSummaryOpen, setIsOrderSummaryOpen] = useState<boolean>(false);
  const [isRedirectingPayment, setIsRedirectingPayment] = useState<boolean>(false);

  // Encryption logs flow
  const [isVerifyingPaymentFlow, setIsVerifyingPaymentFlow] = useState<boolean>(false);
  const [paymentVerificationStatus, setPaymentVerificationStatus] = useState<string>('');
  const [paymentVerificationLog, setPaymentVerificationLog] = useState<string[]>([]);

  // Simple customer auth hooks
  const [googleUserTracking, setGoogleUserTracking] = useState<any>(null);

  // Reset variables whenever drawer is opened/closed
  useEffect(() => {
    if (isOpen) {
      setCheckoutComplete(false);
      setIsRedirectingPayment(false);
      setIsVerifyingPaymentFlow(false);
      setPaymentVerificationLog([]);
    }
  }, [isOpen]);

  // Auto-select first admin-enabled checkout method (COD / eSewa / Khalti / Fonepay)
  useEffect(() => {
    if (!isOpen || checkoutComplete) return;
    const firstEnabled = getFirstSelectablePaymentGatewayId(state.paymentGateways, selectedCurrency.code);
    if (!firstEnabled) {
      setPaymentMethod('');
      return;
    }
    setPaymentMethod((current) => {
      if (!current || !isPaymentGatewaySelectable(state.paymentGateways, selectedCurrency.code, current)) {
        return firstEnabled;
      }
      return current;
    });
  }, [isOpen, checkoutComplete, state.paymentGateways, selectedCurrency.code]);

  // Auto-generate Lead in background as soon as contact details are partially filled out
  useEffect(() => {
    if (cartItems.length === 0 || checkoutComplete || !isOpen) return;
    if (senderName.length > 2 && senderPhone.length > 4) {
      const updatedLeads = [...state.leads];
      const matchIdx = updatedLeads.findIndex(l => l.customerPhone === senderPhone && l.status === LeadStatus.FAILED);
      
      const rate = selectedCurrency.code === 'NPR' ? 1 : selectedCurrency.rateToNPR;
      const calcTotal = cartItems.reduce((sum, item) => {
        const prod = state.products.find(p => p.id === item.productId);
        const itemUnitPrice = item.selectedPrice !== undefined 
          ? item.selectedPrice 
          : (prod ? (prod.discountPrice && prod.discountPrice > 0 && prod.discountPrice < prod.price ? prod.discountPrice : prod.price) : 0);
        return sum + (itemUnitPrice * item.quantity);
      }, 0) * rate;

      if (matchIdx >= 0) {
        updatedLeads[matchIdx] = {
          ...updatedLeads[matchIdx],
          customerName: senderName,
          customerEmail: senderEmail,
          cartItems,
          totalAmount: calcTotal,
          receiverName,
          receiverPhone,
          deliveryDistrictId,
          deliveryAddress,
          orderNote,
          preferredDeliveryDate,
          selectedTimeSlotId,
          paymentMethod
        };
      } else {
        const newLead: Lead = {
          id: `lead-${Date.now()}`,
          customerName: senderName,
          customerEmail: senderEmail || 'guest@customer.com',
          customerPhone: senderPhone,
          cartItems,
          currency: selectedCurrency.code,
          totalAmount: calcTotal,
          status: LeadStatus.FAILED,
          createdAt: new Date().toISOString(),
          receiverName,
          receiverPhone,
          deliveryDistrictId,
          deliveryAddress,
          orderNote,
          preferredDeliveryDate,
          selectedTimeSlotId,
          paymentMethod
        };
        updatedLeads.unshift(newLead);
      }
      
      onUpdateState({
        ...state,
        leads: updatedLeads
      });
    }
  }, [
    senderName, senderEmail, senderPhone, cartItems, isOpen,
    receiverName, receiverPhone, deliveryDistrictId, deliveryAddress,
    orderNote, preferredDeliveryDate, selectedTimeSlotId, paymentMethod
  ]);

  const rate = selectedCurrency.code === 'NPR' ? 1 : selectedCurrency.rateToNPR;

  // Calculators
  const subtotalBase = cartItems.reduce((sum, item) => {
    const p = state.products.find(prod => prod.id === item.productId);
    const itemUnitPrice = item.selectedPrice !== undefined 
      ? item.selectedPrice 
      : (p ? (p.discountPrice && p.discountPrice > 0 && p.discountPrice < p.price ? p.discountPrice : p.price) : 0);
    return sum + (itemUnitPrice * item.quantity);
  }, 0);

  const subtotalConverted = subtotalBase * rate;

  // Service Wrapper fees
  const totalFeesBase = state.serviceFees
    .filter(f => selectedFeeIds.includes(f.id) && f.isActive)
    .reduce((sum, f) => sum + f.feeAmountNPR, 0);

  const totalFeesConverted = totalFeesBase * rate;

  // Delivery districts listing
  const districtsList = state.deliveryDistricts || [];
  
  useEffect(() => {
    if (districtsList.length === 0) return;
    const isValid = districtsList.some((d) => d.id === deliveryDistrictId);
    if (!deliveryDistrictId || !isValid) {
      setDeliveryDistrictId(districtsList[0].id);
    }
  }, [districtsList, deliveryDistrictId]);

  const selectedDistrict = resolveDeliveryDistrict(
    districtsList,
    deliveryDistrictId,
    manualDeliveryDistrict,
  );
  const deliveryChargeBase = selectedDistrict ? selectedDistrict.chargeNPR : 0;
  const deliveryChargeConverted = deliveryChargeBase * rate;

  if (!isOpen) return null;

  // Preferred Delivery Time Slot service fee in base NPR
  let timeSlotChargeBase = 0;
  let selectedSlotObj = null;
  const timeSlotSettings = state.deliveryTimeSlotSettings;
  const isTimeSlotActiveForDistrict = !!(selectedDistrict && timeSlotSettings?.isEnabled && timeSlotSettings.enabledCityIds.includes(selectedDistrict.name));
  
  if (isTimeSlotActiveForDistrict && selectedTimeSlotId) {
    selectedSlotObj = timeSlotSettings.slots.find(s => s.id === selectedTimeSlotId);
    if (selectedSlotObj) {
      timeSlotChargeBase = timeSlotSettings?.chargeType === 'flat' 
        ? (timeSlotSettings.flatChargeNPR || 0) 
        : (selectedSlotObj.additionalChargeNPR || 0);
    }
  }
  const timeSlotChargeConverted = timeSlotChargeBase * rate;

  // Applied Coupon discounts
  let discountConverted = 0;
  if (appliedCoupon) {
    if (subtotalBase >= appliedCoupon.minOrderValue) {
      if (appliedCoupon.discountType === 'percentage') {
        discountConverted = (subtotalConverted * appliedCoupon.value) / 100;
      } else {
        discountConverted = appliedCoupon.value * rate;
      }
    }
  }

  const grandTotalConverted = Math.max(0, subtotalConverted + totalFeesConverted + deliveryChargeConverted + timeSlotChargeConverted - discountConverted);
  const grandTotalBase = grandTotalConverted / rate;

  const buildPendingRedirectPayload = (
    refId: string,
    gateway: PendingRedirectCheckout['paymentGateway'],
  ): PendingRedirectCheckout => ({
    refId,
    paymentGateway: gateway,
    cartItems,
    senderName: senderName.trim(),
    senderEmail: senderEmail.trim(),
    senderPhone: senderPhone.trim(),
    receiverName: receiverName.trim(),
    receiverPhone: receiverPhone.trim(),
    deliveryDistrictId: selectedDistrict?.id || deliveryDistrictId,
    deliveryDistrictName: selectedDistrict?.name || manualDeliveryDistrict.trim(),
    deliveryAddress: deliveryAddress.trim(),
    orderNote,
    preferredDeliveryDate,
    selectedFeeIds,
    serviceFeeInputs,
    appliedCouponId: appliedCoupon?.id,
    selectedTimeSlotId,
    selectedTimeSlotLabel: selectedSlotObj ? `${selectedSlotObj.name} (${selectedSlotObj.timeDisplay})` : undefined,
    grandTotalBase,
    grandTotalConverted,
    currencyCode: selectedCurrency.code,
    exchangeRate: rate,
    deliveryChargeBase,
    totalFeesBase,
    timeSlotChargeBase,
    merchantTxnId: refId,
    createdAt: new Date().toISOString(),
  });

  const activeGateway = (state.paymentGateways || []).find(g => g.id === paymentMethod);

  // Apply Coupon triggered
  const handleApplyCoupon = () => {
    if (!couponCode) return;
    const match = state.coupons.find(c => c.code === couponCode.toUpperCase() && c.isActive);
    if (!match) {
      setCouponFeedback('Invalid or expired coupon code tag.');
      return;
    }
    if (match.maxUses !== undefined && match.maxUses !== null && match.maxUses > 0 && (match.usesCount || 0) >= match.maxUses) {
      setCouponFeedback(`This coupon campaign is fully redeemed (max limit: ${match.maxUses} times).`);
      return;
    }
    if (subtotalBase < match.minOrderValue) {
      setCouponFeedback(`Requires minimum basket size of Rs. ${match.minOrderValue.toLocaleString()}`);
      return;
    }
    if (new Date(match.expiryDate) < new Date()) {
      setCouponFeedback('Coupon timeline has expired.');
      return;
    }
    setAppliedCoupon(match);
    setCouponFeedback(`Success! code matched. NPR ${match.value} reduction registered.`);
  };

  // Submit Order finalization - Validation Gated Redirection to Payment Simulator
  const handleSubmitCheckout = () => {
    const senderCheck = validateSenderFields(senderName, senderEmail, senderPhone);
    const recipientCheck = validateRecipientFields({
      receiverName,
      receiverPhone,
      deliveryAddress,
      deliveryDistrictId,
      manualDeliveryDistrict,
      districtsCount: districtsList.length,
      districtsList,
    });

    const allMissing = [...senderCheck.missing, ...recipientCheck.missing];
    if (allMissing.length > 0) {
      setCheckoutFieldErrors(allMissing);
      alert(senderCheck.message || recipientCheck.message);
      return;
    }

    setCheckoutFieldErrors([]);
    const matchedDist = selectedDistrict;
    if (!matchedDist) {
      alert('Please select or enter a valid delivery District / City.');
      return;
    }

    if (
      !paymentMethod ||
      !isPaymentGatewaySelectable(state.paymentGateways, selectedCurrency.code, paymentMethod)
    ) {
      alert('Please choose an available payment method. Disabled options must be enabled by the store admin.');
      return;
    }

    const activeGw = (state.paymentGateways || []).find(g => g.id === paymentMethod);
    if (activeGw && !activeGw.isEnabled) {
      alert('This payment method is currently disabled by admin. Please select another option.');
      return;
    }

    const hasApiCredentials = (() => {
      if (!activeGw?.isEnabled) return false;
      if (paymentMethod === 'nps') {
        return !!(
          activeGw.merchantId?.trim() &&
          activeGw.secretKey?.trim() &&
          activeGw.extraSettings?.merchantName?.trim() &&
          activeGw.extraSettings?.apiUsername?.trim() &&
          activeGw.extraSettings?.apiPassword?.trim()
        );
      }
      return !!activeGw.secretKey?.trim();
    })();

    // Khalti KPG-2 — must redirect to official Khalti portal (MPIN/OTP on Khalti site)
    if (paymentMethod === 'khalti') {
      if (!hasApiCredentials) {
        alert(
          'Khalti is not configured. Add your Secret Key in Admin → Settings → Payment Gateways (or .env KHALTI_SECRET_KEY from test-admin.khalti.com), then Save.',
        );
        return;
      }
      if (selectedCurrency.code !== 'NPR') {
        alert('Khalti wallet payments are only available in NPR.');
        return;
      }
      if (grandTotalConverted < 10) {
        alert('Khalti minimum payment amount is Rs. 10.');
        return;
      }
      void startKhaltiKpgRedirect();
      return;
    }

    // eSewa — must redirect to official eSewa portal
    if (paymentMethod === 'esewa') {
      if (!hasApiCredentials) {
        alert(
          'eSewa is not fully configured. The store admin must add merchant code and secret key under Admin → Settings → Payment Gateways.',
        );
        return;
      }
      void startEsewaRedirect();
      return;
    }

    // NPS Visa/Mastercard — redirect to hosted secure payment page
    if (paymentMethod === 'nps') {
      if (!hasApiCredentials) {
        alert(
          'Visa/Mastercard (NPS) is not fully configured. Add Merchant ID, Secret Key, Merchant Name, API Username and API Password in Admin → Settings → Payment Gateways or .env.',
        );
        return;
      }
      void startNpsRedirect();
      return;
    }

    setIsRedirectingPayment(true);
  };

  const startEsewaRedirect = async () => {
    const tempRefId = `${state.store.orderPrefix || 'KO'}-${Date.now()}`;
    savePendingRedirectCheckout(buildPendingRedirectPayload(tempRefId, 'esewa'));
    setIsRedirectingPayment(true);
    setIsVerifyingPaymentFlow(true);
    setPaymentVerificationStatus('Redirecting to eSewa…');
    try {
      await initiateEsewaCheckout({
        amount: grandTotalConverted,
        transactionUuid: tempRefId,
        successUrl: `${window.location.origin}/payment/esewa/success?ref=${encodeURIComponent(tempRefId)}`,
        failureUrl: `${window.location.origin}/payment/esewa/failure?ref=${encodeURIComponent(tempRefId)}`,
      });
    } catch (err: unknown) {
      setIsVerifyingPaymentFlow(false);
      setIsRedirectingPayment(false);
      alert(`eSewa error: ${err instanceof Error ? err.message : 'Payment failed'}`);
    }
  };

  const startNpsRedirect = async () => {
    const tempRefId = `${state.store.orderPrefix || 'KO'}${Date.now()}`;
    savePendingRedirectCheckout(buildPendingRedirectPayload(tempRefId, 'nps'));
    setIsRedirectingPayment(true);
    setIsVerifyingPaymentFlow(true);
    setPaymentVerificationStatus('Redirecting to secure Visa/Mastercard payment page…');
    try {
      await initiateNpsCheckout({
        amount: grandTotalConverted,
        merchantTxnId: tempRefId,
        responseUrl: `${window.location.origin}/payment/nps/callback`,
        transactionRemarks: `Koseli Xpress order ${tempRefId}`,
      });
    } catch (err: unknown) {
      setIsVerifyingPaymentFlow(false);
      setIsRedirectingPayment(false);
      alert(`Card payment error: ${err instanceof Error ? err.message : 'Payment failed'}. Check Admin → Payment Gateways → Test Connection.`);
    }
  };

  const startKhaltiKpgRedirect = async () => {
    const tempRefId = `${state.store.orderPrefix || 'KO'}-${Date.now()}`;
    setIsRedirectingPayment(true);
    setIsVerifyingPaymentFlow(true);
    setPaymentVerificationStatus('Redirecting to Khalti secure checkout…');

    savePendingRedirectCheckout(buildPendingRedirectPayload(tempRefId, 'khalti'));

    try {
      await initiateKhaltiCheckout({
        amount: grandTotalConverted,
        purchaseOrderId: tempRefId,
        purchaseOrderName: `Koseli Gift Order ${tempRefId}`,
        returnUrl: `${window.location.origin}/payment/khalti/callback`,
        websiteUrl: window.location.origin,
        customerInfo: {
          name: senderName,
          email: senderEmail,
          phone: senderPhone.replace(/\D/g, '').slice(-10) || senderPhone,
        },
      });
    } catch (err: unknown) {
      setIsVerifyingPaymentFlow(false);
      setIsRedirectingPayment(false);
      alert(`Khalti error: ${err instanceof Error ? err.message : 'Payment failed'}. Check Admin → Payment Gateways → Test Connection.`);
    }
  };

  // Settle payment — COD / manual / fonepay only (Khalti, eSewa & NPS use official redirect)
  const handleSimulatePaymentCompletion = () => {
    if (
      !paymentMethod ||
      !isPaymentGatewaySelectable(state.paymentGateways, selectedCurrency.code, paymentMethod)
    ) {
      alert('This payment method is not available. Choose an enabled option or contact the store.');
      return;
    }

    if (paymentMethod === 'khalti' || paymentMethod === 'esewa' || paymentMethod === 'nps') {
      const labels: Record<string, string> = {
        khalti: 'Khalti',
        esewa: 'eSewa',
        nps: 'Visa/Mastercard',
      };
      alert(
        `${labels[paymentMethod] || 'Online'} payments must be completed on the official secure payment page. Click Proceed to Pay to redirect.`,
      );
      setIsRedirectingPayment(false);
      return;
    }

    const products = [...state.products];
    let stockDepletedItem: string | null = null;

    cartItems.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      if (prod) {
        if (prod.allowOrderWhenOutOfStock) {
          return;
        }
        if (prod.isHamper && prod.hamperItems && prod.hamperItems.length > 0) {
          prod.hamperItems.forEach(subItem => {
            const subProd = products.find(p => p.id === subItem.productId);
            if (subProd) {
              const totalNeeded = item.quantity * subItem.quantity;
              if (subProd.stock < totalNeeded) {
                stockDepletedItem = `${subProd.name} (Combo component in "${prod.name}")`;
              }
            }
          });
        } else {
          if (prod.stock < item.quantity) {
            stockDepletedItem = prod.name;
          }
        }
      }
    });

    if (stockDepletedItem) {
      alert(`Sorry, "${stockDepletedItem}" is now out of sufficient stock! Lower checkout quantities or choose custom combos.`);
      setIsRedirectingPayment(false);
      return;
    }

    completeOrderCreation(products);
  };

  const completeOrderCreation = (
    products: Product[],
    forcedRefId?: string,
    options?: { paymentVerified?: boolean },
  ) => {
    const gateway = paymentMethod.toLowerCase();
    if (['khalti', 'esewa', 'nps'].includes(gateway) && !options?.paymentVerified) {
      alert('Online payment was not verified. Order was not created — complete payment on the official payment page.');
      setIsRedirectingPayment(false);
      setIsVerifyingPaymentFlow(false);
      return;
    }

    const isPaymentPaid = !(
      paymentMethod.toLowerCase() === 'cod' ||
      paymentMethod.toLowerCase() === 'manual' ||
      paymentMethod.toLowerCase() === 'fonepay_static' ||
      paymentMethod.toLowerCase() === 'fonepay_dynamic'
    );

    if (isPaymentPaid) {
      cartItems.forEach(item => {
        const prodIdx = products.findIndex(p => p.id === item.productId);
        if (prodIdx >= 0) {
          const prod = products[prodIdx];
          if (prod.isHamper && prod.hamperItems && prod.hamperItems.length > 0) {
            prod.hamperItems.forEach(subItem => {
              const subIdx = products.findIndex(p => p.id === subItem.productId);
              if (subIdx >= 0) {
                const totalDeduct = item.quantity * subItem.quantity;
                products[subIdx].stock = Math.max(0, products[subIdx].stock - totalDeduct);
              }
            });
          } else {
            products[prodIdx].stock = Math.max(0, products[prodIdx].stock - item.quantity);
          }
        }
      });
    }

    const matchedDist = selectedDistrict;
    const refId = forcedRefId || `${state.store.orderPrefix}-${Math.floor(Math.random() * 90000 + 10000)}`;
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      refId,
      customerName: senderName.trim(),
      customerEmail: senderEmail.trim() || 'guest@customer.com',
      customerPhone: senderPhone.trim(),
      shippingAddress: `${deliveryAddress.trim()}, ${matchedDist ? matchedDist.name : manualDeliveryDistrict.trim()}`,
      senderName: senderName.trim(),
      senderEmail: senderEmail.trim(),
      senderPhone: senderPhone.trim(),
      receiverName: receiverName.trim(),
      receiverPhone: receiverPhone.trim(),
      deliveryDistrict: matchedDist ? matchedDist.name : manualDeliveryDistrict.trim(),
      deliveryAddress: deliveryAddress.trim(),
      orderNote: orderNote || undefined,
      preferredDeliveryDate: preferredDeliveryDate || undefined,
      deliveryChargeAmount: deliveryChargeBase,
      items: cartItems.map(item => {
        const prod = state.products.find(p => p.id === item.productId);
        const actualOutOfStock = prod ? isProductOutOfStock(prod, state.products) : false;
        const isBackorder = !!(prod?.allowOrderWhenOutOfStock && actualOutOfStock);
        return {
          productId: item.productId,
          productName: prod 
            ? (isBackorder ? `${prod.name} [Backorder / Special Fulfillment]` : prod.name)
            : 'Unknown Product',
          quantity: item.quantity,
          selectedPrice: item.selectedPrice !== undefined ? item.selectedPrice : (prod ? prod.price : 0),
          customMessage: item.customMessage,
          customImageUrl: item.customImageUrl,
          selectedVariations: item.selectedVariations,
          isBackorder
        };
      }),
      totalAmountBase: grandTotalBase,
      totalAmount: grandTotalConverted,
      currency: selectedCurrency.code,
      exchangeRate: rate,
      additionalServiceFeeAmount: totalFeesBase,
      additionalServiceFeeAdded: state.serviceFees
        .filter(f => selectedFeeIds.includes(f.id))
        .map(f => f.name)
        .join(', '),
      serviceFeeDetails: state.serviceFees
        .filter(f => selectedFeeIds.includes(f.id))
        .map(f => ({
          id: f.id,
          name: f.name,
          text: serviceFeeInputs[f.id]?.text,
          imageUrl: serviceFeeInputs[f.id]?.imageUrl
        })),
      couponCodeUsed: appliedCoupon?.code || undefined,
      paymentMethod: paymentMethod.toUpperCase(),
      status: OrderStatus.PENDING,
      paymentStatus: isPaymentPaid ? 'paid' : 'pending',
      stockAdjusted: isPaymentPaid,
      selectedTimeSlot: selectedSlotObj 
        ? `${selectedSlotObj.name} (${selectedSlotObj.timeDisplay})` 
        : undefined,
      timeSlotChargeAmount: timeSlotChargeBase || undefined,
      createdAt: new Date().toISOString()
    };

    const leads = state.leads.map(lead => {
      if (lead.customerPhone === senderPhone && lead.status === LeadStatus.FAILED) {
        return { ...lead, status: LeadStatus.RECOVERED };
      }
      return lead;
    });

    const updatedCoupons = state.coupons.map(c => {
      if (appliedCoupon && c.id === appliedCoupon.id) {
        return {
          ...c,
          usesCount: (c.usesCount || 0) + 1
        };
      }
      return c;
    });

    const nextStateData: DatabaseState = {
      ...state,
      products,
      orders: [newOrder, ...state.orders],
      leads,
      coupons: updatedCoupons
    };

    // Dispatch background automatic email confirmation asynchronously
    sendOrderStatusEmail(nextStateData, newOrder, 'confirmation').then(updatedState => {
      onUpdateState(updatedState);
    }).catch(err => {
      console.error('Failed to auto-send confirmation email:', err);
      onUpdateState(nextStateData);
    });

    setOrderSummaryRef(refId);
    setCheckoutComplete(true);
    setIsRedirectingPayment(false);
    setIsVerifyingPaymentFlow(false);
    onUpdateCartItems([]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#020202]/75 backdrop-blur-xs flex justify-end font-sans">
      <div className="flex-1" onClick={onClose}></div>

      <div 
        role="dialog" 
        className={`w-full ${
          cartItems.length > 0 && !checkoutComplete && viewMode === 'checkout'
            ? 'max-w-md md:max-w-[96vw] lg:max-w-6xl md:w-full'
            : 'max-w-md'
        } border-l h-screen flex flex-col justify-between shadow-2xl relative animate-slide-in transition-all duration-300 checkout-drawer-shell ${
          isLight ? 'text-slate-800 border-pink-100' : 'bg-[#0d0d0d] border-white/10 text-slate-355'
        }`}
      >
        {/* Header Drawer */}
        <div className={`relative z-10 px-5 py-4 border-b flex items-center justify-between transition-colors ${
          isLight ? 'bg-white/95 backdrop-blur-sm border-pink-100' : 'bg-[#0a0a0a] border-white/5'
        }`}>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E91E63] to-[#C2185B] flex items-center justify-center shadow-sm shadow-pink-500/20">
                <ShoppingBag className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm uppercase tracking-[0.12em] font-extrabold text-slate-900">
                Secure Gifting Checkout
              </h3>
            </div>
            <span className="text-[11px] bg-[#FCE4EC] text-[#C2185B] border border-pink-200/80 rounded-lg px-2.5 py-0.5 font-mono font-bold">
              {cartItems.length} items
            </span>
            {!checkoutComplete && cartItems.length > 0 && viewMode === 'checkout' && (
              <button
                type="button"
                onClick={() => setViewMode('cart')}
                className="px-3 py-1 text-[10px] font-bold text-[#E91E63] hover:text-[#C2185B] bg-pink-50 hover:bg-pink-100 border border-pink-200/60 rounded-lg transition cursor-pointer"
              >
                ← Edit Cart
              </button>
            )}
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 rounded-xl transition cursor-pointer hover:bg-pink-50 text-slate-400 hover:text-slate-800 border border-transparent hover:border-pink-100 bg-transparent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {checkoutComplete ? (
          /* CONGRATULATIONS BILLING RECEIPT STATE */
          <div className="flex-1 overflow-y-auto p-5 space-y-6 text-center flex flex-col justify-center transition-colors bg-[#FCF9F9]">
            <div className="w-14 h-14 bg-emerald-550/10 text-[#10b981] border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-1 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-serif italic font-extrabold text-slate-900">Gifting Custom Order Received!</h3>
              <p className="text-xs leading-relaxed max-w-sm mx-auto text-slate-650">
                Your boutique handwrapped package reference number is{" "}
                <span className="font-mono text-rose-600 font-extrabold underline decoration-dotted">{orderSummaryRef}</span>.
                We have registered your contact tracks and mapped dispatch nodes.
              </p>
            </div>

            <div className="p-4 bg-white border border-rose-100 rounded-2xl max-w-sm mx-auto w-full text-left space-y-3 shadow-xs">
              <div className="text-[10px] uppercase font-bold tracking-widest text-[#a855f7] font-mono border-b border-rose-50/80 pb-2">
                Simulated Settlement Receipt
              </div>
              <div className="space-y-1.5 text-xs text-slate-700 font-sans">
                <div className="flex justify-between">
                  <span>Contact Holder:</span>
                  <strong className="text-slate-900">{senderName}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Dispatch To:</span>
                  <strong className="text-slate-900">{receiverName}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Shipment Destination:</span>
                  <strong className="text-slate-900">{deliveryAddress}</strong>
                </div>
                <div className="flex justify-between border-t border-rose-50/80 pt-2 font-bold text-[#10b981]">
                  <span>Amount Settled:</span>
                  <span className="font-mono">{selectedCurrency.symbol} {grandTotalConverted.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                </div>
              </div>
            </div>

            {(() => {
              const currentSavedOrder = state.orders.find(o => o.refId === orderSummaryRef);
              if (!currentSavedOrder) return null;
              return (
                <div className="max-w-sm mx-auto w-full px-1">
                  <a
                    href={getWhatsAppNotificationUrl(currentSavedOrder, state.smtpSettings, true)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition cursor-pointer shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5 no-underline font-sans"
                  >
                    <span>💬 Confirm order on WhatsApp</span>
                  </a>
                  <p className="text-[9.5px] text-slate-400 mt-1 leading-relaxed text-center font-sans">
                    Tap to notify florists on WhatsApp and coordinate live arrangements/cake delivery instantly!
                  </p>
                </div>
              );
            })()}

            <div className="pt-3 max-w-sm mx-auto w-full">
              <button
                onClick={() => {
                  setCheckoutComplete(false);
                  setGoogleUserTracking(null);
                  setSenderName('');
                  setSenderEmail('');
                  setSenderPhone('');
                  setReceiverName('');
                  setReceiverPhone('');
                  setDeliveryAddress('');
                  setOrderNote('');
                  setPreferredDeliveryDate('');
                  setAppliedCoupon(null);
                  setSelectedFeeIds([]);
                  onClose();
                }}
                className="w-full py-3 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-850 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition cursor-pointer shadow-md shadow-rose-500/15 border-0"
              >
                Continue Gifting Experience
              </button>
            </div>
          </div>
        ) : isRedirectingPayment ? (
          /* PAYMENT GATEWAY REDIRECTION OVERLAY OR PORTAL */
          <div className="flex-1 overflow-y-auto p-5 space-y-5 transition-all text-center flex flex-col justify-center bg-[#FCF9F9]">
            <div className="space-y-2 mt-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-rose-600 font-mono bg-rose-50 border border-rose-100 px-3 py-1 rounded-full inline-block">
                🔒 SSE Encrypted Gateway Tunnel
              </span>
              <h3 className="text-base font-serif italic pt-1 text-slate-900 font-extrabold">
                Secure Gateway Checkout Portal
              </h3>
              <p className="text-[11px] text-slate-650 max-w-xs mx-auto leading-relaxed">
                You are being securely channeled to complete your gifting settlement of <strong>{selectedCurrency.symbol} {grandTotalConverted.toLocaleString(undefined, { maximumFractionDigits: 1 })}</strong> ({selectedCurrency.code}).
              </p>
            </div>

            {isVerifyingPaymentFlow ? (
              /* PROGRESSIVE DIGITAL HANDSHAKE CONSOLE LOG OVERLAY */
              <div className="p-5 rounded-2xl border border-rose-200 text-left space-y-4 max-w-sm mx-auto w-full font-mono bg-slate-900 text-[#10b981] shadow-xl">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Live Secure Gateway Handshake</span>
                </div>
                
                <div className="text-center py-3 space-y-2">
                  <div className="w-9 h-9 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-205 font-sans font-bold select-none">{paymentVerificationStatus}</p>
                </div>

                <div className="bg-[#0b0c10] p-3 rounded-lg border border-slate-800 h-[100px] overflow-y-auto font-mono text-[9px] text-[#10b981]/80 space-y-1">
                  {paymentVerificationLog.map((log, idx) => (
                    <div key={idx} className="leading-snug">{log}</div>
                  ))}
                </div>
              </div>
            ) : (
              /* ACTIVE FORM INPUT SIMULATORS per selected gateway */
              <div className="p-5 rounded-2xl border border-rose-200 bg-white shadow-md max-w-md mx-auto w-full text-left space-y-4">
                <div className="flex items-center gap-2 justify-between border-b border-rose-50 pb-2">
                  <span className="text-[10.5px] font-sans font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    💳 Secure Payment
                  </span>
                  <span className="text-[9px] bg-rose-50 border border-rose-100 text-rose-600 px-2 py-0.5 rounded font-mono font-bold leading-none uppercase">
                    {paymentMethod}
                  </span>
                </div>

                {paymentMethod === 'nps' && (
                  <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-xs text-slate-600 leading-relaxed">
                    You will be redirected to the Nepal Payment Solution (NPS) secure hosted page to enter your Visa or Mastercard details. Card data is never stored on this site.
                  </div>
                )}

                {(paymentMethod === 'fonepay_static' || paymentMethod === 'fonepay_dynamic') && activeGateway?.extraSettings?.qrImageUrl && (
                  <div className="flex justify-center py-2">
                    <img
                      src={activeGateway.extraSettings.qrImageUrl}
                      alt="Fonepay QR"
                      className="max-w-[180px] rounded-lg border border-rose-100"
                    />
                  </div>
                )}

                <div className="flex gap-2.5 pt-1 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRedirectingPayment(false);
                      setIsVerifyingPaymentFlow(false);
                    }}
                    className="flex-1 py-3 bg-[#e2e8f0] text-slate-700 hover:bg-[#cbd5e1] font-bold text-xs uppercase tracking-wide rounded-xl transition cursor-pointer border-0"
                  >
                    Cancel Tunnel
                  </button>
                  <button
                    type="button"
                    onClick={handleSimulatePaymentCompletion}
                    className="flex-1 py-3 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition cursor-pointer shadow-md shadow-rose-500/15 border-0"
                  >
                    Authorize Payment
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : cartItems.length === 0 ? (
          /* EMPTY BASKET */
          <div className="flex-1 flex flex-col justify-center items-center text-center p-6 space-y-3.5 bg-[#FCF9F9]">
            <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h4 className="font-serif italic text-slate-800 text-base font-bold">Your Gift Basket is Empty</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
                Add beautiful custom hampers, premium gifts, or artisanal wraps to configure your order.
              </p>
            </div>
          </div>
        ) : viewMode === 'cart' ? (
          /* Cart review before checkout */
          <div className="relative flex-1 flex flex-col justify-between overflow-hidden">
            <GiftLoungeBackdrop variant="subtle" className="opacity-50" />
            <div className="relative z-10 flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-pink-100">
                <Gift className="w-4 h-4 text-[#E91E63]" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Review Gift Basket Items</span>
              </div>

              <div className="space-y-3 text-left">
                {cartItems.map((item, itemIdx) => {
                  const prod = state.products.find(p => p.id === item.productId);
                  if (!prod) return null;
                  const itemUnitPrice = item.selectedPrice !== undefined 
                    ? item.selectedPrice 
                    : (prod.discountPrice && prod.discountPrice > 0 && prod.discountPrice < prod.price ? prod.discountPrice : prod.price);
                  const convertedProdPrice = itemUnitPrice * rate;

                  return (
                    <div key={item.productId + '-cart-' + itemIdx} className="checkout-item-row p-3.5 flex gap-3 items-center">
                      <img 
                        src={(prod.images && prod.images[0]) || 'https://images.unsplash.com/photo-154946?q=80&w=600&auto=format&fit=crop'} 
                        className="w-12 h-12 rounded-lg object-cover border border-rose-100/40 shrink-0" 
                        alt="" 
                      />
                      <div className="flex-1 min-w-0">
                        <h5 className="font-serif italic text-xs font-extrabold text-slate-850 truncate">{prod.name}</h5>
                        <p className="font-mono text-[10px] text-slate-505 font-bold mt-0.5">
                          {selectedCurrency.symbol} {convertedProdPrice.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        </p>
                        {item.selectedVariations && item.selectedVariations.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.selectedVariations.map((vOpt, vOptIdx) => (
                              <span 
                                key={vOptIdx} 
                                className="inline-block text-[8px] font-mono px-1 py-0.2 bg-white text-rose-800 border border-rose-100 rounded"
                              >
                                {vOpt.name}: {vOpt.value}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex rounded-lg border border-rose-150 bg-white">
                          <button
                            type="button"
                            onClick={() => {
                              const copy = [...cartItems];
                              if (copy[itemIdx].quantity > 1) {
                                copy[itemIdx].quantity--;
                                onUpdateCartItems(copy);
                              }
                            }}
                            className="px-2 py-1 text-slate-655 hover:bg-rose-50/50 rounded-l-lg transition font-bold text-xs cursor-pointer border-0 bg-transparent flex items-center justify-center"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="px-2 py-1 font-mono font-black text-xs text-slate-800 flex items-center justify-center bg-rose-50/10 min-w-[20px]">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const copy = [...cartItems];
                              copy[itemIdx].quantity++;
                              onUpdateCartItems(copy);
                            }}
                            className="px-2 py-1 text-slate-655 hover:bg-rose-50/50 rounded-r-lg transition font-bold text-xs cursor-pointer border-0 bg-transparent flex items-center justify-center"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const copy = cartItems.filter((_, idx) => idx !== itemIdx);
                            onUpdateCartItems(copy);
                          }}
                          className="p-1.5 hover:bg-red-50 text-rose-550 rounded transition cursor-pointer border-0 bg-transparent"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative z-10 p-5 border-t border-pink-100 bg-white/90 backdrop-blur-sm space-y-4 shrink-0">
              <div className="flex justify-between font-bold text-xs text-slate-800">
                <span className="uppercase tracking-wider">Estimated Subtotal</span>
                <span className="font-mono text-[#E91E63] text-base font-extrabold">{selectedCurrency.symbol} {subtotalConverted.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Delivery, add-ons, and taxes are calculated on the next step.
              </p>

              <button
                onClick={() => setViewMode('checkout')}
                type="button"
                className="checkout-pay-btn w-full py-3.5 text-white font-extrabold text-xs uppercase tracking-[0.15em] rounded-xl transition cursor-pointer border-0 flex items-center justify-center gap-2"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* CORE CHECKOUT — dual column grid */
          <div className="relative flex-grow overflow-y-auto">
            <GiftLoungeBackdrop variant="subtle" className="opacity-70" />
            <div className="relative z-10 w-full min-h-full">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:divide-x lg:divide-pink-100/80">
                
                {/* Left — addresses & delivery */}
                <div className="lg:col-span-7 p-5 sm:p-8 space-y-5">
                  <CheckoutStepBanner step={1} label="Shipping and Gifting Addresses" />
                  
                  <CheckoutForms
                    isLight={isLight}
                    senderName={senderName}
                    setSenderName={setSenderName}
                    senderEmail={senderEmail}
                    setSenderEmail={setSenderEmail}
                    senderPhone={senderPhone}
                    setSenderPhone={setSenderPhone}
                    receiverName={receiverName}
                    setReceiverName={setReceiverName}
                    receiverPhone={receiverPhone}
                    setReceiverPhone={setReceiverPhone}
                    deliveryDistrictId={deliveryDistrictId}
                    setDeliveryDistrictId={setDeliveryDistrictId}
                    manualDeliveryDistrict={manualDeliveryDistrict}
                    setManualDeliveryDistrict={setManualDeliveryDistrict}
                    districtsList={districtsList}
                    selectedDistrict={selectedDistrict}
                    deliveryAddress={deliveryAddress}
                    setDeliveryAddress={setDeliveryAddress}
                    orderNote={orderNote}
                    setOrderNote={setOrderNote}
                    preferredDeliveryDate={preferredDeliveryDate}
                    setPreferredDeliveryDate={setPreferredDeliveryDate}
                    isCalendarOpen={isCalendarOpen}
                    setIsCalendarOpen={setIsCalendarOpen}
                    calendarViewDate={calendarViewDate}
                    setCalendarViewDate={setCalendarViewDate}
                    selectedCurrency={selectedCurrency}
                    deliveryChargeConverted={deliveryChargeConverted}
                    state={state}
                    selectedTimeSlotId={selectedTimeSlotId}
                    setSelectedTimeSlotId={setSelectedTimeSlotId}
                  />
                </div>

                {/* Right — cart & payment */}
                <div className="lg:col-span-5 checkout-summary-panel p-5 sm:p-8 space-y-5">
                  <CheckoutStepBanner step={2} label="Cart Selection & Settlement Review" />

                  <CheckoutSummary
                    isLight={isLight}
                    state={state}
                    cartItems={cartItems}
                    onUpdateCartItems={onUpdateCartItems}
                    selectedCurrency={selectedCurrency}
                    onSelectCurrency={onSelectCurrency}
                    rate={rate}
                    selectedFeeIds={selectedFeeIds}
                    setSelectedFeeIds={setSelectedFeeIds}
                    serviceFeeInputs={serviceFeeInputs}
                    setServiceFeeInputs={setServiceFeeInputs}
                    couponCode={couponCode}
                    setCouponCode={setCouponCode}
                    couponFeedback={couponFeedback}
                    handleApplyCoupon={handleApplyCoupon}
                    paymentMethod={paymentMethod}
                    setPaymentMethod={setPaymentMethod}
                    handleSubmitCheckout={handleSubmitCheckout}
                    subtotalConverted={subtotalConverted}
                    totalFeesConverted={totalFeesConverted}
                    deliveryChargeConverted={deliveryChargeConverted}
                    timeSlotChargeConverted={timeSlotChargeConverted}
                    discountConverted={discountConverted}
                    grandTotalConverted={grandTotalConverted}
                    selectedDistrict={selectedDistrict}
                    preferredDeliveryDate={preferredDeliveryDate}
                    checkoutFieldErrors={checkoutFieldErrors}
                  />
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
