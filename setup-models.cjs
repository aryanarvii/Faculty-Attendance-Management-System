const https = require('https');
const fs = require('fs');
const path = require('path');

// Create models directory if it doesn't exist
const modelsDir = path.join(__dirname, 'public', 'models');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

// Define the models to download
const models = [
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

// Base URL for models
const BASE_URL = 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights/';

// Function to download a file
const downloadFile = (url, destination) => {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${url} to ${destination}...`);
    
    const file = fs.createWriteStream(destination);
    https.get(url, (response) => {
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded ${url}`);
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(destination, () => {}); // Delete the file on error
        console.error(`Error downloading ${url}:`, err.message);
        reject(err);
      });
    }).on('error', (err) => {
      fs.unlink(destination, () => {}); // Delete the file on error
      console.error(`Error downloading ${url}:`, err.message);
      reject(err);
    });
  });
};

// Function to patch the manifest file
const patchManifest = (filePath) => {
  const manifest = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  // Modify paths to add .bin extension to shard files
  manifest[0].paths = manifest[0].paths.map(path => {
    if (!path.endsWith('.bin') && path.includes('shard')) {
      return `${path}.bin`;
    }
    return path;
  });
  
  // Write back the modified manifest
  fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2));
  console.log(`Patched manifest: ${filePath}`);
};

// Main function to download all models
const downloadModels = async () => {
  console.log('Starting download of face-api.js models...');
  
  for (const model of models) {
    console.log(`Processing model: ${model.name}`);
    
    for (const file of model.files) {
      const url = `${BASE_URL}${model.name}/${file}`;
      const extension = file.includes('manifest') ? '.json' : '.bin';
      const destination = path.join(modelsDir, `${file}${extension}`);
      
      try {
        await downloadFile(url, destination);
        
        // Patch the manifest files
        if (file.includes('manifest')) {
          patchManifest(destination);
        }
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
      }
    }
  }
  
  console.log('All models downloaded and processed successfully!');
};

downloadModels().catch(console.error); 