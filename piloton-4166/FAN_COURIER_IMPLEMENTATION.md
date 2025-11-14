# FAN Courier Delivery System Implementation

## Overview
This implementation integrates the FAN Courier API v2.0 into the PilotOn e-commerce platform following their official documentation.

## Features Implemented

### 1. Authentication System
- Token-based authentication with FAN Courier API
- Automatic token management and renewal
- Environment-based credential configuration

### 2. Order Shipping Integration
- AWB (shipping label) creation for orders
- Integration with existing order management system
- Shipping cost calculation and tracking

### 3. Tracking System
- Real-time shipment tracking
- Status synchronization with order status
- Delivery confirmation handling

### 4. API Endpoints

#### Shipping Management (`/api/shipping`)
- `POST /quote` - Get shipping quotes for destinations
- `GET /track/:awbNumber` - Track shipment by AWB number
- `GET /services` - Get available services for routes
- `DELETE /awb/:awbNumber` - Cancel AWB (admin only)

#### Order Integration (`/api/orders`)
- `POST /:orderId/ship` - Create shipping label for order
- `GET /:orderId/track` - Track order shipment

## Files Created/Modified

### New Files
1. **`/backend/services/fanCourierService.js`**
   - Main service class for FAN Courier API integration
   - Authentication, AWB creation, tracking, and utilities

2. **`/backend/routes/shipping.js`**
   - Dedicated shipping endpoints
   - Public tracking interface
   - Shipping quote calculations

### Modified Files
1. **`/backend/models/Order.js`**
   - Added shipping information fields
   - AWB number and tracking integration

2. **`/backend/routes/orders.js`**
   - Added shipping label creation
   - Order tracking integration

3. **`/backend/server.js`**
   - Registered shipping routes

4. **`/backend/.env.example`**
   - Added FAN Courier configuration variables

## Configuration

### Environment Variables Required
```bash
# FAN Courier API Credentials
FAN_COURIER_CLIENT_ID=your-client-id
FAN_COURIER_USERNAME=your-username  
FAN_COURIER_PASSWORD=your-password

# Company Information
FAN_COURIER_SENDER_NAME=Your Company Name
FAN_COURIER_SENDER_PHONE=+40123456789
FAN_COURIER_CONTACT_PERSON=Contact Person Name
FAN_COURIER_ORIGIN_CITY=Bucuresti
```

## Usage Examples

### 1. Create Shipping Label for Order
```javascript
POST /api/orders/:orderId/ship
Authorization: Bearer <user-token>

Response:
{
  "message": "Shipping label created successfully",
  "awbNumber": "2150123456789",
  "trackingCode": "2150123456789",
  "pdfLink": "https://...",
  "cost": 25.50
}
```

### 2. Track Order
```javascript
GET /api/orders/:orderId/track
Authorization: Bearer <user-token>

Response:
{
  "trackingCode": "2150123456789",
  "status": "In livrare",
  "statusDescription": "Coletul este în curs de livrare",
  "history": [...],
  "deliveryDate": null,
  "recipientName": "John Doe"
}
```

### 3. Get Shipping Quote
```javascript
POST /api/shipping/quote
Content-Type: application/json

{
  "city": "Cluj-Napoca",
  "county": "Cluj",
  "weight": 2.5
}

Response:
{
  "success": true,
  "services": [...],
  "estimatedDelivery": "2024-01-15"
}
```

### 4. Public Tracking
```javascript
GET /api/shipping/track/2150123456789

Response:
{
  "success": true,
  "awbNumber": "2150123456789",
  "status": "Livrat",
  "statusDescription": "Coletul a fost livrat",
  "history": [...],
  "deliveryDate": "2024-01-14T10:30:00Z",
  "recipientName": "John Doe"
}
```

## Database Schema Updates

### Order Model Extensions
```javascript
shipping: {
  provider: { type: String, enum: ['fan_courier', 'other'], default: 'fan_courier' },
  awbNumber: { type: String, unique: true, sparse: true },
  cost: { type: Number, default: 0 },
  pdfLink: { type: String },
  estimatedDelivery: { type: Date },
  actualDelivery: { type: Date }
}
```

## Error Handling

The implementation includes comprehensive error handling for:
- Authentication failures
- Network connectivity issues
- Invalid shipping addresses
- AWB creation failures
- Tracking unavailability

## Security Considerations

1. **Credentials Protection**: All FAN Courier credentials are stored in environment variables
2. **Authentication**: Order-related endpoints require user authentication
3. **Input Validation**: All inputs are validated before API calls
4. **Error Sanitization**: Sensitive error information is not exposed to clients

## Testing

To test the implementation:

1. **Set up credentials** in `.env` file
2. **Create a test order** through the regular order flow
3. **Generate shipping label** using `POST /orders/:orderId/ship`
4. **Track the shipment** using the tracking endpoints
5. **Verify status updates** in the order management system

## API Compliance

This implementation follows the FAN Courier API v2.0 specification:
- ✅ Authentication with client credentials
- ✅ AWB creation with all required fields
- ✅ Shipment tracking and status updates
- ✅ Service availability checking
- ✅ AWB cancellation functionality
- ✅ Error handling as per API documentation

## Next Steps

1. **Enhanced Validation**: Add more specific address validation
2. **Webhook Integration**: Implement FAN Courier webhooks for automatic status updates
3. **Bulk Operations**: Add support for bulk AWB creation
4. **Advanced Tracking**: Implement delivery notifications and SMS alerts
5. **Admin Dashboard**: Create admin interface for shipping management

## Support

For issues with this implementation:
1. Check environment variable configuration
2. Verify FAN Courier API credentials
3. Review server logs for detailed error messages
4. Consult FAN Courier API documentation for specific error codes