import React, { useState } from 'react';
import { DatabaseState, Product, InventoryLog } from '../../types';
import { Archive, Plus, Minus, FileText, AlertCircle, RefreshCw } from 'lucide-react';

interface InventoryTabProps {
  state: DatabaseState;
  onUpdateState: (newState: DatabaseState) => void;
}

export default function InventoryTab({ state, onUpdateState }: InventoryTabProps) {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [adjustQty, setAdjustQty] = useState<number>(5);
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');
  const [reason, setReason] = useState('Restocked from supplier shipment');

  const handleAdjustStock = () => {
    if (!selectedProductId) {
      alert('Please choose a product to initiate adjustment.');
      return;
    }
    const amount = adjustQty;
    if (amount <= 0) {
      alert('Quantity must be greater than zero.');
      return;
    }

    const products = [...state.products];
    const logs = [...state.inventoryLogs];
    
    const prodIdx = products.findIndex(p => p.id === selectedProductId);
    if (prodIdx < 0) return;

    const currentStock = products[prodIdx].stock;
    let newStock = currentStock;

    if (adjustType === 'in') {
      newStock += amount;
    } else {
      newStock = Math.max(0, currentStock - amount);
    }

    // Update product stock
    products[prodIdx].stock = newStock;

    // Append log
    const newLog: InventoryLog = {
      id: `log-${Date.now()}`,
      productId: selectedProductId,
      type: adjustType === 'in' ? 'in' : 'out',
      quantity: amount,
      reason: reason || 'Manual adjustment via inventory panel',
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog);

    onUpdateState({
      ...state,
      products,
      inventoryLogs: logs
    });

    // Reset fields
    setAdjustQty(5);
    setReason('Restocked from supplier shipment');
    alert(`Successfully registered stock adjustment for "${products[prodIdx].name}".`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800">Warehouse Inventory & Logs</h2>
        <p className="text-sm text-slate-500">Track stock health indexes and record manual stock entries.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Stock Monitoring Datagrid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                <tr>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Item Name</th>
                  <th className="p-3 text-center">Threshold</th>
                  <th className="p-3 text-center">Remaining</th>
                  <th className="p-3 text-right">Status Indicator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {state.products.filter(p => p.status !== 'deleted').map(p => {
                  const isLow = p.stock <= p.lowStockThreshold;
                  const isCritical = p.stock === 0;
                  
                  return (
                    <tr key={p.id} className="hover:bg-slate-55 transition-colors">
                      <td className="p-3 font-mono text-xs font-bold text-slate-400">{p.sku}</td>
                      <td className="p-3 text-sm font-semibold text-slate-800">{p.name}</td>
                      <td className="p-3 text-center font-mono text-xs text-slate-500">{p.lowStockThreshold} units</td>
                      <td className="p-3 text-center font-mono font-bold text-slate-850">
                        {p.stock} units
                      </td>
                      <td className="p-3 text-right">
                        {isCritical ? (
                          <span className="inline-block px-2 py-1 text-[10px] font-bold bg-rose-100 text-rose-700 uppercase rounded">Out of Stock</span>
                        ) : isLow ? (
                          <span className="inline-block px-2 py-1 text-[10px] font-bold bg-amber-150 text-amber-700 uppercase rounded">Low Stock</span>
                        ) : (
                          <span className="inline-block px-2 py-1 text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase rounded">Sufficient</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Manual adjustment Widget */}
        <div className="p-5 bg-white border border-slate-150 rounded-xl space-y-4 h-fit">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <Archive className="w-5 h-5 text-rose-600" />
            <span>Manual Stock Entry</span>
          </div>

          <div className="space-y-3 pb-2 text-xs">
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">Target Product</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border rounded text-xs text-slate-700 focus:outline-none focus:border-rose-300"
              >
                <option value="">Select registry item...</option>
                {state.products.filter(p => p.status !== 'deleted').map(p => (
                  <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku} | Stock: {p.stock})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">Action Type</label>
                <div className="flex gap-1.5 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setAdjustType('in')}
                    className={`flex-1 py-1 text-center font-bold text-[10px] rounded ${adjustType === 'in' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-550'}`}
                  >
                    ADD (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('out')}
                    className={`flex-1 py-1 text-center font-bold text-[10px] rounded ${adjustType === 'out' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-550'}`}
                  >
                    REDUCE (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">Adjustment Qty</label>
                <input
                  type="number"
                  min="1"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(parseInt(e.target.value) || 1)}
                  className="w-full p-2 border bg-slate-50 text-xs text-slate-800 font-mono text-center rounded focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">Audit Reason / Note</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border rounded text-xs"
                placeholder="Required for financial audit trail"
              />
            </div>

            <button
              onClick={handleAdjustStock}
              className="w-full py-2.5 mt-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition"
            >
              Post Stock Entry
            </button>
          </div>
        </div>
      </div>

      {/* Transactional logs table */}
      <div className="p-5 bg-white border border-slate-100 rounded-xl space-y-4">
        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
          <FileText className="w-5 h-5 text-slate-400" />
          <span>Warehouse Audit Trail</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-500">
            <thead className="bg-slate-50 font-bold text-[10px] text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="p-3">Ref Date</th>
                <th className="p-3">Item Details</th>
                <th className="p-3 text-center">Inflow/Outflow</th>
                <th className="p-3">Quantity</th>
                <th className="p-3">Reasoning Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {state.inventoryLogs.map(log => {
                const prod = state.products.find(p => p.id === log.productId);
                return (
                  <tr key={log.id} className="hover:bg-slate-55/60 transition text-xs">
                    <td className="p-3 font-mono">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="p-3 font-semibold text-slate-800">{prod ? prod.name : 'Deleted product spec'}</td>
                    <td className="p-3 text-center">
                      {log.type === 'in' ? (
                        <span className="px-2 py-0.5 font-bold tracking-wider text-[9px] uppercase bg-emerald-50 text-emerald-650 rounded">In (+)</span>
                      ) : (
                        <span className="px-2 py-0.5 font-bold tracking-wider text-[9px] uppercase bg-rose-50 text-rose-650 rounded">Out (-)</span>
                      )}
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-800">{log.quantity} units</td>
                    <td className="p-3 text-slate-500">{log.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
