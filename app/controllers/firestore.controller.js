const { Firestore } = require('@google-cloud/firestore');
const path = require('path');

const servicePath = path.resolve('./app/controllers/firestoreKey.json')

const db = new Firestore({
    projectId: 'semaroam-capstone',
    keyFilename: servicePath
  });

const add = async (req, res) => {
    // const  { name, email, phone } = req.body;
    const data = {
        name: "Mykhailo",
        email: "mykhailo@deargod.com",
        phone: 666
    }
    console.log(data);

    if (data) {
        const usersCollection = db.collection('Users');
        console.log("Collections users berhasil dibuat");
    
        const pengunjung = await usersCollection.doc("Pengunjung");
        console.log("Dokumen Pengunjung berhasil ditambahkan");
    
        await pengunjung.set(data);
        console.log("Data berhasil ditambahkan");
    
        res.json({message: "Data berhasil ditambahkan"});
    }
}

module.exports = { add };