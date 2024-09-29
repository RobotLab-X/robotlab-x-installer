const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const { spawn } = require('child_process') // Use spawn to stream stdout and stderr
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

// Handle 'install-package' event and perform git clone
ipcMain.on('install-package', (event, { packageName, installDir }) => {
  console.log(`Cloning RobotLab-X repository to ${installDir}`)

  // Git clone command
  const gitCloneCommand = `git clone https://github.com/RobotLab-X/robotlab-x.git ${installDir}`

  // Use spawn to run git clone and capture the output as it happens
  const cloneProcess = spawn('git', ['clone', 'https://github.com/RobotLab-X/robotlab-x.git', installDir])

  // Stream stdout to renderer
  cloneProcess.stdout.on('data', (data) => {
    event.sender.send('install-output', `STDOUT: ${data}`)
  })

  // Stream stderr to renderer
  cloneProcess.stderr.on('data', (data) => {
    event.sender.send('install-output', `STDERR: ${data}`)
  })

  // When the clone process is finished
  cloneProcess.on('close', (code) => {
    if (code === 0) {
      event.sender.send('install-output', 'Git clone completed successfully!\n')
      event.sender.send('install-complete') // Notify that installation is complete
    } else {
      event.sender.send('install-output', `Git clone failed with code ${code}\n`)
      event.sender.send('install-error', `Git clone failed with code ${code}`)
    }
  })
})
