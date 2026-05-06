// Debugging: Catch and log errors that might be crashing the server
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
});

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'your_super_secret_key_change_me_in_production';

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Setup
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Create users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user'
        )`);
    }
});

// Helper: Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // Format: Bearer TOKEN
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
        req.user = user;
        next();
    });
};

// Routes

// 1. Register User
app.post('/api/register', async (req, res) => {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const userRole = role === 'admin' ? 'admin' : 'user';

        const sql = 'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)';
        db.run(sql, [username, email, hashedPassword, userRole], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ error: 'Username or email already exists.' });
                }
                return res.status(500).json({ error: 'Database error.', details: err.message });
            }
            res.status(201).json({ message: 'User registered successfully!', id: this.lastID });
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// 2. Login User
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    const sql = 'SELECT * FROM users WHERE username = ?';
    db.get(sql, [username], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        if (!user) return res.status(401).json({ error: 'Invalid username or password.' });

        try {
            if (await bcrypt.compare(password, user.password)) {
                // Generate JWT
                const token = jwt.sign(
                    { id: user.id, username: user.username, role: user.role },
                    SECRET_KEY,
                    { expiresIn: '1h' }
                );
                res.json({ message: 'Login successful.', token, role: user.role });
            } else {
                res.status(401).json({ error: 'Invalid username or password.' });
            }
        } catch (err) {
            res.status(500).json({ error: 'Internal server error.' });
        }
    });
});

// 3. Protected Route (User Details)
app.get('/api/me', authenticateToken, (req, res) => {
    // req.user contains the decoded token data
    res.json({ 
        message: 'Access granted to protected route.', 
        user: req.user 
    });
});

// 4. Admin Only Protected Route
app.get('/api/admin', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
    res.json({ message: 'Welcome Admin! You have accessed a highly protected route.' });
});

// Start Server
app.listen(PORT, () => {
    console.log("Prodigy Auth Backend initialized on port " + PORT);
});
