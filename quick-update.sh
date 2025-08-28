#!/bin/bash

# Quick Update Script for PhilCard
# This script quickly updates just the frontend files (HTML, CSS, JS)
# Use this when you only changed frontend code and don't need to restart the server

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/philcard"
FRONTEND_DIR="$APP_DIR/var/www/philcard"

echo -e "${BLUE}⚡ Quick frontend update...${NC}"

# Check if we're on the VPS
if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}❌ App directory $APP_DIR not found.${NC}"
    exit 1
fi

cd "$APP_DIR"

# Pull latest changes if using git
if [ -d ".git" ]; then
    echo -e "${YELLOW}📥 Pulling latest frontend changes...${NC}"
    git pull origin main
else
    echo -e "${YELLOW}⚠️  Please upload your updated files manually.${NC}"
    echo "Files to update:"
    echo "  - var/www/philcard/index.html"
    echo "  - var/www/philcard/script.js"
    echo "  - var/www/philcard/styles.css"
    exit 0
fi

echo -e "${GREEN}✅ Frontend updated successfully!${NC}"
echo -e "${YELLOW}📝 Changes will be visible immediately (no server restart needed)${NC}"
