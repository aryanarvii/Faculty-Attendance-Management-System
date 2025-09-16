import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './config';

// Save user data to Firestore
export const saveUserData = async (userId, userData) => {
  try {
    await setDoc(doc(db, 'teachers', userId), {
      ...userData,
      faceRegistered: false, // Track face registration status
      faceData: {
        faceId: null, // CompreFace Face ID
        personId: null, // CompreFace Subject ID
        registeredAt: null,
        verificationFaceId: null, // CompreFace Verification Face ID
        faceRegistered: false
      },
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving user data:', error);
    throw error;
  }
};

// Update user's face data
export const updateUserFaceData = async (userId, faceData) => {
  try {
    const userDocRef = doc(db, 'teachers', userId);
    
    // Define face data fields
    const faceDataUpdate = {
      faceRegistered: faceData.faceRegistered || false,
      faceId: faceData.faceId || null, // CompreFace Face ID
      personId: faceData.personId || null, // CompreFace Subject ID
      registeredAt: faceData.registeredAt || null,
      verificationFaceId: faceData.verificationFaceId || null // CompreFace Verification Face ID
    };
    
    // Update the user document with face data
    await updateDoc(userDocRef, {
      faceData: faceDataUpdate,
      updatedAt: serverTimestamp()
    });
    
    console.log('Face data updated successfully');
    return faceDataUpdate;
  } catch (error) {
    console.error('Error updating face data:', error);
    throw error;
  }
};

// Get user data from Firestore
export const getUserData = async (userId) => {
  try {
    const userRef = doc(db, 'teachers', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = { id: userSnap.id, ...userSnap.data() };
      
      // Handle legacy face data format (support migration)
      if (!userData.faceData && userData.faceRegistered) {
        // Convert legacy format to new format
        userData.faceData = {
          faceRegistered: userData.faceRegistered || false,
          faceId: userData.faceId || null,
          personId: userData.personId || null,
          registeredAt: userData.lastFaceUpdate || null
        };
      }
      
      return userData;
    }
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    throw error;
  }
};

// Update user data
export const updateUserData = async (userId, updateData) => {
  try {
    const userRef = doc(db, 'teachers', userId);
    await updateDoc(userRef, {
      ...updateData,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Error updating user data:', error);
    throw error;
  }
};

// Get user by email
export const getUserByEmail = async (email) => {
  try {
    const usersRef = collection(db, 'teachers');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  }
};

// Get all users
export const getAllUsers = async () => {
  try {
    const usersRef = collection(db, 'teachers');
    const querySnapshot = await getDocs(usersRef);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
};