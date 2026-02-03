# VPS Changes Checklist for navi.piloton.ro

## Option 1: Automated Script (Recommended)

### Step 1: Upload the script to VPS
```bash
scp vps-setup-script.sh deploy@31.14.23.20:/tmp/
```

### Step 2: SSH into VPS and run the script
```bash
ssh deploy@31.14.23.20
chmod +x /tmp/vps-setup-script.sh
/tmp/vps-setup-script.sh
```

---

## Option 2: Manual Changes (Step by Step)

If you prefer to do it manually, follow these steps:

### 1. Update Backend .env File

```bash
ssh deploy@31.14.23.20
cd /var/www/navishop/backend
nano .env
```

**Change these 3 lines:**
```bash
FRONTEND_URL=https://navi.piloton.ro
CORS_ALLOWED_ORIGINS=https://navi.piloton.ro,https://admin.navi.piloton.ro,https://api.navi.piloton.ro
EUPLATESC_MERCHANT_URL=https://navi.piloton.ro
```

Save with `Ctrl+O`, `Enter`, then exit with `Ctrl+X`

**Restart backend:**
```bash
pm2 restart backend
```

---

### 2. Update Admin Panel .env File

```bash
cd /var/www/navishop/admin-panel
cat > .env << EOF
REACT_APP_API_URL=https://api.navi.piloton.ro/api
REACT_APP_BASE_URL=https://api.navi.piloton.ro
EOF
```

**Rebuild admin panel:**
```bash
npm install
npm run build
```

**Restart admin panel (if running as PM2 service):**
```bash
pm2 restart admin
# OR if it's running on port 81 directly:
pm2 restart all
```

---

### 3. Upload Nginx Configuration Files

**From your local machine:**
```bash
scp nginx-configs/navi.piloton.ro.conf deploy@31.14.23.20:/tmp/
scp nginx-configs/admin.navi.piloton.ro.conf deploy@31.14.23.20:/tmp/
scp nginx-configs/api.navi.piloton.ro.conf deploy@31.14.23.20:/tmp/
```

---

### 4. Enable Nginx Sites

**SSH into VPS:**
```bash
ssh deploy@31.14.23.20

# Move configs to nginx directory
sudo mv /tmp/navi.piloton.ro.conf /etc/nginx/sites-available/
sudo mv /tmp/admin.navi.piloton.ro.conf /etc/nginx/sites-available/
sudo mv /tmp/api.navi.piloton.ro.conf /etc/nginx/sites-available/

# Enable the nginx configurations
sudo ln -s /etc/nginx/sites-available/navi.piloton.ro.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/admin.navi.piloton.ro.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/api.navi.piloton.ro.conf /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

---

### 5. Install SSL Certificates

**Still in SSH:**
```bash
# Install certbot if not already installed
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificates for all domains
sudo certbot --nginx -d navi.piloton.ro
sudo certbot --nginx -d admin.navi.piloton.ro
sudo certbot --nginx -d api.navi.piloton.ro
```

**Follow the prompts:**
- Enter your email address
- Agree to terms
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

---

### 6. Verify Everything Works

**Test all domains in your browser:**
- https://navi.piloton.ro
- https://admin.navi.piloton.ro (should show your admin panel)
- https://api.navi.piloton.ro (should show "PilotOn API is running!")

---

## Troubleshooting

### If nginx test fails:
```bash
# Check for syntax errors
sudo nginx -t

# View error details
tail -f /var/log/nginx/error.log
```

### If backend doesn't work:
```bash
# Check backend logs
pm2 logs backend

# Check if backend is running
pm2 status

# Restart backend
pm2 restart backend
```

### If admin panel doesn't load:
```bash
# Check if something is running on port 81
netstat -tulpn | grep :81

# Check PM2 processes
pm2 list

# If running as PM2 service:
pm2 restart admin

# Check logs
pm2 logs admin
```

### If SSL fails:
```bash
# Make sure DNS is propagated first
nslookup navi.piloton.ro
nslookup admin.navi.piloton.ro
nslookup api.navi.piloton.ro

# Try certbot again
sudo certbot --nginx -d navi.piloton.ro
```

---

## Quick Reference: What Changes

### Files Modified on VPS:
1. `/var/www/navishop/backend/.env` - 3 lines changed
2. `/var/www/navishop/admin-panel/.env` - created/updated
3. `/etc/nginx/sites-available/navi.piloton.ro.conf` - new file
4. `/etc/nginx/sites-available/admin.navi.piloton.ro.conf` - new file
5. `/etc/nginx/sites-available/api.navi.piloton.ro.conf` - new file
6. `/etc/nginx/sites-enabled/` - 3 new symlinks

### Services Restarted:
1. Backend (PM2)
2. Admin panel (PM2 or manual)
3. Nginx

---

## Summary

**Before domain setup:**
- Admin: http://31.14.23.20:81
- API: http://31.14.23.20:5001

**After domain setup:**
- Admin: https://admin.navi.piloton.ro
- API: https://api.navi.piloton.ro
- Main site: https://navi.piloton.ro
