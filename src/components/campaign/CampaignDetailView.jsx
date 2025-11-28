import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import CampaignConfigTab from './CampaignConfigTab';
import CampaignCanvasTab from './CampaignCanvasTab';
import CampaignContactsTab from './CampaignContactsTab';
import CampaignEmailsTab from './CampaignEmailsTab';
import './CampaignDetailView.css';

const tabs = [
  { id: 'config', label: 'Settings & Analytics' },
  { id: 'canvas', label: 'Canvas' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'emails', label: 'Emails' },
];

export const CampaignDetailView = ({ campaign, isOpen, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('config');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Trigger animation
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      // Reset to config tab only when modal is fully closed
      // This ensures the tab doesn't reset while the modal is still open
      setTimeout(() => setActiveTab('config'), 300);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300); // Match animation duration
  };

  if (!isOpen || !campaign) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`campaign-detail-backdrop ${isAnimating ? 'visible' : ''}`}
        onClick={handleClose}
      />

      {/* Slide-in Panel */}
      <div className={`campaign-detail-panel ${isAnimating ? 'open' : ''}`}>
        {/* Header */}
        <div className="campaign-detail-header">
          <div className="campaign-detail-header-content">
            <div>
              <h2 className="campaign-detail-title">{campaign?.name || 'Campaign'}</h2>
              <p className="campaign-detail-subtitle">
                {campaign.city?.name || campaign.city || 'Unknown'} • {(campaign.total_pieces || 0).toLocaleString()} pieces
              </p>
            </div>
            <button
              onClick={handleClose}
              className="campaign-detail-close-btn"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>

          {/* Tabs */}
          <div className="campaign-detail-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`campaign-detail-tab ${activeTab === tab.id ? 'active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="campaign-detail-content">
          {activeTab === 'config' && campaign && (
            <CampaignConfigTab campaign={campaign} onUpdate={onUpdate} onClose={onClose} />
          )}
          {activeTab === 'canvas' && campaign && (
            <CampaignCanvasTab campaign={campaign} onUpdate={onUpdate} />
          )}
          {activeTab === 'contacts' && campaign && (
            <CampaignContactsTab campaign={campaign} onUpdate={onUpdate} />
          )}
          {activeTab === 'emails' && campaign && (
            <CampaignEmailsTab campaign={campaign} onUpdate={onUpdate} />
          )}
        </div>
      </div>
    </>
  );
};

export default CampaignDetailView;

