const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const { exec } = require('child_process')
const path = require('path')

let mainWindow

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false // Make sure to handle security in production
    },
    icon: path.join(__dirname, 'icon.png') // Path to your icon
  })

  mainWindow.loadFile('index.html')
})

// Path to npm in node_modules (if bundled)
const npmPath = path.join(__dirname, 'node_modules', 'npm', 'bin', 'npm-cli.js')

// Handle 'install-package' event
ipcMain.on('install-package', (event, { packageName, installDir }) => {
  console.log(`Installing package: ${packageName} to ${installDir}`)

  const cwd = installDir || __dirname

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
      const selectedDirectory = result.filePaths[0]
      event.sender.send('directory-selected', selectedDirectory)
    }
  }).catch(err => {
    console.error('Error selecting directory:', err)
    event.sender.send('install-error', 'Error selecting directory')
  })
})
