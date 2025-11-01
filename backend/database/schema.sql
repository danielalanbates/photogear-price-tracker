-- PhotoGear Price Tracker Database Schema
-- PostgreSQL Database Schema for price tracking system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_paid BOOLEAN DEFAULT false,
  subscription_tier VARCHAR(50) DEFAULT 'free', -- free, premium
  subscription_ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(500) NOT NULL,
  brand VARCHAR(100),
  model VARCHAR(200),
  category VARCHAR(100), -- body, lens, lighting, accessories, etc.
  sku VARCHAR(100),
  description TEXT,
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_name ON products USING gin(to_tsvector('english', name));

-- Prices table (historical price tracking)
CREATE TABLE prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  retailer VARCHAR(100) NOT NULL, -- bhphoto, adorama, keh, mpb, ebay, amazon
  price DECIMAL(10,2) NOT NULL,
  condition VARCHAR(50) DEFAULT 'new', -- new, excellent, very_good, good, acceptable, for_parts
  warranty_months INT DEFAULT 12,
  in_stock BOOLEAN DEFAULT true,
  url TEXT,
  scraped_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_prices_product_id ON prices(product_id);
CREATE INDEX idx_prices_retailer ON prices(retailer);
CREATE INDEX idx_prices_scraped_at ON prices(scraped_at DESC);
CREATE INDEX idx_prices_product_retailer ON prices(product_id, retailer, scraped_at DESC);

-- Tracked products (user watchlist)
CREATE TABLE tracked_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  target_price DECIMAL(10,2), -- alert when price drops below this
  alert_enabled BOOLEAN DEFAULT true,
  alerted BOOLEAN DEFAULT false, -- has alert been sent
  last_price DECIMAL(10,2), -- last known price
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX idx_tracked_user_id ON tracked_products(user_id);
CREATE INDEX idx_tracked_product_id ON tracked_products(product_id);
CREATE INDEX idx_tracked_alerted ON tracked_products(alerted, alert_enabled);

-- Product reviews and ratings
CREATE TABLE product_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  helpful_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX idx_reviews_product_id ON product_reviews(product_id);
CREATE INDEX idx_reviews_rating ON product_reviews(rating);

-- Price alerts history
CREATE TABLE price_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  old_price DECIMAL(10,2),
  new_price DECIMAL(10,2),
  retailer VARCHAR(100),
  alert_type VARCHAR(50), -- price_drop, target_reached, back_in_stock
  sent_at TIMESTAMP DEFAULT NOW(),
  clicked BOOLEAN DEFAULT false,
  clicked_at TIMESTAMP
);

CREATE INDEX idx_alerts_user_id ON price_alerts(user_id);
CREATE INDEX idx_alerts_sent_at ON price_alerts(sent_at DESC);

-- Retailer URLs for products
CREATE TABLE product_urls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  retailer VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  last_scraped_at TIMESTAMP,
  scrape_status VARCHAR(50) DEFAULT 'active', -- active, failed, disabled
  error_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id, retailer)
);

CREATE INDEX idx_product_urls_product_id ON product_urls(product_id);
CREATE INDEX idx_product_urls_retailer ON product_urls(retailer);
CREATE INDEX idx_product_urls_scrape_status ON product_urls(scrape_status);

-- Deal scores cache (pre-calculated for performance)
CREATE TABLE deal_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  retailer VARCHAR(100),
  score INT, -- 0-100
  quality VARCHAR(50), -- amazing, great, good, fair, poor
  average_price DECIMAL(10,2),
  min_price DECIMAL(10,2),
  max_price DECIMAL(10,2),
  recommendation TEXT,
  confidence DECIMAL(3,2), -- 0.00 to 1.00
  calculated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id, retailer)
);

CREATE INDEX idx_deal_scores_product_id ON deal_scores(product_id);
CREATE INDEX idx_deal_scores_quality ON deal_scores(quality);
CREATE INDEX idx_deal_scores_score ON deal_scores(score DESC);

