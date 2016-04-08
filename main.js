'use strict';

const port = 8087;
const WebSocketServer = require('ws').Server;

const electron = require('electron');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;
// Module to communicate with render thread
const ipcMain = electron.ipcMain;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

// Keep a global reference to the websocket server and connection to truss
let wss = null;
let remoteConnection = null;

function sendToRemote(channel, msg){
  if(remoteConnection && remoteConnection.readyState == remoteConnection.OPEN){
    msg["mtype"] = channel;
    remoteConnection.send(JSON.stringify(msg));
  } else {
    sendToClient("print", {"message": "[no remote connection]"});
  }
}

function sendToClient(channel, msg) {
  mainWindow.webContents.send(channel, msg);
}

function startServer() {
  // create the websocket server
  wss = new WebSocketServer({ port: port });
  console.log("serving on port " + port);

  wss.on('connection', function connection(ws) {
    var cname = ws._socket.remoteAddress + ":" +
                ws._socket.remotePort;
    sendToClient("print", {"message": "["  + cname + " connected.]"});
    sendToClient("log", {"message": "-------------------", "topic": "system"})
    remoteConnection = ws;

    ws.on('message', function incoming(message) {
      var jdata = JSON.parse(message);
      sendToClient(jdata.mtype, jdata);
    });

    ws.on('close', function(evt) {
      sendToClient("print", {"message": "[" + cname + " disconnected.]"});
      remoteConnection = null;
    });
  });
}

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 1024, height: 768});

  // and load the index.html of the app.
  mainWindow.loadURL('file://' + __dirname + '/index.html');

  // Open the DevTools.
  //mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  ipcMain.on('eval', function(event, arg) {
    sendToRemote('eval', arg);
  });

  ipcMain.on('info', function(event, arg) {
    sendToRemote('info', arg);
  });

  ipcMain.on('suggest', function(event, arg) {
    sendToRemote('suggest', arg);
  });

  ipcMain.on('getserverinfo', function(event, arg) {
    sendToClient('print', {'message': '[serving on port ' + port + ']'});
  });

  startServer();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});