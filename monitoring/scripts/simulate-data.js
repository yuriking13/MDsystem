/**
 * Data Simulation Script for Testing Monitoring Dashboard
 */

const WebSocket = require('ws');

class DataSimulator {
    constructor(serverUrl = 'ws://localhost:3001/ws/monitoring') {
        this.serverUrl = serverUrl;
        this.ws = null;
        this.isRunning = false;
        this.intervals = {};
        
        this.taskTypes = ['analysis', 'processing', 'validation', 'export', 'cleanup'];
        this.agentNames = ['analyzer-01', 'processor-02', 'validator-03', 'reporter-04', 'cleaner-05'];
        this.errorSources = ['data-processor', 'memory-monitor', 'database-connector', 'api-client', 'file-handler'];
        
        this.taskIdCounter = 1000;
        this.simulationSpeed = 1; // 1x normal speed
    }
    
    connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.serverUrl);
                
                this.ws.on('open', () => {
                    console.log('Connected to monitoring server');
                    resolve();
                });
                
                this.ws.on('error', (error) => {
                    console.error('WebSocket connection error:', error);
                    reject(error);
                });
                
                this.ws.on('close', () => {
                    console.log('Disconnected from monitoring server');
                    this.isRunning = false;
                });
                
                this.ws.on('message', (data) => {
                    // Handle server responses if needed
                    try {
                        const message = JSON.parse(data);
                        if (message.type === 'heartbeat') {
                            console.log('Received heartbeat from server');
                        }
                    } catch (error) {
                        // Ignore parse errors
                    }
                });
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
        this.stopSimulation();
    }
    
    startSimulation() {
        if (this.isRunning) {
            console.log('Simulation already running');
            return;
        }
        
        this.isRunning = true;
        console.log('Starting data simulation...');
        
        // Initialize some agents
        this.createInitialAgents();
        
        // Start periodic data generation
        this.intervals.tasks = setInterval(() => {
            this.simulateTaskActivity();
        }, 3000 / this.simulationSpeed);
        
        this.intervals.errors = setInterval(() => {
            if (Math.random() < 0.3) { // 30% chance of error
                this.simulateError();
            }
        }, 8000 / this.simulationSpeed);
        
        this.intervals.agents = setInterval(() => {
            this.updateAgentStatus();
        }, 5000 / this.simulationSpeed);
        
        this.intervals.metrics = setInterval(() => {
            this.simulateSystemMetrics();
        }, 2000 / this.simulationSpeed);
        
        console.log('Simulation started with intervals:', Object.keys(this.intervals));
    }
    
    stopSimulation() {
        this.isRunning = false;
        
        Object.keys(this.intervals).forEach(key => {
            if (this.intervals[key]) {
                clearInterval(this.intervals[key]);
                delete this.intervals[key];
            }
        });
        
        console.log('Simulation stopped');
    }
    
    createInitialAgents() {
        this.agentNames.forEach((name, index) => {
            const agent = {
                id: name,
                name: name.charAt(0).toUpperCase() + name.slice(1).replace('-', ' '),
                status: Math.random() > 0.2 ? 'online' : 'offline',
                activeTasks: Math.floor(Math.random() * 3),
                cpu: Math.random() * 80,
                memory: 256 + Math.floor(Math.random() * 1024),
                capabilities: this.getRandomCapabilities(),
                stats: {
                    tasksCompleted: Math.floor(Math.random() * 100),
                    averageProcessingTime: Math.floor(Math.random() * 5000),
                    errorCount: Math.floor(Math.random() * 10)
                }
            };
            
            this.sendToServer('POST', '/api/agents', agent);
        });
    }
    
    simulateTaskActivity() {
        const actions = ['create', 'update', 'complete', 'fail'];
        const action = actions[Math.floor(Math.random() * actions.length)];
        
        switch (action) {
            case 'create':
                this.createRandomTask();
                break;
            case 'update':
                this.updateRandomTask();
                break;
            case 'complete':
                this.completeRandomTask();
                break;
            case 'fail':
                this.failRandomTask();
                break;
        }
    }
    
    createRandomTask() {
        const task = {
            id: this.taskIdCounter++,
            name: this.generateTaskName(),
            type: this.taskTypes[Math.floor(Math.random() * this.taskTypes.length)],
            status: 'pending',
            progress: 0,
            agent: null,
            description: this.generateTaskDescription(),
            parameters: this.generateTaskParameters(),
            priority: Math.random() > 0.8 ? 'high' : 'normal'
        };
        
        this.sendToServer('POST', '/api/tasks', task);
        console.log(`Created task: ${task.name} (ID: ${task.id})`);
        
        // Simulate task starting after a delay
        setTimeout(() => {
            if (Math.random() > 0.3) { // 70% chance to start
                const agent = this.agentNames[Math.floor(Math.random() * this.agentNames.length)];
                this.sendToServer('PUT', `/api/tasks/${task.id}`, {
                    status: 'processing',
                    agent: agent,
                    progress: Math.floor(Math.random() * 20) // Initial progress
                });
            }
        }, (1000 + Math.random() * 3000) / this.simulationSpeed);
    }
    
    updateRandomTask() {
        // In a real scenario, you'd track active tasks
        // For simulation, we'll just update a random task ID
        const taskId = this.taskIdCounter - Math.floor(Math.random() * 10);
        if (taskId > 1000) {
            const progress = Math.min(100, Math.floor(Math.random() * 100));
            this.sendToServer('PUT', `/api/tasks/${taskId}`, {
                progress: progress
            });
        }
    }
    
    completeRandomTask() {
        const taskId = this.taskIdCounter - Math.floor(Math.random() * 15);
        if (taskId > 1000) {
            this.sendToServer('PUT', `/api/tasks/${taskId}`, {
                status: 'completed',
                progress: 100
            });
            console.log(`Completed task ID: ${taskId}`);
        }
    }
    
    failRandomTask() {
        const taskId = this.taskIdCounter - Math.floor(Math.random() * 20);
        if (taskId > 1000) {
            const errorMessages = [
                'Connection timeout',
                'Invalid data format',
                'Memory allocation failed',
                'Permission denied',
                'Resource not found'
            ];
            
            this.sendToServer('PUT', `/api/tasks/${taskId}`, {
                status: 'failed',
                error: errorMessages[Math.floor(Math.random() * errorMessages.length)]
            });
            console.log(`Failed task ID: ${taskId}`);
        }
    }
    
    simulateError() {
        const levels = ['info', 'warning', 'error', 'critical'];
        const levelWeights = [0.4, 0.35, 0.2, 0.05]; // Probability weights
        
        const level = this.weightedRandom(levels, levelWeights);
        const source = this.errorSources[Math.floor(Math.random() * this.errorSources.length)];
        
        const error = {
            level: level,
            source: source,
            message: this.generateErrorMessage(level, source),
            stack: level === 'error' || level === 'critical' ? this.generateStackTrace() : null,
            context: this.generateErrorContext()
        };
        
        this.sendToServer('POST', '/api/errors', error);
        console.log(`Generated ${level} error from ${source}`);
    }
    
    updateAgentStatus() {
        this.agentNames.forEach(name => {
            const agent = {
                id: name,
                name: name.charAt(0).toUpperCase() + name.slice(1).replace('-', ' '),
                status: Math.random() > 0.95 ? 'offline' : 'online', // 5% chance to go offline
                activeTasks: Math.floor(Math.random() * 4),
                cpu: Math.random() * 100,
                memory: 256 + Math.floor(Math.random() * 2048),
                stats: {
                    tasksCompleted: Math.floor(Math.random() * 200),
                    averageProcessingTime: 1000 + Math.floor(Math.random() * 10000),
                    errorCount: Math.floor(Math.random() * 20)
                }
            };
            
            this.sendToServer('POST', '/api/agents', agent);
        });
    }
    
    simulateSystemMetrics() {
        // This would normally be handled by the monitoring server
        // We can trigger a metrics collection by making a request
        this.sendToServer('GET', '/api/metrics');
    }
    
    // Utility methods
    generateTaskName() {
        const prefixes = ['Process', 'Analyze', 'Validate', 'Export', 'Clean', 'Transform', 'Index', 'Backup'];
        const subjects = ['Dataset', 'Report', 'Files', 'Images', 'Documents', 'Records', 'Database', 'Archive'];
        const suffixes = ['Pipeline', 'Job', 'Task', 'Operation', 'Batch', 'Stream'];
        
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const subject = subjects[Math.floor(Math.random() * subjects.length)];
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        
        return `${prefix} ${subject} ${suffix}`;
    }
    
    generateTaskDescription() {
        const actions = [
            'Processing incoming data stream',
            'Validating schema compliance',
            'Generating analytical reports',
            'Cleaning and normalizing data',
            'Performing quality checks',
            'Indexing document collection',
            'Optimizing database queries',
            'Creating backup archives'
        ];
        
        return actions[Math.floor(Math.random() * actions.length)];
    }
    
    generateTaskParameters() {
        return {
            batchSize: Math.floor(Math.random() * 1000) + 100,
            timeout: Math.floor(Math.random() * 30000) + 5000,
            retryCount: Math.floor(Math.random() * 3) + 1,
            format: ['json', 'csv', 'xml', 'binary'][Math.floor(Math.random() * 4)]
        };
    }
    
    generateErrorMessage(level, source) {
        const messages = {
            info: [
                `${source} started successfully`,
                `Configuration loaded for ${source}`,
                `${source} completed routine check`
            ],
            warning: [
                `${source} experiencing high load`,
                `Retry attempt #3 for ${source}`,
                `${source} connection unstable`
            ],
            error: [
                `${source} failed to process request`,
                `Timeout occurred in ${source}`,
                `${source} encountered invalid data`
            ],
            critical: [
                `${source} system failure detected`,
                `${source} completely unresponsive`,
                `${source} data corruption detected`
            ]
        };
        
        const levelMessages = messages[level] || messages.error;
        return levelMessages[Math.floor(Math.random() * levelMessages.length)];
    }
    
    generateStackTrace() {
        const functions = ['processData', 'validateInput', 'connectDatabase', 'parseJSON', 'allocateMemory'];
        const files = ['processor.js', 'validator.js', 'database.js', 'parser.js', 'memory.js'];
        
        let stack = 'Error: Process failed\n';
        for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
            const func = functions[Math.floor(Math.random() * functions.length)];
            const file = files[Math.floor(Math.random() * files.length)];
            const line = Math.floor(Math.random() * 200) + 1;
            stack += `    at ${func} (${file}:${line}:${Math.floor(Math.random() * 20) + 1})\n`;
        }
        
        return stack;
    }
    
    generateErrorContext() {
        return {
            userId: Math.floor(Math.random() * 10000),
            requestId: 'req_' + Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            environment: 'production'
        };
    }
    
    getRandomCapabilities() {
        const allCapabilities = [
            'data-analysis', 'machine-learning', 'statistics',
            'report-generation', 'pdf-export', 'charts',
            'data-validation', 'schema-checking',
            'file-processing', 'image-processing',
            'database-operations', 'backup-restore',
            'api-integration', 'web-scraping'
        ];
        
        const count = 2 + Math.floor(Math.random() * 4);
        const selected = [];
        
        for (let i = 0; i < count; i++) {
            const capability = allCapabilities[Math.floor(Math.random() * allCapabilities.length)];
            if (!selected.includes(capability)) {
                selected.push(capability);
            }
        }
        
        return selected;
    }
    
    weightedRandom(items, weights) {
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < items.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return items[i];
            }
        }
        
        return items[items.length - 1];
    }
    
    sendToServer(method, path, data = null) {
        try {
            // For WebSocket simulation, we'll send HTTP requests to the server
            const http = require('http');
            const url = require('url');
            
            const serverUrl = new URL(`http://localhost:3001${path}`);
            
            const options = {
                hostname: serverUrl.hostname,
                port: serverUrl.port,
                path: serverUrl.pathname,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'DataSimulator/1.0'
                }
            };
            
            const req = http.request(options, (res) => {
                // Handle response if needed
                res.on('data', (chunk) => {
                    // Response data
                });
                
                res.on('end', () => {
                    // Request completed
                });
            });
            
            req.on('error', (error) => {
                // Silently handle errors to avoid spam
            });
            
            if (data && (method === 'POST' || method === 'PUT')) {
                req.write(JSON.stringify(data));
            }
            
            req.end();
            
        } catch (error) {
            // Silently handle errors
        }
    }
    
    setSimulationSpeed(speed) {
        this.simulationSpeed = Math.max(0.1, Math.min(10, speed));
        console.log(`Simulation speed set to ${this.simulationSpeed}x`);
        
        if (this.isRunning) {
            console.log('Restart simulation for speed change to take effect');
        }
    }
    
    getStatus() {
        return {
            running: this.isRunning,
            speed: this.simulationSpeed,
            taskCounter: this.taskIdCounter,
            intervals: Object.keys(this.intervals),
            connected: this.ws && this.ws.readyState === WebSocket.OPEN
        };
    }
}

