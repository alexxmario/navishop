# Vercel Deployment Guide for PilotOn

This project consists of 3 separate applications that need to be deployed individually on Vercel:

## Project Structure
- **backend** - Node.js Express API server
- **navishop** - React frontend (main e-commerce site)
- **admin-panel** - React Admin dashboard

## Deployment Steps

### 1. Deploy Backend API
1. In Vercel, create a new project and select the `backend` folder
2. Set Framework Preset to "Other"
3. Set Environment Variables:
   ```
   NODE_ENV=production
   MONGODB_URI=your_production_mongodb_uri
   JWT_SECRET=your_jwt_secret
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   SESSION_SECRET=your_session_secret
   SMARTBILL_USERNAME=your_smartbill_username
   SMARTBILL_TOKEN=your_smartbill_token
   SMARTBILL_CIF=your_company_cif
   SMARTBILL_SERIES=your_series
   FAN_COURIER_CLIENT_ID=your_fan_courier_id
   FAN_COURIER_USERNAME=your_fan_courier_username
   FAN_COURIER_PASSWORD=your_fan_courier_password
   FAN_COURIER_SENDER_NAME=PilotOn
   FAN_COURIER_SENDER_PHONE=+40123456789
   FAN_COURIER_CONTACT_PERSON=Support Team
   FAN_COURIER_ORIGIN_CITY=Bucuresti
   ```
4. Deploy

### 2. Deploy Frontend (NaviShop)
1. In Vercel, create a new project and select the `navishop` folder
2. Set Framework Preset to "Create React App"
3. Set Environment Variable:
   ```
   REACT_APP_API_URL=https://your-backend-url.vercel.app
   ```
4. Deploy

### 3. Deploy Admin Panel
1. In Vercel, create a new project and select the `admin-panel` folder
2. Set Framework Preset to "Create React App"
3. Set Environment Variable:
   ```
   REACT_APP_API_URL=https://your-backend-url.vercel.app
   ```
4. Deploy

## Important Notes

1. **Database**: You'll need to set up a production MongoDB database (MongoDB Atlas recommended)
2. **CORS**: The backend is configured to allow requests from multiple origins
3. **Environment Variables**: Make sure all sensitive data is stored in Vercel's environment variables, not in code
4. **Domain Configuration**: Update the environment variables to point to your production URLs
5. **File Uploads**: Consider using a cloud storage service like AWS S3 or Cloudinary for file uploads in production

## Post-Deployment Configuration

After deployment, update the API URLs in your frontend applications:
- Update API base URL in `navishop/src/services/api.js`
- Update API base URL in `admin-panel` data provider configuration

## Monitoring

- Use Vercel's built-in analytics and logs
- Monitor your MongoDB database performance
- Set up error tracking (Sentry recommended)