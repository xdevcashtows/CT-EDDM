import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Check, AlertCircle } from 'lucide-react';
import './ImageUploader.css';

export default function ImageUploader({ 
  onUpload, 
  onRemove,
  currentImage = null,
  maxSizeMB = 10,
  acceptedFormats = ['image/jpeg', 'image/jpg', 'image/png'],
  width,
  height,
  label = 'Upload Image'
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(currentImage);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setPreview(currentImage);
  }, [currentImage]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (!acceptedFormats.includes(file.type)) {
      setError(`Please upload a valid image format: ${acceptedFormats.join(', ')}`);
      return;
    }

    // Validate file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      setError(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err.message || 'Failed to upload image');
      setPreview(currentImage);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <div className="image-uploader">
      <div 
        className="upload-area"
        style={{ 
          width: width ? `${width}px` : '100%',
          height: height ? `${height}px` : '200px'
        }}
      >
        {preview ? (
          <div className="preview-container">
            <img src={preview} alt="Preview" className="preview-image" />
            <div className="preview-overlay">
              <button
                type="button"
                onClick={handleRemove}
                className="remove-button"
                disabled={uploading}
              >
                <X size={20} />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="change-button"
                disabled={uploading}
              >
                Change
              </button>
            </div>
          </div>
        ) : (
          <div 
            className="upload-prompt"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <div className="uploading">
                <div className="spinner"></div>
                <span>Uploading...</span>
              </div>
            ) : (
              <>
                <Upload size={32} />
                <span className="upload-label">{label}</span>
                {width && height && (
                  <span className="dimensions">{width} × {height}px</span>
                )}
                <span className="upload-hint">
                  Click to browse or drag and drop
                </span>
              </>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats.join(',')}
        onChange={handleFileSelect}
        className="file-input"
        disabled={uploading}
      />

      {error && (
        <div className="upload-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div className="progress-fill"></div>
          </div>
        </div>
      )}
    </div>
  );
}

