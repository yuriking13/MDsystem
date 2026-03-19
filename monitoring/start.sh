#!/bin/bash

# Agent Monitoring Dashboard - Start Script
# Скрипт запуска системы мониторинга агентов

set -e

echo "🚀 Agent Monitoring Dashboard"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js (v16 or higher)"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js version 16 or higher is required. Current version: $(node --version)"
    exit 1
fi

print_success "Node.js $(node --version) detected"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    print_error "npm is not available"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the monitoring directory."
    exit 1
fi

print_status "Checking dependencies..."

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        print_success "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
else
    print_status "Dependencies already installed"
fi

# Check if port is available
PORT=${PORT:-3001}
if lsof -i :$PORT > /dev/null 2>&1; then
    print_warning "Port $PORT is already in use"
    print_status "Attempting to find available port..."
    for p in {3002..3010}; do
        if ! lsof -i :$p > /dev/null 2>&1; then
            PORT=$p
            break
        fi
    done
    print_status "Using port $PORT"
fi

export PORT

# Create logs directory
mkdir -p logs

# Function to start the monitoring server
start_server() {
    print_status "Starting monitoring server on port $PORT..."
    
    # Start server in background and save PID
    node server/monitoring-server.js > logs/server.log 2>&1 &
    SERVER_PID=$!
    echo $SERVER_PID > .server.pid
    
    # Wait a moment for server to start
    sleep 2
    
    # Check if server is running
    if ps -p $SERVER_PID > /dev/null; then
        print_success "Monitoring server started (PID: $SERVER_PID)"
        print_status "Dashboard available at: http://localhost:$PORT"
        print_status "WebSocket endpoint: ws://localhost:$PORT/ws/monitoring"
        print_status "Health check: http://localhost:$PORT/health"
    else
        print_error "Failed to start monitoring server"
        cat logs/server.log
        exit 1
    fi
}

# Function to start data simulation
start_simulation() {
    if [ "$1" = "--simulate" ] || [ "$1" = "-s" ]; then
        print_status "Starting data simulation..."
        
        # Wait for server to be fully ready
        sleep 3
        
        # Start simulator
        node scripts/simulate-data.js --speed=1 > logs/simulator.log 2>&1 &
        SIMULATOR_PID=$!
        echo $SIMULATOR_PID > .simulator.pid
        
        if ps -p $SIMULATOR_PID > /dev/null; then
            print_success "Data simulator started (PID: $SIMULATOR_PID)"
        else
            print_warning "Failed to start data simulator (server might not be ready yet)"
        fi
    fi
}

# Function to stop all processes
stop_all() {
    print_status "Stopping all processes..."
    
    if [ -f ".server.pid" ]; then
        SERVER_PID=$(cat .server.pid)
        if ps -p $SERVER_PID > /dev/null; then
            kill $SERVER_PID
            print_success "Monitoring server stopped"
        fi
        rm -f .server.pid
    fi
    
    if [ -f ".simulator.pid" ]; then
        SIMULATOR_PID=$(cat .simulator.pid)
        if ps -p $SIMULATOR_PID > /dev/null; then
            kill $SIMULATOR_PID
            print_success "Data simulator stopped"
        fi
        rm -f .simulator.pid
    fi
}

# Function to check status
check_status() {
    print_status "Checking system status..."
    
    if [ -f ".server.pid" ]; then
        SERVER_PID=$(cat .server.pid)
        if ps -p $SERVER_PID > /dev/null; then
            print_success "Monitoring server is running (PID: $SERVER_PID)"
            
            # Test health endpoint
            if curl -s "http://localhost:$PORT/health" > /dev/null; then
                print_success "Health check passed"
            else
                print_warning "Health check failed"
            fi
        else
            print_warning "Monitoring server is not running"
        fi
    else
        print_warning "Monitoring server is not running"
    fi
    
    if [ -f ".simulator.pid" ]; then
        SIMULATOR_PID=$(cat .simulator.pid)
        if ps -p $SIMULATOR_PID > /dev/null; then
            print_success "Data simulator is running (PID: $SIMULATOR_PID)"
        else
            print_warning "Data simulator is not running"
        fi
    else
        print_warning "Data simulator is not running"
    fi
}

# Function to show logs
show_logs() {
    echo ""
    print_status "=== Server Logs ==="
    if [ -f "logs/server.log" ]; then
        tail -20 logs/server.log
    else
        print_warning "No server logs found"
    fi
    
    echo ""
    print_status "=== Simulator Logs ==="
    if [ -f "logs/simulator.log" ]; then
        tail -20 logs/simulator.log
    else
        print_warning "No simulator logs found"
    fi
}

# Function to open dashboard
open_dashboard() {
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:$PORT"
    elif command -v open &> /dev/null; then
        open "http://localhost:$PORT"
    else
        print_status "Please open http://localhost:$PORT in your browser"
    fi
}

# Handle command line arguments
case "${1:-start}" in
    "start")
        start_server
        start_simulation "$2"
        echo ""
        print_success "🎉 Agent Monitoring Dashboard is ready!"
        print_status "Commands:"
        print_status "  ./start.sh status    - Check status"
        print_status "  ./start.sh stop      - Stop all services"
        print_status "  ./start.sh restart   - Restart all services"
        print_status "  ./start.sh logs      - Show recent logs"
        print_status "  ./start.sh open      - Open dashboard in browser"
        echo ""
        
        # Keep script running and show status
        trap stop_all EXIT
        
        if [ "$2" != "--daemon" ] && [ "$2" != "-d" ]; then
            print_status "Press Ctrl+C to stop all services"
            while true; do
                sleep 30
                if [ -f ".server.pid" ]; then
                    SERVER_PID=$(cat .server.pid)
                    if ! ps -p $SERVER_PID > /dev/null; then
                        print_error "Monitoring server has stopped unexpectedly"
                        break
                    fi
                fi
            done
        fi
        ;;
    "stop")
        stop_all
        ;;
    "restart")
        stop_all
        sleep 2
        start_server
        start_simulation "--simulate"
        print_success "Services restarted"
        ;;
    "status")
        check_status
        ;;
    "logs")
        show_logs
        ;;
    "open")
        open_dashboard
        ;;
    "health")
        if [ -f ".server.pid" ]; then
            curl -s "http://localhost:$PORT/health" | python3 -m json.tool 2>/dev/null || curl -s "http://localhost:$PORT/health"
        else
            print_error "Server is not running"
        fi
        ;;
    "help"|"--help"|"-h")
        echo "Usage: ./start.sh [command] [options]"
        echo ""
        echo "Commands:"
        echo "  start [--simulate|-s] [--daemon|-d]  Start the monitoring dashboard"
        echo "  stop                                  Stop all services"
        echo "  restart                               Restart all services"
        echo "  status                                Check status of all services"
        echo "  logs                                  Show recent logs"
        echo "  open                                  Open dashboard in browser"
        echo "  health                                Show health check response"
        echo "  help                                  Show this help message"
        echo ""
        echo "Options:"
        echo "  --simulate, -s    Start with data simulation"
        echo "  --daemon, -d      Run in background (don't wait for Ctrl+C)"
        echo ""
        echo "Environment Variables:"
        echo "  PORT             Port to run on (default: 3001)"
        echo "  NODE_ENV         Environment (development/production)"
        echo ""
        ;;
    *)
        print_error "Unknown command: $1"
        print_status "Use './start.sh help' for usage information"
        exit 1
        ;;
esac