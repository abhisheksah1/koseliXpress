import React, { useState } from 'react';
import { Order, OrderStatus } from '../../types';
import {
  Calendar,
  Clock,
  Download,
  Eye,
  ImageIcon,
  MapPin,
  Package,
  Phone,
  Mail,
  ChevronDown,
} from 'lucide-react';
import { getWhatsAppNotificationUrl } from '../../utils/whatsappHelper';
import {
  ORDER_STATUS_BADGE,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_SHORT,
  PAYMENT_STATUS_BADGE,
  PAYMENT_STATUS_LABELS,
  PREMIUM_SELECT,
} from './orderFulfillmentConfig';

function CustomImageThumb({
  url,
  onDownload,
}: {
  url: string;
  onDownload: (e: React.MouseEvent) => void;
}) {
  const [broken, setBroken] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onDownload}
        className="relative w-10 h-10 rounded-lg border border-pink-100 overflow-hidden bg-pink-50 flex items-center justify-center group/img shrink-0"
        title="Download attachment"
      >
        {!broken ? (
          <img
            src={url}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            alt="Custom upload"
            onError={() => setBroken(true)}
          />
        ) : (
          <ImageIcon className="w-4 h-4 text-[#E91E63]/50" />
        )}
        <span className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition">
          <Download className="w-3 h-3 text-white" />
        </span>
      </button>
      <span className="text-[10px] text-slate-400 font-medium">Custom image</span>
    </div>
  );
}

interface OrderFulfillmentCardProps {
  order: Order;
  apiPartners: any[];
  smtpSettings?: any;
  onView: (order: Order) => void;
  onStatusChange: (orderId: string, orderRef: string, current: OrderStatus, next: OrderStatus) => void;
  onDownloadImage: (url: string, fileName: string, e?: React.MouseEvent) => void;
}

