import React, { useState, useEffect } from 'react';
import { X, Mail, Download, Loader, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getEnabledPaymentMethods } from '../../pages/settings/PaymentLinks';
import './CampaignCanvasTab.css';

const InvoiceModal = ({ slot, campaign, contacts, onClose }) => {
  const { user } = useAuth();
  const [contact, setContact] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState(new Set());

  useEffect(() => {
    if (slot.contact_id) {
      const foundContact = contacts.find(c => c.id === slot.contact_id);
      setContact(foundContact || null);
    }
    // Load enabled payment methods
    const enabled = getEnabledPaymentMethods();
    setPaymentMethods(enabled);
    // Initialize with no payment methods selected by default
    setSelectedPaymentMethods(new Set());
  }, [slot, contacts]);

  if (!contact) {
    return (
      <div className="assign-modal-backdrop" onClick={onClose}>
        <div className="assign-modal" onClick={(e) => e.stopPropagation()}>
          <div className="assign-modal-header">
            <h3>Invoice</h3>
            <button onClick={onClose} className="assign-modal-close">×</button>
          </div>
          <div className="assign-modal-content">
            <p>No contact assigned to this slot.</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate slot price
  const getSlotPrice = () => {
    if (slot.custom_price) return Number(slot.custom_price);
    
    const slotCount = (slot.width || 1) * (slot.height || 1);
    let basePrice = 0;
    
    if (slotCount === 1) basePrice = Number(campaign.slot_1_price) || 0;
    else if (slotCount === 2) basePrice = Number(campaign.slot_2_price) || 0;
    else if (slotCount === 4) basePrice = Number(campaign.slot_4_price) || 0;
    else if (slotCount === 8) basePrice = Number(campaign.slot_8_price) || 0;
    else if (slotCount === 12) basePrice = Number(campaign.slot_12_price) || 0;
    else if (slotCount === 16) basePrice = Number(campaign.slot_16_price) || 0;
    
    if (basePrice === 0) {
      const size = slot.slot_size?.toString().toLowerCase();
      if (size === 'small' || slotCount === 1) basePrice = Number(campaign.price_small) || 0;
      else if (size === 'medium' || slotCount === 2) basePrice = Number(campaign.price_medium) || 0;
      else if (size === 'large' || slotCount >= 4) basePrice = Number(campaign.price_large) || 0;
    }
    
    return basePrice;
  };

  const slotPrice = getSlotPrice();
  const slotCount = (slot.width || 1) * (slot.height || 1);
  const totalPieces = campaign.total_pieces || 0;
  const mailDate = campaign.mail_date ? new Date(campaign.mail_date).toLocaleDateString() : 'TBD';

  // Get routes info
  const routes = campaign.route_snapshot || [];
  const routeNames = routes.length > 0 
    ? routes.map(r => `${r.zipCode} - Route ${r.routeNumber}`).join(', ')
    : 'No routes specified';

  const handlePaymentMethodToggle = (methodId) => {
    setSelectedPaymentMethods(prev => {
      const newSet = new Set(prev);
      if (newSet.has(methodId)) {
        newSet.delete(methodId);
      } else {
        newSet.add(methodId);
      }
      return newSet;
    });
  };

  const generateInvoiceHTML = (paymentLinkUrl = null) => {
    const selectedMethods = paymentMethods.filter(m => selectedPaymentMethods.has(m.id));
    const paymentMethodsHTML = selectedMethods.map(method => {
      const methodLabels = {
        cash: 'Cash',
        manual_card: 'Manual Card Entry',
        payment_link: 'Payment Link',
        venmo: 'Venmo',
        cash_app: 'Cash App',
        zelle: 'Zelle'
      };
      return `<li>${methodLabels[method.id] || method.label}</li>`;
    }).join('');
    
    const paymentLinkSection = paymentLinkUrl 
      ? `
    <div class="payment-link-section" style="margin-top: 30px; padding: 20px; background: #eff6ff; border-radius: 8px; border: 2px solid #3b82f6;">
      <h3 style="font-size: 18px; font-weight: 600; color: #1e293b; margin: 0 0 12px 0;">Pay Online</h3>
      <p style="margin: 0 0 16px 0; color: #475569;">Click the button below to pay securely online:</p>
      <a href="${paymentLinkUrl}" 
         style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Pay ${slotPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </a>
    </div>
    `
      : '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #f8fafc;
    }
    .invoice-container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .invoice-header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .invoice-title {
      font-size: 32px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 10px 0;
    }
    .invoice-number {
      color: #64748b;
      font-size: 14px;
    }
    .invoice-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 30px;
    }
    .detail-section h3 {
      font-size: 14px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 10px 0;
    }
    .detail-section p {
      margin: 5px 0;
      color: #1e293b;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
    }
    .items-table th {
      background: #f8fafc;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #475569;
      border-bottom: 2px solid #e2e8f0;
    }
    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .items-table tr:last-child td {
      border-bottom: none;
    }
    .text-right {
      text-align: right;
    }
    .total-section {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
    }
    .total-label {
      font-size: 18px;
      font-weight: 600;
      color: #1e293b;
    }
    .total-amount {
      font-size: 24px;
      font-weight: 700;
      color: #1e293b;
    }
    .payment-methods {
      margin-top: 30px;
      padding: 20px;
      background: #f8fafc;
      border-radius: 8px;
    }
    .payment-methods h3 {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 10px 0;
    }
    .payment-methods ul {
      margin: 10px 0 0 0;
      padding-left: 20px;
      color: #475569;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="invoice-header">
      <h1 class="invoice-title">Invoice</h1>
      <p class="invoice-number">Invoice #${Date.now()}</p>
    </div>

    <div class="invoice-details">
      <div class="detail-section">
        <h3>Bill To</h3>
        <p><strong>${contact.business_name || 'N/A'}</strong></p>
        ${contact.owner_name ? `<p>${contact.owner_name}</p>` : ''}
        ${contact.email ? `<p>${contact.email}</p>` : ''}
        ${contact.phone ? `<p>${contact.phone}</p>` : ''}
        ${contact.address ? `<p>${contact.address}</p>` : ''}
      </div>
      <div class="detail-section">
        <h3>Campaign Details</h3>
        <p><strong>Campaign:</strong> ${campaign.name || 'N/A'}</p>
        <p><strong>Mail Date:</strong> ${mailDate}</p>
        <p><strong>Slot Position:</strong> ${slot.slot_position || 'N/A'}</p>
        <p><strong>Slot Size:</strong> ${slotCount} slot${slotCount !== 1 ? 's' : ''}</p>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-right">Quantity</th>
          <th class="text-right">Price</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>Ad Slot - ${slot.slot_position}</strong><br>
            <small style="color: #64748b;">
              Campaign: ${campaign.name || 'N/A'}<br>
              Routes: ${routeNames}<br>
              Total Mail Pieces: ${totalPieces.toLocaleString()}
            </small>
          </td>
          <td class="text-right">1</td>
          <td class="text-right">$${slotPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="text-right">$${slotPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>

    <div class="total-section">
      <div class="total-row">
        <span class="total-label">Total Amount Due</span>
        <span class="total-amount">$${slotPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
    </div>

    ${selectedMethods.length > 0 ? `
    <div class="payment-methods">
      <h3>Payment Methods Accepted</h3>
      <ul>
        ${paymentMethodsHTML}
      </ul>
    </div>
    ` : ''}
    ${paymentLinkSection}

    <div class="footer">
      <p>Thank you for your business!</p>
      <p>Please remit payment by the due date.</p>
    </div>
  </div>
</body>
</html>
    `;
  };

  const handleSendEmail = async () => {
    if (!contact.email) {
      setError('Contact does not have an email address.');
      return;
    }

    setSending(true);
    setError(null);

    try {
      // Check if payment link is selected and create it
      let paymentLinkUrl = null;
      const hasPaymentLink = selectedPaymentMethods.has('payment_link');
      
      if (hasPaymentLink) {
        try {
          // Determine API base URL (works in both dev and production)
          const isDev = import.meta.env.DEV;
          const apiBase = isDev 
            ? 'http://localhost:8888' // Netlify Dev default port
            : '';
          
          const paymentLinkResponse = await fetch(`${apiBase}/.netlify/functions/create-payment-link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: slotPrice,
              currency: 'usd',
              contactId: contact.id,
              campaignId: campaign.id,
              slotId: slot.id,
              userId: user.id,
              description: `Invoice for ${campaign.name || 'Campaign'} - Ad Slot ${slot.slot_position}`
            })
          });

          if (paymentLinkResponse.ok) {
            const paymentLinkResult = await paymentLinkResponse.json();
            paymentLinkUrl = paymentLinkResult.paymentLinkUrl;
          } else {
            console.warn('Failed to create payment link, continuing without it');
          }
        } catch (linkError) {
          console.error('Error creating payment link:', linkError);
          // Continue without payment link
        }
      }

      const invoiceHTML = generateInvoiceHTML(paymentLinkUrl);
      const selectedMethods = paymentMethods.filter(m => selectedPaymentMethods.has(m.id));
      const paymentMethodsText = selectedMethods.length > 0 
        ? `Payment Methods Accepted:\n${selectedMethods.map(m => `- ${m.label}`).join('\n')}`
        : '';
      
      const paymentLinkText = paymentLinkUrl 
        ? `\n\nPay Online: ${paymentLinkUrl}`
        : '';

      const invoiceText = `
Invoice

Bill To: ${contact.business_name || 'N/A'}
${contact.owner_name ? `Contact: ${contact.owner_name}` : ''}
${contact.email ? `Email: ${contact.email}` : ''}
${contact.phone ? `Phone: ${contact.phone}` : ''}

Campaign: ${campaign.name || 'N/A'}
Mail Date: ${mailDate}
Slot Position: ${slot.slot_position || 'N/A'}
Slot Size: ${slotCount} slot${slotCount !== 1 ? 's' : ''}

Description: Ad Slot - ${slot.slot_position}
Routes: ${routeNames}
Total Mail Pieces: ${totalPieces.toLocaleString()}

Total Amount Due: $${slotPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

${paymentMethodsText}${paymentLinkText}

Thank you for your business!
      `.trim();

      // Determine API base URL (works in both dev and production)
      const isDev = import.meta.env.DEV;
      let apiBase = '';
      
      if (isDev) {
        // Try Netlify Dev first, fallback to relative path
        apiBase = 'http://localhost:8888';
      }

      let response;
      try {
        response = await fetch(`${apiBase}/.netlify/functions/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'invoice',
            to: contact.email,
            subject: `Invoice for ${campaign.name || 'Campaign'} - Ad Slot ${slot.slot_position}`,
            html: invoiceHTML,
            text: invoiceText,
            contactId: contact.id,
            campaignId: campaign.id,
            userId: user.id
          })
        });
      } catch (fetchError) {
        // If fetch fails (e.g., Netlify Dev not running), try relative path
        if (isDev && fetchError.message.includes('fetch')) {
          try {
            response = await fetch('/.netlify/functions/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'invoice',
                to: contact.email,
                subject: `Invoice for ${campaign.name || 'Campaign'} - Ad Slot ${slot.slot_position}`,
                html: invoiceHTML,
                text: invoiceText,
                contactId: contact.id,
                campaignId: campaign.id,
                userId: user.id
              })
            });
          } catch (retryError) {
            throw new Error('Unable to connect to email service. Please ensure Netlify Dev is running (run "netlify dev" in your terminal) or deploy to production.');
          }
        } else {
          throw fetchError;
        }
      }

      if (!response.ok) {
        let errorMessage = 'Failed to send invoice';
        try {
          const result = await response.json();
          errorMessage = result.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      setSent(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Error sending invoice:', err);
      setError(err.message || 'Failed to send invoice email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleDownload = () => {
    // For download, we don't have a payment link, so pass null
    const invoiceHTML = generateInvoiceHTML(null);
    const blob = new Blob([invoiceHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${campaign.name || 'campaign'}-${slot.slot_position}-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="assign-modal-backdrop" onClick={onClose}>
      <div className="assign-modal invoice-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
        <div className="assign-modal-header">
          <h3>Generate Invoice</h3>
          <button onClick={onClose} className="assign-modal-close">×</button>
        </div>

        <div className="assign-modal-content">
          {error && (
            <div style={{
              padding: '12px 16px',
              background: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#991b1b',
              marginBottom: '20px'
            }}>
              {error}
            </div>
          )}

          {sent ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px'
            }}>
              <CheckCircle size={48} style={{ color: '#10b981', marginBottom: '16px' }} />
              <h3 style={{ color: '#1e293b', marginBottom: '8px' }}>Invoice Sent!</h3>
              <p style={{ color: '#64748b' }}>The invoice has been sent to {contact.email}</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
                  Invoice Preview
                </h4>
                <div style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '20px',
                  background: '#f8fafc'
                }}>
                  <div style={{ marginBottom: '16px' }}>
                    <strong>Bill To:</strong> {contact.business_name || 'N/A'}
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <strong>Campaign:</strong> {campaign.name || 'N/A'}
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <strong>Slot:</strong> {slot.slot_position} ({slotCount} slot{slotCount !== 1 ? 's' : ''})
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <strong>Mail Date:</strong> {mailDate}
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <strong>Total Pieces:</strong> {totalPieces.toLocaleString()}
                  </div>
                  <div style={{
                    paddingTop: '16px',
                    borderTop: '1px solid #e2e8f0',
                    fontSize: '18px',
                    fontWeight: 600
                  }}>
                    <strong>Total Amount:</strong> ${slotPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {paymentMethods.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
                    Payment Methods
                  </h4>
                  <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '12px' }}>
                    Select which payment methods to include on this invoice:
                  </p>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    {paymentMethods.map(method => {
                      const isSelected = selectedPaymentMethods.has(method.id);
                      return (
                        <label
                          key={method.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '8px 14px',
                            background: isSelected ? '#dbeafe' : '#f1f5f9',
                            color: isSelected ? '#0369a1' : '#64748b',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            border: isSelected ? '2px solid #0369a1' : '2px solid transparent',
                            transition: 'all 0.2s',
                            userSelect: 'none'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = '#e2e8f0';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = '#f1f5f9';
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handlePaymentMethodToggle(method.id)}
                            style={{
                              marginRight: '8px',
                              cursor: 'pointer',
                              width: '16px',
                              height: '16px'
                            }}
                          />
                          {method.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {!contact.email && (
                <div style={{
                  padding: '12px 16px',
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: '8px',
                  color: '#92400e',
                  marginBottom: '20px'
                }}>
                  ⚠️ This contact does not have an email address. You can still download the invoice.
                </div>
              )}
            </>
          )}
        </div>

        <div className="assign-modal-footer">
          <div className="assign-modal-actions">
            <button
              onClick={handleDownload}
              className="btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Download size={18} />
              Download
            </button>
            {contact.email && !sent && (
              <button
                onClick={handleSendEmail}
                disabled={sending}
                className="btn-assign"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {sending ? (
                  <>
                    <Loader size={18} className="spinner" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail size={18} />
                    Send Email
                  </>
                )}
              </button>
            )}
            <button onClick={onClose} className="btn-cancel">
              {sent ? 'Close' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;

