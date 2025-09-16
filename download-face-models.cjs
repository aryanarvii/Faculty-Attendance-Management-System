const https = require('https');
const fs = require('fs');
const path = require('path');

// Create models directory
const modelsDir = path.join(__dirname, 'public', 'models');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

// Define the models to download
const modelFiles = [
  // TinyFaceDetector model
  'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/tiny_face_detector_model-weights_manifest.json',
  'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/tiny_face_detector_model-shard1',
  
  // FaceLandmark68 model
  'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/face_landmark_68_model-weights_manifest.json',
  'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/face_landmark_68_model-shard1',
  
  // FaceRecognition model
  'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/face_recognition_model-weights_manifest.json',
  'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/face_recognition_model-shard1',
  'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/face_recognition_model-shard2'
];

// Download a file from a URL
const downloadFile = (url, outputPath) => {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${url} to ${outputPath}`);
    
    // Create write stream
    const file = fs.createWriteStream(outputPath);
    
    // Make HTTP request
    https.get(url, (response) => {
      // Check if successful
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      
      // Pipe response to file
      response.pipe(file);
      
      // Handle completion
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded ${url}`);
        resolve();
      });
      
      // Handle errors
      file.on('error', (err) => {
        fs.unlink(outputPath, () => {});
        reject(err);
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
};

// Process manifest files to handle shard file extensions
const processManifest = (filePath) => {
  try {
    // Read the manifest file
    const manifest = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Modify paths to add .bin extension to shard files
    if (manifest && manifest.length > 0 && manifest[0].paths) {
      manifest[0].paths = manifest[0].paths.map(path => {
        if (!path.endsWith('.bin') && path.includes('shard')) {
          return `${path}.bin`;
        }
        return path;
      });
      
      // Write back the modified manifest
      fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2));
      console.log(`Patched manifest: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing manifest ${filePath}:`, error);
  }
};

// Download all model files
const downloadModels = async () => {
  console.log('Starting downloads...');
  
  for (const url of modelFiles) {
    // Extract filename from URL
    const fileName = url.split('/').pop();
    
    // Set output path
    let outputPath = path.join(modelsDir, fileName);
    
    // Add .bin extension to shard files
    if (fileName.includes('shard') && !fileName.endsWith('.bin')) {
      outputPath = `${outputPath}.bin`;
    }
    
    try {
      // Download the file
      await downloadFile(url, outputPath);
      
      // Process manifest files
      if (fileName.includes('manifest')) {
        processManifest(outputPath);
      }
    } catch (error) {
      console.error(`Error downloading ${url}:`, error);
    }
  }
  
  console.log('All files downloaded and processed!');
};

// Run the download
downloadModels().catch(console.error); 