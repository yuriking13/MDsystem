/**
 * WebSocket Monitoring Server for Real-time Dashboard Updates
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

class MonitoringServer {
    constructor(options = {}) {
        this.port = options.port || 3001;
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ 
            server: this.server,
            path: '/ws/monitoring'
        });
        
        // Data stores
        this.clients = new Set();
        this.taskQueue = new Map();
        this.errorLog = [];
        this.agents = new Map();
        this.systemMetrics = {
            cpu: 0,
            memory: { used: 0, total: 0 },
            taskRate: 0,
            errorRate: 0,
            timestamp: Date.now()
        };
        
        // Configuration
        this.config = {
            maxErrorLogSize: 1000,
            maxTaskHistorySize: 10000,
            metricsInterval: 5000,
            heartbeatInterval: 30000,
            ...options.config
        };
        
        this.setupExpress();
        this.setupWebSocket();
        this.startMonitoring();
        
        console.log(`Monitoring Server initialized on port ${this.port}`);
    }
    
    setupExpress() {
        // Serve static dashboard files
        this.app.use(express.static(path.join(__dirname, '..')));
        this.app.use(express.json());
        
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                clients: this.clients.size,
                tasks: this.taskQueue.size,
                agents: this.agents.size,
                uptime: process.uptime()
            });
        });
        
        // API endpoints for external systems
        this.app.post('/api/tasks', (req, res) => {
            const task = this.addTask(req.body);
            res.json(task);
        });
        
        this.app.put('/api/tasks/:id', (req, res) => {
            const task = this.updateTask(req.params.id, req.body);
            if (task) {
                res.json(task);
            } else {
                res.status(404).json({ error: 'Task not found' });
            }
        });
        
        this.app.post('/api/errors', (req, res) => {
            this.addError(req.body);
            res.json({ status: 'logged' });
        });
        
        this.app.post('/api/agents', (req, res) => {
            const agent = this.updateAgent(req.body);
            res.json(agent);
        });
        
        this.app.get('/api/metrics', (req, res) => {
            res.json(this.systemMetrics);
        });
        
        // Dashboard route
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '..', 'index.html'));
        });
        
        console.log('Express server configured');
    }
    
    setupWebSocket() {
        this.wss.on('connection', (ws, req) => {
            console.log('Client connected:', req.connection.remoteAddress);
            
            this.clients.add(ws);
            
            // Send initial data
            this.sendToClient(ws, 'system_metrics', this.systemMetrics);
            this.sendToClient(ws, 'task_queue', Array.from(this.taskQueue.values()));
            this.sendToClient(ws, 'error_log', this.errorLog.slice(0, 100));
            this.sendToClient(ws, 'agent_list', Array.from(this.agents.values()));
            
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.handleClientMessage(ws, data);
                } catch (error) {
                    console.error('Invalid WebSocket message:', error);
                }
            });
            
            ws.on('close', () => {
                console.log('Client disconnected');
                this.clients.delete(ws);
            });
            
            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.clients.delete(ws);
            });
        });
        
        console.log('WebSocket server configured');
    }
    
    handleClientMessage(ws, data) {
        const { type, ...payload } = data;
        
        switch (type) {
            case 'subscribe':
                // Handle channel subscriptions
                this.handleSubscription(ws, payload.channels);
                break;
                
            case 'unsubscribe':
                // Handle channel unsubscriptions
                this.handleUnsubscription(ws, payload.channels);
                break;
                
            case 'request_system_metrics':
                this.sendToClient(ws, 'system_metrics', this.systemMetrics);
                break;
                
            case 'request_task_queue':
                this.sendToClient(ws, 'task_queue', Array.from(this.taskQueue.values()));
                break;
                
            case 'request_error_log':
                this.sendToClient(ws, 'error_log', this.errorLog.slice(0, 100));
                break;
                
            case 'request_agent_status':
                this.sendToClient(ws, 'agent_list', Array.from(this.agents.values()));
                break;
                
            case 'pause_queue':
                this.pauseTaskQueue();
                break;
                
            case 'resume_queue':
                this.resumeTaskQueue();
                break;
                
            case 'clear_completed_tasks':
                this.clearCompletedTasks();
                break;
                
            case 'retry_failed_tasks':
                this.retryFailedTasks();
                break;
                
            case 'clear_errors':
                this.clearErrors();
                break;
                
            case 'restart_agent':
                this.restartAgent(payload.agentId);
                break;
                
            case 'restart_all_agents':
                this.restartAllAgents();
                break;
                
            case 'retry_task':
                this.retryTask(payload.taskId);
                break;
                
            case 'cancel_task':
                this.cancelTask(payload.taskId);
                break;
                
            case 'heartbeat':
                this.sendToClient(ws, 'heartbeat', { timestamp: Date.now() });
                break;
                
            default:
                console.log('Unknown message type:', type);
        }
    }
    
    handleSubscription(ws, channels) {
        // Store client subscriptions (for future filtering)
        if (!ws.subscriptions) {
            ws.subscriptions = new Set();
        }
        channels.forEach(channel => ws.subscriptions.add(channel));
    }
    
    handleUnsubscription(ws, channels) {
        if (ws.subscriptions) {
            channels.forEach(channel => ws.subscriptions.delete(channel));
        }
    }
    
    sendToClient(client, type, payload) {
        if (client.readyState === WebSocket.OPEN) {
            try {
                const message = JSON.stringify({
                    type,
                    payload,
                    timestamp: Date.now()
                });
                client.send(message);
            } catch (error) {
                console.error('Error sending message to client:', error);
            }
        }
    }
    
    broadcast(type, payload) {
        const message = {
            type,
            payload,
            timestamp: Date.now()
        };
        
        this.clients.forEach(client => {
            this.sendToClient(client, type, payload);
        });
    }
    
    // Task Management
    addTask(taskData) {
        const task = {
            id: taskData.id || this.generateTaskId(),
            name: taskData.name || 'Unnamed Task',
            type: taskData.type || 'general',
            status: taskData.status || 'pending',
            progress: taskData.progress || 0,
            agent: taskData.agent || null,
            created: taskData.created || Date.now(),
            updated: Date.now(),
            duration: 0,
            description: taskData.description || '',
            parameters: taskData.parameters || {},
            priority: taskData.priority || 'normal'
        };
        
        this.taskQueue.set(task.id, task);
        this.broadcast('task_update', task);
        
        console.log(`Task added: ${task.name} (ID: ${task.id})`);
        return task;
    }
    
    updateTask(taskId, updates) {
        const task = this.taskQueue.get(taskId);
        if (!task) {
            return null;
        }
        
        // Update task properties
        Object.assign(task, updates, {
            updated: Date.now()
        });
        
        // Calculate duration for completed/failed tasks
        if (task.status === 'completed' || task.status === 'failed') {
            task.duration = task.updated - task.created;
        }
        
        this.taskQueue.set(taskId, task);
        this.broadcast('task_update', task);
        
        console.log(`Task updated: ${task.name} (Status: ${task.status})`);
        return task;
    }
    
    retryTask(taskId) {
        const task = this.taskQueue.get(taskId);
        if (task && task.status === 'failed') {
            task.status = 'pending';
            task.progress = 0;
            task.error = null;
            task.updated = Date.now();
            
            this.taskQueue.set(taskId, task);
            this.broadcast('task_update', task);
            
            console.log(`Task retried: ${task.name}`);
        }
    }
    
    cancelTask(taskId) {
        const task = this.taskQueue.get(taskId);
        if (task && task.status === 'processing') {
            task.status = 'cancelled';
            task.updated = Date.now();
            task.duration = task.updated - task.created;
            
            this.taskQueue.set(taskId, task);
            this.broadcast('task_update', task);
            
            console.log(`Task cancelled: ${task.name}`);
        }
    }
    
    clearCompletedTasks() {
        const completed = [];
        for (const [id, task] of this.taskQueue) {
            if (task.status === 'completed') {
                completed.push(id);
            }
        }
        
        completed.forEach(id => {
            this.taskQueue.delete(id);
            this.broadcast('task_removed', { id });
        });
        
        console.log(`Cleared ${completed.length} completed tasks`);
    }
    
    retryFailedTasks() {
        let retryCount = 0;
        for (const [id, task] of this.taskQueue) {
            if (task.status === 'failed') {
                this.retryTask(id);
                retryCount++;
            }
        }
        
        console.log(`Retried ${retryCount} failed tasks`);
    }
    
    pauseTaskQueue() {
        // Implementation would depend on your task processing system
        this.broadcast('queue_paused', { timestamp: Date.now() });
        console.log('Task queue paused');
    }
    
    resumeTaskQueue() {
        // Implementation would depend on your task processing system
        this.broadcast('queue_resumed', { timestamp: Date.now() });
        console.log('Task queue resumed');
    }
    
    generateTaskId() {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    }
    
    // Error Management
    addError(errorData) {
        const error = {
            id: this.generateErrorId(),
            timestamp: errorData.timestamp || Date.now(),
            level: errorData.level || 'error',
            source: errorData.source || 'unknown',
            message: errorData.message || 'Unknown error',
            stack: errorData.stack || null,
            context: errorData.context || null,
            count: 1
        };
        
        // Check for duplicate errors and increment count
        const existing = this.errorLog.find(e => 
            e.level === error.level && 
            e.source === error.source && 
            e.message === error.message
        );
        
        if (existing) {
            existing.count++;
            existing.timestamp = error.timestamp;
        } else {
            this.errorLog.unshift(error);
        }
        
        // Trim error log if too large
        if (this.errorLog.length > this.config.maxErrorLogSize) {
            this.errorLog = this.errorLog.slice(0, this.config.maxErrorLogSize);
        }
        
        this.broadcast('error_log', existing || error);
        console.log(`Error logged: ${error.level} - ${error.message}`);
        
        return error;
    }
    
    clearErrors() {
        this.errorLog = [];
        this.broadcast('errors_cleared', { timestamp: Date.now() });
        console.log('Error log cleared');
    }
    
    generateErrorId() {
        return 'err_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }
    
    // Agent Management
    updateAgent(agentData) {
        const agent = {
            id: agentData.id,
            name: agentData.name || agentData.id,
            status: agentData.status || 'unknown',
            activeTasks: agentData.activeTasks || 0,
            cpu: agentData.cpu || 0,
            memory: agentData.memory || 0,
            lastSeen: Date.now(),
            capabilities: agentData.capabilities || [],
            stats: agentData.stats || {},
            metadata: agentData.metadata || {}
        };
        
        this.agents.set(agent.id, agent);
        this.broadcast('agent_status', agent);
        
        console.log(`Agent updated: ${agent.name} (Status: ${agent.status})`);
        return agent;
    }
    
    removeAgent(agentId) {
        if (this.agents.has(agentId)) {
            this.agents.delete(agentId);
            this.broadcast('agent_removed', { id: agentId });
            console.log(`Agent removed: ${agentId}`);
        }
    }
    
    restartAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (agent) {
            // In a real implementation, you would send a restart command to the agent
            agent.status = 'restarting';
            agent.lastSeen = Date.now();
            
            this.agents.set(agentId, agent);
            this.broadcast('agent_status', agent);
            
            // Simulate restart completion
            setTimeout(() => {
                agent.status = 'online';
                agent.lastSeen = Date.now();
                this.agents.set(agentId, agent);
                this.broadcast('agent_status', agent);
            }, 5000);
            
            console.log(`Agent restart initiated: ${agentId}`);
        }
    }
    
    restartAllAgents() {
        this.agents.forEach((agent, id) => {
            this.restartAgent(id);
        });
        console.log('All agents restart initiated');
    }
    
    // System Monitoring
    startMonitoring() {
        // Collect system metrics periodically
        setInterval(() => {
            this.collectSystemMetrics();
        }, this.config.metricsInterval);
        
        // Send heartbeat to clients
        setInterval(() => {
            this.broadcast('heartbeat', { timestamp: Date.now() });
        }, this.config.heartbeatInterval);
        
        // Check for offline agents
        setInterval(() => {
            this.checkOfflineAgents();
        }, 60000);
        
        console.log('Monitoring started');
    }
    
    async collectSystemMetrics() {
        try {
            const cpus = os.cpus();
            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();
            const usedMemory = totalMemory - freeMemory;
            
            // Calculate CPU usage (simplified)
            const cpuUsage = await this.getCpuUsage();
            
            // Calculate task rate (tasks per minute)
            const now = Date.now();
            const oneMinuteAgo = now - 60000;
            const recentTasks = Array.from(this.taskQueue.values())
                .filter(task => task.updated > oneMinuteAgo);
            const taskRate = recentTasks.length;
            
            // Calculate error rate
            const recentErrors = this.errorLog.filter(error => error.timestamp > oneMinuteAgo);
            const totalRecentEvents = recentTasks.length + recentErrors.length;
            const errorRate = totalRecentEvents > 0 ? (recentErrors.length / totalRecentEvents) * 100 : 0;
            
            this.systemMetrics = {
                cpu: cpuUsage,
                memory: {
                    used: Math.round(usedMemory / 1024 / 1024), // MB
                    total: Math.round(totalMemory / 1024 / 1024), // MB
                    free: Math.round(freeMemory / 1024 / 1024), // MB
                    percentage: Math.round((usedMemory / totalMemory) * 100)
                },
                taskRate,
                errorRate,
                timestamp: now,
                uptime: process.uptime(),
                agents: {
                    total: this.agents.size,
                    online: Array.from(this.agents.values()).filter(a => a.status === 'online').length
                },
                tasks: {
                    total: this.taskQueue.size,
                    pending: Array.from(this.taskQueue.values()).filter(t => t.status === 'pending').length,
                    processing: Array.from(this.taskQueue.values()).filter(t => t.status === 'processing').length,
                    completed: Array.from(this.taskQueue.values()).filter(t => t.status === 'completed').length,
                    failed: Array.from(this.taskQueue.values()).filter(t => t.status === 'failed').length
                }
            };
            
            this.broadcast('system_metrics', this.systemMetrics);
            
        } catch (error) {
            console.error('Error collecting system metrics:', error);
        }
    }
    
    async getCpuUsage() {
        return new Promise((resolve) => {
            const startMeasure = process.cpuUsage();
            
            setTimeout(() => {
                const endMeasure = process.cpuUsage(startMeasure);
                const totalUsage = endMeasure.user + endMeasure.system;
                const percentage = (totalUsage / 1000 / 1000) * 100; // Convert to percentage
                resolve(Math.min(100, Math.max(0, percentage)));
            }, 100);
        });
    }
    
    checkOfflineAgents() {
        const now = Date.now();
        const offlineThreshold = 5 * 60 * 1000; // 5 minutes
        
        this.agents.forEach((agent, id) => {
            if (now - agent.lastSeen > offlineThreshold && agent.status !== 'offline') {
                agent.status = 'offline';
                this.agents.set(id, agent);
                this.broadcast('agent_status', agent);
                console.log(`Agent marked as offline: ${agent.name}`);
            }
        });
    }
    
    // Utility methods
    getStats() {
        return {
            clients: this.clients.size,
            tasks: this.taskQueue.size,
            errors: this.errorLog.length,
            agents: this.agents.size,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            systemMetrics: this.systemMetrics
        };
    }
    
    start() {
        this.server.listen(this.port, () => {
            console.log(`Monitoring Server running on port ${this.port}`);
            console.log(`Dashboard available at http://localhost:${this.port}`);
            console.log(`WebSocket endpoint: ws://localhost:${this.port}/ws/monitoring`);
        });
    }
    
    stop() {
        console.log('Stopping Monitoring Server...');
        
        // Close all WebSocket connections
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.close();
            }
        });
        
        // Close WebSocket server
        this.wss.close();
        
        // Close HTTP server
        this.server.close(() => {
            console.log('Monitoring Server stopped');
        });
    }
}

// Export for use as module
module.exports = MonitoringServer;

// Run directly if this file is executed
if (require.main === module) {
    const server = new MonitoringServer({
        port: process.env.PORT || 3001,
        config: {
            maxErrorLogSize: 1000,
            maxTaskHistorySize: 10000,
            metricsInterval: 5000,
            heartbeatInterval: 30000
        }
    });
    
    server.start();
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\nReceived SIGINT, shutting down gracefully...');
        server.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        console.log('\nReceived SIGTERM, shutting down gracefully...');
        server.stop();
        process.exit(0);
    });
}