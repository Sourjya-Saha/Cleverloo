const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const haversine = require('haversine-distance');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
require('dotenv').config();

// Extend Day.js with UTC and Timezone plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Set the default timezone for Day.js
dayjs.tz.setDefault('Asia/Kolkata');

// Initialize Express app
const app = express();

// CORS middleware to allow requests
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Middleware to parse JSON request bodies
app.use(express.json());

// Database connection pool configuration
let pool;
try {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? {
            rejectUnauthorized: false
        } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    });

    // CRITICAL ADDITION: Add an error listener to the pool
    pool.on('error', (err, client) => {
        console.error('FATAL: Unexpected error on idle PostgreSQL client:', err);
    });

    // Test database connection on startup (optional for serverless)
    if (process.env.NODE_ENV !== 'production') {
        pool.connect((err, client, release) => {
            if (err) {
                if (err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
                    console.error('Database connection failed: ETIMEDOUT or ENOTFOUND.');
                }
                return console.error('Error acquiring client:', err.stack);
            }
            console.log('Successfully connected to the database!');
            release();
        });
    }
} catch (error) {
    console.error('Error initializing database pool:', error);
}

// Secret key for JWT token generation.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('JWT_SECRET is not defined in environment variables. Please set it.');
    // Don't exit in serverless environment, just log the error
    if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
    }
}

// Middleware to verify JWT token (for protected routes)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) {
        return res.status(401).json({ message: 'Authentication token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user; // Attach user payload to request object
        next();
    });
};

// Root route - Custom welcome message
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Backend for Cleverloo working and running perfectly',
        status: 'success',
        timestamp: dayjs().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss [IST]'),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({
        message: 'Restroom Queueing backend running successfully',
        timestamp: dayjs().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss [IST]'),
        status: 'healthy'
    });
});

// --- USER ROUTES ---

// 1. User Sign-Up Route
app.post('/signup/user', async (req, res) => {
    const { name, phone, password } = req.body;

    if (!name || !phone || !password) {
        return res.status(400).json({ message: 'Name, phone number, and password are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const checkExisting = await pool.query('SELECT user_id FROM users WHERE phone = $1', [phone]);

        if (checkExisting.rows.length > 0) {
            return res.status(409).json({ message: 'User with this phone number already exists.' });
        }

        const result = await pool.query(
            'INSERT INTO users (name, phone, password_hash) VALUES ($1, $2, $3) RETURNING user_id, name, phone',
            [name, phone, hashedPassword]
        );

        const newUser = result.rows[0];
        const token = jwt.sign(
            { id: newUser.user_id, role: 'user', phone: newUser.phone },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'User signed up successfully!',
            user: {
                id: newUser.user_id,
                name: newUser.name,
                phone: newUser.phone,
            },
            token
        });

    } catch (error) {
        console.error('Error during user sign-up:', error);
        res.status(500).json({ message: 'Internal server error during sign-up.' });
    }
});

// 2. User Sign-In Route
app.post('/signin/user', async (req, res) => {
    const { phone, password } = req.body;

    if (!phone || !password) {
        return res.status(400).json({ message: 'Phone number and password are required.' });
    }

    try {
        const result = await pool.query('SELECT user_id, name, password_hash FROM users WHERE phone = $1', [phone]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Invalid phone number or password.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid phone number or password.' });
        }

        const token = jwt.sign(
            { id: user.user_id, role: 'user', phone: phone },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            message: 'User signed in successfully!',
            user: {
                id: user.user_id,
                name: user.name,
                phone: phone,
            },
            token
        });

    } catch (error) {
        console.error('Error during user sign-in:', error);
        res.status(500).json({ message: 'Internal server error during sign-in.' });
    }
});

// --- RESTROOM ROUTES ---

// 3. Restroom Sign-Up Route
app.post('/signup/restroom', async (req, res) => {
    const { name, address, phone, password, latitude, longitude, type = 'public', pictures } = req.body;

    if (!name || !address || !phone || !password || !latitude || !longitude) {
        return res.status(400).json({ message: 'Name, address, phone, password, latitude, and longitude are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const checkExisting = await pool.query('SELECT restroom_id FROM restrooms WHERE phone = $1', [phone]);

        if (checkExisting.rows.length > 0) {
            return res.status(409).json({ message: 'Restroom with this phone number already exists.' });
        }

        const result = await pool.query(
            'INSERT INTO restrooms (name, address, phone, password_hash, latitude, longitude, type, pictures) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING restroom_id, name, phone, type',
            [name, address, phone, hashedPassword, latitude, longitude, type, pictures]
        );

        const newRestroom = result.rows[0];
        const token = jwt.sign(
            { id: newRestroom.restroom_id, role: 'restroom', phone: newRestroom.phone },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'Restroom signed up successfully!',
            restroom: {
                id: newRestroom.restroom_id,
                name: newRestroom.name,
                phone: newRestroom.phone,
                type: newRestroom.type
            },
            token
        });

    } catch (error) {
        console.error('Error during restroom sign-up:', error);
        res.status(500).json({ message: 'Internal server error during sign-up.' });
    }
});

// 4. Restroom Sign-In Route
app.post('/signin/restroom', async (req, res) => {
    const { phone, password } = req.body;

    if (!phone || !password) {
        return res.status(400).json({ message: 'Phone number and password are required.' });
    }

    try {
        const result = await pool.query('SELECT restroom_id, name, phone, password_hash, type FROM restrooms WHERE phone = $1', [phone]);
        const restroom = result.rows[0];

        if (!restroom) {
            return res.status(401).json({ message: 'Invalid phone number or password.' });
        }

        const isPasswordValid = await bcrypt.compare(password, restroom.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid phone number or password.' });
        }

        const token = jwt.sign(
            { id: restroom.restroom_id, role: 'restroom', phone: restroom.phone },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            message: 'Restroom signed in successfully!',
            restroom: {
                id: restroom.restroom_id,
                name: restroom.name,
                phone: restroom.phone,
                type: restroom.type
            },
            token
        });

    } catch (error) {
        console.error('Error during restroom sign-in:', error);
        res.status(500).json({ message: 'Internal server error during sign-in.' });
    }
});

