const tf = require('@tensorflow/tfjs-node');
const dotenv = require('dotenv');
dotenv.config();


const loadModel = async () => {
    console.log('Loading Model...')
    const modelPath = process.env.MODEL_URL;
    const model = await tf.loadGraphModel(modelPath);
    console.log('Model loaded successfully!');
    return model;
}

module.exports = loadModel;
