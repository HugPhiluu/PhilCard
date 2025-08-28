const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'links.json');
const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      await fs.mkdir(UPLOADS_DIR, { recursive: true });
      cb(null, UPLOADS_DIR);
    } catch (error) {
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    // Generate unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'avatar-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit (generous for personal use)
  },
  fileFilter: function (req, file, cb) {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for simplicity
}));
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Auth rate limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // limit each IP to 5 auth requests per windowMs
});

// Serve static files
app.use(express.static(path.join(__dirname, 'var/www/philcard')));
app.use('/uploads', express.static(UPLOADS_DIR));

// Initialize data directory and files
async function initializeData() {
  try {
    await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    
    // Initialize links file if it doesn't exist
    try {
      await fs.access(DATA_FILE);
    } catch {
      await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2));
    }
    
    // Initialize config file if it doesn't exist
    try {
      await fs.access(CONFIG_FILE);
    } catch {
      const defaultConfig = {
        profile: {
          name: "Philuu",
          description: "Developer, creator, and tech enthusiast",
          avatar: "PU"
        },
        // Default password hash for 'philuu2025'
        adminPasswordHash: "$2a$10$YourHashedPasswordHere"
      };
      await fs.writeFile(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
    }
  } catch (error) {
    console.error('Error initializing data:', error);
  }
}

// Helper functions
async function loadLinks() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading links:', error);
    return [];
  }
}

async function saveLinks(links) {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(links, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving links:', error);
    return false;
  }
}

async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading config:', error);
    return null;
  }
}

async function saveConfig(config) {
  try {
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
}

// Authentication middleware
async function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    // Simple token verification (decode base64)
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const [password] = decoded.split('philcard');
    
    const config = await loadConfig();
    if (!config || !config.adminPasswordHash) {
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const isValid = await bcrypt.compare(password, config.adminPasswordHash);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid authentication' });
    }
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Invalid authentication' });
  }
}

// API Routes

// Get all links (public)
app.get('/api/links', async (req, res) => {
  try {
    const links = await loadLinks();
    res.json(links);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load links' });
  }
});

