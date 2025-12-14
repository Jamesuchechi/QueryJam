const mongoose = require('mongoose');

// Validate MongoDB ObjectId
exports.isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

// Validate email format
exports.isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Validate password strength
exports.isStrongPassword = (password) => {
    // At least 6 characters, contains letter and number
    const minLength = password.length >= 6;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);

    return minLength && hasLetter && hasNumber;
};

// Sanitize user input (remove HTML tags)
exports.sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return input.replace(/<[^>]*>/g, '');
};

// Validate MongoDB query object
exports.isValidMongoQuery = (query) => {
    try {
        // Check if it's a valid object
        if (typeof query !== 'object' || query === null) {
            return false;
        }

        // Check for dangerous operators
        const dangerousOperators = ['$where', '$function'];
        const queryString = JSON.stringify(query);

        for (const op of dangerousOperators) {
            if (queryString.includes(op)) {
                return false;
            }
        }

        return true;
    } catch (error) {
        return false;
    }
};

// Validate file size (in bytes)
exports.isValidFileSize = (size, maxSize = 10 * 1024 * 1024) => {
    return size <= maxSize;
};

// Validate file type
exports.isValidFileType = (mimetype, allowedTypes = ['text/csv', 'application/json']) => {
    return allowedTypes.includes(mimetype);
};

// Format bytes to human readable
exports.formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};