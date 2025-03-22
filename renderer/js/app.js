// Basic app.js to initialize the app

document.addEventListener('DOMContentLoaded', async () => {
    // Check Docker availability
    const dockerStatus = await window.tanker.checkDocker();
    const dockerIndicator = document.getElementById('docker-indicator');
    const dockerStatusText = document.getElementById('docker-status-text');
    
    if (dockerStatus.available) {
      dockerIndicator.classList.add('active');
      dockerStatusText.textContent = 'Docker is running';
    } else {
      dockerIndicator.classList.add('error');
      dockerStatusText.textContent = 'Docker is not available';
    }
    
    // Initialize navigation
    const navItems = document.querySelectorAll('nav li');
    const views = document.querySelectorAll('.view');
    
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const viewName = item.getAttribute('data-view');
        
        navItems.forEach(navItem => navItem.classList.remove('active'));
        item.classList.add('active');
        
        views.forEach(view => view.classList.remove('active'));
        document.getElementById(`${viewName}-view`).classList.add('active');
      });
    });
    
    // Load environments
    loadEnvironments();
    
    // Load templates
    loadTemplates();
    
    // Modal controls
    const createBtn = document.getElementById('create-environment-btn');
    const emptyCreateBtn = document.getElementById('empty-create-btn');
    const closeModalBtn = document.getElementById('close-create-modal');
    const cancelCreateBtn = document.getElementById('cancel-create-btn');
    const createModal = document.getElementById('create-environment-modal');
    
    [createBtn, emptyCreateBtn].forEach(btn => {
      btn.addEventListener('click', () => {
        createModal.style.display = 'flex';
      });
    });
    
    [closeModalBtn, cancelCreateBtn].forEach(btn => {
      btn.addEventListener('click', () => {
        createModal.style.display = 'none';
      });
    });
    
    // Select project directory
    const selectPathBtn = document.getElementById('select-path-btn');
    const projectPathInput = document.getElementById('project-path');
    
    selectPathBtn.addEventListener('click', async () => {
      const path = await window.tanker.selectProjectDirectory();
      if (path) {
        projectPathInput.value = path;
      }
    });
    
    // Create environment form
    const createForm = document.getElementById('create-environment-form');
    const submitCreateBtn = document.getElementById('submit-create-btn');
    
    submitCreateBtn.addEventListener('click', async () => {
      const name = document.getElementById('environment-name').value;
      const projectPath = document.getElementById('project-path').value;
      const templateSelector = document.querySelector('.template-card.selected');
      
      if (!name || !projectPath || !templateSelector) {
        alert('Please fill all required fields');
        return;
      }
      
      const templateId = templateSelector.getAttribute('data-id');
      
      try {
        await window.tanker.createEnvironment({
          name,
          templateId,
          projectPath
        });
        
        createModal.style.display = 'none';
        createForm.reset();
        document.querySelectorAll('.template-card').forEach(card => {
          card.classList.remove('selected');
        });
        
        loadEnvironments();
      } catch (error) {
        alert(`Error creating environment: ${error.message}`);
      }
    });
    
    // Listen for environment updates
    window.tanker.onEnvironmentUpdated((environment) => {
      loadEnvironments();
    });
  });
  
  // Load environments from store
  async function loadEnvironments() {
    const environmentsList = document.getElementById('environments-list');
    const emptyState = document.querySelector('.empty-state');
    
    try {
      const environments = await window.tanker.getEnvironments();
      
      if (environments.length === 0) {
        emptyState.style.display = 'flex';
        return;
      }
      
      emptyState.style.display = 'none';
      environmentsList.innerHTML = '';
      
      environments.forEach(env => {
        const card = createEnvironmentCard(env);
        environmentsList.appendChild(card);
      });
    } catch (error) {
      console.error('Error loading environments:', error);
    }
  }
  
  // Load templates
  async function loadTemplates() {
    const templatesList = document.getElementById('templates-list');
    const templateSelector = document.getElementById('template-selector');
    
    try {
      const templates = await window.tanker.getTemplates();
      
      // Populate templates view
      templatesList.innerHTML = '';
      templates.forEach(template => {
        const card = createTemplateCard(template);
        templatesList.appendChild(card);
      });
      
      // Populate template selector in create environment modal
      templateSelector.innerHTML = '';
      templates.forEach(template => {
        const card = createTemplateSelectorCard(template);
        templateSelector.appendChild(card);
        
        card.addEventListener('click', () => {
          document.querySelectorAll('.template-card').forEach(c => {
            c.classList.remove('selected');
          });
          card.classList.add('selected');
        });
      });
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  }
  
  // Create environment card element
  function createEnvironmentCard(environment) {
    const card = document.createElement('div');
    card.className = 'environment-card';
    
    let statusClass = 'stopped';
    let statusIcon = 'fa-stop-circle';
    
    if (environment.status === 'running') {
      statusClass = 'running';
      statusIcon = 'fa-play-circle';
    } else if (environment.status === 'error') {
      statusClass = 'error';
      statusIcon = 'fa-exclamation-circle';
    }
    
    card.innerHTML = `
      <div class="environment-header">
        <div class="environment-title">${environment.name}</div>
        <div class="environment-status ${statusClass}">
          <i class="fas ${statusIcon}"></i>
          ${environment.status}
        </div>
      </div>
      <div class="environment-body">
        <div class="environment-info">
          <p><i class="fas fa-folder"></i> ${environment.projectPath}</p>
          <p><i class="fas fa-calendar"></i> Created: ${new Date(environment.createdAt).toLocaleDateString()}</p>
          <p><i class="fas fa-clock"></i> Last used: ${new Date(environment.lastUsed).toLocaleDateString()}</p>
        </div>
        <div class="environment-actions">
          ${environment.status === 'running' 
            ? `<button class="btn secondary stop-btn" data-id="${environment.id}"><i class="fas fa-stop"></i> Stop</button>`
            : `<button class="btn primary start-btn" data-id="${environment.id}"><i class="fas fa-play"></i> Start</button>`
          }
          <button class="btn danger delete-btn" data-id="${environment.id}"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `;
    
    // Add event listeners for buttons
    setTimeout(() => {
      const startBtn = card.querySelector('.start-btn');
      const stopBtn = card.querySelector('.stop-btn');
      const deleteBtn = card.querySelector('.delete-btn');
      
      if (startBtn) {
        startBtn.addEventListener('click', async () => {
          try {
            await window.tanker.startEnvironment(environment.id);
          } catch (error) {
            alert(`Error starting environment: ${error.message}`);
          }
        });
      }
      
      if (stopBtn) {
        stopBtn.addEventListener('click', async () => {
          try {
            await window.tanker.stopEnvironment(environment.id);
          } catch (error) {
            alert(`Error stopping environment: ${error.message}`);
          }
        });
      }
      
      if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
          if (confirm(`Are you sure you want to delete "${environment.name}"?`)) {
            try {
              await window.tanker.deleteEnvironment(environment.id);
              loadEnvironments();
            } catch (error) {
              alert(`Error deleting environment: ${error.message}`);
            }
          }
        });
      }
    }, 0);
    
    return card;
  }
  
  // Create template card element
  function createTemplateCard(template) {
    const card = document.createElement('div');
    card.className = 'template-card';
    card.setAttribute('data-id', template.id);
    
    card.innerHTML = `
      <div class="template-header">
        <div class="template-icon">
          <i class="fas fa-box"></i>
        </div>
        <div class="template-title">${template.name}</div>
      </div>
      <div class="template-body">
        <div class="template-description">${template.description}</div>
        <div class="template-tags">
          ${template.tags.map(tag => `<span class="template-tag">${tag}</span>`).join('')}
        </div>
      </div>
    `;
    
    return card;
  }
  
  // Create template card for the selector in create environment modal
  function createTemplateSelectorCard(template) {
    const card = document.createElement('div');
    card.className = 'template-card';
    card.setAttribute('data-id', template.id);
    
    card.innerHTML = `
      <div class="template-header">
        <div class="template-icon">
          <i class="fas fa-box"></i>
        </div>
        <div class="template-title">${template.name}</div>
      </div>
    `;
    
    return card;
  }