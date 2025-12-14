const mongoose = require('mongoose');

const querySchema = new mongoose.Schema({
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    datasetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset' },
    queryText: { type: String, required: true },
    queryType: { type: String, default: 'mongodb' },
    results: { type: mongoose.Schema.Types.Mixed, default: null },
    status: { type: String, enum: ['running', 'success', 'error'], default: 'running' },
    executionTime: { type: Number, default: 0 },
    errorMessage: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
});

querySchema.statics.getSessionHistory = function (sessionId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return this.find({ sessionId }).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('userId', 'name avatar');
};

module.exports = mongoose.model('Query', querySchema);
