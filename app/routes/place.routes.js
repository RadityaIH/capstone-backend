const placeController = require("../controllers/place.controller");

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept"
        );
        next();
    });

    app.post("/place", placeController.addPlaces);
    app.get("/place", placeController.getAllPlaces);
    app.get("/place/:id", placeController.getPlace);
    app.get("/place/keyword/:keyword", placeController.getPlaceByKeyword);
    app.get("/place/category/:category", placeController.getPlaceByCategory);
};