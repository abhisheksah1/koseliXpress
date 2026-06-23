import React, { useState } from 'react';
import { DatabaseState, SocialMarketingSchedule, SocialMarketingSettings } from '../../types';
import { 
  Sparkles, 
  Share2, 
  Calendar, 
  Hash, 
  Facebook, 
  Instagram, 
  Linkedin, 
  Twitter, 
  Settings2, 
  Plus, 
  Trash2, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Play,
  Save,
  Check
} from 'lucide-react';

interface SocialMarketingTabProps {
  state: DatabaseState;
  onUpdateState: (newState: DatabaseState) => void;
}

export default function SocialMarketingTab({ state, onUpdateState }: SocialMarketingTabProps) {
  // Initialize config defaults if not in db
  const defaultSettings: SocialMarketingSettings = state.socialConfig || {
    isEnabled: true,
    defaultHashtags: '#koselixpress #nepalgifts #gift delivery #nepal #onlinegifting #sendgiftnepal',
    automaticGeneration: true,
    marketingMode: 'balanced',
    scheduledFrequencyHours: 12
  };

  const [settings, setSettings] = useState<SocialMarketingSettings>(defaultSettings);
  const [schedules, setSchedules] = useState<SocialMarketingSchedule[]>(state.socialSchedules || []);
  
  // Create schedule form states
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customCaption, setCustomCaption] = useState('');
  const [customHashtags, setCustomHashtags] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook', 'instagram']);
  
  // Loading & notification states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Editing existing caption states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCaption, setEditingCaption] = useState('');
  const [editingHashtags, setEditingHashtags] = useState('');
  const [editingTime, setEditingTime] = useState('');

  const activeProducts = (state.products || []).filter(p => p.status === 'active');

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setTimeout(() => {
      onUpdateState({
        ...state,
        socialConfig: settings
      });
      setIsSavingConfig(false);
      triggerSuccess('Social configurations saved successfully!');
    }, 450);
  };

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 3000);
  };

  const togglePlatformSelection = (p: string) => {
    if (selectedPlatforms.includes(p)) {
      setSelectedPlatforms(selectedPlatforms.filter(item => item !== p));
    } else {
      setSelectedPlatforms([...selectedPlatforms, p]);
    }
  };

  // call server-side gemini endpoint to generate social caption & hashtags!
  const generateAICaption = async () => {
    if (!selectedProductId) {
      triggerError('Please select a product first to generate caption.');
      return;
    }
    const product = activeProducts.find(p => p.id === selectedProductId);
    if (!product) return;

    setIsGenerating(true);
    setCustomCaption('');
    setCustomHashtags('');

    try {
      const response = await fetch('/api/gemini/social-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: product.name,
          productDescription: product.description,
          productPrice: `${product.discountPrice || product.price}`,
          platforms: selectedPlatforms
        })
      });

      if (!response.ok) {
        throw new Error('API server failed');
      }

      const data = await response.json();
      setCustomCaption(data.caption || '');
      setCustomHashtags(data.hashtags || settings.defaultHashtags);
      triggerSuccess('AI generated stunning caption & hashtags!');
    } catch (err: any) {
      console.error(err);
      // Fallback in case of server block
      setCustomCaption(`🎁 Elevate your gifting game with our premium ${product.name}! Hand-wrapped with ultimate care, baked fresh & dispatched instantly. Double the sparkles today across Nepal!\n\n🔗 Shop online here: [PRODUCT_LINK]`);
      setCustomHashtags(settings.defaultHashtags);
      triggerError('Using local fallback caption templates.');
    } finally {
      setIsGenerating(false);
    }
  };

  const createSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      triggerError('Select a product to schedule.');
      return;
    }
    if (!customCaption) {
      triggerError('Caption cannot be empty. Click generate or type one.');
      return;
    }
    if (!scheduledDate) {
      triggerError('Please select a scheduled date.');
      return;
    }

    const product = activeProducts.find(p => p.id === selectedProductId);
    if (!product) return;

    const finalDateTimeString = `${scheduledDate}T${scheduledTime || '10:00'}:00`;
    
    const newSchedule: SocialMarketingSchedule = {
      id: `schedule-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      productUrl: `https://koselixpress.com/p/${product.slug}`,
      caption: customCaption,
      hashtags: customHashtags,
      scheduledTime: finalDateTimeString,
      platforms: selectedPlatforms.length > 0 ? selectedPlatforms : ['facebook'],
      status: 'scheduled'
    };

    const updatedSchedules = [newSchedule, ...schedules];
    setSchedules(updatedSchedules);
    onUpdateState({
      ...state,
      socialSchedules: updatedSchedules
    });

    // Clear form
    setSelectedProductId('');
    setCustomCaption('');
    setCustomHashtags('');
    setScheduledDate('');
    triggerSuccess('Social post scheduled into the marketing queue!');
  };

  const deleteSchedule = (id: string) => {
    if (confirm('Are you sure you want to delete this scheduled post?')) {
      const updatedSchedules = schedules.filter(s => s.id !== id);
      setSchedules(updatedSchedules);
      onUpdateState({
        ...state,
        socialSchedules: updatedSchedules
      });
      triggerSuccess('Post removed.');
    }
  };

  const handleShareImmediately = (id: string) => {
    const updatedSchedules = schedules.map(s => {
      if (s.id === id) {
        return {
          ...s,
          status: 'shared' as const,
          sharedAt: new Date().toISOString()
        };
      }
      return s;
    });
    setSchedules(updatedSchedules);
    onUpdateState({
      ...state,
      socialSchedules: updatedSchedules
    });
    triggerSuccess('🚀 Simulating instant social post broadcast! Shared successfully.');
  };

  const handleCancelPost = (id: string) => {
    const updatedSchedules = schedules.map(s => {
      if (s.id === id) {
        return { ...s, status: 'cancelled' as const };
      }
      return s;
    });
    setSchedules(updatedSchedules);
    onUpdateState({
      ...state,
      socialSchedules: updatedSchedules
    });
    triggerSuccess('Campaign cancelled.');
  };

  const startEditing = (s: SocialMarketingSchedule) => {
    setEditingId(s.id);
    setEditingCaption(s.caption);
    setEditingHashtags(s.hashtags);
    setEditingTime(s.scheduledTime.substring(0, 16));
  };

  const saveEditing = () => {
    if (!editingCaption) {
      triggerError('Caption cannot be empty');
      return;
    }
    const updatedSchedules = schedules.map(s => {
      if (s.id === editingId) {
        return {
          ...s,
          caption: editingCaption,
          hashtags: editingHashtags,
          scheduledTime: editingTime
        };
      }
      return s;
    });
    setSchedules(updatedSchedules);
    onUpdateState({
      ...state,
      socialSchedules: updatedSchedules
    });
    setEditingId(null);
    triggerSuccess('Campaign updated successfully!');
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* Dynamic Alerts */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-650" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-650" />
          {errorMsg}
        </div>
      )}

      {/* Header Info Block */}
      <div className="p-5 bg-white border border-slate-150 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-rose-600 animate-pulse" />
            Social Media Scheduling & AI Marketing
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
            Boost e-commerce brand visibility and conversions by automatically generating and scheduling SEO-optimized captions.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="text-[11px] font-mono px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200 font-bold">
            Total Queue: {schedules.length}
          </span>
          <span className="text-[11px] font-mono px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg border border-rose-100 font-bold">
            Active: {schedules.filter(s => s.status === 'scheduled').length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Schedule Post Form */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="p-5 bg-white border border-slate-150 rounded-2xl space-y-4 shadow-sm">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-rose-500" /> Create Scheduled Marketing Post
            </h3>

            <form onSubmit={createSchedule} className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Product</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-1 focus:ring-rose-500"
                  >
                    <option value="">-- Choose Campaign Product --</option>
                    {activeProducts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (NPR {p.discountPrice || p.price})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Social Channels</label>
                  <div className="flex gap-2.5 pt-1">
                    {['facebook', 'instagram', 'linkedin', 'twitter'].map(plat => {
                      const selected = selectedPlatforms.includes(plat);
                      return (
                        <button
                          key={plat}
                          type="button"
                          onClick={() => togglePlatformSelection(plat)}
                          className={`p-2 rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            selected 
                              ? 'bg-rose-50 border-rose-200 text-rose-700 font-semibold' 
                              : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
                          }`}
                          title={plat.toUpperCase()}
                        >
                          {plat === 'facebook' && <Facebook className="w-4 h-4" />}
                          {plat === 'instagram' && <Instagram className="w-4 h-4" />}
                          {plat === 'linkedin' && <Linkedin className="w-4 h-4" />}
                          {plat === 'twitter' && <Twitter className="w-4 h-4" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* AI Auto-generate caption control */}
              {selectedProductId && (
                <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-rose-600 animate-bounce" />
                    <div>
                      <p className="text-[11px] font-bold text-slate-700">Write high-converting post copies with AI</p>
                      <p className="text-[9px] text-slate-500 font-semibold">Gemini compiles product details, specs, and price tags dynamically.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={generateAICaption}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-450 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg flex items-center gap-1.5 shadow-sm"
                  >
                    {isGenerating ? 'Drafting...' : 'Generate Copy ✨'}
                  </button>
                </div>
              )}

              {/* Caption Text Area */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Caption Content</label>
                <textarea
                  rows={4}
                  value={customCaption}
                  onChange={(e) => setCustomCaption(e.target.value)}
                  placeholder="Draft your promotional text. Use [PRODUCT_LINK] for the target webstore URL..."
                  className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-xl focus:ring-1 focus:ring-rose-500"
                />
              </div>

              {/* Hashtag Area */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Campaign Hashtags</label>
                <input
                  type="text"
                  value={customHashtags}
                  onChange={(e) => setCustomHashtags(e.target.value)}
                  placeholder="#koselixpress #sendgift #giftnepal"
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-rose-500"
                />
              </div>

              {/* Date & Time Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Post Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Post Time</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full py-2.5 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 text-xs font-bold uppercase tracking-wider rounded-xl transition shadow flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" /> Schedule Campaign Post 📌
                </button>
              </div>

            </form>
          </div>

          {/* Social Queue Tabular list */}
          <div className="p-5 bg-white border border-slate-150 rounded-2xl space-y-4 shadow-sm">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
              Scheduled Posts Queue ({schedules.length})
            </h3>

            {schedules.length === 0 ? (
              <div className="py-8 text-center text-slate-450 text-xs font-semibold">
                No marketing schedules yet. Select a product above and cue one!
              </div>
            ) : (
              <div className="space-y-4">
                {schedules.map((item) => {
                  const isEditing = editingId === item.id;
                  return (
                    <div 
                      key={item.id} 
                      className={`p-4 border rounded-2xl space-y-3 transition-colors ${
                        item.status === 'shared' 
                          ? 'bg-emerald-50/20 border-emerald-100' 
                          : item.status === 'cancelled'
                            ? 'bg-slate-50 border-slate-100 text-slate-400 line-through'
                            : 'bg-slate-50/50 border-slate-150 hover:border-rose-250'
                      }`}
                    >
                      {/* Top status bar */}
                      <div className="flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold font-mono text-slate-650 bg-slate-200/60 border border-slate-350 px-2 py-0.5 rounded-md">
                            {item.productName || 'Custom Product Post'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold italic">
                            via {item.platforms.join(', ')}
                          </span>
                        </div>

                        <div>
                          {item.status === 'scheduled' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] font-bold tracking-wider uppercase text-sky-700 bg-sky-50 border border-sky-100 rounded-md">
                              <Clock className="w-2.5 h-2.5" /> Scheduled
                            </span>
                          )}
                          {item.status === 'shared' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] font-bold tracking-wider uppercase text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md">
                              <Check className="w-2.5 h-2.5 animate-bounce" /> Broadcasted
                            </span>
                          )}
                          {item.status === 'cancelled' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] font-bold tracking-wider uppercase text-slate-500 bg-slate-100 border border-slate-200 rounded-md">
                              Cancelled
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Editing Block vs Plain Block */}
                      {isEditing ? (
                        <div className="space-y-3 p-3 bg-white border border-slate-150 rounded-xl">
                          <div>
                            <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">Edit Caption</label>
                            <textarea
                              rows={3}
                              value={editingCaption}
                              onChange={(e) => setEditingCaption(e.target.value)}
                              className="w-full text-xs font-semibold p-2 border border-slate-200 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">Edit Hashtags</label>
                            <input
                              type="text"
                              value={editingHashtags}
                              onChange={(e) => setEditingHashtags(e.target.value)}
                              className="w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-200 rounded-lg"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={saveEditing}
                              className="px-3 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-extrabold uppercase flex items-center gap-1"
                            >
                              <Save className="w-3 h-3" /> Save Changes
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-[10px] font-extrabold uppercase"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-slate-700 leading-relaxed font-sans whitespace-pre-line">
                            {item.caption}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500">
                            {item.hashtags}
                          </p>
                        </div>
                      )}

                      {/* Footer time & controls */}
                      <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                        <div className="text-[9px] text-slate-400. font-mono flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Schedule: <strong>{new Date(item.scheduledTime).toLocaleString()}</strong></span>
                          {item.sharedAt && (
                            <span className="text-emerald-650 ml-1.5">Shared: {new Date(item.sharedAt).toLocaleTimeString()}</span>
                          )}
                        </div>

                        {!isEditing && item.status === 'scheduled' && (
                          <div className="flex gap-1.5 self-end">
                            <button
                              onClick={() => startEditing(item)}
                              className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-250 text-[10px] text-slate-600 rounded-lg font-semibold cursor-pointer"
                            >
                              Edit Text
                            </button>
                            <button
                              onClick={() => handleShareImmediately(item.id)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                              title="Broadcast immediately to simulated channels"
                            >
                              <Play className="w-3 h-3" /> Share Now
                            </button>
                            <button
                              onClick={() => handleCancelPost(item.id)}
                              className="px-2 py-1 hover:bg-rose-50 text-[10px] text-rose-600 rounded-lg font-semibold border border-transparent hover:border-rose-100 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => deleteSchedule(item.id)}
                              className="p-1 px-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition border border-transparent hover:border-rose-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {item.status !== 'scheduled' && (
                          <button
                            onClick={() => deleteSchedule(item.id)}
                            className="p-1 px-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg border border-transparent hover:border-rose-100 self-end"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove Log
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>

        {/* Right Column: Settings configuration */}
        <div className="space-y-6">
          
          <div className="p-5 bg-white border border-slate-150 rounded-2xl space-y-4 shadow-sm">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <Settings2 className="w-4 h-4 text-slate-500" /> Platform Configuration
            </h3>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              
              {/* Enable Social Posting */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700">Auto marketing integrations</label>
                  <p className="text-[9px] text-slate-400 font-semibold">Enable or disable scheduled post cues.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.isEnabled}
                    onChange={(e) => setSettings({ ...settings, isEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                </label>
              </div>

              {/* Automatic matching settings */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700">Auto Generator (New Products)</label>
                  <p className="text-[9px] text-slate-400 font-semibold font-medium">Auto match and generate schedules when new items are cataloged.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.automaticGeneration}
                    onChange={(e) => setSettings({ ...settings, automaticGeneration: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                </label>
              </div>

              {/* Default hashtags settings */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Global Default Hashtags</label>
                <textarea
                  rows={3}
                  value={settings.defaultHashtags}
                  onChange={(e) => setSettings({ ...settings, defaultHashtags: e.target.value })}
                  placeholder="Set default fallback hashtags..."
                  className="w-full text-xs font-semibold p-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-rose-500"
                />
              </div>

              {/* Frequency selection */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Scheduling Target Mode</label>
                <select
                  value={settings.marketingMode}
                  onChange={(e) => setSettings({ ...settings, marketingMode: e.target.value as any })}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="aggressive">Aggressive (Multiple posts/day)</option>
                  <option value="balanced">Balanced (1 highly curated daily post)</option>
                  <option value="relaxed">Relaxed (Every other day campaign)</option>
                </select>
              </div>

              {/* Frequency Target Hours */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Scheduled Frequency (Hours)</label>
                <input
                  type="number"
                  min={1}
                  value={settings.scheduledFrequencyHours}
                  onChange={(e) => setSettings({ ...settings, scheduledFrequencyHours: parseInt(e.target.value) || 12 })}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-rose-500"
                />
                <p className="text-[9px] text-slate-400 mt-1 font-semibold leading-relaxed">
                  System triggers automation matching rules every <strong>{settings.scheduledFrequencyHours} hours</strong> to optimize reach.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="w-full py-2 bg-slate-900 text-white text-xs font-bold uppercase rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isSavingConfig ? 'Saving...' : 'Save Social Config'}
                </button>
              </div>

            </form>
          </div>

          <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl space-y-2 text-xs">
            <h4 className="font-bold text-slate-800 flex items-center gap-1">
              <Share2 className="w-3.5 h-3.5 text-rose-500 animate-pulse" /> Active Gifting Campaigns
            </h4>
            <p className="text-[9px] leading-relaxed text-slate-500 font-medium">
              Social sharing creates dynamic redirection triggers. When users click standard links on Facebook/Instagram, they landing on custom seasonal products directly matching the active coupon incentives in our core app.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
