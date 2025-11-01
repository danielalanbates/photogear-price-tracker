#!/bin/bash

# PhotoGear Price Tracker - Setup Script
# Automates initial setup for the backend

set -e  # Exit on error

echo "📸 PhotoGear Price Tracker - Setup Script"
echo "=========================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm $(npm --version) detected"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL client not found. Please install PostgreSQL 14+."
    echo "   macOS: brew install postgresql@14"
    echo "   Ubuntu: sudo apt install postgresql postgresql-contrib"
    exit 1
fi

echo "✅ PostgreSQL detected"

# Install dependencies
echo ""
echo "📦 Installing npm dependencies..."
npm install

echo ""
echo "✅ Dependencies installed"

# Check for .env file
if [ ! -f ".env" ]; then
    echo ""
    echo "⚙️  Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env file with your configuration:"
    echo "   - Database credentials"
    echo "   - JWT secret"
    echo "   - Email settings"
    echo ""
    read -p "Press Enter to open .env in nano (or Ctrl+C to edit manually later)..."
    nano .env || echo "Edit .env manually with your preferred editor"
else
    echo ""
    echo "✅ .env file already exists"
fi

# Database setup
echo ""
echo "🗃️  Database Setup"
echo "=================="
echo ""
read -p "Do you want to set up the database now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Load database config from .env
    source .env || true

    DB_NAME="${DB_NAME:-photogear_tracker}"
    DB_USER="${DB_USER:-photogear_user}"
    DB_PASSWORD="${DB_PASSWORD:-changeme}"

    echo "Database name: $DB_NAME"
    echo "Database user: $DB_USER"
    echo ""

    # Check if database exists
    if psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        echo "⚠️  Database '$DB_NAME' already exists."
        read -p "Do you want to drop and recreate it? (THIS WILL DELETE ALL DATA!) (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            dropdb "$DB_NAME" || echo "Could not drop database"
        else
            echo "Skipping database creation"
            exit 0
        fi
    fi

    # Create database
    echo "Creating database '$DB_NAME'..."
    createdb "$DB_NAME"
    echo "✅ Database created"

    # Create user (if not exists)
    echo "Setting up database user..."
    psql -d postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || echo "User may already exist"
    psql -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" || true

    # Run schema
    echo "Running database schema..."
    psql -d "$DB_NAME" -f database/schema.sql
    echo "✅ Schema created"

    # Seed sample data (optional)
    echo ""
    read -p "Do you want to seed sample data for testing? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Seeding sample products..."
        psql -d "$DB_NAME" -c "
        INSERT INTO products (name, brand, model, category) VALUES
          ('Canon EOS R5 Mirrorless Camera Body', 'Canon', 'EOS R5', 'body'),
          ('Sony A7 IV Mirrorless Camera', 'Sony', 'A7 IV', 'body'),
          ('Canon RF 24-70mm f/2.8L IS USM Lens', 'Canon', 'RF 24-70mm f/2.8', 'lens'),
          ('Sony FE 24-70mm f/2.8 GM II Lens', 'Sony', 'FE 24-70mm f/2.8 GM II', 'lens'),
          ('Nikon Z9 Mirrorless Camera', 'Nikon', 'Z9', 'body')
        ON CONFLICT DO NOTHING;
        "
        echo "✅ Sample data seeded"
    fi

    echo ""
    echo "✅ Database setup complete!"
fi

# Test scraper (optional)
echo ""
read -p "Do you want to test the B&H Photo scraper? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Running scraper test (this may take 30-60 seconds)..."
    node scrapers/bhphoto.js || echo "⚠️  Scraper test failed. Check logs for details."
fi

# Summary
echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Review and update .env file:"
echo "   nano .env"
echo ""
echo "2. Start the backend server:"
echo "   npm start"
echo "   # or for development with auto-reload:"
echo "   npm run dev"
echo ""
echo "3. Load the Chrome extension:"
echo "   - Open Chrome: chrome://extensions/"
echo "   - Enable 'Developer mode'"
echo "   - Click 'Load unpacked'"
echo "   - Select the 'extension/' folder"
echo ""
echo "4. Test the API:"
echo "   curl http://localhost:3000/health"
echo ""
echo "5. View API documentation:"
echo "   http://localhost:3000/api"
echo ""
echo "📚 Full documentation: README.md"
echo ""
echo "🐛 Issues? Check the troubleshooting section in README.md"
echo ""
echo "Happy price tracking! 📸"
