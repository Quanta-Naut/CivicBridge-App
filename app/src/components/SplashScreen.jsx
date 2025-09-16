import React from "react";
import "./SplashScreen.css";
import openScreenImage from "../assets/openScreen.png";

const SplashScreen = () => {
  return (
    <div className="loading-container">
      <div className="title-section">
        <h1 className="app-title">Civic Bridge</h1>
        <p className="app-subtitle">Report issues. Make your neighborhood better.</p>
      </div>
      <div className="spinner"></div>
    </div>
  );
};

export default SplashScreen;