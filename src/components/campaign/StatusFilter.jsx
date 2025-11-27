import React from 'react';

const statusConfig = {
  draft: {
    bg: 'bg-gray-100',
    bgActive: 'bg-gray-700',
    text: 'text-gray-700',
    textActive: 'text-white',
    label: 'Draft',
  },
  working: {
    bg: 'bg-yellow-100',
    bgActive: 'bg-yellow-600',
    text: 'text-yellow-700',
    textActive: 'text-white',
    label: 'Working',
  },
  filled: {
    bg: 'bg-orange-100',
    bgActive: 'bg-orange-600',
    text: 'text-orange-700',
    textActive: 'text-white',
    label: 'Filled',
  },
  printing: {
    bg: 'bg-cyan-100',
    bgActive: 'bg-cyan-600',
    text: 'text-cyan-700',
    textActive: 'text-white',
    label: 'Printing',
  },
  bundling: {
    bg: 'bg-blue-100',
    bgActive: 'bg-blue-600',
    text: 'text-blue-700',
    textActive: 'text-white',
    label: 'Bundling',
  },
  delivered: {
    bg: 'bg-lime-100',
    bgActive: 'bg-lime-600',
    text: 'text-lime-700',
    textActive: 'text-white',
    label: 'Delivered',
  },
  mailed: {
    bg: 'bg-green-100',
    bgActive: 'bg-green-600',
    text: 'text-green-700',
    textActive: 'text-white',
    label: 'Mailed',
  },
  cancelled: {
    bg: 'bg-red-100',
    bgActive: 'bg-red-600',
    text: 'text-red-700',
    textActive: 'text-white',
    label: 'Cancelled',
  },
};

const allStatuses = [
  'draft',
  'working',
  'filled',
  'printing',
  'bundling',
  'delivered',
  'mailed',
  'cancelled',
];

export const StatusFilter = ({ selectedStatuses, onStatusToggle, onClearFilters }) => {
  const isAllSelected = selectedStatuses.length === 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={onClearFilters}
        className={`
          px-3 py-1.5 rounded-full text-xs font-medium
          transition-all duration-200
          ${isAllSelected ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}
        `}
      >
        All
      </button>
      {allStatuses.map((status) => {
        const config = statusConfig[status];
        const isActive = selectedStatuses.includes(status);
        return (
          <button
            key={status}
            onClick={() => onStatusToggle(status)}
            className={`
              px-3 py-1.5 rounded-full text-xs font-medium
              transition-all duration-200
              ${isActive ? `${config.bgActive} ${config.textActive}` : `${config.bg} ${config.text} hover:${config.bgActive}`}
            `}
          >
            {config.label}
          </button>
        );
      })}
    </div>
  );
};

