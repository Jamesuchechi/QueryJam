const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const datasetController = require('../controllers/datasetController');
const { protect, protectAPI } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');

// Upload CSV and create dataset (protected page/session)
router.post('/', protect, upload.single('file'), uploadLimiter, datasetController.createDataset);

// List datasets (API)
router.get('/', protectAPI, datasetController.listDatasets);

// Get dataset details
router.get('/:id', protectAPI, datasetController.getDataset);

// Delete dataset
router.delete('/:id', protectAPI, datasetController.deleteDataset);

module.exports = router;
