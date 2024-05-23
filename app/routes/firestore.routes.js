const controller = require('../controllers/firestore.controller.js');

module.exports = function (app) {
    app.post('/add', controller.add);
}