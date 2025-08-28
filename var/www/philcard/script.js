// PhilCard - Interactive JavaScript functionality

class PhilCard {
  constructor() {
    this.links = [];
    this.iconCache = new Map(); // Cache loaded icons
    this.isAuthenticated = false;
    this.authToken = null;
    this.apiBase = '/api'; // API base URL
    this.init();
  }

  init() {
    this.checkAuthentication();
    this.loadConfig();
    this.loadLinks();
    this.bindEvents();
    this.updateUIForAuthState();
  }

  // Load Simple Icons from CDN
  async loadSimpleIcon(iconName) {
    if (!iconName) return null;
    
    // Check cache first
    if (this.iconCache.has(iconName)) {
      return this.iconCache.get(iconName);
    }
    
    try {
      const response = await fetch(`https://cdn.simpleicons.org/${iconName.toLowerCase()}`);
      if (response.ok) {
        const svgContent = await response.text();
        this.iconCache.set(iconName, svgContent);
        return svgContent;
      }
    } catch (error) {
      console.warn(`Could not load icon: ${iconName}`, error);
    }
    
    return null;
  }

  // Authentication Management
  checkAuthentication() {
    const authToken = localStorage.getItem('philcard-auth');
    const authTime = localStorage.getItem('philcard-auth-time');
    
    // Check if auth is valid (24 hours)
    if (authToken && authTime) {
      const tokenAge = Date.now() - parseInt(authTime);
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (tokenAge < maxAge) {
        this.authToken = authToken;
        this.isAuthenticated = true;
      } else {
        this.clearAuthentication();
      }
    }
  }

