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

export const CampaignDetailView = ({ campaign, isOpen, onClose, onUpdate, activeTab, onTabChange }) => {
  // Use controlled activeTab from parent if provided, otherwise use local state
  const [localActiveTab, setLocalActiveTab] = useState('config');
  const isControlled = activeTab !== undefined && onTabChange !== undefined;
  const currentActiveTab = isControlled ? activeTab : localActiveTab;
  const setActiveTab = isControlled ? onTabChange : setLocalActiveTab;
  
  const [isAnimating, setIsAnimating] = useState(false);
  const previousCampaignIdRef = React.useRef(null);
  const activeTabRef = React.useRef(currentActiveTab);

  // Debug: Track activeTab changes
  useEffect(() => {
    console.log('🔵 [CampaignDetailView] activeTab changed:', currentActiveTab, { isControlled });
    activeTabRef.current = currentActiveTab;
  }, [currentActiveTab, isControlled]);

  // Debug: Track campaign prop changes
  useEffect(() => {
    console.log('🟢 [CampaignDetailView] campaign prop changed:', {
      campaignId: campaign?.id,
      campaignName: campaign?.name,
      previousCampaignId: previousCampaignIdRef.current,
      isOpen,
      currentActiveTab: activeTabRef.current,
      isControlled
    });
  }, [campaign?.id, campaign?.name, isOpen, isControlled]);

  // Debug: Track component mount/unmount
  useEffect(() => {
    console.log('🟡 [CampaignDetailView] Component mounted', { isControlled, currentActiveTab });
    return () => {
      console.log('🔴 [CampaignDetailView] Component unmounted', { currentActiveTab: activeTabRef.current });
    };
  }, []);

  useEffect(() => {
    console.log('🟣 [CampaignDetailView] useEffect triggered:', {
      isOpen,
      campaignId: campaign?.id,
      previousCampaignId: previousCampaignIdRef.current,
      currentActiveTab: activeTabRef.current,
      isControlled
    });

    if (isOpen) {
      // Trigger animation
      setTimeout(() => setIsAnimating(true), 10);
      
      // Only reset to config tab if this is a different campaign
      // (i.e., user opened a different campaign)
      if (previousCampaignIdRef.current !== null && previousCampaignIdRef.current !== campaign?.id) {
        console.log('⚠️ [CampaignDetailView] Different campaign detected, resetting tab to config');
        setActiveTab('config');
      } else {
        console.log('✅ [CampaignDetailView] Same campaign, preserving tab:', activeTabRef.current);
      }
      
      // Update the ref with current campaign ID
      previousCampaignIdRef.current = campaign?.id;
    } else {
      setIsAnimating(false);
      // Reset to config tab only when modal is fully closed
      // This ensures the tab doesn't reset while the modal is still open
      setTimeout(() => {
        console.log('🔄 [CampaignDetailView] Modal closed, resetting tab to config');
        if (!isControlled) {
          setActiveTab('config');
        }
        previousCampaignIdRef.current = null;
      }, 300);
    }
  }, [isOpen, campaign?.id, isControlled, setActiveTab]);

  // Wrapper for setActiveTab with debugging
  const setActiveTabWithDebug = (tab) => {
    console.log('📌 [CampaignDetailView] setActiveTab called:', {
      from: activeTabRef.current,
      to: tab,
      isControlled,
      stackTrace: new Error().stack
    });
    setActiveTab(tab);
  };

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
                onClick={() => {
                  console.log('👆 [CampaignDetailView] Tab clicked:', tab.id);
                  setActiveTabWithDebug(tab.id);
                }}
                className={`campaign-detail-tab ${currentActiveTab === tab.id ? 'active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="campaign-detail-content">
          {currentActiveTab === 'config' && campaign && (
            <CampaignConfigTab campaign={campaign} onUpdate={onUpdate} onClose={onClose} />
          )}
          {currentActiveTab === 'canvas' && campaign && (
            <CampaignCanvasTab campaign={campaign} onUpdate={onUpdate} />
          )}
          {currentActiveTab === 'contacts' && campaign && (
            <CampaignContactsTab campaign={campaign} onUpdate={onUpdate} />
          )}
          {currentActiveTab === 'emails' && campaign && (
            <CampaignEmailsTab campaign={campaign} onUpdate={onUpdate} />
          )}
        </div>
      </div>
    </>
  );
};

export default CampaignDetailView;

