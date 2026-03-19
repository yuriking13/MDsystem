/**
 * Dashboard Controller - Main orchestrator for the monitoring dashboard
 */
class DashboardController {
    constructor() {
        this.isInitialized = false;
        this.logBuffer = [];
        this.maxLogEntries = 1000;
        this.logPaused = false;
        this.autoRefreshInterval = null;
        this.autoRefreshDelay = 30000; // 30 seconds
        
        this.init();
    }
    
    init() {
        if (this.isInitialized) return;
        
        this.setupEventHandlers();
        this.startAutoRefresh();
        this.loadInitialData();
        
        this.isInitialized = true;
        console.log('Dashboard Controller initialized');
    }
    
    setupEventHandlers() {
        // Error handling system controls
        document.getElementById('clear-errors').addEventListener('click', () => {
            this.clearErrors();
        });
        
        document.getElementById('export-errors').addEventListener('click', () => {
            this.exportErrors();
        });
        
        // Agent status controls
        document.getElementById('refresh-agents').addEventListener('click', () => {
            this.refreshAgents();
        });
        
        document.getElementById('restart-all').addEventListener('click', () => {
            this.restartAllAgents();
        });
        
        // Log controls
        document.getElementById('log-level').addEventListener('change', (e) => {
            this.filterLogs(e.target.value);
        });
        
        document.getElementById('clear-logs').addEventListener('click', () => {
            this.clearLogs();
        });
        
        document.getElementById('pause-logs').addEventListener('click', () => {
            this.toggleLogPause();
        });
        
        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Window events
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        window.addEventListener('focus', () => {
            this.onWindowFocus();
        });
        
        window.addEventListener('blur', () => {
            this.onWindowBlur();
        });
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+R: Refresh all data
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                this.refreshAllData();
            }
            
            // Ctrl+L: Clear logs
            if (e.ctrlKey && e.key === 'l') {
                e.preventDefault();
                this.clearLogs();
            }
            
            // Escape: Close any open modals
            if (e.key === 'Escape') {
                const modal = document.getElementById('detail-modal');
                if (modal && modal.style.display === 'block') {
                    modal.style.display = 'none';
                }
            }
            
