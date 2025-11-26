import { Trash2, Edit3 } from 'lucide-react';
import './SavedRoutes.css';

function SavedRoutes({ routes = [], onLoad, onDelete, onRename, loading = false }) {
  return (
    <div className="saved-routes">
      <div className="saved-routes-header">
        <h3>Saved routes</h3>
      </div>
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

