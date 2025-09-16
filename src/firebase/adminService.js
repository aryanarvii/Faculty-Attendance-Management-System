import { 
  collection,
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  setDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  Timestamp,
  addDoc,
  deleteDoc
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "./config";
import { saveUserData } from "./userService";

// Check if user is an admin
export const isAdmin = async (userId) => {
  try {
    const userRef = doc(db, 'teachers', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      return userData.isAdmin === true;
    }
    return false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    throw error;
  }
};

// Fetch all users
export const getAllUsers = async () => {
  try {
    const usersRef = collection(db, 'teachers');
    const querySnapshot = await getDocs(usersRef);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

// Get attendance data for all users within a date range
export const getAllUsersAttendance = async (startDate, endDate) => {
  try {
    // Get all users
    const users = await getAllUsers();

    // Create date range array
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateRange = [];
    let currentDate = new Date(start);

    while (currentDate <= end) {
      dateRange.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Fetch attendance records for all users
    const attendanceData = [];
    const usersMap = {};

    // Create a map of users for quick lookup
    users.forEach(user => {
      usersMap[user.id] = user;
    });

    // Fetch attendance records for each date
    for (const date of dateRange) {
      const attendanceRef = collection(db, 'attendance');
      const q = query(attendanceRef, where('date', '==', date));
      const querySnapshot = await getDocs(q);
      
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const userId = data.userId;
        
        if (userId && usersMap[userId]) {
          attendanceData.push({
            id: doc.id,
            name: `${usersMap[userId].firstName || ''} ${usersMap[userId].lastName || ''}`,
            employeeId: usersMap[userId].employeeId || 'Unknown',
            department: usersMap[userId].department || 'Unknown',
            ...data
          });
        }
      });
    }

    return attendanceData;
  } catch (error) {
    console.error('Error fetching all users attendance:', error);
    throw error;
  }
};

// Create a new employee account (admin only)
export const createEmployee = async (employeeData) => {
  try {
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      employeeData.email,
      employeeData.password
    );
    
    const user = userCredential.user;
    
    // Save user data to Firestore
    await saveUserData(user.uid, {
      ...employeeData,
      isAdmin: false,
      createdAt: new Date().toISOString(),
      faceRegistered: false
    });
    
    return { userId: user.uid };
  } catch (error) {
    console.error('Error creating employee:', error);
    throw error;
  }
};

// Send a warning to a user for poor attendance
export const sendAttendanceWarning = async (userId, warningData) => {
  try {
    const userRef = doc(db, 'teachers', userId);
    
    // Check if warnings array exists, if not create it
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userSnap.data();
    
    // Add the warning to the user's document
    await updateDoc(userRef, {
      warnings: arrayUnion({
        ...warningData,
        timestamp: Timestamp.now(),
        read: false
      })
    });
    
    return true;
  } catch (error) {
    console.error('Error sending warning:', error);
    throw error;
  }
};

// Get user attendance statistics
export const getUserAttendanceStats = async (userId, startDate, endDate) => {
  try {
    // Create date range array
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateRange = [];
    let currentDate = new Date(start);

    while (currentDate <= end) {
      dateRange.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const stats = {
      total: dateRange.length,
      present: 0,
      absent: 0,
      late: 0,
      earlyCheckout: 0,
      dates: []
    };

    // For each date, check if there's an attendance record
    for (const date of dateRange) {
      const attendanceId = `${userId}_${date}`;
      const attendanceRef = doc(db, 'attendance', attendanceId);
      const attendanceSnap = await getDoc(attendanceRef);
      
      const attendanceData = attendanceSnap.exists() 
        ? { id: attendanceSnap.id, ...attendanceSnap.data() } 
        : null;
      
      // If attendance record exists and has check-in
      if (attendanceData && attendanceData.checkIn) {
        stats.present++;
        
        // Check if late
        if (attendanceData.checkIn.isLate) {
          stats.late++;
        }
        
        // Check if early checkout
        if (attendanceData.checkOut && attendanceData.checkOut.isEarly) {
          stats.earlyCheckout++;
        }
        
        stats.dates.push({
          date,
          status: 'present',
          isLate: attendanceData.checkIn.isLate || false,
          isEarlyCheckout: attendanceData.checkOut?.isEarly || false
        });
      } else {
        stats.absent++;
        stats.dates.push({
          date,
          status: 'absent'
        });
      }
    }
    
    return stats;
  } catch (error) {
    console.error('Error getting user attendance stats:', error);
    throw error;
  }
};

// Holiday Management Functions
export const addHoliday = async (holidayData) => {
  try {
    const holidaysRef = collection(db, 'holidays');
    const docRef = await addDoc(holidaysRef, {
      ...holidayData,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser.uid
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding holiday:', error);
    throw error;
  }
};

export const getHolidays = async () => {
  try {
    const holidaysRef = collection(db, 'holidays');
    const q = query(holidaysRef, orderBy('startDate', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting holidays:', error);
    throw error;
  }
};

export const deleteHoliday = async (holidayId) => {
  try {
    const holidayRef = doc(db, 'holidays', holidayId);
    await deleteDoc(holidayRef);
  } catch (error) {
    console.error('Error deleting holiday:', error);
    throw error;
  }
};

export const isHoliday = async (date) => {
  try {
    const holidaysRef = collection(db, 'holidays');
    const q = query(
      holidaysRef,
      where('startDate', '<=', date),
      where('endDate', '>=', date)
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking holiday:', error);
    throw error;
  }
}; 