/**
 * Products API routes
 */

import express from 'express';
import db from '../../database/db.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * Search for products
 * GET /api/products/search?q=canon&category=body
 */
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { q, category, brand, sku, limit = 20 } = req.query;

    if (!q && !category && !brand && !sku) {
      return res.status(400).json({
        success: false,
        error: 'At least one search parameter required (q, category, brand, or sku)'
      });
    }

    let query = `
      SELECT
        p.*,
        pp.watcher_count,
        pp.avg_rating,
        pp.review_count,
        (
          SELECT json_agg(
            json_build_object(
              'retailer', pr.retailer,
              'price', pr.price,
              'condition', pr.condition,
              'in_stock', pr.in_stock,
              'url', pr.url,
              'scraped_at', pr.scraped_at
            )
          )
          FROM (
            SELECT DISTINCT ON (retailer) *
            FROM prices
            WHERE product_id = p.id
            ORDER BY retailer, scraped_at DESC
          ) pr
        ) as prices
      FROM products p
      LEFT JOIN popular_products pp ON pp.id = p.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    if (q) {
      paramCount++;
      query += ` AND (
        p.name ILIKE $${paramCount} OR
        p.brand ILIKE $${paramCount} OR
        p.model ILIKE $${paramCount}
      )`;
      params.push(`%${q}%`);
    }

    if (category) {
      paramCount++;
      query += ` AND p.category = $${paramCount}`;
      params.push(category);
    }

    if (brand) {
      paramCount++;
      query += ` AND p.brand ILIKE $${paramCount}`;
      params.push(`%${brand}%`);
    }

    if (sku) {
      paramCount++;
      query += ` AND p.sku = $${paramCount}`;
      params.push(sku);
    }

    paramCount++;
    query += ` ORDER BY pp.watcher_count DESC NULLS LAST LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    const result = await db.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      products: result.rows
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search products'
    });
  }
});

/**
 * Get product details by ID
 * GET /api/products/:id
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT
        p.*,
        pp.watcher_count,
        pp.avg_rating,
        pp.review_count,
        (
          SELECT json_agg(
            json_build_object(
              'retailer', pr.retailer,
              'price', pr.price,
              'condition', pr.condition,
              'warranty_months', pr.warranty_months,
              'in_stock', pr.in_stock,
              'url', pr.url,
              'scraped_at', pr.scraped_at
            )
            ORDER BY pr.price ASC
          )
          FROM (
            SELECT DISTINCT ON (retailer) *
            FROM prices
            WHERE product_id = p.id
            ORDER BY retailer, scraped_at DESC
          ) pr
        ) as current_prices,
        (
          SELECT json_agg(
            json_build_object(
              'price', price,
              'retailer', retailer,
              'scraped_at', scraped_at
            )
            ORDER BY scraped_at DESC
          )
          FROM prices
          WHERE product_id = p.id
            AND scraped_at > NOW() - INTERVAL '90 days'
        ) as price_history
      FROM products p
      LEFT JOIN popular_products pp ON pp.id = p.id
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const product = result.rows[0];

    // Get deal scores
    const dealScores = await db.query(`
      SELECT * FROM deal_scores
      WHERE product_id = $1
    `, [id]);

    product.deal_scores = dealScores.rows;

    // Check if user is tracking this product
    if (req.user) {
      const tracked = await db.query(`
        SELECT * FROM tracked_products
        WHERE user_id = $1 AND product_id = $2
      `, [req.user.id, id]);

      product.is_tracked = tracked.rows.length > 0;
      if (product.is_tracked) {
        product.tracking_details = tracked.rows[0];
      }
    }

    res.json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get product details'
    });
  }
});

/**
 * Get user's tracked products
 * GET /api/products/tracked
 */
