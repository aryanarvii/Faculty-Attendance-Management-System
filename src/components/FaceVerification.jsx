import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { toast } from 'react-hot-toast';
import { compreFaceService } from '../services/compreFaceService';

// Force development mode to be disabled
const DEV_MODE = false;

function FaceVerification({ onSuccess, onCancel, isRegistration = false, userId }) {
  const webcamRef = useRef(null);
  const [capturing, setCapturing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(true); // No models needed for CompreFace

  // Skip model loading - CompreFace API doesn't need local models
  useEffect(() => {
    // Check for camera permission
    const checkCamera = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraReady(true);
        setCameraError(null);
      } catch (error) {
        console.error('Camera permission error:', error);
        setCameraError('Unable to access camera. Please check permissions.');
        toast.error('Camera access denied. Please allow camera access to continue.');
      }
    };

    checkCamera();

    // Clean up
    return () => {
      // Stop any streams when component unmounts
      if (webcamRef.current && webcamRef.current.stream) {
        const tracks = webcamRef.current.stream.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  const handleCameraError = () => {
    setCameraError('Error accessing camera. Please check permissions or try a different browser.');
    toast.error('Camera error. Please ensure your camera is working properly.');
  };

  const handleCapture = async () => {
    try {
      if (!webcamRef.current) {
        throw new Error('Camera not initialized');
      }
      
      setProcessing(true);
      setError(null);
      setCapturing(true);
      
      console.log('Capturing image...');
      
      // Get screenshot
      let imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        throw new Error('Failed to capture image. Please try again.');
      }
      
      console.log('Image captured successfully');
      
      // Process the captured image with CompreFace API
      if (isRegistration) {
        // Handle face registration
        console.log('Registering face for user ID:', userId);
        if (!userId) {
          throw new Error('No user ID provided for registration');
        }
        
        await compreFaceService.registerFace(imageSrc, userId);
        console.log('Face registration successful');
        toast.success('Face registered successfully!');
        onSuccess(imageSrc);
      } else {
        // Handle face verification
        console.log('Proceeding with face verification');
        try {
          const verificationResult = await compreFaceService.verifyFace(imageSrc, userId);
          
          if (verificationResult.isIdentical && verificationResult.confidence > 0.7) {
            console.log('Face verification successful, confidence:', verificationResult.confidence);
            onSuccess(imageSrc);
          } else {
            throw new Error(`Face verification failed. Confidence: ${verificationResult.confidence.toFixed(2)}`);
          }
        } catch (verifyError) {
          console.error('Verification error:', verifyError);
          throw verifyError;
        }
      }
    } catch (error) {
      console.error('Face processing error:', error);
      setError(error.message || 'Failed to process face');
      toast.error(error.message || 'Failed to process face');
      
      // Show error message to user and allow retry
      setProcessing(false);
      setCapturing(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="flex w-full justify-between items-center mb-2">
        <h2 className="text-lg font-semibold text-gray-800">
          {isRegistration ? 'Face Registration' : 'Face Verification'}
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      {cameraError ? (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-center">
          <p>{cameraError}</p>
          <button
            onClick={onCancel}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          <div className="relative w-full rounded-lg overflow-hidden bg-gray-100">
            {cameraReady ? (
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  width: 400,
                  height: 400,
                  facingMode: "user"
                }}
                className="w-full h-auto mx-auto rounded-lg"
                onUserMediaError={handleCameraError}
              />
            ) : (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                <p className="ml-3 text-gray-500">Initializing camera...</p>
              </div>
            )}
          </div>

          <div className="flex space-x-3 w-full">
            <button
              onClick={onCancel}
              className="w-1/2 px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md font-medium"
              disabled={capturing}
            >
              Cancel
            </button>
            <button
              onClick={handleCapture}
              disabled={!cameraReady || capturing}
              className="w-1/2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 font-medium"
            >
              {capturing 
                ? 'Processing...' 
                : !cameraReady
                  ? 'Loading Camera...'
                  : isRegistration 
                    ? 'Register Face' 
                    : 'Verify Face'}
            </button>
          </div>

          {/* Security notice */}
          <div className="text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded-md text-center w-full">
            <p className="mb-1 font-semibold">Enhanced Security Enabled</p>
            <p>Using CompreFace API with anti-spoofing measures</p>
          </div>

          <p className="text-sm text-gray-500 text-center">
            {isRegistration 
              ? 'Position your face in the center and look directly at the camera.' 
              : 'Please look directly at the camera for verification.'}
          </p>
        </>
      )}
    </div>
  );
}

export default FaceVerification; 