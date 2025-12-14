// Simple in-memory rate limiter
// For production, consider using Redis-based rate limiting

const rateLimitStore = new Map();

// Clean up old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
        if (now - value.resetTime > 0) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

// Generic rate limiter
const createRateLimiter = (options = {}) => {
    const {
        windowMs = 15 * 60 * 1000, // 15 minutes
        max = 100, // limit each IP to 100 requests per windowMs
        message = 'Too many requests, please try again later',
        keyGenerator = (req) => req.ip || req.connection.remoteAddress
    } = options;

    return (req, res, next) => {
        const key = keyGenerator(req);
        const now = Date.now();

        let record = rateLimitStore.get(key);

        if (!record) {
            record = {
                count: 1,
                resetTime: now + windowMs
            };
            rateLimitStore.set(key, record);
            return next();
        }

        // Reset if window has passed
        if (now > record.resetTime) {
            record.count = 1;
            record.resetTime = now + windowMs;
            rateLimitStore.set(key, record);
            return next();
        }

        // Increment count
        record.count++;

        // Check if limit exceeded
        if (record.count > max) {
            // For HTMX requests
            if (req.headers['hx-request']) {
                return res.status(429).send(`
          <div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            ${message}
          </div>
        `);
            }

            // For API requests
            if (req.headers['content-type']?.includes('application/json')) {
                return res.status(429).json({
                    success: false,
                    message
                });
            }

            // For regular requests
            return res.status(429).render('pages/error', {
                title: 'Too Many Requests',
                message
            });
        }

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', max - record.count);
        res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());

        next();
    };
};

// Rate limiter for authentication routes
exports.authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
    message: 'Too many login attempts, please try again later'
});

// Rate limiter for API routes
exports.apiLimiter = createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: 'Too many API requests, please slow down'
});

// Rate limiter for query execution
exports.queryLimiter = createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 queries per minute
    message: 'Too many queries, please wait a moment',
    keyGenerator: (req) => req.user ? req.user._id.toString() : req.ip
});

// Rate limiter for file uploads
exports.uploadLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 uploads per hour
    message: 'Too many file uploads, please try again later',
    keyGenerator: (req) => req.user ? req.user._id.toString() : req.ip
});

// Rate limiter for message creation
exports.messageLimiter = createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20, // 20 messages per minute
    message: 'Slow down! Too many messages sent',
    keyGenerator: (req) => req.user ? req.user._id.toString() : req.ip
});