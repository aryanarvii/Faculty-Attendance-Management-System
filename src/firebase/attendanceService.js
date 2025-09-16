import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  Timestamp,
  orderBy
} from "firebase/firestore";
import { db } from "./config";
// import { biometricService } from './biometricService';
import { getFormattedDate } from '../utils/dateUtils';
import { faceService } from './faceService';

// Format date to YYYY-MM-DD for consistent querying
const formatDate = (date) => {
  const d = date || new Date();
  return d.toISOString().split('T')[0];
};

// Function to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

/**
 * Check in a user
 * @param {string} userId - User ID
 * @param {Object} verificationData - Verification data including face API results
 * @param {boolean} isLate - Whether this is a late check-in
 */
export const checkIn = async (userId, verificationData = null, isLate = false) => {
  try {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    
    const attendanceId = `${userId}_${formattedDate}`;
    console.log('Checking in with ID:', attendanceId);
    
    const attendanceRef = doc(db, 'attendance', attendanceId);
    
    // Check if already checked in
    const attendanceDoc = await getDoc(attendanceRef);
    if (attendanceDoc.exists() && attendanceDoc.data().checkIn) {
      console.log('Already checked in:', attendanceDoc.data());
      return attendanceDoc.data();
    }
    
    // Create a proper timestamp for the check-in
    const checkInTime = new Date().toISOString();
    
    const checkInData = {
      userId,
      date: formattedDate,
      checkIn: {
        time: checkInTime,
        isLate,
        verificationMethod: verificationData?.method || 'unknown',
        verified: verificationData?.verified || false,
        confidence: verificationData?.confidence || null,
        device: verificationData?.device || navigator.userAgent
      },
      updatedAt: checkInTime
    };
    
    console.log('Setting check-in data:', checkInData);
    await setDoc(attendanceRef, checkInData, { merge: true });
    
    // Double-check that data was written correctly
    const updatedDoc = await getDoc(attendanceRef);
    const data = updatedDoc.data();
    console.log('After check-in, data is:', data);
    
    return data;
  } catch (error) {
    console.error('Error checking in:', error);
    throw error;
  }
};

/**
 * Check out a user
 * @param {string} userId - User ID
 * @param {Object} verificationData - Verification data including face API results
 * @param {boolean} isEarly - Whether this is an early check-out
 */
export const checkOut = async (userId, verificationData = null, isEarly = false) => {
  try {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    
    const attendanceId = `${userId}_${formattedDate}`;
    console.log('Checking out with ID:', attendanceId);
    
    const attendanceRef = doc(db, 'attendance', attendanceId);
    
    // Check if already checked in
    const attendanceDoc = await getDoc(attendanceRef);
    if (!attendanceDoc.exists() || !attendanceDoc.data().checkIn) {
      throw new Error('You must check in before checking out');
    }
    
    // Check if already checked out
    if (attendanceDoc.exists() && attendanceDoc.data().checkOut) {
      console.log('Already checked out:', attendanceDoc.data());
      return attendanceDoc.data();
    }
    
    // Create a proper timestamp for the check-out
    const checkOutTime = new Date().toISOString();
    
    // Calculate duration in minutes if possible
    let durationMinutes = null;
    const existingData = attendanceDoc.data();
    if (existingData && existingData.checkIn && existingData.checkIn.time) {
      try {
        const checkInDate = new Date(existingData.checkIn.time);
        const checkOutDate = new Date(checkOutTime);
        durationMinutes = Math.round((checkOutDate - checkInDate) / (1000 * 60));
      } catch (e) {
        console.error('Error calculating duration:', e);
      }
    }
    
    const checkOutData = {
      checkOut: {
        time: checkOutTime,
        isEarly,
        verificationMethod: verificationData?.method || 'unknown',
        verified: verificationData?.verified || false,
        confidence: verificationData?.confidence || null,
        device: verificationData?.device || navigator.userAgent
      },
      updatedAt: checkOutTime,
    };
    
    // Add duration if calculated
    if (durationMinutes !== null) {
      checkOutData.durationMinutes = durationMinutes;
    }
    
    console.log('Setting check-out data:', checkOutData);
    await setDoc(attendanceRef, checkOutData, { merge: true });
    
    // Get the updated attendance record
    const updatedDoc = await getDoc(attendanceRef);
    const data = updatedDoc.data();
    console.log('After check-out, data is:', data);
    
    return data;
  } catch (error) {
    console.error('Error checking out:', error);
    throw error;
  }
};

