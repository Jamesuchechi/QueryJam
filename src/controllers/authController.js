const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const logger = require('../utils/logger');

// Render signup page
exports.getSignupPage = (req, res) => {
    // Redirect if already logged in
    if (req.session.user) {
        return res.redirect('/dashboard');
    }

    // Prevent caching to avoid stale HTML
    res.set('Cache-Control', 'no-store');

    res.render('pages/signup', {
        title: 'Sign Up - QueryJam'
    });
};

// Render login page
exports.getLoginPage = (req, res) => {
    // Redirect if already logged in
    if (req.session.user) {
        return res.redirect('/dashboard');
    }

    // Prevent caching to avoid stale HTML
    res.set('Cache-Control', 'no-store');

    res.render('pages/login', {
        title: 'Login - QueryJam'
    });
};

// Handle user signup
exports.signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            if (req.headers['hx-request']) {
                return res.status(400).send(`
          <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Email already registered. Please <a href="/auth/login" class="underline">login</a> instead.
          </div>
        `);
            }
            return res.status(400).render('pages/signup', {
                title: 'Sign Up - QueryJam',
                error: 'Email already registered'
            });
        }

        // Create new user
        const user = await User.create({
            name,
            email,
            password
        });

        // Generate token
        const token = generateToken(user._id);

        // Save token in session
        req.session.token = token;
        req.session.user = user.toPublicJSON();

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        logger.info(`New user registered: ${email}`);

        // For HTMX requests
        if (req.headers['hx-request']) {
            res.setHeader('HX-Redirect', '/dashboard');
            return res.status(200).send('');
        }

        // Regular redirect
        res.redirect('/dashboard');
    } catch (error) {
        logger.error('Signup error', error);

        if (req.headers['hx-request']) {
            return res.status(500).send(`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Registration failed. Please try again.
        </div>
      `);
        }

        res.status(500).render('pages/signup', {
            title: 'Sign Up - QueryJam',
            error: 'Registration failed. Please try again.'
        });
    }
};

// Handle user login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user and include password for verification
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            if (req.headers['hx-request']) {
                return res.status(401).send(`
          <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Invalid email or password
          </div>
        `);
            }
            return res.status(401).render('pages/login', {
                title: 'Login - QueryJam',
                error: 'Invalid email or password'
            });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            if (req.headers['hx-request']) {
                return res.status(401).send(`
          <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Invalid email or password
          </div>
        `);
            }
            return res.status(401).render('pages/login', {
                title: 'Login - QueryJam',
                error: 'Invalid email or password'
            });
        }

        // Generate token
        const token = generateToken(user._id);

        // Save in session
        req.session.token = token;
        req.session.user = user.toPublicJSON();

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        logger.info(`User logged in: ${email}`);

        // For HTMX requests
        if (req.headers['hx-request']) {
            res.setHeader('HX-Redirect', '/dashboard');
            return res.status(200).send('');
        }

        // Regular redirect
        res.redirect('/dashboard');
    } catch (error) {
        logger.error('Login error', error);

        if (req.headers['hx-request']) {
            return res.status(500).send(`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Login failed. Please try again.
        </div>
      `);
        }

        res.status(500).render('pages/login', {
            title: 'Login - QueryJam',
            error: 'Login failed. Please try again.'
        });
    }
};

// Handle user logout
exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            logger.error('Logout error', err);
        }
        res.redirect('/');
    });
};

// Get current user profile
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).render('pages/error', {
                title: 'Not Found',
                message: 'User not found'
            });
        }

        res.render('pages/profile', {
            title: 'Profile - QueryJam',
            profile: user.toPublicJSON()
        });
    } catch (error) {
        logger.error('Get profile error', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            message: 'Failed to load profile'
        });
    }
};

// Update user profile
exports.updateProfile = async (req, res) => {
    try {
        const { name, email } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update fields
        if (name) user.name = name;
        if (email && email !== user.email) {
            // Check if email already exists
            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already in use'
                });
            }
            user.email = email;
        }

        await user.save();

        // Update session
        req.session.user = user.toPublicJSON();

        logger.info(`Profile updated for user: ${user.email}`);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: user.toPublicJSON()
        });
    } catch (error) {
        logger.error('Update profile error', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
};
