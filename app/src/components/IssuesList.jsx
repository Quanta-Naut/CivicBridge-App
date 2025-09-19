import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { IoRefresh, IoSearch, IoFilter, IoThumbsUp } from "react-icons/io5";
import { useAuth } from '../contexts/AuthContext';
import './IssuesList.css';

import { MdKeyboardArrowLeft } from "react-icons/md";

const IssuesList = ({ onBack, onViewDetail }) => {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showMyIssues, setShowMyIssues] = useState(false);
  const [showOpenOnly, setShowOpenOnly] = useState(true); // On by default

  // Pagination state
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Refresh issues from Flask API
  const refreshIssues = async () => {
    setLoading(true);
    try {
      console.log('🔄 Refreshing issues from Flask API...');
      const fetchedIssues = await invoke('fetch_issues_from_flask');
      console.log('✅ Successfully refreshed issues:', fetchedIssues);
      
      // Log first few issues to see vouch_priority values
      if (fetchedIssues && fetchedIssues.length > 0) {
        console.log('📊 Sample issue data:', {
          id: fetchedIssues[0].id,
          title: fetchedIssues[0].title,
          vouch_priority: fetchedIssues[0].vouch_priority,
          vouch_count: fetchedIssues[0].vouch_count
        });
      }
      
      setIssues(fetchedIssues);
    } catch (error) {
      console.error('❌ Failed to refresh issues from Flask API:', error);
      
      // Fallback to local storage
      try {
        console.log('🔄 Falling back to local storage...');
        const localIssues = await invoke('get_issues');
        console.log('✅ Successfully fetched local issues:', localIssues);
        setIssues(localIssues);
      } catch (localError) {
        console.error('❌ Failed to fetch local issues:', localError);
      }
    } finally {
      setLoading(false);
    }
  };

  // Load issues on component mount
  useEffect(() => {
    refreshIssues();
  }, []);



  // Filter issues based on search and filters
  const filteredIssues = issues.filter(issue => {
    const matchesSearch = issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         issue.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || issue.status.toLowerCase() === statusFilter.toLowerCase();
    
    const matchesCategory = categoryFilter === 'all' || 
                           (issue.category && issue.category.toLowerCase() === categoryFilter.toLowerCase());
    
    const matchesPriority = priorityFilter === 'all' || 
                           (issue.priority && issue.priority.toLowerCase() === priorityFilter.toLowerCase());
    
    // Filter by current user if "My Issues" is toggled
    const matchesUser = !showMyIssues || 
                       (user && issue.user_phone && issue.user_phone === user.phone);
    
    // Filter to show open issues when toggle is on, closed/resolved issues when toggle is off
    const matchesOpenOnly = showOpenOnly ? 
                           (issue.status && issue.status.toLowerCase() === 'open') :
                           (issue.status && (issue.status.toLowerCase() === 'closed' || 
                                            issue.status.toLowerCase() === 'resolved'));
    
    return matchesSearch && matchesStatus && matchesCategory && matchesPriority && matchesUser && matchesOpenOnly;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredIssues.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedIssues = filteredIssues.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, categoryFilter, priorityFilter, showMyIssues, showOpenOnly]);

  // Reset to first page when items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  const getAddressFromCoordinates = (latitude, longitude) => {
    // For now, return a simplified address format
    // In a real app, you might want to use reverse geocoding
    return `${latitude?.toFixed(4)}, ${longitude?.toFixed(4)}`;
  };

  const formatDate = (issue) => {
    if (issue.created_at) {
      try {
        return new Date(issue.created_at).toLocaleDateString();
      } catch (e) {
        return issue.date || 'Unknown';
      }
    }
    return issue.date || 'Unknown';
  };

  return (
    <div className="issues-list-container">
      {/* Top Black Bar */}
      <div className="top-black-bar"></div>
      
      {/* Header */}
     <div className="issues-list-header">
  <div className="issues-left-group">
    <button className="back-btn" onClick={onBack}>
      <MdKeyboardArrowLeft />
    </button>
    <h2>All Issues</h2>
  </div>
  <button 
    className="refresh-btn-header" 
    onClick={refreshIssues}
    disabled={loading}
    title="Refresh issues"
  >
    <IoRefresh className={loading ? 'spinning' : ''} />
  </button>
</div>

      {/* Search and Filters */}
<div className="search-filter-section">
  <button 
    className="filter-toggle-btn"
    onClick={() => setShowFilters(!showFilters)}
  >
    <IoFilter /> Filters
  </button>

  <div className="toggle-group">
    <button 
      className={`my-issues-toggle ${showMyIssues ? 'active' : ''}`}
      onClick={() => setShowMyIssues(!showMyIssues)}
    >
      {showMyIssues ? 'My Issues' : 'All Issues'}
    </button>

    <button 
      className={`open-issues-toggle ${showOpenOnly ? 'active' : ''}`}
      onClick={() => setShowOpenOnly(!showOpenOnly)}
    >
      {showOpenOnly ? 'Open' : 'Closed'}
    </button>
  </div>
</div>


      {/* Filter Options */}
      {showFilters && (
        <div className="filters-container">
          <div className="filter-group">
            <label>Status:</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Category:</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All Categories</option>
              <option value="Road">Road</option>
              <option value="Drainage">Drainage</option>
              <option value="Street Light">Street Light</option>
              <option value="Garbage">Garbage</option>
              <option value="Water Supply">Water Supply</option>
              <option value="Sewerage">Sewerage</option>
              <option value="Parks">Parks</option>
              <option value="Traffic">Traffic</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Priority:</label>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <button 
            className="clear-filters-btn"
            onClick={() => {
              setStatusFilter('all');
              setCategoryFilter('all');
              setPriorityFilter('all');
              setSearchQuery('');
            }}
          >
            Clear All
          </button>
        </div>
      )}

      {/* Results Summary with Pagination */}
      <div className="results-summary">
        <div className="results-controls">
          <div className="results-info">
            <span>
              Showing {startIndex + 1}-{Math.min(endIndex, filteredIssues.length)} of {filteredIssues.length} issues
              {searchQuery && ` for "${searchQuery}"`}
            </span>
          </div>

          <div className="pagination-controls">
            <div className="items-per-page">
              <label>Show:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="items-per-page-select"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="page-navigation">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="page-btn"
              >
                ‹ Prev
              </button>

              <span className="page-info">
                Page {currentPage} of {totalPages || 1}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages || 1, prev + 1))}
                disabled={currentPage === (totalPages || 1)}
                className="page-btn"
              >
                Next ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Issues List */}
      <div className="issues-list-content">
        {loading ? (
          <div className="loading-state">
            <IoRefresh className="spinning" />
            <p>Loading issues...</p>
          </div>
        ) : paginatedIssues.length > 0 ? (
          <div className="issues-grid">
            {paginatedIssues.map((issue) => (
              <div key={issue.id} className="issue-card">
                <div className="issue-card-header">
                  <h3 className="issue-card-title">{issue.title}</h3>
                  <div className="vouch-count">
                    <IoThumbsUp className="vouch-icon" />
                    <span className="vouch-number">{issue.vouch_priority || issue.vouch_count || 0}</span>
                  </div>

                </div>

                <div className="issue-card-meta">
                  <div className="meta-row">
                    <span className="meta-label">Date Created:</span>
                    <span className="meta-value">{formatDate(issue)}</span>
                  </div>
                  
                  <div className="meta-row">
                    <span className="meta-label">Address:</span>
                    <span className="meta-value">
                      {getAddressFromCoordinates(issue.latitude, issue.longitude)}
                    </span>
                  </div>
                  
                  {issue.priority && (
                    <div className="meta-row">
                      <span className="meta-label">Priority:</span>
                      <span className={`meta-value priority-${issue.priority.toLowerCase()}`}>
                        {issue.priority.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="issue-card-actions">
                  <button 
                    className="view-detail-btn"
                    onClick={() => onViewDetail(issue)}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No issues found</h3>
            <p>
              {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'No issues have been reported yet. Click the "Raise a New Issue" button to report one!'
              }
            </p>
            {(searchQuery || statusFilter !== 'all' || categoryFilter !== 'all' || priorityFilter !== 'all') && (
              <button 
                className="clear-filters-btn"
                onClick={() => {
                  setStatusFilter('all');
                  setCategoryFilter('all');
                  setPriorityFilter('all');
                  setSearchQuery('');
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default IssuesList;
