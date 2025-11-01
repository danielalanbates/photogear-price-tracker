/**
 * B&H Photo Video scraper
 * Scrapes product prices from bhphotovideo.com
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from '../database/db.js';

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

const RETAILER_NAME = 'bhphoto';
const BASE_URL = 'https://www.bhphotovideo.com';

/**
 * Scrape a single B&H Photo product page
 * @param {string} productUrl - Full URL to product page
 * @returns {Object} Product data
 */
export async function scrapeBHProduct(productUrl) {
  let browser;

  try {
    console.log(`Scraping B&H product: ${productUrl}`);

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set realistic viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Navigate to product page
    await page.goto(productUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for key elements to load
    await page.waitForSelector('h1[data-selenium="productTitle"]', { timeout: 10000 });

    // Extract product data
    const productData = await page.evaluate(() => {
      // Helper function to safely get text content
      const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : null;
      };

      // Helper function to safely get attribute
      const getAttr = (selector, attr) => {
        const el = document.querySelector(selector);
        return el ? el.getAttribute(attr) : null;
      };

      // Extract title
      const title = getText('h1[data-selenium="productTitle"]') ||
                   getText('h1[itemprop="name"]') ||
                   getText('h1.title');

      // Extract price - B&H has multiple price selectors
      let priceText = getText('[data-selenium="pricingPrice"]') ||
                     getText('.price_1FOUu') ||
                     getText('.price') ||
                     getText('[itemprop="price"]');

      const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, '')) : null;

      // Extract SKU
      const sku = getText('[data-selenium="sku"]') ||
                 getAttr('[data-sku]', 'data-sku') ||
                 getText('.sku-value');

      // Extract stock status
      const stockText = getText('[data-selenium="availabilityStatus"]') ||
                       getText('.availability') ||
                       '';
      const inStock = stockText.toLowerCase().includes('in stock') ||
                     stockText.toLowerCase().includes('available') ||
                     !stockText.toLowerCase().includes('out of stock');

      // Extract condition (usually new for B&H)
      let condition = 'new';
      const conditionText = getText('.condition') || '';
      if (conditionText.toLowerCase().includes('used')) {
        condition = 'used';
      } else if (conditionText.toLowerCase().includes('refurbished')) {
        condition = 'refurbished';
      } else if (conditionText.toLowerCase().includes('open box')) {
        condition = 'open_box';
      }

      // Extract brand
      const brand = getText('[itemprop="brand"]') ||
                   getText('.brand') ||
                   (title ? title.split(' ')[0] : null);

      // Extract image URL
      const imageUrl = getAttr('[data-selenium="productImage"]', 'src') ||
                      getAttr('.product-image img', 'src') ||
                      getAttr('[itemprop="image"]', 'content');

      // Extract description
      const description = getText('[data-selenium="longDescription"]') ||
                         getText('.product-description') ||
                         getText('[itemprop="description"]');

      return {
        title,
        price,
        sku,
        inStock,
        condition,
        brand,
        imageUrl,
        description,
        url: window.location.href
      };
    });

    await browser.close();

    // Validate extracted data
    if (!productData.title || !productData.price) {
      console.error('Failed to extract required product data:', productData);
      return null;
    }

    console.log('Successfully scraped:', productData.title, `$${productData.price}`);

    return {
      ...productData,
      retailer: RETAILER_NAME,
      scrapedAt: new Date()
    };

  } catch (error) {
    console.error('Error scraping B&H product:', error);
    if (browser) {
      await browser.close();
    }
    return null;
  }
}

/**
 * Scrape multiple B&H products
 * @param {Array} productUrls - Array of product URLs
 * @returns {Array} Array of product data
 */
export async function scrapeBHProducts(productUrls) {
  const results = [];

  for (const url of productUrls) {
    const data = await scrapeBHProduct(url);
    if (data) {
      results.push(data);
    }

    // Add delay between requests to be respectful
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
  }

  return results;
}

/**
 * Save scraped price to database
 * @param {Object} productData - Scraped product data
 */
export async function saveBHPrice(productData) {
  try {
    // First, find or create the product
    let productId;

    const existingProduct = await db.query(
      'SELECT id FROM products WHERE sku = $1 OR name = $2 LIMIT 1',
      [productData.sku, productData.title]
    );

    if (existingProduct.rows.length > 0) {
      productId = existingProduct.rows[0].id;

      // Update product info
      await db.query(`
        UPDATE products
        SET
          name = COALESCE($1, name),
          brand = COALESCE($2, brand),
          image_url = COALESCE($3, image_url),
          description = COALESCE($4, description),
          updated_at = NOW()
        WHERE id = $5
      `, [productData.title, productData.brand, productData.imageUrl, productData.description, productId]);

    } else {
      // Create new product
      const newProduct = await db.query(`
        INSERT INTO products (name, brand, sku, image_url, description, category)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        productData.title,
        productData.brand,
        productData.sku,
        productData.imageUrl,
        productData.description,
        'unknown' // Category detection could be added later
      ]);

      productId = newProduct.rows[0].id;
    }

    // Save price
    await db.query(`
      INSERT INTO prices (product_id, retailer, price, condition, in_stock, url)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      productId,
      productData.retailer,
      productData.price,
      productData.condition,
      productData.inStock,
      productData.url
    ]);

    // Update or create product URL
    await db.query(`
      INSERT INTO product_urls (product_id, retailer, url, last_scraped_at, scrape_status, error_count)
      VALUES ($1, $2, $3, NOW(), 'active', 0)
      ON CONFLICT (product_id, retailer)
      DO UPDATE SET
        url = EXCLUDED.url,
        last_scraped_at = NOW(),
        scrape_status = 'active',
        error_count = 0,
        updated_at = NOW()
    `, [productId, productData.retailer, productData.url]);

    console.log(`✅ Saved price for product ID ${productId}`);

    return productId;

  } catch (error) {
    console.error('Error saving B&H price:', error);
    throw error;
  }
}

/**
 * Test scraper with sample URLs
 */
export async function testBHScraper() {
  const sampleUrls = [
    'https://www.bhphotovideo.com/c/product/1602398-REG/canon_eos_r5_mirrorless_digital.html',
    'https://www.bhphotovideo.com/c/product/1494529-REG/sony_ilce7m3_b_alpha_a7_iii_mirrorless.html'
  ];

  console.log('🧪 Testing B&H Photo scraper...\n');

  for (const url of sampleUrls) {
    const data = await scrapeBHProduct(url);
    console.log('\n---\nScraped data:', JSON.stringify(data, null, 2));

    if (data) {
      // Uncomment to test database save
      // await saveBHPrice(data);
    }
  }

  console.log('\n✅ Test complete');
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testBHScraper()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

export default {
  scrapeBHProduct,
  scrapeBHProducts,
  saveBHPrice,
  testBHScraper
};
