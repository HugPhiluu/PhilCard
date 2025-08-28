#!/bin/bash

# PhilCard Health Check Script
# Verifies that your PhilCard deployment is working correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PORT=3000
PM2_APP_NAME="philcard"

echo -e "${BLUE}🩺 PhilCard Health Check${NC}"
echo "=========================="

# Check PM2 status
echo -e "${YELLOW}Checking PM2 status...${NC}"
if pm2 list | grep -q "$PM2_APP_NAME.*online"; then
    echo -e "${GREEN}✓ PM2 process is online${NC}"
else
    echo -e "${RED}❌ PM2 process is not running${NC}"
    pm2 status
    exit 1
fi

# Check if port is listening
echo -e "${YELLOW}Checking port $PORT...${NC}"
if netstat -tuln | grep -q ":$PORT "; then
    echo -e "${GREEN}✓ Port $PORT is listening${NC}"
else
    echo -e "${RED}❌ Port $PORT is not listening${NC}"
    exit 1
fi

# Check HTTP response
echo -e "${YELLOW}Checking HTTP response...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/ || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ HTTP server responding (Status: $HTTP_STATUS)${NC}"
else
    echo -e "${RED}❌ HTTP server not responding properly (Status: $HTTP_STATUS)${NC}"
    exit 1
fi

# Check disk space
echo -e "${YELLOW}Checking disk space...${NC}"
DISK_USAGE=$(df /var/www/philcard | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 90 ]; then
    echo -e "${GREEN}✓ Disk space OK ($DISK_USAGE% used)${NC}"
else
    echo -e "${YELLOW}⚠️  Disk space warning ($DISK_USAGE% used)${NC}"
fi

# Check memory usage
echo -e "${YELLOW}Checking memory usage...${NC}"
pm2 show "$PM2_APP_NAME" | grep "memory usage" || echo "Memory info not available"

# Check recent logs for errors
echo -e "${YELLOW}Checking recent logs for errors...${NC}"
ERROR_COUNT=$(pm2 logs "$PM2_APP_NAME" --lines 50 --nostream 2>/dev/null | grep -i "error\|exception\|fail" | wc -l)
if [ "$ERROR_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✓ No recent errors in logs${NC}"
else
    echo -e "${YELLOW}⚠️  Found $ERROR_COUNT recent errors in logs${NC}"
    echo "Run 'pm2 logs $PM2_APP_NAME' to investigate"
fi

echo
echo -e "${GREEN}🎉 Health check completed!${NC}"
echo
echo -e "${BLUE}📊 Summary:${NC}"
pm2 show "$PM2_APP_NAME" --no-color | grep -E "(status|uptime|restarts|cpu|memory)" || true
echo
echo -e "${YELLOW}💡 Useful commands:${NC}"
echo "   pm2 logs $PM2_APP_NAME    - View logs"
echo "   pm2 monit              - Real-time monitoring"
echo "   pm2 restart $PM2_APP_NAME - Restart application"