// --- DATA ROUTES (Protected and Public) ---

// 5. Add Restroom Route (Protected)
app.post('/restrooms', authenticateToken, async (req, res) => {
    const { name, address, phone, latitude, longitude, type, pictures } = req.body;

    if (!name || !address || !latitude || !longitude) {
        return res.status(400).json({ message: 'Name, address, latitude, and longitude are required.' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO restrooms (name, address, phone, latitude, longitude, type, pictures) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING restroom_id, name, address',
            [name, address, phone, latitude, longitude, type, pictures]
        );

        res.status(201).json({
            message: 'Restroom added successfully!',
            restroom: result.rows[0]
        });

    } catch (error) {
        console.error('Error adding restroom:', error);
        res.status(500).json({ message: 'Internal server error while adding restroom.' });
    }
});

// 6. Get All Restrooms Route
app.get('/restrooms', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM restrooms');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching restrooms:', error);
        res.status(500).json({ message: 'Internal server error while fetching restrooms.' });
    }
});

// 8. Search Restrooms by Proximity and Filters (MOVED BEFORE :id route)
app.get('/restrooms/search', authenticateToken, async (req, res) => {
    const { latitude, longitude, query, gender, paid } = req.query;

    if (!latitude || !longitude) {
        return res.status(400).json({ message: 'User latitude and longitude are required.' });
    }

    try {
        // Updated query to select all columns from restrooms
        let sqlQuery = 'SELECT * FROM restrooms';
        const queryParams = [];
        let whereClauses = [];

        if (query) {
            queryParams.push(`%${query}%`);
            whereClauses.push('(name ILIKE $1 OR address ILIKE $1)');
        }

        if (gender) {
            whereClauses.push(`gender = '${gender}'`);
        }

        if (paid) {
            // Since you don't have is_paid column, filter by type = 'paid'
            whereClauses.push("type = 'paid'");
        }

        if (whereClauses.length > 0) {
            sqlQuery += ' WHERE ' + whereClauses.join(' AND ');
        }

        const restrooms = await pool.query(sqlQuery, queryParams);
        const userLocation = { latitude: parseFloat(latitude), longitude: parseFloat(longitude) };

        // Process each restroom to include detailed information
        const restroomsWithDetails = await Promise.all(
            restrooms.rows.map(async (restroom) => {
                const restroomLocation = { latitude: restroom.latitude, longitude: restroom.longitude };
                const distance = haversine(userLocation, restroomLocation); // in meters

                // Fetch all rooms associated with this restroom
                const roomsResult = await pool.query('SELECT * FROM rooms WHERE restroom_id = $1', [restroom.restroom_id]);
                const rooms = roomsResult.rows;

                // Fetch all reviews for the restroom and join with the users table to get the user's name
                const reviewsResult = await pool.query(
                    `SELECT r.*, u.name AS user_name 
                     FROM reviews r 
                     JOIN users u ON r.user_id = u.user_id 
                     WHERE r.restroom_id = $1`, 
                    [restroom.restroom_id]
                );
                const reviews = reviewsResult.rows;

                return {
                    ...restroom,
                    distance_km: (distance / 1000).toFixed(2), // convert to km
                    rooms: rooms,
                    reviews: reviews,
                };
            })
        );

        // Sort by distance
        const sortedRestrooms = restroomsWithDetails.sort((a, b) => parseFloat(a.distance_km) - parseFloat(b.distance_km));

        res.status(200).json(sortedRestrooms);
    } catch (error) {
        console.error('Error fetching nearby restrooms with details:', error);
        res.status(500).json({ message: 'Internal server error while fetching nearby restrooms.' });
    }
});

// 7. Get Restroom Details by ID (MOVED AFTER search route)
app.get('/restrooms/:id', async (req, res) => {
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
        return res.status(400).json({ message: 'Invalid restroom ID format.' });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM restrooms WHERE restroom_id = $1',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Restroom not found.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching restroom details:', error);
        res.status(500).json({ message: 'Internal server error while fetching restroom details.' });
    }
});

// NEW ROUTE: Get a specific restroom's full details, including rooms and reviews
app.get('/restrooms/:id/details', async (req, res) => {
    const { id } = req.params;

    try {
        // Fetch restroom details. The 'SELECT *' query automatically includes
        // the new 'description' column with its JSONB data.
        const restroomResult = await pool.query('SELECT * FROM restrooms WHERE restroom_id = $1', [id]);
        if (restroomResult.rows.length === 0) {
            return res.status(404).json({ message: 'Restroom not found.' });
        }
        const restroom = restroomResult.rows[0];

        // Fetch all rooms associated with this restroom.
        const roomsResult = await pool.query('SELECT * FROM rooms WHERE restroom_id = $1', [id]);
        const rooms = roomsResult.rows;

        // Fetch all reviews for the restroom and join with the users table to get the user's name.
        const reviewsResult = await pool.query(
            `SELECT r.*, u.name AS user_name 
             FROM reviews r 
             JOIN users u ON r.user_id = u.user_id 
             WHERE r.restroom_id = $1`, 
            [id]
        );
        const reviews = reviewsResult.rows;

        // Combine all fetched data into a single, cohesive response object.
        // The spread operator `...restroom` ensures the description field is included.
        const responseData = {
            ...restroom,
            rooms: rooms,
            reviews: reviews,
        };

        res.status(200).json(responseData);

    } catch (error) {
        console.error('Error fetching restroom details:', error);
        res.status(500).json({ message: 'Internal server error while fetching restroom details.' });
    }
});

// --- USER PROFILE MANAGEMENT ROUTES ---

