import { collection, doc, setDoc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from './config';
import * as tf from '@tensorflow/tfjs';
import * as faceapi from 'face-api.js';

// Development mode flag - always disabled now
const DEV_MODE = false;

// Helper function to store temporary face image in localStorage
const storeTemporaryFaceImage = (imageDataUrl) => {
  localStorage.setItem('tempFaceImage', imageDataUrl);
  return true;
};

// No bypassing face verification in any mode
class FaceService {
  constructor() {
    this.modelsLoaded = false;
  }

  async loadModelsIfNeeded() {
    // In dev mode, pretend models are loaded
    if (DEV_MODE) {
      console.log('[DEV MODE] Skipping actual model loading');
      this.modelsLoaded = true;
      return true;
    }

    try {
      if (this.modelsLoaded) {
        console.log('Models already loaded, skipping...');
        return;
      }
      
      console.log('Loading face-api.js models...');
      
      // Set up model URL with explicit path
      const modelUrl = `${window.location.origin}/models`;
      console.log('Model URL:', modelUrl);
      
      // First, make sure TensorFlow backend is initialized
      await tf.setBackend('webgl');
      await tf.ready();
      console.log('TensorFlow backend initialized:', tf.getBackend());
      
      // Check if faceapi and nets are available
      if (!faceapi || !faceapi.nets) {
        console.error('Face API not properly loaded');
        throw new Error('Face API not properly initialized');
      }
      
      // Load models one by one with full paths
      try {
        console.log('Loading TinyFaceDetector model...');
        await faceapi.nets.tinyFaceDetector.load(modelUrl);
        console.log('TinyFaceDetector model loaded');
      } catch (e) {
        console.error('Failed to load TinyFaceDetector:', e);
        throw e;
      }
      
      // Short delay between model loading
      await new Promise(resolve => setTimeout(resolve, 200));
      
      try {
        console.log('Loading FaceLandmark68Net model...');
        await faceapi.nets.faceLandmark68Net.load(modelUrl);
        console.log('FaceLandmark68Net model loaded');
      } catch (e) {
        console.error('Failed to load FaceLandmark68Net:', e);
        throw e;
      }
      
      // Another delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      try {
        console.log('Loading FaceRecognitionNet model...');
        await faceapi.nets.faceRecognitionNet.load(modelUrl);
        console.log('FaceRecognitionNet model loaded');
      } catch (e) {
        console.error('Failed to load FaceRecognitionNet:', e);
        throw e;
      }
      
      // Validate that models were loaded correctly
      const allModelsLoaded = 
        faceapi.nets.tinyFaceDetector.isLoaded && 
        faceapi.nets.faceLandmark68Net.isLoaded && 
        faceapi.nets.faceRecognitionNet.isLoaded;
      
      if (!allModelsLoaded) {
        throw new Error('Not all models were loaded successfully');
      }
      
      this.modelsLoaded = true;
      console.log('All face-api.js models loaded successfully');
      return true;
    } catch (error) {
      console.error('Error loading face-api.js models:', error);
      this.modelsLoaded = false;
      throw new Error(`Failed to load face detection models: ${error.message}`);
    }
  }

  async registerFace(userId, imageData) {
    // In development mode, bypass actual face detection
    if (DEV_MODE) {
      console.log('[DEV MODE] Bypassing actual face registration for user:', userId);
      
      // Create a mock face descriptor (128-dimensional vector with random values)
      const mockDescriptor = {};
      for (let i = 0; i < 128; i++) {
        mockDescriptor[i] = Math.random() * 0.5; // Random values between 0 and 0.5
      }
      
      // Store mock face data in Firestore
      const faceData = {
        userId,
        faceDescriptor: mockDescriptor,
        registeredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        faceRegistered: true
      };
      
      // Save to Firestore
      console.log('[DEV MODE] Saving mock face data to Firestore');
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, faceData, { merge: true });
      
      // Store image in localStorage if available
      if (imageData) {
        storeTemporaryFaceImage(imageData);
      }
      
      console.log('[DEV MODE] Mock face registration successful for user:', userId);
      return true;
    }
    
    // Normal mode - proceed with actual face detection
    try {
      console.log('Starting face registration for user:', userId);
      
      // Load models first
      await this.loadModelsIfNeeded();
      
      // Create image element
      console.log('Creating image from data...');
      const img = await this.createImageFromData(imageData);
      if (!img) {
        throw new Error('Failed to create image from data');
      }
      
      console.log('Image created, dimensions:', img.width, 'x', img.height);
      
      // Use tf.tidy to manage memory
      const detection = await tf.tidy(() => {
        console.log('Detecting face for registration...');
        return faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
          .withFaceLandmarks()
          .withFaceDescriptor();
      });
      
      // Check if detection was successful
      if (!detection) {
        throw new Error('No face detected. Please ensure your face is clearly visible in the camera.');
      }
      
      console.log('Face detected for registration, descriptor length:', detection.descriptor.length);
      
      // Convert Float32Array to normal object for Firestore storage
      const descriptorObject = {};
      for (let i = 0; i < detection.descriptor.length; i++) {
        descriptorObject[i] = detection.descriptor[i];
      }
      
      // Store face descriptor in Firestore with complete data
      const faceData = {
        userId,
        faceDescriptor: descriptorObject,
        registeredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        faceRegistered: true
      };
      
      // First check if user exists in any collection
      const userExists = await this.checkUserExists(userId);
      
      if (!userExists) {
        console.warn('User does not exist in any collection, creating new user entry');
      }
      
      // Save to Firestore (users collection)
      console.log('Saving face data to Firestore...');
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, faceData, { merge: true });
      
      // Store face image in localStorage temporarily
      if (imageData) {
        storeTemporaryFaceImage(imageData);
      }
      
      console.log('Face registered successfully for user:', userId);
    return true;
  } catch (error) {
    console.error('Error registering face:', error);
    throw error;
  }
  }

  async verifyFace(userId, imageData) {
    // In development mode, always return successful verification
    if (DEV_MODE) {
      console.log('[DEV MODE] Bypassing actual face verification for user:', userId);
      
      // Check if user exists
      const userExists = await this.checkUserExists(userId);
      if (!userExists) {
        console.error('[DEV MODE] User does not exist:', userId);
        throw new Error('User not found. Please register first.');
      }
      
      // Get user data to check if face is registered
      const userData = await this.getUserData(userId);
      if (!userData?.faceRegistered) {
        console.error('[DEV MODE] Face not registered for user:', userId);
        throw new Error('Face not registered. Please register your face first.');
      }
      
      // In dev mode, store the verification image for consistency
      if (imageData) {
        storeTemporaryFaceImage(imageData);
      }
      
      console.log('[DEV MODE] Mock face verification successful for user:', userId);
      return { isMatch: true, similarity: 0.95, devMode: true };
    }
    
    // Normal mode - proceed with actual face verification
    try {
      console.log('Starting face verification for user:', userId);
      
      // Load models first
      await this.loadModelsIfNeeded();
      
      // Get user face data
      console.log('Fetching user data for verification...');
      const userData = await this.getUserFaceData(userId);
      
      if (!userData || !userData.faceDescriptor) {
        console.error('No face descriptor found for user:', userId);
        throw new Error('Face not registered. Please register your face first.');
      }
      
      // Load the captured image
      console.log('Loading captured image...');
      const img = await this.createImageFromData(imageData);
      if (!img) {
        throw new Error('Failed to load captured image. Please try again.');
      }
      
      console.log('Image loaded, dimensions:', img.width, 'x', img.height);
      
      // Use tf.tidy to manage memory
      const detection = await tf.tidy(() => {
        console.log('Detecting face in captured image...');
        return faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
          .withFaceLandmarks()
          .withFaceDescriptor();
      });
      
      if (!detection) {
        console.error('No face detected in image');
        throw new Error('No face detected in captured image. Please ensure your face is clearly visible and try again.');
      }
      
      console.log('Face detected in verification image, descriptor length:', detection.descriptor.length);
      
      // Parse the stored descriptor from Firestore
      const storedDescriptor = Float32Array.from(Object.values(userData.faceDescriptor));
      
      // Calculate similarity using euclidean distance
      const distance = faceapi.euclideanDistance(detection.descriptor, storedDescriptor);
      const similarity = 1 - Math.min(1, distance);
      
      console.log(`Face verification similarity: ${similarity.toFixed(2)}, distance: ${distance.toFixed(2)}`);
      
      // Use a threshold to determine if it's a match
      const threshold = 0.6;
      const isMatch = similarity >= threshold;
      
      if (!isMatch) {
        console.error(`Face verification failed: similarity ${similarity.toFixed(2)} below threshold ${threshold}`);
        throw new Error('Face verification failed. Please ensure you are the registered user.');
      }
      
      console.log('Face verification successful!');
      return { isMatch, similarity };
    } catch (error) {
      console.error('Face verification error:', error);
      throw error;
    } finally {
      // Clean up any remaining tensors
      try {
        const tensorsLeft = tf.memory().numTensors;
        if (tensorsLeft > 0) {
          console.log(`Cleaning up ${tensorsLeft} tensors`);
          tf.disposeVariables();
        }
      } catch (e) {
        console.error('Error cleaning up tensors:', e);
      }
    }
  }

  // Helper method to create an image element from image data
  async createImageFromData(imageData) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      // Set up a timeout for image loading
      const timeout = setTimeout(() => {
        reject(new Error('Image loading timed out'));
      }, 10000); // 10 second timeout
      
      img.onload = () => {
        clearTimeout(timeout);
        if (img.width > 0 && img.height > 0) {
          resolve(img);
        } else {
          reject(new Error('Loaded image has invalid dimensions'));
        }
      };
      
      img.onerror = (err) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to load image: ${err.message || 'Unknown error'}`));
      };
      
      // Set the source last
      img.src = imageData;
    });
  }

  // New method to specifically get user face data from Firestore
  async getUserFaceData(userId) {
    try {
      console.log(`Getting face data for user: ${userId}`);
      
      // Check in users collection
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists() && userSnap.data().faceDescriptor) {
        console.log('Found face data in users collection');
        return userSnap.data();
      }
      
      // If not found in users, check teachers collection
      const teacherRef = doc(db, 'teachers', userId);
      const teacherSnap = await getDoc(teacherRef);
      
      if (teacherSnap.exists()) {
        console.log('User found in teachers collection, checking for face data');
        
        // For teachers, we might store their face data in users collection
        if (userSnap.exists() && userSnap.data().faceDescriptor) {
          console.log('Found teacher face data in users collection');
          return userSnap.data();
        }
        
        // Or directly in the teachers collection
        if (teacherSnap.data().faceDescriptor) {
          console.log('Found face data in teachers collection');
          return teacherSnap.data();
        }
      }
      
      // If we reach here, user exists but no face data
      if (userSnap.exists() || teacherSnap.exists()) {
        console.warn('User found but no face descriptor available');
        return { faceRegistered: false };
      }
      
      console.error('User not found in any collection:', userId);
      return null;
  } catch (error) {
      console.error('Error getting user face data:', error);
    throw error;
    }
  }

  // Helper method to get user data
  async getUserData(userId) {
    try {
      // First check the teachers collection
      const teacherRef = doc(db, 'teachers', userId);
      const teacherSnap = await getDoc(teacherRef);
      
      if (teacherSnap.exists()) {
        const teacherData = teacherSnap.data();
        
        // Now check if face is registered in the users collection
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        
        // Face is registered only if the descriptor exists
        const faceRegistered = userSnap.exists() && !!userSnap.data()?.faceDescriptor;
        
        return {
          id: teacherSnap.id,
          ...teacherData,
          faceRegistered
        };
      }
      
      // If not found in teachers, check general users
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        return {
          id: userSnap.id,
          ...userData,
          faceRegistered: !!userData.faceDescriptor
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user data:', error);
      throw error;
    }
  }

  // Helper method to check if user exists in any collection
  async checkUserExists(userId) {
    try {
      // Check users collection
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return true;
      }
      
      // Check teachers collection
      const teacherRef = doc(db, 'teachers', userId);
      const teacherSnap = await getDoc(teacherRef);
      
      if (teacherSnap.exists()) {
  return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking user existence:', error);
      return false;
    }
  }
}

// Create and export a single instance
export const faceService = new FaceService();

// For backward compatibility
export const registerFace = async (userId, imageData) => {
  return faceService.registerFace(userId, imageData);
};

// Get temporary face image from localStorage
export const getTemporaryFaceImage = () => {
  return localStorage.getItem('tempFaceImage');
};

// Clear temporary face image
export const clearTemporaryFaceImage = () => {
  localStorage.removeItem('tempFaceImage');
  return true;
}; 