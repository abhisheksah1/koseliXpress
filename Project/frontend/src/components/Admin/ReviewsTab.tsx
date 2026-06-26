import React from 'react';
import { DatabaseState, Review } from '../../types';
import { Eye, EyeOff, Star, Trash2 } from 'lucide-react';

interface ReviewsTabProps {
  state: DatabaseState;
  onUpdateState: (newState: DatabaseState) => void;
}

export default function ReviewsTab({ state, onUpdateState }: ReviewsTabProps) {
  
  const handleTogglePublish = (reviewId: string) => {
    const list = state.reviews.map(r => {
      if (r.id === reviewId) {
        const nextStatus = r.status === 'published' ? 'unpublished' : 'published';
        return { ...r, status: nextStatus as 'published' | 'unpublished' };
      }
      return r;
    });
    onUpdateState({ ...state, reviews: list });
  };

  const handleDeleteReview = (reviewId: string) => {
    let confirmed = false;
    try {
      confirmed = window.confirm('Delete this customer testimonial permanent?');
    } catch (e) {
      confirmed = true;
    }
    if (!confirmed && typeof window !== 'undefined' && window.self !== window.top) {
      confirmed = true;
    }
    if (confirmed) {
      const list = state.reviews.filter(r => r.id !== reviewId);
      onUpdateState({ ...state, reviews: list });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-850">Customer Reviews & Ratings</h2>
        <p className="text-sm text-slate-500">Approve, deny, publish, or audit feedback submitted by buyers on product pages.</p>
      </div>

      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              <tr>
                <th className="p-3.5">Reviewer</th>
                <th className="p-3.5">Target Product</th>
                <th className="p-3.5 text-center">Score Stars</th>
                <th className="p-3.5">Message / Testimonial</th>
                <th className="p-3.5 text-center">Audit Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
              {state.reviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center font-mono text-slate-400">No review submissions logged.</td>
                </tr>
              ) : (
                state.reviews.map(rev => {
                  const prod = state.products.find(p => p.id === rev.productId);
                  return (
                    <tr key={rev.id} className="hover:bg-slate-55 transition">
                      <td className="p-3">
                        <div className="font-bold text-slate-800">{rev.customerName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{new Date(rev.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="p-3 text-slate-500 font-medium">
                        {prod ? prod.name : 'Deleted catalog item'}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${s <= rev.rating ? 'fill-amber-400 text-amber-500' : 'text-slate-200'}`}
                            />
                          ))}
                          <span className="font-mono text-[10px] ml-1">({rev.rating})</span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-600 max-w-xs">{rev.comment}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-extrabold tracking-wider ${rev.status === 'published' ? 'bg-emerald-50 text-emerald-650' : 'bg-slate-100 text-slate-500'}`}>
                          {rev.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1 flex justify-end h-full items-center">
                        <button
                          onClick={() => handleTogglePublish(rev.id)}
                          className={`p-1 px-2 text-[10px] font-bold border rounded-md inline-flex items-center gap-1 cursor-pointer transition ${rev.status === 'published' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-650'}`}
                          title={rev.status === 'published' ? 'Unpublish' : 'Publish'}
                        >
                          {rev.status === 'published' ? <><EyeOff className="w-3.5 h-3.5" /> Block</> : <><Eye className="w-3.5 h-3.5" /> Approve</>}
                        </button>
                        <button
                          onClick={() => handleDeleteReview(rev.id)}
                          className="p-1 px-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
