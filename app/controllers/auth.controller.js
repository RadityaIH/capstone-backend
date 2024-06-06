const storeFirestore = require('../controllers/firestore.controller');
const { Firestore } = require('@google-cloud/firestore');
const dotenv = require('dotenv');
dotenv.config();

const db = new Firestore({
    projectId: 'semaroam-capstone',
    keyFilename: process.env.FIRESTOREKEY
});

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

exports.signup = (req, res) => {
    const { username, password, nama } = req.body;

    const id = crypto.randomBytes(16).toString("hex");

    const user = {
        id: id,
        nama: nama,
        username: username,
        password: bcrypt.hashSync(password, 8)
    };

    storeFirestore.add(user);

    res.status(201).send({ 
        message: "User was registered successfully!",
        data: user 
    });
}

exports.signin = (req, res) => {
    const { username, password } = req.body;

    db.collection('Users').where('username', '==', username).get()
        .then(snapshot => {
            if (snapshot.empty) {
                return res.status(404).send({ message: "User Not found." });
            }

            snapshot.forEach(doc => {
                const user = doc.data();

                const passwordIsValid = bcrypt.compareSync(
                    password,
                    user.password
                );

                if (!passwordIsValid) {
                    return res.status(401).send({
                        accessToken: null,
                        message: "Invalid Password!"
                    });
                }

                const token = jwt.sign({ id: user.id }, process.env.SECRET, {
                    expiresIn: 86400 // 24 hours
                });

                res.status(200).send({
                    message: "User was logged in successfully!",
                    data: {
                        id: user.id,
                        nama: user.nama,
                        username: user.username
                    },
                    accessToken: token
                });
            });
        })
        .catch(err => {
            res.status(500).send({ message: err.message });
        });
};

exports.signout = (req, res) => {
    res.status(200).send({ 
        message: "User was logged out successfully!",
        accessToken: null 
    });
};