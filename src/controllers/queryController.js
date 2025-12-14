const Query = require('../models/Query');
const Session = require('../models/Session');
const queryExecutor = require('../services/queryExecutor');
const realtimeService = require('../services/realtimeService');
const logger = require('../utils/logger');

// Execute query
exports.executeQuery = async (req, res) => {
    try {
        const { sessionId, datasetId, queryText, queryType } = req.body;

        // Validate session access
        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        if (!session.canEdit(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to execute queries'
            });
        }

        // Create query record
        const query = await Query.create({
            sessionId,
            userId: req.user._id,
            datasetId,
            queryText,
            queryType: queryType || 'mongodb',
            status: 'running'
        });

        // Broadcast query start
        realtimeService.broadcastQueryUpdate(sessionId, query, req.user._id);

        // Execute query
        let result;
        try {
            // Parse query text to object
            const queryObject = JSON.parse(queryText);

            result = await queryExecutor.executeMongoQuery(datasetId, queryObject);

            // Update query with results
            query.results = {
                data: result.data,
                count: result.count,
                limited: result.limited
            };
            query.executionTime = result.executionTime;
            query.status = result.success ? 'success' : 'error';

            if (!result.success) {
                query.errorMessage = result.error;
            }

        } catch (error) {
            logger.error('Query execution error', error);
            query.status = 'error';
            query.errorMessage = error.message;
            query.executionTime = 0;
        }

        await query.save();

        // Broadcast query result
        realtimeService.broadcastQueryResult(sessionId, query._id, {
            success: query.status === 'success',
            count: query.results.count,
            executionTime: query.executionTime
        }, req.user._id);

        logger.query(queryText, query.executionTime);

        // Return results
        res.json({
            success: query.status === 'success',
            queryId: query._id,
            results: query.results,
            executionTime: query.executionTime,
            error: query.errorMessage
        });

    } catch (error) {
        logger.error('Execute query error', error);
        res.status(500).json({
            success: false,
            message: 'Failed to execute query',
            error: error.message
        });
    }
};

// Get query history
exports.getQueryHistory = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const session = await Session.findById(sessionId);
        if (!session || !session.isMember(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const queries = await Query.getSessionHistory(sessionId, page, limit);

        res.json({
            success: true,
            queries,
            page,
            limit
        });

    } catch (error) {
        logger.error('Get query history error', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load query history'
        });
    }
};

// Get single query details
exports.getQuery = async (req, res) => {
    try {
        const { id } = req.params;

        const query = await Query.findById(id)
            .populate('userId', 'name email avatar')
            .populate('datasetId', 'name')
            .populate('sessionId', 'name');

        if (!query) {
            return res.status(404).json({
                success: false,
                message: 'Query not found'
            });
        }

        // Check session access
        const session = await Session.findById(query.sessionId);
        if (!session || !session.isMember(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            query
        });

    } catch (error) {
        logger.error('Get query error', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load query'
        });
    }
};

// Delete query
exports.deleteQuery = async (req, res) => {
    try {
        const { id } = req.params;

        const query = await Query.findById(id);

        if (!query) {
            return res.status(404).json({
                success: false,
                message: 'Query not found'
            });
        }

        // Only query creator or session owner can delete
        const session = await Session.findById(query.sessionId);
        if (query.userId.toString() !== req.user._id.toString() &&
            !session.isOwner(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to delete this query'
            });
        }

        await query.deleteOne();

        logger.info(`Query deleted: ${id}`);

        res.json({
            success: true,
            message: 'Query deleted successfully'
        });

    } catch (error) {
        logger.error('Delete query error', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete query'
        });
    }
};