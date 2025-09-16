import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "./config";

// Register a new teacher
export const registerTeacher = async (email, password, name, department) => {
  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile with name
    await updateProfile(user, { displayName: name });
    
    // Create user document in Firestore
    await setDoc(doc(db, "teachers", user.uid), {
      name,
      email,
      department,
      role: "teacher",
      createdAt: serverTimestamp(),
      faceDescriptor: null // Will be updated when face is registered
    });
    
    return user;
  } catch (error) {
    throw error;
  }
};

// Login
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

// Logout
export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
};

// Get current user data including Firestore data
export const getCurrentUserData = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  
  try {
    const docRef = doc(db, "teachers", user.uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { uid: user.uid, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  }
};

// Auth state observer
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

export const registerUser = async (userData) => {
  try {
    const { email, password, name, department, employeeId } = userData;
    
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create user document in Firestore
    await setDoc(doc(db, 'teachers', userCredential.user.uid), {
      name,
      email,
      department,
      employeeId,
      role: 'teacher',
      createdAt: new Date().toISOString(),
      faceRegistered: false
    });
    
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

export const updateUserFaceData = async (userId, faceDescriptor) => {
  try {
    const userRef = doc(db, 'teachers', userId);
    await updateDoc(userRef, {
      faceDescriptor,
      faceRegistered: true,
      faceRegisteredAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    throw error;
  }
};

export const getUserData = async (userId) => {
  try {
    const userRef = doc(db, 'teachers', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() };
    }
    return null;
  } catch (error) {
    throw error;
  }
}; 