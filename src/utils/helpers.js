/**
 * Utility functions for the Attendance Management System
 */

/**
 * Calculate attendance percentage based on present days and total days
 * @param {number} present - Number of days present
 * @param {number} total - Total number of days
 * @returns {number} - Percentage rounded to nearest integer
 */
export const calculateAttendancePercentage = async (attendanceRecords) => {
  try {
    const stats = {
      present: 0,
      absent: 0,
      late: 0,
      total: 0
    };

    for (const record of attendanceRecords) {
      const date = new Date(record.date.seconds * 1000);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = await isHoliday(date);

      // Skip weekends and holidays
      if (isWeekend || isHoliday) {
        continue;
      }

      stats.total++;

      if (record.checkIn) {
        const checkInTime = new Date(record.checkIn.seconds * 1000);
        const isLate = checkInTime.getHours() >= 9 && checkInTime.getMinutes() > 0;
        
        if (isLate) {
          stats.late++;
        } else {
          stats.present++;
        }
      } else {
        stats.absent++;
      }
    }

    const percentage = stats.total > 0 ? ((stats.present + stats.late) / stats.total) * 100 : 0;
    return {
      percentage: Math.round(percentage * 100) / 100,
      stats
    };
  } catch (error) {
    console.error('Error calculating attendance percentage:', error);
    throw error;
  }
};

/**
 * Format attendance percentage with color class based on percentage
 * @param {number} percentage - Attendance percentage
 * @returns {object} - Object with class and color information
 */
export const getAttendanceStatusClass = (percentage) => {
  if (percentage >= 90) {
    return {
      statusClass: 'bg-green-100 text-green-800',
      colorClass: 'bg-green-500',
      status: 'Excellent'
    };
  } else if (percentage >= 75) {
    return {
      statusClass: 'bg-yellow-100 text-yellow-800',
      colorClass: 'bg-yellow-500',
      status: 'Good'
    };
  } else {
    return {
      statusClass: 'bg-red-100 text-red-800',
      colorClass: 'bg-red-500',
      status: 'Poor'
    };
  }
}; 