// 9. Get User Profile Route (Protected)
app.get('/user/profile', authenticateToken, async (req, res) => {
    // Ensure only users can access this endpoint
    if (req.user.role !== 'user') {
        return res.status(403).json({ message: 'Access denied. Users only.' });
    }

    try {
        const result = await pool.query(
            'SELECT user_id, name, phone FROM users WHERE user_id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const user = result.rows[0];
        res.status(200).json({
            message: 'User profile retrieved successfully!',
            user: {
                id: user.user_id,
                name: user.name,
                phone: user.phone
            }
        });

    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Internal server error while fetching profile.' });
    }
});

// 10. Update User Profile Route (Protected)
app.put('/user/edit', authenticateToken, async (req, res) => {
    // Ensure only users can access this endpoint
    if (req.user.role !== 'user') {
        return res.status(403).json({ message: 'Access denied. Users only.' });
    }

    const { name, phone } = req.body;

    if (!name || !phone) {
        return res.status(400).json({ message: 'Name and phone number are required.' });
    }

    try {
        // Check if the new phone number is already taken by another user
        const phoneCheckResult = await pool.query(
            'SELECT user_id FROM users WHERE phone = $1 AND user_id != $2',
            [phone, req.user.id]
        );

        if (phoneCheckResult.rows.length > 0) {
            return res.status(409).json({ message: 'Phone number is already in use by another user.' });
        }

        // Update user profile
        const result = await pool.query(
            'UPDATE users SET name = $1, phone = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $3 RETURNING user_id, name, phone',
            [name, phone, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const updatedUser = result.rows[0];
        res.status(200).json({
            message: 'Profile updated successfully!',
            user: {
                id: updatedUser.user_id,
                name: updatedUser.name,
                phone: updatedUser.phone
            }
        });

    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ message: 'Internal server error while updating profile.' });
    }
});

// 11. Change User Password Route (Protected)
app.put('/user/change-password', authenticateToken, async (req, res) => {
    // Ensure only users can access this endpoint
    if (req.user.role !== 'user') {
        return res.status(403).json({ message: 'Access denied. Users only.' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required.' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    try {
        // Get current user's password hash
        const result = await pool.query(
            'SELECT password_hash FROM users WHERE user_id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const user = result.rows[0];

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({ message: 'Current password is incorrect.' });
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
            [hashedNewPassword, req.user.id]
        );

        res.status(200).json({
            message: 'Password changed successfully!'
        });

    } catch (error) {
        console.error('Error changing user password:', error);
        res.status(500).json({ message: 'Internal server error while changing password.' });
    }
});

// 12. Get Restroom Profile Route (Protected)
app.get('/restroom/profile', authenticateToken, async (req, res) => {
    // Ensure only restrooms can access this endpoint
    if (req.user.role !== 'restroom') {
        return res.status(403).json({ message: 'Access denied. Restrooms only.' });
    }

    try {
        const result = await pool.query(
            'SELECT restroom_id, name, address, phone, latitude, longitude, type, rating, pictures, gender FROM restrooms WHERE restroom_id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Restroom not found.' });
        }

        const restroom = result.rows[0];
        res.status(200).json({
            message: 'Restroom profile retrieved successfully!',
            restroom: {
                id: restroom.restroom_id,
                name: restroom.name,
                address: restroom.address,
                phone: restroom.phone,
                latitude: restroom.latitude,
                longitude: restroom.longitude,
                type: restroom.type,
                rating: restroom.rating,
                pictures: restroom.pictures,
                gender: restroom.gender
            }
        });

    } catch (error) {
        console.error('Error fetching restroom profile:', error);
        res.status(500).json({ message: 'Internal server error while fetching profile.' });
    }
});

// 13. Update Restroom Profile Route (Protected)
app.put('/restroom/edit', authenticateToken, async (req, res) => {
  if (req.user.role !== 'restroom') {
    return res.status(403).json({ message: 'Access denied. Restrooms only.' });
  }

  const { name, address, phone, latitude, longitude } = req.body;

  if (!name || !address || latitude == null || longitude == null) {
    return res.status(400).json({ message: 'Name, address, latitude, and longitude are required.' });
  }

  try {
    // Check if the new phone number is already taken by another restroom
    if (phone) {
      const phoneCheckResult = await pool.query(
        'SELECT restroom_id FROM restrooms WHERE phone = $1 AND restroom_id != $2',
        [phone, req.user.id]
      );

      if (phoneCheckResult.rows.length > 0) {
        return res.status(409).json({ message: 'Phone number is already in use by another restroom.' });
      }
    }

    // Update only the fields: name, address, phone, latitude, longitude
    const result = await pool.query(
      `UPDATE restrooms
       SET name = $1,
           address = $2,
           phone = $3,
           latitude = $4,
           longitude = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE restroom_id = $6
       RETURNING restroom_id, name, address, phone, latitude, longitude, type, rating, pictures, gender`,
      [name, address, phone, latitude, longitude, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Restroom not found.' });
    }

    const updatedRestroom = result.rows[0];
    res.status(200).json({
      message: 'Restroom profile updated successfully!',
      restroom: {
        id: updatedRestroom.restroom_id,
        name: updatedRestroom.name,
        address: updatedRestroom.address,
        phone: updatedRestroom.phone,
        latitude: updatedRestroom.latitude,
        longitude: updatedRestroom.longitude,
        type: updatedRestroom.type,
        rating: updatedRestroom.rating,
        pictures: updatedRestroom.pictures,
        gender: updatedRestroom.gender,
      },
    });
  } catch (error) {
    console.error('Error updating restroom profile:', error);
    res.status(500).json({ message: 'Internal server error while updating profile.' });
  }
});

// 14. Change Restroom Password Route (Protected)
app.put('/restroom/change-password', authenticateToken, async (req, res) => {
    // Ensure only restrooms can access this endpoint
    if (req.user.role !== 'restroom') {
        return res.status(403).json({ message: 'Access denied. Restrooms only.' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required.' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    try {
        // Get current restroom's password hash
        const result = await pool.query(
            'SELECT password_hash FROM restrooms WHERE restroom_id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Restroom not found.' });
        }

        const restroom = result.rows[0];

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, restroom.password_hash);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({ message: 'Current password is incorrect.' });
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await pool.query(
            'UPDATE restrooms SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE restroom_id = $2',
            [hashedNewPassword, req.user.id]
        );

        res.status(200).json({
            message: 'Password changed successfully!'
        });

    } catch (error) {
        console.error('Error changing restroom password:', error);
        res.status(500).json({ message: 'Internal server error while changing password.' });
    }
});

// 15. Delete User Account Route (Protected)
app.delete('/user/delete', authenticateToken, async (req, res) => {
    // Ensure only users can access this endpoint
    if (req.user.role !== 'user') {
        return res.status(403).json({ message: 'Access denied. Users only.' });
    }

    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ message: 'Password confirmation is required to delete account.' });
    }

    try {
        // Get current user's password hash
        const result = await pool.query(
            'SELECT password_hash FROM users WHERE user_id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const user = result.rows[0];

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Password is incorrect.' });
        }

        // Delete user account
        await pool.query('DELETE FROM users WHERE user_id = $1', [req.user.id]);

        res.status(200).json({
            message: 'User account deleted successfully!'
        });

    } catch (error) {
        console.error('Error deleting user account:', error);
        res.status(500).json({ message: 'Internal server error while deleting account.' });
    }
});

