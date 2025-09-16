import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { compreFaceService } from '../services/compreFaceService';
import { updateUserFaceData } from '../firebase/userService';
import { Alert, Button, CircularProgress, Box, Typography, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const videoConstraints = {
  width: 640,
  height: 480,
  facingMode: "user"
};

const FaceRegistration = ({ userId, onRegistrationComplete }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const webcamRef = useRef(null);
  const detectionInterval = useRef(null);
  const navigate = useNavigate();

  // Cleanup detection interval on unmount
  useEffect(() => {
    return () => {
      if (detectionInterval.current) {
        clearInterval(detectionInterval.current);
      }
    };
  }, []);

  // Start real-time face detection
  const startFaceDetection = () => {
    setIsCapturing(true);
    setRegistrationStatus('Please look at the camera...');
    setError(null);

    // Clear any existing interval
    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
    }

    // Check for face every 1.5 seconds
    detectionInterval.current = setInterval(async () => {
      try {
        if (webcamRef.current) {
          const imageSrc = webcamRef.current.getScreenshot();
          if (!imageSrc) return;

          // Pass the full image data URI to the detectFace function
          // No need to convert to blob here as it's handled in the service
          const detectionResult = await compreFaceService.detectFace(imageSrc);
          
          if (detectionResult && detectionResult.length > 0) {
            setFaceDetected(true);
            setRegistrationStatus('Face detected! Ready to register.');
          } else {
            setFaceDetected(false);
            setRegistrationStatus('No face detected. Please position your face in the frame.');
          }
        }
      } catch (error) {
        console.error('Face detection error:', error);
        setError(error.message || 'Error detecting face. Please try again.');
        setFaceDetected(false);
      }
    }, 1500);
  };

  // Stop face detection
  const stopFaceDetection = () => {
    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
      detectionInterval.current = null;
    }
  };

  // Register face with CompreFace
  const registerFace = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Stop the detection interval
      stopFaceDetection();
      
      // Capture current image
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        throw new Error('Could not capture image');
      }
      
      // Pass the full image data URI to the registerFace function
      // No need to convert to blob as it's handled in the service
      const faceData = await compreFaceService.registerFace(imageSrc, userId);
      
      // Update user's face data in Firebase
      await updateUserFaceData(userId, faceData);
      
      setRegistrationStatus('Face registered successfully!');
      
      // If callback provided, call it with the face data
      if (onRegistrationComplete) {
        onRegistrationComplete(faceData);
      }
      
      // Redirect to login page after successful registration
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      console.error('Face registration error:', error);
      setError(error.message || 'Error during registration. Please try again.');
      setRegistrationStatus('');
      
      // Restart face detection if there was an error
      startFaceDetection();
    } finally {
      setIsProcessing(false);
    }
  };

  // Cancel face registration
  const cancelRegistration = () => {
    stopFaceDetection();
    setIsCapturing(false);
    setFaceDetected(false);
    setRegistrationStatus('');
    setError(null);
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 700, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>Face Registration</Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Register your face to enable attendance marking using facial recognition.
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}
      
      {isCapturing ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{ position: 'relative', mb: 2 }}>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              style={{ borderRadius: '8px', width: '100%', height: 'auto' }}
            />
            {isProcessing && (
              <Box sx={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.5)',
                borderRadius: '8px'
              }}>
                <CircularProgress color="primary" />
              </Box>
            )}
          </Box>
          
          {registrationStatus && (
            <Alert 
              severity={faceDetected ? "success" : "info"} 
              sx={{ mb: 2, width: '100%' }}
            >
              {registrationStatus}
            </Alert>
          )}
          
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={registerFace}
              disabled={isProcessing || !faceDetected}
            >
              Register Face
            </Button>
            <Button 
              variant="outlined" 
              color="secondary" 
              onClick={cancelRegistration}
              disabled={isProcessing}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={startFaceDetection}
          >
            Start Face Registration
          </Button>
        </Box>
      )}
    </Paper>
  );
};

export default FaceRegistration;
