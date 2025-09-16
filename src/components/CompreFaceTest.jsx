import React, { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import { compreFaceService } from '../services/compreFaceService';
import { Box, Button, Typography, Paper, Alert, CircularProgress } from '@mui/material';

const CompreFaceTest = () => {
  const webcamRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageData, setImageData] = useState(null);
  const [testType, setTestType] = useState('detect'); // 'detect' or 'recognize'

  const capture = async () => {
    if (!webcamRef.current) return;
    
    try {
      setLoading(true);
      setError(null);
      setTestResult(null);
      
      // Capture image from webcam
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        throw new Error('Failed to capture image');
      }
      
      setImageData(imageSrc);
      
      // Test API based on selected test type
      if (testType === 'detect') {
        // Test face detection
        const detectionResult = await compreFaceService.detectFace(imageSrc);
        setTestResult({
          type: 'Detection',
          data: detectionResult,
          success: detectionResult && detectionResult.length > 0,
          facesCount: detectionResult.length
        });
      } else {
        // Test face recognition
        // We'll just use a hard-coded user ID for testing
        const testUserId = 'test-user-123';
        const recognitionResult = await compreFaceService.verifyFace(imageSrc, testUserId);
        setTestResult({
          type: 'Recognition',
          data: recognitionResult,
          success: recognitionResult.isIdentical,
          confidence: recognitionResult.confidence
        });
      }
    } catch (error) {
      console.error('Test error:', error);
      setError(error.message || 'Test failed');
    } finally {
      setLoading(false);
    }
  };

  const registerTestFace = async () => {
    if (!webcamRef.current) return;
    
    try {
      setLoading(true);
      setError(null);
      setTestResult(null);
      
      // Capture image
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        throw new Error('Failed to capture image');
      }
      
      setImageData(imageSrc);
      
      // Register with test user ID
      const testUserId = 'test-user-123';
      const registrationResult = await compreFaceService.registerFace(imageSrc, testUserId);
      
      setTestResult({
        type: 'Registration',
        data: registrationResult,
        success: true,
        faceId: registrationResult.faceId
      });
      
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 700, mx: 'auto', my: 4 }}>
      <Typography variant="h5" gutterBottom>CompreFace API Test Tool</Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Use this tool to test the CompreFace API integration.
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}
      
      {testResult && (
        <Alert severity={testResult.success ? "success" : "warning"} sx={{ mb: 2 }}>
          <Typography variant="subtitle2">{testResult.type} Test Result:</Typography>
          {testResult.type === 'Detection' && (
            <Typography variant="body2">
              {testResult.success 
                ? `Detected ${testResult.facesCount} face(s).` 
                : 'No faces detected.'}
            </Typography>
          )}
          {testResult.type === 'Recognition' && (
            <Typography variant="body2">
              {testResult.success 
                ? `Face verified with confidence: ${(testResult.confidence * 100).toFixed(2)}%` 
                : `Face not verified. Confidence: ${(testResult.confidence * 100).toFixed(2)}%`}
            </Typography>
          )}
          {testResult.type === 'Registration' && (
            <Typography variant="body2">
              Face registered successfully with ID: {testResult.faceId}
            </Typography>
          )}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{ position: 'relative', mb: 2, width: '100%' }}>
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              width: 640,
              height: 480,
              facingMode: "user"
            }}
            style={{ borderRadius: '8px', width: '100%', height: 'auto' }}
          />
          {loading && (
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
        
        <Box sx={{ display: 'flex', mb: 2 }}>
          <Button 
            variant={testType === 'detect' ? "contained" : "outlined"}
            onClick={() => setTestType('detect')}
            sx={{ mr: 1 }}
          >
            Test Detection
          </Button>
          <Button 
            variant={testType === 'recognize' ? "contained" : "outlined"}
            onClick={() => setTestType('recognize')}
          >
            Test Recognition
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={capture}
            disabled={loading}
            fullWidth
          >
            {testType === 'detect' ? 'Test Face Detection' : 'Test Face Recognition'}
          </Button>
          <Button 
            variant="contained" 
            color="secondary" 
            onClick={registerTestFace}
            disabled={loading}
            fullWidth
          >
            Register Test Face
          </Button>
        </Box>
        
        {imageData && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="subtitle2" gutterBottom>Captured Image:</Typography>
            <img 
              src={imageData} 
              alt="Captured face" 
              style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }} 
            />
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default CompreFaceTest; 