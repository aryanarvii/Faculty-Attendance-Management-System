// Make Admin Script
// Run this script to make an existing user an admin
// Usage: node make-admin.js <email>

import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function makeAdmin(email) {
  try {
    // Find user by email
    const usersRef = collection(db, 'teachers');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.error(`No user found with email ${email}`);
      return false;
    }
    
    // Get the first matching user
    const userDoc = querySnapshot.docs[0];
    const userId = userDoc.id;
    
    // Update user to be admin
    await updateDoc(doc(db, 'teachers', userId), {
      isAdmin: true
    });
    
    console.log(`User ${email} (${userId}) has been made an admin!`);
    return true;
  } catch (error) {
    console.error('Error making user admin:', error);
    return false;
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.error('Please provide an email address');
  console.log('Usage: node make-admin.js <email>');
  process.exit(1);
}

makeAdmin(email)
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  }); 