// 16. Delete Restroom Account Route (Protected)
app.delete('/restroom/delete', authenticateToken, async (req, res) => {
    // Ensure only restrooms can access this endpoint
    if (req.user.role !== 'restroom') {
        return res.status(403).json({ message: 'Access denied. Restrooms only.' });
    }

    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ message: 'Password confirmation is required to delete account.' });
    }

    try {
        // Get current restroom's password hash
        const result = await pool.query(
            'SELECT password_hash FROM restrooms WHERE restroom_id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Restroom not found.' });
        }

        const restroom = result.rows[0];

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, restroom.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Password is incorrect.' });
        }

        // Delete restroom account
        await pool.query('DELETE FROM restrooms WHERE restroom_id = $1', [req.user.id]);

        res.status(200).json({
            message: 'Restroom account deleted successfully!'
        });

    } catch (error) {
        console.error('Error deleting restroom account:', error);
        res.status(500).json({ message: 'Internal server error while deleting account.' });
    }
});

// Fix the user profile details route as well:
app.get('/user/profile/details', authenticateToken, async (req, res) => {
    // Ensure only users can access this endpoint
    if (req.user.role !== 'user') {
        return res.status(403).json({ message: 'Access denied. Users only.' });
    }

    try {
        const result = await pool.query(
            'SELECT user_id, name, phone FROM users WHERE user_id = $1',
            [req.user.id] // Changed from req.user.user_id
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const user = result.rows[0];
        res.status(200).json({
            id: user.user_id,
            name: user.name,
            phone: user.phone
        });

    } catch (error) {
        console.error('Error fetching user profile details:', error);
        res.status(500).json({ message: 'Internal server error while fetching profile details.' });
    }
});

// BOOKMARK ROUTES

// Get user bookmarks (returns array of restroom IDs)
app.get('/user/bookmarks', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const result = await pool.query(
            'SELECT bookmarks FROM users WHERE user_id = $1',
            [userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        // Ensure bookmarks is always an array
        let bookmarks = result.rows[0].bookmarks;
        
        // Handle different data types that might be stored
        if (typeof bookmarks === 'string') {
            try {
                bookmarks = JSON.parse(bookmarks);
            } catch (e) {
                bookmarks = [];
            }
        }
        
        // Ensure it's an array
        if (!Array.isArray(bookmarks)) {
            bookmarks = [];
        }
        
        res.status(200).json({ bookmarks });
        
    } catch (error) {
        console.error('Error fetching user bookmarks:', error);
        res.status(500).json({ message: 'Internal server error while fetching bookmarks.', bookmarks: [] });
    }
});

// Get detailed information about bookmarked washrooms
app.get('/user/bookmarks/details', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // First, get the user's bookmarks
        const userResult = await pool.query(
            'SELECT bookmarks FROM users WHERE user_id = $1',
            [userId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        let bookmarkIds = userResult.rows[0].bookmarks;
        
        // Handle different data types that might be stored
        if (typeof bookmarkIds === 'string') {
            try {
                bookmarkIds = JSON.parse(bookmarkIds);
            } catch (e) {
                bookmarkIds = [];
            }
        }
        
        // Ensure it's an array
        if (!Array.isArray(bookmarkIds)) {
            bookmarkIds = [];
        }
        
        if (bookmarkIds.length === 0) {
            return res.status(200).json({ bookmarks: [] });
        }
        
        // Get detailed information for each bookmarked restroom
        const placeholders = bookmarkIds.map((_, index) => `$${index + 1}`).join(',');
        const restroomsResult = await pool.query(
            `SELECT 
                r.*,
                COALESCE(
                    (SELECT COUNT(*) FROM reviews WHERE restroom_id = r.restroom_id), 
                    0
                ) as total_reviews
             FROM restrooms r 
             WHERE r.restroom_id IN (${placeholders})
             ORDER BY r.name`,
            bookmarkIds
        );
        
        res.status(200).json({ bookmarks: restroomsResult.rows });
        
    } catch (error) {
        console.error('Error fetching bookmarked washrooms details:', error);
        res.status(500).json({ message: 'Internal server error while fetching bookmarked washrooms.', bookmarks: [] });
    }
});

// Toggle bookmark (add/remove)
app.post('/user/bookmarks', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { restroomId } = req.body;
        
        if (!restroomId || !Number.isInteger(restroomId)) {
            return res.status(400).json({ message: 'Invalid restroom ID provided.' });
        }
        
        // Check if restroom exists
        const restroomCheck = await pool.query(
            'SELECT restroom_id FROM restrooms WHERE restroom_id = $1',
            [restroomId]
        );
        
        if (restroomCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Restroom not found.' });
        }
        
        // Get current bookmarks
        const userResult = await pool.query(
            'SELECT bookmarks FROM users WHERE user_id = $1',
            [userId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        let currentBookmarks = userResult.rows[0].bookmarks;
        
        // Handle different data types that might be stored
        if (typeof currentBookmarks === 'string') {
            try {
                currentBookmarks = JSON.parse(currentBookmarks);
            } catch (e) {
                currentBookmarks = [];
            }
        }
        
        // Ensure it's an array
        if (!Array.isArray(currentBookmarks)) {
            currentBookmarks = [];
        }
        
        let action = '';
        
        // Toggle bookmark
        if (currentBookmarks.includes(restroomId)) {
            // Remove bookmark
            currentBookmarks = currentBookmarks.filter(id => id !== restroomId);
            action = 'removed';
        } else {
            // Add bookmark
            currentBookmarks.push(restroomId);
            action = 'added';
        }
        
        // Update user's bookmarks - store as JSON string
        await pool.query(
            'UPDATE users SET bookmarks = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
            [JSON.stringify(currentBookmarks), userId]
        );
        
        res.status(200).json({ 
            message: `Bookmark ${action} successfully.`,
            bookmarks: currentBookmarks,
            action,
            isBookmarked: action === 'added'
        });
        
    } catch (error) {
        console.error('Error toggling bookmark:', error);
        res.status(500).json({ message: 'Internal server error while updating bookmark.' });
    }
});

// Remove specific bookmark
app.delete('/user/bookmarks/:restroomId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { restroomId } = req.params;
        const restroomIdInt = parseInt(restroomId);
        
        if (!restroomIdInt || !Number.isInteger(restroomIdInt)) {
            return res.status(400).json({ message: 'Invalid restroom ID provided.' });
        }
        
        // Get current bookmarks
        const userResult = await pool.query(
            'SELECT bookmarks FROM users WHERE user_id = $1',
            [userId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        let currentBookmarks = userResult.rows[0].bookmarks;
        
        // Handle different data types that might be stored
        if (typeof currentBookmarks === 'string') {
            try {
                currentBookmarks = JSON.parse(currentBookmarks);
            } catch (e) {
                currentBookmarks = [];
            }
        }
        
        // Ensure it's an array
        if (!Array.isArray(currentBookmarks)) {
            currentBookmarks = [];
        }
        
        // Remove the specific bookmark
        const originalLength = currentBookmarks.length;
        currentBookmarks = currentBookmarks.filter(id => id !== restroomIdInt);
        
        if (originalLength === currentBookmarks.length) {
            return res.status(404).json({ message: 'Bookmark not found.' });
        }
        
        // Update user's bookmarks
        await pool.query(
            'UPDATE users SET bookmarks = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
            [JSON.stringify(currentBookmarks), userId]
        );
        
        res.status(200).json({ 
            message: 'Bookmark removed successfully.',
            bookmarks: currentBookmarks 
        });
        
    } catch (error) {
        console.error('Error removing bookmark:', error);
        res.status(500).json({ message: 'Internal server error while removing bookmark.' });
    }
});

// Clear all bookmarks
app.delete('/user/bookmarks', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Clear all bookmarks
        await pool.query(
            'UPDATE users SET bookmarks = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
            [JSON.stringify([]), userId]
        );
        
        res.status(200).json({ 
            message: 'All bookmarks cleared successfully.',
            bookmarks: [] 
        });
        
    } catch (error) {
        console.error('Error clearing bookmarks:', error);
        res.status(500).json({ message: 'Internal server error while clearing bookmarks.' });
    }
});