// CLI Interface
if (require.main === module) {
    const simulator = new DataSimulator();
    
    // Command line arguments
    const args = process.argv.slice(2);
    const speed = args.find(arg => arg.startsWith('--speed='))?.split('=')[1] || '1';
    const duration = args.find(arg => arg.startsWith('--duration='))?.split('=')[1] || '0';
    
    simulator.setSimulationSpeed(parseFloat(speed));
    
    console.log('Starting data simulator...');
    console.log(`Speed: ${simulator.simulationSpeed}x`);
    if (duration > 0) {
        console.log(`Duration: ${duration} seconds`);
    }
    
    simulator.connect()
        .then(() => {
            simulator.startSimulation();
            
            // Auto-stop after duration if specified
            if (duration > 0) {
                setTimeout(() => {
                    console.log('Simulation duration reached, stopping...');
                    simulator.stopSimulation();
                    simulator.disconnect();
                    process.exit(0);
                }, duration * 1000);
            }
        })
        .catch((error) => {
            console.error('Failed to connect to monitoring server:', error);
            console.log('Make sure the monitoring server is running on port 3001');
            process.exit(1);
        });
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\nStopping simulation...');
        simulator.stopSimulation();
        simulator.disconnect();
        process.exit(0);
    });
    
    // CLI commands
    process.stdin.setEncoding('utf8');
    process.stdin.on('readable', () => {
        const chunk = process.stdin.read();
        if (chunk !== null) {
            const command = chunk.trim().toLowerCase();
            
            switch (command) {
                case 'status':
                    console.log('Simulation Status:', simulator.getStatus());
                    break;
                case 'stop':
                    simulator.stopSimulation();
                    break;
                case 'start':
                    if (!simulator.isRunning) {
                        simulator.startSimulation();
                    }
                    break;
                case 'restart':
                    simulator.stopSimulation();
                    setTimeout(() => simulator.startSimulation(), 1000);
                    break;
                case 'quit':
                case 'exit':
                    simulator.stopSimulation();
                    simulator.disconnect();
                    process.exit(0);
                    break;
                case 'help':
                    console.log('Available commands: status, stop, start, restart, quit/exit, help');
                    break;
                default:
                    if (command.startsWith('speed ')) {
                        const newSpeed = parseFloat(command.split(' ')[1]);
                        if (!isNaN(newSpeed)) {
                            simulator.setSimulationSpeed(newSpeed);
                        } else {
                            console.log('Invalid speed value');
                        }
                    } else if (command) {
                        console.log('Unknown command. Type "help" for available commands.');
                    }
            }
        }
    });
    
    console.log('\nSimulator started. Available commands: status, stop, start, restart, speed <value>, quit, help');
}

module.exports = DataSimulator;