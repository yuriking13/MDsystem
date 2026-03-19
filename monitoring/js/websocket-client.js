/**
 * WebSocket Client for Real-time Dashboard Updates
 */
class WebSocketClient {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.isConnecting = false;
        this.messageHandlers = new Map();
        this.connectionState = 'disconnected';
        
        this.init();
    }
    
    init() {
        this.connect();
        this.setupHeartbeat();
    }
    
    connect() {
        if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
            return;
        }
        
        this.isConnecting = true;
        
        // Determine WebSocket URL based on current location
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/ws/monitoring`;
        
        console.log('Connecting to WebSocket:', wsUrl);
        
        try {
            this.ws = new WebSocket(wsUrl);
            this.setupEventHandlers();
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.handleConnectionError();
        }
    }
    
    setupEventHandlers() {
        this.ws.onopen = (event) => {
            console.log('WebSocket connected');
            this.connectionState = 'connected';
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            this.updateConnectionStatus(true);
            
            // Subscribe to all monitoring channels
            this.subscribe(['system', 'tasks', 'errors', 'agents', 'logs']);
        };
        
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error, event.data);
            }
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.updateConnectionStatus(false);
        };
        
        this.ws.onclose = (event) => {
            console.log('WebSocket disconnected:', event.code, event.reason);
            this.connectionState = 'disconnected';
            this.isConnecting = false;
            this.updateConnectionStatus(false);
            
            if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.scheduleReconnect();
            }
        };
    }
    
    handleMessage(data) {
        const { type, payload, timestamp } = data;
        
        // Update last update time
        this.updateLastUpdateTime(timestamp);
        
        // Route message to appropriate handlers
        if (this.messageHandlers.has(type)) {
            this.messageHandlers.get(type).forEach(handler => {
                try {
                    handler(payload);
                } catch (error) {
                    console.error(`Error in message handler for type ${type}:`, error);
                }
            });
        }
        
        // Handle specific message types
        switch (type) {
            case 'system_metrics':
                this.handleSystemMetrics(payload);
                break;
            case 'task_update':
                this.handleTaskUpdate(payload);
                break;
            case 'error_log':
                this.handleErrorLog(payload);
                break;
            case 'agent_status':
                this.handleAgentStatus(payload);
                break;
            case 'log_entry':
                this.handleLogEntry(payload);
                break;
            case 'heartbeat':
                this.handleHeartbeat(payload);
                break;
            default:
                console.log('Unknown message type:', type, payload);
        }
    }
    
    handleSystemMetrics(metrics) {
        if (window.chartManager) {
            window.chartManager.updateMetrics(metrics);
        }
        
        // Update status indicators
        document.getElementById('cpu-value').textContent = `${metrics.cpu.toFixed(1)}%`;
        document.getElementById('memory-value').textContent = `${metrics.memory.used} MB`;
        document.getElementById('task-rate-value').textContent = `${metrics.taskRate}/min`;
        document.getElementById('error-rate-value').textContent = `${metrics.errorRate.toFixed(2)}%`;
    }
    
    handleTaskUpdate(task) {
        if (window.tableManager) {
            window.tableManager.updateTask(task);
        }
        
        // Update queue statistics
        this.updateQueueStats();
    }
    
    handleErrorLog(error) {
        if (window.tableManager) {
            window.tableManager.addError(error);
        }
        
        // Update error counts
        this.updateErrorCounts();
    }
    
    handleAgentStatus(agent) {
        if (window.tableManager) {
            window.tableManager.updateAgent(agent);
        }
        
        // Update connected agents count
        this.updateConnectedAgentsCount();
    }
    
    handleLogEntry(logEntry) {
        if (window.dashboardController) {
            window.dashboardController.addLogEntry(logEntry);
        }
    }
    
    handleHeartbeat(data) {
        // Keep connection alive
        this.lastHeartbeat = Date.now();
    }
    
    subscribe(channels) {
        if (this.isConnected()) {
            this.send({
                type: 'subscribe',
                channels: channels
            });
        }
    }
    
    unsubscribe(channels) {
        if (this.isConnected()) {
            this.send({
                type: 'unsubscribe',
                channels: channels
            });
        }
    }
    
    send(data) {
        if (this.isConnected()) {
            try {
                this.ws.send(JSON.stringify(data));
            } catch (error) {
                console.error('Error sending WebSocket message:', error);
            }
        } else {
            console.warn('Cannot send message: WebSocket not connected');
        }
    }
    
    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }
    
    addMessageHandler(type, handler) {
        if (!this.messageHandlers.has(type)) {
            this.messageHandlers.set(type, []);
        }
        this.messageHandlers.get(type).push(handler);
    }
    
    removeMessageHandler(type, handler) {
        if (this.messageHandlers.has(type)) {
            const handlers = this.messageHandlers.get(type);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }
    
    scheduleReconnect() {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(() => {
            this.connect();
        }, delay);
    }
    
    handleConnectionError() {
        this.isConnecting = false;
        this.updateConnectionStatus(false);
        this.scheduleReconnect();
    }
    
    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('system-status');
        if (statusElement) {
            statusElement.textContent = connected ? 'Online' : 'Offline';
            statusElement.className = `status-value ${connected ? 'online' : 'offline'}`;
        }
    }
    
    updateLastUpdateTime(timestamp) {
        const lastUpdateElement = document.getElementById('last-update');
        if (lastUpdateElement) {
            const time = new Date(timestamp || Date.now());
            lastUpdateElement.textContent = time.toLocaleTimeString();
        }
    }
    
    updateQueueStats() {
        if (window.tableManager && window.tableManager.taskTable) {
            const data = window.tableManager.taskTable.getData();
            const stats = {
                pending: data.filter(task => task.status === 'pending').length,
                processing: data.filter(task => task.status === 'processing').length,
                completed: data.filter(task => task.status === 'completed').length,
                failed: data.filter(task => task.status === 'failed').length
            };
            
            document.getElementById('pending-tasks').textContent = stats.pending;
            document.getElementById('processing-tasks').textContent = stats.processing;
            document.getElementById('completed-tasks').textContent = stats.completed;
            document.getElementById('failed-tasks').textContent = stats.failed;
        }
    }
    
    updateErrorCounts() {
        if (window.tableManager && window.tableManager.errorTable) {
            const data = window.tableManager.errorTable.getData();
            const counts = {
                critical: data.filter(error => error.level === 'critical').length,
                warning: data.filter(error => error.level === 'warning').length,
                info: data.filter(error => error.level === 'info').length
            };
            
            document.getElementById('critical-errors').textContent = counts.critical;
            document.getElementById('warning-errors').textContent = counts.warning;
            document.getElementById('info-errors').textContent = counts.info;
        }
    }
    
    updateConnectedAgentsCount() {
        if (window.tableManager && window.tableManager.agentTable) {
            const data = window.tableManager.agentTable.getData();
            const connectedCount = data.filter(agent => agent.status === 'online').length;
            document.getElementById('connected-agents').textContent = connectedCount;
        }
    }
    
    setupHeartbeat() {
        // Send heartbeat every 30 seconds
        setInterval(() => {
            if (this.isConnected()) {
                this.send({ type: 'heartbeat', timestamp: Date.now() });
            }
        }, 30000);
        
        // Check for missed heartbeats
        setInterval(() => {
            const now = Date.now();
            if (this.lastHeartbeat && (now - this.lastHeartbeat > 60000)) {
                console.warn('Heartbeat timeout, attempting reconnection');
                this.ws.close();
            }
        }, 60000);
    }
    
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connectionState = 'disconnected';
        this.updateConnectionStatus(false);
    }
    
    // Request specific data
    requestSystemMetrics() {
        this.send({ type: 'request_system_metrics' });
    }
    
    requestTaskQueue() {
        this.send({ type: 'request_task_queue' });
    }
    
    requestErrorLog() {
        this.send({ type: 'request_error_log' });
    }
    
    requestAgentStatus() {
        this.send({ type: 'request_agent_status' });
    }
    
    // Control commands
    pauseQueue() {
        this.send({ type: 'pause_queue' });
    }
    
    resumeQueue() {
        this.send({ type: 'resume_queue' });
    }
    
    clearCompletedTasks() {
        this.send({ type: 'clear_completed_tasks' });
    }
    
    retryFailedTasks() {
        this.send({ type: 'retry_failed_tasks' });
    }
    
    clearErrors() {
        this.send({ type: 'clear_errors' });
    }
    
    restartAgent(agentId) {
        this.send({ type: 'restart_agent', agentId });
    }
    
    restartAllAgents() {
        this.send({ type: 'restart_all_agents' });
    }
}

// Export for use in other modules
window.WebSocketClient = WebSocketClient;