// REVIEW ROUTES

// Submit a new review
app.post('/restrooms/:restroomId/reviews', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { restroomId } = req.params;
        const { rating, comment, pictures } = req.body;
        
        // Validate input
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
        }
        
        const restroomIdInt = parseInt(restroomId);
        if (!restroomIdInt || !Number.isInteger(restroomIdInt)) {
            return res.status(400).json({ message: 'Invalid restroom ID.' });
        }
        
        // Check if restroom exists
        const restroomCheck = await pool.query(
            'SELECT restroom_id FROM restrooms WHERE restroom_id = $1',
            [restroomIdInt]
        );
        
        if (restroomCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Restroom not found.' });
        }
        
        // Validate pictures array (max 1 picture)
        let picturesArray = pictures || [];
        if (!Array.isArray(picturesArray)) {
            picturesArray = [];
        }
        if (picturesArray.length > 1) {
            return res.status(400).json({ message: 'You can only upload 1 picture per review.' });
        }
        
        // Insert the review
        const reviewResult = await pool.query(
            `INSERT INTO reviews (user_id, restroom_id, rating, comment, pictures) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING *`,
            [userId, restroomIdInt, rating, comment || null, JSON.stringify(picturesArray)]
        );
        
        const newReview = reviewResult.rows[0];
        
        // Get user name for the response
        const userResult = await pool.query(
            'SELECT name FROM users WHERE user_id = $1',
            [userId]
        );
        
        const userName = userResult.rows[0]?.name || 'Anonymous';
        
        res.status(201).json({
            message: 'Review submitted successfully!',
            review: {
                ...newReview,
                user_name: userName
            }
        });
        
    } catch (error) {
        console.error('Error submitting review:', error);
        res.status(500).json({ message: 'Internal server error while submitting review.' });
    }
});

