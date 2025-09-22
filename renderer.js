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

const fileBtn = document.getElementById('file-btn');
const fileProgressContainer = document.getElementById('file-progress-container');
const fileProgressText = document.getElementById('file-progress-text');
const fileProgressBar = document.getElementById('file-progress-bar');

// 文件传输相关变量
let isSendingFile = false;
let isReceivingFile = false;

// 设置相关变量
let bellEnabled = false;
let notifierEnabled = false;
let notifierKeywords = [];
let fontFamily = 'Maple Mono NF CN Light';
let fontSize = 14;

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

  // 检查是否是Base64编码的文件数据
  if ((isSendingFile || isReceivingFile) && msg.includes('base64')) {
    return; // 不显示文件传输的Base64内容
  }

  const messageEl = document.createElement('div');
  messageEl.className = `message-item ${type}`;

  const now = new Date();
  const timestamp = `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
  const timestampHtml = `<span class="timestamp">${timestamp}</span>`;

  const isAtBottom = messagesDiv.scrollHeight - messagesDiv.scrollTop <= messagesDiv.clientHeight + 5;

  try {
    if (type === 'regular') {
      // 处理普通消息 - 解析发送者和内容
      let sender = username || ""; // 不需要有“匿名”，否则服务器有人加入的提示无法正常工作
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
  // 解析发送者和内容
  let sender = "";
  let content = message;

  if (message.includes(': ')) {
    const colonIndex = message.indexOf(': ');
    sender = message.substring(0, colonIndex);
    content = message.substring(colonIndex + 2);

    // 检查是否是自己发送的消息
    if (sender === currentUsername) {
      displayMessage(message, 'regular');
      return;
    }
  }

  // 显示消息
  displayMessage(message, 'regular');

  // 处理通知
  if (notifierEnabled) {
    // 如果设置了关键词，检查关键词匹配
    if (notifierKeywords.length === 0 || notifierKeywords.some(keyword => content.toLowerCase().includes(keyword.toLowerCase()))) {
      // 发送系统通知
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Touchfish', {
          body: `${sender}: ${content}`,
          icon: 'tchui.ico'
        });
      }
    }
  }

  if (notifierKeywords.length === 0 || notifierKeywords.some(keyword => content.toLowerCase().includes(keyword.toLowerCase()))) {
    // 播放提示音
    if (bellEnabled) {
      try {
        const audio = new Audio('chimes.mp3');
        audio.play().catch(console.error);
      } catch (e) {
        console.error('播放提示音失败:', e);
      }
    }
  }
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
    if (!hasUpdate) {
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

if (fileBtn) {
  fileBtn.addEventListener('click', async () => {
    if (isSendingFile) {
      alert('正在发送文件，请等待当前文件发送完成');
      return;
    }

    try {
      const filePath = await window.api.selectFile();
      if (!filePath) return;

      showFileProgress('发送文件中...');
      isSendingFile = true;
      displayMessage(`[系统提示] 开始发送文件...`, 'system');
      
      const success = await window.api.sendFile(filePath);
      if (!success) {
        displayMessage(`[系统提示] 文件发送失败`, 'system');
        hideFileProgress();
        isSendingFile = false;
      }
    } catch (error) {
      console.error('文件发送错误:', error);
      displayMessage(`[系统提示] 文件发送错误: ${error}`, 'system');
      hideFileProgress();
      isSendingFile = false;
    }
  });
}

// 文件发送相关事件处理
window.api.onFileSendProgress((progress) => {
  if (!isSendingFile) return;
  updateFileProgress(`发送进度: ${progress.toFixed(1)}%`, progress);
  displayMessage(`[系统提示] 文件发送进度: ${progress.toFixed(1)}%`, 'system');
});

window.api.onFileSendComplete(() => {
  updateFileProgress('文件发送完成！', 100);
  displayMessage('[系统提示] 文件发送完成！', 'system');
  setTimeout(() => {
    hideFileProgress();
    isSendingFile = false;
  }, 1000);
});

window.api.onFileSendError((error) => {
  displayMessage(`[系统提示] 文件发送错误: ${error}`, 'system');
  hideFileProgress();
  isSendingFile = false;
});

// 文件接收相关事件处理
window.api.onFileReceiveRequest((fileInfo) => {
  // 检查是否是自己发送的文件
  const fileName = fileInfo.name;
  if (isReceivingFile || isSendingFile && fileInfo.sender === currentUsername) {
    window.api.rejectFile();
    return;
  }

  const shouldReceive = confirm(
    `是否接收文件：${fileInfo.name}\n大小：${(fileInfo.size / 1024 / 1024).toFixed(1)}MB`
  );

  if (shouldReceive) {
    showFileProgress('接收文件中...');
    isReceivingFile = true;
    displayMessage(`[系统提示] 开始接收文件：${fileInfo.name}`, 'system');
  } else {
    isReceivingFile = true;  // 临时设置为true以避免显示后续的Base64内容
    window.api.rejectFile();
    // 在接收到文件结束消息时会自动重置状态
  }
});

window.api.onFileReceiveProgress((progress) => {
  if (!isReceivingFile) return;
  updateFileProgress(`接收进度: ${progress.toFixed(1)}%`, progress);
  displayMessage(`[系统提示] 文件接收进度: ${progress.toFixed(1)}%`, 'system');
});

window.api.onFileReceiveComplete((fileData) => {
  if (!isReceivingFile) return;
  
  updateFileProgress('文件接收完成！请选择保存位置...', 100);
  displayMessage('[系统提示] 文件接收完成，请选择保存位置...', 'system');
  
  window.api.saveFile({
    name: fileData.name,
    data: fileData.data
  }).then(result => {
    if (result.success) {
      displayMessage(`[系统提示] 文件已保存到：${result.filePath}`, 'system');
      // 如果启用了系统通知，发送通知
      if (notifierEnabled) {
        new Notification('文件接收完成', {
          body: `文件已保存到：${result.filePath}`,
          icon: 'tchui.ico'
        });
      }
    } else if (result.error) {
      displayMessage(`[系统提示] 文件保存失败: ${result.error}`, 'system');
    }
    hideFileProgress();
    isReceivingFile = false;
  });
});

// 显示文件进度条
function showFileProgress(text) {
  fileProgressText.textContent = text;
  fileProgressBar.style.width = '0%';
  fileProgressContainer.classList.remove('hidden');
  fileProgressContainer.classList.add('active');
}

// 更新文件进度条
function updateFileProgress(text, percentage) {
  fileProgressText.textContent = text;
  fileProgressBar.style.width = `${percentage}%`;
}

// 隐藏文件进度条
function hideFileProgress() {
  fileProgressContainer.classList.remove('active');
  fileProgressContainer.classList.add('hidden');
}

// 关闭设置按钮事件
if (closeSettingsBtn) {
  closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('active');
  });
}

// 加载设置
function loadSettings() {
  // 从localStorage加载设置
  const settings = JSON.parse(localStorage.getItem('chatSettings') || '{}');
  bellEnabled = settings.bellEnabled || false;
  notifierEnabled = settings.notifierEnabled || false;
  notifierKeywords = settings.notifierKeywords || [];
  fontFamily = settings.fontFamily || 'Maple Mono NF CN Light';
  fontSize = settings.fontSize || 14;

  // 更新UI
  document.getElementById('bell-enabled').checked = bellEnabled;
  document.getElementById('notifier-enabled').checked = notifierEnabled;
  document.getElementById('notifier-keywords').value = notifierKeywords.join(',');
  document.getElementById('font-family').value = fontFamily;
  document.getElementById('font-size').value = fontSize;
}

// 保存设置
function saveSettings() {
  bellEnabled = document.getElementById('bell-enabled').checked;
  notifierEnabled = document.getElementById('notifier-enabled').checked;
  notifierKeywords = document.getElementById('notifier-keywords').value.split(',').filter(k => k.trim());
  fontFamily = document.getElementById('font-family').value;
  fontSize = parseInt(document.getElementById('font-size').value) || 14;

  // 如果启用了通知，请求通知权限
  if (notifierEnabled && 'Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  // 保存到localStorage
  const settings = {
    bellEnabled,
    notifierEnabled,
    notifierKeywords,
    fontFamily,
    fontSize
  };

  localStorage.setItem('chatSettings', JSON.stringify(settings));

  applySettings();

  // 显示保存成功的模态框
  const saveSuccessModal = document.createElement('div');
  saveSuccessModal.className = 'modal active';
  saveSuccessModal.innerHTML = `
    <div class="modal-content" style="max-width: 300px;">
      <h3 style="text-align: center; margin-bottom: 20px;">设置已保存</h3>
      <p style="text-align: center; margin-bottom: 30px;">设置已成功保存并应用。</p>
      <button class="main-btn" style="background-color: #4285F4; width: 100%; padding: 10px;">好的</button>
    </div>
  `;
  document.body.appendChild(saveSuccessModal);

  // 点击"好的"按钮关闭所有模态框
  const okButton = saveSuccessModal.querySelector('button');
  okButton.addEventListener('click', () => {
    saveSuccessModal.remove();
    settingsModal.classList.remove('active');
  });
}

// 应用设置
function applySettings() {
  // 应用字体设置
  document.body.style.fontFamily = fontFamily;
  document.body.style.fontSize = `${fontSize}px`;
  // 应用通知设置
  if (notifierEnabled) {
    window.api.onReceiveMessage((message) => {
      const lowerMsg = message.toLowerCase();
      if (notifierKeywords.some(keyword => lowerMsg.includes(keyword.toLowerCase()))) {
        new Notification('消息通知', { body: message });
      }
      if (bellEnabled) {
        try {
          const audio = new Audio('notification.mp3');
          audio.play();
        } catch (e) {
          console.error('播放通知声音失败:', e);
        }
      }
    });
  }
}

document.getElementById('system-color').addEventListener('input', () => updateColor('system'));
document.getElementById('broadcast-color').addEventListener('input', () => updateColor('broadcast'));
document.getElementById('hint-color').addEventListener('input', () => updateColor('hint'));