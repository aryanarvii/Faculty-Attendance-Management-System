/**
 * Format a date to YYYY-MM-DD string format
 * @param {Date} date - Date object to format
 * @returns {string} Formatted date string in YYYY-MM-DD format
 */
export const getFormattedDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format a time to 12-hour format (e.g., 9:30 AM)
 * @param {string} timeString - ISO date string
 * @returns {string} Formatted time string
 */
export const formatTime = (timeString) => {
  if (!timeString) return '';
  
  try {
    const date = new Date(timeString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    console.error('Error formatting time:', e);
    return timeString;
  }
};

/**
 * Format a date to a human-readable format (e.g., January 1, 2023)
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {string} Human-readable date
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  
  try {
    const [year, month, day] = dateString.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch (e) {
    console.error('Error formatting date:', e);
    return dateString;
  }
};

/**
 * Get time difference in minutes between two dates
 * @param {string} start - Start time ISO string
 * @param {string} end - End time ISO string
 * @returns {number} Difference in minutes
 */
export const getTimeDifferenceInMinutes = (start, end) => {
  if (!start || !end) return 0;
  
  try {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.round((endDate - startDate) / (1000 * 60));
  } catch (e) {
    console.error('Error calculating time difference:', e);
    return 0;
  }
}; 