// Get reviews for a specific restroom
app.get('/restrooms/:restroomId/reviews', authenticateToken, async (req, res) => {
    try {
        const { restroomId } = req.params;
        const restroomIdInt = parseInt(restroomId);
        
        if (!restroomIdInt || !Number.isInteger(restroomIdInt)) {
            return res.status(400).json({ message: 'Invalid restroom ID.' });
        }
        
        const reviewsResult = await pool.query(
            `SELECT 
                r.*,
                u.name as user_name
             FROM reviews r 
             JOIN users u ON r.user_id = u.user_id 
             WHERE r.restroom_id = $1 
             ORDER BY r.created_at DESC`,
            [restroomIdInt]
        );
        
        res.status(200).json({ reviews: reviewsResult.rows });
        
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ message: 'Internal server error while fetching reviews.' });
    }
});

// Check if user has already reviewed a restroom
app.get('/restrooms/:restroomId/user-review-status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { restroomId } = req.params;
        const restroomIdInt = parseInt(restroomId);
        
        if (!restroomIdInt || !Number.isInteger(restroomIdInt)) {
            return res.status(400).json({ message: 'Invalid restroom ID.' });
        }
        
        const reviewCount = await pool.query(
            'SELECT COUNT(*) as review_count FROM reviews WHERE user_id = $1 AND restroom_id = $2',
            [userId, restroomIdInt]
        );
        
        res.status(200).json({ 
            hasReviewed: parseInt(reviewCount.rows[0].review_count) > 0,
            reviewCount: parseInt(reviewCount.rows[0].review_count)
        });
        
    } catch (error) {
        console.error('Error checking review status:', error);
        res.status(500).json({ message: 'Internal server error while checking review status.' });
    }
});

// Get user's previous reviews for a restroom
app.get('/restrooms/:restroomId/user-reviews', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { restroomId } = req.params;
        const restroomIdInt = parseInt(restroomId);
        
        if (!restroomIdInt || !Number.isInteger(restroomIdInt)) {
            return res.status(400).json({ message: 'Invalid restroom ID.' });
        }
        
        const userReviews = await pool.query(
            `SELECT 
                r.*,
                u.name as user_name
             FROM reviews r 
             JOIN users u ON r.user_id = u.user_id 
             WHERE r.user_id = $1 AND r.restroom_id = $2 
             ORDER BY r.created_at DESC`,
            [userId, restroomIdInt]
        );
        
        res.status(200).json({ 
            reviews: userReviews.rows,
            count: userReviews.rows.length
        });
        
    } catch (error) {
        console.error('Error fetching user reviews:', error);
        res.status(500).json({ message: 'Internal server error while fetching user reviews.' });
    }
});

// ============================================================================
// RESTROOM MANAGEMENT ROUTES
// ============================================================================

