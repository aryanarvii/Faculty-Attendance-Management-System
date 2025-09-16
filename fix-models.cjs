const https = require('https');
const fs = require('fs');
const path = require('path');

// Define where models will be stored
const modelsDir = path.join(__dirname, 'public', 'models');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

// Define the base URL for models
const MODEL_BASE_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

// Define models to download
const MODELS = [
  {
    name: 'tiny_face_detector',
    files: [
      'tiny_face_detector_model-shard1',
      'tiny_face_detector_model-weights_manifest.json'
    ]
  },
  {
    name: 'face_landmark_68',
    files: [
      'face_landmark_68_model-shard1',
      'face_landmark_68_model-weights_manifest.json'
    ]
  },
  {
    name: 'face_recognition',
    files: [
      'face_recognition_model-shard1',
      'face_recognition_model-shard2',
      'face_recognition_model-weights_manifest.json'
    ]
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

// Update the manifest file to properly handle shard files
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
  
  for (const model of MODELS) {
    console.log(`Processing model: ${model.name}`);
    
    // Process each file in the model
    for (const file of model.files) {
      const fileName = file;
      const isManifest = fileName.includes('manifest');
      
      const sourceUrl = `${MODEL_BASE_URL}/${model.name}/${fileName}`;
      let destPath = path.join(modelsDir, fileName);
      
      // Add .bin extension for shard files
      if (fileName.includes('shard') && !fileName.endsWith('.bin')) {
        destPath = `${destPath}.bin`;
      }
      
      try {
        // Download the file
        await downloadFile(sourceUrl, destPath);
        
        // Update manifest files
        if (isManifest) {
          updateManifest(destPath);
        }
      } catch (error) {
        console.error(`Error downloading ${sourceUrl}:`, error);
      }
    }
  }
  
  console.log('✅ All models downloaded and processed successfully!');
}

// Run the download
downloadModels().catch(console.error); 