import React, { useState, useMemo } from 'react';
import { DatabaseState, Product, Category, DynamicPage } from '../../types';
import { runSEOChecks } from '../../utils/seo';
import { 
  Sparkles, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  ArrowUpRight, 
  Filter, 
  Settings, 
  ShoppingBag, 
  Layers, 
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';

interface SEOTabProps {
  state: DatabaseState;
  onUpdateState: (newState: DatabaseState) => void;
  onSwitchTab: (tab: 'dashboard' | 'products' | 'inventory' | 'orders' | 'pages' | 'reviews' | 'coupons' | 'settings' | 'accounting' | 'seo') => void;
}

export default function SEOTab({ state, onUpdateState, onSwitchTab }: SEOTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStanding, setFilterStanding] = useState<'all' | 'critical' | 'improvement' | 'excellent'>('all');
  const [filterType, setFilterType] = useState<'all' | 'product' | 'category' | 'page'>('all');

  // 1. Compile all items to evaluate
  const evaluatedItems = useMemo(() => {
    const list: {
      id: string;
      title: string;
      slug: string;
      type: 'product' | 'category' | 'page';
      score: number;
      grade: string;
      criticalCount: number;
      warningCount: number;
      passCount: number;
      itemReference: any;
    }[] = [];

    // Products
    const liveProducts = (state.products || []).filter(p => p.status !== 'deleted');
    liveProducts.forEach(p => {
      const audit = runSEOChecks('product', p, p.focusKeyword, state.products, state.categories, state.pages);
      list.push({
        id: p.id,
        title: p.name,
        slug: p.slug,
        type: 'product',
        score: audit.score,
        grade: audit.grade,
        criticalCount: audit.checks.filter(c => c.status === 'error').length,
        warningCount: audit.checks.filter(c => c.status === 'warning').length,
        passCount: audit.checks.filter(c => c.status === 'pass').length,
        itemReference: p
      });
    });

    // Categories
    (state.categories || []).forEach(c => {
      const audit = runSEOChecks('category', c, c.focusKeyword, state.products, state.categories, state.pages);
      list.push({
        id: c.id,
        title: c.name,
        slug: c.slug,
        type: 'category',
        score: audit.score,
        grade: audit.grade,
        criticalCount: audit.checks.filter(c => c.status === 'error').length,
        warningCount: audit.checks.filter(c => c.status === 'warning').length,
        passCount: audit.checks.filter(c => c.status === 'pass').length,
        itemReference: c
      });
    });

    // Custom Pages
    (state.pages || []).forEach(p => {
      const audit = runSEOChecks('page', p, p.focusKeyword, state.products, state.categories, state.pages);
      list.push({
        id: p.id,
        title: p.title,
        slug: p.slug,
        type: 'page',
        score: audit.score,
        grade: audit.grade,
        criticalCount: audit.checks.filter(c => c.status === 'error').length,
        warningCount: audit.checks.filter(c => c.status === 'warning').length,
        passCount: audit.checks.filter(c => c.status === 'pass').length,
        itemReference: p
      });
    });

    return list;
  }, [state.products, state.categories, state.pages]);

  // 2. Metrics aggregation
  const metrics = useMemo(() => {
    const totalProducts = (state.products || []).filter(p => p.status !== 'deleted').length;
    const totalCategories = (state.categories || []).length;
    const totalPages = (state.pages || []).length;
    const totalTracked = evaluatedItems.length;

    const sumScore = evaluatedItems.reduce((acc, curr) => acc + curr.score, 0);
    const avgScore = totalTracked > 0 ? Math.round(sumScore / totalTracked) : 0;

    const criticalCount = evaluatedItems.filter(item => item.criticalCount > 0 || item.score < 50).length;
    const needOptimizationCount = evaluatedItems.filter(item => item.score >= 50 && item.score < 90).length;

    // Top performers sorted by score desc
    const topPerformers = [...evaluatedItems]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return {
      totalProducts,
      totalCategories,
      totalPages,
      avgScore,
      criticalCount,
      needOptimizationCount,
      topPerformers
    };
  }, [evaluatedItems, state.products, state.categories, state.pages]);

  // 3. Filtering logic
  const filteredList = useMemo(() => {
    return evaluatedItems.filter(item => {
      // search match
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = query === '' || 
        item.title.toLowerCase().includes(query) || 
        item.slug.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query);

      // type match
      const matchesType = filterType === 'all' || item.type === filterType;

      // standing match
      let matchesStanding = true;
      if (filterStanding === 'critical') {
        matchesStanding = item.criticalCount > 0 || item.score < 50;
      } else if (filterStanding === 'improvement') {
        matchesStanding = item.score >= 50 && item.score < 90;
      } else if (filterStanding === 'excellent') {
        matchesStanding = item.score >= 90;
      }

      return matchesSearch && matchesType && matchesStanding;
    });
  }, [evaluatedItems, searchQuery, filterType, filterStanding]);

  const getStandingBadge = (score: number, criticals: number) => {
    if (criticals > 0 || score < 50) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] bg-rose-50 text-rose-700 border border-rose-150 px-2 py-0.5 rounded-full font-bold">
          <XCircle className="w-3 h-3" /> Poor / Crucial
        </span>
      );
    }
    if (score >= 90) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-150 px-2 py-0.5 rounded-full font-bold">
          <CheckCircle className="w-3 h-3" /> Excellent
        </span>
      );
    }
    if (score >= 70) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] bg-teal-50 text-teal-700 border border-teal-150 px-2 py-0.5 rounded-full font-bold">
          <CheckCircle className="w-3 h-3" /> Good
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full font-bold">
        <AlertTriangle className="w-3 h-3" /> Needs Work
      </span>
    );
  };

  const getScoreColorHex = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 70) return 'text-teal-600';
    if (score >= 50) return 'text-amber-500';
    return 'text-rose-600 font-mono';
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-rose-500 block">System Console Audit</span>
          <h2 className="text-xl font-bold text-slate-850">Search Engine Optimisation (SEO) Console Dashboard</h2>
          <p className="text-xs text-slate-400 mt-0.5">Evaluate metadata depth, keyword integrity, image alt configuration, and crawler graphs automatically.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="p-2 bg-gradient-to-tr from-rose-500 to-amber-400 text-white rounded-xl shadow-xs">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </span>
          <div className="text-right">
            <span className="text-[10px] uppercase text-slate-400 block font-bold leading-none">Global Index Rating</span>
            <span className="text-lg font-black text-slate-800">{metrics.avgScore}% Average</span>
          </div>
        </div>
      </div>

      {/* Roster of metrics summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total catalog items checked */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] tracking-wider uppercase font-bold text-slate-400">Inventory Checked</span>
            <span className="p-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-mono font-bold">NPR</span>
          </div>
          <div>
            <span className="text-2xl font-black text-slate-800 leading-none">{evaluatedItems.length}</span>
            <p className="text-[10px] text-slate-400">Products, categories & static paths combined.</p>
          </div>
          <div className="border-t border-slate-50 pt-2 flex justify-between text-[10px] text-slate-500">
            <span>Prod: <strong className="text-slate-700">{metrics.totalProducts}</strong></span>
            <span>Cat: <strong className="text-slate-700">{metrics.totalCategories}</strong></span>
            <span>Pages: <strong className="text-slate-700">{metrics.totalPages}</strong></span>
          </div>
        </div>

        {/* Average Search Score */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] tracking-wider uppercase font-bold text-slate-400">Avg Crawl Score</span>
            <span className="text-emerald-600 font-extrabold text-xs">▲ Target 85%</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-800 leading-none">{metrics.avgScore}%</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-black font-mono uppercase bg-slate-100 text-slate-700`}>
                {metrics.avgScore >= 80 ? 'Excellent' : 'Incomplete'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Weighted scores of live content segments.</p>
          </div>
          <div className="w-full bg-slate-150 h-1.5 rounded-full overflow-hidden mt-1 bg-neutral-100">
            <div 
              className="bg-rose-500 h-full rounded-full" 
              style={{ width: `${metrics.avgScore}%` }}
            />
          </div>
        </div>

        {/* Critical Errors */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs space-y-2">
          <div className="flex justify-between items-center text-rose-500">
            <span className="text-[10px] tracking-wider uppercase font-bold text-slate-400">Critical Red Alerts</span>
            <XCircle className="w-4 h-4 shrink-0" />
          </div>
          <div>
            <span className="text-2xl font-black text-rose-600 leading-none">{metrics.criticalCount}</span>
            <p className="text-[10px] text-slate-400">Pages with missing titles, descriptions, or URLs.</p>
          </div>
          <div className="text-[10px] text-rose-600 font-bold bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-lg w-fit">
            Require Immediate Patch
          </div>
        </div>

        {/* Optimization Warnings */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs space-y-2">
          <div className="flex justify-between items-center text-amber-500">
            <span className="text-[10px] tracking-wider uppercase font-bold text-slate-400">Pending Enhancements</span>
            <AlertTriangle className="w-4 h-4 shrink-0" />
          </div>
          <div>
            <span className="text-2xl font-black text-amber-500 leading-none">{metrics.needOptimizationCount}</span>
            <p className="text-[10px] text-slate-400">Items scoring between 50% and 89%.</p>
          </div>
          <div className="text-[10px] text-amber-600 font-bold bg-amber-55 text-amber-800 px-2 py-0.5 rounded-lg w-fit">
            Room for Improvement
          </div>
        </div>
      </div>

      {/* Middle Grid: Top Performers & Filter Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top 5 Performers Card */}
        <div className="lg:col-span-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs space-y-3">
          <div className="flex items-center gap-1.5 border-b pb-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-widest">Top Search-Tier Ranks</h3>
          </div>
          <div className="space-y-2.5">
            {metrics.topPerformers.map((item, idx) => (
              <div key={`${item.type}-${item.id}`} className="flex justify-between items-center p-2 rounded-xl bg-slate-50 border hover:border-slate-300 transition">
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-mono font-bold bg-slate-200 text-slate-600 px-1 py-0.2 rounded shrink-0">#{idx+1}</span>
                    <span className="text-xs font-bold text-slate-800 truncate block">{item.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block font-mono">/{item.slug}</span>
                </div>
                <span className={`text-sm font-black font-mono shrink-0 ${getScoreColorHex(item.score)}`}>
                  {item.score}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Broad Listing Audit and Interactive Filters */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <h3 className="font-bold text-slate-800 text-sm">Crawl Index Catalog ({filteredList.length})</h3>
            
            {/* Search filter input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                className="pl-9 pr-4 py-2 bg-slate-50 border focus:bg-white text-xs rounded-xl focus:ring-1 focus:ring-rose-500 w-full sm:w-60 focus:outline-hidden"
                placeholder="Search Title or Path slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Quick Category Filters */}
          <div className="flex flex-wrap items-center gap-2 border-b pb-3 border-slate-100">
            <span className="text-[10px] text-slate-400 uppercase font-mono font-bold flex items-center gap-1 pr-1">
              <SlidersHorizontal className="w-3 h-3" /> Filters:
            </span>
            
            {/* Type selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {(['all', 'product', 'category', 'page'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`text-[10px] font-bold px-2.5 py-0.8 rounded-md transition cursor-pointer capitalize ${filterType === type ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-750'}`}
                >
                  {type === 'all' ? 'All Types' : type}
                </button>
              ))}
            </div>

            {/* Standing index selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {(['all', 'critical', 'improvement', 'excellent'] as const).map(standing => (
                <button
                  key={standing}
                  onClick={() => setFilterStanding(standing)}
                  className={`text-[10px] font-bold px-2.5 py-0.8 rounded-md transition cursor-pointer capitalize ${filterStanding === standing ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-750'}`}
                >
                  {standing === 'all' ? 'All Standings' : standing === 'critical' ? '🔴 Poor / Critical' : standing === 'improvement' ? '🟡 Improvement' : '🟢 Excellent'}
                </button>
              ))}
            </div>
          </div>

          {/* Table List / Card deck */}
          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {filteredList.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed text-slate-400">
                <AlertTriangle className="w-8 h-8 mx-auto text-slate-350 animate-bounce mb-2" />
                <p className="text-xs font-bold text-slate-650">No search-tier items matched your filters.</p>
                <p className="text-[9px] mt-1">Clear filters or change parameters to restart mapping.</p>
              </div>
            ) : (
              filteredList.map(item => (
                <div 
                  key={`${item.type}-${item.id}`} 
                  className="p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-4 transition shadow-3xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded shrink-0 font-mono ${item.type === 'product' ? 'bg-indigo-50 text-indigo-700 border border-indigo-150' : item.type === 'category' ? 'bg-pink-100 text-pink-850' : 'bg-emerald-50 text-emerald-800 border border-emerald-150'}`}>
                        {item.type}
                      </span>
                      <strong className="text-slate-800 text-xs truncate block">{item.title}</strong>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] text-slate-450 leading-none">
                      <span className="font-mono">path: /{item.slug}</span>
                      <span className="text-slate-300">•</span>
                      <span>Checks: <strong className="text-slate-650">{item.passCount}✅ {item.warningCount}⚠️ {item.criticalCount}❌</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      {getStandingBadge(item.score, item.criticalCount)}
                      <div className="text-xs font-black font-mono text-slate-700 mt-0.5">{item.score}% SEO Score</div>
                    </div>
                    
                    {/* Switch tab directly widget */}
                    <button
                      onClick={() => {
                        if (item.type === 'product') {
                          onSwitchTab('products');
                        } else if (item.type === 'category') {
                          onSwitchTab('products');
                        } else if (item.type === 'page') {
                          onSwitchTab('pages');
                        }
                      }}
                      title="Optimize this item details"
                      className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-100 hover:border-rose-150 transition cursor-pointer bg-white"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
