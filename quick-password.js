#!/usr/bin/env node

// Quick Password Setup - Pass password as argument
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');

async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {
      profile: {
        name: "Philuu",
        description: "Developer, creator, and tech enthusiast",
        avatar: "PU"
      }
    };
  }
}

async function saveConfig(config) {
  try {
    await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
}

async function main() {
  const password = process.argv[2];
  
  if (!password) {
    console.log('🔐 PhilCard Quick Password Setup');
    console.log('');
    console.log('Usage:');
    console.log('  node quick-password.js "your-password-here"');
    console.log('');
    console.log('Example:');
    console.log('  node quick-password.js "philuu2025"');
    console.log('');
    console.log('Or use the interactive setup:');
    console.log('  node setup-password.js');
    process.exit(1);
  }
  
  if (password.length < 6) {
    console.log('❌ Password must be at least 6 characters long.');
    process.exit(1);
  }
  
  console.log('🔐 Setting up admin password...');
  
  const config = await loadConfig();
  const hash = bcrypt.hashSync(password, 10);
  config.adminPasswordHash = hash;
  
  const saved = await saveConfig(config);
  
  if (saved) {
    console.log('✅ Password set successfully!');
    console.log('📁 Configuration saved to:', CONFIG_FILE);
    console.log('🔒 Your admin password is ready to use.');
  } else {
    console.log('❌ Failed to save configuration.');
    process.exit(1);
  }
}

main().catch(console.error);