-- User settings
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enable_notifications BOOLEAN DEFAULT true,
  enable_email BOOLEAN DEFAULT true,
  alert_frequency VARCHAR(50) DEFAULT 'instant', -- instant, daily, weekly
  deal_threshold VARCHAR(50) DEFAULT 'good', -- all, good, great, amazing
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Scraper logs (for monitoring)
CREATE TABLE scraper_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  retailer VARCHAR(100),
  products_scraped INT DEFAULT 0,
  products_failed INT DEFAULT 0,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  status VARCHAR(50), -- success, partial, failed
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_scraper_logs_retailer ON scraper_logs(retailer);
CREATE INDEX idx_scraper_logs_created_at ON scraper_logs(created_at DESC);

-- Create materialized view for popular products
CREATE MATERIALIZED VIEW popular_products AS
SELECT
  p.id,
  p.name,
  p.brand,
  p.category,
  COUNT(DISTINCT tp.user_id) as watcher_count,
  AVG(pr.rating) as avg_rating,
  COUNT(DISTINCT pr.id) as review_count
FROM products p
LEFT JOIN tracked_products tp ON tp.product_id = p.id
LEFT JOIN product_reviews pr ON pr.product_id = p.id
GROUP BY p.id, p.name, p.brand, p.category
ORDER BY watcher_count DESC;

CREATE UNIQUE INDEX idx_popular_products_id ON popular_products(id);

-- Create view for best deals
CREATE VIEW best_deals_view AS
SELECT
  p.id as product_id,
  p.name,
  p.brand,
  p.category,
  ds.score,
  ds.quality,
  ds.retailer,
  pr.price as current_price,
  ds.average_price,
  ds.min_price,
  ds.recommendation,
  pp.watcher_count,
  pp.avg_rating,
  pp.review_count
FROM products p
JOIN deal_scores ds ON ds.product_id = p.id
JOIN LATERAL (
  SELECT price, in_stock
  FROM prices
  WHERE product_id = p.id
    AND retailer = ds.retailer
  ORDER BY scraped_at DESC
  LIMIT 1
) pr ON true
LEFT JOIN popular_products pp ON pp.id = p.id
WHERE pr.in_stock = true
  AND ds.score >= 70
ORDER BY ds.score DESC, pp.watcher_count DESC NULLS LAST;

-- Functions

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tracked_products_updated_at BEFORE UPDATE ON tracked_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_reviews_updated_at BEFORE UPDATE ON product_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_urls_updated_at BEFORE UPDATE ON product_urls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to refresh popular products materialized view
CREATE OR REPLACE FUNCTION refresh_popular_products()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY popular_products;
END;
$$ LANGUAGE plpgsql;

-- Seed data for testing (optional)
-- Insert sample retailers
INSERT INTO products (name, brand, model, category) VALUES
('Canon EOS R5 Mirrorless Camera Body', 'Canon', 'EOS R5', 'body'),
('Sony A7 IV Mirrorless Camera', 'Sony', 'A7 IV', 'body'),
('Canon RF 24-70mm f/2.8L IS USM Lens', 'Canon', 'RF 24-70mm f/2.8', 'lens'),
('Sony FE 24-70mm f/2.8 GM II Lens', 'Sony', 'FE 24-70mm f/2.8 GM II', 'lens'),
('Nikon Z9 Mirrorless Camera', 'Nikon', 'Z9', 'body')
ON CONFLICT DO NOTHING;

-- Grant permissions (adjust based on your user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO photogear_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO photogear_user;

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts and subscription information';
COMMENT ON TABLE products IS 'Photography equipment products catalog';
COMMENT ON TABLE prices IS 'Historical price data from all retailers';
COMMENT ON TABLE tracked_products IS 'User watchlists for price tracking';
COMMENT ON TABLE deal_scores IS 'Pre-calculated deal quality scores for performance';
COMMENT ON MATERIALIZED VIEW popular_products IS 'Most watched and reviewed products';
COMMENT ON VIEW best_deals_view IS 'Current best deals across all products';
