/**
 * Utility functions for location and network verification
 */

// Campus boundaries (example coordinates - replace with actual campus coordinates)
const CAMPUS_BOUNDARIES = {
  latitude: {
    min: 37.7749, // Example: south boundary
    max: 37.7849  // Example: north boundary
  },
  longitude: {
    min: -122.4194, // Example: west boundary
    max: -122.4094  // Example: east boundary
  }
};

// Campus WiFi SSIDs (replace with actual campus WiFi network names)
const CAMPUS_WIFI_SSIDS = [
  'Campus-WiFi',
  'Campus-Secure',
  'AMS-Network',
  'AMSv5-Wifi',
  // Add your current WiFi here - comment out or remove in production
  'Home-WiFi',
  'Your-WiFi-Network',
  '*' // Wildcard to accept any WiFi during development
];

/**
 * Check if the location is within campus boundaries
 * @param {Object} location - Location with latitude and longitude
 * @returns {boolean} - Whether the location is within campus
 */
export const isWithinCampus = (location) => {
  // Development override - always return true for testing
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  if (!location || !location.latitude || !location.longitude) {
    return false;
  }
  
  const { latitude, longitude } = location;
  
  return (
    latitude >= CAMPUS_BOUNDARIES.latitude.min &&
    latitude <= CAMPUS_BOUNDARIES.latitude.max &&
    longitude >= CAMPUS_BOUNDARIES.longitude.min &&
    longitude <= CAMPUS_BOUNDARIES.longitude.max
  );
};

/**
 * Check if connected to campus WiFi
 * Uses the NetworkInformation API if available
 * @returns {Promise<boolean>} - Whether connected to campus WiFi
 */
export const isConnectedToCampusWiFi = async () => {
  try {
    // Development override - always return true for testing
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: Campus WiFi check is bypassed');
      return true;
    }
    
    // Check if Web APIs are available
    if (navigator.connection) {
      // Use NetworkInformation API if available
      if (navigator.connection.type === 'wifi') {
        // Attempt to get SSID information if supported
        if (navigator.connection.ssid) {
          const ssid = navigator.connection.ssid;
          const isOnCampusWifi = CAMPUS_WIFI_SSIDS.includes(ssid) || CAMPUS_WIFI_SSIDS.includes('*');
          console.log(`WiFi SSID: ${ssid}, On campus WiFi: ${isOnCampusWifi}`);
          return isOnCampusWifi;
        }
      } else {
        // Not on WiFi
        console.log('Not connected to WiFi');
        return false;
      }
    }
    
    // For browsers without NetworkInformation API support
    // We'll assume it's a valid connection in development mode
    console.log('NetworkInformation API not supported, using development fallback');
    return true;
    
  } catch (error) {
    console.error('Error checking WiFi connection:', error);
    // In development, allow despite errors
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    return false;
  }
}; 