/**
 * Get today's attendance record for a user
 * @param {string} userId - User ID
 */
export const getTodayAttendance = async (userId) => {
  try {
    console.log(`Fetching today's attendance for user ${userId}`);
    const today = new Date().toISOString().split('T')[0];
    const attendanceId = `${userId}_${today}`;
    
    console.log('Looking for attendance record with ID:', attendanceId);
    
    // Create a reference to the specific attendance document for today
    const attendanceRef = doc(db, 'attendance', attendanceId);
    const attendanceDoc = await getDoc(attendanceRef);
    
    if (attendanceDoc.exists()) {
      const data = attendanceDoc.data();
      console.log('Attendance document found:', data);
      
      // Ensure all required fields are present
      const result = { 
        id: attendanceDoc.id,
        userId,
        date: today,
        ...data
      };
      
      // Make sure checkIn exists if it should
      if (data.checkIn) {
        // Ensure time is set
        if (!data.checkIn.time) {
          result.checkIn.time = new Date().toISOString();
        }
        
        // Validate time format
        try {
          new Date(data.checkIn.time);
        } catch (e) {
          result.checkIn.time = new Date().toISOString();
        }
      }
      
      // Make sure checkOut exists if it should
      if (data.checkOut) {
        // Ensure time is set
        if (!data.checkOut.time) {
          result.checkOut.time = new Date().toISOString();
        }
        
        // Validate time format
        try {
          new Date(data.checkOut.time);
        } catch (e) {
          result.checkOut.time = new Date().toISOString();
        }
      }
      
      return result;
    } else {
      console.log('No attendance record found for today');
      return null;
    }
  } catch (error) {
    console.error('Error getting today attendance:', error);
    throw error;
  }
};

/**
 * Get attendance history for a user
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of records to return
 */
export const getAttendanceHistory = async (userId, limit = 30) => {
  try {
    console.log(`Fetching attendance history for user ${userId}, limit: ${limit}`);
    
    const attendanceRef = collection(db, 'attendance');
    
    // Create the query with userId filter
    const q = query(
      attendanceRef,
      where('userId', '==', userId)
    );
    
    console.log('Executing attendance history query...');
    const querySnapshot = await getDocs(q);
    console.log(`Query returned ${querySnapshot.size} documents`);
    
    const attendanceHistory = [];
    
    // Process each document
    querySnapshot.forEach((doc) => {
      try {
        const id = doc.id;
        const data = doc.data();
        
        // Ensure we have all required fields with defaults if missing
        const record = {
          id,
          userId: data.userId || userId,
          date: data.date || id.split('_')[1] || 'Unknown date',
          checkIn: data.checkIn || null,
          checkOut: data.checkOut || null,
          updatedAt: data.updatedAt || new Date().toISOString(),
          ...data
        };
        
        console.log(`Processing history record ${id}:`, record);
        attendanceHistory.push(record);
      } catch (e) {
        console.error('Error processing attendance record:', e);
      }
    });
    
    // Add logging to track sorting process
    console.log('Sorting attendance records...');
    try {
      // Sort by date, newest first
      attendanceHistory.sort((a, b) => {
        // Try to parse dates for comparison
        const dateA = a.date ? new Date(a.date) : new Date(0);
        const dateB = b.date ? new Date(b.date) : new Date(0);
        
        // If dates are valid, compare them
        if (!isNaN(dateA) && !isNaN(dateB)) {
          return dateB - dateA;
        }
        
        // Fallback to string comparison if dates are invalid
        return String(b.date).localeCompare(String(a.date));
      });
      console.log('Sort completed successfully');
    } catch (e) {
      console.error('Error sorting attendance records:', e);
    }
    
    // Limit the number of records returned
    const limitedHistory = attendanceHistory.slice(0, limit);
    console.log(`Returning ${limitedHistory.length} attendance records`);
    
    return limitedHistory;
  } catch (error) {
    console.error('Error getting attendance history:', error);
    throw error;
  }
};

