# PhilCard VPS Deployment

A modern, persistent one-page links site that can be deployed on a VPS with full data persistence.

## What's New

Your PhilCard site now includes:

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

### For Admins
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
Default: `philuu2025`

To change:
1. Generate hash: `node -e "console.log(require('bcryptjs').hashSync('newpassword', 10))"`
2. Update `data/config.json` with new hash

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


### Profile Management
- **Edit Profile** - Click the ✏️ button when signed in as admin
- **Profile Pictures** - Upload images of any reasonable size
- **Live Preview** - See your image before saving
- **Automatic Cleanup** - Old profile pictures are automatically removed
- **Fallback Support** - Text avatars when no image is uploaded

### Enhanced Admin Interface
- **Profile Controls** - Edit button appears in admin mode
- **Form Validation** - Smart validation for all inputs
- **File Management** - Secure image upload system
- **Notifications** - Success/error messages for all actions

### Technical Improvements
- **File Upload API** - Dedicated endpoints for profile pictures
- **Image Processing** - Proper handling of different image formats
- **Storage Management** - Organized file structure in `/uploads`
- **Error Handling** - Comprehensive error handling for uploads

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

Your PhilCard is now VPS-ready with full persistence! 🚀
