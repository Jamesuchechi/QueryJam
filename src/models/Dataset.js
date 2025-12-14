const mongoose = require('mongoose');

const datasetSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
    collectionName: { type: String, required: true, unique: true },
    schema: { type: Array, default: [] },
    createdAt: { type: Date, default: Date.now }
});

datasetSchema.statics.findBySession = function (sessionId) {
    return this.find({ sessionId }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Dataset', datasetSchema);
