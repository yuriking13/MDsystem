#!/bin/bash

# HiggsField Content Generation Tool for OpenClaw Agent
# Usage: ./generate-content.sh [type] [prompt]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL_SCRIPT="$SCRIPT_DIR/higgsfield-client.js"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    log_error "Node.js not found. Please install Node.js to use this tool."
    exit 1
fi

# Check if credentials are set
if [[ -z "$HIGGSFIELD_API_KEY" || -z "$HIGGSFIELD_API_SECRET" ]]; then
    log_error "HiggsField credentials not found"
    log_info "Please set the following environment variables:"
    echo "  export HIGGSFIELD_API_KEY=\"your-api-key\""
    echo "  export HIGGSFIELD_API_SECRET=\"your-api-secret\""
    echo ""
    echo "Get your credentials from: https://cloud.higgsfield.ai/"
    exit 1
fi

# Change to the correct directory
cd "$(dirname "$TOOL_SCRIPT")"

TYPE="${1:-help}"

case "$TYPE" in
    "landing")
        log_info "Generating landing page content..."
        node "$TOOL_SCRIPT" landing
        log_success "Landing page content generated in ./generated-content/landing/"
        ;;
        
    "ui")
        log_info "Generating UI elements..."
        node "$TOOL_SCRIPT" ui
        log_success "UI elements generated in ./generated-content/ui/"
        ;;
        
    "custom")
        if [[ -z "$2" ]]; then
            log_error "Please provide a prompt for custom generation"
            echo "Usage: $0 custom \"your prompt here\""
            exit 1
        fi
        
        PROMPT="${@:2}"
        log_info "Generating custom content: $PROMPT"
        node "$TOOL_SCRIPT" custom "$PROMPT"
        log_success "Custom content generated in ./generated-content/"
        ;;
        
    "backgrounds")
        log_info "Generating section backgrounds..."
        node "$TOOL_SCRIPT" custom "Abstract gradient backgrounds for website sections, modern minimalist style, various colors"
        log_success "Background images generated"
        ;;
        
    "icons")
        log_info "Generating icon set..."
        node "$TOOL_SCRIPT" custom "Scientific icon set: microscope, DNA helix, brain scan, molecular structure, research graph, medical cross, minimalist line art style"
        log_success "Icon set generated"
        ;;
        
    "medical")
        log_info "Generating medical illustrations..."
        node "$TOOL_SCRIPT" custom "Medical research illustrations: clinical trials, patient data analysis, healthcare innovation, professional medical diagram style"
        log_success "Medical illustrations generated"
        ;;
        
    "help"|*)
        echo "🔧 HiggsField Content Generation Tool"
        echo ""
        echo "Usage: $0 [command] [options]"
        echo ""
        echo "Commands:"
        echo "  landing        Generate landing page content"
        echo "  ui             Generate UI elements and icons"
        echo "  custom \"prompt\" Generate custom content from prompt"
        echo "  backgrounds    Generate section backgrounds"
        echo "  icons          Generate scientific icon set"
        echo "  medical        Generate medical illustrations"
        echo "  help           Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 landing"
        echo "  $0 custom \"DNA double helix structure for hero section\""
        echo "  $0 medical"
        echo ""
        echo "Generated content will be saved to ./generated-content/"
        ;;
esac