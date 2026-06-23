import React, { useState } from 'react';
import { runSEOChecks } from '../../utils/seo';
import { Product, Category, DynamicPage, DatabaseState } from '../../types';
import { Sparkles, Eye, Share2, FileCode, CheckCircle2, AlertTriangle, XCircle, Smartphone, Monitor } from 'lucide-react';

interface SEOAssistantWidgetProps {
  type: 'product' | 'category' | 'page';
  item: any;
  onChangeFields: (updates: any) => void;
  state: DatabaseState;
}

export default function SEOAssistantWidget({ type, item, onChangeFields, state }: SEOAssistantWidgetProps) {
  const [focusInput, setFocusInput] = useState(item.focusKeyword || '');
  const [devicePreview, setDevicePreview] = useState<'mobile' | 'desktop'>('mobile');
  const [activeSubTab, setActiveSubTab] = useState<'checklist' | 'google' | 'social' | 'schema'>('checklist');

  // Trigger analysis
  const results = runSEOChecks(
    type,
    item,
    focusInput,
    state.products || [],
    state.categories || [],
    state.pages || []
  );

  // Group checks
  const errors = results.checks.filter(c => c.status === 'error');
  const warnings = results.checks.filter(c => c.status === 'warning');
  const passes = results.checks.filter(c => c.status === 'pass');

  const handleKeywordChange = (value: string) => {
    setFocusInput(value);
    onChangeFields({ focusKeyword: value });
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 70) return 'text-teal-600 bg-teal-50 border-teal-200';
    if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  const getScoreProgressColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-500';
    if (score >= 70) return 'bg-teal-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const domainMock = 'https://koseli.com.np';
  const displaySlug = item.slug || 'untitled-page';
  const mockedUrl = `${domainMock}/${type === 'product' ? 'products' : type === 'category' ? 'collections' : 'pages'}/${displaySlug}`;

  const metaTitlePreview = item.metaTitle || item.name || item.title || 'Untitled Listing - Koseli';
  const metaDescPreview = item.metaDescription || item.description || 'Discover handpicked cakes, seasonal flower boxes, and celebratory hampers delivered inside Kathmandu via Koseli Express.';

  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-5 space-y-5 shadow-xs">
      
      {/* Title & Explainer */}
      <div className="flex items-center justify-between border-b pb-3.5 border-slate-200/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-rose-50 rounded-lg text-rose-600">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-slate-850 text-sm">Real-Time SEO Auditor</h4>
            <p className="text-[11px] text-slate-400">Evaluate indexing keywords and preview web search layout rankings on the fly.</p>
          </div>
        </div>
        <span className="text-[9px] font-mono bg-slate-250 text-slate-600 px-2 py-0.5 rounded uppercase font-bold">LIVE</span>
      </div>

      {/* Primary Focus Keyword configuration */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-extrabold uppercase text-slate-550 block font-sans tracking-wide">Target Focus Keyword</label>
          <span className="text-[9px] text-slate-400 font-mono">Align headers for index boost</span>
        </div>
        <input
          type="text"
          className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-250 rounded-xl focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
          placeholder="e.g. birthday baskets, cakes Kathmandu, matching flowers"
          value={focusInput}
          onChange={(e) => handleKeywordChange(e.target.value)}
        />
        <p className="text-[10px] text-slate-400 leading-tight">
          The main term you wish to search-optimise this specific page for. Score improves when it sits in URLs, titles, and body parameters.
        </p>
      </div>

      {/* Large Score Meter Board */}
      <div className="p-4 bg-white border border-slate-200/70 rounded-2xl flex flex-col md:flex-row items-center gap-5">
        <div className="flex flex-col items-center justify-center shrink-0 w-24 h-24 rounded-full border-4 border-slate-100 bg-slate-50 relative">
          <span className={`text-2xl font-black ${results.score >= 70 ? 'text-emerald-600' : results.score >= 50 ? 'text-amber-500' : 'text-rose-600 font-mono'}`}>{results.score}%</span>
          <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400">SEO Score</span>
        </div>

        <div className="flex-1 w-full space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-slate-800">SEO Standing: <span className="underline decoration-pink-300 font-extrabold">{results.grade}</span></span>
              <p className="text-[10px] text-slate-400 mt-0.5">Weighted metrics based on semantic search ranking rules.</p>
            </div>
          </div>

          {/* Weighted Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${getScoreProgressColor(results.score)}`}
              style={{ width: `${results.score}%` }}
            />
          </div>

          {/* Breakdown checklist mini blocks */}
          <div className="grid grid-cols-5 gap-1.5 text-center">
            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-150">
              <span className="block text-[8px] text-slate-450 font-bold uppercase">Meta</span>
              <span className="text-[10px] font-bold font-mono text-slate-700">{results.metaScore}%</span>
            </div>
            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-150">
              <span className="block text-[8px] text-slate-450 font-bold uppercase">Content</span>
              <span className="text-[10px] font-bold font-mono text-slate-700">{results.contentScore}%</span>
            </div>
            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-150">
              <span className="block text-[8px] text-slate-450 font-bold uppercase">Tech</span>
              <span className="text-[10px] font-bold font-mono text-slate-700">{results.technicalScore}%</span>
            </div>
            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-150">
              <span className="block text-[8px] text-slate-450 font-bold uppercase">Media</span>
              <span className="text-[10px] font-bold font-mono text-slate-700">{results.mediaScore}%</span>
            </div>
            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-150">
              <span className="block text-[8px] text-slate-450 font-bold uppercase">Links</span>
              <span className="text-[10px] font-bold font-mono text-slate-700">{results.linkingScore}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action / Tabs Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('checklist')}
          className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition ${activeSubTab === 'checklist' ? 'border-rose-600 text-rose-700' : 'border-transparent text-slate-450 hover:text-slate-700'}`}
        >
          Audit Checklist ({results.checks.length})
        </button>
        <button
          onClick={() => setActiveSubTab('google')}
          className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition ${activeSubTab === 'google' ? 'border-rose-600 text-rose-700' : 'border-transparent text-slate-450 hover:text-slate-700'}`}
        >
          Google Search
        </button>
        <button
          onClick={() => setActiveSubTab('social')}
          className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition ${activeSubTab === 'social' ? 'border-rose-600 text-rose-700' : 'border-transparent text-slate-450 hover:text-slate-700'}`}
        >
          Social Share
        </button>
        <button
          onClick={() => setActiveSubTab('schema')}
          className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition ${activeSubTab === 'schema' ? 'border-rose-600 text-rose-700' : 'border-transparent text-slate-450 hover:text-slate-700'}`}
        >
          JSON-LD Schema
        </button>
      </div>

      {/* Tab Panels */}
      {activeSubTab === 'checklist' && (
        <div className="space-y-4 max-h-[290px] overflow-y-auto pr-1">
          {/* Critical Errors */}
          {errors.length > 0 && (
            <div className="space-y-2">
              <span className="text-[9px] uppercase font-bold tracking-widest text-rose-600 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 shrink-0" /> Unique Crucial Errors ({errors.length})
              </span>
              <div className="space-y-1.5">
                {errors.map((chk, idx) => (
                  <div key={idx} className="p-2.5 bg-rose-50/50 border border-rose-150 rounded-xl text-slate-700 text-xs flex items-start gap-2.5">
                    <span className="p-0.5 bg-rose-600 text-white font-mono text-[9px] font-black rounded h-4 w-4 flex items-center justify-center shrink-0">-</span>
                    <span>{chk.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-slate-200/50">
              <span className="text-[9px] uppercase font-bold tracking-widest text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Optimization Warnings ({warnings.length})
              </span>
              <div className="space-y-1.5">
                {warnings.map((chk, idx) => (
                  <div key={idx} className="p-2.5 bg-amber-50/50 border border-amber-150 rounded-xl text-slate-700 text-xs flex items-start gap-2.5">
                    <span className="p-0.5 bg-amber-500 text-white font-mono text-[9px] font-black rounded h-4 w-4 flex items-center justify-center shrink-0">!</span>
                    <span>{chk.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success items */}
          {passes.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-slate-200/50">
              <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Approved Passed Checks ({passes.length})
              </span>
              <div className="space-y-1">
                {passes.map((chk, idx) => (
                  <div key={idx} className="p-2 bg-emerald-50/20 border border-emerald-100 rounded-lg text-slate-650 text-[11px] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0"></span>
                    <span>{chk.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'google' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-white p-1 rounded-lg border">
            <span className="text-[10px] text-slate-400 pl-2 font-bold font-mono">Google Snippet Mockup</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDevicePreview('mobile')}
                className={`p-1 px-2.5 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${devicePreview === 'mobile' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                <Smartphone className="w-3 h-3" /> Mobile
              </button>
              <button
                onClick={() => setDevicePreview('desktop')}
                className={`p-1 px-2.5 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${devicePreview === 'desktop' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                <Monitor className="w-3 h-3" /> Desktop
              </button>
            </div>
          </div>

          <div className="bg-white border rounded-xl p-4 shadow-2xs">
            {devicePreview === 'mobile' ? (
              // Mobile layout
              <div className="space-y-1 text-left max-w-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-100 border flex items-center justify-center text-[10px] font-mono shrink-0">K</div>
                  <div>
                    <span className="block text-[11px] text-[#202124] leading-tight font-sans">Koseli Express</span>
                    <span className="block text-[9px] text-[#5f6368] font-mono leading-none">{mockedUrl}</span>
                  </div>
                </div>
                <h3 className="text-[#1a0dab] hover:underline text-base font-medium font-sans leading-tight mt-1 cursor-pointer">
                  {metaTitlePreview}
                </h3>
                <p className="text-xs text-[#4d5156] font-sans leading-normal line-clamp-2 pt-0.5">
                  {metaDescPreview}
                </p>
              </div>
            ) : (
              // Desktop layout
              <div className="space-y-1 text-left">
                <span className="block text-[12px] text-[#202124] font-sans font-normal leading-tight">{domainMock} › {type} › {displaySlug}</span>
                <h3 className="text-[#1a0dab] hover:underline text-lg font-normal font-sans leading-snug cursor-pointer">
                  {metaTitlePreview}
                </h3>
                <p className="text-xs text-[#4d5156] font-sans leading-normal line-clamp-2 max-w-xl">
                  {metaDescPreview}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'social' && (
        <div className="space-y-3">
          <span className="text-[10px] text-slate-400 block font-bold font-mono">Social Graph Card (Facebook/WhatsApp)</span>
          
          <div className="bg-slate-100 border border-slate-200/80 rounded-xl overflow-hidden max-w-sm mx-auto shadow-2xs">
            {/* mock social image placeholder */}
            <div className="aspect-video bg-neutral-800 flex items-center justify-center relative overflow-hidden">
              {item.images && item.images[0] ? (
                <img src={item.images[0]} className="w-full h-full object-cover opacity-80" alt="" />
              ) : item.image ? (
                <img src={item.image} className="w-full h-full object-cover opacity-80" alt="" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-tr from-neutral-900 to-rose-950 flex flex-col justify-end p-4">
                  <span className="text-rose-500 text-[10px] font-mono uppercase font-black">Koseli Celebration</span>
                  <span className="text-white text-xs font-black truncate">{metaTitlePreview}</span>
                </div>
              )}
              <span className="absolute top-2.5 right-2.5 text-[8px] bg-black/60 text-white font-mono px-2 py-0.5 rounded backdrop-blur-xs font-bold uppercase tracking-widest">OG:IMAGE</span>
            </div>

            <div className="bg-white p-3.5 border-t text-left space-y-1">
              <span className="text-[9px] font-mono uppercase font-bold tracking-widest text-[#606770]">{domainMock.toUpperCase()}</span>
              <h4 className="font-sans font-bold text-slate-800 text-xs truncate">{metaTitlePreview}</h4>
              <p className="text-slate-500 text-[11px] font-sans line-clamp-2 leading-tight">
                {metaDescPreview}
              </p>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'schema' && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-400 font-bold font-mono">Auto-Generated JSON-LD Schema</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(results.schemaJson);
                alert('Schema.org Microdata copied to clipboard!');
              }}
              className="p-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold rounded"
            >
              Copy Code
            </button>
          </div>
          <pre className="bg-slate-900 text-slate-300 p-3 rounded-xl text-[10px] font-mono overflow-auto max-h-[180px] text-left">
            {results.schemaJson}
          </pre>
        </div>
      )}

    </div>
  );
}
