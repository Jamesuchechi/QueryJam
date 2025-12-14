const Session = require('../models/Session');
const Dataset = require('../models/Dataset');
const Query = require('../models/Query');
const Message = require('../models/Message');
const logger = require('../utils/logger');
const realtimeService = require('../services/realtimeService');

// Get dashboard with user's sessions
exports.getDashboard = async (req, res) => {
    try {
        const userId = req.user._id;

        // Get user's sessions
        const sessions = await Session.findUserSessions(userId);
        const recentSessions = sessions.slice(0, 5); // Get 5 most recent

        // Calculate stats
        const activeSessions = sessions.filter(s => s.isActive).length;
        const totalQueries = await Query.countDocuments({ sessionId: { $in: sessions.map(s => s._id) } });
        const totalDatasets = await Dataset.countDocuments({ ownerId: userId });

        // Get recent activity (simplified - in real app, you'd have an activity log)
        const recentQueries = await Query.find({ sessionId: { $in: sessions.map(s => s._id) } })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('sessionId', 'name');

        const recentActivity = recentQueries.map(query => ({
            description: `Query executed in ${query.sessionId.name}`,
            timestamp: query.createdAt,
            icon: 'search'
        }));

        // Add session creation activity
        const recentSessionCreations = sessions.slice(0, 3).map(session => ({
            description: `Created session "${session.name}"`,
            timestamp: session.createdAt,
            icon: 'plus'
        }));

        const allActivity = [...recentActivity, ...recentSessionCreations]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 8);

        res.render('pages/dashboard', {
            title: 'Dashboard - QueryJam',
            user: req.user,
            sessions,
            recentSessions,
            stats: {
                activeSessions,
                totalQueries,
                totalDatasets,
                aiSuggestions: 0 // Placeholder - would need to track AI usage
            },
            recentActivity: allActivity
        });
    } catch (error) {
        logger.error('Get dashboard error', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            message: 'Failed to load dashboard'
        });
    }
};

// Render create session page
exports.getCreateSessionPage = (req, res) => {
    res.render('pages/create-session', {
        title: 'Create Session - QueryJam'
    });
};

// Create new session
exports.createSession = async (req, res) => {
    try {
        const { name, description, isPublic } = req.body;

        const session = await Session.create({
            name,
            description,
            ownerId: req.user._id,
            isPublic: isPublic === 'true' || isPublic === true,
            members: [{
                userId: req.user._id,
                role: 'owner',
                joinedAt: new Date()
            }]
        });

        logger.info(`Session created: ${session._id} by ${req.user.email}`);

        // For HTMX requests
        if (req.headers['hx-request']) {
            res.setHeader('HX-Redirect', `/sessions/${session._id}`);
            return res.status(200).send('');
        }

        res.redirect(`/sessions/${session._id}`);
    } catch (error) {
        logger.error('Create session error', error);

        if (req.headers['hx-request']) {
            return res.status(500).send(`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Failed to create session. Please try again.
        </div>
      `);
        }

        res.status(500).render('pages/create-session', {
            title: 'Create Session - QueryJam',
            error: 'Failed to create session'
        });
    }
};

// Get session details
exports.getSession = async (req, res) => {
    try {
        const { id } = req.params;

        const session = await Session.findById(id)
            .populate('ownerId', 'name email avatar')
            .populate('members.userId', 'name email avatar')
            .populate('activeDatasetId');

        if (!session) {
            return res.status(404).render('pages/error', {
                title: 'Not Found',
                message: 'Session not found'
            });
        }

        // Check if user has access
        if (!session.isMember(req.user._id) && !session.isPublic) {
            return res.status(403).render('pages/error', {
                title: 'Forbidden',
                message: 'You do not have access to this session'
            });
        }

        // Add user as member if viewing public session
        if (session.isPublic && !session.isMember(req.user._id)) {
            await session.addMember(req.user._id, 'viewer');
        }

        // Get session data
        const datasets = await Dataset.findBySession(id);
        const queries = await Query.getSessionHistory(id);
        const messages = await Message.getRecent(id);

        res.render('pages/session', {
            title: `${session.name} - QueryJam`,
            session,
            datasets,
            queries,
            messages,
            userRole: session.getUserRole(req.user._id),
            canEdit: session.canEdit(req.user._id)
        });
    } catch (error) {
        logger.error('Get session error', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            message: 'Failed to load session'
        });
    }
};

// Update session
exports.updateSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, isPublic } = req.body;

        const session = await Session.findById(id);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        // Check if user is owner
        if (!session.isOwner(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: 'Only the session owner can update settings'
            });
        }

        // Update fields
        if (name) session.name = name;
        if (description !== undefined) session.description = description;
        if (isPublic !== undefined) session.isPublic = isPublic;

        await session.save();

        logger.info(`Session updated: ${session._id}`);

        res.json({
            success: true,
            message: 'Session updated successfully',
            session
        });
    } catch (error) {
        logger.error('Update session error', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update session'
        });
    }
};

