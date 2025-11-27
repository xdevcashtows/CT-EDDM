import React from 'react';
import { LayoutGrid, List } from 'lucide-react';

export const ViewToggle = ({ viewMode, onViewModeChange }) => {
  return (
    <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => onViewModeChange('grid')}
        className={`
          p-2 rounded-md transition-all duration-200
          ${viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}
        `}
        aria-label="Grid view"
        aria-pressed={viewMode === 'grid'}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        onClick={() => onViewModeChange('list')}
        className={`
          p-2 rounded-md transition-all duration-200
          ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}
        `}
        aria-label="List view"
        aria-pressed={viewMode === 'list'}
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
};

