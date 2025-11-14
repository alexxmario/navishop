# PilotOn Admin Panel

A React Admin dashboard for managing the PilotOn e-commerce platform.

## Features

- **Products Management**: Full CRUD operations with support for complex product data
  - Product listing with advanced filtering (category, brand, price, stock status)
  - Detailed product views with image gallery, specifications, and compatibility data
  - Stock level monitoring with low-stock alerts
  - Product categories and brand management

- **Orders Management**: Complete order processing workflow
  - Order listing with status filtering
  - Customer information and shipping address display
  - Payment method and status tracking
  - Integration with Fan Courier shipping (AWB numbers and tracking)

- **Users Management**: User account administration
  - Customer and admin user management
  - Role-based access control
  - OAuth integration support (Google, Facebook)

- **Authentication**: Secure admin access
  - JWT-based authentication
  - Admin role requirement
  - Integration with existing backend auth system

## Technology Stack

- **Frontend**: React Admin
- **Backend**: Node.js/Express API (running on port 5001)
- **Database**: MongoDB
- **Authentication**: JWT tokens
- **UI Framework**: Material-UI

## Getting Started

### Prerequisites
- Backend server must be running on port 5001
- MongoDB database connection
- Admin user account in the database

### Installation & Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   PORT=3001 npm start
   ```

3. Access the admin panel at: http://localhost:3001

### First Time Setup

1. Login with admin credentials:
   - **Email**: `admin`
   - **Password**: `admin123456`

## API Integration

The admin panel connects to your existing backend API endpoints:
- Products: `/api/products`
- Orders: `/api/orders` (with manual processing)
- Users: `/api/users`
- Authentication: `/api/auth/login`
- Order Processing: `/api/orders/:id/process`

## Custom Components

- **ProductList**: Advanced product listing with filters and stock monitoring
- **ProductShow**: Detailed product view with tabbed layout for specifications and compatibility
- **OrderList**: Order management with shipping integration
- **UserList**: User management with role and registration type display

## Development

The admin panel runs on port 3001 to avoid conflicts with:
- Frontend application (port 3000)
- Backend API (port 5001)

## Security

- JWT token authentication
- Admin role verification
- Secure API communication
- CORS protection configured

## Order Processing Workflow

**Manual Processing Steps:**
1. **Pending** → Review new customer orders
2. **Confirm** → Validate order details and confirm with customer
3. **Process** → Generate SmartBill invoice and move to processing
4. **Ship** → Generate Fan Courier AWB and mark as shipped
5. **Delivered** → Automatic status update via tracking

## Features

✅ **Complete Order Management** - Manual processing workflow
✅ **SmartBill Integration** - Automatic invoice generation
✅ **Fan Courier Integration** - AWB generation and tracking
✅ **Product Management** - Navigation systems with car compatibility
✅ **Customer Management** - User accounts and order history
✅ **Dashboard Overview** - Order statistics and workflow guide