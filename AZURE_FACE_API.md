# Azure Face API Implementation

## Overview

This document explains how to work with the Azure Face API in the Attendance Management System. Due to Microsoft's new Responsible AI policies, certain face recognition features such as identification, verification, and person groups require special approval to use. Our implementation provides workarounds for these limitations.

## Current Limitations

As of June 2023, Microsoft restricts access to the following Azure Face API features:

- Face identification (finding a face in a large collection)
- Face verification (comparing faces for similarity)
- Person groups and large person groups

These features require special approval through the [Limited Access process](https://aka.ms/facerecognition).

## Our Implementation

To work around these limitations, our system uses:

1. Basic face detection features (which remain available to all)
2. Custom similarity comparison based on facial attributes
3. Local storage of face data for comparison

## How to Test Azure Face API

We've included a test tool to help diagnose Azure Face API issues:

1. Navigate to `/face-azure-test.html` in your browser
2. Click "Start Camera" to activate your webcam
3. Click "Capture Image" to take a photo
4. Click "Detect Face" to test the Azure Face API call

The test tool will show the raw API response, helping you to diagnose any issues.

## Development Mode Features

To facilitate development without requiring Azure Face API approval:

1. Add `?bypass=true` to the URL to bypass face verification (e.g., `http://localhost:3000/attendance?bypass=true`)
2. In development mode, the face comparison will return success regardless of actual similarity
3. Mock data is used if the Azure API fails in development mode

## Registering for Azure Face API Service

If you need to obtain your own Azure Face API key:

1. Create an Azure account at [portal.azure.com](https://portal.azure.com)
2. Create a Face API resource in your Azure portal
3. Get your API Key and Endpoint from the Azure portal
4. Update the values in `src/services/azureFaceService.js`

## Applying for Limited Access

If you need the restricted face recognition features:

1. Visit [https://aka.ms/facerecognition](https://aka.ms/facerecognition)
2. Submit an application describing your use case
3. Await approval from Microsoft

## Troubleshooting

### Common Error Messages

- **"UnsupportedFeature"**: This indicates you're trying to use a restricted feature. Our code should automatically fall back to alternative methods.
  
- **"Invalid subscription key"**: Double-check your Azure Face API key in `azureFaceService.js`

- **"No face detected"**: Ensure good lighting and that your face is clearly visible to the camera

### Storage Issues

If you encounter localStorage errors:

1. Try using incognito/private browsing mode
2. Clear browser storage and cookies
3. Set up proper CORS headers on your server

## Further Support

For more help with the Azure Face API:

- [Azure Face Documentation](https://learn.microsoft.com/en-us/azure/applied-ai-services/computer-vision/overview-identity)
- [MS Face API Responsible AI](https://learn.microsoft.com/en-us/legal/cognitive-services/computer-vision/limited-access-identity) 