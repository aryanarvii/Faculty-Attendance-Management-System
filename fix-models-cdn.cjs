const https = require('https');
const fs = require('fs');
const path = require('path');

// Define where models will be stored
const modelsDir = path.join(__dirname, 'public', 'models');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

// Define the models to download from CDN
const modelFiles = [
  // TinyFaceDetector model
  {
    url: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/tiny_face_detector_model-weights_manifest.json',
    path: path.join(modelsDir, 'tiny_face_detector_model-weights_manifest.json'),
    isManifest: true
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/tiny_face_detector_model-shard1',
    path: path.join(modelsDir, 'tiny_face_detector_model-shard1.bin'),
    isManifest: false
  },
  
  // FaceLandmark68 model
  {
    url: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/face_landmark_68_model-weights_manifest.json',
    path: path.join(modelsDir, 'face_landmark_68_model-weights_manifest.json'),
    isManifest: true
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/face_landmark_68_model-shard1',
    path: path.join(modelsDir, 'face_landmark_68_model-shard1.bin'),
    isManifest: false
  },
  
  // FaceRecognition model
  {
    url: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/face_recognition_model-weights_manifest.json',
    path: path.join(modelsDir, 'face_recognition_model-weights_manifest.json'),
    isManifest: true
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/face_recognition_model-shard1',
    path: path.join(modelsDir, 'face_recognition_model-shard1.bin'),
    isManifest: false
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/face_recognition_model-shard2',
    path: path.join(modelsDir, 'face_recognition_model-shard2.bin'),
    isManifest: false
  }
];

// Download a file and save it to the specified path
function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${url} to ${filePath}`);
    
    const file = fs.createWriteStream(filePath);
    https.get(url, (response) => {
      // Check for redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        console.log(`Following redirect: ${response.headers.location}`);
        return downloadFile(response.headers.location, filePath)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded ${filePath}`);
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(filePath, () => {});
        reject(err);
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

// Update the manifest file to fix model references
function updateManifest(manifestPath) {
  try {
    console.log(`Updating manifest: ${manifestPath}`);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Add .bin extension to shard files and update paths
    if (manifest && manifest.length > 0 && manifest[0].paths) {
      manifest[0].paths = manifest[0].paths.map(p => {
        if (p.includes('shard') && !p.endsWith('.bin')) {
          return `${p}.bin`;
        }
        return p;
      });
      
      // Write the updated manifest
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log(`Updated manifest: ${manifestPath}`);
    }
  } catch (error) {
    console.error(`Error updating manifest ${manifestPath}:`, error);
  }
}

// Main function to download all models
async function downloadModels() {
  console.log('Starting to download face-api.js models...');
  
  for (const model of modelFiles) {
    try {
      // Download the file
      await downloadFile(model.url, model.path);
      
      // Update manifest files
      if (model.isManifest) {
        updateManifest(model.path);
      }
    } catch (error) {
      console.error(`Error downloading ${model.url}:`, error);
    }
  }
  
  console.log('✅ All models downloaded and processed successfully!');
}

// Run the download
downloadModels().catch(console.error); 