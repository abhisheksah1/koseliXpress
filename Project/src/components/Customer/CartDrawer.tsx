import React, { useState, useEffect } from 'react';
import { DatabaseState, Product, CurrencySettings, CartItem, Order, OrderStatus, Lead, LeadStatus } from '../../types';
import { ShoppingBag, X, CheckCircle2, CreditCard, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { isProductOutOfStock } from '../../utils/stockUtils';
import CheckoutForms from './CheckoutForms';
import CheckoutSummary from './CheckoutSummary';
import { sendOrderStatusEmail } from '../../utils/emailHelper';
import { getWhatsAppNotificationUrl } from '../../utils/whatsappHelper';

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
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
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
  const [paymentMethod, setPaymentMethod] = useState<string>('nps');
  const [checkoutComplete, setCheckoutComplete] = useState<boolean>(false);
  const [orderSummaryRef, setOrderSummaryRef] = useState<string>('');
  const [isOrderSummaryOpen, setIsOrderSummaryOpen] = useState<boolean>(false);
  const [isRedirectingPayment, setIsRedirectingPayment] = useState<boolean>(false);

  // Gateway specific text controls for simulation
  const [esewaUserId, setEsewaUserId] = useState<string>('');
  const [esewaPin, setEsewaPin] = useState<string>('');
  const [khaltiNumber, setKhaltiNumber] = useState<string>('');
  const [khaltiPin, setKhaltiPin] = useState<string>('');
  const [npsCardNumber, setNpsCardNumber] = useState<string>('');
  const [npsCardExpiry, setNpsCardExpiry] = useState<string>('');
  const [npsCardCvv, setNpsCardCvv] = useState<string>('');
  const [npsCardholderName, setNpsCardholderName] = useState<string>('');

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
    if (districtsList.length > 0 && !deliveryDistrictId) {
      setDeliveryDistrictId(districtsList[0].id);
    }
  }, [districtsList, deliveryDistrictId]);

  if (!isOpen) return null;

  const selectedDistrict = districtsList.find(d => d.id === deliveryDistrictId);
  const deliveryChargeBase = selectedDistrict ? selectedDistrict.chargeNPR : 0;
  const deliveryChargeConverted = deliveryChargeBase * rate;

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
    if (!senderName || !senderEmail || !senderPhone) {
      alert('Sender Name, Sender Email, and Contact Number with Country Code are mandatory.');
      return;
    }
    if (!receiverName || !receiverPhone || !deliveryDistrictId || !deliveryAddress) {
      alert('Receiver Name, Contact Number, District / City, and Detailed Address are mandatory.');
      return;
    }

    const matchedDist = districtsList.find(d => d.id === deliveryDistrictId);
    if (!matchedDist) {
      alert('Kindly select a dynamic delivery District / City.');
      return;
    }

    setIsRedirectingPayment(true);
  };

  // Settle & Authorize Secure Payment Simulation
  const handleSimulatePaymentCompletion = () => {
    const activeGateway = (state.paymentGateways || []).find(g => g.id === paymentMethod);

    if (paymentMethod === 'esewa') {
      if (!esewaUserId.trim()) {
        alert('eSewa ID (Mobile/Email) is mandatory.');
        return;
      }
      const isEmail = esewaUserId.includes('@');
      const isNumber = /^\d{10}$/.test(esewaUserId.trim());
      if (!isEmail && !isNumber) {
        alert('Invalid eSewa ID format. Must be a 10-digit mobile number or valid email address.');
        return;
      }
      if (!esewaPin.trim()) {
        alert('Password/PIN is mandatory to authorize the eSewa wallet settlement.');
        return;
      }
      if (esewaPin.trim().length < 4) {
        alert('Your security PIN/Password must be at least 4 characters.');
        return;
      }
      if (!activeGateway || !activeGateway.isEnabled) {
        alert('eSewa Wallet Payment gateway is currently disabled in system settings. Choose another pathway.');
        return;
      }
    }

    if (paymentMethod === 'khalti') {
      if (!khaltiNumber.trim()) {
        alert('Khalti Registered Number (Mobile) is mandatory.');
        return;
      }
      if (!/^\d{10}$/.test(khaltiNumber.trim())) {
        alert('Khalti Number must be a valid 10-digit mobile number.');
        return;
      }
      if (!khaltiPin.trim()) {
        alert('Khalti Wallet PIN is mandatory.');
        return;
      }
      if (khaltiPin.trim().length < 4) {
        alert('Khalti Wallet PIN must be at least 4 digits.');
        return;
      }
      if (!activeGateway || !activeGateway.isEnabled) {
        alert('Khalti Mobile Wallet gateway is currently disabled in system settings. Choose another pathway.');
        return;
      }
    }

    if (paymentMethod === 'nps') {
      if (!activeGateway || !activeGateway.isEnabled) {
        alert('NPS Card Gateway is currently disabled in system settings.');
        return;
      }
      if (!activeGateway.merchantId || !activeGateway.secretKey) {
        alert('NPS Gateway Configuration Error: The Merchant ID and Secret Key must be configured by the Admin in administrative settings to securely verify card handshakes.');
        return;
      }
      
      const cleanCard = npsCardNumber.replace(/\s+/g, '');
      if (!cleanCard) {
        alert('Card Number is required for Visa/Mastercard payments.');
        return;
      }
      if (!/^\d{16}$/.test(cleanCard)) {
        alert('Invalid Card Number! Card Number must be exactly 16 digits.');
        return;
      }
      if (!npsCardExpiry.trim()) {
        alert('Card Expiry Date is required.');
        return;
      }
      if (!/^(0[1-9]|1[0-2])\/?([0-9]{2})$/.test(npsCardExpiry.trim())) {
        alert('Invalid Expiry Date! Use MM/YY format (e.g., 12/28).');
        return;
      }
      
      const match = npsCardExpiry.trim().match(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/);
      if (match) {
        const month = parseInt(match[1]);
        const year = parseInt('20' + match[2]);
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        if (year < currentYear || (year === currentYear && month < currentMonth)) {
          alert('This card has already expired. Provide a valid card expiry.');
          return;
        }
      }

      if (!npsCardCvv.trim()) {
        alert('CVV / Security PIN is required.');
        return;
      }
      if (!/^\d{3,4}$/.test(npsCardCvv.trim())) {
        alert('CVV must be exactly 3 or 4 digits.');
        return;
      }
      if (!npsCardholderName.trim()) {
        alert('Cardholder Full Name is required.');
        return;
      }
      if (npsCardholderName.trim().length < 3) {
        alert('Provide a valid Cardholder Name (minimum 3 characters).');
        return;
      }
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

    if (paymentMethod === 'nps') {
      setIsVerifyingPaymentFlow(true);
      setPaymentVerificationLog([]);
      setPaymentVerificationStatus("Configuring secure proxy tunnel...");

      // Generate a highly unique, non-colliding transaction ID using timestamp
      const tempRefId = `${state.store.orderPrefix || 'KO'}${Date.now()}`;

      const logs: string[] = [];
      const addLog = (msg: string) => {
        const time = new Date().toLocaleTimeString();
        logs.push(`[${time}] ${msg}`);
        setPaymentVerificationLog([...logs]);
      };

      addLog("Initializing secure proxy handshake with Nepal Payment Solution...");
      addLog(`Targeting dynamic merchant context: Merchant ID (${activeGateway?.merchantId || 'N/A'})`);
      addLog(`Generating alphabetical Sorted Signature: MerchantId, MerchantName, Amount (${grandTotalConverted}), MerchantTxnId (${tempRefId})`);

      fetch('/api/payment/initiate-nps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: grandTotalConverted,
          merchantTxnId: tempRefId
        })
      })
      .then(res => {
        if (!res.ok) {
          return res.json().then(data => { throw new Error(data.error || 'HTTP ' + res.status); });
        }
        return res.json();
      })
      .then(data => {
        // Evaluate API response code (NPS returns 0 for Success, non-zero for Errors)
        if (data.code !== "0" && data.code !== 0) {
          const detail = data.errors && data.errors.length > 0
            ? data.errors.map((e: any) => `${e.error_message} (${e.error_code})`).join(', ')
            : (data.message || 'Unknown API gateway check error');
          throw new Error(detail);
        }

        addLog(`[Success] Securing response from API Gateway: Code (${data.code})`);
        addLog(`[Success] Response Message: ${data.message}`);
        if (data.data && data.data.ProcessId) {
          addLog(`[Success] Process ID retrieved: ${data.data.ProcessId}`);
        } else {
          addLog(`[Info] No Process ID returned. Handshake completed.`);
        }
        addLog(`Authenticating customer's Visa/Mastercard credentials via NICAsia gateway portal...`);
        addLog(`Contacting bank issuer secure node for authorization code...`);
        addLog(`Approved by bank merchant node! Capturing transaction funds...`);

        setTimeout(() => {
          completeOrderCreation(products, tempRefId);
        }, 1550);
      })
      .catch(err => {
        addLog(`[Error] Remote NPS API Handshake failed: ${err.message}`);
        
        const isLive = activeGateway?.apiEnvironment === 'live';
        if (isLive) {
          addLog(`[Fatal] Settlement rejected. Please try a different payment card or gateway.`);
          setPaymentVerificationStatus(`Settlement Terminated: ${err.message}`);
          setIsVerifyingPaymentFlow(false);
          alert(`NPS Payment Gateway Failure: ${err.message}. Please verify settings or use another card.`);
        } else {
          addLog(`[Notice] Offline Sandbox Simulator activated...`);
          addLog(`[Sim] Checking transaction integrity block with mock token...`);
          addLog(`[Sim] Handshake successfully authorized! Settle Rs. ${grandTotalConverted}...`);

          setTimeout(() => {
            completeOrderCreation(products, tempRefId);
          }, 1550);
        }
      });
      return;
    }

    const isAutoGateway = ['esewa', 'khalti'].includes(paymentMethod);
    if (isAutoGateway) {
      setIsVerifyingPaymentFlow(true);
      setPaymentVerificationLog([]);
      
      const logSteps = [
        `Establishing secure SSL/TLS connection to gateway node: ${activeGateway?.name || paymentMethod.toUpperCase()}...`,
        `Authorizing API keys and headers with Merchant ID: ${activeGateway?.merchantId || 'N/A'}...`,
        `Validating SHA Signature Checksum ... Signature Validated.`,
        `Broadcasting payload: Settle ${selectedCurrency.symbol} ${grandTotalConverted.toLocaleString(undefined, { maximumFractionDigits: 1 })}...`,
        `Contacting bank issuer secure gateway node for authorization code...`,
        `Handshake authorized. Capturing transaction funds...`
      ];

      let step = 0;
      setPaymentVerificationStatus(logSteps[0]);
      setPaymentVerificationLog([`[12:00:01] ${logSteps[0]}`]);

      const interval = setInterval(() => {
        step++;
        if (step < logSteps.length) {
          const timestamp = new Date().toLocaleTimeString();
          setPaymentVerificationStatus(logSteps[step]);
          setPaymentVerificationLog(prev => [...prev, `[${timestamp}] ${logSteps[step]}`]);
        } else {
          clearInterval(interval);
          completeOrderCreation(products);
        }
      }, 550);
    } else {
      completeOrderCreation(products);
    }
  };

  const completeOrderCreation = (products: Product[], forcedRefId?: string) => {
    const isPaymentPaid = !(paymentMethod.toLowerCase() === 'cod' || paymentMethod.toLowerCase() === 'manual' || paymentMethod.toLowerCase() === 'fonepay_static');

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

    const matchedDist = districtsList.find(d => d.id === deliveryDistrictId);
    const refId = forcedRefId || `${state.store.orderPrefix}-${Math.floor(Math.random() * 90000 + 10000)}`;
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      refId,
      customerName: senderName,
      customerEmail: senderEmail || 'guest@customer.com',
      customerPhone: senderPhone,
      shippingAddress: `${deliveryAddress}, ${matchedDist ? matchedDist.name : ''}`,
      senderName,
      senderEmail,
      senderPhone,
      receiverName,
      receiverPhone,
      deliveryDistrict: matchedDist ? matchedDist.name : '',
      deliveryAddress,
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
            ? 'max-w-md md:max-w-full md:w-screen'
            : 'max-w-md'
        } border-l h-screen flex flex-col justify-between shadow-2xl relative animate-slide-in transition-all duration-300 ${
          isLight ? 'bg-[#FCF9F9] text-slate-800 border-rose-100' : 'bg-[#0d0d0d] border-white/10 text-slate-355'
        }`}
      >
        {/* Header Drawer */}
        <div className={`p-4 border-b flex items-center justify-between transition-colors ${
          isLight ? 'bg-white border-rose-100' : 'bg-[#0a0a0a] border-white/5'
        }`}>
          <div className="flex items-center gap-2.5">
            <h3 className={`text-sm uppercase tracking-wider font-extrabold pb-0.5 ${isLight ? 'text-rose-700' : 'text-white'}`}>
              🛒 Secure Gifting Checkout
            </h3>
            <span className="text-xs bg-rose-50 text-rose-600 border border-rose-100 rounded px-2 py-0.5 font-mono font-bold">
              {cartItems.length} items
            </span>
            {!checkoutComplete && cartItems.length > 0 && viewMode === 'checkout' && (
              <button
                type="button"
                onClick={() => setViewMode('cart')}
                className="ml-2 px-2 py-0.5 text-[10px] font-bold text-rose-650 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 rounded-md transition cursor-pointer"
              >
                ← Edit Cart
              </button>
            )}
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1 rounded-full transition cursor-pointer hover:bg-rose-50/50 text-slate-500 hover:text-slate-900 border-0 bg-transparent"
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
                    💳 Gateway Credentials Simulator
                  </span>
                  <span className="text-[9px] bg-rose-50 border border-rose-100 text-rose-600 px-2 py-0.5 rounded font-mono font-bold leading-none uppercase">
                    {paymentMethod}
                  </span>
                </div>

                {paymentMethod === 'esewa' && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wide mb-1">eSewa ID (Mobile/Email)</label>
                      <input
                        type="text"
                        placeholder="9851000000 or email"
                        value={esewaUserId}
                        onChange={(e) => setEsewaUserId(e.target.value)}
                        className="w-full p-2.5 border border-rose-150 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white text-slate-850"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wide mb-1">Password / Security PIN</label>
                      <input
                        type="password"
                        placeholder="••••"
                        value={esewaPin}
                        onChange={(e) => setEsewaPin(e.target.value)}
                        className="w-full p-2.5 border border-rose-150 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white text-slate-850 font-mono"
                      />
                    </div>
                  </div>
                )}

                {paymentMethod === 'khalti' && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wide mb-1">Khalti Registered Mobile Number</label>
                      <input
                        type="text"
                        placeholder="9841234567"
                        value={khaltiNumber}
                        onChange={(e) => setKhaltiNumber(e.target.value)}
                        className="w-full p-2.5 border border-rose-150 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white text-slate-850"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wide mb-1">Transaction Wallet PIN</label>
                      <input
                        type="password"
                        placeholder="••••"
                        value={khaltiPin}
                        onChange={(e) => setKhaltiPin(e.target.value)}
                        className="w-full p-2.5 border border-rose-150 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white text-slate-850 font-mono"
                      />
                    </div>
                  </div>
                )}

                {paymentMethod === 'nps' && (
                  <div className="space-y-3.5 text-xs font-sans">
                    <div>
                      <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wide mb-1">Cardholder Full Name</label>
                      <input
                        type="text"
                        placeholder="Dinesh Chalise"
                        value={npsCardholderName}
                        onChange={(e) => setNpsCardholderName(e.target.value)}
                        className="w-full p-2.5 border border-rose-150 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white text-slate-850"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wide mb-1">Card Number (Visa / Mastercard)</label>
                      <input
                        type="text"
                        placeholder="4111 2222 3333 4444"
                        value={npsCardNumber}
                        onChange={(e) => setNpsCardNumber(e.target.value)}
                        className="w-full p-2.5 border border-rose-150 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white text-slate-850 font-mono font-bold"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wide mb-1">Expiry MM/YY</label>
                        <input
                          type="text"
                          placeholder="12/28"
                          value={npsCardExpiry}
                          onChange={(e) => setNpsCardExpiry(e.target.value)}
                          className="w-full p-2.5 border border-rose-150 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white text-slate-850 font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wide mb-1">CVV Checklist</label>
                        <input
                          type="password"
                          placeholder="•••"
                          maxLength={4}
                          value={npsCardCvv}
                          onChange={(e) => setNpsCardCvv(e.target.value)}
                          className="w-full p-2.5 border border-rose-150 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white text-slate-850 font-mono font-bold"
                        />
                      </div>
                    </div>
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
          /* STANDALONE CART LIST EDIT MODE */
          <div className="flex-1 flex flex-col justify-between overflow-hidden bg-white">
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-rose-50">
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
                    <div key={item.productId + '-cart-' + itemIdx} className="p-3 bg-rose-50/15 border border-rose-100/40 rounded-xl flex gap-3 items-center text-left">
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

            <div className="p-4 border-t border-rose-100 bg-slate-50 space-y-4 shrink-0 text-left">
              <div className="space-y-1.5 font-sans">
                <div className="flex justify-between font-bold text-xs text-slate-800">
                  <span className="uppercase tracking-wider">Estimated Subtotal:</span>
                  <span className="font-mono text-rose-600 text-sm font-extrabold">{selectedCurrency.symbol} {subtotalConverted.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                  VAT charges, customization, and delivery charges will be computed on the next step.
                </p>
              </div>

              <button
                onClick={() => setViewMode('checkout')}
                type="button"
                className="w-full py-3 bg-[#d11252] hover:bg-[#b00f42] text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition shadow-md shadow-rose-500/10 cursor-pointer border-0 flex items-center justify-center gap-2"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* CORE CART & CHECKOUT STEPS FLOW - RESPONSIVE DUAL COLUMN GRID */
          <div className="flex-grow overflow-y-auto bg-[#FFFDFD] border-t border-rose-50/50">
            <div className="w-full min-h-full">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:divide-x lg:divide-rose-100 min-h-screen">
                
                {/* Left side customer forms (7 Cols) */}
                <div className="lg:col-span-7 bg-[#FFFDFD] p-5 sm:p-7 space-y-6">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#a855f7] font-mono block pb-1 border-b border-rose-100/50">
                    Step 1 of 2: Shipping and Gifting Addresses
                  </span>
                  
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

                {/* Right side items & payment details (5 Cols) */}
                <div className="lg:col-span-5 bg-[#FCF9F9]/60 p-5 sm:p-7 space-y-6">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-rose-605 font-mono block pb-1 border-b border-rose-100/50">
                    Step 2 of 2: Cart Selection & Settlement Review
                  </span>

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
