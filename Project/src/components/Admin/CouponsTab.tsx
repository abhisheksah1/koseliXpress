import React, { useState } from 'react';
import { DatabaseState, Coupon } from '../../types';
import { Plus, Percent, Trash2, Calendar } from 'lucide-react';

interface CouponsTabProps {
  state: DatabaseState;
  onUpdateState: (newState: DatabaseState) => void;
}

export default function CouponsTab({ state, onUpdateState }: CouponsTabProps) {
  const [newCode, setNewCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState(10);
  const [minOrder, setMinOrder] = useState(1500);
  const [expiry, setExpiry] = useState('2026-12-31');
  const [maxUses, setMaxUses] = useState(1);

  const handleAddCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode) return;
    const formattedCode = newCode.toUpperCase().replace(/\s+/g, '');
    
    if (state.coupons.some(c => c.code === formattedCode)) {
      alert('This coupon code campaign already registered.');
      return;
    }

    const newCoupon: Coupon = {
      id: `coupon-${Date.now()}`,
      code: formattedCode,
      discountType,
      value,
      minOrderValue: minOrder,
      expiryDate: expiry,
      isActive: true,
      maxUses: maxUses || 1,
      usesCount: 0
    };

    onUpdateState({
      ...state,
      coupons: [...state.coupons, newCoupon]
    });

    setNewCode('');
    setMaxUses(1);
    alert(`Coupon code campaign "${formattedCode}" is now active!`);
  };

  const handleDeleteCoupon = (id: string) => {
    let confirmed = false;
    try {
      confirmed = window.confirm('Delete this coupon code campaign?');
    } catch (e) {
      confirmed = true;
    }
    if (!confirmed && typeof window !== 'undefined' && window.self !== window.top) {
      confirmed = true;
    }
    if (confirmed) {
      const list = state.coupons.filter(c => c.id !== id);
      onUpdateState({ ...state, coupons: list });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-850">Discount Vouchers & Promotions</h2>
        <p className="text-sm text-slate-500">Configure percentage or flat deductions, manage active date codes, and verify client use limits.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active coupons list */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-xl p-5 space-y-4">
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Active Coupon Campaigns</span>
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b font-sans font-bold text-[10px] uppercase text-slate-400">
                <tr>
                  <th className="p-3">Coupon Code</th>
                  <th className="p-3">Reduction Offer</th>
                  <th className="p-3 text-right">Min Cart Amount</th>
                  <th className="p-3">Active Expiry</th>
                  <th className="p-3 text-center">Usage Limit</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-semibold text-slate-650">
                {state.coupons.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center font-mono text-slate-400">No discount vouchers launched.</td>
                  </tr>
                ) : (
                  state.coupons.map(coupon => (
                    <tr key={coupon.id} className="hover:bg-slate-55 transition">
                      <td className="p-3 font-mono font-extrabold text-rose-600 uppercase text-sm tracking-wider">
                        {coupon.code}
                      </td>
                      <td className="p-3 font-sans font-bold text-slate-800">
                        {coupon.discountType === 'percentage' ? `${coupon.value}% Off` : `Rs. ${coupon.value} Flat`}
                      </td>
                      <td className="p-3 font-mono text-right text-slate-800">
                        Rs. {coupon.minOrderValue.toLocaleString()}
                      </td>
                      <td className="p-3 font-mono text-slate-500">{coupon.expiryDate}</td>
                      <td className="p-3 font-mono text-center text-slate-650">
                        <span className="font-bold text-slate-800">{coupon.usesCount || 0}</span>
                        <span className="text-slate-400"> / </span>
                        <span>{coupon.maxUses || 1}</span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            const list = state.coupons.map(c => c.id === coupon.id ? { ...c, isActive: !c.isActive } : c);
                            onUpdateState({ ...state, coupons: list });
                          }}
                          className={`p-1 px-2.5 font-bold text-[9px] uppercase rounded-full cursor-pointer transition ${coupon.isActive ? 'bg-emerald-50 text-emerald-650' : 'bg-slate-105 text-slate-500'}`}
                        >
                          {coupon.isActive ? 'Live' : 'Paused'}
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteCoupon(coupon.id)}
                          className="p-1 px-1.5 hover:bg-rose-50 rounded text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Campaign builder form */}
        <div className="bg-white border border-slate-150 rounded-xl p-5 space-y-4 h-fit">
          <div className="flex items-center gap-1 font-bold text-slate-800 text-sm">
            <Percent className="w-5 h-5 text-rose-600" />
            <span>Launch New Promo Voucher</span>
          </div>

          <form onSubmit={handleAddCoupon} className="space-y-4 text-xs font-sans">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Coupon Code Name</label>
              <input
                type="text"
                required
                placeholder="e.g. KOSELIFEST"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border rounded-lg text-xs font-mono font-extrabold uppercase tracking-widest focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Deduction Type</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                  className="w-full p-2 bg-slate-50 border rounded-lg text-xs"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Flat Sum Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Deduction Value</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={value}
                  onChange={(e) => setValue(parseInt(e.target.value) || 1)}
                  className="w-full p-2 border bg-slate-50 text-xs font-mono font-bold text-center rounded focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Min Order Sum (NPR)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={minOrder}
                  onChange={(e) => setMinOrder(parseInt(e.target.value) || 0)}
                  className="w-full p-2 border bg-slate-50 text-xs font-mono font-bold text-center rounded focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Campaign Expiry Code</label>
                <input
                  type="date"
                  required
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border text-[10px] font-mono text-center rounded focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Usage Limit (1 time or more)</label>
              <input
                type="number"
                min="1"
                required
                value={maxUses}
                onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                className="w-full p-2.5 bg-slate-50 border rounded-lg text-xs font-mono font-bold text-center focus:outline-none"
              />
              <p className="text-[9px] text-slate-400 mt-1 leading-normal">
                Strict limit on the total times this promotional campaign code can be used on checkout.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs cursor-pointer"
            >
              Post Promo Campaign
            </button>
          </form>
        </div>
      </div>

      {/* Campaign report analytics section */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">📊 Coupon usage audits & campaign report</h3>
        <p className="text-[11px] text-slate-500 leading-normal">
          Real-time summary tracking individual promo-code redemption cycles, total usage quotas, and live conversion compliance metrics.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Total Campaigns Created</span>
            <span className="text-xl font-extrabold text-slate-800 font-mono">{state.coupons.length}</span>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Total Times Redeemed</span>
            <span className="text-xl font-extrabold text-rose-600 font-mono">
              {state.coupons.reduce((sum, c) => sum + (c.usesCount || 0), 0)}
            </span>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Live Campaigns</span>
            <span className="text-xl font-extrabold text-emerald-600 font-mono">
              {state.coupons.filter(c => c.isActive).length}
            </span>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Paused/Fully Redeemed</span>
            <span className="text-xl font-extrabold text-amber-600 font-mono">
              {state.coupons.filter(c => !c.isActive || (c.usesCount !== undefined && c.maxUses !== undefined && c.usesCount >= c.maxUses)).length}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto text-[11px]">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b font-sans font-bold text-[9px] text-slate-400 uppercase">
              <tr>
                <th className="p-3">Campaign Code</th>
                <th className="p-3">Uses Frequency Status</th>
                <th className="p-3 text-center">Utilization Ratio</th>
                <th className="p-3 text-right">Estimated Discount Released</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
              {state.coupons.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400 italic font-mono">No usage logs captured yet.</td>
                </tr>
              ) : (
                state.coupons.map(coupon => {
                  const used = coupon.usesCount || 0;
                  const limit = coupon.maxUses || 1;
                  const ratio = Math.min(100, Math.round((used / limit) * 100));
                  return (
                    <tr key={coupon.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono font-bold text-slate-800 uppercase text-xs">{coupon.code}</td>
                      <td className="p-3">
                        {used >= limit ? (
                          <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-[9px] uppercase">Fully Redeemed</span>
                        ) : (
                          <span className="font-bold text-emerald-650 bg-emerald-50 px-2 py-0.5 rounded-full text-[9px] uppercase">Active & Claimable</span>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-rose-550 h-full" style={{ width: `${ratio}%` }} />
                          </div>
                          <span>{ratio}% ({used}/{limit})</span>
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800">
                        Rs. {(used * coupon.value).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