            // Ctrl+E: Export current view data
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                this.showExportDialog();
            }
        });
    }
    
    loadInitialData() {
        // Request initial data from WebSocket
        setTimeout(() => {
            if (window.wsClient && window.wsClient.isConnected()) {
                window.wsClient.requestSystemMetrics();
                window.wsClient.requestTaskQueue();
                window.wsClient.requestErrorLog();
                window.wsClient.requestAgentStatus();
            }
        }, 1000);
    }
    
    addLogEntry(logEntry) {
        if (this.logPaused) return;
        
        // Add to buffer
        this.logBuffer.unshift(logEntry);
        
        // Trim buffer if too large
        if (this.logBuffer.length > this.maxLogEntries) {
            this.logBuffer = this.logBuffer.slice(0, this.maxLogEntries);
        }
        
        // Filter and display
        this.updateLogDisplay();
    }
    
    updateLogDisplay() {
        const container = document.getElementById('log-container');
        if (!container) return;
        
        const filter = document.getElementById('log-level').value;
        const filteredLogs = this.filterLogsByLevel(this.logBuffer, filter);
        
        // Show only the last 100 entries to avoid performance issues
        const logsToShow = filteredLogs.slice(0, 100);
        
        container.innerHTML = logsToShow.map(log => 
            `<div class="log-entry slide-in">
                <span class="log-timestamp">[${new Date(log.timestamp).toLocaleTimeString()}]</span>
                <span class="log-level ${log.level}">${log.level.toUpperCase()}</span>
                <span class="log-message">${this.escapeHtml(log.message)}</span>
            </div>`
        ).join('');
        
        // Auto-scroll to top for new entries (if user hasn't scrolled manually)
        if (container.scrollTop < 50) {
            container.scrollTop = 0;
        }
    }
    
    filterLogsByLevel(logs, level) {
        if (level === 'all') return logs;
        
        const levelPriority = {
            'debug': 0,
            'info': 1,
            'warning': 2,
            'error': 3,
            'critical': 4
        };
        
        const minPriority = levelPriority[level] || 0;
        return logs.filter(log => (levelPriority[log.level] || 0) >= minPriority);
    }
    
    filterLogs(level) {
        this.updateLogDisplay();
    }
    
    clearLogs() {
        this.logBuffer = [];
        document.getElementById('log-container').innerHTML = 
            '<div class="log-entry"><span class="log-message" style="color: #a0aec0;">Log cleared</span></div>';
    }
    
    toggleLogPause() {
        this.logPaused = !this.logPaused;
        const button = document.getElementById('pause-logs');
        
        if (this.logPaused) {
            button.textContent = 'Resume';
            button.classList.remove('btn-warning');
            button.classList.add('btn-primary');
        } else {
            button.textContent = 'Pause';
            button.classList.remove('btn-primary');
            button.classList.add('btn-warning');
        }
    }
    
    clearErrors() {
        if (confirm('Are you sure you want to clear all error logs?')) {
            if (window.tableManager && window.tableManager.errorTable) {
                window.tableManager.errorTable.clearData();
            }
            
            if (window.wsClient) {
                window.wsClient.clearErrors();
            }
            
            // Reset error counts
            document.getElementById('critical-errors').textContent = '0';
            document.getElementById('warning-errors').textContent = '0';
            document.getElementById('info-errors').textContent = '0';
        }
    }
    
    exportErrors() {
        if (window.tableManager && window.tableManager.errorTable) {
            const data = window.tableManager.errorTable.getData();
            const csv = this.convertToCSV(data);
            this.downloadFile(csv, 'error_log_export.csv', 'text/csv');
        }
    }
    
    refreshAgents() {
        if (window.wsClient) {
            window.wsClient.requestAgentStatus();
        }
    }
    
    restartAllAgents() {
        if (confirm('Are you sure you want to restart all agents? This will interrupt any running tasks.')) {
            if (window.wsClient) {
                window.wsClient.restartAllAgents();
            }
        }
    }
    
    refreshAllData() {
        if (window.wsClient && window.wsClient.isConnected()) {
            window.wsClient.requestSystemMetrics();
            window.wsClient.requestTaskQueue();
            window.wsClient.requestErrorLog();
            window.wsClient.requestAgentStatus();
            
            // Show refresh indicator
            this.showNotification('Data refreshed', 'success');
        } else {
            this.showNotification('WebSocket not connected', 'error');
        }
    }
    
    showExportDialog() {
        const modal = this.createExportModal();
        modal.style.display = 'block';
    }
    
    createExportModal() {
        let modal = document.getElementById('export-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'export-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Export Data</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="export-options">
                            <h3>Select Data to Export:</h3>
                            <label><input type="checkbox" id="export-tasks" checked> Task Queue</label>
                            <label><input type="checkbox" id="export-errors" checked> Error Log</label>
                            <label><input type="checkbox" id="export-agents" checked> Agent Status</label>
                            <label><input type="checkbox" id="export-metrics"> Performance Metrics</label>
                        </div>
                        <div class="export-format">
                            <h3>Export Format:</h3>
                            <label><input type="radio" name="format" value="json" checked> JSON</label>
                            <label><input type="radio" name="format" value="csv"> CSV</label>
                            <label><input type="radio" name="format" value="xlsx"> Excel</label>
                        </div>
                        <div class="export-actions">
                            <button id="export-confirm" class="btn btn-primary">Export</button>
                            <button id="export-cancel" class="btn btn-secondary">Cancel</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Add export modal styles
            this.addExportModalStyles();
            
            // Event handlers
            modal.querySelector('.modal-close').addEventListener('click', () => {
                modal.style.display = 'none';
            });
            
            modal.querySelector('#export-cancel').addEventListener('click', () => {
                modal.style.display = 'none';
            });
            
            modal.querySelector('#export-confirm').addEventListener('click', () => {
                this.performExport();
                modal.style.display = 'none';
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }
        
        return modal;
    }
    
    addExportModalStyles() {
        if (!document.getElementById('export-modal-styles')) {
            const styles = document.createElement('style');
            styles.id = 'export-modal-styles';
            styles.textContent = `
                .export-options, .export-format {
                    margin-bottom: 1.5rem;
                }
                
                .export-options h3, .export-format h3 {
                    color: #f7fafc;
                    font-size: 1rem;
                    margin-bottom: 0.75rem;
                }
                
                .export-options label, .export-format label {
                    display: block;
                    margin-bottom: 0.5rem;
                    color: #e2e8f0;
                    cursor: pointer;
                }
                
                .export-options input, .export-format input {
                    margin-right: 0.5rem;
                }
                
                .export-actions {
                    display: flex;
                    gap: 0.75rem;
                    justify-content: flex-end;
                    border-top: 1px solid #2d3748;
                    padding-top: 1rem;
                }
            `;
            document.head.appendChild(styles);
        }
    }
    
    performExport() {
        const exportData = {};
        const format = document.querySelector('input[name="format"]:checked').value;
        
        // Collect selected data
        if (document.getElementById('export-tasks').checked && window.tableManager.taskTable) {
            exportData.tasks = window.tableManager.taskTable.getData();
        }
        
        if (document.getElementById('export-errors').checked && window.tableManager.errorTable) {
            exportData.errors = window.tableManager.errorTable.getData();
        }
        
        if (document.getElementById('export-agents').checked && window.tableManager.agentTable) {
            exportData.agents = window.tableManager.agentTable.getData();
        }
        
        if (document.getElementById('export-metrics').checked && window.chartManager) {
            exportData.metrics = {
                cpu: window.chartManager.getChartData('cpu'),
                memory: window.chartManager.getChartData('memory'),
                taskRate: window.chartManager.getChartData('taskRate'),
                errorRate: window.chartManager.getChartData('errorRate')
            };
        }
        
        // Export in selected format
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `dashboard_export_${timestamp}`;
        
        switch (format) {
            case 'csv':
                this.exportAsCSV(exportData, filename);
                break;
            case 'xlsx':
                this.exportAsExcel(exportData, filename);
                break;
            case 'json':
            default:
                const json = JSON.stringify(exportData, null, 2);
                this.downloadFile(json, `${filename}.json`, 'application/json');
        }
        
        this.showNotification('Export completed', 'success');
    }
    
    exportAsCSV(data, filename) {
        let csvContent = '';
        
        Object.keys(data).forEach(key => {
            csvContent += `\n\n=== ${key.toUpperCase()} ===\n`;
            csvContent += this.convertToCSV(data[key]);
        });
        
        this.downloadFile(csvContent, `${filename}.csv`, 'text/csv');
    }
    
    exportAsExcel(data, filename) {
        // For Excel export, we'll use CSV format for simplicity
        // In a real implementation, you'd use a library like SheetJS
        this.exportAsCSV(data, filename);
        this.showNotification('Excel export not fully implemented. CSV exported instead.', 'warning');
    }
    
    convertToCSV(data) {
        if (!data || data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value}"`;
                }
                return value;
            });
            csvRows.push(values.join(','));
        });
        
        return csvRows.join('\n');
    }
    
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add notification styles if not exists
        this.addNotificationStyles();
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('notification-show'), 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('notification-show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }
    
    addNotificationStyles() {
        if (!document.getElementById('notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 1rem 1.5rem;
                    border-radius: 6px;
                    color: white;
                    font-weight: 500;
                    z-index: 2000;
                    transform: translateX(400px);
                    opacity: 0;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                }
                
                .notification-show {
                    transform: translateX(0);
                    opacity: 1;
                }
                
                .notification-success {
                    background: #48bb78;
                }
                
                .notification-error {
                    background: #f56565;
                }
                
                .notification-warning {
                    background: #ed8936;
                }
                
                .notification-info {
                    background: #4299e1;
                }
            `;
            document.head.appendChild(styles);
        }
    }
    
    startAutoRefresh() {
        this.autoRefreshInterval = setInterval(() => {
            if (document.hasFocus() && window.wsClient && window.wsClient.isConnected()) {
                window.wsClient.requestSystemMetrics();
            }
        }, this.autoRefreshDelay);
    }
    
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }
    
    onWindowFocus() {
        // Resume auto-refresh when window gains focus
        if (!this.autoRefreshInterval) {
            this.startAutoRefresh();
        }
        
        // Refresh data on focus
        setTimeout(() => {
            this.refreshAllData();
        }, 500);
    }
    
    onWindowBlur() {
        // Optionally stop auto-refresh when window loses focus to save resources
        // this.stopAutoRefresh();
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    cleanup() {
        this.stopAutoRefresh();
    }
    
    // Health check for dashboard components
    healthCheck() {
        const health = {
            websocket: window.wsClient ? window.wsClient.connectionState : 'not_initialized',
            chartManager: window.chartManager ? 'initialized' : 'not_initialized',
            tableManager: window.tableManager ? 'initialized' : 'not_initialized',
            logBuffer: this.logBuffer.length,
            autoRefresh: this.autoRefreshInterval ? 'running' : 'stopped'
        };
        
        console.log('Dashboard Health Check:', health);
        return health;
    }
}

// Export for use in other modules
window.DashboardController = DashboardController;