// 1. Update restroom gender and type
app.put('/restrooms/:id/settings', authenticateToken, async (req, res) => {
    if (req.user.role !== 'restroom') {
        return res.status(403).json({ message: 'Access denied. Restrooms only.' });
    }

    const { id } = req.params;
    const { gender, type } = req.body;
    
    // Validate restroom ownership
    if (parseInt(id) !== req.user.id) {
        return res.status(403).json({ message: 'You can only modify your own restroom.' });
    }

    // Validate gender values
    const validGenders = ['male', 'female', 'unisex'];
    const validTypes = ['public', 'paid', 'private'];
    
    if (gender && !validGenders.includes(gender)) {
        return res.status(400).json({ message: 'Invalid gender. Must be: male, female, or unisex.' });
    }
    
    if (type && !validTypes.includes(type)) {
        return res.status(400).json({ message: 'Invalid type. Must be: public, paid, or private.' });
    }

    try {
        const result = await pool.query(
            'UPDATE restrooms SET gender = $1, type = $2, updated_at = CURRENT_TIMESTAMP WHERE restroom_id = $3 RETURNING *',
            [gender || 'unisex', type || 'public', id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Restroom not found.' });
        }

        res.status(200).json({
            message: 'Restroom settings updated successfully!',
            restroom: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating restroom settings:', error);
        res.status(500).json({ message: 'Internal server error while updating settings.' });
    }
});

// Upload pictures (max 4)
app.post('/restrooms/:id/pictures', authenticateToken, async (req, res) => {
    if (req.user.role !== 'restroom') {
        return res.status(403).json({ message: 'Access denied. Restrooms only.' });
    }

    const { id } = req.params;
    const { imageUrl } = req.body;
    
    if (parseInt(id) !== req.user.id) {
        return res.status(403).json({ message: 'You can only modify your own restroom.' });
    }

    if (!imageUrl) {
        return res.status(400).json({ message: 'Image URL is required.' });
    }

    try {
        // Get current pictures
        const currentResult = await pool.query('SELECT pictures FROM restrooms WHERE restroom_id = $1', [id]);
        if (currentResult.rows.length === 0) {
            return res.status(404).json({ message: 'Restroom not found.' });
        }

        let currentPictures = currentResult.rows[0].pictures || [];
        
        // Ensure it's an array
        if (typeof currentPictures === 'string') {
            try {
                currentPictures = JSON.parse(currentPictures);
            } catch (e) {
                currentPictures = [];
            }
        }
        if (!Array.isArray(currentPictures)) {
            currentPictures = [];
        }

        // Check if we already have 4 pictures
        if (currentPictures.length >= 4) {
            return res.status(400).json({ message: 'Maximum 4 pictures allowed. Please delete some pictures first.' });
        }

        // Add new picture
        currentPictures.push(imageUrl);

        // Update database
        const result = await pool.query(
            'UPDATE restrooms SET pictures = $1, updated_at = CURRENT_TIMESTAMP WHERE restroom_id = $2 RETURNING pictures',
            [JSON.stringify(currentPictures), id]
        );

        res.status(200).json({
            message: 'Picture uploaded successfully!',
            pictures: result.rows[0].pictures
        });
    } catch (error) {
        console.error('Error uploading picture:', error);
        res.status(500).json({ message: 'Internal server error while uploading picture.' });
    }
});

// Get restroom pictures
app.get('/restrooms/:id/pictures', authenticateToken, async (req, res) => {
    if (req.user.role !== 'restroom') {
        return res.status(403).json({ message: 'Access denied. Restrooms only.' });
    }

    const { id } = req.params;
    
    if (parseInt(id) !== req.user.id) {
        return res.status(403).json({ message: 'You can only view your own restroom pictures.' });
    }

    try {
        const result = await pool.query('SELECT pictures FROM restrooms WHERE restroom_id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Restroom not found.' });
        }

        let pictures = result.rows[0].pictures || [];
        
        // Ensure it's an array
        if (typeof pictures === 'string') {
            try {
                pictures = JSON.parse(pictures);
            } catch (e) {
                pictures = [];
            }
        }
        if (!Array.isArray(pictures)) {
            pictures = [];
        }

        res.status(200).json({ pictures });
    } catch (error) {
        console.error('Error fetching pictures:', error);
        res.status(500).json({ message: 'Internal server error while fetching pictures.' });
    }
});

// Delete a specific picture
app.delete('/restrooms/:id/pictures', authenticateToken, async (req, res) => {
    if (req.user.role !== 'restroom') {
        return res.status(403).json({ message: 'Access denied. Restrooms only.' });
    }

    const { id } = req.params;
    const { imageUrl } = req.body;
    
    if (parseInt(id) !== req.user.id) {
        return res.status(403).json({ message: 'You can only modify your own restroom.' });
    }

    if (!imageUrl) {
        return res.status(400).json({ message: 'Image URL is required.' });
    }

    try {
        // Get current pictures
        const currentResult = await pool.query('SELECT pictures FROM restrooms WHERE restroom_id = $1', [id]);
        if (currentResult.rows.length === 0) {
            return res.status(404).json({ message: 'Restroom not found.' });
        }

        let currentPictures = currentResult.rows[0].pictures || [];
        
        // Ensure it's an array
        if (typeof currentPictures === 'string') {
            try {
                currentPictures = JSON.parse(currentPictures);
            } catch (e) {
                currentPictures = [];
            }
        }
        if (!Array.isArray(currentPictures)) {
            currentPictures = [];
        }

        // Remove the specific image
        const updatedPictures = currentPictures.filter(url => url !== imageUrl);

        if (updatedPictures.length === currentPictures.length) {
            return res.status(404).json({ message: 'Picture not found.' });
        }

        // Update database
        const result = await pool.query(
            'UPDATE restrooms SET pictures = $1, updated_at = CURRENT_TIMESTAMP WHERE restroom_id = $2 RETURNING pictures',
            [JSON.stringify(updatedPictures), id]
        );

        res.status(200).json({
            message: 'Picture deleted successfully!',
            pictures: result.rows[0].pictures
        });
    } catch (error) {
        console.error('Error deleting picture:', error);
        res.status(500).json({ message: 'Internal server error while deleting picture.' });
    }
});

// Update restroom description
app.put('/restrooms/:id/description', authenticateToken, async (req, res) => {
    if (req.user.role !== 'restroom') {
        return res.status(403).json({ message: 'Access denied. Restrooms only.' });
    }

    const { id } = req.params;
    const { features, nearest_transport_bus, nearest_transport_metro, nearest_transport_train } = req.body;
    
    if (parseInt(id) !== req.user.id) {
        return res.status(403).json({ message: 'You can only modify your own restroom.' });
    }

    // Validate features
    const validFeatures = ['cctv', 'handicap_accessible', 'baby_changing_station'];
    if (features && Array.isArray(features)) {
        const invalidFeatures = features.filter(feature => !validFeatures.includes(feature));
        if (invalidFeatures.length > 0) {
            return res.status(400).json({ 
                message: `Invalid features: ${invalidFeatures.join(', ')}. Valid features are: ${validFeatures.join(', ')}.` 
            });
        }
    }

    try {
        const description = {
            features: features || [],
            nearest_transport_bus: nearest_transport_bus || null,
            nearest_transport_metro: nearest_transport_metro || null,
            nearest_transport_train: nearest_transport_train || null
        };

        const result = await pool.query(
            'UPDATE restrooms SET description = $1, updated_at = CURRENT_TIMESTAMP WHERE restroom_id = $2 RETURNING description',
            [JSON.stringify(description), id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Restroom not found.' });
        }

        res.status(200).json({
            message: 'Description updated successfully!',
            description: result.rows[0].description
        });
    } catch (error) {
        console.error('Error updating description:', error);
        res.status(500).json({ message: 'Internal server error while updating description.' });
    }
});

// Get restroom description
app.get('/restrooms/:id/description', authenticateToken, async (req, res) => {
    if (req.user.role !== 'restroom') {
        return res.status(403).json({ message: 'Access denied. Restrooms only.' });
    }

    const { id } = req.params;
    
    if (parseInt(id) !== req.user.id) {
        return res.status(403).json({ message: 'You can only view your own restroom description.' });
    }

    try {
        const result = await pool.query('SELECT description FROM restrooms WHERE restroom_id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Restroom not found.' });
        }

        const description = result.rows[0].description || {
            features: [],
            nearest_transport_bus: null,
            nearest_transport_metro: null,
            nearest_transport_train: null
        };

        res.status(200).json({ description });
    } catch (error) {
        console.error('Error fetching description:', error);
        res.status(500).json({ message: 'Internal server error while fetching description.' });
    }
});

// ============================================================================
// ROOMS MANAGEMENT ROUTES
// ============================================================================