  async authenticate(password) {
    try {
      const response = await fetch(`${this.apiBase}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.authToken = data.token;
        localStorage.setItem('philcard-auth', data.token);
        localStorage.setItem('philcard-auth-time', Date.now().toString());
        this.isAuthenticated = true;
        this.updateUIForAuthState();
        this.showNotification('Authentication successful!', 'success');
        return true;
      } else {
        this.showNotification(data.error || 'Authentication failed', 'error');
        return false;
      }
    } catch (error) {
      console.error('Authentication error:', error);
      this.showNotification('Authentication failed', 'error');
      return false;
    }
  }

  clearAuthentication() {
    localStorage.removeItem('philcard-auth');
    localStorage.removeItem('philcard-auth-time');
    this.authToken = null;
    this.isAuthenticated = false;
    this.updateUIForAuthState();
  }

  showAuthModal() {
    const authModal = document.getElementById('authModal');
    if (authModal) {
      authModal.style.display = 'flex';
      document.getElementById('authPassword').focus();
    }
  }

  hideAuthModal() {
    const authModal = document.getElementById('authModal');
    if (authModal) {
      authModal.style.display = 'none';
      document.getElementById('authPassword').value = '';
    }
  }

  updateUIForAuthState() {
    // Hide/show floating add button
    const floatingAdd = document.querySelector('.floating-add');
    if (floatingAdd) {
      floatingAdd.style.display = this.isAuthenticated ? 'flex' : 'none';
    }

    // Hide/show controls
    const controls = document.querySelector('.controls');
    if (controls) {
      controls.style.display = this.isAuthenticated ? 'flex' : 'none';
    }

    // Hide/show profile controls
    const profileControls = document.querySelector('.profile-controls');
    if (profileControls) {
      profileControls.style.display = this.isAuthenticated ? 'flex' : 'none';
    }

    // Hide/show edit/delete buttons on links
    const linkControls = document.querySelectorAll('.link-controls');
    linkControls.forEach(control => {
      control.style.display = this.isAuthenticated ? 'flex' : 'none';
    });

    // Show/hide auth button in footer
    this.updateAuthButton();
  }

  updateAuthButton() {
    const footerRight = document.querySelector('.footer-right');
    if (!footerRight) return;

    // Remove existing auth button
    const existingBtn = footerRight.querySelector('.admin-btn');
    if (existingBtn) existingBtn.remove();

    // Create auth button
    const authBtn = document.createElement('button');
    authBtn.className = 'btn admin-btn';
    
    if (this.isAuthenticated) {
      authBtn.textContent = '🔓 Sign Out';
      authBtn.onclick = () => {
        this.clearAuthentication();
        this.showNotification('Signed out successfully', 'info');
      };
    } else {
      authBtn.textContent = '🔒 Admin';
      authBtn.onclick = () => this.showAuthModal();
    }

    footerRight.appendChild(authBtn);
  }

  // Profile Modal Management
  showProfileModal() {
    if (!this.isAuthenticated) {
      this.showNotification('Authentication required', 'error');
      return;
    }

    const profileModal = document.getElementById('profileModal');
    if (profileModal) {
      // Pre-fill the form with current profile data
      this.loadCurrentProfileData();
      profileModal.style.display = 'flex';
      
      // Focus first input
      setTimeout(() => {
        const firstInput = profileModal.querySelector('input[type="text"]');
        if (firstInput) firstInput.focus();
      }, 100);
    }
  }

  hideProfileModal() {
    const profileModal = document.getElementById('profileModal');
    if (profileModal) {
      profileModal.style.display = 'none';
      // Clear file input and preview
      const fileInput = document.getElementById('profileAvatarFile');
      const preview = document.getElementById('avatarPreview');
      if (fileInput) fileInput.value = '';
      if (preview) preview.style.display = 'none';
    }
  }

  async loadCurrentProfileData() {
    try {
      const response = await fetch(`${this.apiBase}/config`);
      if (response.ok) {
        const config = await response.json();
        const profile = config.profile || {};
        
        // Fill form fields
        document.getElementById('profileNameInput').value = profile.name || '';
        document.getElementById('profileDescInput').value = profile.description || '';
        document.getElementById('profileAvatarText').value = profile.avatar || '';
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  }

  async updateProfile(formData) {
    try {
      const profileData = {
        name: formData.get('name'),
        description: formData.get('description'),
        avatar: formData.get('avatar')
      };

      const response = await fetch(`${this.apiBase}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify(profileData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.updateProfileDisplay(data.profile);
        this.showNotification('Profile updated successfully!', 'success');
        return true;
      } else {
        this.showNotification(data.error || 'Failed to update profile', 'error');
        return false;
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      this.showNotification('Failed to update profile', 'error');
      return false;
    }
  }

  async uploadProfilePicture(file) {
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(`${this.apiBase}/profile/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.updateProfileDisplay(data.profile);
        this.showNotification('Profile picture updated successfully!', 'success');
        return true;
      } else {
        this.showNotification(data.error || 'Failed to upload profile picture', 'error');
        return false;
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      this.showNotification('Failed to upload profile picture', 'error');
      return false;
    }
  }

  // Event Binding
  bindEvents() {
    // Floating add button
    const floatingAdd = document.querySelector('.floating-add');
    if (floatingAdd) {
      floatingAdd.addEventListener('click', () => {
        if (this.isAuthenticated) {
          this.showModal();
        } else {
          this.showAuthModal();
        }
      });
    }

    // Modal controls
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-back')) {
        this.hideModal();
      }
      if (e.target.classList.contains('auth-modal-back')) {
        this.hideAuthModal();
      }
    });

    // Form submission
    const addForm = document.getElementById('addLinkForm');
    if (addForm) {
      addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (this.isAuthenticated) {
          await this.handleFormSubmit();
        }
      });
    }

    // Auth form submission
    document.addEventListener('submit', (e) => {
      if (e.target.id === 'authForm') {
        e.preventDefault();
        const password = document.getElementById('authPassword').value;
        if (this.authenticate(password)) {
          this.hideAuthModal();
        }
      }
      
      // Profile form submission
      if (e.target.id === 'profileForm') {
        e.preventDefault();
        this.handleProfileFormSubmit();
      }
    });

    // Preset icon buttons
    document.addEventListener('click', (e) => {
      if (e.target.hasAttribute('data-preset')) {
        if (this.isAuthenticated) {
          this.usePreset(e.target.dataset.preset);
        }
      }
    });

    // Icon name input with live preview
    document.addEventListener('input', (e) => {
      if (e.target.id === 'iconName') {
        this.updateIconPreview(e.target.value);
      }
    });

    // Export/Import buttons
    const exportBtn = document.querySelector('[data-action="export"]');
    const importBtn = document.querySelector('[data-action="import"]');
    
    if (exportBtn) exportBtn.addEventListener('click', () => {
      if (this.isAuthenticated) {
        this.exportData();
      } else {
        this.showAuthModal();
      }
    });
    if (importBtn) importBtn.addEventListener('click', () => {
      if (this.isAuthenticated) {
        this.importData();
      } else {
        this.showAuthModal();
      }
    });

    // Close modal button
    document.addEventListener('click', (e) => {
      if (e.target.hasAttribute('data-close')) {
        this.hideModal();
      }
      if (e.target.classList.contains('auth-modal-back')) {
        this.hideAuthModal();
      }
      if (e.target.id === 'profileModal') {
        this.hideProfileModal();
      }
    });

    // Profile picture file input change
    document.addEventListener('change', (e) => {
      if (e.target.id === 'profileAvatarFile') {
        this.handleAvatarFileSelect(e.target);
      }
    });
  }

  // API Management
  async loadConfig() {
    try {
      const response = await fetch(`${this.apiBase}/config`);
      if (response.ok) {
        const config = await response.json();
        if (config.profile) {
          this.updateProfileDisplay(config.profile);
        }
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  }

  async loadLinks() {
    try {
      const response = await fetch(`${this.apiBase}/links`);
      if (response.ok) {
        this.links = await response.json();
      } else {
        this.links = this.getDefaultLinks();
      }
    } catch (error) {
      console.error('Error loading links:', error);
      this.links = this.getDefaultLinks();
    }
    this.renderLinks();
  }

  async saveLink(linkData) {
    try {
      const response = await fetch(`${this.apiBase}/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify(linkData)
      });

      if (response.ok) {
        const newLink = await response.json();
        this.links.push(newLink);
        this.renderLinks();
        return true;
      } else {
        const error = await response.json();
        this.showNotification(error.error || 'Failed to save link', 'error');
        return false;
      }
    } catch (error) {
      console.error('Error saving link:', error);
      this.showNotification('Failed to save link', 'error');
      return false;
    }
  }

