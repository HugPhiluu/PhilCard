# PhilCard Deployment Guide

## Overview

This guide covers the best practices for deploying updates to your PhilCard VPS safely and efficiently.

## Deployment Methods

### 1. 🚀 Full Deployment (`deploy.sh`)

**Use this when:**
- You've made changes to server-side code (server.js, package.json)
- You've added new npm dependencies
- You want the safest deployment with automatic rollback

**Features:**
- Automatic backup before deployment
- Zero-downtime restart using PM2
- Automatic rollback on failure
- Cleanup of old backups
- Comprehensive error checking

```bash
# On your VPS
chmod +x deploy.sh
./deploy.sh
```

### 2. ⚡ Quick Frontend Update (`quick-update.sh`)

**Use this when:**
- You only changed frontend files (HTML, CSS, JS)
- You want the fastest possible update
- No server restart needed

```bash
# On your VPS
chmod +x quick-update.sh
./quick-update.sh
```

### 3. 🔧 Manual Update Process

If you prefer manual control or the scripts don't work for your setup:

```bash
# 1. Create backup
cp -r /var/www/philcard /var/backups/philcard_$(date +%Y%m%d_%H%M%S)

# 2. Update code
cd /var/www/philcard
git pull origin main  # or upload files manually

# 3. Update dependencies (if needed)
npm install --omit=dev

# 4. Restart application
pm2 restart philcard
```

## Git-Based Deployment (Recommended)

### Initial Setup on VPS

```bash
# 1. Clone your repository
cd /var/www/
git clone https://github.com/HugPhiluu/PhilCard.git philcard
cd philcard

# 2. Run initial setup
chmod +x setup-vps.sh
./setup-vps.sh
```

### Deploying Updates

```bash
# For full deployment
./deploy.sh

# For frontend-only updates
./quick-update.sh
```

## Alternative: GitHub Actions (Advanced)

Create `.github/workflows/deploy.yml` for automatic deployment:

```yaml
name: Deploy to VPS

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - name: Deploy to VPS
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.VPS_HOST }}
        username: ${{ secrets.VPS_USERNAME }}
        key: ${{ secrets.VPS_SSH_KEY }}
        script: |
          cd /var/www/philcard
          ./deploy.sh
```

## Security Best Practices

### 1. Use SSH Keys
```bash
# Generate SSH key pair (on your local machine)
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# Copy public key to VPS
ssh-copy-id user@your-vps-ip
```

### 2. Backup Strategy
```bash
# Create automated backup script
cat > /home/user/backup-philcard.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/philcard"
mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_DIR/philcard_$(date +%Y%m%d_%H%M%S).tar.gz" \
  /var/www/philcard/data \
  /var/www/philcard/uploads
# Keep only last 10 backups
ls -t "$BACKUP_DIR"/*.tar.gz | tail -n +11 | xargs rm -f
EOF

# Add to crontab for daily backups
crontab -e
# Add this line:
# 0 2 * * * /home/user/backup-philcard.sh
```

## Troubleshooting

### App Won't Start After Deployment
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs philcard

# Manual restart
pm2 restart philcard

# If still failing, rollback
pm2 stop philcard
# Restore from latest backup in /var/backups/philcard/
```

### Permission Issues
```bash
# Fix ownership
sudo chown -R $USER:$USER /var/www/philcard

# Fix uploads directory permissions
chmod 755 /var/www/philcard/uploads
```

### Git Issues
```bash
# Reset to clean state
git reset --hard HEAD
git clean -fd

# Then try deployment again
```

## Monitoring

### Health Checks
```bash
# Check if app is responding
curl -f http://localhost:3000 || echo "App is down!"

# Check PM2 status
pm2 status

# View resource usage
pm2 monit
```

### Log Management
```bash
# View real-time logs
pm2 logs philcard --lines 100

# Save logs to file
pm2 logs philcard > philcard.log
```

## Performance Tips

1. **Enable Nginx caching** for static assets
2. **Use PM2 cluster mode** for better performance:
   ```bash
   pm2 start server.js --name philcard -i max
   ```
3. **Monitor resource usage** with `pm2 monit`
4. **Set up log rotation** to prevent disk space issues

## Quick Reference

| Task | Command |
|------|---------|
| Full deployment | `./deploy.sh` |
| Frontend update | `./quick-update.sh` |
| View status | `pm2 status` |
| View logs | `pm2 logs philcard` |
| Restart app | `pm2 restart philcard` |
| Stop app | `pm2 stop philcard` |
| Backup manually | `cp -r /var/www/philcard /var/backups/philcard_$(date +%Y%m%d_%H%M%S)` |

Remember to always test your changes locally before deploying to production!
