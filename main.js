// main.js - Main process for the Electron application

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const Docker = require('dockerode');
const Store = require('electron-store');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Initialize Docker client
const docker = new Docker();

// Initialize persistent storage
const store = new Store();

// Initialize environments storage if not exists
if (!store.has('environments')) {
  store.set('environments', []);
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icons/icon.png')
  });

  mainWindow.loadFile('renderer/index.html');

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for communication with the renderer process

// Get available templates
ipcMain.handle('get-templates', async () => {
  // In a real app, these could be fetched from a remote repository
  return [
    {
      id: 'node-react',
      name: 'Node.js + React',
      description: 'Full-stack JavaScript development with Node.js backend and React frontend',
      icon: 'node-react.png',
      tags: ['JavaScript', 'Node.js', 'React'],
      config: {
        services: [
          {
            name: 'backend',
            image: 'node:16',
            ports: ['3000:3000'],
            volumes: ['./backend:/app'],
            workingDir: '/app',
            command: 'npm start'
          },
          {
            name: 'frontend',
            image: 'node:16',
            ports: ['8000:8000'],
            volumes: ['./frontend:/app'],
            workingDir: '/app',
            command: 'npm start'
          }
        ]
      }
    },
    {
      id: 'django-postgres',
      name: 'Django + PostgreSQL',
      description: 'Python web development with Django and PostgreSQL database',
      icon: 'django-postgres.png',
      tags: ['Python', 'Django', 'PostgreSQL'],
      config: {
        services: [
          {
            name: 'web',
            image: 'python:3.9',
            ports: ['8000:8000'],
            volumes: ['./app:/app'],
            workingDir: '/app',
            command: 'python manage.py runserver 0.0.0.0:8000',
            dependsOn: ['db']
          },
          {
            name: 'db',
            image: 'postgres:13',
            ports: ['5432:5432'],
            volumes: ['postgres_data:/var/lib/postgresql/data'],
            environment: {
              POSTGRES_PASSWORD: 'postgres',
              POSTGRES_USER: 'postgres',
              POSTGRES_DB: 'postgres'
            }
          }
        ]
      }
    },
    {
      id: 'lamp',
      name: 'LAMP Stack',
      description: 'Linux, Apache, MySQL, and PHP development environment',
      icon: 'lamp.png',
      tags: ['PHP', 'MySQL', 'Apache'],
      config: {
        services: [
          {
            name: 'web',
            image: 'php:8.0-apache',
            ports: ['80:80'],
            volumes: ['./app:/var/www/html']
          },
          {
            name: 'db',
            image: 'mysql:8.0',
            ports: ['3306:3306'],
            volumes: ['mysql_data:/var/lib/mysql'],
            environment: {
              MYSQL_ROOT_PASSWORD: 'root',
              MYSQL_DATABASE: 'app'
            }
          }
        ]
      }
    }
  ];
});

// Get saved environments
ipcMain.handle('get-environments', async () => {
  return store.get('environments');
});

// Create a new environment
ipcMain.handle('create-environment', async (event, { name, templateId, projectPath }) => {
  try {
    // Get template
    const templates = await ipcMain.handlers.get('get-templates').handle();
    const template = templates.find(t => t.id === templateId);
    
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    
    // Generate unique ID for the environment
    const id = uuidv4();
    
    // Create environment configuration
    const environment = {
      id,
      name,
      templateId,
      projectPath,
      status: 'stopped',
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString()
    };
    
    // Save environment
    const environments = store.get('environments');
    environments.push(environment);
    store.set('environments', environments);
    
    // Create project directory structure if it doesn't exist
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }
    
    // Generate docker-compose.yml file in the project directory
    const composeFilePath = path.join(projectPath, 'docker-compose.yml');
    const composeConfig = {
      version: '3',
      services: template.config.services.reduce((acc, service) => {
        acc[service.name] = {
          image: service.image,
          ports: service.ports,
          volumes: service.volumes,
          working_dir: service.workingDir,
          command: service.command,
          depends_on: service.dependsOn,
          environment: service.environment
        };
        return acc;
      }, {})
    };
    
    fs.writeFileSync(composeFilePath, JSON.stringify(composeConfig, null, 2));
    
    return environment;
  } catch (error) {
    console.error('Error creating environment:', error);
    throw error;
  }
});

// Start an environment
ipcMain.handle('start-environment', async (event, environmentId) => {
  try {
    const environments = store.get('environments');
    const environment = environments.find(env => env.id === environmentId);
    
    if (!environment) {
      throw new Error(`Environment ${environmentId} not found`);
    }
    
    // Start containers using docker-compose
    // In a real implementation, you would use dockerode to start the containers
    // or use child_process to run docker-compose commands
    
    // Simulate starting environment
    setTimeout(() => {
      const updatedEnvironments = store.get('environments');
      const index = updatedEnvironments.findIndex(env => env.id === environmentId);
      
      if (index !== -1) {
        updatedEnvironments[index].status = 'running';
        updatedEnvironments[index].lastUsed = new Date().toISOString();
        store.set('environments', updatedEnvironments);
        
        // Notify renderer process of status change
        if (mainWindow) {
          mainWindow.webContents.send('environment-updated', updatedEnvironments[index]);
        }
      }
    }, 2000);
    
    return { success: true, message: 'Environment starting...' };
  } catch (error) {
    console.error('Error starting environment:', error);
    throw error;
  }
});

// Stop an environment
ipcMain.handle('stop-environment', async (event, environmentId) => {
  try {
    const environments = store.get('environments');
    const environment = environments.find(env => env.id === environmentId);
    
    if (!environment) {
      throw new Error(`Environment ${environmentId} not found`);
    }
    
    // Stop containers
    // In a real implementation, you would use dockerode to stop the containers
    
    // Simulate stopping environment
    setTimeout(() => {
      const updatedEnvironments = store.get('environments');
      const index = updatedEnvironments.findIndex(env => env.id === environmentId);
      
      if (index !== -1) {
        updatedEnvironments[index].status = 'stopped';
        store.set('environments', updatedEnvironments);
        
        // Notify renderer process of status change
        if (mainWindow) {
          mainWindow.webContents.send('environment-updated', updatedEnvironments[index]);
        }
      }
    }, 1500);
    
    return { success: true, message: 'Environment stopping...' };
  } catch (error) {
    console.error('Error stopping environment:', error);
    throw error;
  }
});

// Delete an environment
ipcMain.handle('delete-environment', async (event, environmentId) => {
  try {
    let environments = store.get('environments');
    const environment = environments.find(env => env.id === environmentId);
    
    if (!environment) {
      throw new Error(`Environment ${environmentId} not found`);
    }
    
    // Stop containers if running
    if (environment.status === 'running') {
      await ipcMain.handlers.get('stop-environment').handle(event, environmentId);
    }
    
    // Remove environment from store
    environments = environments.filter(env => env.id !== environmentId);
    store.set('environments', environments);
    
    return { success: true, message: 'Environment deleted' };
  } catch (error) {
    console.error('Error deleting environment:', error);
    throw error;
  }
});

// Select project directory
ipcMain.handle('select-project-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });
  
  if (result.canceled) {
    return null;
  }
  
  return result.filePaths[0];
});

// Check Docker availability
ipcMain.handle('check-docker', async () => {
  try {
    const info = await docker.info();
    return { available: true, info };
  } catch (error) {
    console.error('Docker not available:', error);
    return { available: false, error: error.message };
  }
});