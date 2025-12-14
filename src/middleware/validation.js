const { body, validationResult } = require('express-validator');

const validateSignup = [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const validateLogin = [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required')
];

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const first = errors.array()[0];

        // HTMX request handling
        if (req.headers['hx-request']) {
            return res.status(400).send(`<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">${first.msg}</div>`);
        }

        if (req.headers['content-type']?.includes('application/json')) {
            return res.status(400).json({ success: false, message: first.msg, errors: errors.array() });
        }

        // Default to render page with error
        return res.status(400).render('pages/error', { title: 'Validation Error', message: first.msg });
    }

    next();
};

module.exports = {
    validateSignup,
    validateLogin,
    handleValidationErrors
};
