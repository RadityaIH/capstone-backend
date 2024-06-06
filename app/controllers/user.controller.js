const storeFirestore = require('../controllers/firestore.controller');
const { Firestore } = require('@google-cloud/firestore');
const dotenv = require('dotenv');
dotenv.config();

const db = new Firestore({
    projectId: 'semaroam-capstone',
    keyFilename: process.env.FIRESTOREKEY
});

// get user by id
exports.getUser = (req, res) => {
    const id = req.params.id;

    db.collection('Users').doc(id).get()
        .then(doc => {
            if (!doc.exists) {
                return res.status(404).send({ message: "User Not found." });
            }
            const user= doc.data();
            res.status(201).send({ 
                message: "User was found successfully!",
                data: {
                    nama: user.nama,
                    username: user.username,
                    createdAt: user.createdAt
                }
            });
        })
        .catch(err => {
            res.status(500).send({
                message: err.message
            });
        });
}