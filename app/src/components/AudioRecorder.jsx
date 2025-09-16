import React, { useState, useEffect } from 'react';

const AudioRecorder = ({ onAudioRecorded }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    checkMicrophonePermission();
  }, []);

  const checkMicrophonePermission = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // Check if microphone permission is available
        if (navigator.permissions) {
          const permission = await navigator.permissions.query({ name: 'microphone' });
          setPermissionStatus(permission.state);
          
          permission.onchange = () => {
            setPermissionStatus(permission.state);
          };
        } else {
          setPermissionStatus('unavailable');
        }
      } else {
        setPermissionStatus('unsupported');
        setErrorMessage('Microphone recording is not supported in this browser');
      }
    } catch (error) {
      console.error('Error checking microphone permission:', error);
      setPermissionStatus('error');
    }
  };

  const startRecording = async () => {
    try {
      setErrorMessage('');
      
      // Request microphone access with better error handling
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Check if MediaRecorder is supported
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        console.warn('audio/webm not supported, falling back to default');
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/wav';

      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const audioUrl = URL.createObjectURL(blob);
        onAudioRecorded({ blob, url: audioUrl });
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        setErrorMessage('Recording error occurred');
        setIsRecording(false);
      };

      recorder.start(100); // Collect data every 100ms
      setMediaRecorder(recorder);
      setIsRecording(true);
      setPermissionStatus('granted');

    } catch (error) {
      console.error('Failed to start recording:', error);
      
      let errorMsg = 'Unable to access microphone. ';
      
      if (error.name === 'NotAllowedError') {
        errorMsg += 'Please allow microphone permissions in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMsg += 'No microphone found. Please connect a microphone.';
      } else if (error.name === 'NotSupportedError') {
        errorMsg += 'Audio recording is not supported in this browser.';
      } else if (error.name === 'NotReadableError') {
        errorMsg += 'Microphone is being used by another application.';
      } else {
        errorMsg += 'Please check your microphone permissions and try again.';
      }
      
      setErrorMessage(errorMsg);
      setPermissionStatus('denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setErrorMessage('');
    }
  };

  const getButtonText = () => {
    if (permissionStatus === 'denied') {
      return '🚫 Microphone Access Denied';
    }
    if (permissionStatus === 'unsupported') {
      return '❌ Not Supported';
    }
    if (isRecording) {
      return '⏹️ Stop Recording';
    }
    return '🎤 Start Recording';
  };

  const isButtonDisabled = () => {
    return permissionStatus === 'unsupported' || 
           (permissionStatus === 'denied' && !isRecording);
  };

  return (
    <div className="audio-recorder">
      <button 
        type="button" 
        onClick={isRecording ? stopRecording : startRecording}
        className={`audio-record-btn ${isRecording ? 'recording' : ''} ${isButtonDisabled() ? 'disabled' : ''}`}
        disabled={isButtonDisabled()}
      >
        {getButtonText()}
      </button>
      
      {isRecording && (
        <div className="recording-indicator">
          <div className="recording-dot"></div>
          <span>Recording in progress...</span>
        </div>
      )}
      
      {errorMessage && (
        <div className="error-message" style={{ 
          color: '#e74c3c', 
          fontSize: '0.9em', 
          marginTop: '8px',
          padding: '8px',
          backgroundColor: '#fdf2f2',
          border: '1px solid #fecaca',
          borderRadius: '4px'
        }}>
          {errorMessage}
        </div>
      )}
      
      {permissionStatus === 'prompt' && (
        <div className="permission-info" style={{ 
          color: '#f39c12', 
          fontSize: '0.9em', 
          marginTop: '8px',
          padding: '8px',
          backgroundColor: '#fef9e7',
          border: '1px solid #fde68a',
          borderRadius: '4px'
        }}>
          Click "Start Recording" and Describe the Issue.
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;
