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
// exports.getPlace = (req, res) => {
//     const id = req.params.id;

//     db.collection('Places').doc(id).get()
//         .then(doc => {
//             if (!doc.exists) {
//                 return res.status(404).send({ message: "Place Not found." });
//             }

//             const place = doc.data();
//             res.status(200).send({
//                 message: "Place was found successfully!",
//                 data: place
//             });
//         })
//         .catch(err => {
//             res.status(500).send({ message: err.message });
//         });
// }

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


// endpoint predict recommendation on click detail place
// exports.predictRecommendation = async (req, res) => {
//     const placeId = req.params.id;

//     const models = await model.loadModel();
//     const placeDoc = await db.collection('Places').doc(placeId).get()
//         .then(doc => {
//             if (!doc.exists) {
//                 return res.status(404).send({ message: "Place Not found." });
//             }

//             return doc.data();
//         })
//         .catch(err => {
//             return res.status(500).send({ message: err.message });
//         });

//     // predict based on Description
//     const place = placeDoc.data();
//     const features = place.Description;

//     const inputTensor = tf.tensor2d([features]);

//     const prediction = models.predict(inputTensor).dataSync();
    

//     res.status(200).send({
//         message: "Prediction was done successfully!",
//         data: prediction
//     });
// }


exports.recommend = async (req, res) => {
    const id = req.params.id;

    try {
        const model = await loadModel();

        // Fetch all places from Firestore
        const placesSnapshot = await db.collection('Places').get();
        if (placesSnapshot.empty) {
            return res.status(404).send({ message: 'No places found.' });
        }

        const places = [];
        let selectedPlace = null;
        placesSnapshot.forEach(doc => {
            const place = { id: doc.id, ...doc.data() };
            if (place.id === id) {
                selectedPlace = place;
            }
            places.push(place);
        });

        if (!selectedPlace) {
            return res.status(404).send({ message: 'Selected place not found.' });
        }

        // Prepare the input tensor for the model
        const id_docs = places.map(place => place.Place_Id);

        // // Check if all id_docs are strings
        // if (!id_docs.every(doc => typeof doc === 'string')) {
        //     return res.status(400).send({ message: 'Invalid Place_Id format.' });
        // }

        // Example: Assuming you're using a tokenizer or other preprocessing step to convert id_docs to a tensor
        const paddedID = padID(id_docs, 768); // Example function to pad id_docs

        const inputTensor = tf.tensor(paddedID).reshape([-1, 768, 1]); // Adjust shape to match model

        // Find the index of the selected place
        const placeIndex = places.findIndex(place => place.id === id);

        // Get predictions from the model
        const predictions = model.predict(inputTensor).dataSync();

        // Get the top 5 recommendations excluding the place itself
        const simScores = Array.from(predictions).map((score, index) => ({ index, score }));
        simScores.sort((a, b) => b.score - a.score);

        const recommendations = simScores
            .filter(sim => sim.index !== placeIndex)
            .slice(0, 5)
            .map(({ index, score }) => ({
                Place_Id: places[index].id,
                Place_Name: places[index].Place_Name,
                Description: places[index].Description,
                Image: places[index].Image,
                City: places[index].City,
                Category: places[index].Category,
                Place_Ratings: places[index].Place_Ratings,
                Score: score
            }));

        //data id from params
        const dataReq = await db.collection('Places').doc(id).get();
        const placeData = dataReq.data();

        res.status(200).send({
            message: 'Recommendations retrieved successfully!',
            data_req: placeData,
            total_data_recommendation: recommendations.length,
            data: recommendations
        });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

// Example function to pad id_docs (adjust as per your actual preprocessing needs)
function padID(id_docs, maxLength) {
    return id_docs.map(doc => padToMaxLength(doc, maxLength));
}

function padToMaxLength(str, maxLength) {
    if (typeof str !== 'string') {
        // console.error('Expected a string but received:', typeof str);
        return Array(maxLength).fill(0); // Return a padded array of zeros if input is not a string
    }
    
    const arr = str.split('').map(char => char.charCodeAt(0)); // Example: converting string to array of char codes
    if (arr.length >= maxLength) {
        return arr.slice(0, maxLength);
    } else {
        return [...arr, ...Array(maxLength - arr.length).fill(0)]; // Example padding with zeros
    }
}
