import { Trash2, Upload } from 'lucide-react';
import './SavedSelections.css';

function SavedSelections({ selections, onLoad, onDelete, loading = false }) {
  return (
    <div className="saved-selections">
      <h3>Saved Selections</h3>
      {loading ? (
        <p className="loading-message">Loading...</p>
      ) : selections.length === 0 ? (
        <p className="empty-message">No saved selections yet.</p>
      ) : (
        <div className="selections-list">
          {selections.map((selection) => (
            <div key={selection.id} className="selection-item">
              <div className="selection-content">
                <div className="selection-name">{selection.name}</div>
                <div className="selection-info">
                  {selection.routes?.length || 0} routes • {selection.total_households || 0} households
                  {selection.is_locked && <span className="locked-badge">Locked</span>}
                </div>
              </div>
              <div className="selection-actions">
                <button
                  onClick={() => onLoad(selection.id)}
                  className="load-button"
                  title="Load this selection"
                >
                  <Upload size={16} />
                </button>
                <button
                  onClick={() => onDelete(selection.id)}
                  className="delete-button"
                  title="Delete this selection"
                  disabled={selection.is_locked}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SavedSelections;

