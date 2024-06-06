const db = require('../config/db');
const dotenv = require('dotenv');
dotenv.config();

const add = async (data) => {
    try {
        const docRef = db.collection('Users').doc(data.id);
        await docRef.set(data);
        console.log('User added');
    } catch (error) {
        console.log('Error adding user', error);
    }
}

module.exports = { add };