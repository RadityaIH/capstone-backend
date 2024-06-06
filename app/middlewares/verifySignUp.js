const db = require('../config/db');

checkDuplicateUsername = (req, res, next) => {
    // Username
    db.collection('Users').where('username', '==', req.body.username).get()
        .then(snapshot => {
            if (snapshot.empty) {
                next();
                return;
            }
            res.status(400).send({
                message: "Failed! Username is already in use!"
            });
            return;
        })
        .catch(err => {
            res.status(500).send({
                message: err.message
            });
        });
};

const verifySignUp = {
    checkDuplicateUsername
};

module.exports = verifySignUp;