// Get config (public - only non-sensitive data)
app.get('/api/config', async (req, res) => {
  try {
    const config = await loadConfig();
    if (!config) {
      return res.status(500).json({ error: 'Failed to load config' });
    }
    
    // Only return public config data
    res.json({
      profile: config.profile
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load config' });
  }
});

// Authenticate admin
app.post('/api/auth', authLimiter, async (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }
  
  try {
    const config = await loadConfig();
    if (!config || !config.adminPasswordHash) {
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const isValid = await bcrypt.compare(password, config.adminPasswordHash);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    // Generate simple token
    const token = Buffer.from(password + 'philcard').toString('base64');
    
    res.json({ 
      success: true, 
      token,
      expiresIn: 24 * 60 * 60 * 1000 // 24 hours
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Add link (requires auth)
app.post('/api/links', authenticateAdmin, async (req, res) => {
  const { title, url, subtitle, iconName, iconType } = req.body;
  
  if (!title || !url) {
    return res.status(400).json({ error: 'Title and URL are required' });
  }
  
  try {
    const links = await loadLinks();
    
    const newLink = {
      id: Date.now().toString(),
      title,
      url,
      subtitle: subtitle || '',
      iconName: iconName || 'link',
      iconType: iconType || 'simple',
      createdAt: new Date().toISOString()
    };
    
    links.push(newLink);
    
    const saved = await saveLinks(links);
    if (!saved) {
      return res.status(500).json({ error: 'Failed to save link' });
    }
    
    res.status(201).json(newLink);
  } catch (error) {
    console.error('Error adding link:', error);
    res.status(500).json({ error: 'Failed to add link' });
  }
});

// Update link (requires auth)
app.put('/api/links/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, url, subtitle, iconName, iconType } = req.body;
  
  if (!title || !url) {
    return res.status(400).json({ error: 'Title and URL are required' });
  }
  
  try {
    const links = await loadLinks();
    const linkIndex = links.findIndex(link => link.id === id);
    
    if (linkIndex === -1) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    links[linkIndex] = {
      ...links[linkIndex],
      title,
      url,
      subtitle: subtitle || '',
      iconName: iconName || 'link',
      iconType: iconType || 'simple',
      updatedAt: new Date().toISOString()
    };
    
    const saved = await saveLinks(links);
    if (!saved) {
      return res.status(500).json({ error: 'Failed to update link' });
    }
    
    res.json(links[linkIndex]);
  } catch (error) {
    console.error('Error updating link:', error);
    res.status(500).json({ error: 'Failed to update link' });
  }
});

// Delete link (requires auth)
app.delete('/api/links/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    const links = await loadLinks();
    const linkIndex = links.findIndex(link => link.id === id);
    
    if (linkIndex === -1) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    const deletedLink = links.splice(linkIndex, 1)[0];
    
    const saved = await saveLinks(links);
    if (!saved) {
      return res.status(500).json({ error: 'Failed to delete link' });
    }
    
    res.json({ success: true, deletedLink });
  } catch (error) {
    console.error('Error deleting link:', error);
    res.status(500).json({ error: 'Failed to delete link' });
  }
});

// Update profile (requires auth)
app.put('/api/profile', authenticateAdmin, async (req, res) => {
  const { name, description, avatar } = req.body;
  
  try {
    const config = await loadConfig();
    if (!config) {
      return res.status(500).json({ error: 'Failed to load config' });
    }
    
    // Update profile data
    config.profile = {
      ...config.profile,
      ...(name && { name }),
      ...(description && { description }),
      ...(avatar && { avatar })
    };
    
    const saved = await saveConfig(config);
    if (!saved) {
      return res.status(500).json({ error: 'Failed to save profile' });
    }
    
    res.json({ 
      success: true, 
      profile: config.profile 
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Upload profile picture (requires auth)
app.post('/api/profile/avatar', authenticateAdmin, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const config = await loadConfig();
    if (!config) {
      return res.status(500).json({ error: 'Failed to load config' });
    }
    
    // Remove old avatar file if it exists and is not the default
    if (config.profile.avatarUrl && config.profile.avatarUrl.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, config.profile.avatarUrl);
      try {
        await fs.unlink(oldPath);
      } catch (error) {
        // Ignore error if file doesn't exist
      }
    }
    
    // Update config with new avatar URL
    config.profile.avatarUrl = '/uploads/' + req.file.filename;
    
    const saved = await saveConfig(config);
    if (!saved) {
      return res.status(500).json({ error: 'Failed to save avatar' });
    }
    
    res.json({ 
      success: true, 
      avatarUrl: config.profile.avatarUrl,
      profile: config.profile
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Update settings (requires auth)
app.put('/api/settings', authenticateAdmin, async (req, res) => {
  const { settings } = req.body;
  
  try {
    const config = await loadConfig();
    if (!config) {
      return res.status(500).json({ error: 'Failed to load config' });
    }
    
    // Update settings data
    config.settings = {
      ...config.settings,
      ...settings
    };
    
    const saved = await saveConfig(config);
    if (!saved) {
      return res.status(500).json({ error: 'Failed to save settings' });
    }
    
    res.json({ 
      success: true, 
      settings: config.settings 
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Upload background image (requires auth)
app.post('/api/settings/background', authenticateAdmin, upload.single('background'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const config = await loadConfig();
    if (!config) {
      return res.status(500).json({ error: 'Failed to load config' });
    }
    
    // Remove old background file if it exists
    if (config.settings && config.settings.backgroundImageUrl && config.settings.backgroundImageUrl.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, config.settings.backgroundImageUrl);
      try {
        await fs.unlink(oldPath);
      } catch (error) {
        // Ignore error if file doesn't exist
      }
    }
    
    // Update config with new background URL
    if (!config.settings) config.settings = {};
    config.settings.backgroundImageUrl = '/uploads/' + req.file.filename;
    
    const saved = await saveConfig(config);
    if (!saved) {
      return res.status(500).json({ error: 'Failed to save background image' });
    }
    
    res.json({ 
      success: true, 
      imageUrl: config.settings.backgroundImageUrl
    });
  } catch (error) {
    console.error('Error uploading background image:', error);
    res.status(500).json({ error: 'Failed to upload background image' });
  }
});

// Bulk operations (requires auth)
app.post('/api/links/bulk', authenticateAdmin, async (req, res) => {
  const { operation, links: newLinks } = req.body;
  
  if (operation === 'replace' && Array.isArray(newLinks)) {
    try {
      const saved = await saveLinks(newLinks);
      if (!saved) {
        return res.status(500).json({ error: 'Failed to save links' });
      }
      
      res.json({ success: true, count: newLinks.length });
    } catch (error) {
      console.error('Error in bulk operation:', error);
      res.status(500).json({ error: 'Bulk operation failed' });
    }
  } else {
    res.status(400).json({ error: 'Invalid bulk operation' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch all handler - serve index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'var/www/philcard/index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize and start server
async function start() {
  await initializeData();
  
  app.listen(PORT, () => {
    console.log(`🚀 PhilCard server running on port ${PORT}`);
    console.log(`📱 Access your site at: http://localhost:${PORT}`);
    console.log(`🔧 API available at: http://localhost:${PORT}/api`);
  });
}

start().catch(console.error);
