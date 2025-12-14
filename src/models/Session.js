const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'viewer' },
    joinedAt: { type: Date, default: Date.now }
});

const sessionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: { type: [memberSchema], default: [] },
    isPublic: { type: Boolean, default: false },
    accessCode: { type: String, default: null },
    activeDatasetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset', default: null },
    createdAt: { type: Date, default: Date.now }
});

sessionSchema.methods.isMember = function (userId) {
    return this.members.some(m => m.userId.toString() === userId.toString());
};

sessionSchema.methods.isOwner = function (userId) {
    return this.ownerId.toString() === userId.toString();
};

sessionSchema.methods.addMember = async function (userId, role = 'viewer') {
    if (this.isMember(userId)) return this;
    this.members.push({ userId, role, joinedAt: new Date() });
    return this.save();
};

sessionSchema.methods.removeMember = async function (userId) {
    this.members = this.members.filter(m => m.userId.toString() !== userId.toString());
    return this.save();
};

sessionSchema.methods.getUserRole = function (userId) {
    const member = this.members.find(m => m.userId.toString() === userId.toString());
    return member ? member.role : 'none';
};

sessionSchema.methods.canEdit = function (userId) {
    if (!userId) return false;
    if (this.isOwner(userId)) return true;
    const member = this.members.find(m => m.userId.toString() === userId.toString());
    return member ? (member.role === 'owner' || member.role === 'editor') : false;
};

sessionSchema.statics.findUserSessions = function (userId) {
    return this.find({ $or: [{ ownerId: userId }, { 'members.userId': userId }] }).sort({ createdAt: -1 });
};

sessionSchema.statics.findByAccessCode = function (code) {
    return this.findOne({ accessCode: code });
};

module.exports = mongoose.model('Session', sessionSchema);
