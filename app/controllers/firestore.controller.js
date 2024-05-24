const { Firestore } = require('@google-cloud/firestore');
const path = require('path');

const servicePath = path.resolve('./app/controllers/firestoreKey.json')

const db = new Firestore({
    projectId: 'semaroam-capstone',
    keyFilename: servicePath
  });

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