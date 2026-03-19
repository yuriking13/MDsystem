/**
 * Main Application Entry Point
 */

// Global application state
window.appState = {
    initialized: false,
    components: {},
    config: {
        autoRefresh: true,
        refreshInterval: 30000,
        maxLogEntries: 1000,
        virtualScrolling: true,
        darkTheme: true
    }
};

// Application initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Monitoring Dashboard...');
    
    try {
        initializeApplication();
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showErrorScreen('Failed to initialize dashboard. Please refresh the page.');
    }
});

function initializeApplication() {
    // Show loading screen
    showLoadingScreen();
    
    // Initialize components in order
    const initPromise = new Promise((resolve, reject) => {
        try {
            // 1. Initialize Chart Manager
            console.log('Initializing Chart Manager...');
            window.chartManager = new ChartManager();
            window.appState.components.chartManager = window.chartManager;
            
            // 2. Initialize Table Manager
            console.log('Initializing Table Manager...');
            window.tableManager = new TableManager();
            window.appState.components.tableManager = window.tableManager;
            
            // 3. Initialize Dashboard Controller
            console.log('Initializing Dashboard Controller...');
            window.dashboardController = new DashboardController();
            window.appState.components.dashboardController = window.dashboardController;
            
            // 4. Initialize WebSocket Client (last, as it depends on others)
            console.log('Initializing WebSocket Client...');
            window.wsClient = new WebSocketClient();
            window.appState.components.wsClient = window.wsClient;
            
            // Set up component cross-references
            setupComponentInteractions();
            
            resolve();
        } catch (error) {
            reject(error);
        }
    });
    
    initPromise.then(() => {
        window.appState.initialized = true;
        hideLoadingScreen();
        showWelcomeMessage();
        
        // Load sample data for development/testing
        if (isDevelopmentMode()) {
            setTimeout(() => {
                loadSampleData();
            }, 2000);
        }
        
        console.log('Dashboard initialization completed successfully');
    }).catch(error => {
        console.error('Initialization failed:', error);
        showErrorScreen('Initialization failed: ' + error.message);
    });
}

function setupComponentInteractions() {
    // Set up event listeners between components
    if (window.wsClient && window.chartManager) {
        window.wsClient.addMessageHandler('system_metrics', (metrics) => {
            window.chartManager.updateMetrics(metrics);
        });
    }
    
    // Add error handling for component failures
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handlePromiseRejection);
}

