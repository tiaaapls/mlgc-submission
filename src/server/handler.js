const crypto = require('crypto');
const { Firestore } = require('@google-cloud/firestore');
const predictClassification = require('../services/inferenceService');
const storeData = require('../services/storeData');

async function postPredictHandler(request, h) {
    const { image } = request.payload;

    if (Buffer.byteLength(image) > 1000000) {  
        return h.response({
            status: 'fail',
            message: 'Payload content length greater than maximum allowed: 1000000',
        }).code(413);
    }

    const { model } = request.server.app;

    try {
        const { label, suggestion } = await predictClassification(model, image);
        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();

        const data = {
            "id": id,
            "result": label,
            "suggestion": suggestion,
            "createdAt": createdAt
        }

        await storeData(id, data);

        const response = h.response({
            status: 'success',
            message: 'Model is predicted successfully',
            data
        });
        response.code(201);
        return response;
    } catch (error) {
        console.error("Error in postPredictHandler:", error);
        return h.response({
            status: 'fail',
            message: error.message || 'Terjadi kesalahan dalam melakukan prediksi',
        }).code(400); 
    }
}

async function getHistoriesHandler(request, h) {
    const db = new Firestore();
    const predictCollection = db.collection('prediction');
  
    try {
        const snapshot = await predictCollection.get();
        const histories = snapshot.docs.map((doc) => ({
            id: doc.id,
            history: doc.data(),
        }));
    
        return h.response({
            status: 'success',
            data: histories,
        });
    } catch (error) {
        return h.response({
            status: 'fail',
            message: 'Gagal mengambil data riwayat prediksi.',
        }).code(500);
    }
}
   
module.exports = { postPredictHandler, getHistoriesHandler };
