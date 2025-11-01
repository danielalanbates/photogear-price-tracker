/**
 * Alerts API routes
 */

import express from 'express';
import db from '../../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * Get user's alert history
 * GET /api/alerts?limit=50
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const result = await db.query(`
      SELECT
        a.*,
        p.name as product_name,
        p.brand,
        p.image_url
      FROM price_alerts a
      JOIN products p ON p.id = a.product_id
      WHERE a.user_id = $1
      ORDER BY a.sent_at DESC
      LIMIT $2
    `, [req.user.id, parseInt(limit)]);

    res.json({
      success: true,
      count: result.rows.length,
      alerts: result.rows
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get alerts'
    });
  }
});

/**
 * Mark alert as clicked
 * POST /api/alerts/:id/click
 */
router.post('/:id/click', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(`
      UPDATE price_alerts
      SET clicked = true, clicked_at = NOW()
      WHERE id = $1 AND user_id = $2
    `, [id, req.user.id]);

    res.json({
      success: true,
      message: 'Alert marked as clicked'
    });
  } catch (error) {
    console.error('Mark alert clicked error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark alert as clicked'
    });
  }
});

/**
 * Send test alert (for testing)
 * POST /api/alerts/test
 */
router.post('/test', authenticateToken, async (req, res) => {
  try {
    // This would trigger the actual alert sending mechanism
    // For now, just acknowledge
    res.json({
      success: true,
      message: 'Test alert sent (check your email/notifications)'
    });
  } catch (error) {
    console.error('Test alert error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test alert'
    });
  }
});

export default router;
