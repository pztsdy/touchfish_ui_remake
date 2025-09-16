// renderer.js
const connectionPage = document.getElementById('connection-page');
const chatPage = document.getElementById('chat-page');
const connectBtn = document.getElementById('connect-btn');
const sendBtn = document.getElementById('send-btn');
const ipInput = document.getElementById('ip');
const portInput = document.getElementById('port');
const usernameInput = document.getElementById('username');
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

const checkUpdateBtn = document.getElementById('check-update');
const checkUpdateModal = document.getElementById('check-update-modal');
const closeCheckUpdateBtn = document.getElementById('close-check-update-btn');
const checkUpdateContent = document.getElementById('check-update-content');

const getNoticeBtn = document.getElementById('get-notice');
const noticeModal = document.getElementById('notice-modal');
const closeNoticeBtn = document.getElementById('close-notice-btn');
const noticeContent = document.getElementById('notice-content');

const messageInput = document.getElementById('message-input');
const mdEditor = new MarkdownPalettes(messageInput);

let systemColor = '#87CEEB';
let broadcastColor = '#90EE90';
let hintColor = '#ADD8E6';
let currentUsername = null;

connectionPage.classList.add('active');
chatPage.classList.add('hidden');
settingsModal.classList.add('hidden');
updateLogModal.classList.add('hidden');
reportModal.classList.add('hidden');

