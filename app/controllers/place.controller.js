const db = require('../config/db');
const model = require('../config/loadModel');

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

let dataset = [];
let tfidf_matrix = [];

// Memuat dataset dari Firestore dan menginisialisasi vectorizer
const loadDataset = async () => {
    const snapshot = await db.collection('Places').get();
    dataset = snapshot.docs.map(doc => ({ id: doc.Place_Id, ...doc.data() }));

    const descriptions = dataset.map(doc => doc.Description);
    const vectorizer = new tf.layers.experimental.preprocessing.TextVectorization();
    const data = tf.data.array(descriptions);
    await vectorizer.adapt(data);

    const sequences = descriptions.map(desc => vectorizer.apply(tf.tensor([desc])).arraySync()[0]);
    const vocabSize = vectorizer.computeVocabularySize();
    tfidf_matrix = sequences.map(seq => {
        const termCounts = tf.tensor1d(seq).arraySync();
        const tfidfVector = termCounts.map(count => count / seq.length * Math.log(vocabSize / (1 + count)));
        return tf.tensor1d(tfidfVector);
    });
};

// Fungsi untuk menghitung cosine similarity
const cosineSimilarity = (vecA, vecB) => {
    const dotProduct = tf.dot(vecA, vecB).arraySync();
    const normA = vecA.norm().arraySync();
    const normB = vecB.norm().arraySync();
    return dotProduct / (normA * normB);
};

// Fungsi rekomendasi
const recommend = (doc_id, num_recommendations = 5) => {
    const simScores = tfidf_matrix.map((vec, i) => {
        return [i, cosineSimilarity(tfidf_matrix[doc_id], vec)];
    });

    simScores.sort((a, b) => b[1] - a[1]);
    const recommendations = simScores.slice(1, num_recommendations + 1);
    return recommendations.map(([i, score]) => ({
        doc_id: dataset[i].id,
        place_name: dataset[i].Place_Name,
        description: dataset[i].Description,
        image: dataset[i].Image,
        score: score
    }));
};

exports.predictRecommendation = async (req, res) => {
    const placeId = req.params.id;

    try {
        const placeIndex = dataset.findIndex(doc => doc.id === placeId);
        if (placeIndex === -1) {
            return res.status(404).send({ message: "Place Not found." });
        }

        const recommendations = recommend(placeIndex);

        res.status(200).send({
            message: "Prediction was done successfully!",
            data: recommendations
        });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}