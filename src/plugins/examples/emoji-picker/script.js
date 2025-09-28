// emoji-picker plugin script
(function() {
  const emojiList = [
    { emoji: '😀', name: 'grinning' },
    { emoji: '😃', name: 'smiley' },
    { emoji: '😄', name: 'smile' },
    { emoji: '😁', name: 'grin' },
    { emoji: '😆', name: 'laughing' },
    { emoji: '😅', name: 'sweat_smile' },
    { emoji: '😂', name: 'joy' },
    { emoji: '🤣', name: 'rolling_on_the_floor_laughing' },
    // 添加更多表情...
  ];

  // 创建表情选择器UI
  function createEmojiPicker() {
    const container = document.createElement('div');
    container.className = 'emoji-picker';
    container.style.display = 'none';

    emojiList.forEach(item => {
      const emojiButton = document.createElement('button');
      emojiButton.className = 'emoji-button';
      emojiButton.textContent = item.emoji;
      emojiButton.title = item.name;
      emojiButton.onclick = () => {
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
          const cursorPos = messageInput.selectionStart;
          const textBefore = messageInput.value.substring(0, cursorPos);
          const textAfter = messageInput.value.substring(cursorPos);
          messageInput.value = textBefore + item.emoji + textAfter;
          messageInput.setSelectionRange(cursorPos + item.emoji.length, cursorPos + item.emoji.length);
          messageInput.focus();
        }
      };
      container.appendChild(emojiButton);
    });

    document.body.appendChild(container);
    return container;
  }

  // 创建表情按钮
  function createEmojiButton() {
    const chatFooter = document.querySelector('.chat-footer');
    if (!chatFooter) return;

    const button = document.createElement('button');
    button.className = 'emoji-trigger-button';
    button.innerHTML = '😀';
    button.title = '插入表情';

    const picker = createEmojiPicker();
    let isVisible = false;

    button.onclick = (event) => {
      event.stopPropagation();
      isVisible = !isVisible;
      
      if (isVisible) {
        const buttonRect = button.getBoundingClientRect();
        picker.style.display = 'flex';
        picker.style.position = 'absolute';
        picker.style.bottom = (window.innerHeight - buttonRect.top + 5) + 'px';
        picker.style.left = buttonRect.left + 'px';
      } else {
        picker.style.display = 'none';
      }
    };

    // 点击其他地方时关闭表情选择器
    document.addEventListener('click', (event) => {
      if (!picker.contains(event.target) && event.target !== button) {
        picker.style.display = 'none';
        isVisible = false;
      }
    });

    // 将按钮插入到发送按钮之前
    const sendButton = chatFooter.querySelector('#send-btn');
    if (sendButton) {
      chatFooter.insertBefore(button, sendButton);
    }
  }

  // 当DOM加载完成后初始化插件
  window.addEventListener('DOMContentLoaded', () => {
    createEmojiButton();
  });
})();