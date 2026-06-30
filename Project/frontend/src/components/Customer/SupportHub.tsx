import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MessageCircle, Send, X, ExternalLink, RefreshCw, Heart, MessageSquare, PhoneCall, HelpCircle, Minus } from 'lucide-react';
import { DatabaseState, Lead, LeadStatus } from '../../types';

interface SupportHubProps {
  state: DatabaseState;
  onUpdateState?: (newState: DatabaseState) => void;
  onAddToCart?: (product: any, e?: React.MouseEvent, customMessage?: string, customImageUrl?: string, selectedVariations?: any[]) => void;
  onOpenCart?: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

const PRESET_CHIPS = [
  'How fast is Kathmandu delivery?',
  'Do you accept foreign cards?',
  'Can I order a custom hamper?',
  'Same-day cake guidelines?'
];

export default function SupportHub({ state, onUpdateState, onAddToCart, onOpenCart }: SupportHubProps) {
  // activePanel: 'ai' | null
  const [activePanel, setActivePanel] = useState<'ai' | null>(null);

  const isTimeWithinWindow = (startTime?: string, endTime?: string) => {
    if (!startTime || !endTime) return true;
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    if ([startHour, startMinute, endHour, endMinute].some(Number.isNaN)) return true;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    if (startMinutes === endMinutes) return true;
    if (startMinutes < endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  };

  const aiChatEnabled = state.plugins?.aiChatEnabled !== false;
  const aiChatScheduled = !!state.plugins?.aiChatScheduleEnabled;
  const isAiChatAvailable = aiChatEnabled && (
    !aiChatScheduled ||
    isTimeWithinWindow(state.plugins?.aiChatStartTime || '09:00', state.plugins?.aiChatEndTime || '18:00')
  );

  // Chat Session ID linked to sessionStorage so it persists across refreshes
  const [chatSessionId] = useState(() => {
    let id = sessionStorage.getItem('koseli_chat_session_id');
    if (!id) {
      id = 'chat-' + Math.floor(100000 + Math.random() * 900000);
      sessionStorage.setItem('koseli_chat_session_id', id);
    }
    return id;
  });

  // AI Chat Messages and status
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const existing = state.supportChats?.find(c => c.id === chatSessionId);
    if (existing && existing.messages && existing.messages.length > 0) {
      return existing.messages.map(m => ({
        role: m.role,
        content: m.content,
        time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
    }

    return [
      {
        role: 'assistant',
        content: `Hello Namaste !! 🙏 Welcome to Koseli Xpress.\n\nI am CSR- AI.\n\nHow can I help you today?`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });
  const [inputMsg, setInputMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reusable utility to save state logs
  const saveChatHistoryToDb = (updatedMsgs: ChatMessage[]) => {
    if (!onUpdateState) return;
    
    const existingChats = state.supportChats || [];
    const chatIndex = existingChats.findIndex(c => c.id === chatSessionId);
    
    const lastMsgText = updatedMsgs[updatedMsgs.length - 1]?.content || '';
    
    const mappedMessages = updatedMsgs.map(m => ({
      role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
      timestamp: new Date().toISOString()
    }));

    const chatData = {
      id: chatSessionId,
      customerName: 'Visitor #' + chatSessionId.replace('chat-', ''),
      customerPhone: '',
      customerEmail: '',
      lastMessageText: lastMsgText,
      messages: mappedMessages,
      createdAt: chatIndex >= 0 ? existingChats[chatIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: chatIndex >= 0 ? existingChats[chatIndex].status : 'pending' as const
    };

    let nextChats = [...existingChats];
    if (chatIndex >= 0) {
      nextChats[chatIndex] = chatData;
    } else {
      nextChats = [chatData, ...nextChats];
    }

    onUpdateState({
      ...state,
      supportChats: nextChats
    });
  };

  const whatsappNum = state.plugins?.whatsappNumber || '+9779851012345';
  const cleanWhatsappNum = whatsappNum.replace(/[^0-9+]/g, '');

  // Directly trigger direct WhatsApp chat starting with Hello Namaste !!
  const triggerDirectWhatsappChat = () => {
    const greetingText = 'Hello Namaste !!';
    const customWhatsappUrl = `https://wa.me/${cleanWhatsappNum}?text=${encodeURIComponent(greetingText)}`;

    // Silently log an anonymous follow-up lead in the database so the admin gets notified they have a WhatsApp hot lead!
    const newLead: Lead = {
      id: `lead-wa-direct-${Date.now()}`,
      customerName: 'WhatsApp Direct Lead',
      customerEmail: 'whatsapp-direct@customer.contact',
      customerPhone: whatsappNum,
      cartItems: [],
      currency: 'NPR',
      totalAmount: 0,
      status: LeadStatus.FAILED,
      createdAt: new Date().toISOString(),
      orderNote: 'Customer clicked direct WhatsApp link. Chat started with prefilled greeting: "Hello Namaste !!"'
    };

    if (onUpdateState) {
      const updatedLeads = [newLead, ...(state.leads || [])];
      onUpdateState({
        ...state,
        leads: updatedLeads
      });
    }

    // Open WhatsApp instantly in a new tab without stalling the customer
    window.open(customWhatsappUrl, '_blank');
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isAiChatAvailable && activePanel === 'ai') {
      setActivePanel(null);
    }
  }, [activePanel, isAiChatAvailable]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    setErrorStatus(null);
    const userMsgTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg: ChatMessage = {
      role: 'user',
      content: textToSend,
      time: userMsgTime
    };

    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    saveChatHistoryToDb(updatedMessages);

    setInputMsg('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          whatsappNumber: whatsappNum,
          messages: updatedMessages.map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      const botMsgTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const replyContent = data.text || 'I had trouble formulating a response. Can you try again or chat on WhatsApp?';
      
      const nextMsgs = [
        ...updatedMessages,
        {
          role: 'assistant' as const,
          content: replyContent,
          time: botMsgTime
        }
      ];
      setMessages(nextMsgs);
      saveChatHistoryToDb(nextMsgs);
    } catch (err) {
      console.error('Failed to communicate with support agent:', err);
      setErrorStatus('Connection blip. Reach us instantly on WhatsApp!');
      const errMsgs = [
        ...updatedMessages,
        {
          role: 'assistant' as const,
          content: 'Oops, I had a small connection blip while seeking our florist catalog. Send your request again or use our live green WhatsApp Help tab to leave a direct follow-up lead!',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ];
      setMessages(errMsgs);
      saveChatHistoryToDb(errMsgs);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresetSelect = (preset: string) => {
    handleSendMessage(preset);
  };

  // Safe formatting of normal texts
  const formatMessageText = (text: string) => {
    return text.split('\n').map((para, pIdx) => {
      if (!para.trim()) return <div key={pIdx} className="h-2" />;
      
      // Render strong inline bold markup safely
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(para)) !== null) {
        if (match.index > lastIndex) {
          parts.push(para.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="font-extrabold text-slate-900 select-all">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      
      if (lastIndex < para.length) {
        parts.push(para.substring(lastIndex));
      }

      return (
        <p key={pIdx} className="leading-relaxed text-[13px] text-slate-800 font-medium whitespace-pre-wrap">
          {parts.length > 0 ? parts : para}
        </p>
      );
    });
  };

  // Complex checkout URL and payment receipt rendering inside the assistant messages
  const renderMessageContent = (messageContent: string) => {
    const tokenRegex = /(\[instant-checkout:[^\]]+\]|\[whatsapp-link\])/g;
    
    if (!messageContent.match(tokenRegex)) {
      return formatMessageText(messageContent);
    }

    const parts = [];
    let lastIndex = 0;
    let match;

    // Reset regex index
    tokenRegex.lastIndex = 0;

    while ((match = tokenRegex.exec(messageContent)) !== null) {
      if (match.index > lastIndex) {
        parts.push(formatMessageText(messageContent.substring(lastIndex, match.index)));
      }

      const token = match[1];
      if (token.startsWith('[instant-checkout:')) {
        const prodId = token.replace('[instant-checkout:', '').replace(']', '').trim();
        const product = state.products.find(p => p.id === prodId || p.id.replace(/['"]/g, '') === prodId.replace(/['"]/g, ''));

        if (product) {
          parts.push(
            <div key={`checkout-panel-${match.index}`} className="my-3 p-4 bg-white border border-emerald-500/45 rounded-2xl shadow-md text-slate-800 space-y-3 relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Soft Ambient Green Background Glow */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
              
              <div className="flex gap-2.5 items-start">
                {product.images && product.images.length > 0 ? (
                  <img 
                    src={product.images[0]} 
                    alt={product.name} 
                    className="w-13 h-13 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-50"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-13 h-13 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0 font-bold font-mono text-[11px]">
                    GIFT
                  </div>
                )}
                <div className="space-y-1 min-w-0">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest font-mono block">
                    💳 Secure Order Initiated
                  </span>
                  <h5 className="text-[13px] font-black text-slate-800 truncate pr-2">
                    {product.name}
                  </h5>
                  <p className="text-[13px] text-emerald-600 font-extrabold font-mono">
                    NPR {product.price.toLocaleString()}
                  </p>
                </div>
              </div>

              <p className="text-[11.5px] text-slate-600 leading-relaxed font-semibold">
                Tap below to choose customization features, key in address info, and complete payment.
              </p>

              <button
                onClick={() => {
                  if (onAddToCart) {
                    onAddToCart(product);
                    if (onOpenCart) {
                      onOpenCart();
                    }
                    setActivePanel(null); // Close panel to let them check out
                  }
                }}
                className="w-full py-2.5 bg-emerald-605 hover:bg-emerald-500 active:scale-[0.98] transition-all text-white font-black text-[11.5px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                style={{ backgroundColor: '#10b981' }}
              >
                <span>Accept Payment & Checkout 🚀</span>
              </button>
            </div>
          );
        } else {
          parts.push(
            <div key={`checkout-panel-${match.index}`} className="my-2.5 p-3 bg-amber-50 rounded-xl text-amber-900 text-[11.5px] border border-amber-200/80 font-medium">
              ⚠️ Product request details require manual validation. Speak directly with us on WhatsApp at {whatsappNum} for instant bespoke pricing.
            </div>
          );
        }
      } else if (token === '[whatsapp-link]') {
        parts.push(
          <div key={`whatsapp-link-panel-${match.index}`} className="my-3 p-4 bg-white border border-emerald-500/40 rounded-2xl shadow-sm space-y-3.5 relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Soft Ambient Leaf Glow */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex gap-3 items-center">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-100">
                <svg viewBox="0 0 448 512" className="w-5.5 h-5.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L3 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
                </svg>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest font-mono block">
                  💬 Click to Chat on WhatsApp
                </span>
                <h4 className="text-[13.5px] font-black text-slate-800">{whatsappNum}</h4>
              </div>
            </div>

            <p className="text-[12px] text-slate-650 leading-relaxed font-semibold">
              Tap below to chat with our representatives instantly for bespoke hampers, customized flowers, or express updates!
            </p>

            <button
              onClick={triggerDirectWhatsappChat}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] transition-all text-white font-extrabold text-[12px] tracking-wide rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              style={{ backgroundColor: '#10b981' }}
            >
              <span>Chat with Human 💬</span>
            </button>
          </div>
        );
      }

      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < messageContent.length) {
      parts.push(formatMessageText(messageContent.substring(lastIndex)));
    }

    return <div className="space-y-1">{parts}</div>;
  };

  const primaryColor = state.appearance?.primaryColor || '#E91E63';
  const secondaryColor = state.appearance?.secondaryColor || '#E91E63';

  return (
    <div className="fixed bottom-3 sm:bottom-5 right-3 sm:right-5 z-50 font-sans text-left flex flex-col items-end gap-2.5 pointer-events-none">
      
      {/* ----------------- INTERACTIVE DRAWERS ----------------- */}
      <AnimatePresence>
        {isAiChatAvailable && activePanel === 'ai' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="w-[82vw] max-w-[320px] sm:w-[320px] md:w-[340px] h-[62vh] min-h-[390px] sm:h-[460px] md:h-[500px] max-h-[calc(100vh-96px)] bg-slate-50 border border-slate-200/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-2 pointer-events-auto"
          >
            {/* Header displaying user website logo clearly with white backdrop plate */}
            <div className="p-3 bg-white text-slate-800 flex items-center justify-between shrink-0 relative border-b border-slate-100/80">
              <div className="flex items-center gap-2 min-w-0">
                {state.appearance?.siteLogo ? (
                  <div className="p-1 px-2 bg-slate-50/50 border border-slate-200/50 rounded-xl flex items-center justify-center max-w-[118px] min-h-[32px] shadow-2xs shrink-0">
                    <img
                      src={state.appearance.siteLogo}
                      alt={state.store?.storeName || 'Koseli Xpress'}
                      className="h-6.5 w-auto object-contain max-h-7"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-white text-xs shadow animate-pulse" style={{ backgroundColor: primaryColor }}>
                      KX
                    </div>
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] sm:text-[12px] font-extrabold uppercase tracking-widest leading-none" style={{ color: primaryColor }}>
                      CSR- AI
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold leading-tight mt-1 truncate">Order & Pay via Chat</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setActivePanel(null)}
                  className="p-1 px-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer flex items-center gap-1 border border-slate-200/50 bg-slate-50"
                  title="Minimize Chat Panel"
                >
                  <Minus className="w-3 h-3" />
                  <span className="hidden sm:inline text-[9px] font-black uppercase tracking-wider">Minimize</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePanel(null)}
                  className="p-1 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  title="Close AI Assistant"
                >
                  <X className="w-4.5 h-4.5 bg-transparent border-none" />
                </button>
              </div>
            </div>

            {/* Accent Theme Gradient bar representing active branding design language */}
            <div className="h-[3px] w-full shrink-0" style={{ backgroundImage: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }} />

            {/* Redesigned Urgent Human Assistance WhatsApp Bar with premium UI/UX */}
            <button
              onClick={triggerDirectWhatsappChat}
              className="w-full px-3 py-2.5 bg-emerald-50 border-b border-emerald-100 hover:bg-emerald-100/40 active:bg-emerald-100 transition-all duration-200 flex items-center justify-between text-left shrink-0 cursor-pointer pointer-events-auto"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs relative">
                  <span className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping opacity-60" />
                  <svg viewBox="0 0 448 512" className="w-4 h-4 fill-current relative z-10" xmlns="http://www.w3.org/2000/svg">
                    <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L3 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
                  </svg>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10.5px] sm:text-[11px] font-black text-emerald-800 leading-tight block">
                    Human assistance for urgent help
                  </span>
                  <p className="text-[9px] text-emerald-600/80 font-bold tracking-tight">Direct WhatsApp live chat</p>
                </div>
              </div>
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0 ml-2 group-hover:bg-emerald-500/20 transition-all">
                <svg className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Message Pane with dynamic instant-checkout renderers */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50 relative">
              {messages.map((m, idx) => (
                <div
                  key={`chat-msg-${idx}`}
                  className={`flex gap-2 max-w-[92%] ${m.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  {m.role === 'assistant' && (
                    <div 
                      className="w-6 h-6 rounded-lg text-white font-black text-[9px] flex items-center justify-center shrink-0 mt-1 select-none shadow-xs"
                      style={{ backgroundColor: primaryColor }}
                    >
                      AI
                    </div>
                  )}
                  <div className="space-y-1">
                    <div
                      className={`p-3 rounded-2xl text-[12.5px] leading-relaxed shadow-xs ${
                        m.role === 'user'
                          ? 'bg-slate-100 text-slate-800 border border-slate-200/60 rounded-tr-none font-semibold'
                          : 'bg-white text-slate-800 border border-slate-100/90 rounded-tl-none font-medium'
                      }`}
                    >
                      {m.role === 'assistant' ? (
                        renderMessageContent(m.content)
                      ) : (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 block px-1 text-right">
                      {m.time}
                    </span>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-2 max-w-[90%] mr-auto">
                  <div 
                    className="w-6 h-6 rounded-lg text-white font-black text-[9px] flex items-center justify-center shrink-0 border border-white/10 mt-1 select-none"
                    style={{ backgroundColor: primaryColor }}
                  >
                    AI
                  </div>
                  <div className="p-2.5 bg-white text-slate-500 border border-slate-100 rounded-2xl rounded-tl-none text-[12px] flex items-center gap-2 font-medium shadow-xs">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: primaryColor }} />
                    Typing...
                  </div>
                </div>
              )}

              {errorStatus && (
                <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-center text-[10px] text-rose-700 font-bold flex items-center justify-center gap-1">
                  <span>{errorStatus}</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Chips Block */}
            <div className="px-2.5 py-2 bg-slate-50 border-t border-slate-100 flex gap-1.5 overflow-x-auto whitespace-nowrap shrink-0 scrollbar-none">
              {PRESET_CHIPS.map((chip, idx) => (
                <button
                  key={`preset-chip-${idx}`}
                  onClick={() => handlePresetSelect(chip)}
                  disabled={isLoading}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-705 rounded-full text-[10.5px] font-bold transition shrink-0 shadow-xs cursor-pointer disabled:opacity-50"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = primaryColor;
                    e.currentTarget.style.color = primaryColor;
                    e.currentTarget.style.backgroundColor = `${primaryColor}08`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.color = '#334155';
                    e.currentTarget.style.backgroundColor = '#ffffff';
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Footer Form Input - Redesigned like a premium modern chat box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputMsg);
              }}
              className="p-2.5 bg-white border-t border-slate-100/90 flex gap-2 shrink-0 items-center w-full"
            >
              <div 
                className="flex-1 min-w-0 flex items-center bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 transition-all duration-200 focus-within:bg-white focus-within:border-emerald-500/40 focus-within:ring-2 focus-within:ring-emerald-500/10"
              >
                <MessageSquare className="w-4 h-4 text-slate-400 mr-2 shrink-0 opacity-70" />
                <input
                  type="text"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="w-full py-2.5 bg-transparent text-[12px] font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0 text-left border-none"
                />
              </div>
              <button
                type="submit"
                disabled={!inputMsg.trim() || isLoading}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer text-white shrink-0 hover:scale-[1.03] active:scale-[0.97] disabled:opacity-30 disabled:scale-100 disabled:hover:scale-100"
                style={{ 
                  backgroundColor: inputMsg.trim() && !isLoading ? primaryColor : '#cbd5e1',
                  boxShadow: inputMsg.trim() && !isLoading ? `0 4px 12px ${primaryColor}15` : 'none'
                }}
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </form>

            <div className="py-1.5 bg-slate-100 text-center text-[8.5px] text-slate-405 font-mono flex items-center justify-center gap-1 uppercase select-none font-black border-t border-slate-200/50">
              <span>Bespoke Handcrafted Happiness</span>
              <Heart className="w-2.5 h-2.5 text-rose-500 fill-rose-500" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      
      {/* ----------------- SEPARATE LAUNCHER BUTTONS (FLOATING ACTIONS) ----------------- */}
      <div className="flex flex-col gap-2.5 select-none pointer-events-auto">
        
        {/* LAUNCHER 1: KOSELI XPRESS - AI Support */}
        {isAiChatAvailable && (
        <div className="relative group flex items-center justify-end">
          {/* Hover-only Tooltip Label (No autoplay pop) */}
          {activePanel !== 'ai' && (
            <span className="absolute right-18 scale-0 group-hover:scale-100 transition-all origin-right bg-slate-950 text-white text-[10.5px] font-black py-1.5 px-3 rounded-xl whitespace-nowrap shadow-lg pointer-events-none tracking-wide z-20">
              {aiChatScheduled ? 'CSR-AI Support Live Now' : 'CSR-AI Support Live (24/7)'}
            </span>
          )}
          
          <button
            onClick={() => setActivePanel(activePanel === 'ai' ? null : 'ai')}
            className={`w-15 h-15 rounded-full shadow-2xl flex items-center justify-center transition hover:scale-110 active:scale-95 cursor-pointer relative border-2 ${
              activePanel === 'ai' 
                ? 'text-white border-white/60' 
                : 'text-white border-rose-200/50'
            }`}
            style={{ 
              backgroundColor: '#ffffff',
              boxShadow: `0 8px 30px ${primaryColor}33`,
              borderColor: primaryColor
            }}
            title="KOSELI XPRESS - AI Support"
          >
            {activePanel === 'ai' ? (
                  <X className="w-6 h-6 animate-in spin-in-90 duration-200" style={{ color: primaryColor }} />
            ) : (
              <div className="relative flex items-center justify-center">
                {state.appearance?.siteLogo ? (
                  <img
                    src={state.appearance.siteLogo}
                    alt="AI Support"
                    className="w-8 h-8 object-contain rounded-full border bg-white"
                    style={{ borderColor: `${primaryColor}33` }}
                  />
                ) : (
                  <MessageCircle className="w-6 h-6" style={{ color: primaryColor }} />
                )}
              </div>
            )}
            
            {activePanel !== 'ai' && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-white font-black rounded-lg text-[7px] shadow uppercase tracking-wider scale-95 select-none border border-white/30" style={{ backgroundColor: secondaryColor }}>
                {aiChatScheduled ? 'AI LIVE' : 'AI 24/7'}
              </span>
            )}
          </button>
        </div>
        )}

        {/* LAUNCHER 2: WhatsApp Live human chat */}
        <div className="relative group flex items-center justify-end">
          {/* Hover Tooltip label */}
          <span className="absolute right-16 scale-0 group-hover:scale-100 transition-all origin-right bg-emerald-950 text-white text-[10px] font-bold py-1 px-2.5 rounded-lg whitespace-nowrap shadow-md pointer-events-none tracking-wide">
            📞 Chat on WhatsApp ("Hello Namaste !!")
          </span>
          <button
            onClick={triggerDirectWhatsappChat}
            className="w-13 h-13 rounded-full shadow-2xl flex items-center justify-center transition hover:scale-[1.08] active:scale-90 cursor-pointer relative border bg-gradient-to-tr from-emerald-600 via-teal-750 to-emerald-500 text-white border-emerald-400"
            title="Chat on WhatsApp"
          >
            <svg viewBox="0 0 448 512" className="w-6 h-6 fill-current text-white bg-transparent border-none" xmlns="http://www.w3.org/2000/svg">
              <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L3 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
            </svg>
            
            <span className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4.5 w-4.5 bg-emerald-400 text-emerald-950 font-black text-[7.5px] items-center justify-center uppercase select-none">
                LIVE
              </span>
            </span>
          </button>
        </div>

      </div>
      
    </div>
  );
}
