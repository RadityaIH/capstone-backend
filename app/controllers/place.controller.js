const db = require('../config/db');
const loadModel = require('../config/loadModel');
const tf = require('@tensorflow/tfjs-node');

// post all places json to firestore
exports.addPlaces = (req, res) => {
    const places = req.body;  // Mengasumsikan req.body adalah array JSON

    if (!Array.isArray(places)) {
        return res.status(400).send({
            message: "Invalid input, expected an array of places"
        });
    }

    const batch = db.batch();

    places.forEach((place) => {
        if (!place.Place_Id) {
            return res.status(400).send({
                message: "Place_Id is required for each place"
            });
        }

        const placeRef = db.collection('Places').doc(place.Place_Id.toString());
        batch.set(placeRef, place);
    });

    batch.commit()
        .then(() => {
            res.status(201).send({
                message: "All places were added successfully!",
                data: places
            });
        })
        .catch(err => {
            res.status(500).send({
                message: err.message
            });
        });
}

// get all places from firestore
exports.getAllPlaces = (req, res) => {
    db.collection('Places').get()
        .then(snapshot => {
            if (snapshot.empty) {
                return res.status(404).send({ message: "Places Not found.", total_data: 0});
            }

            const places = [];
            snapshot.forEach(doc => {
                places.push(doc.data());
            });

            res.status(200).send({
                message: "Places were found successfully!",
                total_data: places.length,
                data: places
            });
        })
        .catch(err => {
            res.status(500).send({ message: err.message });
        });
}

// get place by id
exports.getPlace = (req, res) => {
    const id = req.params.id;

    db.collection('Places').doc(id).get()
        .then(doc => {
            if (!doc.exists) {
                return res.status(404).send({ message: "Place Not found." });
            }

            const place = doc.data();
            res.status(200).send({
                message: "Place was found successfully!",
                data: place
            });
        })
        .catch(err => {
            res.status(500).send({ message: err.message });
        });
}

// get place by keyword
exports.getPlaceByKeyword = (req, res) => {
    const keyword = req.params.keyword;

    // lowercase Place_Name and remove whitespace 
    const key = keyword.toLowerCase().replace(/\s/g, '');

    // lowercase data place name in firestore and remove whitespace
    db.collection('Places').get()
        .then(snapshot => {
            if (snapshot.empty) {
                return res.status(404).send({ message: "Places Not found.", total_data: 0});
            }

            const places = [];
            snapshot.forEach(doc => {
                const place = doc.data();
                const placeName = place.Place_Name.toLowerCase().replace(/\s/g, '');

                if (placeName.includes(key)) {
                    places.push(place);
                }
            });

            if (places.length === 0) {
                return res.status(404).send({ message: "Places Not found.", total_data: 0});
            }

            res.status(200).send({
                message: "Places were found successfully!",
                total_data: places.length,
                data: places
            });
        })
        .catch(err => {
            res.status(500).send({ message: err.message });
        });
}

// get place by category
exports.getPlaceByCategory = (req, res) => {
    const category = req.params.category;

    const cat = category.toLowerCase().replace(/\s/g, '');

    db.collection('Places').get()
        .then(snapshot => {
            if (snapshot.empty) {
                return res.status(404).send({ message: "Places Not found.", total_data: 0});
            }

            const places = [];
            snapshot.forEach(doc => {
                const place = doc.data();
                const placeCategory = place.Category.toLowerCase().replace(/\s/g, '');

                if (placeCategory.includes(cat)) {
                    places.push(place);
                }
            });

            if (places.length === 0) {
                return res.status(404).send({ message: "Places Not found.", total_data: 0});
            }

            res.status(200).send({
                message: "Places were found successfully!",
                total_data: places.length,
                data: places
            });
        })
        .catch(err => {
            res.status(500).send({ message: err.message });
        });
}

// predict recommendation based on location
exports.predictRecommendation = async (req, res) => {
    const id = req.params.id;
    const num_recommendations = req.query.num_recommendations || 5;

    try {
        const model = await loadModel();
        
        //find description of place by id
        const doc = await db.collection('Places').doc(id).get();
        if (!doc.exists) {
            return res.status(404).send({ message: "Place Not found." });
        }

        const place = doc.data();
        console.log(place.Place_Name)
        const inputTensor = tf.tensor3d([[[place.Place_Id]]]);
        const prediction = model.predict(inputTensor);

        const predictionData = await prediction.array();

        res.status(200).send({
            message: "Prediction completed successfully!",
            data: predictionData,
        });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
}