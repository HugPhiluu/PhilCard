# PhilCard - VPS Setup and Installation Guide

## Prerequisites

- Node.js 18+ installed on your VPS
- PM2 for process management (optional but recommended)
- Nginx for reverse proxy (optional but recommended)
- Domain name pointing to your VPS IP

## Installation Steps

### 1. Upload Files to VPS

```bash
# Create application directory
sudo mkdir -p /var/www/philcard
sudo chown $USER:$USER /var/www/philcard

# Upload your files to /var/www/philcard
# You can use scp, git clone, or any file transfer method
```

### 2. Install Dependencies

```bash
cd /var/www/philcard
npm install
```

### 3. Set Admin Password

The default admin password is "philuu2025". To change it:

```bash
# Generate new password hash
node -e "
const bcrypt = require('bcryptjs');
const password = 'YOUR_NEW_PASSWORD';
const hash = bcrypt.hashSync(password, 10);
console.log('Password hash:', hash);
"
```

Then update the `data/config.json` file with the new hash.

### 4. Create Required Directories

```bash
# Create data directory for JSON storage
mkdir -p data

# Create uploads directory for profile pictures
mkdir -p uploads
chmod 755 uploads
```

The application will automatically create the necessary JSON files on first run.

### 5. Test the Application

```bash
npm start
```

Visit `http://your-server-ip:3000` to test.

### 6. Setup PM2 (Recommended)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the application with PM2
pm2 start server.js --name philcard

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions displayed
```

### 7. Setup Nginx (Recommended)

Create nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/philcard
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase file upload size limit for profile pictures
        client_max_body_size 50M;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/philcard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8. Setup SSL with Let's Encrypt (Recommended)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## Configuration

### Environment Variables

You can set these environment variables:

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (production/development)

### Data Persistence

Data is stored in JSON files and uploaded files:
- `data/links.json`: Your links data
- `data/config.json`: Site configuration, admin password, and profile settings
- `uploads/`: Profile pictures and other uploaded files

### Profile Configuration

You can edit your profile in two ways:

**Via Admin Interface (Recommended):**
1. Sign in with admin password
2. Click the ✏️ edit button in your profile header
3. Update name, description, and upload profile picture
4. Save changes

**Via Configuration File:**
Edit `data/config.json`:
```json
{
  "profile": {
    "name": "Your Name",
    "description": "Your description",
    "avatar": "YN",
    "avatarUrl": "/uploads/avatar-filename.jpg"
  }
}
```

### Backup

Regularly backup your data and uploaded files:

```bash
# Create complete backup (recommended)
tar -czf philcard-backup-$(date +%Y%m%d).tar.gz data/ uploads/

# Create data-only backup
tar -czf philcard-data-backup-$(date +%Y%m%d).tar.gz data/

# Restore complete backup
tar -xzf philcard-backup-YYYYMMDD.tar.gz

# Restore data-only backup
tar -xzf philcard-data-backup-YYYYMMDD.tar.gz
```

## Usage

1. Visit your domain
2. Sign in as admin using the 🔒 Admin button
3. Use the admin password to authenticate
4. **Manage Links:**
   - Click the "+" button to add new links
   - Edit or delete existing links using the ✏️ and 🗑️ buttons
5. **Edit Profile:**
   - Click the ✏️ button in your profile header
   - Update your name, description, and profile picture
   - Upload images of any reasonable size
6. **Backup/Restore:**
   - Use export/import buttons to backup/restore your data

## Troubleshooting

### Check Application Status
```bash
pm2 status
pm2 logs philcard
```

### Check Port Usage
```bash
sudo netstat -tlnp | grep :3000
```

### Restart Application
```bash
pm2 restart philcard
```

### View Logs
```bash
pm2 logs philcard --lines 50
```

### File Permission Issues
```bash
# Fix application permissions
sudo chown -R $USER:$USER /var/www/philcard

# Fix uploads directory permissions
chmod 755 uploads/
chown $USER:$USER uploads/

# Check uploads directory
ls -la uploads/
```

### Profile Picture Upload Issues
```bash
# Ensure uploads directory exists and is writable
mkdir -p uploads && chmod 755 uploads

# Check disk space
df -h

# Check nginx upload size limit (if using nginx)
sudo nginx -t
```

## Security

- Change the default admin password immediately
- Use HTTPS in production (Let's Encrypt)
- Set proper file permissions for uploads directory
- Consider setting up a firewall
- Regular backups of data and uploads directories
- Keep Node.js and dependencies updated
- Monitor uploaded file sizes and types

## Updates

To update the application:

```bash
# Stop the application
pm2 stop philcard

# Pull updates (if using git)
git pull

# Install new dependencies
npm install

# Restart the application
pm2 start philcard
```
