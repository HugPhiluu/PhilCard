#!/bin/bash

# PhilCard VPS Setup Script
# Run this script on your VPS to automatically set up PhilCard

set -e

echo "🚀 Starting PhilCard VPS Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}This script should not be run as root${NC}"
   exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Node.js version 18 or higher is required. Current version: $(node --version)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node --version) detected${NC}"

# Create application directory
APP_DIR="/var/www/philcard"
echo "📁 Creating application directory: $APP_DIR"

if [ ! -d "$APP_DIR" ]; then
    sudo mkdir -p "$APP_DIR"
    sudo chown $USER:$USER "$APP_DIR"
fi

cd "$APP_DIR"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create required directories
echo "📂 Creating required directories..."
mkdir -p data
mkdir -p uploads
chmod 755 uploads

# Generate secure admin password if config doesn't exist
if [ ! -f "data/config.json" ]; then
    echo "🔐 Setting up initial configuration..."
    
    # Prompt for admin password
    read -s -p "Enter admin password (or press Enter for 'philuu2025'): " ADMIN_PASSWORD
    echo
    
    if [ -z "$ADMIN_PASSWORD" ]; then
        ADMIN_PASSWORD="philuu2025"
    fi
    
    # Generate password hash
    HASH=$(node -e "
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('$ADMIN_PASSWORD', 10);
    console.log(hash);
    ")
    
    # Create config file
    cat > data/config.json << EOF
{
  "profile": {
    "name": "Philuu",
    "description": "Developer, creator, and tech enthusiast",
    "avatar": "PU"
  },
  "adminPasswordHash": "$HASH"
}
EOF
    
    echo -e "${GREEN}✓ Configuration created${NC}"
fi

# Install PM2 if not installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
fi

# Stop existing PM2 process if running
pm2 stop philcard 2>/dev/null || true
pm2 delete philcard 2>/dev/null || true

# Start application with PM2
echo "🚀 Starting PhilCard with PM2..."
pm2 start server.js --name philcard

# Save PM2 configuration
pm2 save

# Setup PM2 startup
echo "⚙️ Setting up PM2 startup..."
pm2 startup | tail -n 1 | sudo bash || true

echo -e "${GREEN}✅ PhilCard setup complete!${NC}"
echo
echo "🌐 Your PhilCard is now running on:"
echo "   http://$(hostname -I | awk '{print $1}'):3000"
echo
echo "📋 Next steps:"
echo "   1. Configure your domain/DNS to point to this server"
echo "   2. Setup Nginx reverse proxy (see SETUP.md)"
echo "   3. Setup SSL certificate with Let's Encrypt"
echo "   4. Test your site and start adding links!"
echo
echo "🔧 Useful commands:"
echo "   pm2 status         - Check application status"
echo "   pm2 logs philcard  - View application logs"
echo "   pm2 restart philcard - Restart application"
echo
echo -e "${YELLOW}⚠️  Remember to backup your data/ and uploads/ directories regularly!${NC}"
