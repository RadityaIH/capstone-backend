const tf = require('@tensorflow/tfjs-node');
const dotenv = require('dotenv');
dotenv.config();


const loadModel = async () => {
    const modelPath = process.env.MODEL_URL;
    const model = await tf.loadGraphModel(modelPath);
    console.log('Model loaded');
    return model;
}

// const loadModel = async () => {
//     const model = await tf.loadLayersModel(process.env.MODEL_URL);
//     console.log('Model loaded');
//     return model;
// }

module.exports = loadModel;
