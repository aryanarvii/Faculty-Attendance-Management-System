// Campus coordinates (example - replace with your actual campus coordinates)
const CAMPUS_COORDINATES = {
  latitude: 37.7749, // Example: San Francisco
  longitude: -122.4194,
  radius: 0.5 // in kilometers
};

// Campus WiFi SSID
const CAMPUS_WIFI_SSID = "University_WiFi"; // Replace with your campus WiFi SSID

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; // Distance in km
  return distance;
};

// Check if user is on campus based on GPS
export const isOnCampus = (latitude, longitude) => {
  const distance = calculateDistance(
    latitude, 
    longitude, 
    CAMPUS_COORDINATES.latitude, 
    CAMPUS_COORDINATES.longitude
  );
  
  return distance <= CAMPUS_COORDINATES.radius;
};

// Check if user is connected to campus WiFi
export const isOnCampusWifi = (ssid) => {
  return ssid === CAMPUS_WIFI_SSID;
};

// Get current location
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      }
    );
  });
};

// Get current WiFi SSID (Note: This is not directly possible in browsers for security reasons)
// This is a mock function - in a real app, you might need a native app or browser extension
export const getCurrentWifiSSID = async () => {
  // In a real implementation, this would use a different approach
  // For demo purposes, we'll return a mock value
  return "University_WiFi";
}; 