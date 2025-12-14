const aiService = require('../services/aiService');
const Dataset = require('../models/Dataset');
const logger = require('../utils/logger');

// Generate query from natural language
exports.generateQuery = async (req, res) => {
    try {
        const { prompt, datasetId } = req.body;

        if (!aiService.isEnabled()) {
            return res.status(503).json({
                success: false,
                message: 'AI service not configured. Add ANTHROPIC_API_KEY to environment variables.'
            });
        }

        // Get dataset schema for context
        let schema = null;
        if (datasetId) {
            const dataset = await Dataset.findById(datasetId);
            if (dataset) {
                schema = dataset.schema;
            }
        }

        // Generate query
        const result = await aiService.generateQuery(prompt, schema);

        res.json(result);

    } catch (error) {
        logger.error('AI generate query error', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate query'
        });
    }
};

// Get query suggestions
exports.suggestImprovements = async (req, res) => {
    try {
        const { query } = req.body;

        if (!aiService.isEnabled()) {
            return res.status(503).json({
                success: false,
                message: 'AI service not configured'
            });
        }

        const result = await aiService.suggestImprovements(query);

        res.json(result);

    } catch (error) {
        logger.error('AI suggestions error', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get suggestions'
        });
    }
};

// Explain query
exports.explainQuery = async (req, res) => {
    try {
        const { query } = req.body;

        if (!aiService.isEnabled()) {
            return res.status(503).json({
                success: false,
                message: 'AI service not configured'
            });
        }

        const explanation = await aiService.explainQuery(query);

        res.json({
            success: true,
            explanation
        });

    } catch (error) {
        logger.error('AI explain error', error);
        res.status(500).json({
            success: false,
            message: 'Failed to explain query'
        });
    }
};

// Explain error
exports.explainError = async (req, res) => {
    try {
        const { errorMessage } = req.body;

        if (!aiService.isEnabled()) {
            return res.json({
                success: true,
                explanation: errorMessage
            });
        }

        const explanation = await aiService.explainError(errorMessage);

        res.json({
            success: true,
            explanation
        });

    } catch (error) {
        logger.error('AI explain error error', error);
        res.status(500).json({
            success: false,
            message: 'Failed to explain error'
        });
    }
};