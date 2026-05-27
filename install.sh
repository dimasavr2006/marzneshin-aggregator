#!/bin/bash
set -e

# Marzneshin Aggregator Install Script
# Usage: ./install.sh [DASHBOARD_PATH]

INSTALL_DIR="/etc/opt/marzneshin"
DASHBOARD_PATH="${1:-/dashboard/}"

echo "=== Marzneshin Aggregator Installer ==="
echo "Install directory: $INSTALL_DIR"
echo "Dashboard path: $DASHBOARD_PATH"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "Docker not found. Installing..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "Docker Compose not found. Please install it first."
    exit 1
fi

# Create directories
mkdir -p "$INSTALL_DIR"
mkdir -p /var/lib/marzneshin
mkdir -p /var/lib/marznode

# Copy files
echo "Copying files to $INSTALL_DIR..."
cp -r app "$INSTALL_DIR/"
cp -r dashboard "$INSTALL_DIR/"
cp -r tests "$INSTALL_DIR/"
cp makefile "$INSTALL_DIR/"
cp requirements.txt "$INSTALL_DIR/"
cp alembic.ini "$INSTALL_DIR/"
cp main.py "$INSTALL_DIR/"
cp Dockerfile "$INSTALL_DIR/"
cp docker-compose.yml "$INSTALL_DIR/"

# Create .env if not exists
if [ ! -f "$INSTALL_DIR/.env" ]; then
    echo "Creating .env file..."
    cat > "$INSTALL_DIR/.env" << EOF
# Marzneshin Environment Variables

## Server Configuration
UVICORN_HOST="0.0.0.0"
UVICORN_PORT=8000

## Dashboard
DASHBOARD_PATH="$DASHBOARD_PATH"

## Database
SQLALCHEMY_DATABASE_URL="sqlite:////var/lib/marzneshin/db.sqlite3"

## For Developers
# DEBUG=true
# DOCS=true
EOF
else
    echo ".env already exists, skipping..."
    # Update DASHBOARD_PATH if different
    if ! grep -q "DASHBOARD_PATH=\"$DASHBOARD_PATH\"" "$INSTALL_DIR/.env"; then
        echo "Updating DASHBOARD_PATH in .env..."
        sed -i "s|DASHBOARD_PATH=.*|DASHBOARD_PATH=\"$DASHBOARD_PATH\"|" "$INSTALL_DIR/.env"
    fi
fi

# Build and start
echo "Building and starting containers..."
cd "$INSTALL_DIR"
docker compose down 2>/dev/null || true
docker compose build --no-cache
docker compose up -d

echo ""
echo "=== Installation Complete ==="
echo "Dashboard URL: http://localhost:8000$DASHBOARD_PATH"
echo ""
echo "To check logs: cd $INSTALL_DIR && docker compose logs -f"
echo "To stop: cd $INSTALL_DIR && docker compose down"