// Get attendance statistics
export const getAttendanceStats = async (userId, startDate, endDate) => {
  try {
    const records = await getAttendanceHistory(userId, startDate, endDate);
    
    const stats = {
      present: 0,
      halfDay: 0,
      absent: 0,
      late: 0,
      earlyCheckout: 0,
      total: 0
    };
    
    // Calculate working days in the period
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Count working days (excluding weekends)
    let totalWorkingDays = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) { // Skip Saturday and Sunday
        totalWorkingDays++;
      }
    }
    
    stats.total = totalWorkingDays;
    
    // Process attendance records
    records.forEach(record => {
      if (record.status === "present") {
        stats.present++;
      } else if (record.status === "half-day") {
        stats.halfDay++;
      }
      
      if (record.isLate) {
        stats.late++;
      }
      
      if (record.isEarlyCheckout) {
        stats.earlyCheckout++;
      }
    });
    
    // Calculate absences
    stats.absent = totalWorkingDays - stats.present - stats.halfDay;
    if (stats.absent < 0) stats.absent = 0;
    
    return stats;
  } catch (error) {
    throw error;
  }
};

/**
 * Get attendance history with date range filtering for attendance reports
 * @param {string} userId - User ID
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 */
export const getAttendanceReport = async (userId, startDate, endDate) => {
  try {
    console.log(`Fetching attendance report for user ${userId} from ${startDate} to ${endDate}`);
    
    // Get all attendance records for the user
    const attendanceRef = collection(db, 'attendance');
    const q = query(
      attendanceRef,
      where('userId', '==', userId)
    );
    
    console.log('Executing attendance report query...');
    const querySnapshot = await getDocs(q);
    console.log(`Query returned ${querySnapshot.size} documents for report`);
    
    const allRecords = [];
    
    // Process each document
    querySnapshot.forEach((doc) => {
      try {
        const id = doc.id;
        const data = doc.data();
        
        // Extract date from document ID if not present in data
        let recordDate = data.date;
        if (!recordDate && id.includes('_')) {
          recordDate = id.split('_')[1];
        }
        
        // Ensure we have all required fields with defaults if missing
        const record = {
          id,
          userId: data.userId || userId,
          date: recordDate || 'Unknown date',
          checkIn: data.checkIn || null,
          checkOut: data.checkOut || null,
          updatedAt: data.updatedAt || new Date().toISOString(),
          ...data
        };
        
        allRecords.push(record);
      } catch (e) {
        console.error('Error processing attendance record:', e);
      }
    });
    
    // Filter by date range if provided
    let filteredRecords = allRecords;
    
    if (startDate && endDate) {
      console.log(`Filtering records between ${startDate} and ${endDate}`);
      
      // Convert to Date objects for comparison
      const startDateTime = new Date(startDate);
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999); // Include the entire end day
      
      filteredRecords = allRecords.filter(record => {
        try {
          // Handle different date formats
          let recordDate;
          if (typeof record.date === 'string') {
            if (record.date.includes('T')) {
              // ISO format (with time)
              recordDate = new Date(record.date);
            } else if (record.date.includes('-')) {
              // YYYY-MM-DD format
              recordDate = new Date(record.date);
            } else {
              // Try to parse as is
              recordDate = new Date(record.date);
            }
          } else {
            // Already a Date or timestamp
            recordDate = new Date(record.date);
          }
          
          return !isNaN(recordDate) && 
                 recordDate >= startDateTime && 
                 recordDate <= endDateTime;
        } catch (e) {
          console.error('Error filtering record by date:', e, record);
          return false;
        }
      });
      
      console.log(`Filtered to ${filteredRecords.length} records within date range`);
    }
    
    // Sort by date
    filteredRecords.sort((a, b) => {
      try {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA; // newest first
      } catch (e) {
        return 0;
      }
    });
    
    // Calculate working days in the period
    const start = new Date(startDate);
    const end = new Date(endDate);
    let totalWorkingDays = 0;
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) { // Skip Saturday and Sunday
        totalWorkingDays++;
      }
    }
    
    // Calculate stats
    const stats = {
      total: totalWorkingDays,
      present: 0,
      absent: 0,
      late: 0,
      early: 0
    };
    
    // Create a map of dates to track attendance
    const attendanceMap = new Map();
    
    // Initialize the map with all working days marked as absent
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) { // Skip weekends
        const dateStr = d.toISOString().split('T')[0];
        attendanceMap.set(dateStr, { present: false, late: false, early: false });
      }
    }
    
    // Process attendance records
    filteredRecords.forEach(record => {
      const dateStr = record.date.split('T')[0];
      if (attendanceMap.has(dateStr)) {
        const dayStatus = attendanceMap.get(dateStr);
        
        if (record.checkIn && record.checkOut) {
          dayStatus.present = true;
          stats.present++;
          
          if (record.checkIn.isLate) {
            dayStatus.late = true;
            stats.late++;
          }
          
          if (record.checkOut.isEarly) {
            dayStatus.early = true;
            stats.early++;
          }
        }
        
        attendanceMap.set(dateStr, dayStatus);
      }
    });
    
    // Calculate absences
    attendanceMap.forEach((status) => {
      if (!status.present) {
        stats.absent++;
      }
    });
    
    console.log('Calculated stats:', stats);
    
    return {
      records: filteredRecords,
      stats
    };
  } catch (error) {
    console.error('Error getting attendance report:', error);
    throw error;
  }
};

