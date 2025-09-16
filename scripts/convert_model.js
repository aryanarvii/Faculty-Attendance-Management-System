const tf = require('@tensorflow/tfjs-node');
const tfjs = require('@tensorflow/tfjs-converter');
const fs = require('fs');
const path = require('path');

async function convertModel() {
  try {
    // Load the FaceNet model from TensorFlow Hub
    const modelUrl = 'https://tfhub.dev/google/facenet/1';
    console.log('Loading model from TensorFlow Hub...');
    
    const model = await tfjs.loadGraphModel(modelUrl);
    console.log('Model loaded successfully');

    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, '../public/models/facenet');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save the model in TensorFlow.js format
    console.log('Converting and saving model...');
    await model.save(`file://${outputDir}`);
    
    console.log('Model conversion completed successfully!');
    console.log(`Model saved to: ${outputDir}`);
  } catch (error) {
    console.error('Error converting model:', error);
  }
}

convertModel(); 