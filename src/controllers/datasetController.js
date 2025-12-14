const Dataset = require('../models/Dataset');
const logger = require('../utils/logger');
const Papa = require('papaparse');
const mongoose = require('mongoose');

// List datasets for a session or user
exports.listDatasets = async (req, res) => {
    try {
        const { sessionId } = req.query;

        let datasets;

        if (sessionId) {
            datasets = await Dataset.findBySession(sessionId);
        } else {
            datasets = await Dataset.find({ ownerId: req.user._id }).sort({ createdAt: -1 });
        }

        res.json({ success: true, datasets });
    } catch (error) {
        logger.error('List datasets error', error);
        res.status(500).json({ success: false, message: 'Failed to list datasets' });
    }
};

// Get dataset details
exports.getDataset = async (req, res) => {
    try {
        const { id } = req.params;

        const dataset = await Dataset.findById(id);

        if (!dataset) {
            return res.status(404).json({ success: false, message: 'Dataset not found' });
        }

        res.json({ success: true, dataset });
    } catch (error) {
        logger.error('Get dataset error', error);
        res.status(500).json({ success: false, message: 'Failed to load dataset' });
    }
};

// Upload CSV and create dataset
exports.createDataset = async (req, res) => {
    try {
        // Expect file buffer from multer
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const csv = req.file.buffer.toString('utf8');

        const parsed = Papa.parse(csv, { header: true, dynamicTyping: true, skipEmptyLines: true });

        if (parsed.errors && parsed.errors.length) {
            logger.error('CSV parse errors', parsed.errors);
            return res.status(400).json({ success: false, message: 'Invalid CSV file' });
        }

        const documents = parsed.data;

        // Create a unique collection name for this dataset
        const collectionName = `dataset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        // Insert documents into a new collection
        const collection = mongoose.connection.collection(collectionName);
        if (documents.length) {
            await collection.insertMany(documents);
        }

        const dataset = await Dataset.create({
            name: req.body.name || req.file.originalname || 'Uploaded Dataset',
            description: req.body.description || '',
            ownerId: req.user._id,
            sessionId: req.body.sessionId || null,
            collectionName,
            schema: Object.keys(documents[0] || {}).map(k => ({ name: k }))
        });

        res.json({ success: true, dataset });
    } catch (error) {
        logger.error('Create dataset error', error);
        res.status(500).json({ success: false, message: 'Failed to create dataset' });
    }
};

// Delete dataset (removes collection and record)
exports.deleteDataset = async (req, res) => {
    try {
        const { id } = req.params;

        const dataset = await Dataset.findById(id);
        if (!dataset) {
            return res.status(404).json({ success: false, message: 'Dataset not found' });
        }

        // Only owner or session owner can delete
        if (dataset.ownerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete dataset' });
        }

        // Drop collection if exists
        try {
            await mongoose.connection.dropCollection(dataset.collectionName);
        } catch (e) {
            // ignore if collection didn't exist
        }

        await dataset.deleteOne();

        res.json({ success: true, message: 'Dataset deleted' });
    } catch (error) {
        logger.error('Delete dataset error', error);
        res.status(500).json({ success: false, message: 'Failed to delete dataset' });
    }
};
