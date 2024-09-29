const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const { exec } = require('child_process')
const path = require('path')

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

  // Send version to the renderer once the window is ready
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('set-version', robotlabxVersion)
    mainWindow.webContents.send('set-versions', robotlabxVersions)
  })
})


// Path to npm in node_modules (if bundled)
const npmPath = path.join(__dirname, 'node_modules', 'npm', 'bin', 'npm-cli.js')

// Handle 'install-package' event (although this isn't used in your form currently)
ipcMain.on('install-package', (event, { packageName, installDir }) => {
  console.log(`Installing package: ${packageName} to ${installDir || selectedDirectory}`)

  const cwd = installDir || selectedDirectory || __dirname

  const installCommand = `node ${npmPath} install ${packageName}`
  const npmProcess = exec(installCommand, { cwd })

  npmProcess.stdout.on('data', (data) => {
    event.sender.send('install-output', data)
  })

  npmProcess.stderr.on('data', (data) => {
    event.sender.send('install-error', data)
  })

  npmProcess.on('close', (code) => {
    event.sender.send('install-output', `Installation process exited with code ${code}`)
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