export default function OrderFulfillmentCard({
  order: o,
  apiPartners,
  smtpSettings,
  onView,
  onStatusChange,
  onDownloadImage,
}: OrderFulfillmentCardProps) {
  const [expandedItems, setExpandedItems] = useState(false);
  const pStatus = o.paymentStatus || 'pending';
  const visibleItems = expandedItems ? o.items : o.items.slice(0, 2);
  const hiddenCount = Math.max(0, o.items.length - 2);

  const isApiOrder =
    o.apiPartnerId ||
    o.refId?.startsWith('KO-API') ||
    o.orderNote?.includes('API placed order') ||
    o.apiPartnerUsername;

  const partner = isApiOrder
    ? apiPartners.find(
        (p: any) =>
          p.id === o.apiPartnerId ||
          p.username?.toLowerCase() === o.apiPartnerUsername?.toLowerCase()
      )
    : null;

  return (
    <article
      className="group rounded-2xl border border-pink-100/80 bg-white hover:border-[#E91E63]/25 hover:shadow-lg hover:shadow-pink-900/5 transition-all duration-200 overflow-hidden cursor-pointer"
      onClick={() => onView(o)}
    >
      {/* Card header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-4 bg-gradient-to-r from-pink-50/40 via-white to-white border-b border-pink-50">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 min-w-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Order ref</p>
            <p className="text-lg font-bold font-mono text-[#E91E63] leading-tight">{o.refId}</p>
          </div>
          <div className="hidden sm:block w-px h-10 bg-pink-100" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Placed</p>
            <p className="text-sm font-semibold text-slate-700">
              {new Date(o.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
          {o.preferredDeliveryDate && (
            <>
              <div className="hidden md:block w-px h-10 bg-pink-100" />
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                {o.preferredDeliveryDate}
                {o.selectedTimeSlot && (
                  <span className="text-emerald-600/80 font-medium">· {o.selectedTimeSlot}</span>
                )}
              </div>
            </>
          )}
          {isApiOrder && (
            <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full font-bold uppercase">
              API · {partner?.integrationName || o.apiPartnerUsername || 'Partner'}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <span
            className={`inline-flex px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${
              PAYMENT_STATUS_BADGE[pStatus] || PAYMENT_STATUS_BADGE.pending
            } ${pStatus === 'pending' ? 'animate-pulse' : ''}`}
          >
            {PAYMENT_STATUS_LABELS[pStatus] || pStatus}
          </span>
          <div className="relative min-w-[148px]">
            <select
              value={o.status}
              onChange={(e) =>
                onStatusChange(o.id, o.refId, o.status, e.target.value as OrderStatus)
              }
              className={`${PREMIUM_SELECT} !py-2 !pl-3 !pr-8 !text-xs !font-bold appearance-none`}
              title={ORDER_STATUS_LABELS[o.status]}
            >
              {(Object.values(OrderStatus) as OrderStatus[]).map((status) => (
                <option key={status} value={status}>
                  {ORDER_STATUS_SHORT[status]}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E91E63]/50 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Sender */}
        <div className="md:col-span-3 rounded-xl bg-slate-50/80 border border-slate-100 p-3.5 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sender</p>
          <p className="text-sm font-bold text-slate-900 leading-snug">
            {o.senderName || o.customerName}
          </p>
          <div className="space-y-1">
            {(o.senderEmail || o.customerEmail) && (
              <p className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                <Mail className="w-3 h-3 shrink-0 text-slate-400" />
                {o.senderEmail || o.customerEmail}
              </p>
            )}
            <p className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-slate-600">
              <Phone className="w-3 h-3 shrink-0 text-slate-400" />
              {o.senderPhone || o.customerPhone}
            </p>
          </div>
        </div>

        {/* Receiver */}
        <div className="md:col-span-4 rounded-xl bg-gradient-to-br from-pink-50/50 to-white border border-pink-100/60 p-3.5 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Receiver</p>
          <p className="text-sm font-bold text-slate-900">{o.receiverName || o.customerName}</p>
          <p className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-slate-600">
            <Phone className="w-3 h-3 shrink-0 text-[#E91E63]/60" />
            {o.receiverPhone || o.customerPhone}
          </p>
          <div className="flex gap-2 items-start pt-1">
            <MapPin className="w-3.5 h-3.5 text-[#E91E63]/70 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                {o.deliveryAddress || o.shippingAddress || 'No address'}
              </p>
              {o.deliveryDistrict && (
                <span className="inline-block mt-1.5 text-[9px] font-bold uppercase tracking-wider text-[#E91E63] bg-pink-50 border border-pink-100 px-2 py-0.5 rounded-full">
                  {o.deliveryDistrict}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Items */}
        <div
          className="md:col-span-3 rounded-xl border border-slate-100 p-3.5 space-y-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Items ({o.items.length})
            </p>
            {hiddenCount > 0 && !expandedItems && (
              <button
                type="button"
                onClick={() => setExpandedItems(true)}
                className="text-[10px] font-bold text-[#E91E63] hover:underline"
              >
                +{hiddenCount} more
              </button>
            )}
          </div>
          <div className="space-y-2">
            {visibleItems.map((item, idx) => (
              <div
                key={idx}
                className="rounded-lg bg-white border border-slate-100 px-2.5 py-2 space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2">
                    {item.productName}
                  </p>
                  <span className="shrink-0 text-[10px] font-mono font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                    ×{item.quantity}
                  </span>
                </div>
                {item.selectedVariations && item.selectedVariations.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.selectedVariations.map((v, vIdx) => (
                      <span
                        key={vIdx}
                        className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-pink-50 text-slate-600 border border-pink-100/80"
                      >
                        {v.name}: <strong>{v.value}</strong>
                      </span>
                    ))}
                  </div>
                )}
                {item.customMessage && (
                  <p className="text-[10px] text-amber-900 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1 leading-snug line-clamp-2">
                    {item.customMessage}
                  </p>
                )}
                {item.customImageUrl && (
                  <CustomImageThumb
                    url={item.customImageUrl}
                    onDownload={(e) =>
                      onDownloadImage(
                        item.customImageUrl!,
                        `order-${o.refId || o.id}-item-${idx + 1}.png`,
                        e
                      )
                    }
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div className="md:col-span-2 flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 md:text-right rounded-xl bg-gradient-to-br from-slate-50 to-pink-50/30 border border-slate-100 p-3.5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total</p>
            <p className="text-lg font-bold font-mono text-slate-900 leading-none">
              {o.currency} {o.totalAmount.toLocaleString()}
            </p>
            {o.currency !== 'NPR' && (
              <p className="text-[10px] text-slate-400 font-mono mt-1">
                NPR {o.totalAmountBase.toLocaleString()}
              </p>
            )}
            <p className="text-[10px] text-slate-500 capitalize mt-1">{o.paymentMethod}</p>
          </div>
          <span
            className={`md:hidden inline-flex px-2.5 py-1 text-[9px] font-bold uppercase rounded-full border ${ORDER_STATUS_BADGE[o.status]}`}
          >
            {ORDER_STATUS_SHORT[o.status]}
          </span>
        </div>
      </div>

      {/* Card footer */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 bg-slate-50/50 border-t border-pink-50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Package className="w-3.5 h-3.5" />
          <span className={`hidden sm:inline px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${ORDER_STATUS_BADGE[o.status]}`}>
            {ORDER_STATUS_LABELS[o.status]}
          </span>
          {o.selectedTimeSlot && !o.preferredDeliveryDate && (
            <span className="inline-flex items-center gap-1 text-pink-700">
              <Clock className="w-3 h-3" />
              {o.selectedTimeSlot}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={getWhatsAppNotificationUrl(o, smtpSettings, false)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 rounded-xl transition no-underline"
          >
            WhatsApp
          </a>
          {smtpSettings?.notificationWhatsapp && smtpSettings?.whatsappEnabled && (
            <a
              href={getWhatsAppNotificationUrl(o, smtpSettings, true)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 rounded-xl transition no-underline"
            >
              Notify admin
            </a>
          )}
          <button
            type="button"
            onClick={() => onView(o)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-white bg-gradient-to-r from-[#E91E63] to-[#C2185B] hover:from-[#D81B60] hover:to-[#AD1457] rounded-xl shadow-sm transition"
          >
            <Eye className="w-3.5 h-3.5" />
            View order
          </button>
        </div>
      </div>
    </article>
  );
}
