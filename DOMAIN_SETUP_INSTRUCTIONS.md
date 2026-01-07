# Domain Setup Instructions for junsun.ro

## Step 1: Configure DNS Records in CyberFolks

Log into CyberFolks and add these DNS records for **junsun.ro**:

```
Type: A
Host: @
Points to: 31.14.23.20
TTL: 3600

Type: A
Host: www
Points to: 31.14.23.20
TTL: 3600

Type: A
Host: admin
Points to: 31.14.23.20
TTL: 3600

Type: A
Host: api
Points to: 31.14.23.20
TTL: 3600
```

Wait 5-30 minutes for DNS propagation. Check status at: https://dnschecker.org

---

## Step 2: Upload Nginx Configurations to VPS

Upload the three nginx config files to your VPS:

```bash
# From your local machine
scp nginx-configs/junsun.ro.conf root@31.14.23.20:/etc/nginx/sites-available/
scp nginx-configs/admin.junsun.ro.conf root@31.14.23.20:/etc/nginx/sites-available/
scp nginx-configs/api.junsun.ro.conf root@31.14.23.20:/etc/nginx/sites-available/
```

Then SSH into your VPS and enable the sites:

```bash
ssh root@31.14.23.20

# Enable the nginx configurations
ln -s /etc/nginx/sites-available/junsun.ro.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/admin.junsun.ro.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/api.junsun.ro.conf /etc/nginx/sites-enabled/

# Test nginx configuration
nginx -t

# Reload nginx
systemctl reload nginx
```

---

## Step 3: Install SSL Certificates with Let's Encrypt

```bash
# Install certbot if not already installed
apt update
apt install certbot python3-certbot-nginx -y

# Get SSL certificates for all domains
certbot --nginx -d junsun.ro -d www.junsun.ro
certbot --nginx -d admin.junsun.ro
certbot --nginx -d api.junsun.ro

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
FRONTEND_URL=https://junsun.ro
CORS_ALLOWED_ORIGINS=https://junsun.ro,https://www.junsun.ro,https://admin.junsun.ro,https://api.junsun.ro
EUPLATESC_MERCHANT_URL=https://junsun.ro
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
REACT_APP_API_URL=https://api.junsun.ro
EOF

# Build
npm run build

# Upload to VPS
scp -r build/* root@31.14.23.20:/var/www/admin-panel/
```

### Option B: Build on VPS
```bash
ssh root@31.14.23.20

cd /var/www/navishop/admin-panel

# Update .env
echo "REACT_APP_API_URL=https://api.junsun.ro" > .env

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
REACT_APP_API_URL=https://api.junsun.ro

# Rebuild and deploy
npm run build
```

---

## Step 7: Verify Everything Works

Test all domains:

- https://junsun.ro - Main site
- https://www.junsun.ro - Main site (www)
- https://admin.junsun.ro - Admin panel
- https://api.junsun.ro - API (should show "PilotOn API is running!")

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
certbot certificates

# Renew if needed
certbot renew --dry-run
```

---

## Summary of URLs After Setup

- **Main Website**: https://junsun.ro or https://www.junsun.ro
- **Admin Panel**: https://admin.junsun.ro (internally proxied to port 81)
- **API Backend**: https://api.junsun.ro (internally proxied to port 5001)

All traffic goes through nginx on ports 80/443, then gets routed internally to the correct ports.
