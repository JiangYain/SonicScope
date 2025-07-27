# SonicScope

[English](#english) | [中文](#中文)

---

## 中文

**SonicScope** 
一个用于音频波形和频谱可视化的 VS Code 扩展，如果你是一个声学开发者或者开发过程中需要高强度接触音频的开发者，你就可以使用这个IDE插件来避免检查音频状态而切换Aodbe Audition，支持多种音频格式：WAV、MP3、FLAC、OGG，使用WebView承载嵌入式网页视图，使用WaveSurfer.js 7.9.9实时波形和频谱图渲染，针对大文件优化的加载性能（但是大文件依然没有办法和宿主软件对比）点击跳转到指定时间位置，空格键播放/暂停


### 安装使用

### 安装 `.vsix` 插件到 VS Code 的方法

#### 方法一：使用 VS Code 命令面板
1. 打开 VS Code或者其他基于VS Code的IDE
2. 按下快捷键：`Ctrl + Shift + P`（Mac 是 `Cmd + Shift + P`）。
3. 输入 `Install from VSIX`，然后选择 `Extensions: Install from VSIX...`。
4. 浏览并选择你下载的 `sonicscope-0.0.1.vsix` 文件。
5. 等待安装完成，VS Code 会提示你重启插件或重启 VS Code。

---

#### 方法二：使用终端命令
1. 打开终端（或 PowerShell / CMD）。
2. 输入以下命令（假设你已经安装了 `code` 命令）：

   ```bash
   code --install-extension sonicscope-0.0.1.vsix
   ```

   示例：

   ```bash
   code --install-extension C:\Users\you\Downloads\sonicscope-0.0.1.vsix
   ```

> ⚠️ 如果提示找不到 `code` 命令，可以在 VS Code 中按 `Ctrl + Shift + P`，输入  
> `Shell Command: Install 'code' command in PATH` 来安装它。


#### 方法三：从源码构建

```bash
git clone <repository-url>
cd sonicscope
npm install
npm run compile
```
 F5 启动开发模式。


### 项目结构

```
sonicscope/
├── src/
│   ├── extension.ts              # 主扩展入口点
│   ├── audioVisualizer/          # 音频可视化组件（目前为空）
│   └── utilities/                # 工具函数（目前为空）
├── media/                        # 媒体资源
├── dist/                         # 编译输出
├── package.json                  # 包配置和依赖
├── tsconfig.json                 # TypeScript 配置
├── webpack.config.js             # Webpack 打包配置
├── eslint.config.mjs             # ESLint 代码规范配置
└── PERFORMANCE_OPTIMIZATION.md   # 性能优化文档
```

### 一些限制

- Web Audio API 解码所有音频为32位浮点格式
- 频谱图计算受浏览器单线程限制

### 许可证

强制衍生作品以相同协议开源

---

## English

**SonicScope** is a VS Code extension for audio waveform & spectrogram visualisation. If your day job involves opening audio files fifteen times before lunch, this add-on keeps you in the IDE and out of Audition.

Supported formats: WAV, MP3, FLAC, OGG  
Rendering engine: WaveSurfer.js 7.9.9 (running inside a WebView)  
Large-file performance: markedly faster than vanilla decoding, though still no match for a native DAW—physics wins.

### Installation

**Marketplace (recommended)**  
Search “SonicScope” in the Extensions view and click *Install*.

**Offline / CI install**  
```bash
git clone <repository-url>
cd sonicscope
npm install
npm run package        # produces sonicscope-<version>.vsix in the project root
code --install-extension sonicscope-<version>.vsix
```
VS Code will reload the window and the extension is ready.

### Uploading to the Marketplace

1. Install the extension CLI: `npm install -g vsce`.
2. Run `vsce create-publisher <your-name>` and follow the prompts to create a publisher and PAT.
3. Package: `vsce package` (generates the `.vsix`) or publish in one go with `vsce publish`.
4. The validation pipeline takes a few minutes. Ensure your README, icon (128 × 128) and license pass the automated checks—nothing painful, just paperwork.

### Known Limitations

- Web Audio API decodes everything to 32-bit float.
- Spectrogram processing runs on the UI thread; gigantic files (>200 MB) still stutter.
- MP3 duration can be inaccurate (long-standing MP3 quirk).

### License

SonicScope is released under the **GNU General Public License v3.0 or later (GPL-3.0-or-later)**. In plain English: if you distribute a modified version, the source code must remain available under the same terms. Share alike—or pick another hobby.
