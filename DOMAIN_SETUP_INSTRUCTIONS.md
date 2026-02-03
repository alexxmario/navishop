# Domain Setup Instructions for navi.piloton.ro

## Step 1: Configure DNS Records for piloton.ro

Log into your DNS provider for **piloton.ro** and add these DNS records:

```
Type: A
Host: navi
Points to: 31.14.23.20
TTL: 3600

Type: A
Host: admin.navi
Points to: 31.14.23.20
TTL: 3600

Type: A
Host: api.navi
Points to: 31.14.23.20
TTL: 3600
```

Wait 5-30 minutes for DNS propagation. Check status at: https://dnschecker.org

---

## Step 2: Upload Nginx Configurations to VPS

Upload the three nginx config files to your VPS:

```bash
# From your local machine
scp nginx-configs/navi.piloton.ro.conf deploy@31.14.23.20:/tmp/
scp nginx-configs/admin.navi.piloton.ro.conf deploy@31.14.23.20:/tmp/
scp nginx-configs/api.navi.piloton.ro.conf deploy@31.14.23.20:/tmp/

# Then SSH in and move them (requires sudo)
ssh deploy@31.14.23.20
sudo mv /tmp/navi.piloton.ro.conf /etc/nginx/sites-available/
sudo mv /tmp/admin.navi.piloton.ro.conf /etc/nginx/sites-available/
sudo mv /tmp/api.navi.piloton.ro.conf /etc/nginx/sites-available/

# Enable the nginx configurations
sudo ln -s /etc/nginx/sites-available/navi.piloton.ro.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/admin.navi.piloton.ro.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/api.navi.piloton.ro.conf /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## Step 3: Install SSL Certificates with Let's Encrypt

```bash
# Install certbot if not already installed
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificates for all domains
sudo certbot --nginx -d navi.piloton.ro
sudo certbot --nginx -d admin.navi.piloton.ro
sudo certbot --nginx -d api.navi.piloton.ro

# Certbot will automatically update your nginx configs with SSL
```

---

## Step 4: Update Backend .env File

SSH into your VPS and update the backend .env file:

```bash
nano /var/www/navishop/backend/.env
```

Update these lines:

```bash
FRONTEND_URL=https://navi.piloton.ro
CORS_ALLOWED_ORIGINS=https://navi.piloton.ro,https://admin.navi.piloton.ro,https://api.navi.piloton.ro
EUPLATESC_MERCHANT_URL=https://navi.piloton.ro
```

Restart the backend:

```bash
pm2 restart backend
```
---

## Step 5: Update Admin Panel .env and Rebuild

The admin panel needs to be rebuilt with the new API URL.

### Option A: Build locally and upload
On your local machine:

```bash
cd admin-panel

# Create production .env file
cat > .env << EOF
REACT_APP_API_URL=https://api.navi.piloton.ro/api
REACT_APP_BASE_URL=https://api.navi.piloton.ro
EOF

# Build
npm run build

# Upload to VPS
scp -r build/* deploy@31.14.23.20:/tmp/admin-build/
ssh deploy@31.14.23.20 "sudo cp -r /tmp/admin-build/* /var/www/admin-panel/"
```

### Option B: Build on VPS
```bash
ssh deploy@31.14.23.20

cd /var/www/navishop/admin-panel

# Update .env
cat > .env << EOF
REACT_APP_API_URL=https://api.navi.piloton.ro/api
REACT_APP_BASE_URL=https://api.navi.piloton.ro
EOF

# Install dependencies if needed
npm install

# Build
npm run build

# The build output should be served on port 81 or moved to proper location
```

---

## Step 6: Update Frontend (Main E-commerce Site)

If you have a main e-commerce frontend, update its API URL:

```bash
# Update frontend .env
REACT_APP_API_URL=https://api.navi.piloton.ro/api
REACT_APP_ASSET_BASE_URL=https://api.navi.piloton.ro

# Rebuild and deploy
npm run build
```

---

## Step 7: Verify Everything Works

Test all domains:

- https://navi.piloton.ro - Main site
- https://admin.navi.piloton.ro - Admin panel
- https://api.navi.piloton.ro - API (should show "PilotOn API is running!")

---

## Troubleshooting

### If admin panel doesn't load:
```bash
# Check if service is running on port 81
netstat -tulpn | grep :81

# Check nginx logs
tail -f /var/log/nginx/error.log
```

### If API doesn't work:
```bash
# Check backend logs
pm2 logs backend

# Check if backend is running
pm2 status
```

### If SSL doesn't work:
```bash
# Check certificate status
sudo certbot certificates

# Renew if needed
sudo certbot renew --dry-run
```

---

## Summary of URLs After Setup

- **Main Website**: https://navi.piloton.ro
- **Admin Panel**: https://admin.navi.piloton.ro (internally proxied to port 81)
- **API Backend**: https://api.navi.piloton.ro (internally proxied to port 5001)

All traffic goes through nginx on ports 80/443, then gets routed internally to the correct ports.
