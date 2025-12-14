const EventEmitter = require('events');
const logger = require('../utils/logger');

class RealtimeService extends EventEmitter {
    constructor() {
        super();
    }

    broadcastQueryUpdate(sessionId, query, userId) {
        this.emit('query:update', { sessionId, query, userId });
        logger.info('Broadcast query update', { sessionId, queryId: query._id });
    }

    broadcastQueryResult(sessionId, queryId, payload, userId) {
        this.emit('query:result', { sessionId, queryId, payload, userId });
        logger.info('Broadcast query result', { sessionId, queryId });
    }

    broadcastMemberJoined(sessionId, member) {
        this.emit('member:joined', { sessionId, member });
        logger.info('Broadcast member joined', { sessionId, member });
    }

    broadcastMemberLeft(sessionId, userId) {
        this.emit('member:left', { sessionId, userId });
        logger.info('Broadcast member left', { sessionId, userId });
    }
}

module.exports = new RealtimeService();
