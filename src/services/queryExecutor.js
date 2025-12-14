const mongoose = require('mongoose');
const Dataset = require('../models/Dataset');
const logger = require('../utils/logger');

/**
 * Execute a Mongo-like query against a dataset (collection created when CSV uploaded)
 * queryObject is expected to be an object with optional fields: filter, projection, sort, limit, skip
 */
const executeMongoQuery = async (datasetId, queryObject = {}) => {
    const start = Date.now();

    const dataset = await Dataset.findById(datasetId);
    if (!dataset) {
        return { success: false, error: 'Dataset not found', data: [], count: 0, limited: false, executionTime: 0 };
    }

    const collection = mongoose.connection.collection(dataset.collectionName);

    const filter = queryObject.filter || {};
    const projection = queryObject.projection || {};
    const sort = queryObject.sort || {};
    const limit = parseInt(queryObject.limit, 10) || 1000;
    const skip = parseInt(queryObject.skip, 10) || 0;

    try {
        const cursor = collection.find(filter).project(projection).sort(sort).skip(skip).limit(limit + 1);
        const docs = await cursor.toArray();

        const limited = docs.length > limit;
        const data = limited ? docs.slice(0, limit) : docs;

        const count = await collection.countDocuments(filter);

        const executionTime = Date.now() - start;

        logger.query(JSON.stringify(filter).substring(0, 200), executionTime);

        return {
            success: true,
            data,
            count,
            limited,
            executionTime
        };
    } catch (error) {
        logger.error('Query execution failed', error);
        return { success: false, error: error.message, data: [], count: 0, limited: false, executionTime: Date.now() - start };
    }
};

module.exports = {
    executeMongoQuery
};
