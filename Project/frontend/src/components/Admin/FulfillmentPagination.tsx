import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { PAGINATION_BAR } from './orderFulfillmentConfig';

interface FulfillmentPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  itemLabel?: string;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export default function FulfillmentPagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  itemLabel = 'items',
  pageSizeOptions = [10, 25, 50],
  onPageChange,
  onPageSizeChange,
}: FulfillmentPaginationProps) {
  if (totalItems === 0) return null;

  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(totalItems, safePage * pageSize);

  const pageNumbers = (() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let startPage = Math.max(1, safePage - Math.floor(maxVisible / 2));
    let endPage = Math.min(safeTotalPages, startPage + maxVisible - 1);
    startPage = Math.max(1, endPage - maxVisible + 1);
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  })();

  return (
    <div className={PAGINATION_BAR}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <p className="text-slate-600">
          Showing{' '}
          <strong className="text-slate-900">{start}–{end}</strong> of{' '}
          <strong className="text-slate-900">{totalItems}</strong> {itemLabel}
        </p>
        {onPageSizeChange && (
          <label className="inline-flex items-center gap-2 text-[11px] text-slate-500">
            <span className="font-semibold uppercase tracking-wider">Per page</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-white border border-pink-100 rounded-lg focus:outline-none focus:border-[#E91E63]/40 focus:ring-2 focus:ring-[#E91E63]/15 cursor-pointer"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        <button
          type="button"
          disabled={safePage === 1}
          onClick={() => onPageChange(1)}
          className="pagination-btn p-2"
          title="First page"
          aria-label="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          disabled={safePage === 1}
          onClick={() => onPageChange(safePage - 1)}
          className="pagination-btn p-2"
          title="Previous page"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="hidden sm:flex items-center gap-1 mx-1">
          {pageNumbers[0] > 1 && (
            <>
              <button type="button" onClick={() => onPageChange(1)} className="pagination-btn min-w-[2rem]">
                1
              </button>
              {pageNumbers[0] > 2 && <span className="px-1 text-slate-300">…</span>}
            </>
          )}
          {pageNumbers.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onPageChange(n)}
              className={`pagination-btn min-w-[2rem] ${
                n === safePage
                  ? '!bg-gradient-to-r !from-[#E91E63] !to-[#C2185B] !text-white !border-transparent shadow-sm'
                  : ''
              }`}
            >
              {n}
            </button>
          ))}
          {pageNumbers[pageNumbers.length - 1] < safeTotalPages && (
            <>
              {pageNumbers[pageNumbers.length - 1] < safeTotalPages - 1 && (
                <span className="px-1 text-slate-300">…</span>
              )}
              <button
                type="button"
                onClick={() => onPageChange(safeTotalPages)}
                className="pagination-btn min-w-[2rem]"
              >
                {safeTotalPages}
              </button>
            </>
          )}
        </div>

        <span className="sm:hidden px-3 py-1.5 font-bold text-slate-800 bg-white border border-pink-100 rounded-xl text-xs">
          {safePage} / {safeTotalPages}
        </span>

        <button
          type="button"
          disabled={safePage === safeTotalPages}
          onClick={() => onPageChange(safePage + 1)}
          className="pagination-btn p-2"
          title="Next page"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          disabled={safePage === safeTotalPages}
          onClick={() => onPageChange(safeTotalPages)}
          className="pagination-btn p-2"
          title="Last page"
          aria-label="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
