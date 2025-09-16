// Make Admin Script
// Run this script to make an existing user an admin
// Usage: node make-admin.js <email>

import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

// Your Firebase configuration
const firebaseConfig = {
  // Replace with your Firebase config
  apiKey: "AIzaSyDGbuBBu1Wv8be042nUfEcplkq155GSfQw",
  authDomain: "attendance-management-sys-v3.firebaseapp.com",
  projectId: "attendance-management-sys-v3",
  storageBucket: "attendance-management-sys-v3.firebasestorage.app",
  messagingSenderId: "671874097342",
  appId: "1:671874097342:web:9dab4e4ca3380eddd5beef",
  measurementId: "G-XB3FCWD5Z6"
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