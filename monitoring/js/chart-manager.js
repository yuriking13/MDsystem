/**
 * Chart Manager for Performance Metrics Visualization
 */
class ChartManager {
    constructor() {
        this.charts = {};
        this.maxDataPoints = 50;
        this.updateInterval = 1000; // 1 second
        
        this.initializeCharts();
    }
    
    initializeCharts() {
        this.createCpuChart();
        this.createMemoryChart();
        this.createTaskRateChart();
        this.createErrorRateChart();
    }
    
    createCpuChart() {
        const ctx = document.getElementById('cpu-chart').getContext('2d');
        
        this.charts.cpu = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [0, 100],
                    backgroundColor: ['#4299e1', '#2d3748'],
                    borderWidth: 0,
                    circumference: 180,
                    rotation: 270
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false
                    }
                },
                animation: {
                    animateRotate: true,
                    duration: 750
                }
            }
        });
    }
    
    createMemoryChart() {
        const ctx = document.getElementById('memory-chart').getContext('2d');
        
        this.charts.memory = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Memory Usage',
                    data: [],
                    borderColor: '#48bb78',
                    backgroundColor: 'rgba(72, 187, 120, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        display: false,
                        min: 0
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(26, 32, 44, 0.9)',
                        titleColor: '#f7fafc',
                        bodyColor: '#e2e8f0',
                        borderColor: '#4a5568',
                        borderWidth: 1
                    }
                },
                elements: {
                    point: {
                        radius: 0,
                        hoverRadius: 4
                    }
                },
                animation: {
                    duration: 0
                }
            }
        });
    }
    
    createTaskRateChart() {
        const ctx = document.getElementById('task-rate-chart').getContext('2d');
        
        this.charts.taskRate = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Tasks/min',
                    data: [],
                    backgroundColor: 'rgba(237, 137, 54, 0.7)',
                    borderColor: '#ed8936',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        display: false,
                        min: 0
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(26, 32, 44, 0.9)',
                        titleColor: '#f7fafc',
                        bodyColor: '#e2e8f0',
                        borderColor: '#4a5568',
                        borderWidth: 1
                    }
                },
                animation: {
                    duration: 300
                }
            }
        });
    }
    
    createErrorRateChart() {
        const ctx = document.getElementById('error-rate-chart').getContext('2d');
        
        this.charts.errorRate = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [0, 100],
                    backgroundColor: ['#f56565', '#2d3748'],
                    borderWidth: 0,
                    circumference: 180,
                    rotation: 270
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false
                    }
                },
                animation: {
                    animateRotate: true,
                    duration: 750
                }
            }
        });
    }
    
    updateMetrics(metrics) {
        this.updateCpuChart(metrics.cpu);
        this.updateMemoryChart(metrics.memory);
        this.updateTaskRateChart(metrics.taskRate);
        this.updateErrorRateChart(metrics.errorRate);
    }
    
    updateCpuChart(cpuUsage) {
        if (this.charts.cpu) {
            this.charts.cpu.data.datasets[0].data = [cpuUsage, 100 - cpuUsage];
            this.charts.cpu.update('none');
        }
    }
    
    updateMemoryChart(memoryData) {
        if (this.charts.memory) {
            const chart = this.charts.memory;
            const now = new Date().toLocaleTimeString();
            
            // Add new data point
            chart.data.labels.push(now);
            chart.data.datasets[0].data.push(memoryData.used);
            
            // Remove old data points if we have too many
            if (chart.data.labels.length > this.maxDataPoints) {
                chart.data.labels.shift();
                chart.data.datasets[0].data.shift();
            }
            
            // Update chart scale
            const maxMemory = Math.max(...chart.data.datasets[0].data);
            chart.options.scales.y.max = Math.ceil(maxMemory * 1.1);
            
            chart.update('none');
        }
    }
    
    updateTaskRateChart(taskRate) {
        if (this.charts.taskRate) {
            const chart = this.charts.taskRate;
            const now = new Date().toLocaleTimeString();
            
            // Add new data point
            chart.data.labels.push(now);
            chart.data.datasets[0].data.push(taskRate);
            
            // Remove old data points if we have too many
            if (chart.data.labels.length > 20) { // Shorter history for bar chart
                chart.data.labels.shift();
                chart.data.datasets[0].data.shift();
            }
            
            chart.update('none');
        }
    }
    
    updateErrorRateChart(errorRate) {
        if (this.charts.errorRate) {
            this.charts.errorRate.data.datasets[0].data = [errorRate, 100 - errorRate];
            this.charts.errorRate.update('none');
        }
    }
    
    // Create a comprehensive performance trend chart
    createPerformanceTrendChart(containerId) {
        const ctx = document.getElementById(containerId).getContext('2d');
        
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'CPU Usage (%)',
                        data: [],
                        borderColor: '#4299e1',
                        backgroundColor: 'rgba(66, 153, 225, 0.1)',
                        borderWidth: 2,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Memory Usage (MB)',
                        data: [],
                        borderColor: '#48bb78',
                        backgroundColor: 'rgba(72, 187, 120, 0.1)',
                        borderWidth: 2,
                        yAxisID: 'y1'
                    },
                    {
                        label: 'Task Rate (/min)',
                        data: [],
                        borderColor: '#ed8936',
                        backgroundColor: 'rgba(237, 137, 54, 0.1)',
                        borderWidth: 2,
                        yAxisID: 'y2'
                    },
                    {
                        label: 'Error Rate (%)',
                        data: [],
                        borderColor: '#f56565',
                        backgroundColor: 'rgba(245, 101, 101, 0.1)',
                        borderWidth: 2,
                        yAxisID: 'y'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            color: '#2d3748'
                        },
                        ticks: {
                            color: '#a0aec0'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        grid: {
                            color: '#2d3748'
                        },
                        ticks: {
                            color: '#a0aec0'
                        },
                        title: {
                            display: true,
                            text: 'Percentage (%)',
                            color: '#cbd5e0'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false
                        },
                        ticks: {
                            color: '#a0aec0'
                        },
                        title: {
                            display: true,
                            text: 'Memory (MB)',
                            color: '#cbd5e0'
                        }
                    },
                    y2: {
                        type: 'linear',
                        display: false,
                        position: 'right'
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#e2e8f0',
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(26, 32, 44, 0.9)',
                        titleColor: '#f7fafc',
                        bodyColor: '#e2e8f0',
                        borderColor: '#4a5568',
                        borderWidth: 1,
                        cornerRadius: 6,
                        displayColors: true,
                        mode: 'index',
                        intersect: false
                    }
                },
                elements: {
                    point: {
                        radius: 3,
                        hoverRadius: 6
                    },
                    line: {
                        tension: 0.3
                    }
                },
                animation: {
                    duration: 750,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }
    
    // Update all charts with historical data
    loadHistoricalData(data) {
        data.forEach((point, index) => {
            const timestamp = new Date(point.timestamp).toLocaleTimeString();
            
            // Update memory chart
            if (this.charts.memory) {
                this.charts.memory.data.labels.push(timestamp);
                this.charts.memory.data.datasets[0].data.push(point.memory.used);
            }
            
            // Update task rate chart
            if (this.charts.taskRate) {
                this.charts.taskRate.data.labels.push(timestamp);
                this.charts.taskRate.data.datasets[0].data.push(point.taskRate);
            }
        });
        
        // Update all charts
        Object.values(this.charts).forEach(chart => {
            chart.update('none');
        });
    }
    
    // Get chart data for export
    getChartData(chartName) {
        if (this.charts[chartName]) {
            return {
                labels: this.charts[chartName].data.labels,
                datasets: this.charts[chartName].data.datasets.map(dataset => ({
                    label: dataset.label,
                    data: [...dataset.data]
                }))
            };
        }
        return null;
    }
    
    // Reset all charts
    resetCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart.data.labels) {
                chart.data.labels.length = 0;
                chart.data.datasets.forEach(dataset => {
                    if (dataset.data) {
                        dataset.data.length = 0;
                    }
                });
            }
            chart.update('none');
        });
    }
    
    // Destroy all charts (cleanup)
    destroy() {
        Object.values(this.charts).forEach(chart => {
            chart.destroy();
        });
        this.charts = {};
    }
}

// Export for use in other modules
window.ChartManager = ChartManager;