import { DatabaseState, Order, EmailLog } from '../types';

/**
 * Automates real-time delivery dispatches via Nodemailer on the server.
 * Connects directly, replaces placeholders dynamically, handles and registers dispatches in emailLogs.
 */
export async function sendOrderStatusEmail(
  state: DatabaseState,
  order: Order,
  templateId: 'confirmation' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
): Promise<DatabaseState> {
  const smtp = state.smtpSettings;
  const templates = state.emailTemplates || [];
  const activeTemplate = templates.find(t => t.id === templateId);

  // Only allowed to send order received confirmation per user specifications
  if (templateId !== 'confirmation') {
    console.log(`Automated updates suppressed: customer receives 'confirmation' only. Skipped template: ${templateId}`);
    return state;
  }

  // If automated emails are disabled globally or SMTP is not set, we bypass gracefully
  if (!smtp || !smtp.isEnabled || !activeTemplate) {
    console.log('Automated transactional email skipped: disabled or template missing.', { templateId });
    return state;
  }

  const recipientEmail = order.customerEmail || order.senderEmail;
  if (!recipientEmail) {
    console.warn('Unable to dispatch transact ticket: missing recipient email');
    return state;
  }

  // Construct context placeholders matching templates
  const trackingLink = `${window.location.origin}/?tracking=${order.refId}`;
  const placeholders = {
    customerName: order.customerName || 'Valued Client',
    orderNumber: order.refId,
    orderAmount: `${order.currency} ${order.totalAmount.toLocaleString()}`,
    paymentStatus: (order.paymentStatus || 'pending').toUpperCase(),
    receiverName: order.receiverName || order.customerName || 'Recipient Partner',
    deliveryAddress: order.deliveryAddress || order.shippingAddress || 'Not Specified',
    deliveryTimeSlot: order.selectedTimeSlot || 'Standard Express 3 Hours Slot',
    trackingUrl: trackingLink
  };

  let emailBody = activeTemplate.body;
  if (templateId === 'confirmation' && order.paymentMethod?.toLowerCase().includes('manual')) {
    const manualGateway = state.paymentGateways?.find(g => g.id === 'manual');
    const bankName = manualGateway?.extraSettings?.bankName || 'NIC Asia Bank';
    const accountName = manualGateway?.extraSettings?.accountName || 'Koseli Xpress Private Limited';
    const accountNumber = manualGateway?.extraSettings?.accountNumber || '2440192830129302';
    const branchName = manualGateway?.extraSettings?.branchName || 'Kathmandu Branch';
    const instructionsStr = manualGateway?.extraSettings?.instructions || 'Please transfer the exact order amount and upload/send the payment screenshot to our WhatsApp support (+977 9862200000) for instant order verification.';
    
    const supportPhone = smtp?.notificationWhatsapp || '+977 9862200000';
    const cleanSupportPhone = supportPhone.replace(/[^\d+]/g, '');

    const paymentInstructionHtml = `
      <div style="margin-top: 20px; padding: 16px; border: 1.5px dashed #f59e0b; background-color: #fffbeb; border-radius: 10px; font-family: sans-serif;">
        <h3 style="color: #d97706; margin-top: 0; margin-bottom: 10px; font-size: 14px; display: flex; align-items: center; gap: 6px;">
          💳 Manual Bank Transfer / QR Pay Instructions
        </h3>
        <p style="margin: 0 0 12px 0; font-size: 13px; color: #b45309; font-weight: bold; line-height: 1.4;">
          ⚠️ NOTICE: Unless paid the payment, your transaction will remain in PENDING status.
        </p>
        <div style="background-color: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid #fef3c7; font-size: 12.5px; margin-bottom: 12px; line-height: 1.6; color: #1e293b;">
          <strong>Bank Name:</strong> ${bankName}<br/>
          <strong>Account Name:</strong> ${accountName}<br/>
          <strong>Account Number:</strong> ${accountNumber}<br/>
          <strong>Branch Name:</strong> ${branchName}
        </div>
        ${instructionsStr ? `<p style="margin: 0 0 12px 0; font-size: 12px; color: #4b5563; font-style: italic;">${instructionsStr}</p>` : ''}
        <p style="margin: 0; font-size: 13px; line-height: 1.5;">
          📞 <strong>Quick Support:</strong> Send your payment screenshot to our official WhatsApp support at 
          <a href="https://wa.me/${cleanSupportPhone}" style="color: #059669; font-weight: bold; text-decoration: underline;" target="_blank">
            ${supportPhone}
          </a> for instant manual order activation.
        </p>
      </div>
    `;
    emailBody = emailBody + paymentInstructionHtml;
  }

  try {
    const res = await fetch('/api/mail/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        smtpSettings: {
          gmailAddress: smtp.gmailAddress,
          appPassword: smtp.appPassword,
          senderName: smtp.senderName,
          replyToEmail: smtp.replyToEmail,
          notificationEmail: smtp.notificationEmail
        },
        template: {
          id: activeTemplate.id,
          name: activeTemplate.name,
          subject: activeTemplate.subject,
          body: emailBody,
          logo: activeTemplate.logo,
          footer: activeTemplate.footer
        },
        placeholders,
        recipientEmail
      })
    });

    const data = await res.json();

    const newLog: EmailLog = {
      id: `elog-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orderId: order.refId,
      recipientEmail,
      emailType: activeTemplate.name,
      sentAt: new Date().toISOString(),
      status: res.ok ? 'sent' : 'failed',
      errorMessage: res.ok ? undefined : (data.error || 'SMTP Dispatch Fail')
    };

    const updatedState: DatabaseState = {
      ...state,
      emailLogs: [...(state.emailLogs || []), newLog]
    };

    return updatedState;
  } catch (err: any) {
    console.error('Mail trigger network exception:', err);
    const newLog: EmailLog = {
      id: `elog-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orderId: order.refId,
      recipientEmail,
      emailType: activeTemplate.name,
      sentAt: new Date().toISOString(),
      status: 'failed',
      errorMessage: err.message || 'I/O Timeout'
    };

    const updatedState: DatabaseState = {
      ...state,
      emailLogs: [...(state.emailLogs || []), newLog]
    };

    return updatedState;
  }
}
