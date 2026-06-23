import React, { useState } from 'react';
import { DatabaseState, SupportChat } from '../../types';
import { 
  MessageSquare, 
  Search, 
  Clock, 
  CheckCircle, 
  User, 
  Trash2, 
  ExternalLink,
  Check,
  ChevronRight,
  UserCheck,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface SupportChatsTabProps {
  state: DatabaseState;
  onUpdateState: (newState: DatabaseState) => void;
}

export default function SupportChatsTab({ state, onUpdateState }: SupportChatsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [followUpNotes, setFollowUpNotes] = useState('');

  const chats = state.supportChats || [];

  // Filter chats by search query (id or last message text or any message content)
  const filteredChats = chats.filter(chat => {
    const query = searchTerm.toLowerCase();
    const idMatches = chat.id.toLowerCase().includes(query);
    const lastMsgMatches = chat.lastMessageText.toLowerCase().includes(query);
    const contentMatches = chat.messages.some(m => m.content.toLowerCase().includes(query));
    return idMatches || lastMsgMatches || contentMatches;
  });

  const selectedChat = chats.find(c => c.id === selectedChatId);

  const updateChatStatus = (id: string, nextStatus: 'pending' | 'followed_up' | 'closed') => {
    const updatedChats = chats.map(chat => {
      if (chat.id === id) {
        return {
          ...chat,
          status: nextStatus,
          updatedAt: new Date().toISOString()
        };
      }
      return chat;
    });

    onUpdateState({
      ...state,
      supportChats: updatedChats
    });
  };

  const deleteChatThread = (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this chat thread? This action cannot be undone.')) {
      return;
    }

    const updatedChats = chats.filter(chat => chat.id !== id);
    onUpdateState({
      ...state,
      supportChats: updatedChats
    });

    if (selectedChatId === id) {
      setSelectedChatId(null);
    }
  };

  const getStatusBadgeColor = (status: 'pending' | 'followed_up' | 'closed') => {
    switch (status) {
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200/50';
      case 'followed_up':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/50';
      case 'closed':
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  // Generate WhatsApp prefilled helper URL for admin to follow up on the specific thread
  const getFollowUpWhatsappUrl = (chat: SupportChat) => {
    const whatsappNum = state.plugins?.whatsappNumber || '+9779851012345';
    const cleanWhatsappNum = whatsappNum.replace(/[^0-9+]/g, '');
    
    // Attempt to synthesize context of customer prompt
    const userPrompts = chat.messages.filter(m => m.role === 'user');
    const lastPrompt = userPrompts[userPrompts.length - 1]?.content || 'your previous Koseli inquiry';
    
    const prefilledText = `Hello! Namaste 🙏 from Koseli Xpress. This is our customer support team following up on your live assistant chat session with active feedback: "${lastPrompt.substring(0, 80)}${lastPrompt.length > 80 ? '...' : ''}". How can we assist you with order delivery/dispatch today?`;
    
    return `https://wa.me/${cleanWhatsappNum}?text=${encodeURIComponent(prefilledText)}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight">AI Support Chats Manager</h1>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Monitor real-time customer conversations with CSR-AI and claim urgent leads instantly.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Unresolved Chats Queue</span>
            <div className="text-lg font-mono font-black text-rose-600">
              {chats.filter(c => c.status === 'pending').length} / {chats.length}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
        
        {/* Left Side: Threads List (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl shadow-3xs flex flex-col overflow-hidden max-h-[700px]">
          
          {/* List Toolbar Search */}
          <div className="p-4 border-b border-slate-100/90 bg-slate-50/50 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input 
                type="text"
                placeholder="Search visitor sessions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200/80 rounded-xl text-xs font-semibold placeholder-slate-400 text-slate-800 focus:outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/10 transition-all text-left"
              />
            </div>
          </div>

          {/* List Scrolling Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredChats.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <p className="text-xs text-slate-500 font-semibold">No support sessions logged yet.</p>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Chats will appear live here as soon as customers interact with the bottom-right AI conversation hub.
                </p>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isSelected = selectedChatId === chat.id;
                const formattedDate = new Date(chat.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
                const formattedTime = new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const userMsgCount = chat.messages.filter(m => m.role === 'user').length;

                return (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChatId(chat.id)}
                    className={`w-full text-left p-4 transition-all hover:bg-slate-50/90 flex items-start gap-3 relative cursor-pointer ${
                      isSelected ? 'bg-rose-50/40 border-r-3 border-rose-500' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <User className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-slate-800 truncate">
                          Session #{chat.id.replace('chat-', '')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0 font-bold whitespace-nowrap">
                          {formattedDate} {formattedTime}
                        </span>
                      </div>

                      <p className="text-[11.5px] text-slate-500 leading-snug truncate font-medium">
                        {chat.lastMessageText || 'No conversation contents'}
                      </p>

                      <div className="flex items-center justify-between pt-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusBadgeColor(chat.status)}`}>
                            {chat.status === 'pending' ? 'Pending Action' : chat.status === 'followed_up' ? 'Followed Up' : 'Closed'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono font-bold">
                            {chat.messages.length} msgs ({userMsgCount} user)
                          </span>
                        </div>
                        
                        <div className="flex items-center">
                          <ChevronRight className="w-3.5 h-3.5 text-slate-350" />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Conversation Transcript (7 cols) */}
        <div className="lg:col-span-12 xl:col-span-7 bg-white border border-slate-100 rounded-2xl shadow-3xs flex flex-col overflow-hidden max-h-[700px] min-h-[500px]">
          {selectedChat ? (
            <div className="flex flex-col h-full flex-1">
              
              {/* Header Details */}
              <div className="p-4 border-b border-slate-100 bg-white/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-tight">Visitor #{selectedChat.id.replace('chat-', '')}</h4>
                    <p className="text-[10px] text-slate-400 font-mono font-semibold">
                      Created: {new Date(selectedChat.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {selectedChat.status !== 'followed_up' && (
                    <button
                      onClick={() => updateChatStatus(selectedChat.id, 'followed_up')}
                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100/75 border border-emerald-200 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                    >
                      <Check className="w-3 h-3" /> Mark Followed Up
                    </button>
                  )}
                  {selectedChat.status !== 'closed' && (
                    <button
                      onClick={() => updateChatStatus(selectedChat.id, 'closed')}
                      className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                    >
                      <CheckCircle className="w-3 h-3" /> Close Session
                    </button>
                  )}
                  <button
                    onClick={() => deleteChatThread(selectedChat.id)}
                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg shrink-0 cursor-pointer transition-all"
                    title="Delete Chat Session Record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Chat Bubbles Feed Pane */}
              <div className="flex-1 overflow-y-auto p-4 bg-slate-50/70 space-y-4 max-h-[460px]">
                {selectedChat.messages.map((m, idx) => {
                  const isUser = m.role === 'user';
                  return (
                    <div 
                      key={idx} 
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}
                    >
                      <div className={`max-w-[85%] rounded-2xl p-3.5 text-xs inline-block shadow-3xs border ${
                        isUser 
                          ? 'bg-slate-100 text-slate-900 border-slate-200 rounded-tr-none' 
                          : 'bg-white text-slate-800 border-slate-100/90 rounded-tl-none font-medium'
                      }`}>
                        
                        {/* Messenger flag */}
                        <span className={`text-[9px] font-black block uppercase tracking-wider ${isUser ? 'text-slate-500' : 'text-slate-400'} mb-1`}>
                          {isUser ? '👤 Visitor Prompt' : '🤖 Koseli CSR-AI'}
                        </span>

                        <p className="leading-relaxed font-semibold whitespace-pre-wrap">{m.content}</p>
                        
                        <span className={`text-[8.5px] font-mono block text-right mt-1.5 ${isUser ? 'text-slate-500' : 'text-slate-400'}`}>
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Actions Follow Up Footer */}
              <div className="p-4 border-t border-slate-150 bg-slate-50/50 shrink-0 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 border border-slate-200 rounded-xl">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider block">🗣️ Actionable Follow-up</span>
                    <h5 className="text-[11.5px] font-bold text-slate-800">Would you like to contact this visitor on WhatsApp?</h5>
                    <p className="text-[10.5px] text-slate-500 font-semibold leading-relaxed">
                      This will open WhatsApp pre-configured with a warm personalized reminder linking to their specific question block.
                    </p>
                  </div>

                  <a
                    href={getFollowUpWhatsappUrl(selectedChat)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      updateChatStatus(selectedChat.id, 'followed_up');
                    }}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white rounded-xl inline-flex items-center justify-center gap-1.5 text-xs font-bold leading-normal transition-all cursor-pointer whitespace-nowrap shadow-xs"
                    style={{ backgroundColor: '#10b981' }}
                  >
                    <span>Follow Up on WhatsApp</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3 animate-bounce">
                <MessageSquare className="w-6 h-6 animate-pulse" />
              </div>
              <h4 className="text-xs font-bold text-slate-800">No Chat Selected</h4>
              <p className="text-[11px] text-slate-500 max-w-xs mt-1 leading-relaxed font-semibold">
                Click any of the recorded visitor chat threads on the left list view to audit entire prompt-reply histories and take follow-up actions.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
