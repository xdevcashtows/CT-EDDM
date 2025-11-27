import React from 'react';

const statusConfig = {
  draft: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    label: 'Draft',
  },
  working: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    label: 'Working',
  },
  filled: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    label: 'Filled',
  },
  printing: {
    bg: 'bg-cyan-100',
    text: 'text-cyan-700',
    label: 'Printing',
  },
  bundling: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    label: 'Bundling',
  },
  delivered: {
    bg: 'bg-lime-100',
    text: 'text-lime-700',
    label: 'Delivered',
  },
  mailed: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    label: 'Mailed',
  },
  cancelled: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    label: 'Cancelled',
  },
};

export const CampaignCard = ({ campaign, onClick }) => {
  const statusInfo = statusConfig[campaign.status] || statusConfig.draft;
  
  // Calculate advertiser metrics from ad_slots data
  const totalSlots = campaign.total_ad_slots || 0;
  const bookedSlots = campaign.booked_ad_slots || 0;
  
  const advertisersPaid = bookedSlots;
  const advertisersTotal = totalSlots;
  const advertiserProgress = advertisersTotal > 0 
    ? Math.min((advertisersPaid / advertisersTotal) * 100, 100)
    : 0;

  // Calculate revenue metrics
  const revenueCollected = campaign.revenue_collected || 0;
  const revenueTotal = campaign.revenue_total || campaign.expected_revenue || 0;
  const revenueProgress = revenueTotal > 0 
    ? Math.min((revenueCollected / revenueTotal) * 100, 100)
    : 0;

  const formatMailingDate = (date) => {
    if (!date) return 'TBD';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysUntilMailing = (date) => {
    if (!date) return 'No date set';
    const mailingDate = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    mailingDate.setHours(0, 0, 0, 0);

    const diffTime = mailingDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Mailed';
    if (diffDays === 0) return 'Mails today';
    if (diffDays === 1) return '1 day left';
    return `${diffDays} days left`;
  };

  const pieces = campaign.total_pieces || campaign.total_households || 0;
  const cityName = campaign.city?.name || campaign.city || 'No city';

  return (
    <div
      onClick={onClick}
      className={`
        bg-white border border-gray-200 rounded-lg p-6 
        transition-shadow duration-200
        ${onClick ? 'cursor-pointer hover:shadow-md' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate mb-1">
            {campaign.name}
          </h3>
          <p className="text-sm text-gray-600">
            {cityName} • {pieces.toLocaleString()} pieces
          </p>
        </div>
        <span
          className={`
            ml-4 flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium
            ${statusInfo.bg} ${statusInfo.text}
          `}
        >
          {statusInfo.label}
        </span>
      </div>

      {/* Metrics */}
      <div className="space-y-4 mb-4">
        {/* Advertisers */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Advertisers</span>
            <span className="text-sm font-medium text-gray-900">
              {advertisersPaid}/{advertisersTotal} paid
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-300"
              style={{
                width: `${advertiserProgress}%`,
              }}
            />
          </div>
        </div>

        {/* Revenue */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Revenue</span>
            <span className="text-sm font-medium text-gray-900">
              ${revenueCollected.toLocaleString()}/$
              {revenueTotal.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-green-500 h-full rounded-full transition-all duration-300"
              style={{
                width: `${revenueProgress}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Mailing Date Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-500">
          {formatMailingDate(campaign.mail_date)}
        </span>
        <span className="text-xs font-medium text-gray-700">
          {getDaysUntilMailing(campaign.mail_date)}
        </span>
      </div>
    </div>
  );
};

