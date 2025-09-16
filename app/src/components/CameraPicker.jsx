import React, { useState } from 'react';
import { IoCameraOutline } from "react-icons/io5";

const CameraPicker = ({ onImageSelected, buttonText = "Take a Picture" }) => {
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        onImageSelected(reader.result); // base64 image data or blob URL
      };
      reader.readAsDataURL(file); // or use readAsArrayBuffer/file if needed
    }
  };

  return (
    <div className="camera-picker">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        id="cameraInput"
      />
      <button 
        type="button"
        onClick={() => document.getElementById('cameraInput').click()}
        className="camera-btn"
      >
        <IoCameraOutline style={{ fontSize: '24px' }} /> {buttonText}
      </button>
    </div>
  );
};

export default CameraPicker;
