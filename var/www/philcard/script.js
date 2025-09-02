// PhilCard - Interactive JavaScript functionality

class PhilCard {
  constructor() {
    this.links = [];
    this.iconCache = new Map(); // Cache loaded icons
    this.isAuthenticated = false;
    this.authToken = null;
    this.apiBase = '/api'; // API base URL
    this.isDragging = false; // Flag to prevent form submissions during drag
    this.init();
  }

  init() {
    this.checkAuthentication();
    this.loadConfig();
    this.loadLinks();
    this.bindEvents();
    this.updateUIForAuthState();
  }

  // Load Simple Icons from CDN with brand color support
  async loadSimpleIcon(iconName) {
    if (!iconName) return null;
    
    // Check cache first
    if (this.iconCache.has(iconName)) {
      return this.iconCache.get(iconName);
    }
    
    try {
      // Use the CDN that provides the icon with its official brand color
      const response = await fetch(`https://cdn.simpleicons.org/${iconName.toLowerCase()}`);
      if (response.ok) {
        const svgContent = await response.text();
        
        // Extract the brand color from the SVG's fill attribute
        const brandColor = this.extractBrandColor(svgContent);
        
        // Store both SVG content and brand color in cache
        const iconData = {
          svg: svgContent,
          brandColor: brandColor
        };
        
        this.iconCache.set(iconName, iconData);
        return iconData;
      }
    } catch (error) {
      console.warn(`Could not load icon: ${iconName}`, error);
    }
    
    return null;
  }

  // Extract brand color from SVG content
  extractBrandColor(svgContent) {
    try {
      // Create a temporary DOM element to parse the SVG
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
      const svgElement = svgDoc.querySelector('svg');
      
      if (svgElement) {
        // Look for fill attribute on the SVG or its children
        let fillColor = svgElement.getAttribute('fill');
        
        if (!fillColor || fillColor === 'currentColor' || fillColor === 'none') {
          // Check the first path element if SVG doesn't have fill
          const pathElement = svgElement.querySelector('path');
          if (pathElement) {
            fillColor = pathElement.getAttribute('fill');
          }
        }
        
        // If we found a valid hex color, return it
        if (fillColor && fillColor.startsWith('#')) {
          return fillColor;
        }
      }
    } catch (error) {
      console.warn('Error extracting brand color:', error);
    }
    
    // Return a default color if extraction fails
    return '#ffffff';
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

    // Hide/show drag handles
    const dragHandles = document.querySelectorAll('.drag-handle');
    dragHandles.forEach(handle => {
      handle.style.display = this.isAuthenticated ? 'flex' : 'none';
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
      
      // Clean up image cropper
      this.hideImageCropper();
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
      // Block all document clicks during drag
      if (this.isDragging) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
      
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
        
        // Prevent form submission during drag operations
        if (this.isDragging) {
          console.log('Form submit blocked during drag operation');
          return false;
        }
        
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
        // Show uploaded image with cache busting for immediate updates
        const cacheBuster = Date.now();
        const imageUrl = profile.avatarUrl + (profile.avatarUrl.includes('?') ? '&' : '?') + 'v=' + cacheBuster;
        avatarElement.innerHTML = `<img src="${imageUrl}" alt="Profile picture" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; border-radius: inherit;">`;
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
      },
      {
        id: 2,
        title: 'Twitter',
        subtitle: 'Follow me',
        url: 'https://twitter.com/example',
        iconType: 'simple',
        iconName: 'twitter'
      },
      {
        id: 3,
        title: 'YouTube',
        subtitle: 'My videos',
        url: 'https://youtube.com/example',
        iconType: 'simple',
        iconName: 'youtube'
      },
      {
        id: 4,
        title: 'Spotify',
        subtitle: 'My playlists',
        url: 'https://spotify.com/example',
        iconType: 'simple',
        iconName: 'spotify'
      }
    ];
  }