class AttendanceService {
  constructor() {
    this.collectionName = 'attendance';
  }

  // Check if the user can check in based on office hours
  canCheckIn(officeHours) {
    try {
      if (!officeHours) return { canCheckIn: true, status: 'on-time' };
      
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTime = currentHour * 60 + currentMinutes;
      
      // Parse check-in time (format: HH:MM)
      const [checkInHour, checkInMinute] = officeHours.checkIn.split(':').map(Number);
      const checkInTime = checkInHour * 60 + checkInMinute;
      
      // Calculate time difference in minutes
      const diffMinutes = currentTime - checkInTime;
      
      let status = 'on-time';
      if (diffMinutes > 15) {
        status = 'late';
      } else if (diffMinutes < -15) {
        status = 'early';
      }
      
      return { canCheckIn: true, status };
    } catch (error) {
      console.error('Error checking if user can check in:', error);
      return { canCheckIn: true, status: 'on-time' };
    }
  }

  // Check if the user can check out based on office hours
  canCheckOut(officeHours, checkInTime) {
    try {
      if (!officeHours) return { canCheckOut: true, status: 'on-time' };
      if (!checkInTime) return { canCheckOut: false, status: 'not-checked-in' };
      
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTime = currentHour * 60 + currentMinutes;
      
      // Parse check-out time (format: HH:MM)
      const [checkOutHour, checkOutMinute] = officeHours.checkOut.split(':').map(Number);
      const checkOutTime = checkOutHour * 60 + checkOutMinute;
      
      // Calculate time difference in minutes
      const diffMinutes = currentTime - checkOutTime;
      
      let status = 'on-time';
      if (diffMinutes > 15) {
        status = 'late';
      } else if (diffMinutes < -15) {
        status = 'early';
      }
      
      return { canCheckOut: true, status };
    } catch (error) {
      console.error('Error checking if user can check out:', error);
      return { canCheckOut: true, status: 'on-time' };
    }
  }

