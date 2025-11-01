/**
 * Deal Quality Scoring Algorithm
 * Calculates deal scores and recommendations for products
 */

import db from '../database/db.js';

/**
 * Calculate deal score for a product at a specific retailer
 * @param {string} productId - Product ID
 * @param {string} retailer - Retailer name
 * @returns {Object} Deal score and recommendation
 */
export async function calculateDealScore(productId, retailer) {
  try {
    // Get price history for the product from all retailers (last 90 days)
    const priceHistory = await db.query(`
      SELECT price, retailer, scraped_at
      FROM prices
      WHERE product_id = $1
        AND scraped_at > NOW() - INTERVAL '90 days'
      ORDER BY scraped_at ASC
    `, [productId]);

    if (priceHistory.rows.length < 5) {
      // Not enough data for accurate scoring
      return {
        score: 50,
        quality: 'fair',
        recommendation: 'Not enough price history for accurate scoring',
        confidence: 0.3,
        averagePrice: null,
        minPrice: null,
        maxPrice: null
      };
    }

    // Get current price for this retailer
    const currentPriceResult = await db.query(`
      SELECT price, in_stock
      FROM prices
      WHERE product_id = $1
        AND retailer = $2
      ORDER BY scraped_at DESC
      LIMIT 1
    `, [productId, retailer]);

    if (currentPriceResult.rows.length === 0) {
      return null;
    }

    const currentPrice = currentPriceResult.rows[0].price;
    const inStock = currentPriceResult.rows[0].in_stock;

    // Calculate statistics
    const prices = priceHistory.rows.map(row => parseFloat(row.price));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    // Calculate percentiles
    const sortedPrices = [...prices].sort((a, b) => a - b);
    const p25 = sortedPrices[Math.floor(sortedPrices.length * 0.25)];
    const p50 = sortedPrices[Math.floor(sortedPrices.length * 0.50)];
    const p75 = sortedPrices[Math.floor(sortedPrices.length * 0.75)];

    // Calculate deal score (0-100)
    let score = 50; // Base score

    // Factor 1: Position in price range (40 points max)
    if (maxPrice !== minPrice) {
      const pricePosition = (currentPrice - minPrice) / (maxPrice - minPrice);
      const positionScore = (1 - pricePosition) * 40;
      score += positionScore;
    }

    // Factor 2: Comparison to average (30 points max)
    const avgDifference = (avgPrice - currentPrice) / avgPrice;
    if (avgDifference > 0) {
      score += Math.min(avgDifference * 100, 30);
    } else {
      score += Math.max(avgDifference * 100, -30);
    }

    // Factor 3: Historical low bonus (20 points)
    if (currentPrice === minPrice) {
      score += 20;
    } else if (currentPrice <= minPrice * 1.05) {
      score += 15; // Within 5% of historical low
    }

    // Factor 4: Recent trend (10 points)
    const recentPrices = prices.slice(-10);
    const recentAvg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
    if (currentPrice < recentAvg) {
      score += 10;
    }

    // Penalties
    if (!inStock) {
      score -= 20; // Out of stock penalty
    }

    // Clamp score to 0-100
    score = Math.max(0, Math.min(100, score));

    // Determine quality label
    let quality, recommendation;
    if (score >= 85) {
      quality = 'amazing';
      recommendation = '🔥 AMAZING DEAL! This is an exceptional price - historical low or near it. Buy now if you need it!';
    } else if (score >= 70) {
      quality = 'great';
      recommendation = '✅ Great Deal! Price is 20%+ below average. Excellent time to buy.';
    } else if (score >= 50) {
      quality = 'good';
      recommendation = '👍 Good Deal. Price is below average. Consider buying now.';
    } else if (score >= 30) {
      quality = 'fair';
      recommendation = '😐 Fair Price. Around average pricing. May want to wait for a better deal.';
    } else {
      quality = 'poor';
      recommendation = '❌ Overpriced. Price is above average. Wait for a price drop.';
    }

    // Calculate confidence based on data points
    const dataPoints = priceHistory.rows.length;
    const confidence = Math.min(0.5 + (dataPoints / 200), 1.0);

    return {
      score: Math.round(score),
      quality,
      recommendation,
      confidence: parseFloat(confidence.toFixed(2)),
      averagePrice: parseFloat(avgPrice.toFixed(2)),
      minPrice: parseFloat(minPrice.toFixed(2)),
      maxPrice: parseFloat(maxPrice.toFixed(2)),
      currentPrice: parseFloat(currentPrice.toFixed(2)),
      percentiles: {
        p25: parseFloat(p25.toFixed(2)),
        p50: parseFloat(p50.toFixed(2)),
        p75: parseFloat(p75.toFixed(2))
      },
      inStock
    };

  } catch (error) {
    console.error('Error calculating deal score:', error);
    throw error;
  }
}