  // Link Management
  async addLink() {
    if (!this.isAuthenticated) {
      this.showNotification('Authentication required', 'error');
      return;
    }

    // Prevent form submission during drag operations
    if (this.isDragging) {
      console.log('Ignoring addLink during drag operation');
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

    // Clean up existing icon glow styles
    this.cleanupIconGlowStyles();

    // Render links with placeholders first
    container.innerHTML = this.links.map(link => `
      <div class="link-item" data-link-id="${link.id}">
        ${this.isAuthenticated ? `<div class="drag-handle" title="Drag to reorder">⋮⋮</div>` : ''}
        <a href="${this.escapeHtml(link.url)}" class="link-btn" target="_blank" rel="noopener">
          <div class="icon-wrap" id="icon-${link.id}">
            ${this.getDefaultIconHtml()}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div class="label">${this.escapeHtml(link.title)}</div>
            ${link.subtitle ? `<div class="sub">${this.escapeHtml(link.subtitle)}</div>` : ''}
          </div>
        </a>
        <div class="link-controls">
          <button class="icon-btn" onclick="event.preventDefault(); event.stopPropagation(); philCard.editLink('${link.id}')" title="Edit">
            ✏️
          </button>
          <button class="icon-btn" onclick="event.preventDefault(); event.stopPropagation(); philCard.deleteLinkHandler('${link.id}')" title="Delete">
            🗑️
          </button>
        </div>
      </div>
    `).join('');

    // Load icons asynchronously
    this.links.forEach(link => this.loadAndUpdateIcon(link));
    
    // Initialize drag and drop if authenticated
    if (this.isAuthenticated) {
      this.initializeDragAndDrop();
    }
    
    // Update UI for auth state after rendering
    this.updateUIForAuthState();
  }

  // Clean up icon glow styles
  cleanupIconGlowStyles() {
    // Remove all existing icon glow style elements
    const existingStyles = document.querySelectorAll('style[id^="icon-glow-"]');
    existingStyles.forEach(style => style.remove());
  }

  // Load and update individual icon
  async loadAndUpdateIcon(link) {
    if (link.iconType === 'simple' && link.iconName) {
      const iconData = await this.loadSimpleIcon(link.iconName);
      const iconContainer = document.getElementById(`icon-${link.id}`);
      
      if (iconData && iconContainer) {
        // Clean up the SVG and set proper attributes
        const cleanSvg = iconData.svg
          .replace(/width="[^"]*"/g, 'width="20"')
          .replace(/height="[^"]*"/g, 'height="20"')
          .replace(/fill="[^"]*"/g, 'fill="currentColor"');
        
        iconContainer.innerHTML = cleanSvg;
        
        // Apply brand color glow effect
        if (iconData.brandColor) {
          this.applyBrandColorGlow(iconContainer, iconData.brandColor);
        }
      }
    }
  }

  // Apply brand color glow effect to an icon
  applyBrandColorGlow(iconContainer, brandColor) {
    const linkItem = iconContainer.closest('.link-item');
    if (!linkItem) return;

    // Create CSS custom properties for this specific link
    const linkId = linkItem.getAttribute('data-link-id');
    
    // Convert hex to RGB for glow effects
    const rgb = this.hexToRgb(brandColor);
    if (!rgb) return;

    // Create a style element for this specific icon's glow
    let styleElement = document.getElementById(`icon-glow-${linkId}`);
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = `icon-glow-${linkId}`;
      document.head.appendChild(styleElement);
    }

    // Create dynamic CSS for the brand color glow
    const glowCSS = `
      .link-item[data-link-id="${linkId}"]:hover .icon-wrap svg {
        filter: drop-shadow(0 0 3px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)) 
                drop-shadow(0 0 6px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8))
                drop-shadow(0 0 12px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6))
                drop-shadow(0 0 18px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)) !important;
      }
    `;

    styleElement.textContent = glowCSS;
  }

