const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: [true, 'Message content is required'],
        trim: true,
        maxlength: [2000, 'Message cannot exceed 2000 characters']
    },
    type: {
        type: String,
        enum: ['text', 'query-comment', 'system'],
        default: 'text'
    },
    relatedQueryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Query',
        default: null
    },
    mentions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    reactions: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        emoji: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    isEdited: {
        type: Boolean,
        default: false
    },
    editedAt: {
        type: Date
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: false
});

// Indexes
messageSchema.index({ sessionId: 1, createdAt: -1 });
messageSchema.index({ userId: 1 });

// Method to add reaction
messageSchema.methods.addReaction = function (userId, emoji) {
    // Check if user already reacted with this emoji
    const existingReaction = this.reactions.find(r =>
        r.userId.toString() === userId.toString() && r.emoji === emoji
    );

    if (existingReaction) {
        throw new Error('User has already reacted with this emoji');
    }

    this.reactions.push({
        userId,
        emoji,
        createdAt: new Date()
    });

    return this.save();
};

// Method to remove reaction
messageSchema.methods.removeReaction = function (userId, emoji) {
    this.reactions = this.reactions.filter(r =>
        !(r.userId.toString() === userId.toString() && r.emoji === emoji)
    );
    return this.save();
};

// Method to edit message
messageSchema.methods.editContent = function (newContent) {
    this.content = newContent;
    this.isEdited = true;
    this.editedAt = new Date();
    return this.save();
};

// Method to soft delete message
messageSchema.methods.softDelete = function () {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.content = '[Message deleted]';
    return this.save();
};

// Method to check if user can edit/delete
messageSchema.methods.canModify = function (userId) {
    return this.userId.toString() === userId.toString();
};

// Static method to find session messages
messageSchema.statics.findBySession = function (sessionId, limit = 100) {
    return this.find({ sessionId, isDeleted: false })
        .populate('userId', 'name email avatar')
        .populate('mentions', 'name')
        .populate('reactions.userId', 'name')
        .sort({ createdAt: 1 })
        .limit(limit);
};

// Static method to get recent messages
messageSchema.statics.getRecent = function (sessionId, limit = 50) {
    return this.find({ sessionId, isDeleted: false })
        .populate('userId', 'name avatar')
        .select('userId content type createdAt reactions')
        .sort({ createdAt: -1 })
        .limit(limit)
        .then(messages => messages.reverse()); // Return in chronological order
};

// Static method to create system message
messageSchema.statics.createSystemMessage = async function (sessionId, content) {
    const systemMessage = new this({
        sessionId,
        userId: null, // System messages have no user
        content,
        type: 'system'
    });

    return systemMessage.save();
};

module.exports = mongoose.model('Message', messageSchema);