function getHHMMSS() {
  const now = new Date();
  const pad = (num) => num.toString().padStart(2, '0');
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function displayMessage(msg, type = 'regular', username = null) {
  if (!msg || typeof msg !== 'string') return;

  const messageEl = document.createElement('div');
  messageEl.className = `message-item ${type}`;

  const now = new Date();
  const timestamp = `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
  const timestampHtml = `<span class="timestamp">${timestamp}</span>`;

  const isAtBottom = messagesDiv.scrollHeight - messagesDiv.scrollTop <= messagesDiv.clientHeight + 5;

  try {
    if (type === 'regular') {
      // 处理普通消息 - 解析发送者和内容
      let sender = username || "匿名";
      let content = msg;

      // 如果消息包含标准格式 "用户名: 内容"
      if (msg.includes(': ')) {
        const colonIndex = msg.indexOf(': ');
        const potentialSender = msg.substring(0, colonIndex);
        // 简单验证发送者名称（避免误解析）
        if (potentialSender.length > 0 && potentialSender.length < 30) {
          sender = potentialSender;
          content = msg.substring(colonIndex + 2);
        }
      }

      // 渲染Markdown内容（已包含数学公式和代码高亮）
      window.api.markdownit(content).then(rendered => {
        messageEl.innerHTML = `${timestampHtml} <strong class="sender">${sender}:</strong> <span class="msg-text">${rendered}</span>`;
        messagesDiv.appendChild(messageEl);
        if (isAtBottom) messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }).catch(error => {
        // Markdown渲染失败时的降级处理
        console.error('Markdown渲染失败:', error);
        messageEl.innerHTML = `${timestampHtml} <strong class="sender">${sender}:</strong> <span class="msg-text">${escapeHtml(content)}</span>`;
        messagesDiv.appendChild(messageEl);
        if (isAtBottom) messagesDiv.scrollTop = messagesDiv.scrollHeight;
      });

    } else {
      // 处理系统消息、广播消息等（保持原有逻辑）
      const colorMap = {
        'system': systemColor,
        'broadcast': broadcastColor,
        'hint': hintColor
      };

      const prefixMap = {
        'system': '[系统提示]',
        'broadcast': '[房主广播]',
        'hint': '欢迎加入 TouchFish QQ 群：1056812860，以获得最新资讯。请勿刷屏，刷屏者封禁 IP。'
      };

      const color = colorMap[type] || '#333333';
      const prefix = prefixMap[type] || '';

      let displayedContent = msg;

      // 如果消息以特定前缀开头，进行特殊处理
      if (prefix && msg.startsWith(prefix)) {
        const contentWithoutPrefix = msg.substring(prefix.length).trim();
        displayedContent = `<span style="color:${color}; font-weight: bold;">${prefix}</span> ${escapeHtml(contentWithoutPrefix)}`;
      } else {
        displayedContent = `<span style="color:${color};">${escapeHtml(msg)}</span>`;
      }

      messageEl.innerHTML = `${timestampHtml} ${displayedContent}`;
      messagesDiv.appendChild(messageEl);
      if (isAtBottom) messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  } catch (error) {
    console.error('消息显示错误:', error);
    // 最后的降级处理
    messageEl.innerHTML = `${timestampHtml} <span class="error-msg">消息显示错误</span>`;
    messagesDiv.appendChild(messageEl);
    if (isAtBottom) messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
}

// 辅助函数：HTML转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

window.api.onConnectionSuccess((username) => {
  connectionPage.classList.remove('active');
  connectionPage.classList.add('hidden');
  chatPage.classList.remove('hidden');
  chatPage.classList.add('active');
  chatTitle.innerText = `Touchfish - ${username}`;
  displayMessage(`已连接到服务器。`, 'system');
});

window.api.onConnectionError((errorMsg) => {
  alert(errorMsg);
  window.location.reload();
});

window.api.onReceiveMessage((message) => {
  displayMessage(message, 'regular');
});

window.api.onReceiveHostHint((message) => {
  displayMessage(message, 'hint');
});

window.api.onReceiveSystemMessage((message) => {
  displayMessage(message, 'system');
});

window.api.onReceiveBroadcastMessage((message) => {
  displayMessage(message, 'broadcast');
});

window.api.getVersions().then(({ newestVersion, currentVersion, canServeVersion }) => {
  versionInfo.innerText = `本程序版本: ${currentVersion}\n适配的官方服务器（保证稳定性）版本: v1.1.1 (防断连版本)\n官方 Python Client 最新版本: ${newestVersion}`;
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

sendBtn.addEventListener('click', () => {
  const message = mdEditor.content.trim();
  if (!message) return;
  console.log(currentUsername);
  window.api.sendMessage(`${currentUsername}: ${message}`);
  mdEditor.content = ""; // 发送后清空编辑器
});

messageInput.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    const message = mdEditor.content.trim();
    if (!message) return;
    window.api.sendMessage(`${currentUsername}: ${message}`);
    mdEditor.content = "";
    e.preventDefault();
  }
});

// ---- 模态框功能 ----

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

getNoticeBtn.addEventListener('click', () => {
  noticeModal.classList.add('active');
  window.api.getNotice().then((notice) => {
    noticeContent.innerHTML = notice.map(item => `<li>${item}</li>`).join('');
  });
});

closeNoticeBtn.addEventListener('click', () => {
  noticeModal.classList.remove('active');
});

checkUpdateBtn.addEventListener('click', () => {
  checkUpdateModal.classList.add('active');
  window.api.checkForUpdates().then(({ latestRemakeVersion, currentVersion, hasUpdate }) => {
    if (! hasUpdate) {
      checkUpdateContent.innerText = `发现新版本: ${latestRemakeVersion}\n当前版本: ${currentVersion}`;
    } else {
      checkUpdateContent.innerText = `当前已是最新版本: ${currentVersion}`;
    }
  });
});

closeCheckUpdateBtn.addEventListener('click', () => {
  checkUpdateModal.classList.remove('active');
});

reportsubmitBtn.addEventListener('click', (event) => {
  event.preventDefault();
  const description = document.getElementById('report-description').value.trim();
  const url = `https://github.com/pztsdy/touchfish_ui_remake/issues/new?body=${encodeURIComponent(description)}`;
  alert('感谢你的反馈！我们会尽快处理你的问题。');
  window.api.openLink(url);
  reportModal.classList.remove('active');
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