// Delete session
exports.deleteSession = async (req, res) => {
    try {
        const { id } = req.params;

        const session = await Session.findById(id);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        // Check if user is owner
        if (!session.isOwner(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: 'Only the session owner can delete the session'
            });
        }

        // Delete associated data
        await Dataset.deleteMany({ sessionId: id });
        await Query.deleteMany({ sessionId: id });
        await Message.deleteMany({ sessionId: id });
        await session.deleteOne();

        logger.info(`Session deleted: ${id}`);

        res.json({
            success: true,
            message: 'Session deleted successfully'
        });
    } catch (error) {
        logger.error('Delete session error', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete session'
        });
    }
};

// Join session by access code
exports.joinSession = async (req, res) => {
    try {
        const { accessCode } = req.body;

        const session = await Session.findByAccessCode(accessCode);

        if (!session) {
            if (req.headers['hx-request']) {
                return res.status(404).send(`
          <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Invalid access code
          </div>
        `);
            }
            return res.status(404).json({
                success: false,
                message: 'Invalid access code'
            });
        }

        // Check if already a member
        if (session.isMember(req.user._id)) {
            if (req.headers['hx-request']) {
                res.setHeader('HX-Redirect', `/sessions/${session._id}`);
                return res.status(200).send('');
            }
            return res.redirect(`/sessions/${session._id}`);
        }

        // Add as member
        await session.addMember(req.user._id, 'editor');

        // Broadcast member joined
        realtimeService.broadcastMemberJoined(session._id, {
            userId: req.user._id,
            name: req.user.name,
            avatar: req.user.avatar,
            role: 'editor'
        });

        logger.info(`User ${req.user.email} joined session ${session._id}`);

        if (req.headers['hx-request']) {
            res.setHeader('HX-Redirect', `/sessions/${session._id}`);
            return res.status(200).send('');
        }

        res.redirect(`/sessions/${session._id}`);
    } catch (error) {
        logger.error('Join session error', error);

        if (req.headers['hx-request']) {
            return res.status(500).send(`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Failed to join session
        </div>
      `);
        }

        res.status(500).json({
            success: false,
            message: 'Failed to join session'
        });
    }
};

// Leave session
exports.leaveSession = async (req, res) => {
    try {
        const { id } = req.params;

        const session = await Session.findById(id);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        // Owner cannot leave
        if (session.isOwner(req.user._id)) {
            return res.status(400).json({
                success: false,
                message: 'Session owner cannot leave. Delete the session instead.'
            });
        }

        await session.removeMember(req.user._id);

        // Broadcast member left
        realtimeService.broadcastMemberLeft(session._id, req.user._id);

        logger.info(`User ${req.user.email} left session ${id}`);

        res.json({
            success: true,
            message: 'Left session successfully'
        });
    } catch (error) {
        logger.error('Leave session error', error);
        res.status(500).json({
            success: false,
            message: 'Failed to leave session'
        });
    }
};

// Stream real-time events for a session (SSE)
exports.streamEvents = async (req, res) => {
    try {
        const { id } = req.params;

        const session = await Session.findById(id);

        if (!session) {
            return res.status(404).send('Session not found');
        }

        if (!session.isMember(req.user._id)) {
            return res.status(403).send('Access denied');
        }

        // Set SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        });

        // Send initial connection message
        res.write(`data: ${JSON.stringify({ type: 'connected', sessionId: id, userId: req.user._id })}\n\n`);

        // Event listeners for this session
        const handleQueryUpdate = (data) => {
            if (data.sessionId.toString() === id) {
                res.write(`data: ${JSON.stringify({ type: 'query:update', ...data })}\n\n`);
            }
        };

        const handleQueryResult = (data) => {
            if (data.sessionId.toString() === id) {
                res.write(`data: ${JSON.stringify({ type: 'query:result', ...data })}\n\n`);
            }
        };

        const handleMemberJoined = (data) => {
            if (data.sessionId.toString() === id) {
                res.write(`data: ${JSON.stringify({ type: 'member:joined', ...data })}\n\n`);
            }
        };

        const handleMemberLeft = (data) => {
            if (data.sessionId.toString() === id) {
                res.write(`data: ${JSON.stringify({ type: 'member:left', ...data })}\n\n`);
            }
        };

        // Attach listeners
        realtimeService.on('query:update', handleQueryUpdate);
        realtimeService.on('query:result', handleQueryResult);
        realtimeService.on('member:joined', handleMemberJoined);
        realtimeService.on('member:left', handleMemberLeft);

        // Clean up on client disconnect
        req.on('close', () => {
            realtimeService.removeListener('query:update', handleQueryUpdate);
            realtimeService.removeListener('query:result', handleQueryResult);
            realtimeService.removeListener('member:joined', handleMemberJoined);
            realtimeService.removeListener('member:left', handleMemberLeft);
            logger.info(`SSE connection closed for session ${id}, user ${req.user._id}`);
        });

        logger.info(`SSE connection established for session ${id}, user ${req.user._id}`);

    } catch (error) {
        logger.error('Stream events error', error);
        res.status(500).send('Internal server error');
    }
};