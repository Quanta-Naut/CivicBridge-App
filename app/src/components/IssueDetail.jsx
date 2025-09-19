import React, { useState } from 'react';
import './IssueDetail.css';
import { MdKeyboardArrowLeft } from "react-icons/md";

const IssueDetail = ({ issue, onBack }) => {
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });

  if (!issue) {
    return null;
  }

  const formatDate = (dateString) => {
    if (issue.created_at) {
      try {
        return new Date(issue.created_at).toLocaleString();
      } catch (e) {
        return issue.date || 'Unknown date';
      }
    }
    return issue.date || 'Unknown date';
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getPriorityBgColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'rgba(220, 53, 69, 0.4)';
      case 'high': return 'rgba(253, 126, 20, 0.4)';
      case 'medium': return 'rgba(255, 193, 7, 0.4)';
      case 'low': return 'rgba(40, 167, 69, 0.4)';
      default: return 'rgba(108, 117, 125, 0.4)';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'open': return '#007bff';
      case 'in-progress': return '#fd7e14';
      case 'resolved': 
      case 'completed': return '#28a745';
      case 'closed': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const getStatusBgColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'open': return 'rgba(0, 123, 255, 0.4)';
      case 'in-progress': return 'rgba(253, 126, 20, 0.4)';
      case 'resolved': 
      case 'completed': return 'rgba(40, 167, 69, 0.4)';
      case 'closed': return 'rgba(108, 117, 125, 0.4)';
      default: return 'rgba(108, 117, 125, 0.4)';
    }
  };

  const resetImageZoom = () => {
    setImageZoom(1);
    setImagePosition({ x: 0, y: 0 });
  };

  const handleImageWheel = (e) => {
    e.preventDefault();
    const newZoom = imageZoom + (e.deltaY > 0 ? -0.1 : 0.1);
    setImageZoom(Math.max(0.5, Math.min(3, newZoom)));
  };

  return (
    <div className="issue-detail-container">
      {/* Top Black Bar */}
      <div className="top-black-bar"></div>
      
      {/* Header */}
      <div className="issue-detail-header">
        <button className="back-btn" onClick={onBack}>
          <MdKeyboardArrowLeft />
        </button>
        <h2>Issue Details</h2>
      </div>

      {/* Content */}
      <div className="issue-detail-content">
        
        {/* Basic Information */}
        <div className="detail-section">
          <h3>Basic Information</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Title</label>
              <div className="detail-value">{issue.title}</div>
            </div>
            
            <div className="detail-item">
              <label>Status</label>
              <div 
                className="detail-value status-badge" 
                style={{ 
                  color: getStatusColor(issue.status),
                  backgroundColor: getStatusBgColor(issue.status),
                  borderColor: getStatusColor(issue.status)
                }}
              >
                {issue.status}
              </div>
            </div>

            {issue.category && (
              <div className="detail-item">
                <label>Category</label>
                <div className="detail-value category-badge">
                  {issue.category}
                </div>
              </div>
            )}

            {issue.priority && (
              <div className="detail-item">
                <label>Priority</label>
                <div 
                  className="detail-value priority-badge"
                  style={{ 
                    color: getPriorityColor(issue.priority),
                    backgroundColor: getPriorityBgColor(issue.priority),
                    borderColor: getPriorityColor(issue.priority)
                  }}
                >
                  {issue.priority.toUpperCase()}
                </div>
              </div>
            )}

            <div className="detail-item full-width">
              <label>Description</label>
              <div className="detail-value description-text">
                {issue.description}
              </div>
            </div>
          </div>
        </div>

        {/* Location Information */}
        <div className="detail-section">
          <h3>Location Information</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Latitude</label>
              <div className="detail-value">{issue.latitude?.toFixed(6)}</div>
            </div>
            
            <div className="detail-item">
              <label>Longitude</label>
              <div className="detail-value">{issue.longitude?.toFixed(6)}</div>
            </div>
            
            <div className="detail-item full-width">
              <label>Coordinates</label>
              <div className="detail-value coordinates">
                {issue.latitude?.toFixed(6)}, {issue.longitude?.toFixed(6)}
                <button 
                  className="copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(`${issue.latitude?.toFixed(6)}, ${issue.longitude?.toFixed(6)}`);
                    alert('Coordinates copied to clipboard!');
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Media Section */}
        {(issue.image_url || issue.image_base64 || issue.audio_url || issue.audio_base64) && (
          <div className="detail-section">
            <h3>Media</h3>
            <div className="media-grid">
              {/* Image Display */}
              {(issue.image_url || issue.image_base64) && (
                <div className="media-item">
                  <label>Issue Photo</label>
                  <div className="media-container">
                    <img
                      src={issue.image_url || issue.image_base64}
                      alt="Issue photo"
                      className="issue-image"
                      onClick={() => setShowImageModal(true)}
                      style={{ cursor: 'pointer' }}
                      onError={(e) => {
                        console.error('Image failed to load:', e.target.src);
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <div className="image-placeholder" style={{ display: 'none' }}>
                      <span>📷 Image Not Available</span>
                      <p className="media-note">Image could not be loaded</p>
                    </div>
                    <p className="media-note">Click to view full size</p>
                  </div>
                </div>
              )}

              {/* Audio Display */}
              {(issue.audio_url || issue.audio_base64) && (
                <div className="media-item">
                  <label>Audio Description</label>
                  <div className="media-container">
                    <audio 
                      controls 
                      className="issue-audio"
                      onError={(e) => {
                        console.error('Audio failed to load:', e.target.src);
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    >
                      <source 
                        src={issue.audio_url || `data:audio/webm;base64,${issue.audio_base64}`} 
                        type="audio/webm" 
                      />
                      <source 
                        src={issue.audio_url || `data:audio/wav;base64,${issue.audio_base64}`} 
                        type="audio/wav" 
                      />
                      Your browser does not support the audio element.
                    </audio>
                    <div className="audio-placeholder" style={{ display: 'none' }}>
                      <span>🔊 Audio Not Available</span>
                      <p className="media-note">Audio could not be loaded</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="detail-section">
          <h3>Timeline</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Reported Date</label>
              <div className="detail-value">{formatDate()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div className="image-modal-overlay" onClick={() => setShowImageModal(false)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="image-modal-header">
              <h3>Issue Image</h3>
              <div className="image-controls">
                <button onClick={() => setImageZoom(Math.max(0.5, imageZoom - 0.1))}>
                  🔍-
                </button>
                <span>{Math.round(imageZoom * 100)}%</span>
                <button onClick={() => setImageZoom(Math.min(3, imageZoom + 0.1))}>
                  🔍+
                </button>
                <button onClick={resetImageZoom}>Reset</button>
                <button onClick={() => setShowImageModal(false)}>✕</button>
              </div>
            </div>
            <div className="image-modal-body">
              <div 
                className="image-container"
                onWheel={handleImageWheel}
              >
                {(issue.image_url || issue.image_base64) ? (
                  <img
                    src={issue.image_url || issue.image_base64}
                    alt="Issue photo full size"
                    className="modal-image"
                    style={{
                      transform: `scale(${imageZoom}) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                      transition: 'transform 0.1s ease',
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }}
                    onError={(e) => {
                      console.error('Modal image failed to load:', e.target.src);
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                ) : null}
                <div className="image-placeholder large" style={{ display: 'none' }}>
                  <span>📷 Image Not Available</span>
                  <p>Image could not be loaded</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IssueDetail;
