import React from "react";
import "./SplashScreen.css";
import openScreenImage from "../assets/CivicBridge.png";

const SplashScreen = () => {
  return (
    <div className="loading-container">
      <div className="splash-image-container">
        <img src={openScreenImage} alt="Civic Bridge Splash" className="splash-image" />
        <div className="spinner-overlay">
          <div className="spinner"></div>
        </div>
      </div>
      {/* <div className="title-section">
        <h1 className="app-title">Civic Bridge</h1>
        <p className="app-subtitle">Report issues. Make your neighborhood better.</p>
      </div>
      <div className="spinner"></div> */}
    </div>
  );
};

export default SplashScreen;