/**
 * Calculate and save deal scores for all products
 */
export async function calculateAllDealScores() {
  try {
    console.log('🔢 Calculating deal scores for all products...');

    // Get all products with recent prices
    const products = await db.query(`
      SELECT DISTINCT product_id, retailer
      FROM prices
      WHERE scraped_at > NOW() - INTERVAL '7 days'
    `);

    let processed = 0;
    let failed = 0;

    for (const row of products.rows) {
      try {
        const dealScore = await calculateDealScore(row.product_id, row.retailer);

        if (dealScore) {
          // Save to database
          await db.query(`
            INSERT INTO deal_scores (
              product_id,
              retailer,
              score,
              quality,
              average_price,
              min_price,
              max_price,
              recommendation,
              confidence
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (product_id, retailer)
            DO UPDATE SET
              score = EXCLUDED.score,
              quality = EXCLUDED.quality,
              average_price = EXCLUDED.average_price,
              min_price = EXCLUDED.min_price,
              max_price = EXCLUDED.max_price,
              recommendation = EXCLUDED.recommendation,
              confidence = EXCLUDED.confidence,
              calculated_at = NOW()
          `, [
            row.product_id,
            row.retailer,
            dealScore.score,
            dealScore.quality,
            dealScore.averagePrice,
            dealScore.minPrice,
            dealScore.maxPrice,
            dealScore.recommendation,
            dealScore.confidence
          ]);

          processed++;
        }
      } catch (error) {
        console.error(`Error calculating score for ${row.product_id} at ${row.retailer}:`, error);
        failed++;
      }

      // Small delay to avoid overloading database
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    console.log(`✅ Deal scores calculated: ${processed} succeeded, ${failed} failed`);

    // Refresh materialized view
    await db.query('REFRESH MATERIALIZED VIEW CONCURRENTLY popular_products');

    return { processed, failed };

  } catch (error) {
    console.error('Error calculating all deal scores:', error);
    throw error;
  }
}

/**
 * Get best deals across all products
 * @param {Object} options - Filter options
 * @returns {Array} Best deals
 */
export async function getBestDeals(options = {}) {
  try {
    const {
      minScore = 70,
      limit = 20,
      category = null,
      brand = null
    } = options;

    let query = `
      SELECT
        p.id,
        p.name,
        p.brand,
        p.category,
        p.image_url,
        ds.score,
        ds.quality,
        ds.retailer,
        ds.recommendation,
        ds.average_price,
        ds.min_price,
        pr.price as current_price,
        pr.in_stock,
        pr.url,
        pp.watcher_count,
        pp.avg_rating
      FROM products p
      JOIN deal_scores ds ON ds.product_id = p.id
      JOIN LATERAL (
        SELECT price, in_stock, url
        FROM prices
        WHERE product_id = p.id
          AND retailer = ds.retailer
        ORDER BY scraped_at DESC
        LIMIT 1
      ) pr ON true
      LEFT JOIN popular_products pp ON pp.id = p.id
      WHERE ds.score >= $1
        AND pr.in_stock = true
    `;

    const params = [minScore];
    let paramCount = 1;

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

    paramCount++;
    query += ` ORDER BY ds.score DESC, pp.watcher_count DESC NULLS LAST LIMIT $${paramCount}`;
    params.push(limit);

    const result = await db.query(query, params);

    return result.rows;

  } catch (error) {
    console.error('Error getting best deals:', error);
    throw error;
  }
}

export default {
  calculateDealScore,
  calculateAllDealScores,
  getBestDeals
};
