/**
 * Users API routes
 */

import express from 'express';
import bcrypt from 'bcrypt';
import db from '../../database/db.js';
import { authenticateToken, generateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * Register new user
 * POST /api/users/register
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters'
      });
    }

    // Check if user exists
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Email already registered'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await db.query(`
      INSERT INTO users (email, password_hash)
      VALUES ($1, $2)
      RETURNING id, email, is_paid, created_at
    `, [email, passwordHash]);

    const user = result.rows[0];

    // Create default settings
    await db.query(`
      INSERT INTO user_settings (user_id)
      VALUES ($1)
    `, [user.id]);

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        is_paid: user.is_paid
      },
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

/**
 * Login user
 * POST /api/users/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password required'
      });
    }

    // Get user
    const result = await db.query(`
      SELECT id, email, password_hash, is_paid, subscription_tier
      FROM users
      WHERE email = $1
    `, [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Update last login
    await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    // Generate token
    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        is_paid: user.is_paid,
        subscription_tier: user.subscription_tier
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

/**
 * Get user profile
 * GET /api/users/profile
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        u.id,
        u.email,
        u.is_paid,
        u.subscription_tier,
        u.subscription_ends_at,
        u.created_at,
        u.last_login_at,
        s.enable_notifications,
        s.enable_email,
        s.alert_frequency,
        s.deal_threshold,
        (SELECT COUNT(*) FROM tracked_products WHERE user_id = u.id) as tracked_count
      FROM users u
      LEFT JOIN user_settings s ON s.user_id = u.id
      WHERE u.id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile'
    });
  }
});

/**
 * Update user settings
 * PUT /api/users/settings
 */
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const {
      enableNotifications,
      enableEmail,
      alertFrequency,
      dealThreshold
    } = req.body;

    await db.query(`
      UPDATE user_settings
      SET
        enable_notifications = COALESCE($1, enable_notifications),
        enable_email = COALESCE($2, enable_email),
        alert_frequency = COALESCE($3, alert_frequency),
        deal_threshold = COALESCE($4, deal_threshold),
        updated_at = NOW()
      WHERE user_id = $5
    `, [
      enableNotifications,
      enableEmail,
      alertFrequency,
      dealThreshold,
      req.user.id
    ]);

    res.json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings'
    });
  }
});

export default router;
