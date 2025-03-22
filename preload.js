// preload.js - Bridge between the renderer process and the main process

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tanker', {
  // Template operations
  getTemplates: () => ipcRenderer.invoke('get-templates'),
  
  // Environment operations
  getEnvironments: () => ipcRenderer.invoke('get-environments'),
  createEnvironment: (params) => ipcRenderer.invoke('create-environment', params),
  startEnvironment: (environmentId) => ipcRenderer.invoke('start-environment', environmentId),
  stopEnvironment: (environmentId) => ipcRenderer.invoke('stop-environment', environmentId),
  deleteEnvironment: (environmentId) => ipcRenderer.invoke('delete-environment', environmentId),
  
  // Utility operations
  selectProjectDirectory: () => ipcRenderer.invoke('select-project-directory'),
  checkDocker: () => ipcRenderer.invoke('check-docker'),
  
  // Event listeners
  onEnvironmentUpdated: (callback) => {
    ipcRenderer.on('environment-updated', (_, environment) => callback(environment));
    return () => {
      ipcRenderer.removeAllListeners('environment-updated');
    };
  }
});