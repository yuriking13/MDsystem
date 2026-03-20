/**
 * Optimized Table Manager using Tabulator for handling large datasets
 */
class TableManager {
  constructor() {
    this.tables = {};
    this.virtualScrollingEnabled = true;
    this.paginationEnabled = true;
    this.pageSize = 50;

    this.initializeTables();
  }

  initializeTables() {
    this.createTaskQueueTable();
    this.createErrorLogTable();
    this.createAgentStatusTable();
  }

  createTaskQueueTable() {
    this.taskTable = new Tabulator("#task-queue-table", {
      height: "400px",
      layout: "fitColumns",
      pagination: this.paginationEnabled,
      paginationSize: this.pageSize,
      paginationSizeSelector: [25, 50, 100, 200],
      movableColumns: true,
      resizableColumns: true,
      virtualDom: this.virtualScrollingEnabled,
      virtualDomBuffer: 300,
      placeholder: "No tasks in queue",
      selectable: true,
      tooltips: true,
      columns: [
        {
          title: "ID",
          field: "id",
          width: 80,
          frozen: true,
          sorter: "number",
        },
        {
          title: "Task Name",
          field: "name",
          width: 200,
          editor: false,
          formatter: function (cell) {
            const value = cell.getValue();
            const maxLength = 30;
            return value.length > maxLength
              ? value.substring(0, maxLength) + "..."
              : value;
          },
          tooltip: function (cell) {
            return cell.getValue();
          },
        },
        {
          title: "Type",
          field: "type",
          width: 120,
          formatter: function (cell) {
            const value = cell.getValue();
            const typeColors = {
              analysis: "#4299e1",
              processing: "#ed8936",
              validation: "#48bb78",
              export: "#9f7aea",
              cleanup: "#a0aec0",
            };
            const color = typeColors[value] || "#cbd5e0";
            return `<span style="color: ${color}; font-weight: 600;">${value}</span>`;
          },
        },
        {
          title: "Status",
          field: "status",
          width: 110,
          formatter: function (cell) {
            const value = cell.getValue();
            const badgeClass = {
              pending: "pending",
              processing: "processing",
              completed: "success",
              failed: "error",
              cancelled: "error",
            };
            return `<span class="status-badge ${badgeClass[value]}">${value}</span>`;
          },
        },
        {
          title: "Progress",
          field: "progress",
          width: 120,
          formatter: function (cell) {
            const value = cell.getValue() || 0;
            return `<div class="progress-bar">
                                    <div class="progress-fill" style="width: ${value}%"></div>
                                </div>
                                <span style="font-size: 0.75rem; margin-top: 2px; display: block;">${value}%</span>`;
          },
        },
        {
          title: "Agent",
          field: "agent",
          width: 120,
          formatter: function (cell) {
            const value = cell.getValue();
            return value
              ? `<span style="color: #63b3ed;">${value}</span>`
              : "-";
          },
        },
        {
          title: "Created",
          field: "created",
          width: 140,
          sorter: "datetime",
          formatter: function (cell) {
            const date = new Date(cell.getValue());
            return date.toLocaleString();
          },
        },
        {
          title: "Duration",
          field: "duration",
          width: 100,
          formatter: function (cell) {
            const duration = cell.getValue();
            if (!duration) return "-";

            const seconds = Math.floor(duration / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);

            if (hours > 0) return `${hours}h ${minutes % 60}m`;
            if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
            return `${seconds}s`;
          },
        },
        {
          title: "Actions",
          field: "actions",
          width: 120,
          formatter: function (cell) {
            const row = cell.getRow().getData();
            const buttons = [];

            if (row.status === "failed") {
              buttons.push(
                '<button class="btn btn-sm retry-btn" title="Retry">↻</button>',
              );
            }
            if (row.status === "processing") {
              buttons.push(
                '<button class="btn btn-sm cancel-btn" title="Cancel">✕</button>',
              );
            }
            buttons.push(
              '<button class="btn btn-sm view-btn" title="View Details">👁</button>',
            );

            return buttons.join(" ");
          },
          cellClick: function (e, cell) {
            const target = e.target;
            const row = cell.getRow().getData();

            if (target.classList.contains("retry-btn")) {
              window.tableManager.retryTask(row.id);
            } else if (target.classList.contains("cancel-btn")) {
              window.tableManager.cancelTask(row.id);
            } else if (target.classList.contains("view-btn")) {
              window.tableManager.viewTaskDetails(row);
            }
          },
        },
      ],
      initialSort: [{ column: "created", dir: "desc" }],
      groupBy: false,
      groupStartOpen: true,
      groupHeader: function (value, count) {
        return `${value} <span style="color:#a0aec0;">(${count} items)</span>`;
      },
    });

    // Add event listeners for table actions
    this.setupTaskTableEvents();
  }

