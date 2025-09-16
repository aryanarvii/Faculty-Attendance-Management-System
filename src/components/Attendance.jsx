import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTodayAttendance, getAttendanceHistory, checkIn, checkOut } from '../firebase/attendanceService';
import { compreFaceService } from '../services/compreFaceService';
import { getUserData } from '../firebase/userService';
import StatusBadge from './StatusBadge';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Button, Alert, CircularProgress } from '@mui/material';

// Campus WiFi check function
const checkCampusWiFi = async () => {
  try {
    // For development purposes we're just returning true
    // In production, you would implement actual WiFi verification
    // This could involve checking SSID, IP range, or using a geolocation API
    
    // Simulate a network request
    await new Promise(resolve => setTimeout(resolve, 500)); // Reduced time for faster response
    
    // In a real implementation, you would check the network connection
    // const wifiInfo = await navigator.connection.getWifiInfo();
    // return wifiInfo.ssid.includes('Campus') || wifiInfo.bssid.startsWith('AA:BB:CC');
    
    return true;
  } catch (error) {
    console.error('Error checking campus WiFi:', error);
    return false;
  }
};

// Development mode flag - change to only use NODE_ENV, not hardcoded true
const isDevelopment = process.env.NODE_ENV === 'development';

// Office hours configuration
const OFFICE_HOURS = {
  CHECK_IN_START: '09:00', // 9:00 AM
  CHECK_IN_END: '10:00',   // 10:00 AM
  CHECK_OUT_START: '17:00', // 5:00 PM
  CHECK_OUT_END: '18:00',   // 6:00 PM
  LATE_THRESHOLD: 0,       // minutes after CHECK_IN_START
  EARLY_THRESHOLD: 0       // minutes before CHECK_OUT_START
};

// Video constraints for face verification
const videoConstraints = {
  width: 640,
  height: 480,
  facingMode: "user"
};

