# CompreFace API Implementation

## Overview

This document explains how to set up and use CompreFace for face recognition in the Attendance Management System. CompreFace is an open-source facial recognition system that provides face detection, face verification, and face recognition capabilities.

## Features

The current implementation uses CompreFace for:

1. Face detection - detecting faces in images
2. Face verification - comparing a live image against a registered face
3. Face recognition - identifying a person from their facial features

## Setting Up CompreFace

### Option 1: Docker Installation (Recommended)

1. Install Docker and Docker Compose on your machine
2. Clone the CompreFace repository:
   ```
   git clone https://github.com/exadel-inc/CompreFace.git
   ```
3. Navigate to the cloned repository:
   ```
   cd CompreFace
   ```
4. Start CompreFace using Docker Compose:
   ```
   docker-compose up -d
   ```
5. CompreFace will be available at `http://localhost:8000`

### Option 2: Manual Installation

For manual installation, follow the guide at: https://github.com/exadel-inc/CompreFace/blob/master/docs/Installation-options.md

## Configuring the Application

1. Open the CompreFace Admin panel at `http://localhost:8000/admin`
2. Create a new application by clicking "Add Application"
3. In your new application, create two services:
   - A "Recognition" service (for face verification)
   - A "Detection" service (for face detection)
4. Copy the API keys for both services

5. Open `src/services/compreFaceService.js` and update the following variables:
   ```javascript
   const COMPREFACE_API_KEY = 'your-recognition-service-api-key';
   const COMPREFACE_API_DETECTION_KEY = 'your-detection-service-api-key';
   const COMPREFACE_URL = 'http://localhost:8000'; // Update if using a different URL
   ```

## How It Works

### Face Registration Process

1. User starts the face registration process
2. The system captures an image using the device's camera
3. CompreFace API is used to detect faces in the image
4. If a single face is detected, it's registered with the user's ID
5. The face data is associated with the user in the database

### Face Verification Process

1. User attempts to verify their identity using face recognition
2. The system captures an image using the device's camera
3. CompreFace API is used to detect faces in the image
4. The captured face is compared against the user's registered face
5. If the similarity score is above the threshold (0.7 or 70%), verification succeeds

## Customizing the Configuration

### Changing the Similarity Threshold

The default similarity threshold is 0.7 (70%). To change this:

1. Open `src/services/compreFaceService.js`
2. Locate the verification code around line 190
3. Change the threshold value from 0.7 to your desired value:
   ```javascript
   // Consider it a match if similarity is above 0.7 (70%)
   isMatch = similarity > 0.7;
   ```

### Using a Remote CompreFace Server

If you're using a remote CompreFace server:

1. Open `src/services/compreFaceService.js`
2. Update the `COMPREFACE_URL` variable with your server URL:
   ```javascript
   const COMPREFACE_URL = 'https://your-compreface-server.com';
   ```

## Troubleshooting

### Common Issues

1. **"No face detected"**: Ensure proper lighting and that your face is clearly visible to the camera.
2. **Connection errors**: Verify that your CompreFace server is running and accessible.
3. **Low similarity scores**: Try re-registering your face with better lighting and a clear frontal view.

### Debugging

For debugging issues:

1. Open the browser console to view detailed logs
2. Check the CompreFace server logs in the Docker containers:
   ```
   docker logs compreface_api
   ```

## Security Considerations

The current implementation includes:
- Anti-spoofing measures like timeout between verification attempts
- Verification of single face presence during registration and verification
- Secure API key handling

## References

- [CompreFace GitHub Repository](https://github.com/exadel-inc/CompreFace)
- [CompreFace Documentation](https://github.com/exadel-inc/CompreFace/tree/master/docs)
- [CompreFace API Reference](https://github.com/exadel-inc/CompreFace/blob/master/docs/Rest-API-description.md) 