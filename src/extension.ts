// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    // 注册自定义音频编辑器
    context.subscriptions.push(AudioEditorProvider.register(context));
}

class AudioEditorProvider implements vscode.CustomReadonlyEditorProvider {

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        return vscode.window.registerCustomEditorProvider(
            'sonicscope.audioViewer',
            new AudioEditorProvider(context),
            {
                // 支持从 Webview 重新加载
                webviewOptions: {
                    retainContextWhenHidden: true,
                },
            }
        );
    }

    constructor(private readonly context: vscode.ExtensionContext) { }

    public openCustomDocument(uri: vscode.Uri): vscode.CustomDocument {
        // 对于只读编辑器，我们只需要 URI 即可
        return { uri, dispose: () => { /* no-op */ } };
    }

    public async resolveCustomEditor(
        document: vscode.CustomDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        // 设置 Webview 的 HTML 内容
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this.context.extensionUri,
                vscode.Uri.joinPath(document.uri, '..')
            ]
        };
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

        try {
            const audioUri = webviewPanel.webview.asWebviewUri(document.uri);
            // 获取文件大小信息来决定加载策略
            const fileStat = await vscode.workspace.fs.stat(document.uri);
            const fileSizeBytes = fileStat.size;
            
            webviewPanel.webview.postMessage({
                command: 'loadAudio',
                uri: audioUri.toString(),
                fileSize: fileSizeBytes,
            });
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
            console.error(e);
            vscode.window.showErrorMessage(`Error loading audio file: ${errorMessage}`);
            webviewPanel.webview.postMessage({
                command: 'showError',
                message: `Could not load audio file. ${errorMessage}`
            });
        }
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        const wavesurferUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.context.extensionUri, 'node_modules', 'wavesurfer.js', 'dist', 'wavesurfer.min.js'));

        const spectrogramPluginUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.context.extensionUri, 'node_modules', 'wavesurfer.js', 'dist', 'plugins', 'spectrogram.min.js'));

        const timelinePluginUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.context.extensionUri, 'node_modules', 'wavesurfer.js', 'dist', 'plugins', 'timeline.min.js'));

        return /* html */`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>SonicScope</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body, html {
                        width: 100%;
                        height: 100%;
                        overflow: hidden;
                        background-color: #1a1a1a;
                        color: #e8e8e8;
                        font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, 'Noto Sans', sans-serif;
                        font-weight: 400;
                        line-height: 1.5;
                    }
                    
                    .container {
                        display: flex;
                        flex-direction: column;
                        height: 100%;
                        padding: 24px;
                        gap: 16px;
                    }
                    
                    .loading {
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        font-size: 14px;
                        font-weight: 300;
                        color: #a0a0a0;
                        letter-spacing: 0.5px;
                        text-align: center;
                    }
                    
                    .progress-bar {
                        width: 200px;
                        height: 4px;
                        background-color: #2a2a2a;
                        border-radius: 2px;
                        margin: 16px auto 8px;
                        overflow: hidden;
                    }
                    
                    .progress-fill {
                        height: 100%;
                        background-color: #4a9eff;
                        width: 0%;
                        transition: width 0.2s ease;
                    }
                    
                    .performance-controls {
                        position: fixed;
                        top: 16px;
                        right: 16px;
                        background: rgba(26, 26, 26, 0.9);
                        padding: 12px;
                        border-radius: 8px;
                        border: 1px solid #2a2a2a;
                        font-size: 11px;
                        color: #a0a0a0;
                        z-index: 100;
                    }
                    
                    .performance-controls label {
                        display: block;
                        margin-bottom: 8px;
                    }
                    
                    .performance-controls select {
                        background: #161616;
                        border: 1px solid #2a2a2a;
                        color: #e8e8e8;
                        padding: 4px;
                        border-radius: 4px;
                        width: 120px;
                    }
                    
                    .timeline-container {
                        height: 40px;
                        position: relative;
                        border-bottom: 1px solid #2a2a2a;
                        margin-bottom: 8px;
                    }
                    
                    .waveform-container {
                        height: 180px;
                        position: relative;
                        background-color: #161616;
                        border-radius: 8px;
                        overflow: hidden;
                        border: 1px solid #2a2a2a;
                    }
                    
                    .spectrogram-container {
                        height: 280px;
                        position: relative;
                        background-color: #161616;
                        border-radius: 8px;
                        overflow: hidden;
                        border: 1px solid #2a2a2a;
                        margin-top: 8px;
                    }
                    
                    .cursor-line {
                        position: absolute;
                        top: 0;
                        bottom: 0;
                        width: 1px;
                        background-color: #ffffff;
                        z-index: 10;
                        pointer-events: none;
                        opacity: 0.9;
                        transform: translateX(0);
                    }
                    
                    #timeline {
                        width: 100%;
                        height: 100%;
                    }
                    
                    #waveform {
                        width: 100%;
                        height: 100%;
                        cursor: pointer;
                    }
                    
                    #spectrogram {
                        width: 100%;
                        height: 100%;
                        cursor: pointer;
                    }
                    
                    .label {
                        font-size: 11px;
                        font-weight: 500;
                        color: #707070;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        margin-bottom: 8px;
                        padding-left: 4px;
                    }
                    
                    .waveform-section {
                        flex: 0 0 auto;
                    }
                    
                    .spectrogram-section {
                        flex: 1;
                    }
                    
                    .disabled {
                        opacity: 0.5;
                        pointer-events: none;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="loading" id="loading">
                        Loading audio file...
                        <div class="progress-bar">
                            <div class="progress-fill" id="progress-fill"></div>
                        </div>
                        <div id="loading-details">Initializing...</div>
                    </div>
                    
                    <div class="performance-controls" id="performance-controls" style="display: none;">
                        <label>
                            质量设置:
                            <select id="quality-select">
                                <option value="auto">自动</option>
                                <option value="low">低 (快速)</option>
                                <option value="medium">中等</option>
                                <option value="high">高 (较慢)</option>
                            </select>
                        </label>
                        <label>
                            <input type="checkbox" id="spectrogram-toggle" checked> 频谱图
                        </label>
                    </div>
                    
                    <div class="timeline-container">
                        <div class="info-bar" style="font-size:11px;color:#a0a0a0;display:flex;gap:16px;padding:4px;position:absolute;top:0;left:0;z-index:5;">
                            <span id="info-rms">RMS: --</span>
                            <span id="info-samplerate">Sample Rate: --</span>
                            <span id="info-bitdepth">Bit Depth: --</span>
                            <span id="info-duration">Duration: --</span>
                            <span id="info-filesize">Size: --</span>
                        </div>
                        <div id="timeline"></div>
                    </div>
                    
                    <div class="waveform-section">
                        <div class="label">Waveform</div>
                        <div class="waveform-container">
                            <div id="waveform"></div>
                            <div class="cursor-line" id="waveform-cursor"></div>
                        </div>
                    </div>
                    
                    <div class="spectrogram-section">
                        <div class="label">Spectrogram</div>
                        <div class="spectrogram-container">
                            <div id="spectrogram"></div>
                            <div class="cursor-line" id="spectrogram-cursor"></div>
                        </div>
                    </div>
                </div>

                <script src="${wavesurferUri}"></script>
                <script src="${spectrogramPluginUri}"></script>
                <script src="${timelinePluginUri}"></script>
                <script>
                    (function() {
                        const loading = document.getElementById('loading');
                        const loadingDetails = document.getElementById('loading-details');
                        const progressFill = document.getElementById('progress-fill');
                        const performanceControls = document.getElementById('performance-controls');
                        const qualitySelect = document.getElementById('quality-select');
                        const spectrogramToggle = document.getElementById('spectrogram-toggle');
                        const waveformEl = document.getElementById('waveform');
                        const spectrogramEl = document.getElementById('spectrogram');
                        const timelineEl = document.getElementById('timeline');
                        const waveformCursor = document.getElementById('waveform-cursor');
                        const spectrogramCursor = document.getElementById('spectrogram-cursor');

                        // Info elements
                        const infoRms = document.getElementById('info-rms');
                        const infoSampleRate = document.getElementById('info-samplerate');
                        const infoBitDepth = document.getElementById('info-bitdepth');
                        const infoDuration = document.getElementById('info-duration');
                        const infoFileSize = document.getElementById('info-filesize');
                        
                        // Hide elements initially
                        document.querySelector('.container').style.display = 'none';

                        // Clean, minimal color scheme
                        const waveColor = '#4a9eff';
                        const progressColor = '#2d5aa0';
                        const cursorColor = 'transparent'; // We use custom cursor

                        let wavesurfer;
                        let resizeObserver;
                        let currentFileSize = 0;
                        let qualitySettings = {
                            auto: null, // Will be determined based on file size
                            low: { fftSamples: 512, frequencyMax: 4000, barWidth: 3 },
                            medium: { fftSamples: 1024, frequencyMax: 6000, barWidth: 2 },
                            high: { fftSamples: 2048, frequencyMax: 8000, barWidth: 2 }
                        };
                        
                        // Performance settings
                        function getOptimalSettings(fileSize) {
                            const MB = 1024 * 1024;
                            if (fileSize < 5 * MB) return qualitySettings.high;
                            if (fileSize < 20 * MB) return qualitySettings.medium;
                            return qualitySettings.low;
                        }
                        
                        function formatFileSize(bytes) {
                            const units = ['B', 'KB', 'MB', 'GB'];
                            let size = bytes;
                            let unitIndex = 0;
                            while (size >= 1024 && unitIndex < units.length - 1) {
                                size /= 1024;
                                unitIndex++;
                            }
                            return size.toFixed(1) + ' ' + units[unitIndex];
                        }
                        
                        function updateProgress(progress, message) {
                            progressFill.style.width = progress + '%';
                            loadingDetails.textContent = message;
                        }
                        
                        function createWaveSurfer(settings, enableSpectrogram = true) {
                            const plugins = [
                                WaveSurfer.Timeline.create({
                                    container: '#timeline',
                                    height: 40,
                                    style: {
                                        fontSize: '10px',
                                        color: '#707070',
                                    }
                                })
                            ];
                            
                            if (enableSpectrogram) {
                                plugins.push(
                                    WaveSurfer.Spectrogram.create({
                                        container: '#spectrogram',
                                        labels: true,
                                        colormap: 'viridis',
                                        height: 280,
                                        frequencyMin: 0,
                                        frequencyMax: settings.frequencyMax,
                                        fftSamples: settings.fftSamples,
                                    })
                                );
                            }
                            
                            return WaveSurfer.create({
                                container: '#waveform',
                                waveColor: waveColor,
                                progressColor: progressColor,
                                cursorColor: cursorColor,
                                barWidth: settings.barWidth,
                                barGap: 1,
                                barRadius: 1,
                                height: 180,
                                interact: false,
                                normalize: true,
                                sampleRate: 44100,
                                plugins: plugins
                            });
                        }
                        
                        function initializeWaveSurfer(audioUrl, fileSize) {
                            currentFileSize = fileSize;
                            const selectedQuality = qualitySelect.value;
                            const settings = selectedQuality === 'auto' 
                                ? getOptimalSettings(fileSize) 
                                : qualitySettings[selectedQuality];
                            const enableSpectrogram = spectrogramToggle.checked;
                            
                            updateProgress(10, '初始化可视化器...');
                            
                            try {
                                if (wavesurfer) {
                                    wavesurfer.destroy();
                                }
                                
                                wavesurfer = createWaveSurfer(settings, enableSpectrogram);
                                
                                // Update spectrogram container visibility
                                document.querySelector('.spectrogram-section').style.display = 
                                    enableSpectrogram ? 'block' : 'none';
                                
                                setupEventHandlers();
                                loadAudioFile(audioUrl);
                                
                            } catch (e) {
                                console.error('WaveSurfer initialization error:', e);
                                loading.textContent = 'Error initializing audio visualizer.';
                                loading.style.color = '#ff6b6b';
                                return;
                            }
                        }
                        
                        function loadAudioFile(audioUrl) {
                            updateProgress(20, '加载音频文件...');
                            
                            const loadStartTime = performance.now();
                            
                            wavesurfer.load(audioUrl).catch(e => {
                                console.error('Error loading audio from url', e);
                                loading.textContent = 'Failed to load audio file';
                                loading.style.color = '#ff6b6b';
                            });
                        }
                        
                        function setupEventHandlers() {
                            wavesurfer.on('loading', (progress) => {
                                updateProgress(20 + progress * 0.3, \`加载中... \${Math.round(progress)}%\`);
                            });
                            
                            wavesurfer.on('decode', (progress) => {
                                updateProgress(50 + progress * 0.3, \`解码中... \${Math.round(progress)}%\`);
                            });
                            
                            wavesurfer.on('ready', () => {
                                updateProgress(90, '计算音频信息...');
                                
                                // 延迟计算统计信息以避免阻塞UI
                                setTimeout(() => {
                                    calculateAudioStats();
                                    finalizeSetup();
                                }, 50);
                            });

                            wavesurfer.on('audioprocess', () => {
                                if (wavesurfer.getDuration() > 0) {
                                    const progress = wavesurfer.getCurrentTime() / wavesurfer.getDuration();
                                    updateCursors(progress);
                                }
                            });

                            wavesurfer.on('seeking', (progress) => {
                                updateCursors(progress);
                            });

                            wavesurfer.on('error', (err) => {
                                console.error('WaveSurfer error:', err);
                                loading.textContent = 'Error: ' + (err.message || err);
                                loading.style.color = '#ff6b6b';
                            });
                        }
                        
                        function calculateAudioStats() {
                            const audioBuffer = wavesurfer.getDecodedData();
                            if (audioBuffer) {
                                // 对于大文件，采样计算RMS以提高性能
                                const channelData = audioBuffer.getChannelData(0);
                                const sampleStep = Math.max(1, Math.floor(channelData.length / 100000)); // 最多采样10万个点
                                let sumSq = 0;
                                let sampleCount = 0;
                                
                                for (let i = 0; i < channelData.length; i += sampleStep) {
                                    const v = channelData[i];
                                    sumSq += v * v;
                                    sampleCount++;
                                }
                                
                                const rmsVal = Math.sqrt(sumSq / sampleCount);
                                const rmsDbFs = rmsVal > 0 ? 20 * Math.log10(rmsVal) : -Infinity;
                                const rmsDbFsStr = rmsDbFs === -Infinity ? '-∞' : rmsDbFs.toFixed(1);
                                infoRms.textContent = 'RMS: ' + rmsDbFsStr + ' dB FS';

                                // Sample rate & duration
                                infoSampleRate.textContent = 'Sample Rate: ' + audioBuffer.sampleRate + ' Hz';
                                infoDuration.textContent = 'Duration: ' + wavesurfer.getDuration().toFixed(2) + ' s';
                                infoFileSize.textContent = 'Size: ' + formatFileSize(currentFileSize);

                                // Bit depth – Web Audio API decodes to 32-bit float
                                infoBitDepth.textContent = 'Bit Depth: 32-bit float';
                            }
                        }
                        
                        function finalizeSetup() {
                            updateProgress(95, '完成设置...');
                            
                            // Update timeline with adaptive intervals
                            const duration = wavesurfer.getDuration();
                            const intervals = calculateTimelineIntervals(duration);
                            
                            // Destroy existing timeline and recreate with new intervals
                            const timelinePlugin = wavesurfer.getActivePlugins().find(p => p.constructor.name === 'Timeline');
                            if (timelinePlugin) {
                                timelinePlugin.destroy();
                            }
                            
                            const newTimelinePlugin = WaveSurfer.Timeline.create({
                                container: '#timeline',
                                height: 40,
                                timeInterval: intervals.timeInterval,
                                primaryLabelInterval: intervals.primaryLabelInterval,
                                secondaryLabelInterval: intervals.secondaryLabelInterval,
                                style: {
                                    fontSize: '10px',
                                    color: '#707070',
                                }
                            });
                            
                            wavesurfer.registerPlugin(newTimelinePlugin);
                            
                            updateProgress(100, '完成!');
                            
                            setTimeout(() => {
                                loading.style.display = 'none';
                                document.querySelector('.container').style.display = 'flex';
                                performanceControls.style.display = 'block';
                                
                                // Initial zoom and cursor position
                                adjustZoom();
                                updateCursors(0);
                            }, 200);
                        }

                        // Function to calculate adaptive timeline intervals
                        function calculateTimelineIntervals(duration) {
                            const containerWidth = timelineEl.offsetWidth || 800;
                            const targetPixelsPerTick = 80;
                            const maxTicks = Math.floor(containerWidth / targetPixelsPerTick);
                            
                            const standardIntervals = [
                                0.01, 0.02, 0.05, 0.1, 0.2, 0.5,
                                1, 2, 5, 10, 15, 30,
                                60, 120, 300, 600, 900, 1800,
                                3600
                            ];
                            
                            let bestInterval = standardIntervals[0];
                            for (const interval of standardIntervals) {
                                const tickCount = Math.ceil(duration / interval);
                                if (tickCount <= maxTicks) {
                                    bestInterval = interval;
                                    break;
                                }
                            }
                            
                            return {
                                timeInterval: bestInterval,
                                primaryLabelInterval: bestInterval,
                                secondaryLabelInterval: bestInterval * 10
                            };
                        }

                        // Update cursor positions
                        function updateCursors(progress) {
                            if (!waveformEl || !spectrogramEl) return;
                            const waveformWidth = waveformEl.offsetWidth;
                            const spectrogramWidth = spectrogramEl.offsetWidth;
                            
                            const waveformPos = progress * waveformWidth;
                            const spectrogramPos = progress * spectrogramWidth;
                            
                            waveformCursor.style.transform = \`translateX(\${waveformPos}px)\`;
                            spectrogramCursor.style.transform = \`translateX(\${spectrogramPos}px)\`;
                        }

                        // Adjust zoom so that waveform width always matches its container
                        function adjustZoom() {
                            if (!wavesurfer || !waveformEl) return;
                            const duration = wavesurfer.getDuration();
                            if (duration > 0) {
                                const containerWidth = waveformEl.offsetWidth;
                                const pxPerSec = containerWidth / duration;
                                wavesurfer.zoom(pxPerSec);
                            }
                        }

                        // Click handlers for both waveform and spectrogram
                        function handleClick(e, container) {
                            const bbox = container.getBoundingClientRect();
                            const progress = (e.clientX - bbox.left) / bbox.width;
                            wavesurfer.seekTo(progress);
                            updateCursors(progress);
                        }
                        
                        const waveformClickHandler = (e) => handleClick(e, e.currentTarget);
                        const spectrogramClickHandler = (e) => handleClick(e, e.currentTarget);

                        // Debounce function for resizing
                        function debounce(func, delay) {
                            let timeout;
                            return function(...args) {
                                const context = this;
                                clearTimeout(timeout);
                                timeout = setTimeout(() => func.apply(context, args), delay);
                            };
                        }

                        // Responsive redraw
                        const debouncedRedraw = debounce(() => {
                            adjustZoom();
                        }, 100);

                        // Performance controls event handlers
                        qualitySelect.addEventListener('change', () => {
                            if (wavesurfer && currentFileSize > 0) {
                                const currentTime = wavesurfer.getCurrentTime();
                                const audioUrl = wavesurfer.options.url;
                                initializeWaveSurfer(audioUrl, currentFileSize);
                                // Restore playback position after reload
                                wavesurfer.on('ready', () => {
                                    wavesurfer.seekTo(currentTime / wavesurfer.getDuration());
                                }, { once: true });
                            }
                        });
                        
                        spectrogramToggle.addEventListener('change', () => {
                            if (wavesurfer && currentFileSize > 0) {
                                const currentTime = wavesurfer.getCurrentTime();
                                const audioUrl = wavesurfer.options.url;
                                initializeWaveSurfer(audioUrl, currentFileSize);
                                // Restore playback position after reload
                                wavesurfer.on('ready', () => {
                                    wavesurfer.seekTo(currentTime / wavesurfer.getDuration());
                                }, { once: true });
                            }
                        });

                        // Set up resize observer
                        resizeObserver = new ResizeObserver(debouncedRedraw);
                        resizeObserver.observe(document.querySelector('.container'));

                        // Spacebar play/pause
                        const handleKeyDown = (e) => {
                            if (e.code === 'Space') {
                                e.preventDefault();
                                wavesurfer.playPause();
                            }
                        };
                        window.addEventListener('keydown', handleKeyDown);

                        // Handle messages from extension
                        const handleMessage = async (event) => {
                            const message = event.data;
                            switch (message.command) {
                                case 'loadAudio':
                                    const audioUrl = message.uri;
                                    const fileSize = message.fileSize || 0;
                                    infoFileSize.textContent = 'Size: ' + formatFileSize(fileSize);
                                    
                                    // Set automatic quality based on file size
                                    if (fileSize > 0) {
                                        const optimalSettings = getOptimalSettings(fileSize);
                                        if (optimalSettings === qualitySettings.low) {
                                            qualitySelect.value = 'low';
                                        } else if (optimalSettings === qualitySettings.medium) {
                                            qualitySelect.value = 'medium';
                                        } else {
                                            qualitySelect.value = 'high';
                                        }
                                    }
                                    
                                    try {
                                        initializeWaveSurfer(audioUrl, fileSize);
                                    } catch (e) {
                                        console.error('Error loading audio from url', e);
                                        loading.textContent = 'Failed to load audio file';
                                        loading.style.color = '#ff6b6b';
                                    }
                                    break;
                                case 'showError':
                                    loading.textContent = message.message;
                                    loading.style.display = 'block';
                                    loading.style.color = '#ff6b6b';
                                    break;
                            }
                        };
                        window.addEventListener('message', handleMessage);

                        // Event listeners setup function
                        function setupClickHandlers() {
                            waveformEl.addEventListener('click', waveformClickHandler);
                            spectrogramEl.addEventListener('click', spectrogramClickHandler);
                        }

                        // Setup click handlers initially
                        setupClickHandlers();

                        // Cleanup function to be called on unload
                        const cleanup = () => {
                            console.log('Cleaning up webview resources...');
                            if (wavesurfer) {
                                wavesurfer.destroy();
                            }
                            if (resizeObserver) {
                                resizeObserver.disconnect();
                            }
                            window.removeEventListener('keydown', handleKeyDown);
                            window.removeEventListener('message', handleMessage);
                            waveformEl.removeEventListener('click', waveformClickHandler);
                            spectrogramEl.removeEventListener('click', spectrogramClickHandler);
                        };

                        window.addEventListener('unload', cleanup);
                    })();
                </script>
            </body>
            </html>
        `;
    }
}
