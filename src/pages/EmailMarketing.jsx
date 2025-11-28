import React, { useState, useEffect, useRef } from 'react';
import { Plus, Send, Tag, Pencil, Trash2 } from 'lucide-react';
import './EmailMarketing.css';
import { emailTemplates as emailTemplatesAPI } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import PageLayout from '../components/PageLayout';

const TEMPLATE_FORM_DEFAULT = {
  name: '',
  subject: '',
  body: '',
  tag: '',
  stage: ''
};

const PIPELINE_STAGES = [
  { id: 'lead', label: 'Lead' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'proposal_sent', label: 'Proposal Sent' },
  { id: 'negotiating', label: 'Negotiating' },
  { id: 'won', label: 'Won' },
  { id: 'active', label: 'Active' },
  { id: 'past', label: 'Past Client' },
  { id: 'lost', label: 'Lost' }
];

const PLACEHOLDER_TOKENS = [
  {
    label: 'Business Name',
    value: '{{business_name}}',
    description: 'Contact business name'
  },
  {
    label: 'Owner Name',
    value: '{{owner_name}}',
    description: 'Full owner name'
  },
  {
    label: 'First Name',
    value: '{{first_name}}',
    description: 'First word of the owner name'
  },
  {
    label: 'Email Address',
    value: '{{email}}',
    description: 'Primary contact email'
  },
  {
    label: 'Phone Number',
    value: '{{phone}}',
    description: 'Primary contact phone number'
  },
  {
    label: 'City',
    value: '{{city}}',
    description: 'Contact city'
  },
  {
    label: 'State',
    value: '{{state}}',
    description: 'Contact state'
  }
];

