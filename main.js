const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const { exec } = require('child_process')
const path = require('path')
const os = require('os') // Import the os module to gather system information

let mainWindow
let robotlabxVersions = ['latest', '0.9.125', '0.9.124', '0.9.123']
let robotlabxVersion = '0.9.125'
let selectedDirectory = null // Initialize as null to ensure proper functionality

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'icon.png') // Path to your icon
  })

  mainWindow.loadFile('index.html')

  // Send version and system details to the renderer once the window is ready
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('set-version', robotlabxVersion)
    mainWindow.webContents.send('set-versions', robotlabxVersions)
    
    // Query system details
    const systemDetails = {
      architecture: os.arch(),
      platform: os.platform(),
      osVersion: os.version ? os.version() : 'Unknown', // os.version() might not be available on all systems
      release: os.release(),
      type: os.type(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpuCores: os.cpus().length,
    }

    // Send system details to the renderer process
    mainWindow.webContents.send('system-details', systemDetails)
  })
})

// Path to npm in node_modules (if bundled)
const npmPath = path.join(__dirname, 'node_modules', 'npm', 'bin', 'npm-cli.js')

// Handle 'choose-directory' event
ipcMain.on('choose-directory', (event) => {
  dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      selectedDirectory = result.filePaths[0] // Set the selected directory
      event.sender.send('directory-selected', selectedDirectory) // Send the selected directory back to the renderer
    } else {
      event.sender.send('install-error', 'No directory selected')
    }
  }).catch(err => {
    console.error('Error selecting directory:', err)
    event.sender.send('install-error', 'Error selecting directory')
  })
})

// Handle 'install-package' event
ipcMain.on('install-package', (event, { packageName, installDir }) => {
  console.log(`Installing package: ${packageName} to ${installDir}`)

  // Mock installation process with a timer
  setTimeout(() => {
    event.sender.send('install-output', `Installing ${packageName} to ${installDir}...\n`)
    setTimeout(() => {
      event.sender.send('install-output', `Installation of ${packageName} complete!\n`)
      event.sender.send('install-complete') // Notify that installation is complete
    }, 3000) // Mock a 3-second install process
  }, 1000) // Delay before starting the mock process
})