function showLoadingScreen() {
    const loadingScreen = document.createElement('div');
    loadingScreen.id = 'loading-screen';
    loadingScreen.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <h2>Loading Dashboard...</h2>
            <div class="loading-progress">
                <div class="loading-bar"></div>
            </div>
            <p id="loading-status">Initializing components...</p>
        </div>
    `;
    
    // Add loading styles
    addLoadingStyles();
    
    document.body.appendChild(loadingScreen);
    
    // Animate loading bar
    animateLoadingBar();
}

function animateLoadingBar() {
    const loadingBar = document.querySelector('.loading-bar');
    if (loadingBar) {
        loadingBar.style.width = '0%';
        let progress = 0;
        
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 90) {
                progress = 90;
                clearInterval(interval);
            }
            loadingBar.style.width = progress + '%';
        }, 200);
    }
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        // Complete the loading bar
        const loadingBar = document.querySelector('.loading-bar');
        if (loadingBar) {
            loadingBar.style.width = '100%';
        }
        
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                if (loadingScreen.parentNode) {
                    loadingScreen.parentNode.removeChild(loadingScreen);
                }
            }, 500);
        }, 500);
    }
}

function showWelcomeMessage() {
    if (window.dashboardController) {
        window.dashboardController.showNotification('Dashboard loaded successfully!', 'success');
    }
}

function showErrorScreen(message) {
    const errorScreen = document.createElement('div');
    errorScreen.id = 'error-screen';
    errorScreen.innerHTML = `
        <div class="error-container">
            <div class="error-icon">⚠️</div>
            <h2>Dashboard Error</h2>
            <p>${message}</p>
            <button onclick="location.reload()" class="btn btn-primary">Reload Dashboard</button>
            <button onclick="showDebugInfo()" class="btn btn-secondary">Debug Info</button>
        </div>
    `;
    
    addErrorStyles();
    
    // Hide loading screen if it exists
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
    
    document.body.appendChild(errorScreen);
}

function showDebugInfo() {
    const debugInfo = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        appState: window.appState,
        errors: window.globalErrors || []
    };
    
    const debugWindow = window.open('', '_blank');
    debugWindow.document.write(`
        <html>
            <head><title>Dashboard Debug Info</title></head>
            <body style="background: #1a202c; color: #e2e8f0; font-family: monospace; padding: 20px;">
                <h1>Debug Information</h1>
                <pre>${JSON.stringify(debugInfo, null, 2)}</pre>
            </body>
        </html>
    `);
}

function isDevelopmentMode() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.search.includes('dev=true');
}

function loadSampleData() {
    console.log('Loading sample data for development...');
    
    // Sample system metrics
    const sampleMetrics = {
        cpu: 45.2,
        memory: { used: 2048, total: 8192 },
        taskRate: 12,
        errorRate: 2.1,
        timestamp: Date.now()
    };
    
    if (window.chartManager) {
        window.chartManager.updateMetrics(sampleMetrics);
    }
    
    // Sample tasks
    const sampleTasks = [
        {
            id: 1,
            name: 'Data Analysis Pipeline',
            type: 'analysis',
            status: 'processing',
            progress: 65,
            agent: 'analyzer-01',
            created: Date.now() - 300000,
            duration: 300000,
            description: 'Processing dataset for ML model training'
        },
        {
            id: 2,
            name: 'Report Generation',
            type: 'export',
            status: 'completed',
            progress: 100,
            agent: 'reporter-01',
            created: Date.now() - 600000,
            duration: 180000,
            description: 'Generate quarterly performance report'
        },
        {
            id: 3,
            name: 'Data Validation',
            type: 'validation',
            status: 'failed',
            progress: 25,
            agent: 'validator-01',
            created: Date.now() - 900000,
            duration: 45000,
            description: 'Validate incoming data stream',
            error: 'Schema validation failed: missing required field "user_id"'
        },
        {
            id: 4,
            name: 'File Processing',
            type: 'processing',
            status: 'pending',
            progress: 0,
            created: Date.now() - 60000,
            description: 'Process uploaded CSV files'
        }
    ];
    
    if (window.tableManager && window.tableManager.taskTable) {
        window.tableManager.taskTable.setData(sampleTasks);
    }
    
    // Sample errors
    const sampleErrors = [
        {
            timestamp: Date.now() - 120000,
            level: 'error',
            source: 'data-processor',
            message: 'Failed to parse JSON data: unexpected token at line 42',
            count: 3,
            stack: 'Error: Failed to parse JSON\n    at DataProcessor.parse (processor.js:42)\n    at Pipeline.run (pipeline.js:18)'
        },
        {
            timestamp: Date.now() - 300000,
            level: 'warning',
            source: 'memory-monitor',
            message: 'Memory usage above 80% threshold',
            count: 1
        },
        {
            timestamp: Date.now() - 600000,
            level: 'critical',
            source: 'database-connector',
            message: 'Connection timeout to primary database',
            count: 1,
            context: { timeout: 30000, retries: 3 }
        }
    ];
    
    if (window.tableManager && window.tableManager.errorTable) {
        window.tableManager.errorTable.setData(sampleErrors);
    }
    
    // Sample agents
    const sampleAgents = [
        {
            id: 'analyzer-01',
            name: 'Data Analyzer',
            status: 'online',
            activeTasks: 2,
            cpu: 67.5,
            memory: 1024,
            lastSeen: Date.now() - 30000,
            capabilities: ['data-analysis', 'machine-learning', 'statistics']
        },
        {
            id: 'reporter-01',
            name: 'Report Generator',
            status: 'idle',
            activeTasks: 0,
            cpu: 12.3,
            memory: 512,
            lastSeen: Date.now() - 60000,
            capabilities: ['report-generation', 'pdf-export', 'charts']
        },
        {
            id: 'validator-01',
            name: 'Data Validator',
            status: 'offline',
            activeTasks: 0,
            cpu: 0,
            memory: 0,
            lastSeen: Date.now() - 600000,
            capabilities: ['data-validation', 'schema-checking']
        }
    ];
    
    if (window.tableManager && window.tableManager.agentTable) {
        window.tableManager.agentTable.setData(sampleAgents);
    }
    
    // Sample log entries
    const sampleLogs = [
        {
            timestamp: Date.now() - 10000,
            level: 'info',
            message: 'Task queue processed 15 items in the last minute'
        },
        {
            timestamp: Date.now() - 30000,
            level: 'debug',
            message: 'Agent analyzer-01 connected successfully'
        },
        {
            timestamp: Date.now() - 60000,
            level: 'warning',
            message: 'High memory usage detected on validator-01'
        },
        {
            timestamp: Date.now() - 90000,
            level: 'error',
            message: 'Failed to connect to external API endpoint'
        }
    ];
    
    if (window.dashboardController) {
        sampleLogs.forEach(log => {
            setTimeout(() => {
                window.dashboardController.addLogEntry(log);
            }, Math.random() * 2000);
        });
    }
    
    console.log('Sample data loaded');
}

function handleGlobalError(event) {
    console.error('Global error:', event.error);
    
    if (!window.globalErrors) {
        window.globalErrors = [];
    }
    
    window.globalErrors.push({
        timestamp: Date.now(),
        message: event.error.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error.toString()
    });
    
    // Show error notification if dashboard is initialized
    if (window.dashboardController && window.appState.initialized) {
        window.dashboardController.showNotification('An error occurred. Check console for details.', 'error');
    }
}

function handlePromiseRejection(event) {
    console.error('Unhandled promise rejection:', event.reason);
    
    if (!window.globalErrors) {
        window.globalErrors = [];
    }
    
    window.globalErrors.push({
        timestamp: Date.now(),
        type: 'promise_rejection',
        reason: event.reason.toString()
    });
    
    // Show error notification if dashboard is initialized
    if (window.dashboardController && window.appState.initialized) {
        window.dashboardController.showNotification('Promise rejection occurred. Check console for details.', 'error');
    }
}

function addLoadingStyles() {
    if (!document.getElementById('loading-styles')) {
        const styles = document.createElement('style');
        styles.id = 'loading-styles';
        styles.textContent = `
            #loading-screen {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #0f1419;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                transition: opacity 0.5s ease;
            }
            
            .loading-container {
                text-align: center;
                color: #e1e8f0;
                max-width: 400px;
                width: 90%;
            }
            
            .loading-spinner {
                width: 60px;
                height: 60px;
                border: 4px solid #2d3748;
                border-top: 4px solid #4299e1;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 2rem;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .loading-container h2 {
                margin-bottom: 1.5rem;
                color: #f7fafc;
                font-size: 1.5rem;
            }
            
            .loading-progress {
                background: #2d3748;
                border-radius: 20px;
                height: 8px;
                margin-bottom: 1rem;
                overflow: hidden;
            }
            
            .loading-bar {
                background: linear-gradient(90deg, #4299e1, #63b3ed);
                height: 100%;
                width: 0%;
                transition: width 0.3s ease;
                border-radius: 20px;
            }
            
            #loading-status {
                font-size: 0.9rem;
                color: #a0aec0;
                margin: 0;
            }
        `;
        document.head.appendChild(styles);
    }
}

function addErrorStyles() {
    if (!document.getElementById('error-styles')) {
        const styles = document.createElement('style');
        styles.id = 'error-styles';
        styles.textContent = `
            #error-screen {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #0f1419;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            }
            
            .error-container {
                text-align: center;
                color: #e1e8f0;
                max-width: 500px;
                width: 90%;
                background: #1a202c;
                padding: 2rem;
                border-radius: 12px;
                border: 1px solid #f56565;
            }
            
            .error-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
            }
            
            .error-container h2 {
                color: #f56565;
                margin-bottom: 1rem;
                font-size: 1.5rem;
            }
            
            .error-container p {
                margin-bottom: 2rem;
                color: #cbd5e0;
                line-height: 1.5;
            }
            
            .error-container button {
                margin: 0 0.5rem;
            }
        `;
        document.head.appendChild(styles);
    }
}

// Health check endpoint for monitoring
window.healthCheck = function() {
    const health = {
        timestamp: new Date().toISOString(),
        status: window.appState.initialized ? 'healthy' : 'initializing',
        components: {}
    };
    
    // Check each component
    Object.keys(window.appState.components).forEach(name => {
        const component = window.appState.components[name];
        if (component && typeof component.healthCheck === 'function') {
            health.components[name] = component.healthCheck();
        } else {
            health.components[name] = component ? 'active' : 'missing';
        }
    });
    
    return health;
};

// Expose global functions for debugging
window.debugDashboard = {
    loadSampleData,
    healthCheck: window.healthCheck,
    appState: window.appState,
    components: window.appState.components
};

console.log('Monitoring Dashboard App loaded');
console.log('Debug functions available at window.debugDashboard');