function EmailMarketing() {
  const { user } = useAuth();
  const statusTimeoutRef = useRef();
  const subjectInputRef = useRef(null);
  const bodyTextareaRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateForm, setTemplateForm] = useState(TEMPLATE_FORM_DEFAULT);
  const [statusMessage, setStatusMessage] = useState('');
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [focusedField, setFocusedField] = useState('body');

  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
    return () => {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, [user]);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await emailTemplatesAPI.getAll(user.id);
    if (!error) {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  const showMessage = (message) => {
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
    }
    setStatusMessage(message);
    statusTimeoutRef.current = setTimeout(() => setStatusMessage(''), 4000);
  };

  const closeTemplateModal = () => {
    setShowTemplateModal(false);
    setTemplateForm(TEMPLATE_FORM_DEFAULT);
    setEditingTemplate(null);
  };

  const handleTemplateSubmit = async (event) => {
    event.preventDefault();
    if (!templateForm.name.trim() || !templateForm.subject.trim() || !templateForm.body.trim()) {
      showMessage('Name, subject, and body are required.');
      return;
    }

    const payload = {
      user_id: user.id,
      name: templateForm.name.trim(),
      subject: templateForm.subject.trim(),
      body_html: templateForm.body.trim(),
      body_text: templateForm.body.trim(),
      template_tag: templateForm.tag.trim() || null,
      stage: templateForm.stage.trim() || null
    };

    const apiCall = editingTemplate
      ? emailTemplatesAPI.update(editingTemplate.id, payload)
      : emailTemplatesAPI.create(payload);
    const { data, error } = await apiCall;
    if (!error) {
      setTemplates(prev => {
        if (editingTemplate) {
          return prev.map(t => (t.id === data.id ? data : t));
        }
        return [data, ...prev];
      });
      closeTemplateModal();
      showMessage(editingTemplate ? 'Template updated.' : 'Template saved.');
    } else {
      console.error('Failed to save template', error);
      showMessage('Unable to save template right now.');
    }
  };

  const handleEditTemplate = (template) => {
    setTemplateForm({
      name: template.name || '',
      subject: template.subject || '',
      body: template.body_html || template.body_text || '',
      tag: template.template_tag || '',
      stage: template.stage || ''
    });
    setEditingTemplate(template);
    setShowTemplateModal(true);
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Delete this template?')) {
      return;
    }
    const { error } = await emailTemplatesAPI.delete(templateId);
    if (!error) {
      setTemplates(prev => prev.filter(template => template.id !== templateId));
      showMessage('Template deleted.');
    } else {
      showMessage('Failed to delete template.');
    }
  };

  const handleFieldFocus = (field) => () => setFocusedField(field);

  const insertPlaceholder = (token) => {
    const targetField = focusedField || 'body';
    const fieldRef = targetField === 'subject' ? subjectInputRef.current : bodyTextareaRef.current;
    const selectionStart = fieldRef?.selectionStart;
    const selectionEnd = fieldRef?.selectionEnd;
    let cursorPosition = 0;

    setTemplateForm(prev => {
      const value = prev[targetField] || '';
      const safeStart =
        typeof selectionStart === 'number'
          ? Math.min(value.length, Math.max(0, selectionStart))
          : value.length;
      const safeEnd =
        typeof selectionEnd === 'number'
          ? Math.min(value.length, Math.max(0, selectionEnd))
          : safeStart;
      cursorPosition = safeStart + token.length;
      return {
        ...prev,
        [targetField]: `${value.slice(0, safeStart)}${token}${value.slice(safeEnd)}`
      };
    });

    setTimeout(() => {
      if (fieldRef) {
        fieldRef.focus();
        const finalCursor = Math.min((fieldRef.value || '').length, cursorPosition);
        fieldRef.setSelectionRange(finalCursor, finalCursor);
      }
    }, 0);
  };

  const templateModal = showTemplateModal ? (
    <div className="modal-overlay" onClick={closeTemplateModal}>
      <div className="modal-window" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{editingTemplate ? 'Edit Email Template' : 'Create Email Template'}</h3>
          <button type="button" className="modal-close" onClick={closeTemplateModal}>
            ×
          </button>
        </div>
        <form className="modal-form" onSubmit={handleTemplateSubmit}>
          <label>
            Template Name *
            <input
              type="text"
              value={templateForm.name}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. New Lead Welcome"
              required
            />
          </label>
          <label>
            Stage (Optional)
            <select
              value={templateForm.stage}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, stage: e.target.value }))}
            >
              <option value="">No stage assigned</option>
              {PIPELINE_STAGES.map(stage => (
                <option key={stage.id} value={stage.id}>
                  {stage.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tag (Optional)
            <select
              value={templateForm.tag}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, tag: e.target.value }))}
            >
              <option value="">Select a tag…</option>
              <option value="lead">Lead</option>
              <option value="active">Active</option>
              <option value="past">Past Client</option>
              <option value="proposal_sent">Proposal Sent</option>
            </select>
          </label>
          <label>
            Email Subject *
            <input
              type="text"
              value={templateForm.subject}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, subject: e.target.value }))}
              onFocus={handleFieldFocus('subject')}
              ref={subjectInputRef}
              placeholder="Subject line for the email"
              required
            />
          </label>
          <div className="placeholder-helper">
            <div className="placeholder-helper__header">
              <span>Insert contact placeholders</span>
              <small>Click to add them to the focused field.</small>
            </div>
            <div className="placeholder-helper__chips">
              {PLACEHOLDER_TOKENS.map(token => (
                <button
                  type="button"
                  key={token.value}
                  className="placeholder-helper__chip"
                  onClick={() => insertPlaceholder(token.value)}
                  title={token.description}
                >
                  {token.label}
                </button>
              ))}
            </div>
          </div>
          <label>
            Email Body *
            <textarea
              value={templateForm.body}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, body: e.target.value }))}
              onFocus={handleFieldFocus('body')}
              ref={bodyTextareaRef}
              placeholder="Write your email content here…"
              rows={5}
              required
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={closeTemplateModal}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <Send size={16} />
              {editingTemplate ? 'Save Changes' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  const layoutProps = {
    title: 'Email Marketing',
    subtitle: 'Store reusable templates before building campaigns on the Campaigns page.',
    tip: 'Templates capture copy, subject lines, and optional tags for your outreach.'
  };

  if (loading) {
    return (
      <PageLayout {...layoutProps} className="page-shell--fullwidth">
        <div className="email-marketing-page email-marketing-page--loading">
          <div className="spinner-large"></div>
          <p>Loading templates…</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout {...layoutProps} className="page-shell--fullwidth">
      <div className="email-marketing-page">
        <div className="templates-top-row">
          <div>
            <div className="templates-heading">
              <h2>Email Templates</h2>
              <span>{templates.length} template{templates.length === 1 ? '' : 's'}</span>
            </div>
            <p className="templates-description">
              Organize your copy and tags here. Campaign creation happens on the Campaigns page.
            </p>
            {statusMessage && <div className="status-toast">{statusMessage}</div>}
          </div>
          <button className="btn-create-template" type="button" onClick={() => setShowTemplateModal(true)}>
            <Plus size={16} />
            New Template
          </button>
        </div>

        <div className="templates-panel">
          <div className="templates-grid">
            {templates.length === 0 ? (
              <div className="empty-state">
                <p>No templates yet. Create one to get started.</p>
              </div>
            ) : (
              templates.map(template => (
                <article key={template.id} className="template-card">
                  <div className="template-card__top">
                    <h3>{template.name}</h3>
                    <div className="template-badges">
                      {template.stage && (
                        <span className="template-stage">
                          {PIPELINE_STAGES.find(s => s.id === template.stage)?.label || template.stage}
                        </span>
                      )}
                      {template.template_tag && (
                        <span className="template-tag">
                          <Tag size={12} />
                          {template.template_tag.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="template-card__subject">{template.subject}</p>
                  <p className="template-card__snippet">
                    {(template.body_text || template.body_html || '').slice(0, 180)}…
                  </p>
                  <div className="template-card-actions">
                    <button
                      type="button"
                      className="icon-button-icon"
                      onClick={() => handleEditTemplate(template)}
                      aria-label="Edit template"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-button-icon icon-button-icon--danger"
                      onClick={() => handleDeleteTemplate(template.id)}
                      aria-label="Delete template"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
      {templateModal}
    </PageLayout>
  );
}

export default EmailMarketing;

