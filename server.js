const express = require('express');
const cors = require("cors");

// routes
const firestoreRoutes = require('./app/routes/firestore.routes.js');
const authRoutes = require('./app/routes/auth.routes.js');

const app = express();
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

var corsOptions = {
    origin: "http://localhost:3000",
};

app.use(cors(corsOptions));

// parse requests of content-type - application/json
app.use(express.json());

app.get("/", (req, res) => {
    res.json({ message: "awkoawkowaw 🫵😂" });
});

firestoreRoutes(app);
authRoutes(app);