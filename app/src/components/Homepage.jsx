import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAuth } from "../contexts/AuthContext";
import { issueAPI } from "../utils/api";
import LeafletMapComponent from "./LeafletMap";
import IssueForm from "./IssueForm";
import IssueDetail from "./IssueDetail";
import IssuesList from "./IssuesList";
import AccountDetails from "./AccountDetails";
import EmergencyContacts from "./EmergencyContacts";
import "./Homepage.css";

import { FaGear } from "react-icons/fa6";
import { FaHome } from "react-icons/fa";
import { MdReport } from "react-icons/md";
import { IoIosCall } from "react-icons/io";
import { IoRefresh } from "react-icons/io5";
import { FaSignOutAlt } from "react-icons/fa";

// ========================================
// CONFIGURABLE PROXIMITY SETTINGS FOR HOMEPAGE ISSUES
// Change these values to control proximity behavior
// ========================================
const PROXIMITY_RADIUS = 30; // 30 meters - change this value as needed
const PROXIMITY_REFRESH_INTERVAL = 5000 * 5; // 5 seconds - refresh interval in milliseconds

// Function to calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
};

const Homepage = ({ onShowAuth, isAuthActive = false }) => {
  const { user, logout } = useAuth();
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authEnabled, setAuthEnabled] = useState(true);
  const [panelHeight, setPanelHeight] = useState(40); // Percentage of screen height
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(40);
  const panelRef = useRef(null);
  const mapRef = useRef(null);
  const [mapResizeTrigger, setMapResizeTrigger] = useState(0);
  const [currentView, setCurrentView] = useState("home"); // 'home', 'issue-form', 'issue-detail', 'issues-list', 'account', or 'emergency-contacts'
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLastUpdated, setLocationLastUpdated] = useState(null);
  const [showIssuePopup, setShowIssuePopup] = useState(false); // Track popup visibility
  const [popupIssue, setPopupIssue] = useState(null); // Store issue to show in popup
  const [encounteredIssues, setEncounteredIssues] = useState([]); // Persistent list of issues user has encountered
  const [vouchedIssues, setVouchedIssues] = useState(() => {
    // Load vouched issues from localStorage on component mount
    const saved = localStorage.getItem("vouchedIssues");
    return new Set(saved ? JSON.parse(saved) : []);
  }); // Track issues that user has vouched for
  const [showEmergencyContacts, setShowEmergencyContacts] = useState(false); // Track emergency contacts modal

  // Function to get user location and update encountered issues
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setLocationLastUpdated(new Date());
          console.log("📍 Location updated:", latitude, longitude);

          // Update encountered issues based on current proximity
          updateEncounteredIssues([latitude, longitude]);
        },
        (error) => {
          console.error("❌ Error getting user location:", error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000, // Cache for 1 minute
        }
      );
    }
  };

  // Function to update encountered issues list
  const updateEncounteredIssues = (currentLocation) => {
    if (!currentLocation || issues.length === 0) return;

    // Find issues currently in proximity
    const currentNearbyIssues = issues.filter((issue) => {
      if (!issue.latitude || !issue.longitude) return false;
      const distance = calculateDistance(
        currentLocation[0], // user latitude
        currentLocation[1], // user longitude
        issue.latitude, // issue latitude
        issue.longitude // issue longitude
      );
      return distance <= PROXIMITY_RADIUS;
    });

    // Add new nearby issues to encountered issues (avoid duplicates)
    setEncounteredIssues((prevEncountered) => {
      const encounteredIds = new Set(prevEncountered.map((issue) => issue.id));
      const newIssues = currentNearbyIssues.filter(
        (issue) => !encounteredIds.has(issue.id)
      );

      if (newIssues.length > 0) {
        console.log(
          `📌 Added ${newIssues.length} new issues to encountered list`
        );
      }

      return [...prevEncountered, ...newIssues];
    });
  };

  // Get user location on mount and set up periodic refresh
  useEffect(() => {
    // Get initial location
    getUserLocation();

    // Set up interval for periodic location updates
    const locationInterval = setInterval(() => {
      getUserLocation();
    }, PROXIMITY_REFRESH_INTERVAL);

    // Cleanup interval on unmount
    return () => {
      clearInterval(locationInterval);
    };
  }, []);

  // Update encountered issues when issues list changes or user location changes
  useEffect(() => {
    if (userLocation && issues.length > 0) {
      updateEncounteredIssues(userLocation);
    }
  }, [issues, userLocation]); // Re-run when issues or user location changes

  // Save vouched issues to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("vouchedIssues", JSON.stringify([...vouchedIssues]));
  }, [vouchedIssues]);

  // Fetch nearby issues from API (excluding user's own issues)
  const fetchIssues = async () => {
    try {
      console.log(
        "🔄 Fetching nearby issues from API (excluding user's own issues)..."
      );

      // Use the new nearby issues API endpoint that excludes user's own issues
      const response = await issueAPI.getNearbyIssues();

      if (response.issues && Array.isArray(response.issues)) {
        console.log(
          `✅ Successfully fetched ${response.issues.length} nearby issues`
        );
        console.log(
          `ℹ️ Source: ${response.source}, User issues excluded: ${response.excluded_user_issues}`
        );
        setIssues(response.issues);
      } else {
        console.warn("⚠️ Invalid response format from nearby issues API");
        setIssues([]);
      }
    } catch (error) {
      console.error("❌ Failed to fetch nearby issues from API:", error);

      // Fallback to Rust backend
      try {
        console.log("🔄 Falling back to Rust backend...");
        const fetchedIssues = await invoke("fetch_issues_from_flask");
        console.log(
          "✅ Successfully fetched issues via Rust backend:",
          fetchedIssues
        );
        setIssues(fetchedIssues);
      } catch (rustError) {
        console.error("❌ Rust backend also failed:", rustError);

        // Final fallback to local storage
        try {
          console.log("🔄 Final fallback to local storage...");
          const localIssues = await invoke("get_issues");
          console.log("✅ Successfully fetched local issues:", localIssues);
          setIssues(localIssues);
        } catch (localError) {
          console.error("❌ Failed to fetch local issues:", localError);
          setIssues([]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch nearby issues on mount and set up periodic refresh
  useEffect(() => {
    // Initial fetch
    fetchIssues();

    // Set up interval for periodic issue fetching
    const issuesInterval = setInterval(() => {
      fetchIssues();
    }, PROXIMITY_REFRESH_INTERVAL);

    // Cleanup interval on unmount
    return () => {
      clearInterval(issuesInterval);
    };
  }, [user]); // Re-fetch when user login status changes

  const handleRaiseIssue = () => {
    if (user || !authEnabled) {
      setCurrentView("issue-form");
    } else {
      onShowAuth();
      // setCurrentView("issue-form");
    }
  };

  const refreshIssues = async () => {
    try {
      console.log(
        "🔄 Refreshing nearby issues (excluding user's own issues)..."
      );

      // Use the nearby issues API that excludes user's own issues
      const response = await issueAPI.getNearbyIssues();

      if (response.issues && Array.isArray(response.issues)) {
        console.log(
          `✅ Successfully refreshed ${response.issues.length} nearby issues`
        );
        console.log(
          `ℹ️ Source: ${response.source}, User issues excluded: ${response.excluded_user_issues}`
        );
        setIssues(response.issues);
      } else {
        console.warn(
          "⚠️ Invalid response format from nearby issues API during refresh"
        );
        setIssues([]);
      }
    } catch (error) {
      console.error("❌ Failed to refresh nearby issues from API:", error);

      // Fallback to Rust backend
      try {
        console.log("🔄 Falling back to Rust backend for refresh...");
        const fetchedIssues = await invoke("fetch_issues_from_flask");
        console.log(
          "✅ Successfully refreshed issues via Rust backend:",
          fetchedIssues
        );
        setIssues(fetchedIssues);
      } catch (rustError) {
        console.error("❌ Rust backend refresh failed:", rustError);

        // Final fallback to local storage
        try {
          console.log("🔄 Final fallback to local storage for refresh...");
          const localIssues = await invoke("get_issues");
          console.log(
            "✅ Successfully fetched local issues during refresh:",
            localIssues
          );
          setIssues(localIssues);
        } catch (localError) {
          console.error(
            "❌ Failed to fetch local issues during refresh:",
            localError
          );
        }
      }
    }
  };

  const handleIssueCreated = async (newIssue) => {
    // Add the new issue to the current list immediately for better UX
    setIssues((prevIssues) => [...prevIssues, newIssue]);
    setCurrentView("home");

    // Refresh the list from Flask API to get the latest data with proper IDs
    await refreshIssues();
  };

  const handleBackToHome = () => {
    setCurrentView("home");
    setSelectedIssue(null);
  };

  const handleViewIssueDetail = (issue) => {
    setSelectedIssue(issue);
    setCurrentView("issue-detail");
  };

  const handleViewIssuesList = () => {
    setCurrentView("issues-list");
  };

  const handleViewEmergencyContacts = () => {
    setCurrentView("emergency-contacts");
  };

  // Handle issue popup display
  const showIssueDetails = (issue) => {
    setPopupIssue(issue);
    setShowIssuePopup(true);
  };

  const closeIssuePopup = () => {
    setShowIssuePopup(false);
    setPopupIssue(null);
  };

  // Format date helper function
  const formatDate = (issue) => {
    if (issue.created_at) {
      try {
        return new Date(issue.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      } catch (e) {
        return issue.date || "Unknown";
      }
    }
    return issue.date || "Unknown";
  };

  const handleVouchForIssue = async (issueId) => {
    try {
      // Check if user is authenticated
      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        alert(
          "❌ You must be logged in to vouch for issues. Please login first."
        );
        if (onShowAuth) {
          onShowAuth();
        }
        return;
      }

      console.log("🗳️ Vouching for issue:", issueId);
      const result = await invoke("vouch_for_issue", {
        issueId: issueId.toString(),
        authToken: authToken,
      });
      console.log("✅ Vouch successful:", result);

      // Add to vouched issues set
      setVouchedIssues((prev) => new Set([...prev, issueId]));

      // Show success feedback (you can remove this alert if you prefer)
      // alert('✅ Successfully vouched for this issue! Priority may be increased.');

      // Refresh issues to get updated data
      await refreshIssues();
    } catch (error) {
      console.error("❌ Failed to vouch for issue:", error);
      if (
        error.toString().includes("401") ||
        error.toString().includes("Unauthorized")
      ) {
        alert("❌ Authentication failed. Please login again.");
        localStorage.removeItem("authToken");
        if (onShowAuth) {
          onShowAuth();
        }
      } else {
        alert("❌ Failed to vouch for issue: " + error);
      }
    }
  };

  // Handle drag start
  const handleDragStart = (e) => {
    setIsDragging(true);
    const clientY = e.type === "touchstart" ? e.touches[0].clientY : e.clientY;
    setStartY(clientY);
    setStartHeight(panelHeight);

    // Prevent text selection during drag
    document.body.style.userSelect = "none";
  };

  // Emergency Contacts Data
  const emergencyContacts = {
    emergency: [
      { name: "Police Control Room", number: "100" },
      { name: "Women's Helpline (Vanitha Sahayavani)", number: "1091" },
      { name: "Fire & Rescue Services", number: "101" },
      { name: "Ambulance (108)", number: "108" },
      { name: "Disaster Management (112)", number: "112" },
    ],
    bbmp: [
      { name: "24/7 Toll-Free Helpline", number: "1533" },
      { name: "Head Office Control Room", number: "08022660000" },
      { name: "Head Office Control Room", number: "08022975595" },
      { name: "Head Office Control Room", number: "08022221188" },
      { name: "WhatsApp Helpline", number: "9480685700" },
    ],
    zones: [
      { name: "East Zone", number: "9480685702" },
      { name: "East Zone", number: "08022975803" },
      { name: "West Zone", number: "9480685703" },
      { name: "West Zone", number: "08023561692" },
      { name: "West Zone", number: "08023463366" },
      { name: "South Zone", number: "9480685704" },
      { name: "South Zone", number: "08026566362" },
      { name: "South Zone", number: "08022975703" },
      { name: "Mahadevapura", number: "9480685706" },
      { name: "Mahadevapura", number: "08028512300" },
      { name: "Bommanahalli", number: "9480685707" },
      { name: "Bommanahalli", number: "08025735642" },
      { name: "Bommanahalli", number: "08025732447" },
      { name: "Yelahanka", number: "9480685705" },
      { name: "Yelahanka", number: "7022664419" },
      { name: "Yelahanka", number: "08023636671" },
      { name: "Yelahanka", number: "08022975936" },
      { name: "R R Nagar", number: "9480685708" },
      { name: "R R Nagar", number: "08028601851" },
      { name: "Dasarahalli", number: "9480685709" },
      { name: "Dasarahalli", number: "08028394909" },
    ],
    civic: [
      { name: "Street Light Complaints", number: "08022221188" },
      { name: "Water Supply Issues", number: "08022221188" },
      { name: "Drainage Problems", number: "08022221188" },
      { name: "Stormwater Drain Complaints", number: "08022221188" },
    ],
  };

  const handleCall = async (phoneNumber) => {
    try {
      await invoke("open_dialer", { phoneNumber });
    } catch (error) {
      console.error("Failed to open dialer:", error);
      // Fallback to web approach
      window.open(`tel:${phoneNumber}`, "_self");
    }
  };

  const toggleEmergencyContacts = () => {
    setShowEmergencyContacts(!showEmergencyContacts);
  };

  const testSimpleIssue = async () => {
    try {
      const result = await invoke("test_simple_issue_submission");
      alert("Simple issue test: " + result);
    } catch (error) {
      alert("Simple issue test failed: " + error);
    }
  };

  // Handle drag move
  const handleDragMove = (e) => {
    if (!isDragging) return;

    e.preventDefault();
    const clientY = e.type === "touchmove" ? e.touches[0].clientY : e.clientY;
    const deltaY = startY - clientY; // Negative when dragging down, positive when dragging up
    const screenHeight = window.innerHeight;
    const deltaPercent = (deltaY / screenHeight) * 100;

    let newHeight = startHeight + deltaPercent;

    // Constrain between 10% and 90%
    newHeight = Math.max(10, Math.min(90, newHeight));

    setPanelHeight(newHeight);

    // Update expanded state based on height
    setPanelExpanded(newHeight > 60);

    // Trigger immediate map resize during drag
    setMapResizeTrigger((prev) => prev + 1);
  };

  // Handle drag end
  const handleDragEnd = () => {
    if (!isDragging) return;

    setIsDragging(false);
    document.body.style.userSelect = "";

    // Snap to positions
    if (panelHeight > 75) {
      setPanelHeight(70); // Full screen
      setPanelExpanded(true);
    } else if (panelHeight > 50) {
      setPanelHeight(70); // Expanded
      setPanelExpanded(true);
    } else if (panelHeight > 25) {
      setPanelHeight(40); // Default
      setPanelExpanded(false);
    } else {
      setPanelHeight(15); // Minimized
      setPanelExpanded(false);
    }
  };

  // Add event listeners for mouse/touch events
  useEffect(() => {
    const handleMouseMove = (e) => handleDragMove(e);
    const handleMouseUp = () => handleDragEnd();
    const handleTouchMove = (e) => handleDragMove(e);
    const handleTouchEnd = () => handleDragEnd();

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      document.addEventListener("touchend", handleTouchEnd);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, startY, startHeight, panelHeight]);

  // Trigger map resize when panel height changes
  useEffect(() => {
    const timeoutId = setTimeout(
      () => {
        // Trigger map resize
        setMapResizeTrigger((prev) => prev + 1);
      },
      isDragging ? 0 : 300
    ); // Immediate during drag, delayed after drag ends

    return () => clearTimeout(timeoutId);
  }, [panelHeight, isDragging]);

  return (
    <div className="homepage">
      {/* Home View */}
      <div
        className={`home-view ${currentView === "home" ? "active" : "hidden"}`}
      >
        {/* Black Bar Above Map */}
        <div className="top-black-bar"></div>

        {/* Leaflet Map */}
        <div
          className="map-container"
          style={{
            height: `calc(100vh - ${panelHeight}vh - 90px)`, // Increased to account for black bar (40px) + navbar (50px)
            transition: isDragging ? "none" : "height 0.3s ease",
          }}
        >
          <LeafletMapComponent
            issues={issues}
            resizeTrigger={mapResizeTrigger}
          />
        </div>

        {/* Sliding Panel */}
        <div
          ref={panelRef}
          className={`sliding-panel ${panelExpanded ? "expanded" : ""}`}
          style={{
            height: `${panelHeight}vh`,
            transition: isDragging ? "none" : "height 0.3s ease",
          }}
        >
          {/* Draggable Header Area */}
          <div
            className="panel-drag-area"
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            style={{ cursor: isDragging ? "grabbing" : "grab" }}
          >
            {/* Handle Bar */}
            <div className="panel-handle"></div>
          </div>

          {/* Raise Ticket Button */}
    <div className="search-section">
  <button
    className="raise-ticket-btn"
    onClick={handleRaiseIssue}
  >
    {!authEnabled || user ? "Raise a New Issue" : "Login to Raise Issue"}
  </button>
</div>

          {/* Raised Issues List */}
          <div className="issues-section">
            {loading ? (
              <div className="loading-issues">Loading issues...</div>
            ) : (
              (() => {
                // Show only currently nearby issues (within proximity)
                const currentNearbyIssues = userLocation
                  ? issues.filter((issue) => {
                      if (!issue.latitude || !issue.longitude) return false;
                      const distance = calculateDistance(
                        userLocation[0],
                        userLocation[1],
                        issue.latitude,
                        issue.longitude
                      );
                      return distance <= PROXIMITY_RADIUS;
                    })
                  : issues; // Show all issues if no location available

                const displayIssues = currentNearbyIssues;
                const currentNearbyCount = currentNearbyIssues.length;

                return displayIssues.length > 0 ? (
                  <>
                    {/* Proximity info - Compact */}
                    <div
                      className="proximity-info"
                      style={{
                        padding: "4px 8px",
                        background: "#f8f9fa",
                        borderRadius: "4px",
                        marginBottom: "6px",
                        fontSize: "11px",
                        color: "#6c757d",
                        textAlign: "center",
                      }}
                    >
                      {userLocation ? (
                        <div style={{ fontSize: "12px", opacity: 0.9 }}>
                          {currentNearbyCount} nearby issues
                          {locationLastUpdated && (
                            <>
                              {" "}
                              · Updated{" "}
                              {locationLastUpdated.toLocaleTimeString()}
                            </>
                          )}
                        </div>
                      ) : (
                        <span>Locating... · Showing all issues</span>
                      )}
                    </div>
                    {displayIssues.map((issue) => (
                      <div key={issue.id} className="issue-card-simple">
                        <div
                          className="issue-card-content"
                          onClick={() => showIssueDetails(issue)}
                        >
                          <div className="issue-card-main">
                            <div className="issue-info-clean">
                              <h4 className="issue-title-clean">
                                {issue.title}
                              </h4>
                              {issue.category && (
                                <span className="issue-category-clean">
                                  {issue.category}
                                </span>
                              )}
                            </div>
                            <span className="issue-date-clean">
                              {formatDate(issue)}
                            </span>
                          </div>
                        </div>
                        <button
                          className={`vouch-btn-clean ${
                            vouchedIssues.has(issue.id) ? "vouched" : ""
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!vouchedIssues.has(issue.id)) {
                              handleVouchForIssue(issue.id);
                            }
                          }}
                          disabled={vouchedIssues.has(issue.id)}
                          title={
                            vouchedIssues.has(issue.id)
                              ? "You have already vouched for this issue"
                              : "Vouch for this issue"
                          }
                        >
                          {vouchedIssues.has(issue.id) ? "✓ Vouched" : "Vouch"}
                        </button>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="no-issues">
                    {userLocation
                      ? `No civic issues found in your surroundings. Move around to discover nearby issues!`
                      : "No issues reported yet. Click on the map to select a location and raise an issue!"}
                  </div>
                );
              })()
            )}
          </div>
        </div>

        {/* Fixed Bottom Navigation */}
        {!isAuthActive && (
          <div className="bottom-icons fixed-navbar">
            <button className="icon-btn" onClick={() => setCurrentView("home")}>
              <FaHome />
            </button>
            <button className="icon-btn">
              <MdReport />
            </button>
            <button className="icon-btn" onClick={handleViewEmergencyContacts}>
              <IoIosCall />
            </button>
            {user ? (
              <button
                className="icon-btn"
                onClick={() => setCurrentView("account")}
                title="Account"
              >
                <FaGear />
              </button>
            ) : (
              <button className="icon-btn" onClick={onShowAuth} title="Login">
                <FaSignOutAlt />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Issue Details Popup */}
      {showIssuePopup && popupIssue && (
        <div className="issue-popup-overlay" onClick={closeIssuePopup}>
          <div
            className="issue-popup-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="issue-popup-header">
              <h3 className="issue-popup-title">{popupIssue.title}</h3>
              <button className="issue-popup-close" onClick={closeIssuePopup}>
                ×
              </button>
            </div>

            <div className="issue-popup-body">
              <div className="issue-popup-meta">
                <div className="popup-meta-item">
                  <span className="popup-meta-label">Date:</span>
                  <span className="popup-meta-value">
                    {formatDate(popupIssue)}
                  </span>
                </div>
                <div className="popup-meta-item">
                  <span className="popup-meta-label">Status:</span>
                  <span
                    className={`popup-status status-${popupIssue.status
                      .toLowerCase()
                      .replace(" ", "-")}`}
                  >
                    {popupIssue.status}
                  </span>
                </div>
                {popupIssue.category && (
                  <div className="popup-meta-item">
                    <span className="popup-meta-label">Category:</span>
                    <span className="popup-meta-value">
                      {popupIssue.category}
                    </span>
                  </div>
                )}
                {popupIssue.priority && (
                  <div className="popup-meta-item">
                    <span className="popup-meta-label">Priority:</span>
                    <span
                      className={`popup-meta-value priority-${popupIssue.priority.toLowerCase()}`}
                    >
                      {popupIssue.priority.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              <div className="issue-popup-description">
                <h4>Description</h4>
                <p>{popupIssue.description}</p>
              </div>
            </div>

            <div className="issue-popup-footer">
              <button
                className={`popup-vouch-btn ${
                  vouchedIssues.has(popupIssue.id) ? "vouched" : ""
                }`}
                onClick={() => {
                  if (!vouchedIssues.has(popupIssue.id)) {
                    handleVouchForIssue(popupIssue.id);
                    // Don't close popup automatically so user can see the button change
                  }
                }}
                disabled={vouchedIssues.has(popupIssue.id)}
                title={
                  vouchedIssues.has(popupIssue.id)
                    ? "You have already vouched for this issue"
                    : "Vouch for this issue"
                }
              >
                {vouchedIssues.has(popupIssue.id)
                  ? "✓ Already Vouched"
                  : "Vouch for this Issue"}
              </button>
              <button
                className="popup-detail-btn"
                onClick={() => {
                  handleViewIssueDetail(popupIssue);
                  closeIssuePopup();
                }}
              >
                View Full Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Form View */}
      <div
        className={`issue-form-view ${
          currentView === "issue-form" ? "active" : "hidden"
        }`}
      >
        <IssueForm
          onBack={handleBackToHome}
          onIssueCreated={handleIssueCreated}
        />
      </div>

      {/* Issue Detail View */}
      {currentView === "issue-detail" && (
        <IssueDetail issue={selectedIssue} onBack={handleBackToHome} />
      )}

      {/* Issues List View */}
      {currentView === "issues-list" && (
        <IssuesList
          onBack={handleBackToHome}
          onViewDetail={handleViewIssueDetail}
        />
      )}

      {/* Account Details View */}
      {currentView === "account" && (
        <AccountDetails onBack={handleBackToHome} />
      )}

      {/* Emergency Contacts View */}
      {currentView === "emergency-contacts" && (
        <EmergencyContacts onBack={handleBackToHome} />
      )}

      {/* Fixed Bottom Navigation - Always Visible */}
      {!isAuthActive && (
        <div className="bottom-icons fixed-navbar">
          <button className="icon-btn" onClick={handleBackToHome}>
            <FaHome />
          </button>
          <button className="icon-btn" onClick={handleViewIssuesList}>
            <MdReport />
          </button>
          <button className="icon-btn" onClick={handleViewEmergencyContacts}>
            <IoIosCall />
          </button>
          {user ? (
            <button
              className="icon-btn"
              onClick={() => setCurrentView("account")}
              title="Account Settings"
            >
              <FaGear />
            </button>
          ) : (
            <button
              className="icon-btn"
              onClick={onShowAuth}
              title="Login to Access Account"
            >
              <FaGear />
            </button>
          )}
        </div>
      )}

      {/* Emergency Contacts Modal */}
      {showEmergencyContacts && (
        <div
          className="emergency-modal-overlay"
          onClick={toggleEmergencyContacts}
        >
          <div className="emergency-modal" onClick={(e) => e.stopPropagation()}>
            <div className="emergency-header">
              <h2>🚨 Emergency Contacts</h2>
              <button className="close-btn" onClick={toggleEmergencyContacts}>
                ✕
              </button>
            </div>
            <div className="emergency-content">
              <div className="emergency-section">
                <h3>🚨 Police & Emergency Services</h3>
                {emergencyContacts.emergency.map((contact, index) => (
                  <div key={index} className="contact-row">
                    <span>
                      {contact.name}: {contact.number}
                    </span>
                    <button
                      className="call-btn"
                      onClick={() => handleCall(contact.number)}
                      title={`Call ${contact.number}`}
                    >
                      📞
                    </button>
                  </div>
                ))}
              </div>

              <div className="emergency-section">
                <h3>🏥 BBMP Emergency Helplines</h3>
                {emergencyContacts.bbmp.map((contact, index) => (
                  <div key={index} className="contact-row">
                    <span>
                      {contact.name}: {contact.number}
                    </span>
                    <button
                      className="call-btn"
                      onClick={() => handleCall(contact.number)}
                      title={`Call ${contact.number}`}
                    >
                      📞
                    </button>
                  </div>
                ))}
                <div className="website-info">
                  <p>📱 WhatsApp Helpline: 9480685700</p>
                  <p>🌐 bbmp.gov.in</p>
                </div>
              </div>

              <div className="emergency-section">
                <h3>🧹 Zonal Control Rooms</h3>
                {emergencyContacts.zones.map((contact, index) => (
                  <div key={index} className="contact-row">
                    <span>
                      {contact.name}: {contact.number}
                    </span>
                    <button
                      className="call-btn"
                      onClick={() => handleCall(contact.number)}
                      title={`Call ${contact.number}`}
                    >
                      📞
                    </button>
                  </div>
                ))}
              </div>

              <div className="emergency-section">
                <h3>💡 Civic Services</h3>
                {emergencyContacts.civic.map((contact, index) => (
                  <div key={index} className="contact-row">
                    <span>
                      {contact.name}: {contact.number}
                    </span>
                    <button
                      className="call-btn"
                      onClick={() => handleCall(contact.number)}
                      title={`Call ${contact.number}`}
                    >
                      📞
                    </button>
                  </div>
                ))}
              </div>

              <div className="emergency-section">
                <h3>📍 BBMP Head Office</h3>
                <div className="office-info">
                  <p>
                    <strong>Address:</strong> N.R. Square, Bengaluru, Karnataka
                    560002, India
                  </p>
                  <div className="contact-row">
                    <span>Phone: 1533</span>
                    <button
                      className="call-btn"
                      onClick={() => handleCall("1533")}
                      title="Call 1533"
                    >
                      📞
                    </button>
                  </div>
                  <p>
                    <strong>Email:</strong> comm@bbmp.gov.in
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Homepage;
