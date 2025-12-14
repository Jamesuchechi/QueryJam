// Simple console logger
// For production, consider using Winston or similar

const logger = {
    info: (message, meta = {}) => {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta);
    },

    error: (message, error = null) => {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
        if (error) {
            console.error(error);
        }
    },

    warn: (message, meta = {}) => {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta);
    },

    debug: (message, meta = {}) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta);
        }
    },

    query: (queryText, executionTime) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[QUERY] ${executionTime}ms - ${queryText.substring(0, 100)}...`);
        }
    }
};

module.exports = logger;