  createErrorLogTable() {
    this.errorTable = new Tabulator("#error-log-table", {
      height: "300px",
      layout: "fitColumns",
      pagination: true,
      paginationSize: 25,
      movableColumns: true,
      resizableColumns: true,
      virtualDom: true,
      placeholder: "No errors logged",
      selectable: true,
      columns: [
        {
          title: "Time",
          field: "timestamp",
          width: 140,
          sorter: "datetime",
          formatter: function (cell) {
            const date = new Date(cell.getValue());
            return date.toLocaleString();
          },
        },
        {
          title: "Level",
          field: "level",
          width: 90,
          formatter: function (cell) {
            const value = cell.getValue();
            const colors = {
              critical: "#f56565",
              error: "#f56565",
              warning: "#ed8936",
              info: "#4299e1",
              debug: "#48bb78",
            };
            const color = colors[value] || "#cbd5e0";
            return `<span class="log-level ${value}" style="background: ${color};">${value}</span>`;
          },
        },
        {
          title: "Source",
          field: "source",
          width: 120,
          formatter: function (cell) {
            const value = cell.getValue();
            return `<span style="color: #63b3ed;">${value}</span>`;
          },
        },
        {
          title: "Message",
          field: "message",
          minWidth: 200,
          formatter: function (cell) {
            const value = cell.getValue();
            const maxLength = 80;
            return value.length > maxLength
              ? value.substring(0, maxLength) + "..."
              : value;
          },
          tooltip: function (cell) {
            return cell.getValue();
          },
        },
        {
          title: "Count",
          field: "count",
          width: 70,
          formatter: function (cell) {
            const value = cell.getValue() || 1;
            return value > 1
              ? `<span style="color: #ed8936; font-weight: 600;">${value}</span>`
              : value;
          },
        },
        {
          title: "Actions",
          field: "actions",
          width: 100,
          formatter: function () {
            return '<button class="btn btn-sm view-btn" title="View Stack Trace">📋</button>';
          },
          cellClick: function (e, cell) {
            if (e.target.classList.contains("view-btn")) {
              const row = cell.getRow().getData();
              window.tableManager.viewErrorDetails(row);
            }
          },
        },
      ],
      initialSort: [{ column: "timestamp", dir: "desc" }],
    });
  }

