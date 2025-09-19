import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import CameraPicker from "./CameraPicker";
import AudioRecorder from "./AudioRecorder";
import "./IssueForm.css";
import { FaPen } from "react-icons/fa";
import { AiFillAudio } from "react-icons/ai";
import { IoIosResize } from "react-icons/io";
import { MdKeyboardArrowLeft } from "react-icons/md";

const IssueForm = ({ onBack, onIssueCreated }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "garbage",
    priority: "medium",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageLocation, setImageLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [descriptionMode, setDescriptionMode] = useState("text"); // 'text' or 'audio'
  const [audioRecording, setAudioRecording] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  
  // Image zoom states
  const [imageScale, setImageScale] = useState(1);
  const [imageTranslate, setImageTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);

  // Image compression function
  const compressImage = (imageDataUrl, targetQuality = 0.8) => {
    return new Promise((resolve, reject) => {
      try {
        const img = new Image();
        img.onload = function() {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Set canvas dimensions to image dimensions
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw image to canvas
          ctx.drawImage(img, 0, 0, img.width, img.height);
          
          // Convert to compressed JPEG
          const compressedDataUrl = canvas.toDataURL('image/jpeg', targetQuality);
          
          console.log(`🔄 Compression result:`, {
            originalSize: (imageDataUrl.length / 1024).toFixed(0) + 'KB',
            compressedSize: (compressedDataUrl.length / 1024).toFixed(0) + 'KB',
            quality: targetQuality,
            compressionRatio: ((1 - compressedDataUrl.length / imageDataUrl.length) * 100).toFixed(1) + '%'
          });
          
          resolve(compressedDataUrl);
        };
        
        img.onerror = function() {
          reject(new Error('Failed to load image for compression'));
        };
        
        img.src = imageDataUrl;
      } catch (error) {
        reject(error);
      }
    });
  };

  // Smart compression with progressive quality adjustment
  const smartCompressImage = async (imageDataUrl, maxSizeKB = 500) => {
    const originalSizeKB = imageDataUrl.length / 1024;
    console.log(`📏 Original image size: ${originalSizeKB.toFixed(0)}KB`);
    
    if (originalSizeKB <= maxSizeKB) {
      console.log('✅ Image already within size limit');
      return imageDataUrl;
    }
    
    // Determine compression strategy
    let quality;
    if (originalSizeKB > 2000) { // > 2MB
      quality = 0.3; // Heavy compression
      console.log('🔥 Applying heavy compression (quality: 0.3)');
    } else if (originalSizeKB > 1000) { // > 1MB
      quality = 0.5; // Medium compression
      console.log('🔶 Applying medium compression (quality: 0.5)');
    } else {
      quality = 0.7; // Light compression
      console.log('🔸 Applying light compression (quality: 0.7)');
    }
    
    let compressed = await compressImage(imageDataUrl, quality);
    let attempts = 1;
    
    // Progressive quality reduction if still too large
    while (compressed.length / 1024 > maxSizeKB && quality > 0.1 && attempts < 5) {
      quality -= 0.1;
      compressed = await compressImage(imageDataUrl, quality);
      attempts++;
      console.log(`🔄 Attempt ${attempts}: Quality ${quality.toFixed(1)}, Size: ${(compressed.length / 1024).toFixed(0)}KB`);
    }
    
    const finalSizeKB = compressed.length / 1024;
    const compressionRatio = ((originalSizeKB - finalSizeKB) / originalSizeKB * 100).toFixed(1);
    
    console.log(`✅ Final compression: ${originalSizeKB.toFixed(0)}KB → ${finalSizeKB.toFixed(0)}KB (${compressionRatio}% reduction)`);
    
    if (finalSizeKB > maxSizeKB) {
      console.warn(`⚠️ Image still large after compression: ${finalSizeKB.toFixed(0)}KB (target: ${maxSizeKB}KB)`);
    }
    
    return compressed;
  };

  // Helper function to convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      console.log("Converting file to base64:", file);
      console.log("File type:", typeof file);
      console.log("File instanceof File:", file instanceof File);
      console.log("File instanceof Blob:", file instanceof Blob);
      
      if (!file) {
        reject(new Error("No file provided"));
        return;
      }

      // If it's already a string (base64 or data URL), handle it
      if (typeof file === 'string') {
        if (file.startsWith('data:')) {
          // It's a data URL, extract base64 part
          const base64 = file.split(',')[1];
          resolve(base64);
          return;
        } else {
          // Assume it's already base64
          resolve(file);
          return;
        }
      }

      // Handle File/Blob objects
      if (file instanceof File || file instanceof Blob) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          try {
            // Remove the data URL prefix (data:image/jpeg;base64,)
            const base64 = reader.result.split(',')[1];
            resolve(base64);
          } catch (error) {
            reject(new Error(`Failed to process FileReader result: ${error.message}`));
          }
        };
        reader.onerror = (error) => reject(new Error(`FileReader error: ${error.message}`));
        return;
      }

      reject(new Error(`Unsupported file type: ${typeof file}`));
    });
  };

  // Helper function to convert blob URL to base64
  const blobToBase64 = async (blobUrl) => {
    try {
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => {
          // Remove the data URL prefix (data:audio/webm;base64,)
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = (error) => reject(error);
      });
    } catch (error) {
      throw new Error(`Failed to convert blob to base64: ${error.message}`);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Image zoom and pan handlers
  const resetImageZoom = () => {
    setImageScale(1);
    setImageTranslate({ x: 0, y: 0 });
    setIsDragging(false);
    setLastPanPoint({ x: 0, y: 0 });
    setLastTouchDistance(0);
    setLastTapTime(0);
  };

  const constrainPanning = (translate, scale) => {
    // No restrictions - allow panning anywhere
    return translate;
  };

  const getTouchDistance = (touches) => {
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const handleImageWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(imageScale * delta, 0.5), 5);
    setImageScale(newScale);
    setImageTranslate(prev => constrainPanning(prev, newScale));
  };

  const handleImageTouchStart = (e) => {
    e.preventDefault();
    
    if (e.touches.length === 2) {
      // Pinch zoom start
      const distance = getTouchDistance(e.touches);
      setLastTouchDistance(distance);
    } else if (e.touches.length === 1) {
      // Pan start
      setIsDragging(true);
      setLastPanPoint({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    }
  };

  const handleImageTouchMove = (e) => {
    e.preventDefault();
    
    if (e.touches.length === 2) {
      // Pinch zoom
      const distance = getTouchDistance(e.touches);
      if (lastTouchDistance > 0) {
        const scale = distance / lastTouchDistance;
        const newScale = Math.min(Math.max(imageScale * scale, 0.5), 5);
        setImageScale(newScale);
        setImageTranslate(prev => constrainPanning(prev, newScale));
      }
      setLastTouchDistance(distance);
    } else if (e.touches.length === 1 && isDragging) {
      // Pan
      const deltaX = e.touches[0].clientX - lastPanPoint.x;
      const deltaY = e.touches[0].clientY - lastPanPoint.y;
      
      setImageTranslate(prev => {
        const newTranslate = {
          x: prev.x + deltaX,
          y: prev.y + deltaY
        };
        return constrainPanning(newTranslate, imageScale);
      });
      
      setLastPanPoint({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    }
  };

  const handleImageMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setLastPanPoint({
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleImageMouseMove = (e) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - lastPanPoint.x;
    const deltaY = e.clientY - lastPanPoint.y;
    
    setImageTranslate(prev => {
      const newTranslate = {
        x: prev.x + deltaX,
        y: prev.y + deltaY
      };
      return constrainPanning(newTranslate, imageScale);
    });
    
    setLastPanPoint({
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleImageMouseUp = () => {
    setIsDragging(false);
  };

  const handleImageDoubleClick = (e) => {
    e.preventDefault();
    if (imageScale === 1) {
      setImageScale(2);
      setImageTranslate(prev => constrainPanning(prev, 2));
    } else {
      resetImageZoom();
    }
  };

  const handleImageTouchEnd = (e) => {
    e.preventDefault();
    
    if (e.touches.length === 0) {
      // Check for double tap
      const currentTime = Date.now();
      const tapLength = 300; // Maximum time between taps for double tap
      
      if (e.changedTouches.length === 1 && currentTime - lastTapTime < tapLength) {
        // This is a double tap
        if (imageScale === 1) {
          setImageScale(2);
          setImageTranslate(prev => constrainPanning(prev, 2));
        } else {
          resetImageZoom();
        }
      }
      
      setLastTapTime(currentTime);
    }
    
    setIsDragging(false);
    setLastTouchDistance(0);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    resetImageZoom();
  };

  const handleImageSelected = async (imageData) => {
    console.log("📷 Image selected for processing:", {
      type: typeof imageData,
      length: imageData?.length,
      starts_with_data: imageData?.startsWith?.('data:'),
      first_50_chars: imageData?.substring?.(0, 50)
    });
    
    setIsProcessingImage(true);
    
    try {
      let finalImageData = imageData;
      
      // Only compress if image is too large (>100KB threshold for mobile optimization)
      if (imageData && imageData.length > 100 * 1024) {
        console.log('🔄 Compressing image - original size:', (imageData.length / 1024).toFixed(0) + 'KB');
        finalImageData = await smartCompressImage(imageData, 500); // Target 500KB max
      } else {
        console.log('✅ Image size acceptable - no compression needed');
      }
      
      setSelectedImage(finalImageData);
      captureLocation(finalImageData);
      console.log('✅ Image processed successfully');
    } catch (error) {
      console.error('❌ Error processing image:', error);
      // Fallback to original image if compression fails
      setSelectedImage(imageData);
      captureLocation(imageData);
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleAudioRecorded = (audioData) => {
    setAudioRecording(audioData);
  };

  const getAddressFromCoordinates = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=YOUR_API_KEY&language=en&pretty=1`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          const components = result.components;

          // Pick relevant fields
          const road = components.road || components.neighbourhood || "";
          const locality = components.suburb || components.city_district || "";
          const area =
            components.city || components.town || components.village || "";
          const state = components.state || "";
          const country = components.country || "";
          const postcode = components.postcode || "";

          // Build a clean address string by concatenating available parts
          const parts = [road, locality, area, state, postcode, country];
          const filtered = parts.filter((part) => part && part.trim() !== "");
          const formatted = filtered.join(", ");

          return {
            formatted,
            road,
            locality,
            area,
            state,
            country,
            postcode,
          };
        }
      }

      return await getBrowserReverseGeocode(latitude, longitude);
    } catch (error) {
      console.error("Error getting address:", error);
      return {
        formatted: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        road: "",
        locality: "",
        area: "Unknown Location",
        state: "",
        country: "",
        postcode: "",
      };
    }
  };

  const getBrowserReverseGeocode = async (latitude, longitude) => {
    return new Promise((resolve) => {
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
      )
        .then((response) => response.json())
        .then((data) => {
          if (data && data.address) {
            const addr = data.address;
            const road = addr.road || addr.pedestrian || "";
            const locality = addr.suburb || addr.city_district || "";
            const area = addr.city || addr.town || addr.village || "";
            const state = addr.state || "";
            const country = addr.country || "";
            const postcode = addr.postcode || "";

            const parts = [road, locality, area, state, postcode, country];
            const filtered = parts.filter((part) => part && part.trim() !== "");
            const formatted = filtered.join(", ");

            resolve({
              formatted,
              road,
              locality,
              area,
              state,
              country,
              postcode,
            });
          } else {
            resolve({
              formatted: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
              road: "",
              locality: "",
              area: "Unknown Location",
              state: "",
              country: "",
              postcode: "",
            });
          }
        })
        .catch(() => {
          resolve({
            formatted: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            road: "",
            locality: "",
            area: "Unknown Location",
            state: "",
            country: "",
            postcode: "",
          });
        });
    });
  };

  const addGeotagToImage = async (imageDataURL, location) => {
    return new Promise(async (resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = async () => {
        try {
          console.log("Image loaded, dimensions:", img.width, "x", img.height);

          // Set canvas size to match image
          canvas.width = img.width;
          canvas.height = img.height;

          // Draw the original image
          ctx.drawImage(img, 0, 0);

          // Get address information
          const addressInfo = await getAddressFromCoordinates(
            location.latitude,
            location.longitude
          );

          // Prepare geotag text
          const lat = location.latitude.toFixed(6);
          const lng = location.longitude.toFixed(6);

          // Format date and time with timezone
          const now = new Date();
          const dateStr = now.toLocaleDateString("en-GB");
          const timeStr = now.toLocaleTimeString("en-GB", {
            hour12: false,
            timeZoneName: "short",
          });

          // Text styling
          const fontSize = Math.max(18, Math.min(img.width / 25, 28));
          console.log("Using font size:", fontSize);

          const lineHeight = fontSize + 8;
          const padding = 20;

          // Create geotag text lines
          const locationText =
            addressInfo.area && addressInfo.state && addressInfo.country
              ? `${addressInfo.area}, ${addressInfo.state}, ${addressInfo.country}`
              : "Location Unknown";

          const addressText =
            addressInfo.road && addressInfo.postcode
              ? `${addressInfo.road}, ${addressInfo.postcode}`
              : "";

          const linesLeft = [
            locationText,
            addressText,
            `${dateStr} ${timeStr}`,
          ].filter(Boolean);
          const linesRight = [`Lat ${lat}°`, `Long ${lng}°`];

          const headerLine = "📍 GPS Map Camera";

          // Calculate total height based on number of lines
          const contentHeight =
            Math.max(linesLeft.length, linesRight.length) * lineHeight;
          const headerHeight = lineHeight + 4;
          const totalHeight = padding * 2 + headerHeight + contentHeight;

          // Position and sizing
          const boxX = 0;
          const boxY = img.height - totalHeight;
          const boxWidth = img.width;
          const boxHeight = totalHeight;

          // Draw rounded rectangle background
          ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
          const radius = 12;

          ctx.beginPath();
          ctx.moveTo(boxX + radius, boxY);
          ctx.lineTo(boxX + boxWidth - radius, boxY);
          ctx.quadraticCurveTo(
            boxX + boxWidth,
            boxY,
            boxX + boxWidth,
            boxY + radius
          );
          ctx.lineTo(boxX + boxWidth, boxY + boxHeight - radius);
          ctx.quadraticCurveTo(
            boxX + boxWidth,
            boxY + boxHeight,
            boxX + boxWidth - radius,
            boxY + boxHeight
          );
          ctx.lineTo(boxX + radius, boxY + boxHeight);
          ctx.quadraticCurveTo(
            boxX,
            boxY + boxHeight,
            boxX,
            boxY + boxHeight - radius
          );
          ctx.lineTo(boxX, boxY + radius);
          ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
          ctx.closePath();
          ctx.fill();

          // Add subtle top border
          ctx.fillStyle = "rgba(255, 215, 0, 0.6)";
          ctx.fillRect(boxX, boxY, boxWidth, 2);

          // Draw header centered
          ctx.font = `bold ${fontSize + 4}px Arial`;
          const headerWidth = ctx.measureText(headerLine).width;
          const headerX = (boxWidth - headerWidth) / 2;
          const headerY = boxY + padding + fontSize;

          ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
          ctx.fillText(headerLine, headerX + 2, headerY + 2);

          ctx.fillStyle = "#FFD700";
          ctx.fillText(headerLine, headerX, headerY);

          const contentOffset = 300; // Adjust this value to move content towards center

          // Draw content below header
          ctx.font = `${fontSize}px Arial`;

          const contentStartY = headerY + lineHeight;

          // Left-aligned content (address + timestamp)
          let leftY = contentStartY;
          linesLeft.forEach((line) => {
            ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
            ctx.fillText(line, padding + contentOffset + 2, leftY + 2);

            ctx.fillStyle = "white";
            ctx.fillText(line, padding + contentOffset, leftY);

            leftY += lineHeight;
          });

          // Right-aligned content (coordinates)
          let rightY = contentStartY;
          linesRight.forEach((line) => {
            ctx.font = `${fontSize}px Arial`;
            const textWidth = ctx.measureText(line).width;
            const rightX = boxWidth - padding - contentOffset - textWidth;

            ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
            ctx.fillText(line, rightX + 2, rightY + 2);

            ctx.fillStyle = "white";
            ctx.fillText(line, rightX, rightY);

            rightY += lineHeight;
          });

          // Convert canvas to data URL and resolve
          const geotaggedImage = canvas.toDataURL("image/jpeg", 0.95);
          console.log("Geotag applied successfully");
          resolve(geotaggedImage);
        } catch (error) {
          console.error("Error in addGeotagToImage:", error);
          reject(error);
        }
      };

      img.onerror = (error) => {
        console.error("Failed to load image:", error);
        reject(error);
      };

      img.src = imageDataURL;
    });
  };

  const captureLocation = (imageData) => {
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: new Date().toISOString(),
        };

        // Get address information
        try {
          const addressInfo = await getAddressFromCoordinates(
            location.latitude,
            location.longitude
          );
          location.address = addressInfo;
        } catch (error) {
          console.error("Failed to get address:", error);
          location.address = { formatted: "Address unavailable" };
        }

        setImageLocation(location);

        // Add geotag to the image
        try {
          console.log("Adding geotag to image...", location);
          const geotaggedImage = await addGeotagToImage(imageData, location);
          console.log("Geotag added successfully");
          setSelectedImage(geotaggedImage);
        } catch (error) {
          console.error("Failed to add geotag to image:", error);
        }
      },
      (error) => {
        let errorMessage = "Failed to get location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied by user";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out";
            break;
        }
        setLocationError(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert("Please enter an issue title");
      return;
    }

    // Check if description is provided based on selected mode
    if (descriptionMode === "text" && !formData.description.trim()) {
      alert("Please provide a text description");
      return;
    }

    if (descriptionMode === "audio" && !audioRecording) {
      alert("Please record an audio description");
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare the request data
      let imageBase64 = null;
      let audioBase64 = null;

      // Convert image to base64 if present
      if (selectedImage) {
        try {
          console.log("Processing selected image:", selectedImage);
          imageBase64 = await fileToBase64(selectedImage);
          console.log("Image converted to base64 successfully, length:", imageBase64?.length);
        } catch (error) {
          console.error("Failed to convert image to base64:", error);
          console.error("Selected image details:", {
            type: typeof selectedImage,
            constructor: selectedImage?.constructor?.name,
            size: selectedImage?.size,
            name: selectedImage?.name,
            type_prop: selectedImage?.type
          });
          alert(`Failed to process image: ${error.message}. Please try selecting the image again.`);
          setIsSubmitting(false);
          return;
        }
      }

      // Convert audio to base64 if present
      if (audioRecording?.url) {
        try {
          audioBase64 = await blobToBase64(audioRecording.url);
        } catch (error) {
          console.error("Failed to convert audio to base64:", error);
          alert("Failed to process audio. Please try again.");
          setIsSubmitting(false);
          return;
        }
      }

      const requestData = {
        title: formData.title,
        description: descriptionMode === "text" ? formData.description : "Audio description provided",
        latitude: imageLocation ? imageLocation.latitude : 28.6139,
        longitude: imageLocation ? imageLocation.longitude : 77.209,
        category: formData.category,
        priority: formData.priority,
        description_mode: descriptionMode,
        image_data: imageBase64,
        audio_data: audioBase64,
      };

      // Get auth token from localStorage
      const authToken = localStorage.getItem('authToken');
      console.log('🔐 IssueForm: Auth token exists:', !!authToken);
      
      let apiResponse;
      
      // Try direct API call first (more reliable for authentication)
      try {
        console.log('🌐 Attempting direct API call...');
        
        // Create FormData for direct API call
        const formData = new FormData();
        formData.append('title', requestData.title);
        formData.append('description', requestData.description);
        formData.append('latitude', requestData.latitude.toString());
        formData.append('longitude', requestData.longitude.toString());
        formData.append('category', requestData.category);
        formData.append('priority', requestData.priority);
        formData.append('description_mode', requestData.description_mode);
        
        // Add image if present
        if (requestData.image_data) {
          // Convert base64 back to blob for FormData
          const imageBlob = await fetch(`data:image/jpeg;base64,${requestData.image_data}`).then(r => r.blob());
          formData.append('image', imageBlob, 'issue_image.jpg');
        }
        
        // Add audio if present
        if (requestData.audio_data) {
          // Convert base64 back to blob for FormData
          const audioBlob = await fetch(`data:audio/webm;base64,${requestData.audio_data}`).then(r => r.blob());
          formData.append('audio', audioBlob, 'issue_audio.webm');
        }
        
        // Use the API utility with authentication
        const { issueAPI } = await import('../utils/api');
        const directApiResponse = await issueAPI.createIssue(formData);
        
        console.log('✅ Direct API call successful:', directApiResponse);
        apiResponse = JSON.stringify(directApiResponse);
        
      } catch (directApiError) {
        console.warn('⚠️ Direct API call failed, falling back to Rust backend:', directApiError);
        
        // Fallback to Rust backend
        apiResponse = await invoke("send_issue_to_flask_server", {
          request: requestData,
          auth_token: authToken, // Pass the auth token (snake_case to match Rust)
        });
      }
      
      console.log("Flask API Response:", apiResponse);
      
      // Create a mock issue object for UI update (you can modify this based on your Flask response)
      const newIssue = {
        id: Date.now(), // temporary ID
        title: requestData.title,
        description: requestData.description,
        date: new Date().toLocaleDateString(),
        latitude: requestData.latitude,
        longitude: requestData.longitude,
        status: "Submitted"
      };

      onIssueCreated(newIssue);

      // Reset form
      setFormData({
        title: "",
        description: "",
        category: "garbage",
        priority: "medium",
      });
      setSelectedImage(null);
      setImageLocation(null);
      setLocationError(null);
      setDescriptionMode("text");
      if (audioRecording?.url) {
        URL.revokeObjectURL(audioRecording.url);
      }
      setAudioRecording(null);

      alert("Issue reported successfully!");
    } catch (error) {
      console.error("Failed to create issue:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
        cause: error.cause
      });
      
      // Show the actual error message to help debug
      const errorMessage = error.message || error.toString() || "Unknown error";
      alert(`Failed to report issue: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (!isSubmitting) {
      // Reset all form data
      setFormData({
        title: "",
        description: "",
        category: "garbage",
        priority: "medium",
      });
      setSelectedImage(null);
      setImageLocation(null);
      setLocationError(null);
      setDescriptionMode("text");
      if (audioRecording?.url) {
        URL.revokeObjectURL(audioRecording.url);
      }
      setAudioRecording(null);
      setShowImageModal(false);
      resetImageZoom();
      
      onBack();
    }
  };

  return (
    <div className="issue-form-container">
      {/* Top Black Bar */}
      <div className="top-black-bar"></div>
      <div className="issue-form-header">
        <button className="back-btn" onClick={onBack}>
          <MdKeyboardArrowLeft />
        </button>
        <h2>Report New Issue</h2>
      </div>

      <form onSubmit={handleSubmit} className="issue-form">
        <div className="form-group">
          <label>Attach Photo</label>
          <CameraPicker 
            onImageSelected={handleImageSelected} 
            buttonText={selectedImage ? "Retake Picture" : "Take a Picture"}
          />
          {isProcessingImage && (
            <div className="processing-indicator" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ddd',
              borderRadius: '4px',
              margin: '10px 0',
              color: '#666'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid #f3f3f3',
                borderTop: '2px solid #3498db',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginRight: '10px'
              }}></div>
              Processing and compressing image...
            </div>
          )}
          {selectedImage && (
            <div className="image-preview-section">
              <div className="image-container">
                <img
                  src={selectedImage}
                  alt="Selected issue photo"
                  className="selected-image-preview"
                  onClick={() => setShowImageModal(true)}
                  style={{ cursor: "pointer" }}
                />
                <div className="image-overlay">
                  <span className="view-text">👁️ Click to view full size</span>
                </div>
              </div>

              {/* Location Information */}
              <div className="location-info">
                {imageLocation ? (
                  <div className="location-display">
                    <div className="location-title">📍 Image Location</div>
                    {imageLocation.address && (
                      <div className="location-address">
                        <div className="address-text">
                          {imageLocation.address.formatted}
                        </div>
                      </div>
                    )}
                    <div className="location-coordinates">
                      <div className="coordinate-row">
                        <span className="coordinate-label">Latitude:</span>
                        <span className="coordinate-value">
                          {imageLocation.latitude.toFixed(6)}
                        </span>
                      </div>
                      <div className="coordinate-row">
                        <span className="coordinate-label">Longitude:</span>
                        <span className="coordinate-value">
                          {imageLocation.longitude.toFixed(6)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : locationError ? (
                  <div className="location-error">
                    <div className="error-title">⚠️ Location Error</div>
                    <div className="error-message">{locationError}</div>
                  </div>
                ) : (
                  <div className="location-loading">
                    <div className="loading-title">📍 Getting location...</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="title">Issue Title *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Enter a brief title for the issue"
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            disabled={isSubmitting}
          >
            <option value="garbage">Garbage</option>
            <option value="street-light">Street Light</option>
            <option value="potholes">Potholes</option>
            <option value="public-transport">Public Transport</option>
            <option value="road-infrastructure">Road Infrastructure</option>
            <option value="drainage">Drainage</option>
            <option value="public-property">Public Property Damage</option>
            <option value="street-dogs">Street Dogs</option>
            <option value="roadside-trees">Roadside Trees</option>
            <option value="powerlines">Power Lines</option>
            <option value="footpath">Footpath</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="priority">Priority</label>
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleInputChange}
            disabled={isSubmitting}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div className="form-group">
          <label>Description *</label>

          {/* Description Mode Toggle */}
          <div className="description-mode-toggle">
            <button
              type="button"
              className={`mode-btn ${
                descriptionMode === "text" ? "active" : ""
              }`}
              onClick={() => {
                setDescriptionMode("text");
                // Clear audio when switching to text
                if (audioRecording?.url) {
                  URL.revokeObjectURL(audioRecording.url);
                }
                setAudioRecording(null);
              }}
              disabled={isSubmitting}
            >
              <FaPen /> Type Text
            </button>
            <button
              type="button"
              className={`mode-btn ${
                descriptionMode === "audio" ? "active" : ""
              }`}
              onClick={() => {
                setDescriptionMode("audio");
                // Clear text when switching to audio
                setFormData((prev) => ({ ...prev, description: "" }));
              }}
              disabled={isSubmitting}
            >
              <AiFillAudio /> Record Audio
            </button>
          </div>

          {/* Text Description */}
          {descriptionMode === "text" && (
            <div className="description-input-section">
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the issue in detail..."
                rows={4}
                disabled={isSubmitting}
                className="description-textarea"
              />
            </div>
          )}

          {/* Audio Recording */}
          {descriptionMode === "audio" && (
            <div className="audio-recording-section">
              <AudioRecorder onAudioRecorded={handleAudioRecorded} />
              {audioRecording && (
                <div className="audio-preview">
                  <audio
                    controls
                    src={audioRecording.url}
                    className="audio-player"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={handleBack}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button type="submit" className="submit-btn" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Report Issue"}
          </button>
        </div>
      </form>

      {/* Image View Modal */}
      {showImageModal && selectedImage && (
        <div
          className="image-modal-overlay"
          onClick={closeImageModal}
        >
          <div
            className="image-modal-content"
            onClick={(e) => e.stopPropagation()}
            onMouseMove={handleImageMouseMove}
            onMouseUp={handleImageMouseUp}
            onMouseLeave={handleImageMouseUp}
          >
            <div className="image-modal-header">
              <h3>Issue Photo</h3>
              <div className="modal-controls">
                <button
                  className="zoom-reset-btn"
                  onClick={resetImageZoom}
                  title="Reset Zoom (1:1)"
                >
                  <IoIosResize />
                </button>
                <button
                  className="modal-close-btn"
                  onClick={closeImageModal}
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="image-modal-body">
              <div className="image-container-modal">
                <img
                  src={selectedImage}
                  alt="Issue photo full size"
                  className="modal-image"
                  style={{
                    transform: `scale(${imageScale}) translate(${imageTranslate.x / imageScale}px, ${imageTranslate.y / imageScale}px)`,
                    cursor: isDragging ? 'grabbing' : 'grab',
                    userSelect: 'none',
                    pointerEvents: 'auto'
                  }}
                  onWheel={handleImageWheel}
                  onTouchStart={handleImageTouchStart}
                  onTouchMove={handleImageTouchMove}
                  onTouchEnd={handleImageTouchEnd}
                  onMouseDown={handleImageMouseDown}
                  onDoubleClick={handleImageDoubleClick}
                  draggable={false}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IssueForm;
