import React, { useState } from 'react';
import { DatabaseState, OrderStatus, Order } from '../../types';
import { X, CheckCircle2, ShoppingBag, Eye, Lock, ArrowRight, Clock, HelpCircle, Package, Truck, Smile, AlertTriangle, CreditCard, ChevronLeft, Check, User, Sparkles, Calendar, Shield } from 'lucide-react';
import { logoutAuth0IfNeeded, saveCustomerSession, startGoogleLogin } from '../../utils/customerAuth';
import GiftLoungeBackdrop from './GiftLoungeBackdrop';

interface CustomerPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: DatabaseState;
  customerUser: { email: string; name: string; picture?: string; sub?: string } | null;
  onUpdateCustomerUser: (user: { email: string; name: string } | null) => void;
  onUpdateState: (newState: DatabaseState) => void;
  initialTab?: 'track' | 'signin' | 'reminder';
}

export default function CustomerPortalModal({ 
  isOpen, 
  onClose, 
  state,
  customerUser,
  onUpdateCustomerUser,
  onUpdateState,
  initialTab = 'track'
}: CustomerPortalModalProps) {
  const googleUser = customerUser;
  
  const [activeTab, setActiveTab] = useState<'track' | 'signin' | 'reminder'>(initialTab);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  
  const [typedEmail, setTypedEmail] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Lounge tabs & form variables
  const [loungeSubTab, setLoungeSubTab] = useState<'orders' | 'reminders'>('orders');
  const [remGuestEmail, setRemGuestEmail] = useState('');
  const [remName, setRemName] = useState('');
  const [remRelation, setRemRelation] = useState('Mother');
  const [remDate, setRemDate] = useState('');
  const [remPhone, setRemPhone] = useState('');
  const [remNotes, setRemNotes] = useState('');
  const [remFeedback, setRemFeedback] = useState<string | null>(null);

  // Delivered product reviews states
  const [productRatings, setProductRatings] = useState<Record<string, number>>({});
  const [productComments, setProductComments] = useState<Record<string, string>>({});
  const [reviewFeedback, setReviewFeedback] = useState<Record<string, string>>({});
  
  // Custom payment completion simulation states
  const [completingPayment, setCompletingPayment] = useState(false);
  const [paymentGateway, setPaymentGateway] = useState<string | null>(null);
  const [payPhone, setPayPhone] = useState('');
  const [payPin, setPayPin] = useState('');
  const [payError, setPayError] = useState('');
  const [isProcessingPay, setIsProcessingPay] = useState(false);
  const [payCurrency, setPayCurrency] = useState<string>('NPR');
  const [cardNum, setCardNum] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [manualRef, setManualRef] = useState('');

  const handleSelectOrder = (ord: Order | null) => {
    setSelectedOrder(ord);
    setCompletingPayment(false);
    setPaymentGateway(null);
    setPayPhone('');
    setPayPin('');
    setPayError('');
    setCardNum('');
    setCardExp('');
    setCardCvv('');
    setCardName('');
    setManualRef('');
    setPayCurrency(ord?.currency || 'NPR');
  };
  
  const handleConnectGoogle = async () => {
    if (state.customerAuthConfig?.enableGoogleLogin === false) {
      setAuthError('Google sign-in is currently disabled. Contact store support.');
      return;
    }
    setAuthError(null);
    setIsSigningIn(true);
    try {
      await startGoogleLogin();
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Could not start Google sign-in.');
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    onUpdateCustomerUser(null);
    saveCustomerSession(null);
    await logoutAuth0IfNeeded();
    setSelectedOrder(null);
  };
  const [trackSenderName, setTrackSenderName] = useState('');
  const [trackReceiverName, setTrackReceiverName] = useState('');
  const [trackEmail, setTrackEmail] = useState('');
  const [trackDate, setTrackDate] = useState('');

  // 100% and 80% similarity math algorithm (Levenshtein Distance)
  const getSimilarity = (s1: string, s2: string): number => {
    const str1 = s1.trim().toLowerCase();
    const str2 = s2.trim().toLowerCase();
    
    if (str1 === str2) return 1.0;
    if (!str1 || !str2) return 0.0;
    
    const track = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    for (let i = 0; i <= str1.length; i += 1) track[0][i] = i;
    for (let j = 0; j <= str2.length; j += 1) track[j][0] = j;
    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1, // deletion
          track[j - 1][i] + 1, // insertion
          track[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    const distance = track[str2.length][str1.length];
    const maxLen = Math.max(str1.length, str2.length);
    return (maxLen - distance) / maxLen;
  };

  // Secure masking helpers to prevent showing full user info after tracking
  const maskText = (text: string | undefined): string => {
    if (!text) return 'N/A';
    const trimmed = text.trim();
    if (trimmed.length <= 2) return trimmed[0] + '*';
    
    return trimmed.split(' ').map(word => {
      if (word.length <= 2) return word[0] + '*';
      const visibleStart = Math.ceil(word.length * 0.25);
      const visibleEnd = Math.ceil(word.length * 0.25);
      const start = word.substring(0, visibleStart);
      const end = word.substring(word.length - visibleEnd);
      const starsArr = '*'.repeat(Math.max(1, word.length - visibleStart - visibleEnd));
      return start + starsArr + end;
    }).join(' ');
  };

  const maskEmail = (email: string | undefined): string => {
    if (!email) return 'N/A';
    const parts = email.trim().split('@');
    if (parts.length !== 2) return '*****';
    const name = parts[0];
    const domain = parts[1];
    
    const visibleName = name.length <= 3 ? name[0] + '***' : name.substring(0, 2) + '*'.repeat(name.length - 3) + name[name.length - 1];
    return `${visibleName}@${domain}`;
  };

  const maskPhone = (phone: string | undefined): string => {
    if (!phone) return 'N/A';
    const trimmed = phone.trim();
    if (trimmed.length < 6) return '******';
    return trimmed.substring(0, 3) + '*'.repeat(trimmed.length - 5) + trimmed.substring(trimmed.length - 2);
  };

  const getGatewaySubtext = (id: string): string => {
    switch (id) {
      case 'esewa': return 'Secure eSewa wallet transfer';
      case 'khalti': return 'Khalti smart mobile payment';
      case 'fonepay_static':
      case 'fonepay_dynamic':
      case 'fonepay_qr':
      case 'fonepay': return 'Secure FonePay static QR';
      case 'nps':
      case 'nabil': return 'Authorize via Visa/Mastercard';
      case 'manual': return 'Direct bank ledger deposit';
      case 'cod': return 'Mark cash on delivery';
      default: return 'Instant digital settlement';
    }
  };

  // Handle direct secure simulated payment completion within the Portal
  const handleSimulatePaymentCompletion = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentGateway === 'esewa' || paymentGateway === 'khalti') {
      setPayError(
        `${paymentGateway === 'khalti' ? 'Khalti' : 'eSewa'} payments must be completed on the official secure payment page. Local mobile/PIN fields are not accepted — contact support or pay at checkout with gateway redirect.`,
      );
      return;
    }
    if (paymentGateway === 'nps' || paymentGateway === 'nabil' || paymentGateway?.includes('card')) {
      if (!cardNum.trim() || cardNum.length < 14) {
        setPayError('A valid 16-digit card number is required.');
        return;
      }
      if (!cardExp.trim() || !cardExp.includes('/')) {
        setPayError('Card expiry date (MM/YY) is required.');
        return;
      }
      if (!cardCvv.trim() || cardCvv.length < 3) {
        setPayError('A valid CVV of 3 or 4 digits is required.');
        return;
      }
      if (!cardName.trim()) {
        setPayError('Cardholder name is required.');
        return;
      }
    } else if (paymentGateway === 'manual') {
      if (!manualRef.trim()) {
        setPayError('Bank transfer reference number is required.');
        return;
      }
    }

    setPayError('');
    setIsProcessingPay(true);

    setTimeout(() => {
      const currentCurrSettings = state.currencies?.find(c => c.code === payCurrency) || { code: 'NPR', symbol: 'Rs.', rateToNPR: 1.0 };
      const currentRate = payCurrency === 'NPR' ? 1.0 : (currentCurrSettings.rateToNPR || 1.0);
      const baseNPR = selectedOrder?.totalAmountBase || selectedOrder?.totalAmount || 0;
      const convertedAmount = baseNPR * currentRate;

      const updatedOrders = state.orders.map(o => {
        if (o.id === selectedOrder?.id) {
          return {
            ...o,
            paymentStatus: 'paid' as const,
            stockAdjusted: true,
            currency: payCurrency,
            exchangeRate: currentRate,
            totalAmount: convertedAmount,
            paymentMethod: paymentGateway || o.paymentMethod
          };
        }
        return o;
      });

      const nextDbState = {
        ...state,
        orders: updatedOrders
      };

      onUpdateState(nextDbState);

      // Instantly propagate state inside the single active tracking session
      setSelectedOrder(prev => prev ? { 
        ...prev, 
        paymentStatus: 'paid' as const, 
        stockAdjusted: true,
        currency: payCurrency,
        exchangeRate: currentRate,
        totalAmount: convertedAmount,
        paymentMethod: paymentGateway || prev.paymentMethod
      } : null);
      
      setIsProcessingPay(false);
      setCompletingPayment(false);
      setPaymentGateway(null);
      setPayPhone('');
      setPayPin('');
      setCardNum('');
      setCardExp('');
      setCardCvv('');
      setCardName('');
      setManualRef('');
    }, 1500);
  };

  const handleRegisterReminder = (e: React.FormEvent) => {
    e.preventDefault();
    const finalEmail = googleUser ? googleUser.email : remGuestEmail.trim();
    if (!finalEmail) {
      setRemFeedback('❌ Please provide your contact Email address.');
      return;
    }
    if (!remName || !remDate) {
      setRemFeedback('❌ Please provide both Recipient Name and Special Date.');
      return;
    }
    const newReminder = {
      id: `rem-${Date.now()}`,
      name: remName.trim(),
      relation: remRelation,
      date: remDate,
      email: finalEmail.toLowerCase(),
      phone: remPhone.trim() || undefined,
      notes: remNotes.trim() || undefined,
      createdAt: new Date().toISOString().substring(0, 10),
      autoReminded: false
    };

    const currentList = state.specialDayReminders || [];
    const nextList = [newReminder, ...currentList];

    onUpdateState({
      ...state,
      specialDayReminders: nextList
    });

    setRemName('');
    setRemPhone('');
    setRemNotes('');
    setRemFeedback('🎉 Special Day registered! Auto reminder mail will dispatch 4 days prior.');
    setTimeout(() => setRemFeedback(null), 6005);
  };

  const handleDeleteReminder = (id: string) => {
    const list = (state.specialDayReminders || []).filter(r => r.id !== id);
    onUpdateState({
      ...state,
      specialDayReminders: list
    });
  };

  const handlePostReview = (productId: string) => {
    if (!googleUser) return;
    const rating = productRatings[productId] || 5;
    const comment = productComments[productId]?.trim();

    if (!comment) {
      setReviewFeedback(prev => ({ ...prev, [productId]: '❌ Please write a feedback comment.' }));
      return;
    }

    const newRev = {
      id: `rev-${Date.now()}-${productId}`,
      productId,
      customerName: googleUser.name,
      rating,
      comment,
      status: 'published' as const,
      createdAt: new Date().toISOString()
    };

    onUpdateState({
      ...state,
      reviews: [newRev, ...(state.reviews || [])]
    });

    setReviewFeedback(prev => ({ ...prev, [productId]: '🎉 Review posted! Check product detail page.' }));
    setProductComments(prev => ({ ...prev, [productId]: '' }));
    setTimeout(() => {
      setReviewFeedback(prev => ({ ...prev, [productId]: '' }));
    }, 5000);
  };

  // Find all orders matching the user's Google Email
  const matchedOrders = googleUser 
    ? (state.orders || []).filter(ord => 
        ord.customerEmail?.toLowerCase() === googleUser.email.toLowerCase() ||
        ord.senderEmail?.toLowerCase() === googleUser.email.toLowerCase()
      )
    : [];

  const [ordersPage, setOrdersPage] = useState(1);
  const ordersPerPage = 50;

  React.useEffect(() => {
    setOrdersPage(1);
  }, [googleUser]);

  if (!isOpen) return null;

  const totalOrdersPages = Math.ceil(matchedOrders.length / ordersPerPage);
  const paginatedOrders = matchedOrders.slice(
    (ordersPage - 1) * ordersPerPage,
    ordersPage * ordersPerPage
  );

  // Multi-field guest order lookup matching (100% email + 100% date + 100% sender matching, >= 90% receiver matching)
  const searchedOrder = (trackSenderName.trim() && trackReceiverName.trim() && trackEmail.trim() && trackDate)
    ? (state.orders || []).find(ord => {
        const emailMatches = ord.customerEmail?.toLowerCase() === trackEmail.trim().toLowerCase() ||
                             ord.senderEmail?.toLowerCase() === trackEmail.trim().toLowerCase();
        
        const ordDateKey = new Date(ord.createdAt).toISOString().split('T')[0];
        const dateMatches = ordDateKey === trackDate;

        const sName = (ord.senderName || ord.customerName || '').trim().toLowerCase();
        const senderMatches = sName === trackSenderName.trim().toLowerCase();

        const rName = (ord.receiverName || '').trim().toLowerCase();
        const similarity = getSimilarity(trackReceiverName, rName);
        const receiverMatches = similarity >= 0.9;

        return emailMatches && dateMatches && senderMatches && receiverMatches;
      })
    : null;

  const getStatusLabel = (status: OrderStatus | string): string => {
    switch (status) {
      case 'pending':
      case OrderStatus.PENDING: 
        return 'Payment Pending';
      case 'paid':
      case OrderStatus.PAID: 
        return 'Order Received';
      case 'preparing':
      case OrderStatus.PREPARING: 
        return 'Preparing';
      case 'shipped':
      case OrderStatus.SHIPPED: 
        return 'Dispatch';
      case 'delivered':
      case OrderStatus.DELIVERED: 
        return 'Delivered';
      case 'cancelled':
      case OrderStatus.CANCELLED: 
        return 'Cancelled';
      default: 
        return status;
    }
  };

  const getStatusColor = (status: OrderStatus | string) => {
    switch (status) {
      case 'delivered':
      case OrderStatus.DELIVERED: 
        return 'bg-emerald-100 text-emerald-800 border border-emerald-250';
      case 'shipped':
      case OrderStatus.SHIPPED: 
        return 'bg-sky-100 text-sky-800 border border-sky-250';
      case 'preparing':
      case OrderStatus.PREPARING: 
        return 'bg-amber-100 text-amber-900 border border-amber-250';
      case 'paid':
      case OrderStatus.PAID: 
        return 'bg-blue-100 text-blue-800 border border-blue-250';
      case 'pending':
      case OrderStatus.PENDING: 
        return 'bg-rose-100 text-rose-800 border border-rose-250';
      case 'cancelled':
      case OrderStatus.CANCELLED: 
        return 'bg-slate-100 text-slate-800 border border-slate-205';
      default: 
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />

      <div className="relative w-full max-w-4xl bg-[#FFFBFC] border border-pink-100 rounded-3xl overflow-hidden shadow-2xl shadow-pink-900/10 text-left text-slate-800 font-sans z-10 my-6">
        <GiftLoungeBackdrop variant="modal" />
        
        {/* Header */}
        <div className="relative z-10 bg-gradient-to-r from-pink-50/90 via-white/95 to-pink-50/90 backdrop-blur-sm px-5 sm:px-6 py-4 border-b border-pink-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E91E63] to-[#C2185B] flex items-center justify-center text-white shadow-md shadow-pink-500/25 shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-800 tracking-wide uppercase truncate">Customer Gifting Lounge</h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500">Secure live order timelines, Google sync, & recipient logs</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="shrink-0 px-3 py-2 text-slate-500 hover:text-slate-800 bg-pink-50 hover:bg-pink-100 rounded-xl text-xs font-semibold transition border border-pink-100"
          >
            ✕ Close
          </button>
        </div>

        <div className="relative z-10 p-5 sm:p-6 space-y-5">
          
          {/* Top action cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-white border border-pink-100 rounded-2xl p-2 shadow-sm">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#E91E63] block px-2 pt-1 pb-1.5">
                Registered Gifter Area
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signin');
                  setSelectedOrder(null);
                  setCompletingPayment(false);
                }}
                className={`w-full py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 border-0 cursor-pointer ${
                  activeTab === 'signin'
                    ? 'bg-gradient-to-r from-[#E91E63] to-[#C2185B] text-white shadow-lg shadow-pink-500/25'
                    : 'text-slate-600 bg-pink-50/50 hover:bg-pink-50'
                }`}
              >
                <User className="w-4 h-4 shrink-0" />
                Sign In & Gifting Lounge
              </button>
            </div>

            <div className="bg-white border border-pink-100 rounded-2xl p-2 shadow-sm">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-violet-600 block px-2 pt-1 pb-1.5">
                Guest Quick Tools
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('track');
                    setSelectedOrder(null);
                    setCompletingPayment(false);
                  }}
                  className={`py-2.5 text-[10px] font-bold uppercase tracking-wide rounded-xl transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                    activeTab === 'track'
                      ? 'bg-violet-600 text-white border-violet-600 shadow-md'
                      : 'text-violet-700 bg-white border-pink-100 hover:border-violet-200 hover:bg-violet-50/50'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Track Order
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('reminder');
                    setSelectedOrder(null);
                    setCompletingPayment(false);
                  }}
                  className={`py-2.5 text-[10px] font-bold uppercase tracking-wide rounded-xl transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                    activeTab === 'reminder'
                      ? 'bg-violet-600 text-white border-violet-600 shadow-md'
                      : 'text-violet-700 bg-white border-pink-100 hover:border-violet-200 hover:bg-violet-50/50'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Reminders
                </button>
              </div>
            </div>
          </div>

          {/* MAIN GRID WRAPPER FOR BOTH TAB VIEWS */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-1">
            {/* Left Column (5/12) */}
            <div className="md:col-span-5 space-y-4 text-left">
              {activeTab === 'track' ? (
                /* --- GUEST TRACK TAB --- */
                <>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#a855f7] block">1. Guest Lookup Form</span>
                
                <div className="p-4 bg-white border border-rose-100 rounded-xl space-y-4">
                  <div className="space-y-2.5 text-xs text-slate-705">
                    {/* SENDER NAME */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 block">Sender Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Sujal Gitey"
                        className="w-full text-xs p-2.5 bg-rose-50/20 border border-rose-150 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-rose-450"
                        value={trackSenderName}
                        onChange={(e) => setTrackSenderName(e.target.value)}
                      />
                    </div>

                    {/* RECEIVER NAME */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 block">Receiver Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Sujata Gitey"
                        className="w-full text-xs p-2.5 bg-rose-50/20 border border-rose-150 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-rose-450"
                        value={trackReceiverName}
                        onChange={(e) => setTrackReceiverName(e.target.value)}
                      />
                    </div>

                    {/* EMAIL */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 block">Checkout Email ID</label>
                      <input
                        type="email"
                        placeholder="e.g. gitey@customer.com"
                        className="w-full text-xs p-2.5 bg-rose-50/20 border border-rose-150 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-rose-450"
                        value={trackEmail}
                        onChange={(e) => setTrackEmail(e.target.value)}
                      />
                    </div>

                    {/* DATE */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 block">Ordered Date</label>
                      <input
                        type="date"
                        className="w-full text-xs p-2.5 bg-rose-50/20 border border-rose-150 rounded-lg text-slate-800 font-mono focus:outline-none focus:border-rose-450"
                        value={trackDate}
                        onChange={(e) => setTrackDate(e.target.value)}
                      />
                    </div>
                  </div>

                  {searchedOrder ? (
                    <button
                      type="button"
                      onClick={() => handleSelectOrder(searchedOrder)}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md shadow-rose-500/15 cursor-pointer border-0"
                    >
                      <span>Show Guest Order</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <div className="text-[9.5px] p-2 bg-rose-50/35 border border-rose-100 rounded-lg text-slate-500 leading-relaxed text-center font-semibold">
                      {trackSenderName && trackReceiverName && trackEmail && trackDate 
                        ? '❌ No matching guest order found. Please review the details.'
                        : '💡 Provide all 4 credentials above to query guest hampers...'}
                    </div>
                  )}
                </div>
              </>
            ) : activeTab === 'reminder' ? (
              /* --- GUEST REMINDERS TAB --- */
              <div className="space-y-4">
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#a855f7] block">1. Guest Reminders List</span>
                
                <div className="p-4 bg-white border border-rose-100 rounded-xl space-y-4">
                  <p className="text-[11px] text-slate-500 leading-normal font-semibold">
                    Below are the special day reminders registered under your current email address:
                  </p>
                  {remGuestEmail.trim() === '' ? (
                    <div className="text-[10px] p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-450 leading-relaxed text-center font-semibold">
                      💡 Enter your contact email on the right to view or delete your registered family reminders.
                    </div>
                  ) : (state.specialDayReminders || []).filter(r => r.email === remGuestEmail.trim().toLowerCase()).length === 0 ? (
                    <div className="text-[10px] p-2.5 bg-rose-50/30 border border-rose-100 rounded-lg text-rose-700/80 leading-relaxed text-center font-semibold">
                      No reminders found for <span className="font-mono font-bold">{remGuestEmail.trim()}</span>. Feel free to add one on the right!
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                      {(state.specialDayReminders || [])
                        .filter(r => r.email === remGuestEmail.trim().toLowerCase())
                        .map(rem => (
                          <div key={rem.id} className="p-2 bg-rose-50/40 border border-rose-100 rounded-xl flex items-center justify-between gap-1.5 text-xs">
                            <div>
                              <div className="font-semibold text-slate-805">{rem.name}</div>
                              <div className="text-[9.5px] text-slate-505 flex items-center gap-1 font-mono">
                                <span className="font-bold text-rose-600">{rem.relation}</span> • <span>{rem.date}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteReminder(rem.id)}
                              className="p-1 px-2 text-[9px] font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-150 hover:border-rose-600 rounded transition cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* --- CUSTOMER LOUNGE SIGNIN TAB --- */
              <div className="space-y-4">
              {!googleUser ? (
                <div className="relative gift-lounge-card border border-pink-100/80 rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center gap-5 overflow-hidden">
                  <GiftLoungeBackdrop variant="subtle" />
                  <div className="relative z-10 w-full flex flex-col items-center gap-5">
                  <div className="w-14 h-14 rounded-full bg-pink-50 border border-pink-100 flex items-center justify-center text-[#E91E63] shadow-inner">
                    <User className="w-7 h-7" />
                  </div>
                  <div className="space-y-1.5 max-w-sm">
                    <h3 className="text-base font-bold text-slate-800">Unlock your Premium Gifter Lounge</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Sign in to unlock personalized address books, active order history logs, and family special day reminders.
                    </p>
                  </div>

                  {authError && (
                    <div className="w-full p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium text-left">
                      {authError}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={isSigningIn}
                    onClick={handleConnectGoogle}
                    className="w-full max-w-sm bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm text-slate-700 font-semibold text-xs rounded-xl px-6 py-3 flex items-center justify-center gap-3 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSigningIn ? (
                      <>
                        <span className="w-4 h-4 border-2 border-slate-300 border-t-[#E91E63] rounded-full animate-spin" />
                        Redirecting to Google…
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <span className="font-bold uppercase tracking-wide">Connect Account via Google</span>
                      </>
                    )}
                  </button>
                  </div>
                </div>
              ) : (
                /* Authenticated User Workspace split */
                <div className="space-y-4 text-left">
                  {/* Google Profile Header block */}
                  <div className="flex items-center justify-between p-4 bg-emerald-50/80 border border-emerald-100 rounded-2xl">
                    <div className="flex items-center gap-3 min-w-0">
                      {googleUser.picture ? (
                        <img src={googleUser.picture} alt="" className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E91E63] to-[#C2185B] text-white font-bold flex items-center justify-center text-sm">
                          {googleUser.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 text-left">
                        <div className="text-sm font-bold text-slate-800 truncate flex items-center gap-1.5">
                          {googleUser.name}
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">{googleUser.email}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleLogout()}
                      className="px-3 py-1.5 bg-white hover:bg-pink-50 text-slate-600 hover:text-[#E91E63] border border-pink-100 rounded-lg text-[10px] font-bold cursor-pointer transition uppercase shrink-0"
                    >
                      Logout
                    </button>
                  </div>

                  {/* Lounge Subtab Navigation (Order Histories vs Family Special Reminders) */}
                  <div className="flex gap-2 border-b border-rose-100 pb-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLoungeSubTab('orders');
                        setSelectedOrder(null);
                        setCompletingPayment(false);
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer border-0 ${
                        loungeSubTab === 'orders'
                          ? 'bg-rose-600 text-white shadow-xs font-black'
                          : 'text-slate-500 hover:text-slate-800 bg-slate-50'
                      }`}
                    >
                      🛒 My Order Histories ({matchedOrders.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLoungeSubTab('reminders');
                        setSelectedOrder(null);
                        setCompletingPayment(false);
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer border-0 ${
                        loungeSubTab === 'reminders'
                          ? 'bg-rose-600 text-white shadow-xs font-black'
                          : 'text-slate-500 hover:text-slate-805 bg-slate-50'
                      }`}
                    >
                      📅 Family Special Reminders ({(state.specialDayReminders || []).filter(r => r.email === googleUser.email).length})
                    </button>
                  </div>

                  {/* SUB VIEW RENDERS */}
                  <div className="space-y-4">
                    {loungeSubTab === 'orders' ? (
                      /* Orders histories sub view list column */
                      <div className="space-y-4">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#a855f7] block">1. My Gift Hamper Orders</span>
                        <div className="space-y-2 pr-1">
                          {matchedOrders.length === 0 ? (
                            <div className="p-6 border border-rose-100 bg-white rounded-xl text-center text-slate-450 text-xs font-semibold">
                              No matching checkout orders found for <span className="font-mono text-slate-600">{googleUser.email}</span>. Try placing a mockup gift hamper!
                            </div>
                          ) : (
                            <>
                              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                                {paginatedOrders.map(ord => {
                                  const isSelected = selectedOrder?.id === ord.id;
                                  return (
                                    <button
                                      key={ord.id}
                                      type="button"
                                      onClick={() => handleSelectOrder(ord)}
                                      className={`w-full p-3 rounded-xl border text-left transition relative block cursor-pointer border-0 ${
                                        isSelected 
                                          ? 'bg-rose-50 border border-rose-300 text-rose-700 font-extrabold' 
                                          : 'bg-white border border-rose-100 hover:border-rose-250 text-slate-600 hover:text-slate-800'
                                      }`}
                                    >
                                      <div className="flex justify-between items-start gap-1">
                                        <span className="font-mono text-xs font-bold text-slate-850">{ord.refId}</span>
                                        <span className={`text-[8.5px] font-mono font-black uppercase px-1.5 py-0.5 rounded-full ${getStatusColor(ord.status)}`}>
                                          {getStatusLabel(ord.status)}
                                        </span>
                                      </div>
                                      <div className="text-[9.5px] font-mono mt-0.5 text-slate-455 font-semibold">
                                        Amt: NPR {ord.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                      </div>
                                      <div className="text-[9px] font-sans text-slate-500 truncate mt-0.5">
                                        To: {maskText(ord.receiverName)} ({ord.deliveryDistrict})
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                              {totalOrdersPages > 1 && (
                                <div className="flex items-center justify-between gap-1.5 mt-2 pt-2 border-t border-rose-100 text-[10px] font-semibold text-slate-500 select-none">
                                  <span>
                                    {Math.min(matchedOrders.length, (ordersPage - 1) * ordersPerPage + 1)}-{Math.min(matchedOrders.length, ordersPage * ordersPerPage)} of {matchedOrders.length}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={ordersPage === 1}
                                      onClick={() => setOrdersPage(1)}
                                      className="px-1.5 py-0.5 text-[9px] bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-rose-200 rounded disabled:opacity-40 transition cursor-pointer"
                                    >
                                      First
                                    </button>
                                    <button
                                      type="button"
                                      disabled={ordersPage === 1}
                                      onClick={() => setOrdersPage(prev => Math.max(1, prev - 1))}
                                      className="px-1.5 py-0.5 text-[9px] bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-rose-200 rounded disabled:opacity-40 transition cursor-pointer"
                                    >
                                      Prev
                                    </button>
                                    <span className="font-bold text-slate-700 font-mono">{ordersPage}/{totalOrdersPages}</span>
                                    <button
                                      type="button"
                                      disabled={ordersPage === totalOrdersPages}
                                      onClick={() => setOrdersPage(prev => Math.min(totalOrdersPages, prev + 1))}
                                      className="px-1.5 py-0.5 text-[9px] bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-rose-200 rounded disabled:opacity-40 transition cursor-pointer"
                                    >
                                      Next
                                    </button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Special reminders sub view layout column */
                      <div className="space-y-4">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#a855f7] block">1. My Registered Special Days</span>
                        <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                          {((state.specialDayReminders || []).filter(r => r.email === googleUser.email).length === 0) ? (
                            <div className="p-6 border border-rose-100 bg-white rounded-xl text-center text-slate-450 text-xs font-semibold italic">
                              No family special day reminders saved yet. Enter details on the right to auto-remind before 4 days!
                            </div>
                          ) : (
                            (state.specialDayReminders || [])
                              .filter(r => r.email === googleUser.email)
                              .map(rem => (
                                <div key={rem.id} className="p-3.5 bg-white border border-rose-100 rounded-xl relative flex justify-between items-center text-xs">
                                  <div className="text-left space-y-1">
                                    <div className="font-bold text-slate-800 block">{rem.name}</div>
                                    <div className="text-[10px] text-slate-500 font-semibold">
                                      Relation: <span className="px-1.5 py-0.5 bg-rose-50 text-rose-705 rounded font-bold uppercase text-[8.5px]">{rem.relation}</span>
                                    </div>
                                    <div className="text-[10px] text-rose-600 font-mono font-bold flex items-center gap-1">
                                      📅 Occurs: {rem.date}
                                    </div>
                                    {rem.notes && (
                                      <p className="text-[9.5px] text-slate-400 italic max-w-xs leading-normal font-semibold border-t border-slate-50 pt-1 mt-1">
                                        "{rem.notes}"
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteReminder(rem.id)}
                                    className="p-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border-0 rounded transition cursor-pointer text-[9.5px] font-extrabold uppercase"
                                    title="Delete reminder key"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
            </div>

        {/* Right Column (7/12) */}
        <div className="md:col-span-7 select-none">
          {(activeTab === 'signin' && googleUser && loungeSubTab === 'reminders') || activeTab === 'reminder' ? (
            /* Create Special Family Reminder Form card */
            <div className="bg-white border border-rose-100 rounded-2xl p-5 text-left space-y-4 shadow-xs">
              <div>
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#a855f7] block mb-1">📅 Register New Special Day</span>
                <p className="text-[10.5px] text-slate-450 leading-relaxed font-semibold">
                  Save your family special events. The system will dispatch an automated order solicitation email reminder exactly 4 days early!
                </p>
              </div>

              {remFeedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-250 rounded-xl text-emerald-800 text-xs font-semibold animate-bounce duration-300">
                  {remFeedback}
                </div>
              )}

              <form onSubmit={handleRegisterReminder} className="space-y-3.5 text-xs text-slate-705">
                {!googleUser && (
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-bold text-[#a855f7] uppercase tracking-widest block font-mono">Your Contact Email Address <span className="text-rose-500">*</span></label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. your-email@example.com"
                      className="w-full text-xs p-2.5 bg-rose-50/25 border border-rose-200 rounded-lg text-slate-805 font-bold focus:outline-none focus:border-[#a855f7]"
                      value={remGuestEmail}
                      onChange={(e) => setRemGuestEmail(e.target.value)}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Recipient Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Grandma, Dad"
                      className="w-full text-xs p-2.5 bg-rose-50/20 border border-rose-150 rounded-lg text-slate-800 font-bold focus:outline-none"
                      value={remName}
                      onChange={(e) => setRemName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Relationship label</label>
                    <select
                      className="w-full text-xs p-2.5 bg-rose-50/20 border border-rose-150 rounded-lg text-slate-850 font-bold focus:outline-none"
                      value={remRelation}
                      onChange={(e) => setRemRelation(e.target.value)}
                    >
                      <option value="Mother">Mother / Mom</option>
                      <option value="Father">Father / Dad</option>
                      <option value="Spouse">Spouse / Partner</option>
                      <option value="Sibling">Sibling (Brother/Sister)</option>
                      <option value="Child">Child (Son/Daughter)</option>
                      <option value="Grandparent">Grandparent</option>
                      <option value="Friend">Best Friend</option>
                      <option value="Other">Other Relative</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Special Day Event Date</label>
                    <input
                      type="date"
                      required
                      className="w-full text-xs p-2.5 bg-rose-50/20 border border-rose-150 rounded-lg text-slate-800 focus:outline-none font-mono font-semibold"
                      value={remDate}
                      onChange={(e) => setRemDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-bold text-[#a855f7] uppercase tracking-widest block font-mono">Your WhatsApp Number <span className="text-slate-400 text-[8px] font-normal">(Optional)</span></label>
                    <input
                      type="tel"
                      placeholder="e.g. +9779841234567"
                      className="w-full text-xs p-2.5 bg-rose-50/20 border border-rose-150 rounded-lg text-slate-800 focus:outline-none font-mono"
                      value={remPhone}
                      onChange={(e) => setRemPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Gifting Notes / Preset reminders</label>
                  <textarea
                    placeholder="e.g. Grandma prefers white lilies paired with dry sweets..."
                    rows={2}
                    className="w-full text-xs p-2.5 bg-rose-50/20 border border-rose-150 rounded-lg text-slate-805 focus:outline-none font-sans font-medium"
                    value={remNotes}
                    onChange={(e) => setRemNotes(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#a855f7] hover:bg-[#9333ea] text-white rounded-xl font-bold uppercase tracking-wider cursor-pointer border-0 shadow-xs transition"
                >
                  💾 Save Special Day Reminder
                </button>
              </form>
            </div>
          ) : activeTab === 'signin' && !googleUser ? (
            /* Lounge Welcome Perks Card */
            <div className="relative w-full gift-lounge-card border border-pink-100/80 rounded-2xl p-6 flex flex-col justify-between overflow-hidden text-left space-y-5 h-full min-h-[320px]">
              <GiftLoungeBackdrop variant="card" />
              <div className="space-y-4 relative z-10">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.22em] text-violet-600 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-violet-500" /> Lounge Perks
                  </span>
                  <h4 className="text-base font-bold text-slate-900 tracking-tight">Why sign into your Gifter Lounge?</h4>
                </div>
                
                <div className="space-y-4">
                  {[
                    {
                      title: 'Unified Order Histories Logs',
                      desc: 'Access all your custom order details, downloadable receipts, and live fulfillment statuses securely in one view.',
                    },
                    {
                      title: 'Family Celebrations & Reminders',
                      desc: 'Register birthdays or anniversaries. The portal auto-alerts you 4 days prior with custom curation choices!',
                    },
                    {
                      title: 'Express Instant Checkout',
                      desc: 'Auto-populate addresses, phone numbers, and payment preferences so you can send luxury gift hampers in seconds.',
                    },
                  ].map((perk) => (
                    <div key={perk.title} className="flex gap-3 items-start">
                      <div className="w-7 h-7 rounded-full bg-violet-100/90 flex items-center justify-center shrink-0 text-violet-600 ring-1 ring-violet-200/60">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 leading-snug">{perk.title}</p>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{perk.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="relative z-10 p-3.5 bg-pink-50/90 border border-pink-200/60 rounded-xl text-xs text-slate-500 leading-relaxed flex gap-2.5 backdrop-blur-[2px]">
                <Shield className="w-4 h-4 text-[#E91E63] shrink-0 mt-0.5" />
                <span>Your personal info and Google credentials are fully encrypted and will never be shared. Feel free to browse or gift.</span>
              </div>
            </div>
          ) : (
            /* Live Progress timeline Column */
            <div className="w-full bg-white border border-rose-100 rounded-2xl p-5 relative overflow-hidden min-h-[260px] flex flex-col justify-between shadow-box">
              <div>
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#a855f7] block mb-3">2. Live Tracker Terminal</span>
                
                {selectedOrder ? (
                  <div className="space-y-4">
                    <div className="pb-3 border-b border-rose-100 flex justify-between items-center text-left">
                      <div>
                        <h4 className="text-xs font-bold text-slate-805 font-mono">ORDER: {selectedOrder.refId}</h4>
                        <span className="text-[9px] font-mono text-slate-400 block">Placed: {new Date(selectedOrder.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {selectedOrder.paymentStatus !== 'paid' && selectedOrder.status !== OrderStatus.CANCELLED && (
                          <span className="text-[8px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-250 animate-pulse">
                            Unpaid
                          </span>
                        )}
                        <span className={`text-[9.5px] font-mono font-bold uppercase px-2 py-0.5 rounded ${getStatusColor(selectedOrder.status)}`}>
                          {getStatusLabel(selectedOrder.status)}
                        </span>
                      </div>
                    </div>

                    {/* Unpaid / Pending Payment Warning Bar */}
                    {selectedOrder.paymentStatus !== 'paid' && selectedOrder.status !== OrderStatus.CANCELLED && !completingPayment && (
                      <div className="bg-amber-500/[0.04] border border-amber-500/20 p-3 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs text-amber-900 font-semibold shadow-xs mb-1 text-left">
                        <div className="flex gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="block text-slate-800 font-bold">Payment is not yet completed</span>
                            <span className="block text-[10px] text-slate-500 font-medium mt-0.5 leading-normal">
                              To begin bouquet arrangements immediately, please complete your secure payment.
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCompletingPayment(true)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-mono font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all shadow-xs shrink-0 cursor-pointer border-0 select-none text-center"
                        >
                          Complete Payment
                        </button>
                      </div>
                    )}

                    {completingPayment ? (
                      (() => {
                        const payRate = payCurrency === 'NPR' ? 1.0 : (state.currencies?.find(c => c.code === payCurrency)?.rateToNPR || 1.0);
                        const baseNPR = selectedOrder.totalAmountBase || selectedOrder.totalAmount || 0;
                        const convertedAmount = baseNPR * payRate;
                        const currentSymbol = state.currencies?.find(c => c.code === payCurrency)?.symbol || 'Rs.';
                        
                        const enabledGateways = state.paymentGateways?.filter(gw => gw.isEnabled) || [];
                        const rawGateways = (enabledGateways.length > 0 ? enabledGateways : [
                          {
                            id: 'esewa',
                            name: 'eSewa Wallet Payment',
                            logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR0AonXQx0n88M9sTCH6D_vO3ePZ0O7bQY63g&s',
                            isEnabled: true,
                            extraSettings: { bankName: '', accountName: '', accountNumber: '' }
                          },
                          {
                            id: 'khalti',
                            name: 'Khalti Mobile Wallet',
                            logoUrl: 'https://blog.khalti.com/wp-content/uploads/2021/01/khalti-logo.png',
                            isEnabled: true,
                            extraSettings: { bankName: '', accountName: '', accountNumber: '' }
                          },
                          {
                            id: 'fonepay_static',
                            name: 'Fonepay Static QR code / Image',
                            logoUrl: 'https://brandessentials.org/wp-content/uploads/2023/12/fonepay-logo.png',
                            isEnabled: true,
                            extraSettings: { bankName: '', accountName: '', accountNumber: '' }
                          },
                          {
                            id: 'nps',
                            name: 'Visa Card & Master Card',
                            logoUrl: 'https://cdn-icons-png.flaticon.com/512/349/349221.png',
                            isEnabled: true,
                            extraSettings: { bankName: '', accountName: '', accountNumber: '' }
                          },
                          {
                            id: 'manual',
                            name: 'Manual Bank Transfer / QR Pay',
                            logoUrl: 'https://cdn-icons-png.flaticon.com/512/10015/10015424.png',
                            isEnabled: true,
                            extraSettings: { bankName: '', accountName: '', accountNumber: '' }
                          }
                        ]) as any[];

                        const displayGateways = rawGateways
                          .filter(gw => {
                            if (gw.acceptableCurrencies && gw.acceptableCurrencies.length > 0) {
                              const upperCurrencies = gw.acceptableCurrencies.map((c: string) => c.toUpperCase());
                              return upperCurrencies.includes(payCurrency.toUpperCase());
                            }
                            if (gw.id === 'esewa' || gw.id === 'khalti' || gw.id.startsWith('fonepay') || gw.id === 'cod') {
                              return payCurrency.toUpperCase() === 'NPR';
                            }
                            if (gw.id === 'nps' || gw.id === 'nabil') {
                              return payCurrency.toUpperCase() !== 'NPR';
                            }
                            return true;
                          })
                          .sort((a, b) => (a.priority || 1) - (b.priority || 1));
                        
                        const activeGatewayDetails = displayGateways.find(g => g.id === paymentGateway);

                        return (
                          <div className="bg-slate-50 border border-slate-200/85 rounded-2xl p-4 space-y-4 text-left">
                            <div className="flex items-center gap-2 mb-1">
                              <button
                                type="button"
                                onClick={() => {
                                  if (paymentGateway) {
                                    setPaymentGateway(null);
                                    setPayError('');
                                  } else {
                                    setCompletingPayment(false);
                                  }
                                }}
                                className="p-1 rounded-md hover:bg-slate-200 text-slate-505 border-0 cursor-pointer flex items-center justify-center bg-transparent"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <span className="text-xs font-bold text-slate-800">
                                {paymentGateway ? `Authorize via ${activeGatewayDetails?.name}` : 'Secure Flower Order Checkout'}
                              </span>
                            </div>

                            {/* Currency Selection Block */}
                            {!paymentGateway && (
                              <div className="space-y-2 bg-white border border-slate-150 p-3 rounded-xl">
                                <label className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                                  Preferred Currency
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                  {state.currencies?.map(c => {
                                    const isActive = payCurrency === c.code;
                                    return (
                                      <button
                                        key={c.code}
                                        type="button"
                                        onClick={() => {
                                          setPayCurrency(c.code);
                                          setPayError('');
                                        }}
                                        className={`p-1.5 rounded-lg text-xs font-bold font-mono transition-all border text-center cursor-pointer select-none ${
                                          isActive
                                            ? 'bg-rose-500 border-rose-600 text-white shadow-xs'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                      >
                                        {c.code} ({c.symbol})
                                      </button>
                                    );
                                  })}
                                </div>
                                {payCurrency !== 'NPR' && (
                                  <p className="text-[8.5px] text-slate-405 italic font-mono mt-1 leading-none text-right">
                                    Forex conversion sync: 1 NPR = {payRate.toFixed(6)} {payCurrency}
                                  </p>
                                )}
                              </div>
                            )}

                            {!paymentGateway ? (
                              <div className="space-y-3.5">
                                <div className="p-3 bg-rose-500/[0.02] border border-rose-500/10 rounded-xl flex justify-between items-center">
                                  <span className="text-xs font-bold text-slate-600">Converted Due:</span>
                                  <span className="text-sm font-extrabold font-mono text-rose-600">
                                    {currentSymbol} {convertedAmount.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  <p className="text-[10px] text-slate-500 leading-normal font-medium">
                                    Select your preferred payment gateway:
                                  </p>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {displayGateways.map((gw) => {
                                      const isSelected = paymentGateway === gw.id;
                                      return (
                                        <button
                                          key={gw.id}
                                          type="button"
                                          onClick={() => {
                                            setPaymentGateway(gw.id);
                                            setPayError('');
                                            if (gw.id === 'esewa' || gw.id === 'khalti') {
                                              setPayPhone('9801354451');
                                              setPayPin('4451');
                                            } else if (gw.id === 'nps' || gw.id === 'nabil' || gw.id.includes('card')) {
                                              setCardNum('4392 0182 3012 9012');
                                              setCardExp('12/28');
                                              setCardCvv('123');
                                              setCardName(googleUser?.name || 'PREMIUM GIFTER');
                                            }
                                          }}
                                          className={`p-3 border rounded-xl flex items-center justify-between text-left transition duration-205 cursor-pointer select-none group relative ${
                                            isSelected
                                              ? 'border-rose-450 bg-rose-50/25 shadow-xs'
                                              : 'border-slate-200 bg-white hover:bg-slate-50'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2.5">
                                            {gw.logoUrl ? (
                                              <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 p-1 flex items-center justify-center overflow-hidden shrink-0">
                                                <img
                                                  src={gw.logoUrl}
                                                  alt={gw.name}
                                                  referrerPolicy="no-referrer"
                                                  className="w-full h-full object-contain"
                                                />
                                              </div>
                                            ) : (
                                              <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                                                <CreditCard className="w-4 h-4 text-rose-600" />
                                              </div>
                                            )}
                                            <div className="leading-tight">
                                              <span className="block text-[11px] font-extrabold text-slate-805">
                                                {gw.name}
                                              </span>
                                              <span className="block text-[8px] text-slate-400 font-bold font-mono">
                                                {getGatewaySubtext(gw.id)}
                                              </span>
                                            </div>
                                          </div>
                                          
                                          {isSelected ? (
                                            <div className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
                                              <Check className="w-2.5 h-2.5 stroke-[4]" />
                                            </div>
                                          ) : (
                                            <div className="w-4 h-4 rounded-full border border-slate-200 group-hover:border-slate-300 shrink-0" />
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            ) : paymentGateway.includes('fonepay') || paymentGateway.includes('qr') ? (
                              <div className="space-y-3.5 text-center py-2">
                                <p className="text-[10px] text-slate-500 leading-normal max-w-xs mx-auto">
                                  Scan the secure FonePay QR code to transfer exactly <strong className="text-slate-700 font-mono">{currentSymbol} {convertedAmount.toLocaleString(undefined, { maximumFractionDigits: 1 })}</strong>.
                                </p>
                                
                                <div className="p-3 bg-white border border-rose-100 rounded-2xl max-w-[180px] mx-auto shadow-xs flex flex-col items-center">
                                  <div className="w-28 h-28 bg-white flex items-center justify-center relative overflow-hidden">
                                    <img 
                                      src="https://static-00.iconduck.com/assets.00/qr-code-icon-2048x2048-b3g63m5g.png"
                                      alt="Payment QR"
                                      className="w-full h-full object-contain relative z-10"
                                    />
                                  </div>
                                  <span className="text-[7.5px] font-mono font-bold text-slate-400 mt-2 block uppercase tracking-wider">
                                    Instant mobile banking gateway
                                  </span>
                                </div>

                                <div className="text-[9.5px] font-semibold text-slate-500 bg-white border border-slate-150 p-2.5 rounded-xl leading-relaxed max-w-xs mx-auto text-left">
                                  🔒 Beneficiary: <strong>Koseli Gifts Private Ltd.</strong><br/>
                                  Ref ID: <strong className="font-mono text-slate-705">{selectedOrder.refId}</strong><br/>
                                  Amount: <strong className="text-emerald-600 font-mono">{currentSymbol} {convertedAmount.toLocaleString(undefined, { maximumFractionDigits: 1 })}</strong>
                                </div>

                                {payError && <p className="text-[9.5px] text-rose-600 font-bold">{payError}</p>}

                                <div className="flex gap-2 justify-center max-w-xs mx-auto">
                                  <button
                                    type="button"
                                    onClick={() => setPaymentGateway(null)}
                                    className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] uppercase transition cursor-pointer border-0 select-none"
                                  >
                                    Back
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleSimulatePaymentCompletion(e)}
                                    disabled={isProcessingPay}
                                    className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase tracking-wider transition cursor-pointer border-0 select-none flex items-center justify-center gap-1"
                                  >
                                    {isProcessingPay ? (
                                      <>
                                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Verifying...</span>
                                      </>
                                    ) : (
                                      <span>Verify Transfer</span>
                                    )}
                                  </button>
                                </div>
                              </div>
                            ) : paymentGateway === 'nps' || paymentGateway === 'nabil' || paymentGateway.includes('card') ? (
                              <form onSubmit={handleSimulatePaymentCompletion} className="space-y-3.5 max-w-sm mx-auto text-left">
                                {/* Credit Card Layout */}
                                <div className="relative h-36 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 p-4 text-white font-mono flex flex-col justify-between overflow-hidden shadow-md select-none border border-slate-800">
                                  <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl" />
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="block text-[8px] text-slate-400 uppercase tracking-widest font-sans font-bold">Secure Card Service</span>
                                      <span className="block text-[11px] font-bold uppercase tracking-wider text-rose-200">
                                        {activeGatewayDetails?.name || 'Visa Gateway'}
                                      </span>
                                    </div>
                                    <CreditCard className="w-6 h-6 text-slate-350" />
                                  </div>
                                  
                                  <div>
                                    <span className="block text-xs tracking-[0.14em] font-mono text-slate-100">
                                      {cardNum || '•••• •••• •••• ••••'}
                                    </span>
                                  </div>

                                  <div className="flex justify-between items-end leading-none">
                                    <div className="truncate max-w-[150px]">
                                      <span className="block text-[7px] text-slate-500 uppercase font-sans mb-0.5">Cardholder</span>
                                      <span className="block text-[9.5px] uppercase font-bold truncate">
                                        {cardName.toUpperCase() || 'PREMIUM GIFTER'}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <span className="block text-[7px] text-slate-500 uppercase font-sans mb-0.5">Expires</span>
                                      <span className="block text-[9.5px] uppercase font-bold">
                                        {cardExp || 'MM/YY'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <div className="space-y-0.5">
                                    <label className="text-[8px] font-mono font-bold uppercase tracking-wider text-slate-400 block">Credit / Debit Card Number</label>
                                    <input
                                      type="text"
                                      required
                                      value={cardNum}
                                      onChange={(e) => {
                                        let v = e.target.value.replace(/\D/g, '').substring(0, 16);
                                        let parts = [];
                                        for (let i=0; i<v.length; i+=4) {
                                          parts.push(v.substring(i, i+4));
                                        }
                                        setCardNum(parts.join(' '));
                                      }}
                                      placeholder="4392 0182 3012 9012"
                                      className="w-full text-xs p-2 border border-slate-200 rounded-lg text-slate-805 font-mono focus:outline-none focus:border-rose-450"
                                    />
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-0.5">
                                      <label className="text-[8px] font-mono font-bold uppercase tracking-wider text-slate-400 block">Expiry Date</label>
                                      <input
                                        type="text"
                                        required
                                        value={cardExp}
                                        onChange={(e) => {
                                          let v = e.target.value.replace(/\D/g, '').substring(0, 4);
                                          if (v.length > 2) {
                                            setCardExp(v.substring(0, 2) + '/' + v.substring(2));
                                          } else {
                                            setCardExp(v);
                                          }
                                        }}
                                        placeholder="MM/YY"
                                        maxLength={5}
                                        className="w-full text-xs p-2 border border-slate-200 rounded-lg text-slate-805 font-mono focus:outline-none focus:border-rose-450 text-center"
                                      />
                                    </div>

                                    <div className="space-y-0.5">
                                      <label className="text-[8px] font-mono font-bold uppercase tracking-wider text-slate-400 block">CVV / Pin</label>
                                      <input
                                        type="password"
                                        required
                                        value={cardCvv}
                                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
                                        placeholder="•••"
                                        maxLength={4}
                                        className="w-full text-xs p-2 border border-slate-200 rounded-lg text-slate-805 font-mono focus:outline-none focus:border-rose-450 text-center"
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-0.5">
                                    <label className="text-[8px] font-mono font-bold uppercase tracking-wider text-slate-400 block">Cardholder Name</label>
                                    <input
                                      type="text"
                                      required
                                      value={cardName}
                                      onChange={(e) => setCardName(e.target.value)}
                                      placeholder="PREMIUM GIFTER"
                                      className="w-full text-xs p-2 border border-slate-200 rounded-lg text-slate-805 font-mono uppercase focus:outline-none focus:border-rose-450"
                                    />
                                  </div>
                                </div>

                                {payError && <p className="text-[9.5px] text-rose-600 font-bold">{payError}</p>}

                                <div className="flex gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setPaymentGateway(null)}
                                    className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] uppercase cursor-pointer border-0 select-none text-center"
                                  >
                                    Back
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={isProcessingPay}
                                    className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] uppercase cursor-pointer border-0 select-none flex items-center justify-center gap-1"
                                  >
                                    {isProcessingPay ? (
                                      <>
                                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Capturing...</span>
                                      </>
                                    ) : (
                                      <span>Pay {currentSymbol} {convertedAmount.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                                    )}
                                  </button>
                                </div>
                              </form>
                            ) : paymentGateway === 'manual' ? (
                              <form onSubmit={handleSimulatePaymentCompletion} className="space-y-3.5 max-w-sm mx-auto text-left">
                                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 text-xs">
                                  <span className="text-[8px] uppercase font-mono tracking-widest text-slate-400 block font-bold leading-none">
                                    Recipient Bank Information
                                  </span>
                                  
                                  <div className="grid grid-cols-2 gap-2 text-[10px] leading-tight font-sans">
                                    <div>
                                      <span className="text-slate-450 block text-[8px] uppercase font-bold">Bank Name</span>
                                      <strong className="text-slate-700 font-bold">{activeGatewayDetails?.extraSettings?.bankName || 'NIC Asia Bank'}</strong>
                                    </div>
                                    <div>
                                      <span className="text-slate-450 block text-[8px] uppercase font-bold">Holder Name</span>
                                      <strong className="text-slate-700 font-bold truncate block">{activeGatewayDetails?.extraSettings?.accountName || 'Koseli Gifts Private Ltd.'}</strong>
                                    </div>
                                    <div className="col-span-2">
                                      <span className="text-slate-450 block text-[8px] uppercase font-bold col-span-2">Account Number</span>
                                      <strong className="text-slate-850 font-mono font-extrabold tracking-widest text-xs">
                                        {activeGatewayDetails?.extraSettings?.accountNumber || '2440192830129302'}
                                      </strong>
                                    </div>
                                  </div>
                                </div>

                                <p className="text-[9.5px] text-slate-500 leading-normal font-sans">
                                  Transfer exactly <strong className="text-slate-705 font-mono">{currentSymbol} {convertedAmount.toLocaleString(undefined, { maximumFractionDigits: 1 })}</strong> via your bank dashboard, then enter the reference code:
                                </p>

                                <div className="space-y-0.5">
                                  <label className="text-[8px] font-mono font-bold uppercase tracking-wider text-slate-400 block">Bank Ledger TRX Reference Code</label>
                                  <input
                                    type="text"
                                    required
                                    value={manualRef}
                                    onChange={(e) => setManualRef(e.target.value)}
                                    placeholder="E.g. FT-1902830113"
                                    className="w-full text-xs p-2 border border-slate-200 rounded-lg text-slate-805 font-mono focus:outline-none focus:border-rose-455"
                                  />
                                </div>

                                {payError && <p className="text-[9.5px] text-rose-600 font-bold">{payError}</p>}

                                <div className="flex gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setPaymentGateway(null)}
                                    className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] uppercase cursor-pointer border-0 select-none text-center"
                                  >
                                    Back
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={isProcessingPay}
                                    className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase cursor-pointer border-0 select-none flex items-center justify-center gap-1"
                                  >
                                    {isProcessingPay ? (
                                      <>
                                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Uploading...</span>
                                      </>
                                    ) : (
                                      <span>Verify Transfer</span>
                                    )}
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <form onSubmit={handleSimulatePaymentCompletion} className="space-y-3.5 max-w-sm mx-auto text-left py-1">
                                <div className="p-3 bg-white border border-slate-150 rounded-xl flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-mono font-bold text-slate-605 uppercase">
                                      {activeGatewayDetails?.name || 'Wallet Pay Node'}
                                    </span>
                                  </div>
                                  <span className="text-xs font-bold font-mono text-slate-800">
                                    {currentSymbol} {convertedAmount.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                  </span>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 block">Mobile Wallet No.</label>
                                  <input
                                    type="tel"
                                    required
                                    value={payPhone}
                                    onChange={(e) => setPayPhone(e.target.value)}
                                    placeholder="98XXXXXXXX"
                                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg text-slate-805 font-mono focus:outline-none focus:border-rose-450"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 block">Wallet Pin / OTP code</label>
                                  <input
                                    type="password"
                                    required
                                    value={payPin}
                                    onChange={(e) => setPayPin(e.target.value)}
                                    placeholder="••••"
                                    maxLength={6}
                                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg text-slate-805 font-mono focus:outline-none focus:border-rose-450"
                                  />
                                </div>

                                {payError && <p className="text-[9.5px] text-rose-600 font-bold">{payError}</p>}

                                <div className="flex gap-2 pt-1.5 font-sans">
                                  <button
                                    type="button"
                                    onClick={() => setPaymentGateway(null)}
                                    className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] uppercase cursor-pointer border-0 select-none text-center"
                                  >
                                    Back
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={isProcessingPay}
                                    className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] uppercase cursor-pointer border-0 select-none flex items-center justify-center gap-1"
                                  >
                                    {isProcessingPay ? (
                                      <>
                                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Settling...</span>
                                      </>
                                    ) : (
                                      <span>Pay {currentSymbol} {convertedAmount.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                                    )}
                                  </button>
                                </div>
                              </form>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      /* Timeline visualization - Standard Transaction Tracking */
                      <div className="relative pl-5 space-y-4 text-xs text-left">
                        {/* Vertical line connector */}
                        <div className="absolute left-[7px] top-[14px] bottom-[14px] w-[1px] bg-rose-200" />

                        {/* Step 1: Payment Pending */}
                        <div className="relative flex items-start gap-2.5">
                          <div className={`absolute -left-[24.5px] w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center shadow-xs ${
                            selectedOrder.paymentStatus === 'paid' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                          }`}>
                            {selectedOrder.paymentStatus === 'paid' ? (
                              <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                            ) : (
                              <AlertTriangle className="w-2.5 h-2.5 text-white" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-850 text-[11px] leading-none">
                              {selectedOrder.paymentStatus === 'paid' ? 'Payment Verified & Approved' : 'Payment Verification Pending'}
                            </p>
                            <span className="text-[9px] text-slate-500 font-mono">
                              {selectedOrder.paymentStatus === 'paid' ? 'Transaction settled successfully via gateway' : 'Order registered, awaiting verification'}
                            </span>
                          </div>
                        </div>

                        {/* Step 2: Order Received */}
                        <div className="relative flex items-start gap-2.5">
                          <div className={`absolute -left-[24.5px] w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center shadow-xs ${
                            selectedOrder.paymentStatus === 'paid' && selectedOrder.status !== OrderStatus.PENDING && selectedOrder.status !== OrderStatus.CANCELLED ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}>
                            <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                          </div>
                          <div className={!(selectedOrder.paymentStatus === 'paid' && selectedOrder.status !== OrderStatus.PENDING && selectedOrder.status !== OrderStatus.CANCELLED) ? 'opacity-50' : ''}>
                            <p className="font-bold text-slate-805 text-[11px] leading-none">Order Approved by Admin</p>
                            <span className="text-[9px] text-slate-450 font-mono">Verified and moved to preparation</span>
                          </div>
                        </div>

                        {/* Step 3: Preparing */}
                        <div className="relative flex items-start gap-2.5">
                          <div className={`absolute -left-[24.5px] w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center shadow-xs ${
                            selectedOrder.paymentStatus === 'paid' && ['preparing', 'shipped', 'delivered'].includes(selectedOrder.status) ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}>
                            <Package className="w-2.5 h-2.5 text-white" />
                          </div>
                          <div className={!(selectedOrder.paymentStatus === 'paid' && ['preparing', 'shipped', 'delivered'].includes(selectedOrder.status)) ? 'opacity-50' : ''}>
                            <p className="font-bold text-slate-805 text-[11px] leading-none">Preparing Bouquet / Cake</p>
                            <span className="text-[9px] text-slate-450 font-mono">Arranging premium components</span>
                          </div>
                        </div>

                        {/* Step 4: Dispatch */}
                        <div className="relative flex items-start gap-2.5">
                          <div className={`absolute -left-[24.5px] w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center shadow-xs ${
                            selectedOrder.paymentStatus === 'paid' && ['shipped', 'delivered'].includes(selectedOrder.status) ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}>
                            <Truck className="w-2.5 h-2.5 text-white" />
                          </div>
                          <div className={!(selectedOrder.paymentStatus === 'paid' && ['shipped', 'delivered'].includes(selectedOrder.status)) ? 'opacity-50' : ''}>
                            <p className="font-bold text-slate-805 text-[11px] leading-none">Dispatch Out with Rider</p>
                            <span className="text-[9px] text-slate-450 font-mono">In transit via professional courier</span>
                          </div>
                        </div>

                        {/* Step 5: Delivered */}
                        <div className="relative flex items-start gap-2.5">
                          <div className={`absolute -left-[24.5px] w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center shadow-xs ${
                            selectedOrder.paymentStatus === 'paid' && selectedOrder.status === OrderStatus.DELIVERED ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}>
                            <Smile className="w-2.5 h-2.5 text-white" />
                          </div>
                          <div className={!(selectedOrder.paymentStatus === 'paid' && selectedOrder.status === OrderStatus.DELIVERED) ? 'opacity-50' : ''}>
                            <p className="font-bold text-slate-805 text-[11px] leading-none">Delivered & Completed</p>
                            <span className="text-[9px] text-slate-450 font-mono">Brought joy directly to recipient's hands</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Personalizations listed */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-[11px] text-left">
                      <div className="flex items-center justify-between border-b border-slate-200/50 pb-1 mb-1">
                        <span className="text-[8.5px] font-mono tracking-widest uppercase font-bold text-slate-500 block">
                          Gift Log Summary
                        </span>
                      </div>
                      
                      <div>
                        Sender: <span className="text-slate-800 font-medium">{maskText(selectedOrder.senderName || selectedOrder.customerName)}</span>
                      </div>
                      
                      <div>
                        Recipient: <span className="text-slate-800 font-medium">
                          {maskText(selectedOrder.receiverName)}
                        </span>
                      </div>

                      {googleUser && (
                        <>
                          {selectedOrder.receiverPhone && (
                            <div>Recipient Contact: <span className="text-slate-850 font-mono font-bold">{maskPhone(selectedOrder.receiverPhone)}</span></div>
                          )}
                          {selectedOrder.deliveryAddress && (
                            <div className="text-[10px] text-slate-500 leading-relaxed">
                              Delivery Address: <span className="text-slate-700 font-medium">{selectedOrder.deliveryAddress}</span>
                            </div>
                          )}
                        </>
                      )}

                      {selectedOrder.preferredDeliveryDate && (
                        <div>
                          Delivery Date: <span className="text-rose-600 font-mono font-bold text-[10.5px]">{selectedOrder.preferredDeliveryDate}</span>
                        </div>
                      )}

                      <div>
                        Destination Region: <span className="text-slate-700 font-bold">{selectedOrder.deliveryDistrict || 'Kathmandu'}</span>
                      </div>

                      {googleUser && selectedOrder.orderNote ? (
                        <div className="p-2 bg-rose-50/40 border border-rose-100 rounded-lg text-[10.5px] leading-relaxed italic text-slate-650 mt-1.5">
                          <span className="font-bold uppercase text-[8.5px] text-rose-500 block not-italic">Written Card Message:</span>
                          "{selectedOrder.orderNote}"
                        </div>
                      ) : selectedOrder.orderNote ? (
                        <div className="text-[10px] text-slate-400 italic pt-1 flex items-center gap-1 leading-none mt-1 select-none">
                          <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>Personal written message requires Google sign-in to unlock.</span>
                        </div>
                      ) : null}
                    </div>

                    {/* Purchased items list */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-[11px] text-left">
                      <span className="text-[8.5px] font-mono tracking-widest uppercase font-bold text-slate-500 block mb-1">
                        Purchased Hampers / Items
                      </span>
                      <div className="space-y-1.5 font-sans">
                        {selectedOrder.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="border-b border-dashed border-slate-200 last:border-b-0 pb-1.5 last:pb-0">
                            <div className="text-slate-850 font-bold text-left flex justify-between items-center">
                              <span>• {item.productName}</span>
                              <span className="font-mono text-slate-400 font-bold text-[10px]">x {item.quantity}</span>
                            </div>
                            
                            {/* Only reveal variations & customizations for a verified logged in user session */}
                            {googleUser ? (
                              <>
                                {item.selectedVariations && item.selectedVariations.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1 ml-2.5 justify-start text-left max-w-full">
                                    {item.selectedVariations.map((vOpt, vOptIdx) => (
                                      <span 
                                        key={vOptIdx} 
                                        className="inline-block text-[8px] font-mono px-1 py-0.5 rounded bg-white text-slate-600 border border-slate-200 leading-none"
                                      >
                                        {vOpt.name}: <span className="font-bold text-slate-800">{vOpt.value}</span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {item.customMessage && (
                                  <div className="text-[10px] text-slate-500 ml-2.5 italic mt-1 bg-white p-1.5 border border-slate-100 rounded leading-normal">
                                    Custom message: "{item.customMessage}"
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="text-[9.5px] text-slate-400 ml-2.5 italic pt-0.5 select-none">
                                🔒 Written card greetings & variations content masked for security.
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* PRODUCT ITEM REVIEWS FOR DELIVERED ORDERS */}
                    {googleUser && selectedOrder.status === OrderStatus.DELIVERED && (
                      <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl space-y-3.5 text-left mt-3">
                        <div className="flex items-center gap-2">
                          <span className="p-1 px-2 rounded-md bg-amber-500 text-white font-mono uppercase text-[9px] font-black">Feedbacks</span>
                          <span className="text-xs font-bold text-slate-800">Share your joy! Post product details feedback</span>
                        </div>
                        <p className="text-[10px] text-slate-550 leading-normal font-semibold">
                          Since this gift hamper was successfully delivered, we would love to hear your feedback below. Reviews are instantly published to product pages.
                        </p>

                        <div className="space-y-3">
                          {selectedOrder.items.map((it, idx) => {
                            const pId = it.productId;
                            const rating = productRatings[pId] || 5;
                            const comment = productComments[pId] || '';
                            const statusMsg = reviewFeedback[pId];

                            return (
                              <div key={idx} className="bg-white border border-slate-150 rounded-lg p-3 space-y-2.5 shadow-2xs text-left">
                                <div className="flex justify-between items-center gap-2">
                                  <span className="font-bold text-xs text-slate-800 truncate">• {it.productName}</span>
                                  {/* Star selectors */}
                                  <div className="flex gap-1 items-center shrink-0">
                                    {[1, 2, 3, 4, 5].map(starNum => {
                                      const isSel = starNum <= rating;
                                      return (
                                        <button
                                          key={starNum}
                                          type="button"
                                          onClick={() => setProductRatings(prev => ({ ...prev, [pId]: starNum }))}
                                          className="p-0 border-0 bg-transparent text-amber-400 text-sm hover:scale-110 transition cursor-pointer"
                                        >
                                          {isSel ? '★' : '☆'}
                                        </button>
                                      );
                                    })}
                                    <span className="font-mono text-[10px] pl-1 font-bold text-slate-500">({rating}/5)</span>
                                  </div>
                                </div>

                                <div className="space-y-1.5Packed">
                                  <textarea
                                    rows={2}
                                    placeholder="Write your review here... e.g. Tasted incredibly fresh, beautiful rose packaging!"
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-rose-300 font-medium"
                                    value={comment}
                                    onChange={(e) => setProductComments(prev => ({ ...prev, [pId]: e.target.value }))}
                                  />
                                  <div className="flex justify-between items-center gap-2 mt-1">
                                    <span className="text-[9px] font-bold text-rose-600 font-mono">
                                      {statusMsg || ''}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handlePostReview(pId)}
                                      className="px-2.5 py-1 text-[10px] font-bold font-sans bg-rose-600 hover:bg-rose-700 text-white rounded border-0 transition uppercase cursor-pointer"
                                    >
                                      Submit Review
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center opacity-60">
                    <Clock className="w-10 h-10 text-rose-300 mb-2.5" />
                    <p className="text-xs text-rose-700 max-w-xs leading-relaxed font-semibold">
                      Select any order from your history list or perform a query to inspect live tracking nodes.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-rose-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left">
                <div className="text-[9.5px] font-sans text-slate-450 flex items-center gap-1.5 leading-none">
                  <Lock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>Encrypted secure consumer connection proxy active.</span>
                </div>
                
                {/* WHATSAPP SUPPORT ACTION */}
                <a
                  href={`https://wa.me/${state.plugins?.whatsappNumber?.replace(/[^0-9+]/g, '') || '9779801354451'}?text=${encodeURIComponent('Hi Koseli Xpress, I am looking for quick assistance tracking my order. Thank you!')}`}
                  target="_blank"
                  rel="noopener noreferrer animate-pulse"
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-bold bg-emerald-50 hover:bg-emerald-100/75 px-3 py-1.5 rounded-lg transition-colors border-0 cursor-pointer text-center select-none"
                >
                  <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.1 1.45 4.8 1.45 5.518 0 10.009-4.491 10.013-10.01.002-2.673-1.04-5.184-2.93-7.078-1.892-1.893-4.407-2.935-7.081-2.937-5.524 0-10.014 4.491-10.018 10.013-.001 1.708.452 3.378 1.311 4.831L.833 22.857l4.47-1.173-1.656-.93zm11.302-6.537c-.302-.152-1.791-.883-2.07-.984-.277-.101-.48-.152-.681.152-.2.302-.777.984-.952 1.185-.175.201-.352.226-.654.075-.302-.151-1.272-.469-2.423-1.496-.895-.798-1.5-.178-1.745-.027-.246.151-.492-.126-.644-.277-.152-.151-.681-.883-.933-1.484-.246-.584-.025-.901.126-1.051.136-.136.302-.352.453-.528.151-.176.201-.302.302-.503.101-.201.05-.377-.025-.528-.075-.151-.681-1.641-.933-2.249-.247-.591-.495-.51-.681-.519-.176-.008-.377-.01-.579-.01-.201 0-.528.075-.805.377-.277.302-1.057 1.033-1.057 2.518 0 1.485 1.081 2.92 1.232 3.122.152.201 2.129 3.251 5.158 4.561.72.311 1.282.498 1.72.637.724.23 1.382.197 1.902.12.58-.087 1.791-.733 2.043-1.439.252-.705.252-1.309.176-1.439-.076-.13-.277-.201-.579-.352z" />
                  </svg>
                  <span>Quick WhatsApp Assistance</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
    </div>
  );
}
