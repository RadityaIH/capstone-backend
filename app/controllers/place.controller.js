const db = require('../config/db');
const loadModel = require('../config/loadModel');
const tf = require('@tensorflow/tfjs-node');
const natural = require('natural');
const cosineSimilarity = require('cosine-similarity');

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

        const placeRef = db.collection('Places').doc(place.Place_Id);
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
                const placeDescription = place.Category.toLowerCase().replace(/\s/g, '');

                if (placeDescription.includes(cat)) {
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



async function placeRecommendations(placeId) {
    try {
        // Fetch the place from Firestore based on placeId
        const placeDoc = await db.collection('Places').doc(placeId).get();
        if (!placeDoc.exists) {
            throw new Error('Place not found.');
        }

        const placeData = placeDoc.data();
        const placeDescription = placeData.Description;

        // Fetch all places from Firestore
        const placesSnapshot = await db.collection('Places').get();
        if (placesSnapshot.empty) {
            throw new Error('No places found.');
        }

        const places = [];
        placesSnapshot.forEach(doc => {
            places.push(doc.data());
        });

        const descriptions = places.map(place => place.Description);
        const userPreferences = [placeDescription]; // Use the description of the selected place as user preference

        const allText = descriptions.concat(userPreferences);

        // Create TF-IDF vectorizer
        const TfIdf = natural.TfIdf;
        const tfidf = new TfIdf();

        allText.forEach(text => {
            tfidf.addDocument(text);
        });

        const userTfidfVectors = userPreferences.map(pref => {
            const tfidfVector = new Array(tfidf.documents.length).fill(0);
            tfidf.tfidfs(pref, (i, measure) => {
                tfidfVector[i] = measure;
            });
            return tfidfVector;
        });

        const placeTfidfVectors = descriptions.map(category => {
            const tfidfVector = new Array(tfidf.documents.length).fill(0);
            tfidf.tfidfs(category, (i, measure) => {
                tfidfVector[i] = measure;
            });
            return tfidfVector;
        });

        // Calculate cosine similarity
        const similarities = userTfidfVectors.map(userVector => {
            return placeTfidfVectors.map(placeVector => {
                return cosineSimilarity(userVector, placeVector);
            });
        });

        const averageSimilarities = similarities[0].map((_, i) => {
            return similarities.reduce((sum, sim) => sum + sim[i], 0) / userPreferences.length;
        });

        // Get top 5 recommendations excluding the selected place
        const topIndices = averageSimilarities
            .map((sim, index) => ({ index, sim }))
            .sort((a, b) => b.sim - a.sim)
            .slice(1, 6) // Take top 5 recommendations excluding the selected place
            .map(item => ({
                ...places[item.index], // place object
                Score: item.sim // similarity score
            }));

        return topIndices;
    } catch (error) {
        console.error('Error retrieving recommendations:', error);
        throw error;
    }
}

exports.recommend = async (req, res) => {
    const placeId = req.params.id;

    try {
        const recommendations = await placeRecommendations(placeId);

        const doc = await db.collection('Places').doc(placeId).get();
        if (!doc.exists) {
            return res.status(404).send({ message: 'Selected place not found.' });
        }

        const selectedPlace = doc.data();

        const responseData = {
            message: 'Recommendations retrieved successfully!',
            data_req: selectedPlace,
            total_data_recommendation: recommendations.length,
            data: recommendations
        };

        res.status(200).json(responseData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
