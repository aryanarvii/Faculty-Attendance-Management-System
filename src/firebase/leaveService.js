import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  addDoc,
  updateDoc,
  orderBy,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { db } from "./config";

// Apply for a leave
export const applyForLeave = async (leaveData) => {
  try {
    const leavesRef = collection(db, 'leaves');
    
    // Create leave document
    const docRef = await addDoc(leavesRef, {
      ...leaveData,
      status: 'pending', // pending, approved, rejected
      appliedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return { id: docRef.id };
  } catch (error) {
    console.error('Error applying for leave:', error);
    throw error;
  }
};

// Get leaves for a specific user
export const getUserLeaves = async (userId) => {
  try {
    const leavesRef = collection(db, 'leaves');
    // Remove orderBy until Firebase index is created
    const q = query(
      leavesRef,
      where('userId', '==', userId),
      orderBy('appliedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const leaves = [];
    
    querySnapshot.forEach((doc) => {
      leaves.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Sort locally instead of using orderBy
    leaves.sort((a, b) => {
      const dateA = a.appliedAt?.toDate ? a.appliedAt.toDate() : new Date(0);
      const dateB = b.appliedAt?.toDate ? b.appliedAt.toDate() : new Date(0);
      return dateB - dateA; // Descending (newest first)
    });
    
    return leaves;
  } catch (error) {
    console.error('Error getting user leaves:', error);
    throw error;
  }
};

// Update leave status (admin only)
export const updateLeaveStatus = async (leaveId, status, adminComment = '') => {
  try {
    const leaveRef = doc(db, 'leaves', leaveId);
    
    await updateDoc(leaveRef, {
      status,
      adminComment,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating leave status:', error);
    throw error;
  }
};

// Get all leaves (admin only)
export const getAllLeaves = async () => {
  try {
    const leavesRef = collection(db, 'leaves');
    // Remove orderBy until Firebase index is created
    const q = query(
      leavesRef,
      orderBy('appliedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const leaves = [];
    
    querySnapshot.forEach((doc) => {
      leaves.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Sort locally instead of using orderBy
    leaves.sort((a, b) => {
      const dateA = a.appliedAt?.toDate ? a.appliedAt.toDate() : new Date(0);
      const dateB = b.appliedAt?.toDate ? b.appliedAt.toDate() : new Date(0);
      return dateB - dateA; // Descending (newest first)
    });
    
    return leaves;
  } catch (error) {
    console.error('Error getting all leaves:', error);
    throw error;
  }
};

// Count total leave days between start and end date
export const calculateLeaveDays = (startDate, endDate, includedDates = []) => {
  // Convert to Date objects if they aren't already
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Initialize the count
  let count = 0;
  
  // Loop through each day from start to end
  for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    const dayOfWeek = day.getDay();
    const dateString = day.toISOString().split('T')[0];
    
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // If we have specific dates to include, check them
      if (includedDates.length === 0 || includedDates.includes(dateString)) {
        count++;
      }
    }
  }
  
  return count;
};

// Check if a date falls within any approved leave period for a user
export const isDateOnLeave = async (userId, date) => {
  try {
    const dateObj = new Date(date);
    const leaves = await getUserLeaves(userId);
    
    // Only consider approved leaves
    const approvedLeaves = leaves.filter(leave => leave.status === 'approved');
    
    for (const leave of approvedLeaves) {
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      
      if (dateObj >= startDate && dateObj <= endDate) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking if date is on leave:', error);
    return false;
  }
};

// Get all approved leaves for a date range
export const getUserLeavesInDateRange = async (userId, startDate, endDate) => {
  try {
    const leaves = await getUserLeaves(userId);
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Filter leaves that overlap with the date range and are approved
    return leaves.filter(leave => {
      if (leave.status !== 'approved') return false;
      
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);
      
      // Check if the leave period overlaps with the requested date range
      return (leaveStart <= end && leaveEnd >= start);
    });
  } catch (error) {
    console.error('Error getting user leaves in date range:', error);
    return [];
  }
};

// Get leave stats for a user in a date range
export const getUserLeaveStats = async (userId, startDate, endDate) => {
  try {
    const leaves = await getUserLeavesInDateRange(userId, startDate, endDate);
    
    // Initialize stats
    const stats = {
      total: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
      daysOnLeave: 0
    };
    
    // Count leaves by status
    leaves.forEach(leave => {
      stats.total++;
      stats[leave.status]++;
      
      // Calculate days on leave for approved leaves
      if (leave.status === 'approved') {
        const leaveStart = new Date(Math.max(new Date(leave.startDate), new Date(startDate)));
        const leaveEnd = new Date(Math.min(new Date(leave.endDate), new Date(endDate)));
        
        stats.daysOnLeave += calculateLeaveDays(leaveStart, leaveEnd);
      }
    });
    
    return stats;
  } catch (error) {
    console.error('Error getting user leave stats:', error);
    return {
      total: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
      daysOnLeave: 0
    };
  }
}; 