#!/bin/bash
# VPS Setup Script for navi.piloton.ro domain
# Run this script on your VPS at 31.14.23.20

set -e  # Exit on any error

echo "=========================================="
echo "VPS Setup for navi.piloton.ro"
echo "=========================================="
echo ""

# Step 1: Update backend .env file
echo "Step 1: Updating backend .env file..."
cd /var/www/navishop/backend

# Backup existing .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Update .env variables
sed -i 's|FRONTEND_URL=.*|FRONTEND_URL=https://navi.piloton.ro|' .env
sed -i 's|CORS_ALLOWED_ORIGINS=.*|CORS_ALLOWED_ORIGINS=https://navi.piloton.ro,https://admin.navi.piloton.ro,https://api.navi.piloton.ro|' .env
sed -i 's|EUPLATESC_MERCHANT_URL=.*|EUPLATESC_MERCHANT_URL=https://navi.piloton.ro|' .env

echo "✓ Backend .env updated"
echo ""

# Step 2: Restart backend
echo "Step 2: Restarting backend..."
pm2 restart backend
echo "✓ Backend restarted"
echo ""

# Step 3: Update admin panel .env and rebuild
echo "Step 3: Updating admin panel .env..."
cd /var/www/navishop/admin-panel

# Backup existing .env if it exists
if [ -f .env ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
fi

# Create new .env
cat > .env << EOF
REACT_APP_API_URL=https://api.navi.piloton.ro/api
REACT_APP_BASE_URL=https://api.navi.piloton.ro
EOF

echo "✓ Admin panel .env updated"
echo ""

echo "Step 4: Installing admin panel dependencies (if needed)..."
npm install --production
echo "✓ Dependencies installed"
echo ""

echo "Step 5: Building admin panel..."
npm run build
echo "✓ Admin panel built"
echo ""

# Step 6: Restart admin panel service (if using pm2)
echo "Step 6: Restarting admin panel service..."
if pm2 list | grep -q "admin"; then
    pm2 restart admin
    echo "✓ Admin panel service restarted"
else
    echo "⚠ No PM2 process named 'admin' found - you may need to restart manually"
fi
echo ""

echo "=========================================="
echo "Backend and Admin Panel Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Upload nginx configuration files"
echo "2. Enable nginx sites"
echo "3. Install SSL certificates with certbot"
echo ""