// Create a new room
app.post('/restrooms/:id/rooms', authenticateToken, async (req, res) => {
    if (req.user.role !== 'restroom') {
        return res.status(403).json({ message: 'Access denied. Restrooms only.' });
    }

    const { id } = req.params;
    const { room_name } = req.body;
    
    if (parseInt(id) !== req.user.id) {
        return res.status(403).json({ message: 'You can only modify your own restroom.' });
    }

    if (!room_name || room_name.trim().length === 0) {
        return res.status(400).json({ message: 'Room name is required.' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO rooms (restroom_id, room_name, queue_status) VALUES ($1, $2, $3) RETURNING *',
            [id, room_name.trim(), 'Vacant']
        );

        res.status(201).json({
            message: 'Room created successfully!',
            room: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating room:', error);
        res.status(500).json({ message: 'Internal server error while creating room.' });
    }
});

// Get all rooms for a restroom
app.get('/restrooms/:id/rooms', authenticateToken, async (req, res) => {
    if (req.user.role !== 'restroom') {
        return res.status(403).json({ message: 'Access denied. Restrooms only.' });
    }

    const { id } = req.params;
    
    if (parseInt(id) !== req.user.id) {
        return res.status(403).json({ message: 'You can only view your own restroom rooms.' });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM rooms WHERE restroom_id = $1 ORDER BY created_at ASC',
            [id]
        );

        res.status(200).json({ rooms: result.rows });
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({ message: 'Internal server error while fetching rooms.' });
    }
});

// Update room details
app.put('/restrooms/:id/rooms/:roomId', authenticateToken, async (req, res) => {
    if (req.user.role !== 'restroom') {
        return res.status(403).json({ message: 'Access denied. Restrooms only.' });
    }

    const { id, roomId } = req.params;
    const { room_name } = req.body;
    
    if (parseInt(id) !== req.user.id) {
        return res.status(403).json({ message: 'You can only modify your own restroom.' });
    }

    if (!room_name || room_name.trim().length === 0) {
        return res.status(400).json({ message: 'Room name is required.' });
    }

    try {
        // Verify room belongs to this restroom
        const roomCheck = await pool.query(
            'SELECT room_id FROM rooms WHERE room_id = $1 AND restroom_id = $2',
            [roomId, id]
        );

        if (roomCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Room not found or does not belong to this restroom.' });
        }

        const result = await pool.query(
            'UPDATE rooms SET room_name = $1, updated_at = CURRENT_TIMESTAMP WHERE room_id = $2 AND restroom_id = $3 RETURNING *',
            [room_name.trim(), roomId, id]
        );

        res.status(200).json({
            message: 'Room updated successfully!',
            room: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating room:', error);
        res.status(500).json({ message: 'Internal server error while updating room.' });
    }
});

// Delete a room
app.delete('/restrooms/:id/rooms/:roomId', authenticateToken, async (req, res) => {
    if (req.user.role !== 'restroom') {
        return res.status(403).json({ message: 'Access denied. Restrooms only.' });
    }

    const { id, roomId } = req.params;
    
    if (parseInt(id) !== req.user.id) {
        return res.status(403).json({ message: 'You can only modify your own restroom.' });
    }

    try {
        // Verify room belongs to this restroom
        const roomCheck = await pool.query(
            'SELECT room_id FROM rooms WHERE room_id = $1 AND restroom_id = $2',
            [roomId, id]
        );

        if (roomCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Room not found or does not belong to this restroom.' });
        }

        await pool.query(
            'DELETE FROM rooms WHERE room_id = $1 AND restroom_id = $2',
            [roomId, id]
        );

        res.status(200).json({ message: 'Room deleted successfully!' });
    } catch (error) {
        console.error('Error deleting room:', error);
        res.status(500).json({ message: 'Internal server error while deleting room.' });
    }
});

// Update room queue status
app.put('/restrooms/:id/rooms/:roomId/status', authenticateToken, async (req, res) => {
    if (req.user.role !== 'restroom') {
        return res.status(403).json({ message: 'Access denied. Restrooms only.' });
    }

    const { id, roomId } = req.params;
    const { queue_status } = req.body;
    
    if (parseInt(id) !== req.user.id) {
        return res.status(403).json({ message: 'You can only modify your own restroom.' });
    }

    const validStatuses = ['Vacant', 'In Use', 'Cleaning', 'Under Maintenance'];
    if (!validStatuses.includes(queue_status)) {
        return res.status(400).json({ 
            message: `Invalid queue status. Must be one of: ${validStatuses.join(', ')}.` 
        });
    }

    try {
        // Verify room belongs to this restroom
        const roomCheck = await pool.query(
            'SELECT room_id FROM rooms WHERE room_id = $1 AND restroom_id = $2',
            [roomId, id]
        );

        if (roomCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Room not found or does not belong to this restroom.' });
        }

        let updateQuery = 'UPDATE rooms SET queue_status = $1, updated_at = CURRENT_TIMESTAMP';
        let queryParams = [queue_status];

        // If status is 'Cleaning', also update last_cleaned to current time
        if (queue_status === 'Cleaning') {
            updateQuery += ', last_cleaned = CURRENT_TIMESTAMP';
        }

        updateQuery += ' WHERE room_id = $2 AND restroom_id = $3 RETURNING *';
        queryParams.push(roomId, id);

        const result = await pool.query(updateQuery, queryParams);

        res.status(200).json({
            message: 'Room status updated successfully!',
            room: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating room status:', error);
        res.status(500).json({ message: 'Internal server error while updating room status.' });
    }
});

// Get reviews for restroom (restroom admin only)
app.get('/restrooms/:id/reviews/admin', authenticateToken, async (req, res) => {
    if (req.user.role !== 'restroom') {
        return res.status(403).json({ message: 'Access denied. Restrooms only.' });
    }

    const { id } = req.params;
    
    if (parseInt(id) !== req.user.id) {
        return res.status(403).json({ message: 'You can only view reviews for your own restroom.' });
    }

    try {
        const result = await pool.query(
            `SELECT 
                r.*,
                u.name as user_name
             FROM reviews r 
             JOIN users u ON r.user_id = u.user_id 
             WHERE r.restroom_id = $1 
             ORDER BY r.created_at DESC`,
            [id]
        );

        res.status(200).json({ reviews: result.rows });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ message: 'Internal server error while fetching reviews.' });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});



// Export the Express app for Vercel
module.exports = app;