import axios from 'axios';
import { getUserData } from '../firebase/userService';
import { updateUserFaceData } from '../firebase/userService';


// Import CompreFace removed as we'll use axios directly

// CompreFace API configuration
const COMPREFACE_URL = import.meta.env.VITE_COMPREFACE_URL;
const COMPREFACE_API_KEY = import.meta.env.VITE_COMPREFACE_API_KEY;
const COMPREFACE_API_DETECTION_KEY = import.meta.env.VITE_COMPREFACE_API_DETECTION_KEY;
const COMPREFACE_API_VERIFICATION_KEY = import.meta.env.VITE_COMPREFACE_API_VERIFICATION_KEY;

export { COMPREFACE_URL, COMPREFACE_API_KEY, COMPREFACE_API_DETECTION_KEY, COMPREFACE_API_VERIFICATION_KEY };


// Cloudinary configuration if required


// Helper function to get current time in IST
const getCurrentTimeIST = () => {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const nowIST = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return nowIST.toISOString();
};

// Helper function to convert data URI to blob
const dataURItoBlob = (dataURI) => {
  try {
    // If dataURI is already a Blob, return it directly
    if (dataURI instanceof Blob) {
      console.log('Data is already a Blob, size:', dataURI.size, 'type:', dataURI.type);
      return dataURI;
    }
    
    // Check if dataURI is valid
    if (!dataURI || typeof dataURI !== 'string' || !dataURI.startsWith('data:')) {
      console.error('Invalid dataURI format:', typeof dataURI === 'string' ? dataURI.substring(0, 20) + '...' : typeof dataURI);
      throw new Error('Invalid image data format');
    }

    // Split the dataURI to get the base64 part
    const arr = dataURI.split(',');
    if (arr.length !== 2) {
      console.error('Invalid dataURI format (missing comma)');
      throw new Error('Invalid image data format');
    }

    // Get the content type from the dataURI (e.g., 'image/jpeg')
    const mime = arr[0].match(/:(.*?);/)[1];
    
    // Convert base64 to binary
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    // Create and return a Blob
    return new Blob([u8arr], { type: mime });
  } catch (error) {
    console.error('Error converting dataURI to Blob:', error);
    throw new Error('Failed to process image data: ' + error.message);
  }
};

// Create API instances for CompreFace services
const createDetectionService = () => {
  return axios.create({
    baseURL: `${COMPREFACE_URL}/api/v1/detection`,
    headers: {
      'x-api-key': COMPREFACE_API_DETECTION_KEY
    }
  });
};

const createRecognitionService = () => {
  return axios.create({
    baseURL: `${COMPREFACE_URL}/api/v1/recognition`,
    headers: {
      'x-api-key': COMPREFACE_API_KEY
    }
  });
};

const createVerificationService = () => {
  return axios.create({
    baseURL: `${COMPREFACE_URL}/api/v1/verification`,
    headers: {
      'x-api-key': COMPREFACE_API_VERIFICATION_KEY
    }
  });
};

// Create instances
const detectionService = createDetectionService();
const recognitionService = createRecognitionService();
const verificationService = createVerificationService();

// Limit verification frequency to prevent abuse
const MIN_VERIFICATION_INTERVAL_MS = 3000; // 3 seconds between attempts
const lastVerificationAttempts = {};

