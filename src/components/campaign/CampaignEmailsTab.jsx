import React, { useState, useEffect, useRef } from 'react';
import { Mail, Send, Clock, Plus, Edit2, Trash2, Eye, Calendar, Users, CheckCircle, AlertCircle, PlayCircle } from 'lucide-react';
import { emailTemplates as emailTemplatesAPI, emailCampaigns as emailCampaignsAPI, contacts as contactsAPI, adSlots as adSlotsAPI } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import './CampaignEmailsTab.css';

export const CampaignEmailsTab = ({ campaign, onUpdate }) => {
  const { user } = useAuth();
  const isMountedRef = useRef(true);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [campaignEmails, setCampaignEmails] = useState([]);
  const [campaignContacts, setCampaignContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewEmailModal, setShowNewEmailModal] = useState(false);
  const [showDripSequenceModal, setShowDripSequenceModal] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (user && campaign?.id) {
      loadData();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [campaign?.id, user]);

  const loadData = async () => {
    if (!user || !campaign?.id) return;
    
    if (isMountedRef.current) setLoading(true);
    
    try {
      const [templatesRes, emailsRes, slotsRes, contactsRes] = await Promise.all([
        emailTemplatesAPI.getAll(user.id),
        emailCampaignsAPI.getByCampaign(campaign.id),
        adSlotsAPI.getByCampaign(campaign.id),
        contactsAPI.getAll(user.id)
      ]);

      if (!isMountedRef.current) return;

      if (!templatesRes.error && templatesRes.data) {
        setEmailTemplates(templatesRes.data);
      }

      if (!emailsRes.error && emailsRes.data) {
        setCampaignEmails(emailsRes.data);
      }

      // Get contacts assigned to this campaign
      if (!slotsRes.error && slotsRes.data && !contactsRes.error && contactsRes.data) {
        const uniqueContactIds = [...new Set(
          slotsRes.data
            .filter(slot => slot.contact_id)
            .map(slot => slot.contact_id)
        )];

        const contacts = contactsRes.data.filter(c => uniqueContactIds.includes(c.id));
        setCampaignContacts(contacts);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading email data:', error);
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleSendEmail = (template) => {
    setSelectedEmail({
      template_id: template.id,
      template_name: template.name,
      subject: template.subject,
      body_html: template.body_html,
      recipients: campaignContacts.map(c => c.id),
      send_now: true,
      scheduled_at: null
    });
    setShowNewEmailModal(true);
  };

  const handleScheduleEmail = (template) => {
    setSelectedEmail({
      template_id: template.id,
      template_name: template.name,
      subject: template.subject,
      body_html: template.body_html,
      recipients: campaignContacts.map(c => c.id),
      send_now: false,
      scheduled_at: ''
    });
    setShowNewEmailModal(true);
  };

  return (
    <div className="campaign-emails-tab">
      {/* Header */}
      <div className="emails-header">
        <div className="emails-header-content">
          <div>
            <h2>Campaign Emails</h2>
            <p>Send bulk emails and create drip sequences for {campaign.name}</p>
          </div>
          <div className="emails-header-actions">
            <button
              className="btn-secondary"
              onClick={() => setShowDripSequenceModal(true)}
            >
              <Calendar size={18} />
              Create Drip Sequence
            </button>
            <button
              className="btn-primary"
              onClick={() => setShowNewEmailModal(true)}
            >
              <Plus size={18} />
              Send Email
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="emails-loading">Loading emails...</div>
      ) : (
        <div className="emails-content">
          {/* Stats Cards */}
          <div className="emails-stats">
            <div className="email-stat-card">
              <div className="email-stat-icon" style={{ background: '#dbeafe' }}>
                <Users size={20} style={{ color: '#3b82f6' }} />
              </div>
              <div>
                <div className="email-stat-label">Campaign Contacts</div>
                <div className="email-stat-value">{campaignContacts.length}</div>
              </div>
            </div>

            <div className="email-stat-card">
              <div className="email-stat-icon" style={{ background: '#dcfce7' }}>
                <Send size={20} style={{ color: '#22c55e' }} />
              </div>
              <div>
                <div className="email-stat-label">Emails Sent</div>
                <div className="email-stat-value">
                  {campaignEmails.filter(e => e.status === 'sent').length}
                </div>
              </div>
            </div>

            <div className="email-stat-card">
              <div className="email-stat-icon" style={{ background: '#fef3c7' }}>
                <Clock size={20} style={{ color: '#eab308' }} />
              </div>
              <div>
                <div className="email-stat-label">Scheduled</div>
                <div className="email-stat-value">
                  {campaignEmails.filter(e => e.status === 'scheduled').length}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Send Templates */}
          <div className="emails-section">
            <h3>Quick Send Templates</h3>
            <p className="section-description">
              Common email templates for campaign updates and communications
            </p>

            {emailTemplates.length > 0 ? (
              <div className="email-templates-grid">
                {emailTemplates.map(template => (
                  <div key={template.id} className="email-template-card">
                    <div className="email-template-header">
                      <Mail size={20} />
                      <h4>{template.name}</h4>
                    </div>
                    <p className="email-template-subject">{template.subject}</p>
                    <div className="email-template-actions">
                      <button
                        className="btn-template-action"
                        onClick={() => handleSendEmail(template)}
                      >
                        <Send size={16} />
                        Send Now
                      </button>
                      <button
                        className="btn-template-action secondary"
                        onClick={() => handleScheduleEmail(template)}
                      >
                        <Clock size={16} />
                        Schedule
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="emails-empty-state">
                <Mail size={48} style={{ color: '#cbd5e1' }} />
                <p>No email templates available</p>
                <p className="hint">Create email templates in the Email Marketing page</p>
              </div>
            )}
          </div>

          {/* Email History */}
          <div className="emails-section">
            <h3>Email History</h3>
            <p className="section-description">
              View all emails sent to campaign contacts
            </p>

            {campaignEmails.length > 0 ? (
              <div className="email-history-list">
                {campaignEmails.map(email => (
                  <div key={email.id} className="email-history-item">
                    <div className="email-history-icon">
                      {email.status === 'sent' && <CheckCircle size={20} style={{ color: '#22c55e' }} />}
                      {email.status === 'scheduled' && <Clock size={20} style={{ color: '#eab308' }} />}
                      {email.status === 'failed' && <AlertCircle size={20} style={{ color: '#ef4444' }} />}
                    </div>
                    <div className="email-history-content">
                      <div className="email-history-header">
                        <h4>{email.name || email.subject}</h4>
                        <span className={`email-status-badge ${email.status}`}>
                          {email.status}
                        </span>
                      </div>
                      <p className="email-history-subject">{email.subject}</p>
                      <div className="email-history-meta">
                        <span>
                          <Users size={14} />
                          {email.total_recipients || 0} recipients
                        </span>
                        <span>
                          <Calendar size={14} />
                          {email.scheduled_at 
                            ? new Date(email.scheduled_at).toLocaleString()
                            : new Date(email.created_at).toLocaleString()
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="emails-empty-state small">
                <Send size={32} style={{ color: '#cbd5e1' }} />
                <p>No emails sent yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showNewEmailModal && (
        <SendEmailModal
          campaign={campaign}
          contacts={campaignContacts}
          templates={emailTemplates}
          selectedEmail={selectedEmail}
          onClose={() => {
            setShowNewEmailModal(false);
            setSelectedEmail(null);
          }}
          onSent={() => {
            loadData();
            setShowNewEmailModal(false);
            setSelectedEmail(null);
          }}
        />
      )}

      {showDripSequenceModal && (
        <DripSequenceModal
          campaign={campaign}
          contacts={campaignContacts}
          templates={emailTemplates}
          onClose={() => setShowDripSequenceModal(false)}
          onCreated={() => {
            loadData();
            setShowDripSequenceModal(false);
          }}
        />
      )}
    </div>
  );
};

// Send Email Modal Component
const SendEmailModal = ({ campaign, contacts, templates, selectedEmail, onClose, onSent }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    template_id: selectedEmail?.template_id || '',
    subject: selectedEmail?.subject || '',
    body_html: selectedEmail?.body_html || '',
    recipients: selectedEmail?.recipients || contacts.map(c => c.id),
    send_now: selectedEmail?.send_now ?? true,
    scheduled_at: selectedEmail?.scheduled_at || ''
  });
  const [sending, setSending] = useState(false);

  const handleTemplateChange = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        template_id: templateId,
        subject: template.subject,
        body_html: template.body_html
      }));
    }
  };

  const handleSend = async () => {
    if (!formData.template_id || !formData.subject) {
      alert('Please select a template and enter a subject');
      return;
    }

    if (!formData.recipients.length) {
      alert('Please select at least one recipient');
      return;
    }

    setSending(true);

    const scheduledDate = formData.send_now
      ? new Date()
      : formData.scheduled_at
        ? new Date(formData.scheduled_at)
        : null;

    if (!scheduledDate || Number.isNaN(scheduledDate.getTime())) {
      alert('Please select a valid date and time');
      setSending(false);
      return;
    }

    const template = templates.find(t => t.id === formData.template_id);

    const payload = {
      user_id: user.id,
      campaign_id: campaign.id,
      name: `${campaign.name} - ${template?.name || 'Email'}`,
      subject: formData.subject,
      body_html: formData.body_html,
      body_text: formData.body_html,
      target_contacts: formData.recipients,
      send_type: formData.send_now ? 'immediate' : 'scheduled',
      scheduled_at: scheduledDate.toISOString(),
      status: formData.send_now ? 'sent' : 'scheduled',
      total_recipients: formData.recipients.length
    };

    const { error } = await emailCampaignsAPI.create(payload);
    
    setSending(false);

    if (error) {
      alert('Failed to send email. Please try again.');
      console.error('Email send error:', error);
    } else {
      onSent();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="email-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Send Email to Campaign Contacts</h3>
          <button onClick={onClose} className="modal-close">×</button>
        </div>

        <div className="modal-content">
          {/* Template Selection */}
          <div className="form-group">
            <label>Email Template</label>
            <select
              value={formData.template_id}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="form-select"
            >
              <option value="">Select a template...</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div className="form-group">
            <label>Subject</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Email subject..."
              className="form-input"
            />
          </div>

          {/* Body */}
          <div className="form-group">
            <label>Message</label>
            <textarea
              rows={6}
              value={formData.body_html}
              onChange={(e) => setFormData(prev => ({ ...prev, body_html: e.target.value }))}
              placeholder="Email message..."
              className="form-textarea"
            />
          </div>

          {/* Recipients */}
          <div className="form-group">
            <label>Recipients ({formData.recipients.length} contacts)</label>
            <div className="recipients-summary">
              <Users size={16} />
              <span>Sending to all {contacts.length} campaign contacts</span>
            </div>
          </div>

          {/* Send Options */}
          <div className="form-group">
            <label>Send Time</label>
            <div className="send-options">
              <label className="radio-option">
                <input
                  type="radio"
                  checked={formData.send_now}
                  onChange={() => setFormData(prev => ({ ...prev, send_now: true }))}
                />
                <span>Send Now</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  checked={!formData.send_now}
                  onChange={() => setFormData(prev => ({ ...prev, send_now: false }))}
                />
                <span>Schedule</span>
              </label>
            </div>
            {!formData.send_now && (
              <input
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduled_at: e.target.value }))}
                className="form-input"
                style={{ marginTop: '8px' }}
              />
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary" disabled={sending}>
            Cancel
          </button>
          <button onClick={handleSend} className="btn-primary" disabled={sending}>
            <Send size={18} />
            {sending ? 'Sending...' : formData.send_now ? 'Send Email' : 'Schedule Email'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Drip Sequence Modal (Placeholder for future implementation)
const DripSequenceModal = ({ campaign, contacts, templates, onClose, onCreated }) => {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="email-modal large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create Drip Sequence</h3>
          <button onClick={onClose} className="modal-close">×</button>
        </div>

        <div className="modal-content">
          <div className="drip-sequence-placeholder">
            <PlayCircle size={64} style={{ color: '#cbd5e1' }} />
            <h4>Drip Sequences Coming Soon</h4>
            <p>
              Automate email sequences based on campaign stages and triggers.
              Schedule follow-ups, reminders, and updates automatically.
            </p>
            <ul className="feature-list">
              <li>Campaign created notification</li>
              <li>Slot claimed confirmation</li>
              <li>Reminder emails for available slots</li>
              <li>Campaign milestone updates</li>
              <li>Pre-mail date reminders</li>
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CampaignEmailsTab;

