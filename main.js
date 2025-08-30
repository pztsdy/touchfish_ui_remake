//main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const { shell } = require('electron');
const path = require('path');
const net = require('net');
const axios = require('axios');

let mainWindow;
let clientSocket;
let currentUsername = null; // 新增一个变量来保存当前用户名

async function fetchLatestVersion() {
  try {
    const response = await axios.get("https://bopid.cn/chat/newest_version_chat.html");
    return response.data.trim();
  } catch (error) {
    console.error('Failed to fetch latest version:', error);
    return '获取失败';
  }
}

async function fetchCanServeVersion() {
  try {
    const response = await axios.get("https://www.piaoztsdy.cn/touchfishui.txt");
    return response.data.trim();
  } catch (error) {
    console.error('Failed to fetch can serve version:', error);
    return '获取失败';
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 820,
    height: 800,
    minWidth: 400,
    minHeight: 300,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'Touchfish UI Remake',
    icon: 'tchui.ico',
  });

  mainWindow.loadFile('index.html');

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown') {
      if ((input.control && input.key === 'r') || (input.meta && input.key === 'r')) {
        event.preventDefault();
      }
      if (input.key === 'F5') {
        event.preventDefault();
      }
    }
  });

  ipcMain.on('connect-to-server', async (event, { ip, port, username }) => {
    try {
      clientSocket = new net.Socket();
      clientSocket.connect(port, ip, () => {
        console.log('Connected to server!');
        currentUsername = username;
        mainWindow.webContents.send('connection-success', username);
      });

      clientSocket.on('data', (data) => {
        const message = data.toString('utf-8').trim(); // 移除首尾空格
        // 根据消息内容判断消息类型，并转发给渲染进程
        if (message.startsWith('欢迎加入 TouchFish QQ 群：1056812860，以获得最新资讯。请勿刷屏，刷屏者封禁 IP。')) {
          mainWindow.webContents.send('receive-host-hint', message);
        } else if (message.startsWith('[系统提示]')) {
          mainWindow.webContents.send('receive-system-message', message.substring('[系统提示]'.length).trim());
        } else if (message.startsWith('[房主广播]')) {
          mainWindow.webContents.send('receive-broadcast-message', message.substring('[房主广播]'.length).trim());
        } else {
          mainWindow.webContents.send('receive-message', message);
        }
      });

      clientSocket.on('error', (err) => {
        console.error('Socket error:', err);
        mainWindow.webContents.send('connection-error', `无法连接到服务器:\n${err.message}`);
      });

      clientSocket.on('close', () => {
        console.log('Connection closed.');
        mainWindow.webContents.send('connection-closed');
      });

    } catch (e) {
      mainWindow.webContents.send('connection-error', `无法连接到服务器:\n${e.message}`);
    }
  });

  ipcMain.on('send-message', (event, message) => {
    if (clientSocket) {
      clientSocket.write(message); // 发送给服务器
    }
  });

  ipcMain.handle('get-versions', async () => {
    const newestVersion = await fetchLatestVersion();
    const currentVersion = app.getVersion();
    const canServeVersion = await fetchCanServeVersion();
    return { newestVersion, currentVersion, canServeVersion };
  });

  ipcMain.on('open-link', (event, url) => {
    shell.openExternal(url);
    event.preventDefault();
  });

  ipcMain.handle('marked', async (_event, text) => {
    const { marked } = await import('marked');
    return marked(text).trim();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});