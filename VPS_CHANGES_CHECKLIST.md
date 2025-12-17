# VPS Changes Checklist for junsun.ro

## Option 1: Automated Script (Recommended)

### Step 1: Upload the script to VPS
```bash
scp vps-setup-script.sh root@31.14.23.20:/root/
```

### Step 2: SSH into VPS and run the script
```bash
ssh root@31.14.23.20
chmod +x vps-setup-script.sh
./vps-setup-script.sh
```

---

## Option 2: Manual Changes (Step by Step)

If you prefer to do it manually, follow these steps:

### 1. Update Backend .env File

```bash
ssh root@31.14.23.20
cd /var/www/navishop/backend
nano .env
```

**Change these 3 lines:**
```bash
FRONTEND_URL=https://junsun.ro
CORS_ALLOWED_ORIGINS=https://junsun.ro,https://www.junsun.ro,https://admin.junsun.ro,https://api.junsun.ro
EUPLATESC_MERCHANT_URL=https://junsun.ro
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
echo "REACT_APP_API_URL=https://api.junsun.ro" > .env
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
scp nginx-configs/junsun.ro.conf root@31.14.23.20:/etc/nginx/sites-available/
scp nginx-configs/admin.junsun.ro.conf root@31.14.23.20:/etc/nginx/sites-available/
scp nginx-configs/api.junsun.ro.conf root@31.14.23.20:/etc/nginx/sites-available/
```

---

### 4. Enable Nginx Sites

**SSH into VPS:**
```bash
ssh root@31.14.23.20

# Enable the nginx configurations
ln -s /etc/nginx/sites-available/junsun.ro.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/admin.junsun.ro.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/api.junsun.ro.conf /etc/nginx/sites-enabled/

# Test nginx configuration
nginx -t

# If test passes, reload nginx
systemctl reload nginx
```

---

### 5. Install SSL Certificates

**Still in SSH:**
```bash
# Install certbot if not already installed
apt update
apt install certbot python3-certbot-nginx -y

# Get SSL certificates for all domains
certbot --nginx -d junsun.ro -d www.junsun.ro
certbot --nginx -d admin.junsun.ro
certbot --nginx -d api.junsun.ro
```

**Follow the prompts:**
- Enter your email address
- Agree to terms
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

---

### 6. Verify Everything Works

**Test all domains in your browser:**
- https://junsun.ro
- https://www.junsun.ro
- https://admin.junsun.ro (should show your admin panel)
- https://api.junsun.ro (should show "PilotOn API is running!")

---

## Troubleshooting

### If nginx test fails:
```bash
# Check for syntax errors
nginx -t

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
nslookup junsun.ro
nslookup admin.junsun.ro
nslookup api.junsun.ro

# Try certbot again
certbot --nginx -d junsun.ro -d www.junsun.ro
```

---

## Quick Reference: What Changes

### Files Modified on VPS:
1. `/var/www/navishop/backend/.env` - 3 lines changed
2. `/var/www/navishop/admin-panel/.env` - created/updated
3. `/etc/nginx/sites-available/junsun.ro.conf` - new file
4. `/etc/nginx/sites-available/admin.junsun.ro.conf` - new file
5. `/etc/nginx/sites-available/api.junsun.ro.conf` - new file
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
- Admin: https://admin.junsun.ro
- API: https://api.junsun.ro
- Main site: https://junsun.ro