  createAgentStatusTable() {
    this.agentTable = new Tabulator("#agent-status-table", {
      height: "300px",
      layout: "fitColumns",
      pagination: false,
      movableColumns: true,
      resizableColumns: true,
      placeholder: "No agents connected",
      selectable: true,
      columns: [
        {
          title: "Agent ID",
          field: "id",
          width: 120,
          frozen: true,
        },
        {
          title: "Name",
          field: "name",
          width: 150,
          formatter: function (cell) {
            const value = cell.getValue();
            return `<span style="color: #f7fafc; font-weight: 600;">${value}</span>`;
          },
        },
        {
          title: "Status",
          field: "status",
          width: 100,
          formatter: function (cell) {
            const value = cell.getValue();
            const badgeClass = {
              online: "success",
              offline: "error",
              busy: "warning",
              idle: "pending",
            };
            return `<span class="status-badge ${badgeClass[value]}">${value}</span>`;
          },
        },
        {
          title: "Tasks",
          field: "activeTasks",
          width: 80,
          formatter: function (cell) {
            const value = cell.getValue() || 0;
            return value > 0
              ? `<span style="color: #ed8936; font-weight: 600;">${value}</span>`
              : value;
          },
        },
        {
          title: "CPU",
          field: "cpu",
          width: 80,
          formatter: function (cell) {
            const value = cell.getValue() || 0;
            const color =
              value > 80 ? "#f56565" : value > 60 ? "#ed8936" : "#48bb78";
            return `<span style="color: ${color};">${value.toFixed(1)}%</span>`;
          },
        },
        {
          title: "Memory",
          field: "memory",
          width: 100,
          formatter: function (cell) {
            const value = cell.getValue() || 0;
            return `${value} MB`;
          },
        },
        {
          title: "Last Seen",
          field: "lastSeen",
          width: 140,
          formatter: function (cell) {
            const date = new Date(cell.getValue());
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);

            if (diffMins < 1) return "Just now";
            if (diffMins < 60) return `${diffMins}m ago`;
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `${diffHours}h ago`;
            return date.toLocaleDateString();
          },
        },
        {
          title: "Actions",
          field: "actions",
          width: 120,
          formatter: function () {
            return (
              '<button class="btn btn-sm restart-btn" title="Restart Agent">↻</button> ' +
              '<button class="btn btn-sm details-btn" title="View Details">📊</button>'
            );
          },
          cellClick: function (e, cell) {
            const target = e.target;
            const row = cell.getRow().getData();

            if (target.classList.contains("restart-btn")) {
              window.tableManager.restartAgent(row.id);
            } else if (target.classList.contains("details-btn")) {
              window.tableManager.viewAgentDetails(row);
            }
          },
        },
      ],
    });
  }

  setupTaskTableEvents() {
    // Set up queue control buttons
    document.getElementById("pause-queue").addEventListener("click", () => {
      if (window.wsClient) {
        window.wsClient.pauseQueue();
      }
    });

    document.getElementById("clear-completed").addEventListener("click", () => {
      if (window.wsClient) {
        window.wsClient.clearCompletedTasks();
      }
    });

    document.getElementById("retry-failed").addEventListener("click", () => {
      if (window.wsClient) {
        window.wsClient.retryFailedTasks();
      }
    });
  }

  // Task management methods
  updateTask(task) {
    if (this.taskTable) {
      const existingRow = this.taskTable.getRow(task.id);
      if (existingRow) {
        existingRow.update(task);
      } else {
        this.taskTable.addData([task], false);
      }
    }
  }

  addError(error) {
    if (this.errorTable) {
      // Check if similar error exists and increment count
      const existingData = this.errorTable.getData();
      const similar = existingData.find(
        (e) =>
          e.level === error.level &&
          e.source === error.source &&
          e.message === error.message,
      );

      if (similar) {
        similar.count = (similar.count || 1) + 1;
        similar.timestamp = error.timestamp;
        this.errorTable.updateData([similar]);
      } else {
        error.count = 1;
        this.errorTable.addData([error], false);
      }
    }
  }

  updateAgent(agent) {
    if (this.agentTable) {
      const existingRow = this.agentTable.getRow(agent.id);
      if (existingRow) {
        existingRow.update(agent);
      } else {
        this.agentTable.addData([agent], false);
      }
    }
  }

  // Action handlers
  retryTask(taskId) {
    if (window.wsClient) {
      window.wsClient.send({
        type: "retry_task",
        taskId: taskId,
      });
    }
  }

  cancelTask(taskId) {
    if (confirm("Are you sure you want to cancel this task?")) {
      if (window.wsClient) {
        window.wsClient.send({
          type: "cancel_task",
          taskId: taskId,
        });
      }
    }
  }

  restartAgent(agentId) {
    if (confirm("Are you sure you want to restart this agent?")) {
      if (window.wsClient) {
        window.wsClient.restartAgent(agentId);
      }
    }
  }

  // Detail viewers
  viewTaskDetails(task) {
    this.showModal("Task Details", this.renderTaskDetails(task));
  }

  viewErrorDetails(error) {
    this.showModal("Error Details", this.renderErrorDetails(error));
  }

  viewAgentDetails(agent) {
    this.showModal("Agent Details", this.renderAgentDetails(agent));
  }

  renderTaskDetails(task) {
    return `
            <div class="detail-view">
                <h3>${task.name}</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>ID:</label>
                        <span>${task.id}</span>
                    </div>
                    <div class="detail-item">
                        <label>Type:</label>
                        <span>${task.type}</span>
                    </div>
                    <div class="detail-item">
                        <label>Status:</label>
                        <span class="status-badge ${task.status}">${task.status}</span>
                    </div>
                    <div class="detail-item">
                        <label>Progress:</label>
                        <span>${task.progress || 0}%</span>
                    </div>
                    <div class="detail-item">
                        <label>Agent:</label>
                        <span>${task.agent || "Unassigned"}</span>
                    </div>
                    <div class="detail-item">
                        <label>Created:</label>
                        <span>${new Date(task.created).toLocaleString()}</span>
                    </div>
                    <div class="detail-item">
                        <label>Duration:</label>
                        <span>${this.formatDuration(task.duration)}</span>
                    </div>
                </div>
                <div class="detail-section">
                    <label>Description:</label>
                    <pre>${task.description || "No description available"}</pre>
                </div>
                <div class="detail-section">
                    <label>Parameters:</label>
                    <pre>${JSON.stringify(task.parameters || {}, null, 2)}</pre>
                </div>
                ${
                  task.error
                    ? `
                    <div class="detail-section">
                        <label>Error:</label>
                        <pre style="color: #f56565;">${task.error}</pre>
                    </div>
                `
                    : ""
                }
            </div>
        `;
  }

  renderErrorDetails(error) {
    return `
            <div class="detail-view">
                <h3>Error Details</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Level:</label>
                        <span class="log-level ${error.level}">${error.level}</span>
                    </div>
                    <div class="detail-item">
                        <label>Source:</label>
                        <span>${error.source}</span>
                    </div>
                    <div class="detail-item">
                        <label>Time:</label>
                        <span>${new Date(error.timestamp).toLocaleString()}</span>
                    </div>
                    <div class="detail-item">
                        <label>Count:</label>
                        <span>${error.count || 1}</span>
                    </div>
                </div>
                <div class="detail-section">
                    <label>Message:</label>
                    <pre>${error.message}</pre>
                </div>
                ${
                  error.stack
                    ? `
                    <div class="detail-section">
                        <label>Stack Trace:</label>
                        <pre style="color: #a0aec0; font-size: 0.8rem;">${error.stack}</pre>
                    </div>
                `
                    : ""
                }
                ${
                  error.context
                    ? `
                    <div class="detail-section">
                        <label>Context:</label>
                        <pre>${JSON.stringify(error.context, null, 2)}</pre>
                    </div>
                `
                    : ""
                }
            </div>
        `;
  }

  renderAgentDetails(agent) {
    return `
            <div class="detail-view">
                <h3>${agent.name}</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>ID:</label>
                        <span>${agent.id}</span>
                    </div>
                    <div class="detail-item">
                        <label>Status:</label>
                        <span class="status-badge ${agent.status}">${agent.status}</span>
                    </div>
                    <div class="detail-item">
                        <label>Active Tasks:</label>
                        <span>${agent.activeTasks || 0}</span>
                    </div>
                    <div class="detail-item">
                        <label>CPU Usage:</label>
                        <span>${(agent.cpu || 0).toFixed(1)}%</span>
                    </div>
                    <div class="detail-item">
                        <label>Memory Usage:</label>
                        <span>${agent.memory || 0} MB</span>
                    </div>
                    <div class="detail-item">
                        <label>Last Seen:</label>
                        <span>${new Date(agent.lastSeen).toLocaleString()}</span>
                    </div>
                </div>
                ${
                  agent.capabilities
                    ? `
                    <div class="detail-section">
                        <label>Capabilities:</label>
                        <div class="capabilities-list">
                            ${agent.capabilities.map((cap) => `<span class="capability-tag">${cap}</span>`).join("")}
                        </div>
                    </div>
                `
                    : ""
                }
                ${
                  agent.stats
                    ? `
                    <div class="detail-section">
                        <label>Statistics:</label>
                        <pre>${JSON.stringify(agent.stats, null, 2)}</pre>
                    </div>
                `
                    : ""
                }
            </div>
        `;
  }

  showModal(title, content) {
    // Create modal if it doesn't exist
    let modal = document.getElementById("detail-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "detail-modal";
      modal.className = "modal";
      modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="modal-title"></h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body" id="modal-body"></div>
                </div>
            `;
      document.body.appendChild(modal);

      // Add modal styles
      this.addModalStyles();

      // Close modal handlers
      modal.querySelector(".modal-close").addEventListener("click", () => {
        modal.style.display = "none";
      });

      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          modal.style.display = "none";
        }
      });
    }

    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-body").innerHTML = content;
    modal.style.display = "block";
  }

  addModalStyles() {
    if (!document.getElementById("modal-styles")) {
      const styles = document.createElement("style");
      styles.id = "modal-styles";
      styles.textContent = `
                .modal {
                    display: none;
                    position: fixed;
                    z-index: 1000;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(4px);
                }
                
                .modal-content {
                    background-color: #1a202c;
                    margin: 5% auto;
                    border: 1px solid #2d3748;
                    border-radius: 12px;
                    width: 80%;
                    max-width: 800px;
                    max-height: 80vh;
                    overflow: hidden;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                }
                
                .modal-header {
                    background: #2d3748;
                    padding: 1rem;
                    border-bottom: 1px solid #4a5568;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .modal-header h2 {
                    color: #f7fafc;
                    margin: 0;
                    font-size: 1.25rem;
                }
                
                .modal-close {
                    background: none;
                    border: none;
                    color: #a0aec0;
                    font-size: 1.5rem;
                    cursor: pointer;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .modal-close:hover {
                    color: #f7fafc;
                }
                
                .modal-body {
                    padding: 1.5rem;
                    max-height: 60vh;
                    overflow-y: auto;
                    color: #e2e8f0;
                }
                
                .detail-view h3 {
                    color: #f7fafc;
                    margin-bottom: 1rem;
                    font-size: 1.125rem;
                }
                
                .detail-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 0.75rem;
                    margin-bottom: 1.5rem;
                }
                
                .detail-item {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }
                
                .detail-item label {
                    font-size: 0.875rem;
                    color: #a0aec0;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .detail-section {
                    margin-bottom: 1.5rem;
                }
                
                .detail-section label {
                    display: block;
                    font-size: 0.875rem;
                    color: #a0aec0;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 0.5rem;
                }
                
                .detail-section pre {
                    background: #000;
                    border: 1px solid #2d3748;
                    border-radius: 4px;
                    padding: 1rem;
                    color: #e2e8f0;
                    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                    font-size: 0.875rem;
                    overflow-x: auto;
                    white-space: pre-wrap;
                }
                
                .capabilities-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }
                
                .capability-tag {
                    background: #4299e1;
                    color: white;
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }
            `;
      document.head.appendChild(styles);
    }
  }

  formatDuration(duration) {
    if (!duration) return "-";

    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  // Export table data
  exportTableData(tableName, format = "json") {
    const table = this.tables[tableName] || this[tableName + "Table"];
    if (!table) return null;

    const data = table.getData();

    switch (format) {
      case "csv":
        return table.download("csv", `${tableName}_export.csv`);
      case "xlsx":
        return table.download("xlsx", `${tableName}_export.xlsx`);
      case "json":
      default:
        return JSON.stringify(data, null, 2);
    }
  }

  // Refresh table data
  refreshTable(tableName) {
    const table = this[tableName + "Table"];
    if (table && window.wsClient) {
      switch (tableName) {
        case "task":
          window.wsClient.requestTaskQueue();
          break;
        case "error":
          window.wsClient.requestErrorLog();
          break;
        case "agent":
          window.wsClient.requestAgentStatus();
          break;
      }
    }
  }

  // Clear table data
  clearTable(tableName) {
    const table = this[tableName + "Table"];
    if (table) {
      table.clearData();
    }
  }
}

// Export for use in other modules
window.TableManager = TableManager;