  // Record check-in
  async checkIn(userId, imageData) {
    try {
      console.log(`Processing check-in for user ${userId}`);
      
      // Verify user's face
      const verificationResult = await faceService.verifyFace(userId, imageData);
      
      if (!verificationResult.isMatch) {
        throw new Error('Face verification failed. Please try again.');
      }
      
      const today = getFormattedDate(new Date());
      const now = new Date();
      
      // Check if already checked in
      const existingAttendance = await this.getTodayAttendance(userId);
      
      if (existingAttendance && existingAttendance.checkInTime) {
        console.log('User already checked in today:', existingAttendance);
        return existingAttendance;
      }
      
      // Get user's office hours
      const userRef = doc(db, 'teachers', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      const officeHours = userData.officeHours;
      
      // Check if user can check in
      const checkInResult = this.canCheckIn(officeHours);
      
      // Create or update attendance record
      const attendanceRef = doc(db, this.collectionName, `${userId}_${today}`);
      const attendanceData = {
        userId,
        date: today,
        checkInTime: now.toISOString(),
        checkInStatus: checkInResult.status,
        verificationScore: verificationResult.similarity || 0,
        updatedAt: now.toISOString()
      };
      
      await setDoc(attendanceRef, attendanceData, { merge: true });
      console.log('Check-in recorded successfully:', attendanceData);
      
      return { id: attendanceRef.id, ...attendanceData };
    } catch (error) {
      console.error('Error checking in:', error);
      throw error;
    }
  }

  // Record check-out
  async checkOut(userId, imageData) {
    try {
      console.log(`Processing check-out for user ${userId}`);
      
      // Verify user's face
      const verificationResult = await faceService.verifyFace(userId, imageData);
      
      if (!verificationResult.isMatch) {
        throw new Error('Face verification failed. Please try again.');
      }
      
      const today = getFormattedDate(new Date());
      const now = new Date();
      
      // Check if already checked in
      const existingAttendance = await this.getTodayAttendance(userId);
      
      if (!existingAttendance || !existingAttendance.checkInTime) {
        throw new Error('You must check in before checking out');
      }
      
      if (existingAttendance.checkOutTime) {
        console.log('User already checked out today:', existingAttendance);
        return existingAttendance;
      }
      
      // Get user's office hours
      const userRef = doc(db, 'teachers', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      const officeHours = userData.officeHours;
      
      // Check if user can check out
      const checkInTime = existingAttendance.checkInTime;
      const checkOutResult = this.canCheckOut(officeHours, checkInTime);
      
      if (!checkOutResult.canCheckOut) {
        throw new Error('Cannot check out: ' + checkOutResult.status);
      }
      
      // Parse check-in time
      let checkInDate;
      try {
        checkInDate = new Date(checkInTime);
      } catch (e) {
        console.warn('Invalid check-in time format, using current time');
        checkInDate = new Date();
      }
      
      // Calculate duration in minutes
      const durationMinutes = Math.round((now - checkInDate) / (1000 * 60));
      
      // Update attendance record
      const attendanceRef = doc(db, this.collectionName, `${userId}_${today}`);
      const attendanceData = {
        checkOutTime: now.toISOString(),
        checkOutStatus: checkOutResult.status,
        durationMinutes,
        updatedAt: now.toISOString()
      };
      
      await updateDoc(attendanceRef, attendanceData);
      console.log('Check-out recorded successfully');
      
      // Get the updated attendance record
      const updatedDoc = await getDoc(attendanceRef);
      const updatedData = updatedDoc.data();
      
      return { id: updatedDoc.id, ...updatedData };
    } catch (error) {
      console.error('Error checking out:', error);
      throw error;
    }
  }

  // Get attendance history for a user
  async getAttendanceHistory(userId, limit = 30) {
    try {
      console.log(`Fetching attendance history for user ${userId}`);
      const attendanceRef = collection(db, this.collectionName);
      const q = query(
        attendanceRef,
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const attendanceList = [];
      
      querySnapshot.forEach((doc) => {
        attendanceList.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort by date (newest first)
      attendanceList.sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
      });
      
      console.log(`Found ${attendanceList.length} attendance records`);
      return attendanceList.slice(0, limit);
    } catch (error) {
      console.error('Error getting attendance history:', error);
      throw error;
    }
  }
}

export const attendanceService = new AttendanceService(); 