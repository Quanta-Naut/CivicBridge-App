import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { invoke } from "@tauri-apps/api/core";
import { FaRegCircleDot } from "react-icons/fa6";

// ========================================
// CONFIGURABLE MAP ZOOM LEVELS
// Change these values to control map zoom behavior
// ========================================
const MAP_ZOOM_WITH_LOCATION = 16; // Zoom level when user location is available (higher = more zoomed in)
const MAP_ZOOM_DEFAULT = 16; // Default zoom level when no user location (higher = more zoomed in)
const MAP_ZOOM_ON_CENTER = 16; // Zoom level when manually centering to user location

// Fix default Leaflet markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom icon for user location (Google Maps style)
const userLocationIcon = new L.DivIcon({
  className: 'user-location-marker',
  html: `
    <div style="
      position: relative;
      width: 20px;
      height: 20px;
    ">
      <!-- Outer light blue circle -->
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 40px;
        height: 40px;
        background-color: rgba(66, 133, 244, 0.2);
        border: 2px solid rgba(66, 133, 244, 0.5);
        border-radius: 50%;
      "></div>
      <!-- Inner blue dot -->
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 12px;
        height: 12px;
        background-color: #4285f4;
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20]
});

// Category icon configurations
const categoryConfig = {
  'garbage': { color: '#e74c3c', icon: '🗑️', name: 'Garbage' },
  'street-light': { color: '#f39c12', icon: '💡', name: 'Street Light' },
  'potholes': { color: '#8e44ad', icon: '🕳️', name: 'Potholes' },
  'public-transport': { color: '#3498db', icon: '🚌', name: 'Public Transport' },
  'road-infrastructure': { color: '#2c3e50', icon: '🛤️', name: 'Road Infrastructure' },
  'drainage': { color: '#16a085', icon: '🌊', name: 'Drainage' },
  'public-property': { color: '#e67e22', icon: '🏢', name: 'Public Property' },
  'street-dogs': { color: '#d35400', icon: '🐕', name: 'Street Dogs' },
  'roadside-trees': { color: '#27ae60', icon: '🌳', name: 'Roadside Trees' },
  'powerlines': { color: '#f1c40f', icon: '⚡', name: 'Power Lines' },
  'footpath': { color: '#95a5a6', icon: '🚶', name: 'Footpath' },
  'other': { color: '#7f8c8d', icon: '❓', name: 'Other' }
};

// Function to create category-specific icons
const createCategoryIcon = (category) => {
  const config = categoryConfig[category] || categoryConfig['other'];
  
  return new L.DivIcon({
    className: 'category-marker',
    html: `
      <div style="
        position: relative;
        width: 24px;
        height: 24px;
      ">
        <!-- Pin background -->
        <div style="
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 20px;
          background-color: ${config.color};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
        ">
          ${config.icon}
        </div>
        <!-- Pin pointer -->
        <div style="
          position: absolute;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 6px solid ${config.color};
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));
        "></div>
      </div>
    `,
    iconSize: [24, 30],
    iconAnchor: [12, 26],
    popupAnchor: [0, -26]
  });
};

// Component to handle map centering
function MapCenterController({ center, shouldCenter, onCenterSet }) {
  const map = useMap();
  
  useEffect(() => {
    if (center && shouldCenter) {
      map.setView(center, MAP_ZOOM_ON_CENTER);
      if (onCenterSet) {
        onCenterSet();
      }
    }
  }, [map, center, shouldCenter, onCenterSet]);
  
  return null;
}

// Component to handle map resizing
function MapResizeController({ triggerResize }) {
  const map = useMap();
  
  useEffect(() => {
    if (triggerResize) {
      // Small delay to ensure container has resized
      const timeoutId = setTimeout(() => {
        map.invalidateSize();
      }, 10);
      
      return () => clearTimeout(timeoutId);
    }
  }, [map, triggerResize]);
  
  return null;
}

// Component to remove zoom control
function MapControlController() {
  const map = useMap();
  
  useEffect(() => {
    map.removeControl(map.zoomControl);
  }, [map]);
  
  return null;
}

export default function LeafletMapComponent({ issues = [], resizeTrigger }) {
  // Default center location (New Delhi, India)
  const defaultCenter = [28.6139, 77.2090];
  const [userLocation, setUserLocation] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [shouldCenterOnUser, setShouldCenterOnUser] = useState(true);
  const mapRef = useRef(null);
  const watchId = useRef(null);

  useEffect(() => {
    const startLocationTracking = () => {
      if (navigator.geolocation) {
        // Get initial position
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation([latitude, longitude]);
            console.log("Initial location obtained:", latitude, longitude);
          },
          (error) => {
            console.error("Geolocation error:", error);
            setPermissionStatus("denied");
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );

        // Start watching position with 2-second updates
        watchId.current = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation([latitude, longitude]);
            console.log("Location updated:", latitude, longitude);
          },
          (error) => {
            console.error("Geolocation watch error:", error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 2000 // Update every 2 seconds
          }
        );
      } else {
        console.error("Geolocation is not supported by this browser.");
      }
    };

    startLocationTracking();

    // Cleanup function
    return () => {
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  const handleRecenterToUser = () => {
    if (userLocation) {
      setShouldCenterOnUser(true);
    }
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <MapContainer
        center={userLocation || defaultCenter}
        zoom={userLocation ? MAP_ZOOM_WITH_LOCATION : MAP_ZOOM_DEFAULT}
        style={{ width: "100%", height: "100%" }}
        ref={mapRef}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        {/* Map center controller */}
        <MapCenterController 
          center={userLocation} 
          shouldCenter={shouldCenterOnUser}
          onCenterSet={() => setShouldCenterOnUser(false)}
        />
        
        {/* Map resize controller */}
        <MapResizeController triggerResize={resizeTrigger} />
        
        {/* Map control controller */}
        <MapControlController />

        {/* Show user location */}
        {userLocation && (
          <Marker position={userLocation} icon={userLocationIcon}>
            <Popup>📍 Your Current Location</Popup>
          </Marker>
        )}

        {/* Render issues */}
        {issues.map((issue) => (
          <Marker
            key={issue.id}
            position={[issue.latitude, issue.longitude]}
            icon={createCategoryIcon(issue.category)}
          >
            <Popup>
              <div>
                <strong>{issue.title}</strong>
                <br />
                <span style={{ color: '#666', fontSize: '12px' }}>
                  {categoryConfig[issue.category]?.name || 'Other'}
                </span>
                {issue.priority && (
                  <div style={{ marginTop: '4px', fontSize: '11px' }}>
                    Priority: <span style={{ textTransform: 'capitalize' }}>{issue.priority}</span>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Recenter button */}
      {userLocation && (
        <button
          onClick={handleRecenterToUser}
          style={{
            position: "absolute",
            bottom: "30px",
            right: "20px",
            zIndex: 1000,
            backgroundColor: "#fff",
            border: "2px solid #ccc",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            cursor: "pointer",
            boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px"
          }}
          title="Center on my location"
        >
          <FaRegCircleDot />
        </button>
      )}
    </div>
  );
}