export const compreFaceService = {
  // Added diagnostic function to check face registration status
  async checkFaceRegistrationStatus(userId) {
    try {
      console.log('Checking face registration status for user:', userId);
      
      // Step 1: Get user data from Firebase
      const userData = await getUserData(userId);
      
      console.log('User data retrieved:', userData ? 
        JSON.stringify({
          id: userData.id,
          faceData: userData.faceData,
          // Only include necessary fields for debugging
        }, null, 2) : 'No user data found');
      
      if (!userData) {
        return { 
          registered: false, 
          message: 'User not found in database',
          details: 'User record could not be found in Firebase'
        };
      }
      
      if (!userData.faceData) {
        return { 
          registered: false, 
          message: 'No face data object found', 
          details: 'User record exists but does not have faceData object'
        };
      }
      
      if (!userData.faceData.faceRegistered) {
        return { 
          registered: false, 
          message: 'Face not registered according to faceData.faceRegistered flag', 
          details: 'faceData exists but faceRegistered is false'
        };
      }
      
      if (!userData.faceData.personId) {
        return { 
          registered: false, 
          message: 'Missing personId in face data', 
          details: 'faceData exists but personId is missing'
        };
      }
      
      // Step 2: Check if the subject exists in CompreFace
      try {
        const subjectsResponse = await this.listSubjects();
        console.log('CompreFace subjects:', subjectsResponse.subjects);
        
        if (!subjectsResponse.subjects.includes(userId)) {
          return { 
            registered: false, 
            message: 'User subject not found in CompreFace', 
            details: `Subject "${userId}" not found in CompreFace subjects list`
          };
        }
        
        // Step 3: Check if there are face examples for this subject
        const facesResponse = await recognitionService.get('/faces', {
          params: {
            subject: userId
          }
        });
        
        console.log('Face examples for subject:', userId, facesResponse.data?.faces?.length || 0);
        
        if (!facesResponse.data?.faces || facesResponse.data.faces.length === 0) {
          return { 
            registered: false, 
            message: 'No face examples found for user', 
            details: `Subject exists but has no face examples in CompreFace`
          };
        }
        
        // All checks passed, face is properly registered
        return {
          registered: true,
          message: 'Face is properly registered',
          details: {
            subjectId: userId,
            faceCount: facesResponse.data.faces.length,
            firstFaceId: facesResponse.data.faces[0].image_id
          }
        };
      } catch (error) {
        console.error('Error checking CompreFace registration:', error);
        return { 
          registered: false, 
          message: 'Error checking CompreFace registration', 
          details: error.message
        };
      }
    } catch (error) {
      console.error('Error in checkFaceRegistrationStatus:', error);
      return { 
        registered: false, 
        message: 'Error checking registration status', 
        details: error.message
      };
    }
  },

  // 1. Detect faces in an image - used before registration to ensure quality
  async detectFace(imageData) {
    console.log('Starting face detection...');
    try {
      // Convert image data to Blob
      const processedData = dataURItoBlob(imageData);
      console.log('Image converted to Blob successfully, size:', processedData.size, 'type:', processedData.type);
      
      // Create form data and append the file
      const formData = new FormData();
      formData.append('file', processedData, 'image.jpg');
      
      // Send detection request to CompreFace
      console.log('Sending detection request to CompreFace...');
      const response = await detectionService.post('/detect', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        params: {
          limit: 0,
          det_prob_threshold: 0.8
        }
      });
      
      console.log('Detection response received:', response.data);
      
      if (response.data && response.data.result) {
        return response.data.result.map(face => ({
          faceId: Date.now().toString(), // Generate a temporary ID
          confidence: face.probability,
          faceRectangle: {
            top: face.box.y_min,
            left: face.box.x_min,
            width: face.box.x_max - face.box.x_min,
            height: face.box.y_max - face.box.y_min
          }
        }));
      }
      return [];
    } catch (error) {
      console.error('Face detection error:', error.response?.data || error);
      throw error;
    }
  },

  // 2. Manage subjects in recognition collection
  async listSubjects() {
    try {
      console.log('Getting subjects list...');
      const response = await recognitionService.get('/subjects');
      return response.data;
    } catch (error) {
      console.error('Error listing subjects:', error.response?.data || error);
      throw error;
    }
  },

  async addSubject(subject) {
    try {
      console.log('Adding subject:', subject);
      const response = await recognitionService.post('/subjects', { subject });
      return response.data;
    } catch (error) {
      console.error('Error adding subject:', error.response?.data || error);
      throw error;
    }
  },

  // 3. Register a face for a user
  async registerFace(imageData, userId) {
    try {
      console.log('Starting face registration for user:', userId);
      
      // Step 1: Use detection service to ensure there's only one face in the image
      const detectedFaces = await this.detectFace(imageData);
      
      if (!detectedFaces || detectedFaces.length === 0) {
        throw new Error('No face detected in the image. Please try again with your face clearly visible.');
      }
      
      if (detectedFaces.length > 1) {
        throw new Error('Multiple faces detected. Please ensure only your face is in the frame.');
      }

      // Step 2: Check if the subject exists, create if not
      let subjectExists = false;
      try {
        const subjectsResponse = await this.listSubjects();
        subjectExists = subjectsResponse.subjects.includes(userId);
        
        if (!subjectExists) {
          console.log('Creating new subject:', userId);
          await this.addSubject(userId);
        } else {
          console.log('Subject already exists:', userId);
        }
      } catch (error) {
        console.warn('Error checking subjects, will try to create anyway:', error);
        try {
          await this.addSubject(userId);
        } catch (subjectError) {
          console.warn('Error creating subject, proceeding anyway:', subjectError);
        }
      }

      // Step 3: Convert image data to Blob
      const processedData = dataURItoBlob(imageData);
      
      // Create form data for recognition API
      const formData = new FormData();
      formData.append('file', processedData, 'face.jpg');

      // Step 4: Add the face to the recognition collection
      console.log('Adding face to recognition collection for subject:', userId);
      const response = await recognitionService.post('/faces', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        params: {
          subject: userId,
          det_prob_threshold: 0.8
        }
      });
      
      console.log('Face registration response:', response.data);
      
      if (!response.data || !response.data.image_id) {
        throw new Error('Face registration failed. No image_id returned.');
      }

      // Step 5: Save face data to user profile - ensure all fields match what Attendance.jsx expects
      const faceData = {
        faceId: response.data.image_id, // CompreFace image_id
        personId: userId, // This field is checked in Attendance.jsx
        faceRegistered: true,
        registeredAt: new Date().toISOString()
      };
      
      console.log('Updating user face data with:', faceData);
      
      // Save to Firebase
      await updateUserFaceData(userId, faceData);
      
      // Log the face data to help with debugging
      console.log('User face data updated successfully:', faceData);
      
      return {
        success: true,
        faceId: response.data.image_id,
        personId: userId,
        registeredAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Face registration error:', error.response?.data || error);
      throw error;
    }
  },

  // 4. Verify face according to CompreFace Postman documentation
  async verifyFace(imageData, userId) {
    try {
      // Anti-spoof: Rate limit verification attempts
      const now = Date.now();
      const lastAttempt = lastVerificationAttempts[userId] || 0;
      const timeSinceLastAttempt = now - lastAttempt;
      
      if (timeSinceLastAttempt < MIN_VERIFICATION_INTERVAL_MS) {
        console.warn(`Too many verification attempts. Please wait before trying again.`);
        throw new Error(`Please wait ${Math.ceil((MIN_VERIFICATION_INTERVAL_MS - timeSinceLastAttempt)/1000)} seconds before trying again.`);
      }
      
      lastVerificationAttempts[userId] = now;
      
      // Step 1: Get user's registered face data
      const userData = await getUserData(userId);
      console.log('User data retrieved for verification:', JSON.stringify(userData, null, 2));
      
      if (!userData) {
        throw new Error('User data not found. Please log in again.');
      }

      // Check if the user has face data registered
      if (!userData.faceData) {
        console.error('User has no faceData object in their profile');
        throw new Error('Face data not found. Please register your face first.');
      }
      
      if (!userData.faceData.faceRegistered) {
        console.error('User faceData.faceRegistered is false');
        throw new Error('Your face is not registered. Please register your face first.');
      }
      
      if (!userData.faceData.personId) {
        console.error('User faceData.personId is missing');
        throw new Error('Person ID not found. Please register your face again.');
      }

      console.log('Verifying face for user:', userId, 'with personId:', userData.faceData.personId);
      
      // Step 2: Convert image data to Blob
      const currentImageBlob = dataURItoBlob(imageData);
      console.log('Current image processed, size:', currentImageBlob.size);
      
      // According to CompreFace documentation, use the recognition service
      // Create form data for the recognition API
      const formData = new FormData();
      formData.append('file', currentImageBlob, 'current_face.jpg');
      
      // Use the recognition API with the subject parameter
      console.log('Sending recognition request to find matches for subject:', userId);
      const response = await recognitionService.post('/recognize', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        params: {
          limit: 1,
          det_prob_threshold: 0.8
        }
      });
      
      console.log('Recognition response:', JSON.stringify(response.data, null, 2));
      
      // Process results
      let isMatch = false;
      let similarity = 0;
      let matchSubjectId = null;
      
      // INCREASED THRESHOLD: Set to 0.975 (97.5%) for higher security
      const SIMILARITY_THRESHOLD = 0.975;
      
      if (response.data?.result?.length > 0 && response.data.result[0].subjects) {
        // Fixed handling of subjects array (not an object with keys)
        const subjects = response.data.result[0].subjects;
        
        // Check if subjects is an array or object and handle accordingly
        if (Array.isArray(subjects)) {
          console.log('Found subjects (array format):', subjects.map(s => s.subject));
          
          // Find the best matching subject in the array
          let bestMatch = null;
          let bestSimilarity = 0;
          
          for (const entry of subjects) {
            if (entry.similarity > bestSimilarity) {
              bestSimilarity = entry.similarity;
              bestMatch = entry.subject;
            }
          }
          
          if (bestMatch) {
            similarity = bestSimilarity;
            matchSubjectId = bestMatch;
            
            if (bestMatch === userId) {
              console.log(`Match found for user ${userId} with similarity ${similarity.toFixed(5)}`);
            } else {
              console.warn(`Subject mismatch: Expected ${userId} but found ${bestMatch}`);
            }
            
            // Apply INCREASED threshold for security (97.5%)
            isMatch = similarity >= SIMILARITY_THRESHOLD && bestMatch === userId;
            
            console.log(`Verification result: match=${isMatch}, similarity=${similarity.toFixed(5)}, threshold=${SIMILARITY_THRESHOLD}`);
          }
        } else {
          // Handle the original object format as before
          const subjectIds = Object.keys(subjects);
          console.log('Found subjects in recognition response (object format):', subjectIds);
          
          // Check if our user is in the recognized subjects
          if (subjects[userId]) {
            similarity = subjects[userId].similarity;
            matchSubjectId = userId;
            console.log(`Match found for user ${userId} with similarity ${similarity.toFixed(5)}`);
            
            // Apply INCREASED threshold for security (97.5%)
            isMatch = similarity >= SIMILARITY_THRESHOLD;
            
            console.log(`Verification result: match=${isMatch}, similarity=${similarity.toFixed(5)}, threshold=${SIMILARITY_THRESHOLD}`);
          } else {
            // Check if any subjects were found at all
            if (subjectIds.length > 0) {
              const bestMatch = subjectIds.reduce((best, current) => {
                return subjects[current].similarity > subjects[best].similarity ? current : best;
              }, subjectIds[0]);
              
              similarity = subjects[bestMatch].similarity;
              matchSubjectId = bestMatch;
              console.log(`Best match found for subject ${bestMatch} with similarity ${similarity.toFixed(5)}`);
              
              if (bestMatch !== userId) {
                console.warn(`Subject mismatch: Expected ${userId} but found ${bestMatch}`);
              }
            } else {
              console.log(`No subjects found in recognition response`);
            }
          }
        }
      } else {
        console.log('No face recognition results returned');
      }
      
      return {
        isIdentical: isMatch,
        confidence: similarity,
        personId: matchSubjectId || userId,
        verifiedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Face verification error:', error);
      // Extract useful information from error response
      if (error.response && error.response.data) {
        console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }
}; 