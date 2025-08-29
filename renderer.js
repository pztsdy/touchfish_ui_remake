// renderer.js
const connectionPage = document.getElementById('connection-page');
const chatPage = document.getElementById('chat-page');
const connectBtn = document.getElementById('connect-btn');
const sendBtn = document.getElementById('send-btn');
const ipInput = document.getElementById('ip');
const portInput = document.getElementById('port');
const usernameInput = document.getElementById('username');
const messageInput = document.getElementById('message-input');
const messagesDiv = document.getElementById('messages');
const chatTitle = document.getElementById('chat-title');
const versionInfo = document.getElementById('version-info');

const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');

const updatelogBtn = document.getElementById('update-log-btn');
const updateLogModal = document.getElementById('update-log-modal');
const closeUpdateLogBtn = document.getElementById('close-update-log-btn');

const reportbugsBtn = document.getElementById('report-bug');
const reportModal = document.getElementById('report-modal');
const closeReportBtn = document.getElementById('close-report-btn');
const reportsubmitBtn = document.getElementById('report-submit-btn');

let systemColor = '#87CEEB';
let broadcastColor = '#90EE90';
let hintColor = '#ADD8E6';
let currentUsername = null;

// 在脚本加载时立即设置默认状态
connectionPage.classList.add('active');
chatPage.classList.remove('active');
settingsModal.classList.remove('active');

function getHHMMSS() {
  const now = new Date();
  const pad = (num) => num.toString().padStart(2, '0');
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function displayMessage(msg, type = 'regular') {
  const messageEl = document.createElement('div');
  messageEl.className = `message-item ${type}`;
  const timestamp = `<span>[${getHHMMSS()}]</span> `;

  if (type !== 'regular') {
    const prefixMap = {
      'system': '[系统提示]',
      'broadcast': '[房主广播]',
      'hint': '欢迎加入 TouchFish QQ 群：1056812860，以获得最新资讯。请勿刷屏，刷屏者封禁 IP。', // 废物利用
    };
    const color = type === 'system' ? systemColor : (type === 'broadcast' ? broadcastColor : hintColor);
    const prefix = prefixMap[type] || '';
    const content = msg.startsWith(prefix) ? msg.replace(prefix, '').trim() : msg;
    messageEl.innerHTML = `${timestamp}<span style="color: ${color};">${prefix}</span> ${content}`;
  } else {
    messageEl.innerHTML = `${timestamp}<span>${msg}</span>`;
  }

  messagesDiv.appendChild(messageEl);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

window.api.onConnectionSuccess((username) => {
  connectionPage.classList.remove('active');
  connectionPage.classList.add('hidden')
  chatPage.classList.add('active');
  chatTitle.innerText = `Touchfish - ${username}`;
  displayMessage(`已连接到服务器。`, 'system');
});

window.api.onConnectionError((errorMsg) => {
  alert(errorMsg);
  // reload
  window.location.reload();
});

window.api.onReceiveMessage((message) => {
  displayMessage(message, 'regular');
});

window.api.onReceiveHostHint((message) => {
  displayMessage(`${message}`, 'hint');
});

window.api.onReceiveSystemMessage((message) => {
  displayMessage(`[系统提示] ${message}`, 'system');
});

window.api.onReceiveBroadcastMessage((message) => {
  displayMessage(`[房主广播] ${message}`, 'broadcast');
});

window.api.getVersions().then(({ newestVersion, currentVersion, canServeVersion }) => {
  versionInfo.innerText = `本程序版本: ${currentVersion}\n适配的官方服务器（保证稳定性）版本: ${canServeVersion}\n官方 Python Client 最新版本: ${newestVersion}`;
});

connectBtn.addEventListener('click', () => {
  const ip = ipInput.value;
  const port = parseInt(portInput.value);
  const username = usernameInput.value.trim();

  if (!username) {
    alert("用户名不能为空！");
    return;
  }
  currentUsername = username;
  window.api.connectToServer({ ip, port, username });
});

sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    sendMessage();
  }
});

function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;
  // 由于有屏蔽词，所以等待返回（否则会被骂ShadowBan）
  // displayMessage(`${currentUsername}: ${message}`, 'regular');
  window.api.sendMessage(`${currentUsername}: ${message}`);
  messageInput.value = '';
}

settingsBtn.addEventListener('click', () => {
  settingsModal.classList.add('active');
});

closeSettingsBtn.addEventListener('click', () => {
  settingsModal.classList.remove('active');
});

updatelogBtn.addEventListener('click', () => {
  updateLogModal.classList.add('active');
});

closeUpdateLogBtn.addEventListener('click', () => {
  updateLogModal.classList.remove('active');
});

reportbugsBtn.addEventListener('click', () => {
  reportModal.classList.add('active');
});

closeReportBtn.addEventListener('click', () => {
  reportModal.classList.remove('active');
});

reportsubmitBtn.addEventListener('click', (event) => {
  event.preventDefault();
  const description = document.getElementById('report-description').value.trim();
  const url = `https://github.com/pztsdy/touchfish_ui_remake/issues/new?body=${encodeURIComponent(description)}`;
  alert('感谢你的反馈！我们会尽快处理你的问题。');
  window.api.openLink(url);
});

function updateColor(type) {
  const colorInput = document.getElementById(`${type}-color`);
  if (type === 'system') {
    systemColor = colorInput.value;
  } else if (type === 'broadcast') {
    broadcastColor = colorInput.value;
  } else if (type === 'hint') {
    hintColor = colorInput.value;
  }
}

document.getElementById('system-color').addEventListener('input', () => updateColor('system'));
document.getElementById('broadcast-color').addEventListener('input', () => updateColor('broadcast'));
document.getElementById('hint-color').addEventListener('input', () => updateColor('hint'));