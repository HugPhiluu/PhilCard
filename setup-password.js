#!/usr/bin/env node

// PhilCard Password Setup Utility
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function askPassword(question) {
  return new Promise((resolve) => {
    // Simple cross-platform solution
    console.log('⚠️  Password will be visible. Make sure no one is watching your screen.');
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

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
  console.log('🔐 PhilCard Password Setup\n');
  
  const config = await loadConfig();
  
  if (config.adminPasswordHash) {
    const change = await askQuestion('Admin password is already set. Do you want to change it? (y/N): ');
    if (change.toLowerCase() !== 'y' && change.toLowerCase() !== 'yes') {
      console.log('Password unchanged.');
      rl.close();
      return;
    }
  }
  
  console.log('Creating new admin password...\n');
  
  const password = await askPassword('Enter new admin password: ');
  
  if (password.length < 6) {
    console.log('\n❌ Password must be at least 6 characters long.');
    rl.close();
    return;
  }
  
  const confirmPassword = await askPassword('Confirm password: ');
  
  if (password !== confirmPassword) {
    console.log('\n❌ Passwords do not match.');
    rl.close();
    return;
  }
  
  console.log('\n🔄 Generating password hash...');
  
  const hash = bcrypt.hashSync(password, 10);
  config.adminPasswordHash = hash;
  
  const saved = await saveConfig(config);
  
  if (saved) {
    console.log('✅ Password updated successfully!');
    console.log('📁 Configuration saved to:', CONFIG_FILE);
    
    if (process.env.NODE_ENV === 'production') {
      console.log('\n🔄 Remember to restart your PhilCard server:');
      console.log('   pm2 restart philcard');
    }
  } else {
    console.log('❌ Failed to save configuration.');
  }
  
  rl.close();
}

main().catch(console.error);
