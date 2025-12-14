require('dotenv').config();
const express = require('express');
const { engine } = require('express-handlebars');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');

// Import database connection
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessions');
const queryRoutes = require('./routes/queries');
const datasetRoutes = require('./routes/datasets');
const aiRoutes = require('./routes/ai');

// Import middleware
const { isAuthenticated } = require('./middleware/auth');

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disabled for development, configure for production
}));

// CORS
app.use(cors());

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        touchAfter: 24 * 3600 // Lazy session update (24 hours)
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    }
}));

// Handlebars setup
app.engine('hbs', engine({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views/layout'),
    partialsDir: path.join(__dirname, 'views/partials'),
    helpers: {
        // Custom helpers
        userInitial: (name) => {
            if (!name) return '';
            return name.charAt(0).toUpperCase();
        },
        eq: (a, b) => a === b,
        ne: (a, b) => a !== b,
        gt: (a, b) => a > b,
        lt: (a, b) => a < b,
        and: (a, b) => a && b,
        or: (a, b) => a || b,
        formatDate: (date) => {
            if (!date) return '';
            return new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        },
        formatDateTime: (date) => {
            if (!date) return '';
            return new Date(date).toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },
        timeAgo: (date) => {
            if (!date) return '';
            const seconds = Math.floor((new Date() - new Date(date)) / 1000);

            let interval = seconds / 31536000;
            if (interval > 1) return Math.floor(interval) + ' years ago';

            interval = seconds / 2592000;
            if (interval > 1) return Math.floor(interval) + ' months ago';

            interval = seconds / 86400;
            if (interval > 1) return Math.floor(interval) + ' days ago';

            interval = seconds / 3600;
            if (interval > 1) return Math.floor(interval) + ' hours ago';

            interval = seconds / 60;
            if (interval > 1) return Math.floor(interval) + ' minutes ago';

            return 'just now';
        },
        truncate: (str, len) => {
            if (!str) return '';
            if (str.length <= len) return str;
            return str.substring(0, len) + '...';
        }
    }
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Make user available to all templates
app.use(isAuthenticated);

// Routes
app.get('/', (req, res) => {
    // Redirect to dashboard if logged in
    if (req.session.user) {
        return res.redirect('/dashboard');
    }

    res.render('pages/index', {
        title: 'QueryJam - Collaborative Data Playground'
    });
});

// Friendly top-level routes for auth pages
app.get('/login', (req, res) => res.redirect('/auth/login'));
app.get('/signup', (req, res) => res.redirect('/auth/signup'));

// Dashboard shortcut
app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    res.redirect('/sessions');
});

// Use routes
app.use('/auth', authRoutes);
app.use('/sessions', sessionRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/ai', aiRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).render('pages/error', {
        title: '404 - Page Not Found',
        message: 'The page you are looking for does not exist.'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);

    // Multer errors
    if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 10MB.'
            });
        }
    }

    res.status(err.status || 500).render('pages/error', {
        title: 'Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// Export app for server entry point and testing
module.exports = app;
