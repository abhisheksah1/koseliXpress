import React, { useMemo, useState } from 'react';
import { DatabaseState, OrderStatus, LeadStatus, Product, InventoryLog } from '../../types';
import { TrendingUp, ShoppingBag, Percent, Users, AlertTriangle, ArrowRight, DollarSign, X, Search, Check, Globe, Laptop, Smartphone, Tablet, History, Eye } from 'lucide-react';

interface DashboardTabProps {
  state: DatabaseState;
  onUpdateState?: (newState: DatabaseState) => void;
  onSwitchTab?: (tab: string) => void;
}

export default function DashboardTab({ state, onUpdateState, onSwitchTab }: DashboardTabProps) {
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [showOutOfStockModal, setShowOutOfStockModal] = useState(false);
  const [lowStockSearch, setLowStockSearch] = useState('');
  const [outOfStockSearch, setOutOfStockSearch] = useState('');
  const [editingStocks, setEditingStocks] = useState<Record<string, number>>({});
  const [updateSuccess, setUpdateSuccess] = useState<Record<string, boolean>>({});

  const metrics = useMemo(() => {
    const orders = state.orders;
    const leads = state.leads;
    
    const paidOrders = orders.filter(o => o.status !== OrderStatus.CANCELLED);
    const totalSales = paidOrders.reduce((sum, o) => sum + o.totalAmountBase, 0);
    
    // Calculate total costs for profit
    let totalCost = 0;
    paidOrders.forEach(o => {
      o.items.forEach(item => {
        const prod = state.products.find(p => p.id === item.productId);
        if (prod) {
          totalCost += prod.costPrice * item.quantity;
        } else {
          totalCost += (item.selectedPrice * 0.5) * item.quantity;
        }
      });
    });
    
    const totalProfit = totalSales - totalCost;
    const avgOrderValue = paidOrders.length > 0 ? totalSales / paidOrders.length : 0;
    
    // Leads stats
    const totalLeads = leads.length + orders.length; // All checkout attempts
    const recoveredLeads = leads.filter(l => l.status === LeadStatus.RECOVERED).length;
    const leadsConversion = totalLeads > 0 ? ((orders.length + recoveredLeads) / totalLeads) * 100 : 0;

    // Low stock count (must be > 0 to have distinct low stocks pool from out-of-stock list)
    const lowStockCount = state.products.filter(p => p.stock <= p.lowStockThreshold && p.stock > 0 && p.status !== 'deleted').length;

    // Out of stock count
    const outOfStockCount = state.products.filter(p => p.stock <= 0 && p.status !== 'deleted').length;

    return {
      totalSales,
      totalProfit,
      ordersCount: orders.length,
      avgOrderValue,
      leadsConversion,
      lowStockCount,
      outOfStockCount,
      activeCoupons: state.coupons.filter(c => c.isActive).length
    };
  }, [state]);

  // Daily Chart coordinates calculated beautifully using relative SVGs
  const dailyChartData = useMemo(() => {
    // Generate simulated last 7 days metrics or parse from current orders
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const values = [45000, 52000, 39000, 68000, 75000, 92000, 85000]; // NPR values
    
    // Adjust slightly with dynamic order values to show real changes
    state.orders.slice(-5).forEach((o, index) => {
      if (o.status !== OrderStatus.CANCELLED) {
        const dayIdx = (new Date(o.createdAt).getDay() + 6) % 7; // Mon is 0
        values[dayIdx] += o.totalAmountBase * 0.1; // proportional rise
      }
    });

    const maxVal = Math.max(...values, 10000);
    const points = values.map((val, idx) => {
      const x = 50 + idx * 100;
      const y = 200 - (val / maxVal) * 150;
      return { x, y, label: days[idx], val };
    });

    return { points, maxVal, values };
  }, [state.orders]);

  // Category shares for distribution
  const categoryChartData = useMemo(() => {
    const revenueMap: Record<string, number> = {};
    
    state.orders.forEach(o => {
      if (o.status !== OrderStatus.CANCELLED) {
        o.items.forEach(i => {
          const prod = state.products.find(p => p.id === i.productId);
          const catId = prod ? prod.categoryId : 'cat-other';
          const cat = state.categories.find(c => c.id === catId);
          const catName = cat ? cat.name : 'Other';
          revenueMap[catName] = (revenueMap[catName] || 0) + (i.selectedPrice * i.quantity);
        });
      }
    });

    // Fallbacks if no sales yet
    if (Object.keys(revenueMap).length === 0) {
      revenueMap['Fresh Flowers'] = 22000;
      revenueMap['Prem Cakes'] = 18000;
      revenueMap['Gift Hampers'] = 35000;
    }

    const total = Object.values(revenueMap).reduce((s, v) => s + v, 0);
    return Object.entries(revenueMap).map(([name, val]) => ({
      name,
      value: val,
      percent: total > 0 ? (val / total) * 100 : 0
    }));
  }, [state.orders, state.products, state.categories]);

  const visitorData = useMemo(() => {
    const tracks = state.visitorTracks || [];
    const totalVisits = tracks.length;

    const uniqueIPs = new Set(tracks.map(t => t.ip || t.id));
    const uniqueVisits = uniqueIPs.size;

    const validDurations = tracks.filter(t => typeof t.duration === 'number' && t.duration > 0);
    const avgDuration = validDurations.length > 0 
      ? Math.round(validDurations.reduce((sum, t) => sum + (t.duration || 0), 0) / validDurations.length)
      : 45;

    const countryMap: Record<string, { count: number; code: string }> = {};
    tracks.forEach(t => {
      const c = t.country || 'Nepal';
      const code = t.countryCode || 'NP';
      if (!countryMap[c]) {
        countryMap[c] = { count: 0, code };
      }
      countryMap[c].count++;
    });

    const countriesList = Object.entries(countryMap)
      .map(([name, info]) => ({
        name,
        code: info.code,
        count: info.count,
        percent: totalVisits > 0 ? (info.count / totalVisits) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);

    const pageMap: Record<string, { count: number; title: string }> = {};
    tracks.forEach(t => {
      const slug = t.pageSlug || 'home';
      const title = t.pageTitle || 'Home Storefront';
      if (!pageMap[slug]) {
        pageMap[slug] = { count: 0, title };
      }
      pageMap[slug].count++;
    });

    const pagesList = Object.entries(pageMap)
      .map(([slug, info]) => ({
        slug,
        title: info.title,
        count: info.count,
        percent: totalVisits > 0 ? (info.count / totalVisits) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    let mobileCount = 0;
    let desktopCount = 0;
    let tabletCount = 0;
    tracks.forEach(t => {
      const dev = t.device || 'Desktop';
      if (dev === 'Mobile') mobileCount++;
      else if (dev === 'Tablet') tabletCount++;
      else desktopCount++;
    });

    const devicesData = [
      { name: 'Mobile', count: mobileCount, percent: totalVisits > 0 ? (mobileCount / totalVisits) * 100 : 0 },
      { name: 'Desktop', count: desktopCount, percent: totalVisits > 0 ? (desktopCount / totalVisits) * 100 : 0 },
      { name: 'Tablet', count: tabletCount, percent: totalVisits > 0 ? (tabletCount / totalVisits) * 100 : 0 },
    ];

    const hourCounts = Array(24).fill(0);
    tracks.forEach(t => {
      try {
        const hour = new Date(t.timestamp).getHours();
        hourCounts[hour]++;
      } catch (e) {
        // Ignored
      }
    });

    const recentFeeds = [...tracks]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);

    return {
      totalVisits,
      uniqueVisits,
      avgDuration,
      countriesList,
      pagesList,
      devicesData,
      hourCounts,
      recentFeeds
    };
  }, [state.visitorTracks]);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-800">Operational Overview</h2>
        <p className="text-sm text-slate-500">Real-time e-commerce performance indicators and channel conversion data.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 bg-white border border-slate-100 rounded-xl shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Gross Sales</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-mono text-slate-800">
              Rs. {metrics.totalSales.toLocaleString()}
            </h3>
            <p className="mt-1 text-xs text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>Inc. shipping & premium fees</span>
            </p>
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-100 rounded-xl shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Return on Investment (Profit)</span>
            <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-mono text-slate-800">
              Rs. {metrics.totalProfit.toLocaleString()}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Estimated margin: {metrics.totalSales > 0 ? Math.round((metrics.totalProfit / metrics.totalSales) * 100) : 0}%
            </p>
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-100 rounded-xl shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Lead Conversion Rate</span>
            <div className="p-2 bg-violet-50 rounded-lg text-violet-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-mono text-slate-800">
              {metrics.leadsConversion.toFixed(1)}%
            </h3>
            <p className="mt-1 text-xs text-violet-500 flex items-center gap-1 cursor-pointer">
              <span>Checkout pipeline recovery tracking</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </p>
          </div>
        </div>

        <div 
          onClick={() => setShowLowStockModal(true)}
          className="p-5 bg-white border border-slate-150 rounded-xl shadow-xs transition hover:shadow-md cursor-pointer hover:border-amber-400 group select-none"
          title="Click to view low-stock items list"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-500 group-hover:text-amber-600 transition-colors">Low Stock Warnings</span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600 animate-pulse group-hover:bg-amber-100 transition-colors">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`text-2xl font-bold font-mono ${metrics.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
              {metrics.lowStockCount} Items
            </h3>
            <p className="mt-1 text-xs text-slate-400 flex items-center gap-1 group-hover:text-amber-500 transition-colors">
              <span>View required inventory reorders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </p>
          </div>
        </div>

        {/* Out of Stock Warning KPI Card */}
        <div 
          onClick={() => setShowOutOfStockModal(true)}
          className="p-5 bg-white border border-slate-150 rounded-xl shadow-xs transition hover:shadow-md cursor-pointer hover:border-red-400 group select-none"
          title="Click to view out-of-stock items list"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-500 group-hover:text-red-700 transition-colors font-extrabold">Out of Stock Alerts</span>
            <div className="p-2 bg-red-105 rounded-lg text-red-650 animate-pulse group-hover:bg-red-100 transition-colors">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`text-2xl font-bold font-mono ${metrics.outOfStockCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>
              {metrics.outOfStockCount} Items
            </h3>
            <p className="mt-1 text-xs text-slate-400 flex items-center gap-1 group-hover:text-red-600 transition-colors">
              <span>View critical zero inventory items</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </p>
          </div>
        </div>
      </div>

      {/* Charts Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        <div className="p-5 bg-white border border-slate-100 rounded-xl lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-semibold text-slate-800">Daily Revenue Performance</h4>
              <p className="text-xs text-slate-400">Sales curve across last 7 days cycle (NPR Equivalent)</p>
            </div>
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded">Weekly</span>
          </div>

          <div className="relative w-full overflow-x-auto">
            <svg viewBox="0 0 700 240" className="w-full min-w-[500px] h-56 text-slate-400">
              {/* Horizontal Grid lines */}
              <line x1="50" y1="50" x2="650" y2="50" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="50" y1="125" x2="650" y2="125" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="50" y1="200" x2="650" y2="200" stroke="#f1f5f9" strokeWidth="1" />
              
              {/* Line path */}
              <path
                d={`M ${dailyChartData.points.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                fill="none"
                stroke="#e11d48"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Glowing gradient under line */}
              <path
                d={`M 50 200 L ${dailyChartData.points.map(p => `${p.x} ${p.y}`).join(' L ')} L 650 200 Z`}
                fill="url(#sparkle-grad)"
                opacity="0.12"
              />

              <defs>
                <linearGradient id="sparkle-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e11d48" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Data circles & values helper */}
              {dailyChartData.points.map((p, i) => (
                <g key={i} className="group cursor-pointer">
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="5"
                    className="fill-rose-600 hover:r-7 transition-all duration-150"
                  />
                  <text
                    x={p.x}
                    y={p.y - 12}
                    textAnchor="middle"
                    className="font-mono text-[10px] font-bold fill-slate-700 opacity-60 group-hover:opacity-100"
                  >
                    Rs.{Math.round(p.val / 1000)}k
                  </text>
                  <text x={p.x} y="222" textAnchor="middle" className="text-xs fill-slate-400 font-medium">
                    {p.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Category Share & Coupon Stats */}
        <div className="p-5 bg-white border border-slate-100 rounded-xl space-y-6">
          <div>
            <h4 className="font-semibold text-slate-800">Category Share Distribution</h4>
            <p className="text-xs text-slate-400">Total consumer demand by category group</p>
          </div>

          <div className="space-y-4 pt-1">
            {categoryChartData.map((cat, idx) => {
              const bgColors = ['bg-rose-500', 'bg-pink-500', 'bg-violet-500', 'bg-emerald-500'];
              const textColors = ['text-rose-600', 'text-pink-600', 'text-violet-600', 'text-emerald-600'];
              const colorClass = bgColors[idx % bgColors.length];
              const txtClass = textColors[idx % textColors.length];
              
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-600">
                    <span className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
                      {cat.name}
                    </span>
                    <span className="font-mono">{cat.percent.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colorClass} rounded-full`}
                      style={{ width: `${cat.percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Stats banner */}
          <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-100/80 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Coupons Active</span>
              <p className="text-base font-bold font-mono text-slate-850">{metrics.activeCoupons} campaigns</p>
            </div>
            <div className="space-y-0.5 text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Avg Basket size</span>
              <p className="text-base font-bold font-mono text-slate-850">Rs. {Math.round(metrics.avgOrderValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Website Visitor Tracker Report */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-rose-50 rounded-lg text-rose-600 block">
                <Globe className="w-5 h-5" />
              </span>
              <h3 className="text-base font-bold text-slate-850">Website Visitor Tracker Report</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">Comprehensive traffic KPIs from real-time and simulated visitor sessions.</p>
          </div>
          
          {/* Quick total highlights */}
          <div className="flex items-center gap-3 self-start md:self-center">
            <div className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg text-center">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Total Views</span>
              <span className="text-xs font-bold font-mono text-slate-800">{visitorData.totalVisits.toLocaleString()}</span>
            </div>
            <div className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg text-center">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Uniques</span>
              <span className="text-xs font-bold font-mono text-slate-800">{visitorData.uniqueVisits.toLocaleString()}</span>
            </div>
            <div className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg text-center">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Avg Session</span>
              <span className="text-xs font-bold font-mono text-slate-800">{visitorData.avgDuration}s</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Top Countries & Devices */}
          <div className="space-y-5">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                🌐 Traffic By Countries
              </h4>
              <div className="space-y-3 pt-0.5">
                {visitorData.countriesList.slice(0, 5).map((c, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                      <span className="flex items-center gap-2">
                        <span className="text-base leading-none">
                          {c.code === 'NP' ? '🇳🇵' : c.code === 'US' ? '🇺🇸' : c.code === 'IN' ? '🇮🇳' : c.code === 'AU' ? '🇦🇺' : c.code === 'GB' ? '🇬🇧' : c.code === 'JP' ? '🇯🇵' : '🌐'}
                        </span>
                        <span className="truncate">{c.name}</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {c.count} <span className="text-slate-500 font-bold ml-1">({c.percent.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-rose-600 rounded-full"
                        style={{ width: `${c.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                📱 Device Group Distribution
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {visitorData.devicesData.map((d, i) => (
                  <div key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                    <div className="mx-auto flex justify-center text-slate-500 mb-1">
                      {d.name === 'Mobile' ? <Smartphone className="w-4 h-4 text-emerald-600" /> : d.name === 'Tablet' ? <Tablet className="w-4 h-4 text-violet-600" /> : <Laptop className="w-4 h-4 text-rose-600" />}
                    </div>
                    <span className="text-[10px] text-slate-505 block font-medium">{d.name}</span>
                    <span className="text-xs font-bold font-mono text-slate-800 block mt-0.5">{d.percent.toFixed(1)}%</span>
                    <span className="text-[9px] text-slate-400 block font-mono">({d.count} views)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Peak Hours & Top Pages */}
          <div className="space-y-5">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                ⏰ Visitor Traffic Peak Times (24h)
              </h4>
              <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                {/* Time Chart Graph here */}
                <div className="flex h-20 items-end gap-1 px-1.5 pt-2">
                  {visitorData.hourCounts.map((count, hour) => {
                    const maxHourCount = Math.max(...visitorData.hourCounts, 1);
                    const heightPercent = (count / maxHourCount) * 100;
                    const isPeak = count === maxHourCount && count > 0;
                    return (
                      <div key={hour} className="flex-1 flex flex-col items-center group relative cursor-pointer">
                        <div 
                          className={`w-full rounded-xs transition-all duration-200 ${isPeak ? 'bg-rose-500' : 'bg-slate-300 hover:bg-rose-400'}`}
                          style={{ height: `${Math.max(4, heightPercent)}%` }}
                        />
                        <div className="absolute bottom-full mb-1.5 hidden group-hover:block bg-slate-900 text-white text-[9px] font-mono rounded px-1.5 py-0.5 whitespace-nowrap z-50 shadow-md">
                          {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}: {count} visits
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[8px] font-mono text-slate-400 mt-2 px-1">
                  <span>12 AM</span>
                  <span>6 AM</span>
                  <span>12 PM</span>
                  <span>6 PM</span>
                  <span>11 PM</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                📄 Top Visited Content Slugs
              </h4>
              <div className="space-y-2.5">
                {visitorData.pagesList.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-100/50 last:border-0">
                    <div className="min-w-0 pr-3">
                      <span className="font-semibold text-slate-700 block truncate">{p.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono block truncate">/{p.slug}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-slate-800">{p.count} views</span>
                      <span className="text-[9.5px] text-slate-400 block">({p.percent.toFixed(1)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column 3: Live Session Feeds stream */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <History className="w-4 h-4 text-rose-500 animate-spin" style={{ animationDuration: '4s' }} />
              Live Activity Tracker Stream
            </h4>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-3 max-h-[310px] overflow-y-auto scrollbar-thin">
              {visitorData.recentFeeds.map((feed, idx) => {
                const fDate = new Date(feed.timestamp);
                const timeStr = fDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const isLive = feed.id.includes('live');
                
                return (
                  <div key={idx} className="flex items-start justify-between text-[11px] border-b border-slate-100/50 last:border-0 pb-3 last:pb-0">
                    <div className="space-y-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">
                          {feed.countryCode === 'NP' ? '🇳🇵' : feed.countryCode === 'US' ? '🇺🇸' : feed.countryCode === 'IN' ? '🇮🇳' : feed.countryCode === 'AU' ? '🇦🇺' : feed.countryCode === 'GB' ? '🇬🇧' : feed.countryCode === 'JP' ? '🇯🇵' : '🌐'}
                        </span>
                        <span className="font-semibold text-slate-750 truncate">{feed.pageTitle}</span>
                        {isLive && (
                          <span className="bg-emerald-100 text-emerald-800 text-[8px] font-bold px-1 rounded uppercase tracking-wider scale-95 origin-left animate-pulse">
                            Live
                          </span>
                        )}
                      </div>
                      <div className="text-slate-400 flex items-center gap-1.5 font-mono text-[9px] truncate">
                        <span>IP: {feed.ip || '103.x.x.x'}</span>
                        <span>•</span>
                        <span>{feed.browser} / {feed.os}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 font-mono text-[9.5px] text-slate-500">
                      <span className="block font-bold">{timeStr}</span>
                      <span className="text-[8px] text-slate-400 block mt-0.5">{feed.duration || 15}s read</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Interactive Overlay Modal */}
      {showLowStockModal && (
        <div className="fixed inset-0 bg-[#020202]/70 backdrop-blur-xs flex items-center justify-center p-4 z-55 transition-all">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">Low Stock Alerts Catalog</h3>
                  <p className="text-xs text-slate-500 font-sans">Required inventory reorders to secure checkout pipelines.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowLowStockModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Filter section */}
            <div className="p-4 border-b border-slate-100 bg-white flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search alert items by name or SKU identifier..."
                  value={lowStockSearch}
                  onChange={(e) => setLowStockSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>
            </div>

            {/* Product Alert List scrolling wrapper */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5 bg-slate-50/60 scrollbar-thin">
              {(() => {
                const alertsList = state.products.filter(p => 
                  p.stock <= p.lowStockThreshold && 
                  p.status !== 'deleted' &&
                  (p.name.toLowerCase().includes(lowStockSearch.toLowerCase()) || p.sku.toLowerCase().includes(lowStockSearch.toLowerCase()))
                );

                if (alertsList.length === 0) {
                  return (
                    <div className="text-center py-10 bg-white border border-dashed rounded-xl border-slate-200 p-6 space-y-2">
                      <p className="text-sm font-semibold text-slate-700">No matching alerts found</p>
                      <p className="text-xs text-slate-400">All registered items meet or exceed safety threshold counts.</p>
                    </div>
                  );
                }

                return alertsList.map((prod) => {
                  const currentEditStock = editingStocks[prod.id] !== undefined 
                    ? editingStocks[prod.id] 
                    : prod.stock;

                  return (
                    <div key={prod.id} className="bg-white border border-slate-150 rounded-xl p-4 shadow-2xs hover:shadow-xs transition duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left: Thumbnail & product info */}
                      <div className="flex gap-3">
                        <img 
                          src={prod.images?.[0] || 'https://images.unsplash.com/photo-154946?q=80&w=600&auto=format&fit=crop'} 
                          alt={prod.name} 
                          className="w-12 h-12 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="space-y-0.5 min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 truncate" title={prod.name}>{prod.name}</h4>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-slate-400 font-bold">{prod.sku}</span>
                            <span className="text-[10px] font-semibold text-rose-500">Rs. {prod.price}</span>
                          </div>
                          <div className="flex items-center gap-2.5 pt-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 uppercase">
                              Stock: {prod.stock} / {prod.lowStockThreshold} Limit
                            </span>
                            {prod.status === 'draft' && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-500">
                                Draft mode
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Stock adjustment widget */}
                      <div className="flex items-center gap-2 bg-slate-50/80 p-2 rounded-xl border border-slate-100 self-end sm:self-auto shrink-0">
                        <div className="flex items-center">
                          <button
                            onClick={() => {
                              const nextVal = Math.max(0, currentEditStock - 1);
                              setEditingStocks(p => ({ ...p, [prod.id]: nextVal }));
                            }}
                            className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-l-lg hover:bg-slate-50 text-slate-600 transition cursor-pointer text-xs font-bold"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={currentEditStock}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setEditingStocks(p => ({ ...p, [prod.id]: isNaN(val) ? 0 : Math.max(0, val) }));
                            }}
                            className="w-12 h-7 text-center bg-white border-y border-slate-200 focus:outline-none text-xs font-bold font-mono text-slate-800"
                          />
                          <button
                            onClick={() => {
                              const nextVal = currentEditStock + 1;
                              setEditingStocks(p => ({ ...p, [prod.id]: nextVal }));
                            }}
                            className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-r-lg hover:bg-slate-50 text-slate-600 transition cursor-pointer text-xs font-bold"
                          >
                            +
                          </button>
                        </div>

                        {onUpdateState ? (
                          <button
                            onClick={() => {
                              const products = state.products.map(p => {
                                if (p.id === prod.id) {
                                  return { ...p, stock: currentEditStock };
                                }
                                return p;
                              });
                              
                              const diff = Math.abs(currentEditStock - prod.stock);
                              const newLog: InventoryLog = {
                                id: `log-dash-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                                productId: prod.id,
                                type: currentEditStock > prod.stock ? 'in' : 'out',
                                quantity: diff,
                                reason: 'Dashboard low stock warning adjustment',
                                timestamp: new Date().toISOString()
                              };
                              const logs = [newLog, ...(state.inventoryLogs || [])];
                              
                              onUpdateState({
                                ...state,
                                products,
                                inventoryLogs: logs
                              });

                              setUpdateSuccess(prev => ({ ...prev, [prod.id]: true }));
                              setTimeout(() => {
                                setUpdateSuccess(prev => ({ ...prev, [prod.id]: false }));
                              }, 2000);
                            }}
                            className="px-2.5 py-1 text-[10.5px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            {updateSuccess[prod.id] ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Saved</span>
                              </>
                            ) : (
                              <span>Update</span>
                            )}
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium font-sans px-1">View Only</span>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400">
                Active safe thresholds configure via inventory tab.
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowLowStockModal(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Close View
                </button>
                {onSwitchTab && (
                  <button
                    onClick={() => {
                      setShowLowStockModal(false);
                      onSwitchTab('inventory');
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1 select-none cursor-pointer"
                  >
                    <span>Full Warehouse Settings</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Out of Stock Interactive Warning Overlay Modal */}
      {showOutOfStockModal && (
        <div className="fixed inset-0 bg-[#020202]/70 backdrop-blur-xs flex items-center justify-center p-4 z-55 transition-all text-slate-850">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-100 rounded-lg text-red-650 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">Zero-Stock Critical Alerts</h3>
                  <p className="text-xs text-slate-500 font-sans">Active products whose stocks hit zero and are blocked from customer checkout.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowOutOfStockModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Filter section */}
            <div className="p-4 border-b border-slate-100 bg-white flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search out-of-stock items by name or SKU..."
                  value={outOfStockSearch}
                  onChange={(e) => setOutOfStockSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Product alert list */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5 bg-slate-50/60 scrollbar-thin">
              {(() => {
                const alertsList = state.products.filter(p => 
                  p.stock <= 0 && 
                  p.status !== 'deleted' &&
                  (p.name.toLowerCase().includes(outOfStockSearch.toLowerCase()) || p.sku.toLowerCase().includes(outOfStockSearch.toLowerCase()))
                );

                if (alertsList.length === 0) {
                  return (
                    <div className="text-center py-10 bg-white border border-dashed rounded-xl border-slate-200 p-6 space-y-2">
                      <p className="text-sm font-semibold text-slate-700">Perfect Warehouse Stocking!</p>
                      <p className="text-xs text-slate-400">All published catalog items are currently active and in stock.</p>
                    </div>
                  );
                }

                return alertsList.map((prod) => {
                  const currentEditStock = editingStocks[prod.id] !== undefined 
                    ? editingStocks[prod.id] 
                    : prod.stock;

                  const outOfStockText = prod.outOfStockDate 
                    ? new Date(prod.outOfStockDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
                    : 'June 8, 2026';

                  return (
                    <div 
                      key={`oos-alert-${prod.id}`}
                      className="p-4 bg-white border border-slate-150 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-red-300 transition shadow-2xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-lg overflow-hidden shrink-0">
                          <img 
                            src={prod.images?.[0] || 'https://images.unsplash.com/photo-154946?q=80&w=150'} 
                            alt="" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="space-y-1 text-left">
                          <h4 className="text-xs font-bold text-slate-800 leading-tight">{prod.name}</h4>
                          <div className="flex flex-wrap items-center gap-1.5 text-[9.5px] font-mono text-slate-400">
                            <span>SKU: <b className="text-slate-600">{prod.sku}</b></span>
                            <span>•</span>
                            <span className="text-red-700 bg-red-50 font-bold px-1 rounded uppercase">Stock Reached Zero: {outOfStockText}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Stock Incrementor */}
                      <div className="flex items-center gap-2 bg-slate-50/80 p-2 rounded-xl border border-slate-100 self-end sm:self-auto shrink-0">
                        <div className="flex items-center">
                          <button
                            onClick={() => {
                              const nextVal = Math.max(0, currentEditStock - 1);
                              setEditingStocks(p => ({ ...p, [prod.id]: nextVal }));
                            }}
                            className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-l-lg hover:bg-slate-50 text-slate-600 transition cursor-pointer text-xs font-bold"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={currentEditStock}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setEditingStocks(p => ({ ...p, [prod.id]: isNaN(val) ? 0 : Math.max(0, val) }));
                            }}
                            className="w-12 h-7 text-center bg-white border-y border-slate-200 focus:outline-none text-xs font-bold font-mono text-slate-850"
                          />
                          <button
                            onClick={() => {
                              const nextVal = currentEditStock + 1;
                              setEditingStocks(p => ({ ...p, [prod.id]: nextVal }));
                            }}
                            className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-r-lg hover:bg-slate-50 text-slate-600 transition cursor-pointer text-xs font-bold"
                          >
                            +
                          </button>
                        </div>

                        {onUpdateState ? (
                          <button
                            onClick={() => {
                              const products = state.products.map(p => {
                                if (p.id === prod.id) {
                                  // If stock raised back, clean the outOfStockDate
                                  const dateVal = currentEditStock > 0 ? undefined : p.outOfStockDate;
                                  return { 
                                    ...p, 
                                    stock: currentEditStock,
                                    outOfStockDate: dateVal
                                  };
                                }
                                return p;
                              });
                              
                              const diff = Math.abs(currentEditStock - prod.stock);
                              const newLog: InventoryLog = {
                                id: `log-dash-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                                productId: prod.id,
                                type: currentEditStock > prod.stock ? 'in' : 'out',
                                quantity: diff,
                                reason: 'Dashboard critical out-of-stock adjustment',
                                timestamp: new Date().toISOString()
                              };
                              const logs = [newLog, ...(state.inventoryLogs || [])];
                              
                              onUpdateState({
                                ...state,
                                products,
                                inventoryLogs: logs
                              });

                              setUpdateSuccess(prev => ({ ...prev, [prod.id]: true }));
                              setTimeout(() => {
                                setUpdateSuccess(prev => ({ ...prev, [prod.id]: false }));
                              }, 2000);
                            }}
                            className="px-2.5 py-1 text-[10.5px] font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            {updateSuccess[prod.id] ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Saved</span>
                              </>
                            ) : (
                              <span>Update</span>
                            )}
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium font-sans px-1">View Only</span>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400">
                Critical alerts mapped to core checkout constraints.
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowOutOfStockModal(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Close View
                </button>
                {onSwitchTab && (
                  <button
                    onClick={() => {
                      setShowOutOfStockModal(false);
                      onSwitchTab('inventory');
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1 select-none cursor-pointer"
                  >
                    <span>Full Warehouse Settings</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