function Attendance() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [userStatus, setUserStatus] = useState({
    checkedIn: false,
    checkedOut: false,
    checkInTime: null,
    checkOutTime: null,
    checkInStatus: null,
    checkOutStatus: null
  });
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [isOnCampusWiFi, setIsOnCampusWiFi] = useState(false);
  const [checkingWiFi, setCheckingWiFi] = useState(false);
  const [showFaceVerification, setShowFaceVerification] = useState(false);
  const [faceVerificationStatus, setFaceVerificationStatus] = useState('');
  const [faceVerificationError, setFaceVerificationError] = useState(null);
  
  // Add refs for webcam
  const webcamRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const videoElementId = 'face-verification-video'; // Store ID as a variable for consistency
  const [cameraActive, setCameraActive] = useState(false);
  const [userData, setUserData] = useState(null);
  
  // Add state for face verification
  const [verificationMode, setVerificationMode] = useState('');
  
  // Store the video element reference as soon as it's rendered
  const setVideoRef = (element) => {
    if (element && !videoRef.current) {
      console.log('Video element ref set via callback');
      videoRef.current = element;
    }
  };

  // Modified effect to manage camera resources
  useEffect(() => {
    console.log('Face verification visibility changed:', showFaceVerification);
    
    if (showFaceVerification) {
      // Reset states when showing verification panel
      setCameraActive(false);
      setFaceVerificationError(null);
      
      // We don't manually find the video element here anymore, 
      // instead we use the ref callback in the JSX
    } else {
      // Stop the camera when hiding verification
      if (streamRef.current || cameraActive) {
        stopCamera();
      }
    }
    
    // Cleanup function
    return () => {
      if (!showFaceVerification && (streamRef.current || cameraActive)) {
        stopCamera();
      }
    };
  }, [showFaceVerification]);

  // Cleanup webcam on unmount
  useEffect(() => {
    return () => {
      console.log('Cleaning up camera resources on component unmount');
      stopCamera();
    };
  }, []);

  // Fetch user data to check if face is registered
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        const data = await getUserData(user.uid);
        setUserData(data);
      } catch (err) {
        console.error('Error fetching user data:', err);
        toast.error('Failed to load user data. Please try again.');
      }
    };

    fetchUserData();
  }, [user]);

  // Fetch attendance data
  useEffect(() => {
    async function fetchUserStatus() {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Force a fresh fetch from Firestore
        const todayAttendance = await getTodayAttendance(user.uid);
        console.log('Fetched attendance data:', todayAttendance);
        
        if (todayAttendance) {
          // Update state with the fetched attendance data
          setUserStatus({
            checkedIn: !!todayAttendance.checkIn,
            checkedOut: !!todayAttendance.checkOut,
            checkInTime: todayAttendance.checkIn?.time,
            checkOutTime: todayAttendance.checkOut?.time,
            checkInStatus: todayAttendance.checkIn?.isLate ? 'late' : 'on-time',
            checkOutStatus: todayAttendance.checkOut?.isEarly ? 'early' : 'on-time'
          });
          console.log('Updated user status:', {
            checkedIn: !!todayAttendance.checkIn,
            checkedOut: !!todayAttendance.checkOut
          });
        } else {
          setUserStatus({
            checkedIn: false,
            checkedOut: false,
            checkInTime: null,
            checkOutTime: null,
            checkInStatus: null,
            checkOutStatus: null
          });
          console.log('Reset user status - no attendance found');
        }
        
        // Fetch attendance history with an increased limit
        console.log('Fetching attendance history...');
        const history = await getAttendanceHistory(user.uid, 30);
        console.log('Fetched history records:', history.length);
        setAttendanceHistory(history || []);
      } catch (error) {
        console.error('Error fetching user status:', error);
        toast.error(`Error loading attendance data: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchUserStatus();
  }, [user, refreshKey]);

  // Check campus WiFi
  useEffect(() => {
    const verifyCampusWiFi = async () => {
      setCheckingWiFi(true);
      try {
        const isOnCampus = await checkCampusWiFi();
        setIsOnCampusWiFi(isOnCampus);
      } catch (error) {
        console.error('Error verifying campus WiFi:', error);
        setIsOnCampusWiFi(false);
      } finally {
        setCheckingWiFi(false);
      }
    };

    verifyCampusWiFi();
    
    // Check WiFi every 5 minutes
    const wifiCheckInterval = setInterval(verifyCampusWiFi, 5 * 60 * 1000);
    
    return () => clearInterval(wifiCheckInterval);
  }, []);

  // Camera control functions
  const startCamera = async () => {
    try {
      console.log('Starting camera...');
      
      // Important: Re-query the DOM for the video element right before we need it
      if (!videoRef.current) {
        const freshVideoElement = document.getElementById(videoElementId);
        if (freshVideoElement) {
          console.log('Found video element directly from DOM');
          videoRef.current = freshVideoElement;
        } else {
          console.error('Video element not found in DOM');
          setFaceVerificationError('Camera element not found. Please try again.');
          return;
        }
      }

      // Verify that the video element is valid
      if (!videoRef.current) {
        console.error('Video element not found after all attempts');
        setFaceVerificationError('Camera initialization error. Please refresh the page and try again.');
        return;
      }

      // Stop any existing streams first
      if (streamRef.current) {
        console.log('Stopping existing stream before starting new one');
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Request camera access with specific constraints for better compatibility
      console.log('Requesting camera access...');
      try {
        const constraints = { 
          audio: false,
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
            frameRate: { ideal: 30 }
          }
        };
        
        console.log('Using constraints:', JSON.stringify(constraints));
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        console.log('Camera access granted, stream obtained:', stream ? 'Yes' : 'No');
        console.log('Stream has video tracks:', stream.getVideoTracks().length);
        
        if (!stream || stream.getVideoTracks().length === 0) {
          throw new Error('No video track found in media stream');
        }
        
        // Save stream reference first for cleanup
        streamRef.current = stream;
        
        // Re-verify video element is still valid
        if (videoRef.current) {
          // Clear any existing srcObject
          if (videoRef.current.srcObject) {
            videoRef.current.srcObject = null;
          }
          
          // Assign the new stream
          console.log('Assigning stream to video element');
          videoRef.current.srcObject = stream;
          
          // Force the video to play
          try {
            // Add event handlers for debugging
            videoRef.current.onloadedmetadata = () => {
              console.log('Video metadata loaded, dimensions:', 
                videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
              
              // Try to play after metadata is loaded
              videoRef.current.play()
                .then(() => {
                  console.log('Video playback started successfully');
                  // Update camera active state only after playback starts
                  setCameraActive(true);
                  setFaceVerificationError(null);
                  setFaceVerificationStatus('Camera activated. Position your face in the frame and click Verify.');
                })
                .catch(e => {
                  console.error('Error playing video after metadata loaded:', e);
                  setFaceVerificationError(`Error starting video playback: ${e.message}. Please try again.`);
                });
            };
            
            videoRef.current.onerror = (e) => {
              console.error('Video element error:', e);
              setFaceVerificationError(`Video element error: ${e.message || 'Unknown error'}`);
            };
            
            // Try to trigger metadata loading
            if (videoRef.current.readyState >= 2) {
              // Metadata already loaded, try to play immediately
              console.log('Video metadata already available, trying to play immediately');
              videoRef.current.play()
                .then(() => {
                  console.log('Video playback started successfully (immediate)');
                  setCameraActive(true);
                  setFaceVerificationError(null);
                })
                .catch(e => console.error('Error playing video immediately:', e));
            }
          } catch (playError) {
            console.error('Error setting up video playback:', playError);
            setFaceVerificationError(`Error initializing video: ${playError.message}`);
          }
        } else {
          // Clean up stream if video element disappeared
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
          console.error('Video element disappeared during initialization');
          throw new Error('Camera element became unavailable. Please try again.');
        }
      } catch (streamError) {
        console.error('Media stream error:', streamError);
        setFaceVerificationError(`Could not access camera: ${streamError.message}`);
        throw streamError;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setFaceVerificationError(`Camera access error: ${error.message}. Please ensure camera permissions are enabled.`);
      toast.error('Could not access camera. Check permissions and try again.');
    }
  };

  const stopCamera = () => {
    console.log('Stopping camera resources...');
    let hadStream = false;
    let hadVideo = false;
    
    // Stop the camera tracks
    try {
      if (streamRef.current) {
        hadStream = true;
        const tracks = streamRef.current.getTracks();
        console.log(`Stopping ${tracks.length} camera tracks`);
        
        if (tracks.length > 0) {
          tracks.forEach(track => {
            try {
              track.stop();
              console.log(`Stopped track: ${track.kind}`);
            } catch (e) {
              console.error('Error stopping track:', e);
            }
          });
        }
        
        // Always clear the reference
        streamRef.current = null;
      } else {
        console.log('No active stream reference to stop');
      }
      
      // Clear video element source
      if (videoRef.current && videoRef.current.srcObject) {
        hadVideo = true;
        try {
          videoRef.current.pause();
          videoRef.current.srcObject = null;
          console.log('Cleared video srcObject');
        } catch (e) {
          console.error('Error clearing video source:', e);
        }
      } else if (videoRef.current) {
        console.log('Video element exists but has no srcObject');
      } else {
        console.log('No video element reference to clear');
      }
    } catch (error) {
      console.error('Error in stopCamera:', error);
    } finally {
      // Always reset state variables
      setCameraActive(false);
      
      // Don't hide the face verification UI unless we explicitly need to
      // This allows the user to restart the camera if needed
      console.log(`Camera resources cleaned up. Had stream: ${hadStream}, Had video: ${hadVideo}`);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setRefreshKey(prevKey => prevKey + 1);
    toast.success('Refreshing attendance data...');
  };

  const handleCheckIn = async () => {
    if (userStatus.checkedIn) {
      toast.error('You have already checked in today');
      return;
    }
    
    // Check if face is registered - use the diagnostic function for better results
    if (!userData?.faceData?.faceRegistered || !userData?.faceData?.personId) {
      try {
        // Use the diagnostic function to get detailed information
        const registrationStatus = await compreFaceService.checkFaceRegistrationStatus(user.uid);
        console.log('Face registration status:', registrationStatus);
        
        if (!registrationStatus.registered) {
          // Show a detailed error message
          toast.error(`Registration issue: ${registrationStatus.message}`);
          console.error('Face registration issue:', registrationStatus.details);
          
          navigate('/mark-attendance'); // Navigate to mark-attendance page for face registration
          return;
        }
      } catch (error) {
        console.error('Error checking face registration status:', error);
        toast.error('You need to register your face first before marking attendance');
        navigate('/mark-attendance'); // Navigate to mark-attendance page for face registration
        return;
      }
    }
    
    // Verify campus WiFi
    setCheckingWiFi(true);
    const isOnCampus = await checkCampusWiFi();
    setCheckingWiFi(false);
    setIsOnCampusWiFi(isOnCampus);
    
    if (!isOnCampus) {
      toast.error('You must be connected to campus WiFi to check in');
      return;
    }

    // Check if within allowed check-in time (bypass in development)
    if (!isDevelopment) {
      try {
        const now = new Date();
        const [checkInStartHour, checkInStartMinute] = OFFICE_HOURS.CHECK_IN_START.split(':').map(Number);
        const [checkInEndHour, checkInEndMinute] = OFFICE_HOURS.CHECK_IN_END.split(':').map(Number);
        
        const checkInStartDateTime = new Date();
        checkInStartDateTime.setHours(checkInStartHour, checkInStartMinute, 0, 0);
        
        const checkInEndDateTime = new Date();
        checkInEndDateTime.setHours(checkInEndHour, checkInEndMinute, 0, 0);
        
        if (now < checkInStartDateTime || now > checkInEndDateTime) {
          toast.error(`Check-in is only allowed between ${OFFICE_HOURS.CHECK_IN_START} and ${OFFICE_HOURS.CHECK_IN_END}`);
          return;
        }
      } catch (error) {
        toast.error(error.message);
        return;
      }
    }
    
    // Setup verification mode before rendering camera
    setVerificationMode('check-in');
    setShowFaceVerification(true);
    setFaceVerificationStatus('Please click Start Camera to begin face verification');
    
    // Wait for the DOM to render before trying to access video element
    setTimeout(() => {
      // Reset video ref to make sure we get a fresh reference
      videoRef.current = document.getElementById('face-verification-video');
      // Don't automatically start camera - let user click the button
    }, 300);
  };

  const handleCheckOut = async () => {
    if (!userStatus.checkedIn) {
      toast.error('You must check in before checking out');
      return;
    }
    
    if (userStatus.checkedOut) {
      toast.error('You have already checked out today');
      return;
    }
    
    // Verify campus WiFi
    setCheckingWiFi(true);
    const isOnCampus = await checkCampusWiFi();
    setCheckingWiFi(false);
    setIsOnCampusWiFi(isOnCampus);
    
    if (!isOnCampus) {
      toast.error('You must be connected to campus WiFi to check out');
      return;
    }
    
    // Check if within allowed check-out time (bypass in development)
    if (!isDevelopment) {
      try {
        const now = new Date();
        const [checkOutStartHour, checkOutStartMinute] = OFFICE_HOURS.CHECK_OUT_START.split(':').map(Number);
        const [checkOutEndHour, checkOutEndMinute] = OFFICE_HOURS.CHECK_OUT_END.split(':').map(Number);
        
        const checkOutStartDateTime = new Date();
        checkOutStartDateTime.setHours(checkOutStartHour, checkOutStartMinute, 0, 0);
        
        const checkOutEndDateTime = new Date();
        checkOutEndDateTime.setHours(checkOutEndHour, checkOutEndMinute, 0, 0);
        
        if (now < checkOutStartDateTime || now > checkOutEndDateTime) {
          toast.error(`Check-out is only allowed between ${OFFICE_HOURS.CHECK_OUT_START} and ${OFFICE_HOURS.CHECK_OUT_END}`);
          return;
        }
      } catch (error) {
        toast.error(error.message);
        return;
      }
    }
    
    // Setup verification mode before rendering camera
    setVerificationMode('check-out');
    setShowFaceVerification(true);
    setFaceVerificationStatus('Please click Start Camera to begin face verification');
    
    // Wait for the DOM to render before trying to access video element
    setTimeout(() => {
      // Reset video ref to make sure we get a fresh reference
      videoRef.current = document.getElementById('face-verification-video');
      // Don't automatically start camera - let user click the button
    }, 300);
  };

  // This function handles the face verification process
  const verifyFace = async () => {
    if (!cameraActive) {
      setFaceVerificationError('Please start the camera first');
      return;
    }

    // Double-check that we actually have a working video stream
    if (!videoRef.current || !videoRef.current.srcObject) {
      setFaceVerificationError('Camera not properly initialized. Please restart the camera.');
      setCameraActive(false); // Reset the state to match reality
      return;
    }

    // Additional check for video dimensions
    const checkVideoReady = () => {
      return new Promise((resolve, reject) => {
        // If video already has dimensions, resolve immediately
        if (videoRef.current && videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
          console.log(`Video is ready with dimensions ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
          resolve(true);
          return;
        }

        // Otherwise wait a moment and check again
        console.log('Video not ready yet, waiting for dimensions...');
        let attempts = 0;
        const checkInterval = setInterval(() => {
          attempts++;
          if (videoRef.current && videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
            clearInterval(checkInterval);
            console.log(`Video is ready with dimensions ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
            resolve(true);
          } else if (attempts > 5) {
            clearInterval(checkInterval);
            console.error('Video never became ready after waiting');
            reject(new Error('Camera stream not active. Please restart the camera.'));
          } else {
            console.log(`Still waiting for video to be ready (attempt ${attempts})...`);
          }
        }, 500);
      });
    };

    setProcessing(true);
    setFaceVerificationError(null);
    setFaceVerificationStatus('Verifying your face...');
    
    try {
      // Wait for video to be ready
      await checkVideoReady();

      console.log('Capturing image from camera...');
      
      // Capture image
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      try {
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
      } catch (error) {
        console.error('Error drawing video to canvas:', error);
        throw new Error('Failed to capture image from camera. Please try again.');
      }
      
      let blob;
      try {
        blob = await new Promise((resolve, reject) => {
          canvas.toBlob(blob => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert canvas to blob'));
            }
          }, 'image/jpeg', 0.9);
        });
      } catch (error) {
        console.error('Error converting canvas to blob:', error);
        throw new Error('Failed to process captured image. Please try again.');
      }
      
      console.log('Image captured successfully, size:', Math.round(blob.size / 1024), 'KB');

      // Verify face using CompreFace API
      console.log('Calling CompreFace API for verification...');
      try {
        const verificationResult = await compreFaceService.verifyFace(blob, user.uid);

        console.log('Verification result:', verificationResult);
        
        // Check if verification found a face but it was the wrong person
        if (verificationResult.personId && verificationResult.personId !== user.uid && verificationResult.confidence > 0.975) {
          setFaceVerificationError(`Face verification failed: Wrong person detected. The system recognized you as another user.`);
          return;
        }

        if (verificationResult.isIdentical && verificationResult.confidence > 0.975) {
          // Face verified successfully, proceed with attendance marking
          let attendanceData;
          
          if (verificationMode === 'check-in') {
            // Determine if late based on time (if not in development mode)
            const isLate = !isDevelopment && isLateCheckIn();
            
            // Call attendance service check-in
            attendanceData = await checkIn(user.uid, {
              verified: true,
              confidence: verificationResult.confidence,
              method: 'compreface-api',
              timestamp: verificationResult.verifiedAt // Use timestamp from CompreFace service
            }, isLate);
            
            if (!attendanceData || !attendanceData.checkIn) {
              throw new Error('Failed to check in. Please try again.');
            }
            
            // Update UI immediately
            setUserStatus(prev => ({
              ...prev,
              checkedIn: true,
              checkInTime: attendanceData.checkIn.time,
              checkInStatus: attendanceData.checkIn.isLate ? 'late' : 'on-time'
            }));
            
            const message = attendanceData.checkIn.isLate ? 'Checked in (Late)' : 'Checked in successfully';
            toast.success(message);
          } else {
            // Determine if early based on time (if not in development mode)
            const isEarly = !isDevelopment && isEarlyCheckOut();
            
            // Call attendance service check-out
            attendanceData = await checkOut(user.uid, {
              verified: true,
              confidence: verificationResult.confidence,
              method: 'compreface-api',
              timestamp: verificationResult.verifiedAt // Use timestamp from CompreFace service
            }, isEarly);
            
            if (!attendanceData || !attendanceData.checkOut) {
              throw new Error('Failed to check out. Please try again.');
            }
            
            // Update UI immediately
            setUserStatus(prev => ({
              ...prev,
              checkedOut: true,
              checkOutTime: attendanceData.checkOut.time,
              checkOutStatus: attendanceData.checkOut.isEarly ? 'early' : 'on-time'
            }));
            
            const message = attendanceData.checkOut.isEarly ? 'Checked out (Early)' : 'Checked out successfully';
            toast.success(message);
          }
          
          // Close the face verification section
          stopCamera();
          // Wait for Firestore to update
          setTimeout(() => {
            handleRefresh();
          }, 1000);
        } else {
          // Provide more specific error message based on what happened
          if (verificationResult.personId && verificationResult.personId !== user.uid) {
            setFaceVerificationError(`Face verification failed: You were recognized as a different user.`);
          } else if (verificationResult.confidence < 0.975) {
            setFaceVerificationError(`Face verification failed: Confidence too low (${verificationResult.confidence.toFixed(2)}). Please ensure good lighting and positioning.`);
          } else {
            setFaceVerificationError(`Face verification failed. Confidence: ${verificationResult.confidence ? verificationResult.confidence.toFixed(2) : '0.00'}`);
          }
        }
      } catch (error) {
        console.error('CompreFace API error:', error);
        // Log additional details if available in the error object
        if (error.response) {
          console.error('CompreFace API response:', error.response.data);
        }
        throw error;
      }
    } catch (error) {
      console.error('Error during face verification:', error);
      
      // Provide more user-friendly error messages
      if (error.message.includes('Face data not found') || 
          error.message.includes('face details not found') ||
          error.message.includes('No face data found in localStorage') ||
          error.message.includes('Could not retrieve face data')) {
        setFaceVerificationError('Your face profile needs to be re-registered since we switched to CompreFace. Please register your face again in the profile section.');
      } else if (error.message.includes('No face detected')) {
        setFaceVerificationError('No face detected. Please ensure your face is clearly visible in the camera.');
      } else if (error.message.includes('Multiple faces detected')) {
        setFaceVerificationError('Multiple faces detected. Please ensure only your face is in the frame.');
      } else if (error.message.includes('Please wait')) {
        setFaceVerificationError(error.message); // Show throttling message
      } else if (error.message.includes('Failed to process image')) {
        setFaceVerificationError('Failed to process image data. Please try again with better lighting.');
      } else {
        setFaceVerificationError(error.message || 'Face verification failed. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  };

  const cancelFaceVerification = () => {
    console.log('Cancelling face verification...');
    
    // First stop any active camera streams
    try {
      if (streamRef.current) {
        const tracks = streamRef.current.getTracks();
        tracks.forEach(track => track.stop());
        streamRef.current = null;
      }
      
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject = null;
      }
    } catch (error) {
      console.error('Error stopping camera during cancel:', error);
    }
    
    // Reset all related state
    setCameraActive(false);
    setFaceVerificationError(null);
    setFaceVerificationStatus('');
    
    // Important: Hide the face verification panel last
    setShowFaceVerification(false);
    
    console.log('Face verification cancelled');
  };

  // Check if user is late for check-in (bypassed in development)
  const isLateCheckIn = () => {
    if (isDevelopment) {
      return false; // Never late in development mode
    }
    
    const now = new Date();
    const [checkInStartHour, checkInStartMinute] = OFFICE_HOURS.CHECK_IN_START.split(':').map(Number);
    const [checkInEndHour, checkInEndMinute] = OFFICE_HOURS.CHECK_IN_END.split(':').map(Number);
    
    const checkInStartDateTime = new Date();
    checkInStartDateTime.setHours(checkInStartHour, checkInStartMinute, 0, 0);
    
    const checkInEndDateTime = new Date();
    checkInEndDateTime.setHours(checkInEndHour, checkInEndMinute, 0, 0);
    
    // If before start time, too early (not allowed)
    if (now < checkInStartDateTime) {
      throw new Error(`Check-in is only allowed between ${OFFICE_HOURS.CHECK_IN_START} and ${OFFICE_HOURS.CHECK_IN_END}`);
    }
    
    // If after end time, too late (not allowed)
    if (now > checkInEndDateTime) {
      throw new Error(`Check-in time has ended at ${OFFICE_HOURS.CHECK_IN_END}`);
    }
    
    // If after start time + threshold, mark as late
    const isLate = now > new Date(checkInStartDateTime.getTime() + OFFICE_HOURS.LATE_THRESHOLD * 60000);
    
    return isLate;
  };

  // Check if user is early for check-out (bypassed in development)
  const isEarlyCheckOut = () => {
    if (isDevelopment) {
      return false; // Never early in development mode
    }
    
    const now = new Date();
    const [checkOutStartHour, checkOutStartMinute] = OFFICE_HOURS.CHECK_OUT_START.split(':').map(Number);
    const [checkOutEndHour, checkOutEndMinute] = OFFICE_HOURS.CHECK_OUT_END.split(':').map(Number);
    
    const checkOutStartDateTime = new Date();
    checkOutStartDateTime.setHours(checkOutStartHour, checkOutStartMinute, 0, 0);
    
    const checkOutEndDateTime = new Date();
    checkOutEndDateTime.setHours(checkOutEndHour, checkOutEndMinute, 0, 0);
    
    // If before start time, too early (not allowed)
    if (now < checkOutStartDateTime) {
      throw new Error(`Check-out is only allowed between ${OFFICE_HOURS.CHECK_OUT_START} and ${OFFICE_HOURS.CHECK_OUT_END}`);
    }
    
    // If after end time, too late (not allowed)
    if (now > checkOutEndDateTime) {
      throw new Error(`Check-out time has ended at ${OFFICE_HOURS.CHECK_OUT_END}`);
    }
    
    // If before start time + threshold, mark as early
    const isEarly = now < new Date(checkOutStartDateTime.getTime() + OFFICE_HOURS.EARLY_THRESHOLD * 60000);
    
    return isEarly;
  };

  const formatTime = (isoString) => {
    if (!isoString) return 'Not available';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) {
        console.error('Invalid date format:', isoString);
        return 'Invalid time';
      }
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      console.error('Error formatting time:', e);
      return 'Invalid time';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      // Handle ISO string format (with time component)
      if (dateString.includes('T')) {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          console.error('Invalid date format:', dateString);
          return dateString;
        }
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      } 
      // Handle YYYY-MM-DD format
      else if (dateString.includes('-')) {
        const [year, month, day] = dateString.split('-');
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      }
      // Just return as is for other formats
      return dateString;
    } catch (e) {
      console.error('Error formatting date:', e);
      return dateString;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Attendance Management</h2>
          <div className="flex space-x-2">
            <button
              onClick={handleRefresh}
              disabled={processing}
              className="px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md shadow-sm text-sm font-medium flex items-center"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading attendance data...</p>
          </div>
        ) : (
          <div className="p-6">
            {/* WiFi Status */}
            <div className={`mb-6 p-4 rounded-lg ${isOnCampusWiFi ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
              <div className="flex items-center">
                <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full ${isOnCampusWiFi ? 'bg-green-100' : 'bg-yellow-100'}`}>
                  {checkingWiFi ? (
                    <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : isOnCampusWiFi ? (
                    <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${isOnCampusWiFi ? 'text-green-800' : 'text-yellow-800'}`}>
                    {checkingWiFi 
                      ? 'Verifying WiFi connection...' 
                      : isOnCampusWiFi 
                        ? 'Connected to campus WiFi' 
                        : 'Not connected to campus WiFi'}
                  </h3>
                  <div className="mt-1 text-sm">
                    <p className={isOnCampusWiFi ? 'text-green-700' : 'text-yellow-700'}>
                      {isOnCampusWiFi 
                        ? 'You can mark attendance' 
                        : 'You must be connected to campus WiFi to mark attendance'}
                    </p>
                  </div>
                </div>
                <div className="ml-auto">
                  <button
                    onClick={async () => {
                      setCheckingWiFi(true);
                      const isOnCampus = await checkCampusWiFi();
                      setIsOnCampusWiFi(isOnCampus);
                      setCheckingWiFi(false);
                    }}
                    disabled={checkingWiFi}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                      checkingWiFi 
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                        : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                    }`}
                  >
                    {checkingWiFi ? 'Checking...' : 'Check Again'}
                  </button>
                </div>
              </div>
            </div>

            {/* Office Hours Info */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-blue-800">Office Hours</h3>
                {isDevelopment && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                    Dev Mode: Time Constraints Bypassed
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-blue-600">Check-in Time</p>
                  <p className="text-sm font-medium text-blue-900">{OFFICE_HOURS.CHECK_IN_START} - {OFFICE_HOURS.CHECK_IN_END}</p>
                  <p className="text-xs text-blue-500 mt-1">
                    Late after {OFFICE_HOURS.CHECK_IN_START}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-600">Check-out Time</p>
                  <p className="text-sm font-medium text-blue-900">{OFFICE_HOURS.CHECK_OUT_START} - {OFFICE_HOURS.CHECK_OUT_END}</p>
                  <p className="text-xs text-blue-500 mt-1">
                    Early before {OFFICE_HOURS.CHECK_OUT_START}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 w-full lg:w-auto border border-gray-200 shadow-sm">
                <h3 className="text-md font-medium text-gray-700 mb-2">Today's Status</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Check-in</p>
                    <p className="text-md font-medium">
                      {userStatus.checkedIn ? formatTime(userStatus.checkInTime) : 'Not checked in'}
                    </p>
                    {userStatus.checkInStatus && (
                      <StatusBadge status={userStatus.checkInStatus} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Check-out</p>
                    <p className="text-md font-medium">
                      {userStatus.checkedOut ? formatTime(userStatus.checkOutTime) : 'Not checked out'}
                    </p>
                    {userStatus.checkOutStatus && (
                      <StatusBadge status={userStatus.checkOutStatus} />
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                <button
                  onClick={handleCheckIn}
                  disabled={userStatus.checkedIn || processing || !isOnCampusWiFi || checkingWiFi}
                  className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    userStatus.checkedIn || processing || !isOnCampusWiFi || checkingWiFi
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {processing && verificationMode === 'check-in' 
                    ? 'Processing...' 
                    : userStatus.checkedIn 
                      ? 'Already Checked In' 
                      : 'Check In'}
                </button>
                <button
                  onClick={handleCheckOut}
                  disabled={!userStatus.checkedIn || userStatus.checkedOut || processing || !isOnCampusWiFi || checkingWiFi}
                  className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    !userStatus.checkedIn || userStatus.checkedOut || processing || !isOnCampusWiFi || checkingWiFi
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {processing && verificationMode === 'check-out' 
                    ? 'Processing...' 
                    : !userStatus.checkedIn 
                      ? 'Check In First' 
                      : userStatus.checkedOut 
                        ? 'Already Checked Out' 
                        : 'Check Out'}
                </button>
              </div>
            </div>
            
            {/* Face Verification Section */}
            {showFaceVerification && (
              <div className="mb-8 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-lg font-medium text-gray-800 mb-4">
                  Face Verification for {verificationMode === 'check-in' ? 'Check-in' : 'Check-out'}
                </h3>
                
                {faceVerificationError && (
                  <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md border border-red-200">
                    {faceVerificationError}
                  </div>
                )}
                
                {faceVerificationStatus && !faceVerificationError && (
                  <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                    {faceVerificationStatus}
                  </div>
                )}
                
                <div className="relative mb-4 bg-gray-100 rounded-lg overflow-hidden" style={{ height: '320px' }}>
                  {/* Video element is always rendered but only visible when camera is active */}
                  <video 
                    id={videoElementId}
                    ref={setVideoRef} 
                    autoPlay 
                    playsInline
                    muted
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                      transform: 'scaleX(-1)', // Mirror the camera for more natural selfie view
                      display: cameraActive ? 'block' : 'none'
                    }} 
                  />
                  
                  {/* Show inactive message when camera is not active */}
                  {!cameraActive && (
                    <div className="flex flex-col items-center justify-center h-full">
                      <p className="text-gray-500 mb-2">Camera inactive</p>
                      <p className="text-xs text-gray-400">Click "Start Camera" below to begin</p>
                    </div>
                  )}
                  
                  {processing && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between">
                  {!cameraActive ? (
                    <button
                      onClick={startCamera}
                      disabled={processing}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400"
                    >
                      {processing ? 'Please wait...' : 'Start Camera'}
                    </button>
                  ) : (
                    <button
                      onClick={verifyFace}
                      disabled={processing}
                      className="px-4 py-2 bg-green-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-green-700 disabled:bg-green-400"
                    >
                      {processing ? 'Verifying...' : 'Verify Face'}
                    </button>
                  )}
                  
                  <button
                    onClick={cancelFaceVerification}
                    disabled={processing}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md shadow-sm text-sm font-medium hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {/* Attendance History Table */}
            <div className="mt-8 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-800">Attendance History</h3>
                <span className="text-sm text-gray-500">
                  {attendanceHistory?.length || 0} records found
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Check-in Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Check-out Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {!attendanceHistory || attendanceHistory.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                          No attendance records found.
                        </td>
                      </tr>
                    ) : (
                      attendanceHistory.map((record, index) => {
                        // Extract checkIn and checkOut data safely
                        const checkIn = record.checkIn || {};
                        const checkOut = record.checkOut || {};
                        
                        // Calculate duration if both check-in and check-out times exist
                        let duration = 'N/A';
                        if (checkIn.time && checkOut.time) {
                          try {
                            const checkInDate = new Date(checkIn.time);
                            const checkOutDate = new Date(checkOut.time);
                            if (!isNaN(checkInDate) && !isNaN(checkOutDate)) {
                              const durationMinutes = Math.round((checkOutDate - checkInDate) / (1000 * 60));
                              duration = `${durationMinutes} mins`;
                            }
                          } catch (e) {
                            console.error('Error calculating duration:', e);
                          }
                        }
                        
                        return (
                          <tr key={record.id || index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(record.date)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {checkIn.time ? formatTime(checkIn.time) : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {checkIn.isLate ? (
                                <StatusBadge status="late" />
                              ) : checkIn.time ? (
                                <StatusBadge status="on-time" />
                              ) : null}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {checkOut.time ? formatTime(checkOut.time) : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {checkOut.isEarly ? (
                                <StatusBadge status="early" />
                              ) : checkOut.time ? (
                                <StatusBadge status="on-time" />
                              ) : null}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {duration}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {userStatus.checkedIn && userStatus.checkedOut && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Today's attendance has been completed</h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>Your attendance for today has been recorded. Check-in and check-out times have been marked.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Attendance; 
 