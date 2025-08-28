# PhilCard

A modern one-page links site with persistent data storage and profile picture cropping.

## Quick Start

### Local Development
```bash
npm install
npm run dev
# Visit http://localhost:3000
```

### VPS Deployment
```bash
chmod +x setup-vps.sh
./setup-vps.sh
```

## Features

- ✅ **Link Management** - Add, edit, delete links with admin authentication
- ✅ **Profile Pictures** - Upload and crop images to 1:1 ratio (optimized to 512x512 WebP)
- ✅ **Data Persistence** - JSON file storage with automatic backups
- ✅ **Import/Export** - Backup and restore functionality
- ✅ **Icon Integration** - Simple Icons support with live preview

## Admin Access

**Default password:** `philuu2025`

Change password:
```bash
node setup-password.js
```

## Deployment & Updates

- **Full deployment:** `./deploy.sh`
- **Frontend only:** `./quick-update.sh`
- **Health check:** `./health-check.sh`

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment guide.

## Project Structure

```
PhilCard/
├── server.js              # Express server
├── var/www/philcard/       # Frontend files
│   ├── index.html
│   ├── script.js
│   └── styles.css
├── data/                   # JSON storage
└── uploads/                # Profile pictures
```

## Troubleshooting

```bash
# Check status
pm2 status

# View logs
pm2 logs philcard

# Restart
pm2 restart philcard
```

For detailed setup instructions, see [SETUP.md](SETUP.md).


