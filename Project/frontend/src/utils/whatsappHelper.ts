import { Order, SmtpSettings } from '../types';

/**
 * Builds a beautifully formatted WhatsApp click-to-chat API url
 * containing complete checkout references & statuses.
 */
export function getWhatsAppNotificationUrl(order: Order, smtp?: SmtpSettings, targetAdmin: boolean = false): string {
  const phone = targetAdmin 
    ? (smtp?.notificationWhatsapp || '') 
    : (order.customerPhone || order.senderPhone || '');

  // Strip non-digits except maybe the leading '+'
  const cleanPhone = phone.replace(/[^\d+]/g, '');

  const itemsList = (order.items || [])
    .map(idx => `• ${idx.productName} (Qty: ${idx.quantity})`)
    .join('\n');

  const trackingLink = `${window.location.origin}/?tracking=${order.refId}`;

  const messageText = `🎁 *KOSELI XPRESS ORDER NOTIFICATION* 🎁
-----------------------------------------
📦 *Order Reference:* ${order.refId}
👤 *Customer Name:* ${order.customerName || 'Valued Client'}
📞 *Contact Mobile:* ${order.customerPhone || 'Not Provided'}
💰 *Grand Total:* ${order.currency} ${order.totalAmount.toLocaleString()}
💳 *Payment:* ${(order.paymentStatus || 'pending').toUpperCase()} (${order.paymentMethod || 'eSewa/Card'})
📍 *Address Location:* ${order.deliveryAddress || order.shippingAddress || 'Kathmandu, Nepal'}
⏰ *Preferred Date:* ${order.preferredDeliveryDate || 'Immediate Dispatch'}
⏰ *Time Slot:* ${order.selectedTimeSlot || 'Standard Delivery'}

*Fulfillment Status:* ${(order.status || 'pending').toUpperCase()}

🛍️ *Purchased Items:*
${itemsList || '• Custom Gift Package'}

🔗 *Real-time Tracking:*
${trackingLink}
-----------------------------------------
🌸 _Handcrafted floral, fresh cakes & premium hampers delivered to your loved ones in Kathmandu._`;

  const encodedText = encodeURIComponent(messageText);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}