router.get('/tracked', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        p.*,
        tp.target_price,
        tp.alert_enabled,
        tp.last_price,
        tp.created_at as tracked_since,
        pp.watcher_count,
        pp.avg_rating,
        (
          SELECT json_agg(
            json_build_object(
              'retailer', pr.retailer,
              'price', pr.price,
              'condition', pr.condition,
              'in_stock', pr.in_stock
            )
            ORDER BY pr.price ASC
          )
          FROM (
            SELECT DISTINCT ON (retailer) *
            FROM prices
            WHERE product_id = p.id
            ORDER BY retailer, scraped_at DESC
          ) pr
        ) as prices
      FROM tracked_products tp
      JOIN products p ON p.id = tp.product_id
      LEFT JOIN popular_products pp ON pp.id = p.id
      WHERE tp.user_id = $1
      ORDER BY tp.created_at DESC
    `, [req.user.id]);

    // Calculate price changes
    const trackedItems = result.rows.map(item => {
      const currentPrice = item.prices && item.prices.length > 0
        ? Math.min(...item.prices.map(p => p.price))
        : null;

      const priceChange = item.last_price && currentPrice
        ? ((currentPrice - item.last_price) / item.last_price) * 100
        : 0;

      return {
        ...item,
        current_price: currentPrice,
        price_change: priceChange
      };
    });

    res.json({
      success: true,
      count: trackedItems.length,
      data: trackedItems
    });
  } catch (error) {
    console.error('Get tracked products error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tracked products'
    });
  }
});

/**
 * Get best deals
 * GET /api/products/best-deals?limit=10&min_score=70
 */
router.get('/best-deals', async (req, res) => {
  try {
    const { limit = 20, min_score = 70, category } = req.query;

    let query = `
      SELECT * FROM best_deals_view
      WHERE score >= $1
    `;
    const params = [parseInt(min_score)];

    if (category) {
      query += ` AND category = $2`;
      params.push(category);
    }

    query += ` LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await db.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Get best deals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get best deals'
    });
  }
});

/**
 * Track a product
 * POST /api/products/track
 */
router.post('/track', authenticateToken, async (req, res) => {
  try {
    const { productId, targetPrice } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Product ID required'
      });
    }

    // Check if product exists
    const product = await db.query('SELECT * FROM products WHERE id = $1', [productId]);
    if (product.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Check user's tracking limit for free tier
    if (!req.user.is_paid) {
      const count = await db.query(
        'SELECT COUNT(*) FROM tracked_products WHERE user_id = $1',
        [req.user.id]
      );

      if (parseInt(count.rows[0].count) >= 5) {
        return res.status(403).json({
          success: false,
          error: 'Free tier limit reached (5 items). Upgrade to track unlimited items.',
          upgrade_url: 'https://photogeartracker.com/upgrade'
        });
      }
    }

    // Get current lowest price
    const priceResult = await db.query(`
      SELECT MIN(price) as current_price
      FROM prices
      WHERE product_id = $1
        AND scraped_at > NOW() - INTERVAL '24 hours'
    `, [productId]);

    const currentPrice = priceResult.rows[0]?.current_price;

    // Insert or update tracked product
    const result = await db.query(`
      INSERT INTO tracked_products (user_id, product_id, target_price, last_price)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, product_id)
      DO UPDATE SET
        target_price = EXCLUDED.target_price,
        alert_enabled = true,
        alerted = false,
        updated_at = NOW()
      RETURNING *
    `, [req.user.id, productId, targetPrice, currentPrice]);

    res.json({
      success: true,
      message: 'Product tracked successfully',
      tracked: result.rows[0]
    });
  } catch (error) {
    console.error('Track product error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track product'
    });
  }
});

/**
 * Untrack a product
 * POST /api/products/untrack
 */
router.post('/untrack', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.body;

    await db.query(`
      DELETE FROM tracked_products
      WHERE user_id = $1 AND product_id = $2
    `, [req.user.id, productId]);

    res.json({
      success: true,
      message: 'Product untracked successfully'
    });
  } catch (error) {
    console.error('Untrack product error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to untrack product'
    });
  }
});

/**
 * Get price history for a product
 * GET /api/products/:id/prices?days=90
 */
router.get('/:id/prices', async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 90, retailer } = req.query;

    let query = `
      SELECT
        retailer,
        price,
        condition,
        in_stock,
        scraped_at
      FROM prices
      WHERE product_id = $1
        AND scraped_at > NOW() - INTERVAL '${parseInt(days)} days'
    `;
    const params = [id];

    if (retailer) {
      query += ` AND retailer = $2`;
      params.push(retailer);
    }

    query += ` ORDER BY scraped_at ASC`;

    const result = await db.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      prices: result.rows
    });
  } catch (error) {
    console.error('Get price history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get price history'
    });
  }
});

export default router;
