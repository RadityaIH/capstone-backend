const express = require('express');
const cors = require("cors");
const loadModel = require('./app/config/loadModel.js');

// routes
const firestoreRoutes = require('./app/routes/firestore.routes.js');
const authRoutes = require('./app/routes/auth.routes.js');
const userRoutes = require('./app/routes/user.routes.js');
const placeRoutes = require('./app/routes/place.routes.js');

const app = express();
const PORT = 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

var corsOptions = {
    origin: "*",
};

app.use(cors(corsOptions));

// parse requests of content-type - application/json
app.use(express.json());

app.get("/", (req, res) => {
    res.json({ message: "awkoawkowaw 🫵😂" });
});

// Load the model before starting the server
loadModel().then(model => {
    app.locals.model = model;

    // Initialize routes
    firestoreRoutes(app);
    authRoutes(app);
    userRoutes(app);
    placeRoutes(app);

}).catch(error => {
    console.error("Error loading model:", error);
    process.exit(1); // Exit if model loading fails
});