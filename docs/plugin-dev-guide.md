# Touchfish UI Remake 插件开发指南

## 概述
Touchfish UI Remake的插件系统支持两种类型的插件：
1. 主题插件（theme）：用于自定义应用界面样式
2. 功能插件包（pack）：用于扩展应用功能

## 插件结构
每个插件必须包含以下文件：

### 基本文件
- `plugin.json`：插件配置文件（必需）
- `theme.css`：样式文件（可选）
- `script.js`：功能脚本（仅功能插件必需）

### plugin.json 结构
```json
{
  "id": "插件唯一标识符",
  "name": "插件显示名称", 
  "author": "插件作者",
  "version": "插件版本号",
  "desc": "插件功能描述",
  "type": "theme|pack",
  "minAppVersion": "最低应用版本要求",
  "permissions": ["api权限列表"],
  "main": "script.js文件名（仅pack类型）",
  "style": "theme.css文件名",
  "dependencies": ["依赖插件ID数组"],
  "screenshots": ["截图URL数组"],
  "repository": "插件源码仓库地址"
}
```

## 权限列表
插件可以请求以下权限：

### 聊天相关权限
- `chat:send`：发送消息到聊天窗口
- `chat:receive`：接收聊天消息

### UI相关权限
- `ui:menu`：添加菜单项
- `ui:command`：注册自定义命令

### 存储相关权限
- `storage:read`：读取插件数据
- `storage:write`：写入插件数据

### 主题相关权限
- `theme:style`：修改应用样式

## API 参考

### 插件生命周期
```javascript
// 插件初始化（在script.js中）
window.addEventListener('DOMContentLoaded', () => {
  // 插件初始化代码
});
```

### 聊天相关API
```javascript
// 发送消息
window.pluginAPI.chat.sendMessage('Hello from plugin!');

// 接收消息
window.pluginAPI.chat.onMessage((message) => {
  console.log('收到消息:', message);
});
```

### UI相关API
```javascript
// 添加菜单项
window.pluginAPI.ui.addMenuItem({
  label: '菜单项名称',
  action: () => {
    // 点击处理代码
  }
});

// 注册命令
window.pluginAPI.ui.registerCommand('myCommand', (args) => {
  // 命令处理代码
});
```

### 存储相关API
```javascript
// 保存数据
await window.pluginAPI.storage.setData('key', 'value');

// 读取数据
const value = await window.pluginAPI.storage.getData('key');
```

### 主题相关API
```javascript
// 应用样式
window.pluginAPI.theme.applyStyle(`
  .my-custom-style {
    color: red;
  }
`);

// 移除样式
window.pluginAPI.theme.removeStyle();
```

## 插件开发最佳实践

### 1. 性能优化
- 避免在插件中进行大量DOM操作
- 使用事件委托处理多个元素的事件
- 合理使用异步操作，避免阻塞主线程

### 2. 安全性考虑
- 仅请求必要的权限
- 验证所有用户输入
- 避免使用eval()和innerHTML
- 使用安全的API进行DOM操作

### 3. 兼容性
- 测试不同版本的应用
- 优雅降级处理不支持的特性
- 检查API可用性

### 4. 错误处理
- 使用try-catch捕获可能的错误
- 提供清晰的错误信息
- 实现错误恢复机制

### 5. 维护性
- 使用清晰的代码结构
- 添加适当的注释
- 遵循命名规范
- 版本号遵循语义化版本规范

## 调试技巧

### 1. 开发模式
- 在开发时将插件直接放在`plugins`目录下
- 使用Chrome DevTools调试

### 2. 日志记录
```javascript
// 在插件中使用console.log进行调试
console.log('[MyPlugin]', 'Debug message');
```

### 3. 错误追踪
```javascript
window.onerror = function(message, source, lineno, colno, error) {
  console.error('[MyPlugin] Error:', {message, source, lineno, colno, error});
};
```

## 插件打包与发布

### 1. 打包步骤
1. 确保所有必需文件存在
2. 验证plugin.json配置
3. 检查权限列表
4. 压缩CSS和JS文件（可选）
5. 将文件打包为zip格式

### 2. 测试清单
- [ ] 在干净环境中测试安装
- [ ] 验证所有功能正常工作
- [ ] 检查是否存在内存泄漏
- [ ] 测试启用/禁用功能
- [ ] 验证错误处理机制
- [ ] 检查与其他插件的兼容性

### 3. 发布注意事项
- 提供详细的使用说明
- 列出所有功能特性
- 说明版本兼容性要求
- 提供示例代码或截图
- 标注已知问题或限制

## 示例插件

### 1. 主题插件示例
```json
// plugin.json
{
  "id": "dark-theme",
  "name": "深色主题",
  "version": "1.0.0",
  "author": "示例作者",
  "desc": "一个简单的深色主题",
  "type": "theme",
  "minAppVersion": "1.0.0",
  "permissions": ["theme:style"],
  "style": "theme.css"
}
```

```css
/* theme.css */
body {
  background-color: #1e1e1e;
  color: #d4d4d4;
}

.message-item {
  background-color: #2d2d2d;
  border-color: #505050;
}
```

### 2. 功能插件示例
```json
// plugin.json
{
  "id": "emoji-picker",
  "name": "表情选择器",
  "version": "1.0.0",
  "author": "示例作者",
  "desc": "添加表情选择功能",
  "type": "pack",
  "minAppVersion": "1.0.0",
  "permissions": ["ui:menu", "chat:send"],
  "main": "script.js",
  "style": "style.css"
}
```

```javascript
// script.js
(function() {
  // 创建表情选择器
  function createEmojiPicker() {
    const button = document.createElement('button');
    button.textContent = '😀';
    button.onclick = () => {
      // 显示表情选择界面
    };
    
    document.querySelector('.chat-footer')
      .insertBefore(button, document.querySelector('#send-btn'));
  }

  // 初始化插件
  window.addEventListener('DOMContentLoaded', createEmojiPicker);
})();
```

## 常见问题

### 1. 插件加载失败
- 检查plugin.json格式是否正确
- 验证文件路径是否正确
- 确认权限配置是否正确

### 2. API调用错误
- 检查API是否可用
- 确认是否有必要的权限
- 查看控制台错误信息

### 3. 样式冲突
- 使用特定的CSS选择器
- 检查样式优先级
- 避免使用!important

### 4. 性能问题
- 减少DOM操作
- 优化事件监听
- 使用防抖和节流

## 支持与帮助

如果遇到问题或需要帮助，可以：
1. 查看控制台错误信息
2. 检查插件文档
3. 提交Issue到项目仓库
4. 联系插件作者

## 更新日志

### v1.0.0
- 初始版本发布
- 支持主题和功能插件
- 提供基本API和权限系统