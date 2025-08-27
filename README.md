# PhilCard VPS Deployment

A modern, persistent one-page links site that can be deployed on a VPS with full data persistence.

## Features

✅ **Backend API** - Node.js/Express server for data persistence
✅ **Database** - JSON file storage (easily upgradeable to PostgreSQL/MongoDB)
✅ **Authentication** - Secure admin authentication for editing
✅ **Profile Management** - Edit profile info and upload profile pictures
✅ **File Upload** - Profile picture upload with automatic cleanup
✅ **API Endpoints** - REST API for all CRUD operations
✅ **Data Persistence** - All changes are saved on the server
✅ **Import/Export** - Backup and restore functionality
✅ **VPS Ready** - Complete deployment setup

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access at http://localhost:3000
```

## VPS Deployment

### Quick Setup (Recommended)

1. Upload all files to your VPS
2. Run the setup script:
```bash
chmod +x setup-vps.sh
./setup-vps.sh
```

### Manual Setup

See [SETUP.md](SETUP.md) for detailed manual installation instructions.

## Project Structure

```
PhilCard/
├── server.js              # Express server with file upload support
├── package.json           # Dependencies (includes multer for uploads)
├── var/
│   └── www/philcard/    # Alternative frontend deployment
│       ├── index.html     # Updated with profile functionality
│       ├── styles.css     # Complete styles
│       └── script.js      # Complete JavaScript functionality
├── data/                  # Data storage (created automatically)
│   ├── links.json         # Your links data
│   └── config.json        # Site configuration with profile data
├── uploads/               # Profile picture uploads (created automatically)
├── SETUP.md              # Detailed setup guide
└── setup-vps.sh          # Automated setup script
```

## Features

### For Users
- **Modern UI** - Beautiful, responsive design
- **Easy Management** - Add, edit, delete links with simple interface
- **Profile Editing** - Update name, description, and profile picture
- **Profile Pictures** - Upload images of any size (optimized for personal use)
- **Import/Export** - Backup and restore your data
- **Icon Integration** - Simple Icons support with live preview

### For Adminstration
- **Secure Authentication** - Password-protected admin access
- **Profile Management** - Edit profile information and upload pictures
- **File Upload System** - Secure image upload with automatic cleanup
- **Persistent Storage** - All changes saved to server
- **REST API** - Full API for integrations
- **Rate Limiting** - Protection against abuse
- **Easy Backup** - Simple JSON file storage

## API Endpoints

### Public
- `GET /api/links` - Get all links
- `GET /api/config` - Get public configuration
- `GET /api/health` - Health check

### Admin (requires authentication)
- `POST /api/auth` - Authenticate admin
- `POST /api/links` - Add new link
- `PUT /api/links/:id` - Update link
- `DELETE /api/links/:id` - Delete link
- `POST /api/links/bulk` - Bulk operations
- `PUT /api/profile` - Update profile information
- `POST /api/profile/avatar` - Upload profile picture

## Configuration

### Admin Password

**Default password:** `philuu2025`

#### To change the admin password:

**Recommended:**  
Use the provided script to set a new password and update the hash automatically:

```bash
node setup-password.js
```
Follow the prompts to enter your new password. This will update `data/config.json` with the new hash.

**Quick method:**  
If you want to generate a hash quickly without prompts:

```bash
node quick-password.js "yournewpassword"
```
Copy the generated hash and manually update the `adminPasswordHash` field in `data/config.json`.

**Note:**  
Never store plain text passwords. Always use a secure hash as shown above.

### Profile Settings
Edit `data/config.json`:
```json
{
  "profile": {
    "name": "Your Name",
    "description": "Your description",
    "avatar": "YN",
    "avatarUrl": "/uploads/avatar-123456789.jpg"
  }
}
```

**Or use the admin interface:**
1. Sign in as admin
2. Click the ✏️ edit button in your profile header
3. Update your information and upload a profile picture
4. Save changes

## Backup & Restore

### Backup
```bash
# Backup everything including uploaded files
tar -czf philcard-backup-$(date +%Y%m%d).tar.gz data/ uploads/

# Or backup just the data
tar -czf philcard-data-backup-$(date +%Y%m%d).tar.gz data/
```

### Restore
```bash
# Restore everything
tar -xzf philcard-backup-YYYYMMDD.tar.gz

# Or restore just data
tar -xzf philcard-data-backup-YYYYMMDD.tar.gz
```

## Security

- ✅ Password authentication
- ✅ File upload validation (images only)
- ✅ Generous file size limits for personal use (50MB)
- ✅ Automatic cleanup of old profile pictures
- ✅ Rate limiting
- ✅ CORS protection
- ✅ Input validation
- ✅ Helmet security headers

## Production Recommendations

1. **Use HTTPS** - Setup SSL certificate
2. **Use Nginx** - Reverse proxy for better performance
3. **Regular Backups** - Automate data directory backups
4. **Monitor Logs** - Use PM2 for process management
5. **Update Dependencies** - Keep packages up to date

## Migration from localStorage

If you have an existing PhilCard with localStorage data:

1. Export your current data using the export button
2. Deploy the new version
3. Import your data using the import button


## Troubleshooting

**Port Issues**
```bash
sudo netstat -tlnp | grep :3000
```

**Check Logs**
```bash
pm2 logs philcard
```

**Restart Service**
```bash
pm2 restart philcard
```

**File Permissions**
```bash
sudo chown -R $USER:$USER /var/www/philcard
chmod 755 uploads/  # Ensure uploads directory is writable
```

**Profile Picture Issues**
```bash
# Check uploads directory exists and is writable
ls -la uploads/
# If it doesn't exist, create it
mkdir -p uploads && chmod 755 uploads
```

## Support

For issues or questions:
1. Check the logs: `pm2 logs philcard`
2. Verify all files are uploaded correctly
3. Ensure Node.js 18+ is installed
4. Check file permissions

# Submit an issue

If you encounter bugs or have feature requests, please [open an issue](https://github.com/Philuu/PhilCard/issues) on GitHub.  
Include details and steps to reproduce the problem for faster assistance.

---

Thank you for reading!


