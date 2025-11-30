import { Trash2, Edit3, GitCompare } from 'lucide-react';
import './SavedRoutes.css';

function SavedRoutes({ routes = [], onLoad, onDelete, onRename, onCompare, loading = false }) {
  return (
    <div className="saved-routes">
      {routes.length > 0 && onCompare && (
        <div className="saved-routes-header">
          <h3>Saved Routes</h3>
          <button
            type="button"
            onClick={onCompare}
            className="compare-button"
            title="Compare saved routes"
          >
            <GitCompare size={16} />
            Compare
          </button>
        </div>
      )}
      <div className="saved-routes-body">
        {loading ? (
          <p className="loading-message">Loading...</p>
        ) : routes.length === 0 ? (
          <p className="empty-message">No saved routes yet.</p>
        ) : (
          <div className="routes-list">
            {routes.map((route) => {
              const isClickable = Boolean(onLoad);
              const handleCardKey = (event) => {
                if (!isClickable) return;
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onLoad(route.id);
                }
              };
              
              // Extract unique zip codes from route data
              const extractZipCodes = () => {
                if (!route.routes || route.routes.length === 0) return [];
                const zipCodes = new Set();
                route.routes.forEach(r => {
                  if (r.route) {
                    // Extract 5-digit zip code from route string (e.g., "56379-PBOX" -> "56379")
                    const match = r.route.match(/^(\d{5})/);
                    if (match) {
                      zipCodes.add(match[1]);
                    }
                  }
                });
                return Array.from(zipCodes).sort();
              };
              
              const zipCodes = extractZipCodes();
              
              return (
                <div
                  key={route.id}
                  className={`saved-route-item${isClickable ? ' clickable' : ''}`}
                  role={isClickable ? 'button' : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onClick={isClickable ? () => onLoad(route.id) : undefined}
                  onKeyDown={handleCardKey}
                >
                  <div className="saved-route-content">
                    <div className="saved-route-name">{route.name}</div>
                    <div className="saved-route-info">
                      {zipCodes.length > 0 && (
                        <span className="saved-route-zip">{zipCodes.join(', ')}</span>
                      )}
                      {route.routes?.length || 0} routes • {route.total_households || 0} households
                      {route.is_locked && <span className="locked-badge">Locked</span>}
                    </div>
                  </div>
                  <div className="saved-route-actions">
                    {onRename && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onRename(route);
                        }}
                        className="edit-button"
                        title="Edit this route name"
                      >
                        <Edit3 size={16} />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(route.id);
                        }}
                        className="delete-button"
                        title="Delete this route"
                        disabled={route.is_locked}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default SavedRoutes;

