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

const pinWindowBtn = document.getElementById('pin-window');

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
let fontSize = 16;

let systemColor = '#b9ebffff';
let broadcastColor = '#9fe69fff';
let hintColor = '#74cae7ff';
let currentUsername = null;

// 记录最近渲染的一条消息，用于将短时间内同一发送者的多条片段合并为一个消息块
let lastRenderedMessage = {
  sender: null,
  element: null,
  time: 0,
  type: null
};

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

// 修改 displayMessage 函数，接收 sender 和 content
function displayMessage(content, type = 'regular', sender = null) {
  if (!content || typeof content !== 'string') return;

  // 过滤文件传输相关的JSON消息
  try {
    const parsedMsg = JSON.parse(content);
    if (parsedMsg.type === 'FILE_START' || parsedMsg.type === 'FILE_DATA' || parsedMsg.type === 'FILE_END') {
      return; // 不显示文件传输相关内容
    }
  } catch (e) {
    // 不是JSON，继续处理
  }

  const now = new Date();
  const timestamp = `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
  const timestampHtml = `<span class="timestamp">${timestamp}</span>`;

  const messageEl = document.createElement('div');
  messageEl.className = `message-item ${type}`;

  const isAtBottom = messagesDiv.scrollHeight - messagesDiv.scrollTop <= messagesDiv.clientHeight + 5;

  try {
    if (type === 'regular' || type === 'self') { // 包含 'self' 类型
      // 处理普通消息和自己发送的消息
      const actualSender = sender || currentUsername || "通知"; // 如果是自己发的，sender 可能为空，用 currentUsername
      const isSelfMessage = actualSender === currentUsername;

      // 对内容进行预处理，确保换行符被正确处理（但保留Markdown格式）
      // 注意：这里不替换 <br>，因为 markdown-it 会处理换行
      const processedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

      window.api.markdownit(processedContent).then(rendered => {
        if (isSelfMessage) {
          // 自己的消息使用 'self' 样式
          messageEl.innerHTML = `${timestampHtml} <strong class="sender self">${actualSender}:</strong> <span class="msg-text">${rendered}</span>`;
        } else {
          // 其他人的消息使用 'regular' 样式
          messageEl.innerHTML = `${timestampHtml} <strong class="sender">${actualSender}:</strong> <span class="msg-text">${rendered}</span>`;
        }
        messagesDiv.appendChild(messageEl);
        if (isAtBottom) messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }).catch(error => {
        // 如果 markdown 渲染失败，使用 <br> 替换换行符并转义HTML
        console.error('Markdown渲染失败:', error);
        const textWithLineBreaks = escapeHtml(processedContent).replace(/\n/g, '<br>');
        if (isSelfMessage) {
          messageEl.innerHTML = `${timestampHtml} <strong class="sender self">${actualSender}:</strong> <span class="msg-text">${textWithLineBreaks}</span>`;
        } else {
          messageEl.innerHTML = `${timestampHtml} <strong class="sender">${actualSender}:</strong> <span class="msg-text">${textWithLineBreaks}</span>`;
        }
        messagesDiv.appendChild(messageEl);
        if (isAtBottom) messagesDiv.scrollTop = messagesDiv.scrollHeight;
      });

    } else {
      // 处理系统消息、广播消息等（保持原有逻辑）
      const colorMap = { 'system': systemColor, 'broadcast': broadcastColor, 'hint': hintColor };
      const prefixMap = { 'system': '[系统提示]', 'broadcast': '[房主广播]', 'hint': '[房主提示]' };
      const color = colorMap[type] || '#333333';
      const prefix = prefixMap[type] || '';

      let displayedContent = content;
      if (prefix && content.startsWith(prefix)) {
        const contentWithoutPrefix = content.substring(prefix.length).trim();
        displayedContent = `<span style="color:${color}; font-weight: bold;">${prefix}</span> ${escapeHtml(contentWithoutPrefix)}`;
      } else {
        displayedContent = `<span style="color:${color};">${escapeHtml(content)}</span>`;
      }

      messageEl.innerHTML = `${timestampHtml} ${displayedContent}`;
      messagesDiv.appendChild(messageEl);
      // 非regular消息不参与合并，清除 lastRenderedMessage
      lastRenderedMessage = { sender: null, element: null, time: 0, type: null };
      if (isAtBottom) messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  } catch (error) {
    console.error('消息显示错误:', error);
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
  // 不是字符串消息直接返回
  if (typeof message !== 'string') return;

  // 检查消息格式: "用户名: 内容" (冒号后必须有一个空格)
  const match = message.match(/^([^:]+):\s+([\s\S]*)$/); // 修改正则表达式，要求冒号后至少一个空格
  if (!match) {
    // 如果不符合 "用户名: 内容" 格式（冒号后无空格或无冒号），直接显示原消息作为系统消息
    displayMessage(message, 'system'); // 或者可以显示为 'regular'，取决于期望行为
    return;
  }

  const [, sender, content] = match;

  // 判断是否是自己发送的消息
  if (sender === currentUsername) {
    // 自己发送的消息，只在本地显示，不再通过 onReceiveMessage 传来，所以理论上不会走到这里
    // 但为了逻辑完整，如果传来，也显示
    displayMessage(content, 'self', sender); // 传递 sender 和类型 'self'
    return;
  }

  // 非自己发送的消息，使用普通样式
  displayMessage(content, 'regular', sender); // 传递 sender

  // 处理通知
  if (notifierEnabled || bellEnabled) {
    const hasKeywords = notifierKeywords.length === 0 ||
      notifierKeywords.some(keyword => content.toLowerCase().includes(keyword.toLowerCase()));

    if (hasKeywords) {
      // 发送系统通知
      if (notifierEnabled && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Touchfish', {
          body: `${sender}: ${content}`,
          icon: 'tchui.ico',
          tag: 'message' // 使用tag避免重复通知
        });
      }

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
  versionInfo.innerText = `本程序版本: ${currentVersion}\n适配的官方服务器（保证稳定性）版本: v2.0.0\n官方 Python Client 最新版本: ${newestVersion}`;
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

function processAndSendMessage(rawMessage) {
  if (!rawMessage || !currentUsername) return;

  // 准备发送的完整消息（冒号后跟一个空格）
  const fullMessage = `${currentUsername}: ${rawMessage}`; // 确保冒号后有空格

  // 发送完整消息
  window.api.sendMessage(fullMessage);
  mdEditor.content = ""; // 发送后清空编辑器

  // 本地显示自己发送的消息 (可选，如果服务器不回显)
  // displayMessage(rawMessage, 'self', currentUsername);
}

sendBtn.addEventListener('click', () => {
  const message = mdEditor.content.trim();
  if (!message) return;
  processAndSendMessage(message);
});

messageInput.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    const message = mdEditor.content.trim();
    if (!message) return;
    processAndSendMessage(message);
    e.preventDefault();
  }
});

// ---- 模态框功能 ----

// 置顶按钮事件处理
pinWindowBtn.addEventListener('click', async () => {
  const isPinned = await window.api.toggleWindowPin();
  if (isPinned) {
    pinWindowBtn.classList.add('pinned');
  } else {
    pinWindowBtn.classList.remove('pinned');
  }
});

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
    if (hasUpdate) { // 修正逻辑：有更新时显示新版本信息
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

      // 立即标记为正在发送，防止自收自发
      isSendingFile = true;
      showFileProgress('准备发送文件...');

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
  // displayMessage(`[系统提示] 文件发送进度: ${progress.toFixed(1)}%`, 'system'); 有进度条了都不需要这个提示了
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
let lastFileReceiveTime = 0;
window.api.onFileReceiveRequest((fileInfo) => {
  // 防止重复接收请求
  const now = Date.now();
  if (now - lastFileReceiveTime < 1000) {
    window.api.rejectFile();
    return;
  }
  lastFileReceiveTime = now;

  // 如果正在发送或接收其他文件，拒绝新的文件
  if (isSendingFile || isReceivingFile) {
    window.api.rejectFile();
    return;
  }

  // 检查是否是自己发送的文件
  if (fileInfo.sender === currentUsername) {
    window.api.rejectFile();
    return;
  }

  const size = fileInfo.size;
  const sizeStr = size > 1024 * 1024
    ? `${(size / 1024 / 1024).toFixed(2)}MB`
    : `${(size / 1024).toFixed(2)}KB`;

  const shouldReceive = confirm(
    `是否接收文件：${fileInfo.name}（来自：${fileInfo.sender}）\n大小：${sizeStr}`
  );

  if (shouldReceive) {
    showFileProgress('接收文件中...');
    isReceivingFile = true;
    displayMessage(`[系统提示] 开始接收来自 ${fileInfo.sender} 的文件：${fileInfo.name}（${sizeStr}）`, 'system');
  } else {
    // 拒绝文件，不需要设置isReceivingFile
    window.api.rejectFile();
    displayMessage(`[系统提示] 已拒绝接收来自 ${fileInfo.sender} 的文件：${fileInfo.name}`, 'system');
  }
});

window.api.onFileReceiveProgress((progress) => {
  if (!isReceivingFile) return;
  updateFileProgress(`接收进度: ${progress.toFixed(1)}%`, progress);
  // displayMessage(`[系统提示] 文件接收进度: ${progress.toFixed(1)}%`, 'system');  有进度条了都不需要这个提示了
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


document.getElementById('system-color').addEventListener('input', () => updateColor('system'));
document.getElementById('broadcast-color').addEventListener('input', () => updateColor('broadcast'));
document.getElementById('hint-color').addEventListener('input', () => updateColor('hint'));