  async updateLink(id, linkData) {
    try {
      const response = await fetch(`${this.apiBase}/links/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify(linkData)
      });

      if (response.ok) {
        const updatedLink = await response.json();
        const index = this.links.findIndex(link => link.id === id);
        if (index !== -1) {
          this.links[index] = updatedLink;
          this.renderLinks();
        }
        return true;
      } else {
        const error = await response.json();
        this.showNotification(error.error || 'Failed to update link', 'error');
        return false;
      }
    } catch (error) {
      console.error('Error updating link:', error);
      this.showNotification('Failed to update link', 'error');
      return false;
    }
  }

  async deleteLink(id) {
    try {
      const response = await fetch(`${this.apiBase}/links/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (response.ok) {
        // Convert both IDs to strings for comparison to handle type mismatches
        this.links = this.links.filter(link => String(link.id) !== String(id));
        this.renderLinks();
        return true;
      } else {
        const error = await response.json();
        this.showNotification(error.error || 'Failed to delete link', 'error');
        return false;
      }
    } catch (error) {
      console.error('Error deleting link:', error);
      this.showNotification('Failed to delete link', 'error');
      return false;
    }
  }

  updateProfileDisplay(profile) {
    // Update profile information in the UI
    const nameElement = document.getElementById('profileName');
    const descElement = document.getElementById('profileDescription');
    const avatarElement = document.getElementById('profileAvatar');

    if (nameElement && profile.name) {
      nameElement.textContent = profile.name;
    }
    if (descElement && profile.description) {
      descElement.textContent = profile.description;
    }
    if (avatarElement) {
      if (profile.avatarUrl) {
        // Show uploaded image
        avatarElement.innerHTML = `<img src="${profile.avatarUrl}" alt="Profile picture">`;
      } else if (profile.avatar) {
        // Show text avatar
        avatarElement.innerHTML = profile.avatar;
      }
    }
  }

  getDefaultLinks() {
    return [
      {
        id: 1,
        title: 'GitHub',
        subtitle: 'My repositories',
        url: 'https://github.com/example',
        iconType: 'simple',
        iconName: 'github'
      }
    ];
  }

  // Link Management
  async addLink() {
    if (!this.isAuthenticated) {
      this.showNotification('Authentication required', 'error');
      return;
    }

    const form = document.getElementById('addLinkForm');
    const formData = new FormData(form);
    
    const iconType = formData.get('iconType') || 'simple';
    const iconName = formData.get('iconName') || 'link';
    
    const linkData = {
      title: formData.get('title'),
      subtitle: formData.get('subtitle'),
      url: formData.get('url'),
      iconType: iconType,
      iconName: iconName
    };

    // Validate required fields
    if (!linkData.title || !linkData.url) {
      this.showNotification('Please fill in title and URL', 'error');
      return;
    }

    const success = await this.saveLink(linkData);
    if (success) {
      this.hideModal();
      this.clearForm();
      this.showNotification('Link added successfully!', 'success');
    }
  }

  async deleteLinkHandler(id) {
    if (!this.isAuthenticated) {
      this.showNotification('Authentication required', 'error');
      return;
    }

    // Prevent rapid double-clicks
    if (this.isDeleting) return;
    this.isDeleting = true;

    try {
      if (confirm('Are you sure you want to delete this link?')) {
        const success = await this.deleteLink(id);
        if (success) {
          this.showNotification('Link deleted', 'success');
        }
      }
    } finally {
      this.isDeleting = false;
    }
  }

  editLink(id) {
    if (!this.isAuthenticated) {
      this.showNotification('Authentication required', 'error');
      return;
    }

    const link = this.links.find(l => l.id === id);
    if (!link) return;

    // Pre-fill the form with existing data
    document.getElementById('linkTitle').value = link.title;
    document.getElementById('linkSubtitle').value = link.subtitle || '';
    document.getElementById('linkUrl').value = link.url;
    document.getElementById('iconType').value = link.iconType || 'simple';
    document.getElementById('iconName').value = link.iconName || 'link';

    // Change form behavior to edit mode
    const form = document.getElementById('addLinkForm');
    form.dataset.editId = id;
    
    // Update modal title and button text
    document.querySelector('.modal h3').textContent = 'Edit Link';
    document.querySelector('.btn.primary').textContent = 'Update Link';
    
    this.showModal();
  }



  // UI Rendering
  async renderLinks() {
    const container = document.querySelector('.links');
    if (!container) return;

    // Render links with placeholders first
    container.innerHTML = this.links.map(link => `
      <a href="${this.escapeHtml(link.url)}" class="link-btn" target="_blank" rel="noopener">
        <div class="icon-wrap" id="icon-${link.id}">
          ${this.getDefaultIconHtml()}
        </div>
        <div style="flex: 1;">
          <div class="label">${this.escapeHtml(link.title)}</div>
          ${link.subtitle ? `<div class="sub">${this.escapeHtml(link.subtitle)}</div>` : ''}
        </div>
        <div class="link-controls">
          <button class="icon-btn" onclick="event.preventDefault(); event.stopPropagation(); philCard.editLink('${link.id}')" title="Edit">
            ✏️
          </button>
          <button class="icon-btn" onclick="event.preventDefault(); event.stopPropagation(); philCard.deleteLinkHandler('${link.id}')" title="Delete">
            🗑️
          </button>
        </div>
      </a>
    `).join('');

    // Load icons asynchronously
    this.links.forEach(link => this.loadAndUpdateIcon(link));
    
    // Update UI for auth state after rendering
    this.updateUIForAuthState();
  }

  // Load and update individual icon
  async loadAndUpdateIcon(link) {
    if (link.iconType === 'simple' && link.iconName) {
      const svgContent = await this.loadSimpleIcon(link.iconName);
      const iconContainer = document.getElementById(`icon-${link.id}`);
      
      if (svgContent && iconContainer) {
        // Clean up the SVG and set proper attributes
        const cleanSvg = svgContent
          .replace(/width="[^"]*"/g, 'width="20"')
          .replace(/height="[^"]*"/g, 'height="20"')
          .replace(/fill="[^"]*"/g, 'fill="currentColor"');
        
        iconContainer.innerHTML = cleanSvg;
      }
    }
  }

  // Get default icon HTML (fallback)
  getDefaultIconHtml() {
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/>
    </svg>`;
  }

  // Modal Management
  showModal() {
    const modal = document.querySelector('.modal-back');
    if (modal) {
      modal.style.display = 'flex';
      
      // Focus first input
      setTimeout(() => {
        const firstInput = modal.querySelector('input');
        if (firstInput) firstInput.focus();
        
        // Update icon preview for current value
        const iconNameInput = document.getElementById('iconName');
        if (iconNameInput && iconNameInput.value) {
          this.updateIconPreview(iconNameInput.value);
        }
      }, 100);
    }
  }

  hideModal() {
    const modal = document.querySelector('.modal-back');
    if (modal) {
      modal.style.display = 'none';
      this.clearForm();
    }
  }

  clearForm() {
    const form = document.getElementById('addLinkForm');
    if (form) {
      form.reset();
      delete form.dataset.editId;
      
      // Reset modal title and button text
      document.querySelector('.modal h3').textContent = 'Add New Link';
      document.querySelector('.btn.primary').textContent = 'Add Link';
      
      // Reset to default values
      document.getElementById('iconType').value = 'simple';
      document.getElementById('iconName').value = 'link';
    }
  }

  // Preset Management
  usePreset(preset) {
    const presets = {
      github: { iconName: 'github', subtitle: 'Code repository' },
      twitter: { iconName: 'twitter', subtitle: 'Social media' },
      linkedin: { iconName: 'linkedin', subtitle: 'Professional network' },
      youtube: { iconName: 'youtube', subtitle: 'Video content' },
      instagram: { iconName: 'instagram', subtitle: 'Photos & stories' },
      email: { iconName: 'gmail', subtitle: 'Get in touch' },
      website: { iconName: 'googlechrome', subtitle: 'Personal website' },
      blog: { iconName: 'medium', subtitle: 'Blog posts' },
      discord: { iconName: 'discord', subtitle: 'Chat server' },
      twitch: { iconName: 'twitch', subtitle: 'Live streams' },
      spotify: { iconName: 'spotify', subtitle: 'Music playlist' },
      paypal: { iconName: 'paypal', subtitle: 'Support me' }
    };

    const presetData = presets[preset];
    if (presetData) {
      document.getElementById('iconType').value = 'simple';
      document.getElementById('iconName').value = presetData.iconName;
      if (!document.getElementById('linkSubtitle').value) {
        document.getElementById('linkSubtitle').value = presetData.subtitle;
      }
      
      // Update icon preview
      this.updateIconPreview(presetData.iconName);
    }
  }

  // Data Management
  exportData() {
    const data = {
      links: this.links,
      exported: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'philcard-backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showNotification('Data exported successfully!', 'success');
  }

  async importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          if (data.links && Array.isArray(data.links)) {
            if (confirm('This will replace all your current links. Are you sure?')) {
              // Use bulk replace API endpoint
              const success = await this.bulkReplaceLinks(data.links);
              if (success) {
                this.loadLinks(); // Reload from server
                this.showNotification('Data imported successfully!', 'success');
              }
            }
          } else {
            this.showNotification('Invalid file format', 'error');
          }
        } catch (error) {
          this.showNotification('Error reading file', 'error');
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  }

  async bulkReplaceLinks(newLinks) {
    try {
      const response = await fetch(`${this.apiBase}/links/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          operation: 'replace',
          links: newLinks
        })
      });

      if (response.ok) {
        return true;
      } else {
        const error = await response.json();
        this.showNotification(error.error || 'Failed to import data', 'error');
        return false;
      }
    } catch (error) {
      console.error('Error in bulk replace:', error);
      this.showNotification('Failed to import data', 'error');
      return false;
    }
  }

  // Utility Functions
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    let bgColor = '#10b981'; // success
    if (type === 'error') bgColor = '#ef4444';
    if (type === 'info') bgColor = '#3b82f6';
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${bgColor};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
      }
    }, 3000);
  }

  // Handle form submission properly
  async handleFormSubmit() {
    const form = document.getElementById('addLinkForm');
    const editId = form.dataset.editId;
    
    if (editId) {
      // Get form data
      const formData = new FormData(form);
      const linkData = {
        title: formData.get('title'),
        subtitle: formData.get('subtitle'),
        url: formData.get('url'),
        iconType: formData.get('iconType') || 'simple',
        iconName: formData.get('iconName') || 'link'
      };
      
      // Call the async updateLink method
      const success = await this.updateLink(editId, linkData);
      if (success) {
        this.hideModal();
        this.clearForm();
        this.showNotification('Link updated successfully!', 'success');
      }
    } else {
      this.addLink();
    }
  }

  // Update icon preview in modal
  async updateIconPreview(iconName) {
    const previewContainer = document.getElementById('iconPreview');
    if (!previewContainer) return;

    if (iconName) {
      const svgContent = await this.loadSimpleIcon(iconName);
      if (svgContent) {
        // Clean up the SVG for preview
        const cleanSvg = svgContent
          .replace(/width="[^"]*"/g, 'width="20"')
          .replace(/height="[^"]*"/g, 'height="20"')
          .replace(/fill="[^"]*"/g, 'fill="currentColor"');
        
        previewContainer.innerHTML = cleanSvg;
        previewContainer.style.display = 'flex';
        previewContainer.style.color = 'rgba(255, 255, 255, 0.8)';
        return;
      }
    }
    
    previewContainer.style.display = 'none';
  }

  // Refresh Simple Icons (manual reload)
  async refreshIcons() {
    this.showNotification('Refreshing icons...', 'info');
    this.iconCache.clear(); // Clear cache
    await this.renderLinks(); // Re-render with fresh icons
    this.showNotification('Icons refreshed!', 'success');
  }

  // Handle profile form submission
  async handleProfileFormSubmit() {
    if (!this.isAuthenticated) {
      this.showNotification('Authentication required', 'error');
      return;
    }

    const form = document.getElementById('profileForm');
    const formData = new FormData(form);
    const fileInput = document.getElementById('profileAvatarFile');

    try {
      // First update text profile data
      const profileSuccess = await this.updateProfile(formData);
      
      // Then upload avatar if file is selected
      if (fileInput.files[0] && profileSuccess) {
        await this.uploadProfilePicture(fileInput.files[0]);
      }

      if (profileSuccess) {
        this.hideProfileModal();
      }
    } catch (error) {
      console.error('Error in profile form submission:', error);
      this.showNotification('Failed to update profile', 'error');
    }
  }

  // Handle avatar file selection and preview
  handleAvatarFileSelect(fileInput) {
    const file = fileInput.files[0];
    const preview = document.getElementById('avatarPreview');
    const previewImg = document.getElementById('avatarPreviewImg');

    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.showNotification('Please select an image file', 'error');
        fileInput.value = '';
        preview.style.display = 'none';
        return;
      }

      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    } else {
      preview.style.display = 'none';
    }
  }
}

// CSS Animations for notifications
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.philCard = new PhilCard();
});