  // Convert hex color to RGB
  hexToRgb(hex) {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Handle 3-digit hex codes
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
    
    if (hex.length !== 6) return null;
    
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return { r, g, b };
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
    // Prevent form submission during drag operations
    if (this.isDragging) {
      console.log('Ignoring form submit during drag operation');
      return;
    }
    
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
      const iconData = await this.loadSimpleIcon(iconName);
      if (iconData) {
        // Clean up the SVG for preview
        const cleanSvg = iconData.svg
          .replace(/width="[^"]*"/g, 'width="20"')
          .replace(/height="[^"]*"/g, 'height="20"')
          .replace(/fill="[^"]*"/g, 'fill="currentColor"');
        
        previewContainer.innerHTML = cleanSvg;
        previewContainer.style.display = 'flex';
        previewContainer.style.color = iconData.brandColor || 'rgba(255, 255, 255, 0.8)';
        return;
      }
    }
    
    previewContainer.style.display = 'none';
  }

  // Refresh Simple Icons (manual reload)
  async refreshIcons() {
    this.showNotification('Refreshing icons...', 'info');
    this.iconCache.clear(); // Clear cache
    this.cleanupIconGlowStyles(); // Clean up existing glow styles
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

    try {
      // Update text profile data only (image is handled separately via cropper)
      const profileSuccess = await this.updateProfile(formData);
      
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

    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.showNotification('Please select an image file', 'error');
        fileInput.value = '';
        this.hideImageCropper();
        return;
      }

      // Show the image cropper
      this.showImageCropper(file);
    } else {
      this.hideImageCropper();
    }
  }

  // Image cropping functionality
  showImageCropper(file) {
    const cropperContainer = document.getElementById('imageCropper');
    const cropperImage = document.getElementById('cropperImage');
    
    if (!cropperContainer || !cropperImage) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      cropperImage.src = e.target.result;
      cropperContainer.style.display = 'block';
      
      // Initialize cropper after image loads
      cropperImage.onload = () => {
        this.initializeCropper(cropperImage);
      };
    };
    reader.readAsDataURL(file);
  }

  hideImageCropper() {
    const cropperContainer = document.getElementById('imageCropper');
    if (cropperContainer) {
      cropperContainer.style.display = 'none';
    }
    this.destroyCropper();
  }

  initializeCropper(imageElement) {
    // Clean up any existing cropper
    this.destroyCropper();

    const container = imageElement.parentElement;
    const containerRect = container.getBoundingClientRect();
    
    // Calculate display dimensions while maintaining aspect ratio
    const maxWidth = 300;
    const maxHeight = 300;
    const imgAspectRatio = imageElement.naturalWidth / imageElement.naturalHeight;
    
    let displayWidth, displayHeight;
    if (imgAspectRatio > 1) {
      // Landscape
      displayWidth = Math.min(maxWidth, imageElement.naturalWidth);
      displayHeight = displayWidth / imgAspectRatio;
    } else {
      // Portrait or square
      displayHeight = Math.min(maxHeight, imageElement.naturalHeight);
      displayWidth = displayHeight * imgAspectRatio;
    }

    imageElement.style.width = displayWidth + 'px';
    imageElement.style.height = displayHeight + 'px';

    // Create crop overlay
    this.createCropOverlay(container, displayWidth, displayHeight, imageElement);
  }

  createCropOverlay(container, displayWidth, displayHeight, imageElement) {
    // Create overlay div
    const overlay = document.createElement('div');
    overlay.className = 'crop-overlay';
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: ${displayWidth}px;
      height: ${displayHeight}px;
      pointer-events: none;
      z-index: 10;
    `;

    // Create crop selection box
    const cropBox = document.createElement('div');
    cropBox.className = 'crop-box';
    
    // Start with a square in the center
    const cropSize = Math.min(displayWidth, displayHeight) * 0.8;
    const cropX = (displayWidth - cropSize) / 2;
    const cropY = (displayHeight - cropSize) / 2;

    cropBox.style.cssText = `
      position: absolute;
      left: ${cropX}px;
      top: ${cropY}px;
      width: ${cropSize}px;
      height: ${cropSize}px;
      border: 2px solid #fff;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
      pointer-events: all;
      cursor: move;
    `;

    // Add resize handles
    const handles = ['nw', 'ne', 'sw', 'se'];
    handles.forEach(handle => {
      const handleDiv = document.createElement('div');
      handleDiv.className = `crop-handle crop-handle-${handle}`;
      handleDiv.style.cssText = `
        position: absolute;
        width: 12px;
        height: 12px;
        background: #fff;
        border: 2px solid #007bff;
        border-radius: 50%;
        cursor: ${handle}-resize;
      `;

      // Position handles
      if (handle.includes('n')) handleDiv.style.top = '-6px';
      if (handle.includes('s')) handleDiv.style.bottom = '-6px';
      if (handle.includes('w')) handleDiv.style.left = '-6px';
      if (handle.includes('e')) handleDiv.style.right = '-6px';

      cropBox.appendChild(handleDiv);
    });

    overlay.appendChild(cropBox);
    container.appendChild(overlay);

    // Store crop data
    this.cropData = {
      overlay,
      cropBox,
      imageElement,
      displayWidth,
      displayHeight,
      isDragging: false,
      isResizing: false,
      startX: 0,
      startY: 0,
      startCropX: cropX,
      startCropY: cropY,
      startCropWidth: cropSize,
      startCropHeight: cropSize
    };

    // Add event listeners
    this.addCropEventListeners();
  }

  addCropEventListeners() {
    const { cropBox } = this.cropData;

    // Mouse events
    cropBox.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('crop-handle')) {
        this.startResize(e);
      } else {
        this.startDrag(e);
      }
    });

    // Touch events for mobile
    cropBox.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      
      if (e.target.classList.contains('crop-handle')) {
        this.startResize(mouseEvent);
      } else {
        this.startDrag(mouseEvent);
      }
    });

    // Global mouse events
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mouseup', (e) => this.onMouseUp(e));
    
    // Global touch events
    document.addEventListener('touchmove', (e) => {
      if (this.cropData && (this.cropData.isDragging || this.cropData.isResizing)) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
          clientX: touch.clientX,
          clientY: touch.clientY
        });
        this.onMouseMove(mouseEvent);
      }
    });
    
    document.addEventListener('touchend', (e) => {
      const mouseEvent = new MouseEvent('mouseup', {});
      this.onMouseUp(mouseEvent);
    });
  }

  startDrag(e) {
    this.cropData.isDragging = true;
    this.cropData.startX = e.clientX;
    this.cropData.startY = e.clientY;
    this.cropData.startCropX = parseFloat(this.cropData.cropBox.style.left);
    this.cropData.startCropY = parseFloat(this.cropData.cropBox.style.top);
    e.preventDefault();
  }

  startResize(e) {
    this.cropData.isResizing = true;
    this.cropData.resizeHandle = e.target.className.split(' ').find(c => c.includes('crop-handle-')).split('-')[2];
    this.cropData.startX = e.clientX;
    this.cropData.startY = e.clientY;
    const rect = this.cropData.cropBox.getBoundingClientRect();
    const containerRect = this.cropData.imageElement.getBoundingClientRect();
    this.cropData.startCropX = rect.left - containerRect.left;
    this.cropData.startCropY = rect.top - containerRect.top;
    this.cropData.startCropWidth = rect.width;
    this.cropData.startCropHeight = rect.height;
    e.preventDefault();
  }

  onMouseMove(e) {
    if (!this.cropData) return;

    if (this.cropData.isDragging) {
      const deltaX = e.clientX - this.cropData.startX;
      const deltaY = e.clientY - this.cropData.startY;
      
      let newX = this.cropData.startCropX + deltaX;
      let newY = this.cropData.startCropY + deltaY;

      // Constrain to image bounds
      const cropWidth = parseFloat(this.cropData.cropBox.style.width);
      const cropHeight = parseFloat(this.cropData.cropBox.style.height);
      
      newX = Math.max(0, Math.min(newX, this.cropData.displayWidth - cropWidth));
      newY = Math.max(0, Math.min(newY, this.cropData.displayHeight - cropHeight));

      this.cropData.cropBox.style.left = newX + 'px';
      this.cropData.cropBox.style.top = newY + 'px';
    } else if (this.cropData.isResizing) {
      this.handleResize(e);
    }
  }

  handleResize(e) {
    const deltaX = e.clientX - this.cropData.startX;
    const deltaY = e.clientY - this.cropData.startY;
    const handle = this.cropData.resizeHandle;

    let newX = this.cropData.startCropX;
    let newY = this.cropData.startCropY;
    let newWidth = this.cropData.startCropWidth;
    let newHeight = this.cropData.startCropHeight;

    // Calculate new dimensions based on handle
    if (handle.includes('e')) newWidth += deltaX;
    if (handle.includes('w')) { newWidth -= deltaX; newX += deltaX; }
    if (handle.includes('s')) newHeight += deltaY;
    if (handle.includes('n')) { newHeight -= deltaY; newY += deltaY; }

    // Maintain 1:1 aspect ratio
    const size = Math.min(newWidth, newHeight);
    newWidth = size;
    newHeight = size;

    // Adjust position for corner handles to maintain aspect ratio
    if (handle.includes('w')) newX = this.cropData.startCropX + (this.cropData.startCropWidth - newWidth);
    if (handle.includes('n')) newY = this.cropData.startCropY + (this.cropData.startCropHeight - newHeight);

    // Constrain to image bounds
    const minSize = 50;
    newWidth = Math.max(minSize, Math.min(newWidth, this.cropData.displayWidth - newX));
    newHeight = Math.max(minSize, Math.min(newHeight, this.cropData.displayHeight - newY));
    newX = Math.max(0, Math.min(newX, this.cropData.displayWidth - newWidth));
    newY = Math.max(0, Math.min(newY, this.cropData.displayHeight - newHeight));

    // Keep it square
    const finalSize = Math.min(newWidth, newHeight);
    this.cropData.cropBox.style.left = newX + 'px';
    this.cropData.cropBox.style.top = newY + 'px';
    this.cropData.cropBox.style.width = finalSize + 'px';
    this.cropData.cropBox.style.height = finalSize + 'px';
  }

  onMouseUp(e) {
    if (this.cropData) {
      this.cropData.isDragging = false;
      this.cropData.isResizing = false;
    }
  }

  destroyCropper() {
    if (this.cropData) {
      if (this.cropData.overlay && this.cropData.overlay.parentNode) {
        this.cropData.overlay.parentNode.removeChild(this.cropData.overlay);
      }
      this.cropData = null;
    }
  }

  async cropAndUploadImage() {
    if (!this.cropData) {
      this.showNotification('No image to crop', 'error');
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set output size to 512x512
      canvas.width = 512;
      canvas.height = 512;

      // Get crop coordinates
      const cropBox = this.cropData.cropBox;
      const cropX = parseFloat(cropBox.style.left);
      const cropY = parseFloat(cropBox.style.top);
      const cropSize = parseFloat(cropBox.style.width);

      // Calculate source coordinates on the original image
      const scaleX = this.cropData.imageElement.naturalWidth / this.cropData.displayWidth;
      const scaleY = this.cropData.imageElement.naturalHeight / this.cropData.displayHeight;
      
      const sourceX = cropX * scaleX;
      const sourceY = cropY * scaleY;
      const sourceSize = cropSize * scaleX;

      // Draw the cropped and resized image
      ctx.drawImage(
        this.cropData.imageElement,
        sourceX, sourceY, sourceSize, sourceSize,
        0, 0, 512, 512
      );

      // Try WebP first, fallback to JPEG
      let imageBlob;
      let fileName;
      let mimeType;
      let quality = 0.85; // High quality by default

      // Check WebP support
      const webpSupported = canvas.toDataURL('image/webp').indexOf('image/webp') === 5;
      
      if (webpSupported) {
        // WebP provides better compression
        imageBlob = await new Promise(resolve => {
          canvas.toBlob(resolve, 'image/webp', quality);
        });
        fileName = 'avatar.webp';
        mimeType = 'image/webp';
      } else {
        // Fallback to JPEG with slightly higher quality since it's less efficient
        quality = 0.90;
        imageBlob = await new Promise(resolve => {
          canvas.toBlob(resolve, 'image/jpeg', quality);
        });
        fileName = 'avatar.jpg';
        mimeType = 'image/jpeg';
      }

      // Log compression info for debugging
      if (imageBlob) {
        const originalSize = this.cropData.imageElement.src.length * 0.75; // Rough estimate
        const compressedSize = imageBlob.size;
        console.log(`Image compressed: ${Math.round(originalSize / 1024)}KB → ${Math.round(compressedSize / 1024)}KB (${Math.round((1 - compressedSize / originalSize) * 100)}% reduction)`);
      }

      if (imageBlob) {
        // Show loading state
        this.showNotification('Processing and uploading image...', 'info');
        
        // Create a File object from the blob
        const croppedFile = new File([imageBlob], fileName, { type: mimeType });
        
        // Upload the cropped image
        const success = await this.uploadProfilePicture(croppedFile);
        
        if (success) {
          this.hideImageCropper();
          // Update preview with the cropped image
          this.showCroppedPreview(canvas.toDataURL(mimeType, quality));
        }
      } else {
        this.showNotification('Failed to process image', 'error');
      }
    } catch (error) {
      console.error('Error cropping image:', error);
      this.showNotification('Failed to crop image', 'error');
    }
  }

  showCroppedPreview(dataUrl) {
    const preview = document.getElementById('avatarPreview');
    const previewImg = document.getElementById('avatarPreviewImg');
    
    if (preview && previewImg) {
      previewImg.src = dataUrl;
      preview.style.display = 'block';
    }
  }

  // Drag and Drop Implementation
  initializeDragAndDrop() {
    const container = document.querySelector('.links');
    if (!container) return;

    // Add sortable attributes to the container
    container.classList.add('sortable-container');

    const linkItems = container.querySelectorAll('.link-item');
    linkItems.forEach(linkItem => {
      this.addDragListeners(linkItem);
    });
  }

  addDragListeners(element) {
    const dragHandle = element.querySelector('.drag-handle');
    
    if (dragHandle) {
      // Make the drag handle itself draggable
      dragHandle.draggable = true;
      
      // Prevent navigation when clicking on drag handle
      dragHandle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      
      // Handle drag start on the handle, but drag the whole element
      dragHandle.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Set dragging flag to prevent any form submissions
        this.isDragging = true;
        
        this.draggedElement = element; // Drag the whole link item
        this.draggedElement.classList.add('dragging');
        
        // Disable pointer events on all buttons during drag
        document.querySelectorAll('.icon-btn, .link-btn').forEach(btn => {
          btn.style.pointerEvents = 'none';
        });
        
        // Set drag data
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', element.dataset.linkId);
        
        // Add visual feedback
        const container = document.querySelector('.links');
        container.classList.add('drag-active');
        
        console.log('Drag started for:', element.dataset.linkId);
      });
      
      dragHandle.addEventListener('dragend', (e) => {
        this.handleDragEnd(e);
      });
    }

    // Drop event listeners on the link items
    element.addEventListener('dragover', (e) => this.handleDragOver(e));
    element.addEventListener('drop', (e) => this.handleDrop(e));
    element.addEventListener('dragenter', (e) => this.handleDragEnter(e));
    element.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    
    // Prevent any clicks during drag operations
    element.addEventListener('click', (e) => {
      if (this.isDragging) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.log('Click blocked during drag operation');
        return false;
      }
    }, true); // Use capture phase to catch early
  }

  handleDragEnd(e) {
    console.log('Drag ended');
    this.cleanupDragStyles();
  }

  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  handleDragEnter(e) {
    e.preventDefault();
    const target = e.currentTarget;
    if (target !== this.draggedElement && target.classList.contains('link-item')) {
      target.classList.add('drag-over');
    }
  }

  handleDragLeave(e) {
    const target = e.currentTarget;
    // Only remove if we're really leaving (not going to a child element)
    if (!target.contains(e.relatedTarget)) {
      target.classList.remove('drag-over');
    }
  }

  handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation(); // Stop all event propagation
    
    const dropTarget = e.currentTarget;
    dropTarget.classList.remove('drag-over');
    
    console.log('Drop on:', dropTarget.dataset.linkId);
    console.log('Dragged element:', this.draggedElement?.dataset.linkId);
    
    // Only proceed if we have a valid dragged element and it's different from drop target
    if (this.draggedElement && dropTarget !== this.draggedElement && dropTarget.classList.contains('link-item')) {
      console.log('Performing reorder...');
      this.performReorder(this.draggedElement, dropTarget);
    } else {
      console.log('Drop ignored - same element or invalid target');
    }
    
    this.cleanupDragStyles();
    
    // Return false to prevent any further event handling
    return false;
  }

  performReorder(draggedElement, dropTarget) {
    if (!draggedElement || !dropTarget) {
      console.error('Invalid elements for reorder:', draggedElement, dropTarget);
      return;
    }
    
    const container = document.querySelector('.links');
    const allItems = Array.from(container.children);
    
    const draggedIndex = allItems.indexOf(draggedElement);
    const targetIndex = allItems.indexOf(dropTarget);
    
    console.log('Reordering:', {
      draggedId: draggedElement.dataset.linkId,
      targetId: dropTarget.dataset.linkId,
      draggedIndex,
      targetIndex
    });
    
    if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
      try {
        // Remove the dragged element
        draggedElement.remove();
        
        // Insert it at the new position
        if (draggedIndex < targetIndex) {
          // Moving down: insert after target
          dropTarget.insertAdjacentElement('afterend', draggedElement);
        } else {
          // Moving up: insert before target
          dropTarget.insertAdjacentElement('beforebegin', draggedElement);
        }
        
        console.log('DOM reorder successful, saving...');
        // Save the new order
        this.saveNewOrder();
        
        // Re-initialize drag listeners for the moved element
        this.addDragListeners(draggedElement);
      } catch (error) {
        console.error('Error during reorder:', error);
        this.showNotification('Failed to reorder items', 'error');
      }
    } else {
      console.warn('Invalid reorder indices:', draggedIndex, targetIndex);
    }
  }

  cleanupDragStyles() {
    // Clear dragging flag first
    this.isDragging = false;
    
    document.querySelectorAll('.link-item').forEach(item => {
      item.classList.remove('dragging', 'drag-over');
      item.style.cursor = '';
      // Re-enable any disabled elements
      item.style.pointerEvents = '';
    });
    
    // Re-enable all buttons
    document.querySelectorAll('.icon-btn, .link-btn').forEach(btn => {
      btn.style.pointerEvents = '';
    });
    
    const container = document.querySelector('.links');
    if (container) {
      container.classList.remove('drag-active');
    }
    
    this.draggedElement = null;
    
    // Clear any pending click events that might have been triggered during drag
    setTimeout(() => {
      console.log('Drag cleanup complete');
    }, 100); // Increased timeout
  }

  async saveNewOrder() {
    const container = document.querySelector('.links');
    const linkElements = container.querySelectorAll('.link-item');
    
    // Extract the new order of link IDs
    const newOrder = Array.from(linkElements).map(element => 
      element.getAttribute('data-link-id')
    );

    console.log('Saving new order:', newOrder);
    console.log('API endpoint:', `${this.apiBase}/links/reorder`);
    console.log('Auth token:', this.authToken ? 'Present' : 'Missing');

    try {
      const requestOptions = {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({ linkIds: newOrder })
      };
      
      console.log('Request options:', requestOptions);
      
      const response = await fetch(`${this.apiBase}/links/reorder`, requestOptions);

      console.log('Reorder API response status:', response.status);
      
      const data = await response.json();
      console.log('Reorder API response data:', data);

      if (response.ok && data.success) {
        // Update local links array to match new order
        this.links = data.links;
        this.showNotification('Links reordered successfully!', 'success');
        console.log('Reorder successful, links updated');
      } else {
        console.error('Reorder failed:', data);
        this.showNotification(data.error || 'Failed to reorder links', 'error');
        // Reload to revert to original order
        this.loadLinks();
      }
    } catch (error) {
      console.error('Error saving new order:', error);
      this.showNotification('Failed to save new order', 'error');
      // Reload to revert to original order
      this.loadLinks();
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
