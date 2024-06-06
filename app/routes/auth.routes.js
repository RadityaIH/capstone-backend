const authController = require("../controllers/auth.controller");
const { verifySignUp } = require("../middlewares");

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept"
        );
        next();
    });

    app.post("/signup", [verifySignUp.checkDuplicateUsername], authController.signup);
    app.post("/signin", authController.signin);
    app.post("/signout", authController.signout);

};