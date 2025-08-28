#!/bin/bash

# PhilCard Deployment Script
# This script safely deploys updates to your VPS with zero downtime

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/home/ubuntu/philcard"
BACKUP_DIR="/home/ubuntu/backups/philcard"
PM2_APP_NAME="philcard"

echo -e "${BLUE}🚀 Starting PhilCard deployment...${NC}"

# Check if we're on the VPS (has the app directory)
if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}❌ App directory $APP_DIR not found. Are you on the correct server?${NC}"
    exit 1
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 not found. Please install PM2 first.${NC}"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PATH="$BACKUP_DIR/backup_$TIMESTAMP"

echo -e "${YELLOW}📦 Creating backup...${NC}"
cp -r "$APP_DIR" "$BACKUP_PATH"
echo -e "${GREEN}✓ Backup created at: $BACKUP_PATH${NC}"

# Change to app directory
cd "$APP_DIR"

# Check if package.json exists, if not create it
if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}📋 Creating package.json...${NC}"
    cat > package.json << 'EOF'
{
  "name": "philcard",
  "version": "1.0.0",
  "description": "Modern one-page links site with persistent data storage and profile picture cropping",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "setup-password": "node setup-password.js",
    "quick-password": "node quick-password.js",
    "deploy": "chmod +x deploy.sh && ./deploy.sh",
    "quick-update": "chmod +x quick-update.sh && ./quick-update.sh"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "bcryptjs": "^2.4.3",
    "multer": "^1.4.5-lts.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "keywords": [
    "links",
    "profile",
    "portfolio"
  ],
  "author": "Philuu",
  "license": "MIT"
}
EOF
    echo -e "${GREEN}✓ package.json created${NC}"
fi

# Pull latest changes from git (if using git)
if [ -d ".git" ]; then
    echo -e "${YELLOW}📥 Pulling latest changes from git...${NC}"
    git pull origin main 2>/dev/null || {
        echo -e "${YELLOW}⚠️  Git pull failed or no remote configured. Continuing with local files...${NC}"
    }
    echo -e "${GREEN}✓ Code updated${NC}"
else
    echo -e "${YELLOW}⚠️  Not a git repository. Using local files.${NC}"
fi

# Install/update dependencies
echo -e "${YELLOW}📦 Installing/updating dependencies...${NC}"
npm install --omit=dev
echo -e "${GREEN}✓ Dependencies updated${NC}"

# Check if app is currently running
if pm2 list | grep -q "$PM2_APP_NAME"; then
    echo -e "${YELLOW}🔄 Gracefully restarting application...${NC}"
    pm2 restart "$PM2_APP_NAME" --update-env
else
    echo -e "${YELLOW}🚀 Starting application...${NC}"
    pm2 start server.js --name "$PM2_APP_NAME"
fi

# Wait a moment for the app to start
sleep 3

# Check if the app is running properly
if pm2 list | grep "$PM2_APP_NAME" | grep -q "online"; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${GREEN}✓ $PM2_APP_NAME is running${NC}"
    
    # Show status
    pm2 show "$PM2_APP_NAME"
    
    # Clean up old backups (keep last 5)
    echo -e "${YELLOW}🧹 Cleaning up old backups...${NC}"
    find "$BACKUP_DIR" -name "backup_*" -type d | sort -r | tail -n +6 | xargs -r rm -rf 2>/dev/null || true
    echo -e "${GREEN}✓ Cleanup complete${NC}"
    
else
    echo -e "${RED}❌ Deployment failed! App is not running properly.${NC}"
    echo -e "${YELLOW}🔄 Rolling back to previous version...${NC}"
    
    # Stop the failed deployment
    pm2 stop "$PM2_APP_NAME" 2>/dev/null || true
    pm2 delete "$PM2_APP_NAME" 2>/dev/null || true
    
    # Restore from backup
    rm -rf "$APP_DIR"
    cp -r "$BACKUP_PATH" "$APP_DIR"
    cd "$APP_DIR"
    
    # Start the backup version
    pm2 start server.js --name "$PM2_APP_NAME"
    
    echo -e "${RED}❌ Rollback complete. Please check the logs and try again.${NC}"
    echo -e "${YELLOW}📋 Check logs with: pm2 logs $PM2_APP_NAME${NC}"
    exit 1
fi

echo
echo -e "${BLUE}🎉 Deployment completed successfully!${NC}"
echo
echo -e "${YELLOW}📋 Useful commands:${NC}"
echo "   pm2 status              - Check app status"
echo "   pm2 logs $PM2_APP_NAME     - View logs"
echo "   pm2 restart $PM2_APP_NAME  - Restart app"
echo "   pm2 stop $PM2_APP_NAME     - Stop app"
echo
echo -e "${YELLOW}🔧 Rollback command (if needed):${NC}"
echo "   pm2 stop $PM2_APP_NAME && rm -rf $APP_DIR && cp -r $BACKUP_PATH $APP_DIR && cd $APP_DIR && pm2 start server.js --name $PM2_APP_NAME"
