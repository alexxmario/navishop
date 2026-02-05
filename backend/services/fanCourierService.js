const axios = require('axios');

class FanCourierService {
  constructor() {
    // FAN Courier API endpoints from their official Postman collection
    this.baseURL = 'https://api.fancourier.ro';
    this.reportsURL = 'https://api.fancourier.ro/reports';
    this.clientId = process.env.FAN_COURIER_CLIENT_ID;
    this.username = process.env.FAN_COURIER_USERNAME;
    this.password = process.env.FAN_COURIER_PASSWORD;
    this.cachedToken = null;
    this.cachedTokenExpiry = null;
    this.pendingAuth = null;

    if (!this.clientId || !this.username || !this.password) {
      console.warn('FAN Courier credentials not configured. Please set FAN_COURIER_CLIENT_ID, FAN_COURIER_USERNAME, and FAN_COURIER_PASSWORD environment variables.');
    }
  }

  /**
   * Get authentication token from FAN Courier API
   */
  async authenticate() {
    const hasValidCache = this.cachedToken && this.cachedTokenExpiry && Date.now() < this.cachedTokenExpiry - 60000;
    if (hasValidCache) {
      return { success: true, token: this.cachedToken, expires_at: this.cachedTokenExpiry };
    }

    if (this.pendingAuth) {
      return this.pendingAuth;
    }

    this.pendingAuth = (async () => {
      try {
        const response = await axios.post(`${this.baseURL}/login?username=${this.username}&password=${this.password}`);

        if (response.status === 200 && response.data?.data?.token) {
          this.cachedToken = response.data.data.token;
          const expiresRaw = response.data.data.expires_at;
          const expiresAt = expiresRaw ? Date.parse(expiresRaw) : Date.now() + 15 * 60 * 1000;
          this.cachedTokenExpiry = expiresAt;
          return {
            success: true,
            token: this.cachedToken,
            expires_at: expiresRaw
          };
        }

        return {
          success: false,
          error: 'Authentication failed - no token received'
        };
      } catch (error) {
        console.error('FAN Courier authentication error:', error.response?.data || error.message);
        return {
          success: false,
          error: error.response?.data?.message || error.message
        };
      } finally {
        this.pendingAuth = null;
      }
    })();

    return this.pendingAuth;
  }

  /**
   * Create AWB (shipping label) for an order using FAN Courier API format
   */
  async createAWB(orderData, authToken) {
    try {
      const awbData = {
        clientId: parseInt(this.clientId),
        shipments: [
          {
            info: {
              service: 'Standard',
              bank: '',
              bankAccount: '',
              packages: {
                parcel: 1,
                envelope: 0
              },
              weight: orderData.weight || 1,
              cod: orderData.cashOnDelivery || 0,
              declaredValue: orderData.declaredValue || 0,
              payment: orderData.cashOnDelivery > 0 ? 'recipient' : 'sender',
              refund: null,
              returnPayment: null,
              observation: `Comanda: ${orderData.orderNumber}`,
              content: orderData.contents || `Comanda #${orderData.orderNumber}`,
              dimensions: {
                length: orderData.length || 10,
                height: orderData.height || 10,
                width: orderData.width || 10
              },
              costCenter: null,
              options: []
            },
            recipient: {
              name: orderData.recipientName,
              phone: orderData.recipientPhone,
              secondaryPhone: orderData.recipientPhone,
              email: orderData.recipientEmail || '',
              address: {
                county: orderData.county,
                locality: orderData.city,
                street: orderData.street,
                streetNo: orderData.streetNumber || '',
                zipCode: orderData.postalCode
              }
            }
          }
        ]
      };

      const response = await axios.post(`${this.baseURL}/intern-awb`, awbData, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      // AWB creation successful

      if (response.data && response.data.response && response.data.response.length > 0) {
        const awbResult = response.data.response[0];
        if (awbResult.errors) {
          // Handle errors - can be array, object, or string
          let errorMessage;
          if (Array.isArray(awbResult.errors)) {
            errorMessage = awbResult.errors.join(', ');
          } else if (typeof awbResult.errors === 'object') {
            errorMessage = JSON.stringify(awbResult.errors);
          } else {
            errorMessage = String(awbResult.errors);
          }
          return {
            success: false,
            error: `AWB creation failed: ${errorMessage}`
          };
        }
        
        return {
          success: true,
          awbNumber: awbResult.awbNumber.toString(),
          cost: awbResult.tariff || 0,
          vat: awbResult.vat || 0,
          totalCost: (awbResult.tariff || 0) + (awbResult.vat || 0),
          routingCode: awbResult.routingCode,
          office: awbResult.office,
          estimatedDeliveryTime: awbResult.estimatedDeliveryTime,
          pdf_link: null // PDF generation is separate endpoint
        };
      }

      return {
        success: false,
        error: 'AWB creation failed - no AWB number received',
        responseData: response.data
      };
    } catch (error) {
      console.error('FAN Courier AWB creation error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Track shipment status using FAN Courier API format
   */
  async trackShipment(awbNumber, authToken) {
    try {
      const response = await axios.get(`${this.reportsURL}/awb/tracking?clientId=${this.clientId}&awb[]=${awbNumber}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.data && response.data.data.length > 0) {
        const trackingData = response.data.data[0];
        return {
          success: true,
          status: trackingData.eventName,
          statusDescription: trackingData.eventName,
          history: trackingData.events || [],
          deliveryDate: trackingData.deliveryDate || null,
          recipientName: trackingData.recipientName || null
        };
      }

      return {
        success: false,
        error: 'Tracking information not available'
      };
    } catch (error) {
      console.error('FAN Courier tracking error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Get available services and tariffs
   */
  async getServices(originCity, destinationCity, weight, authToken) {
    try {
      const response = await axios.post(`${this.baseURL}/api/tariff`, {
        localitate_expeditor: originCity,
        localitate_destinatar: destinationCity,
        greutate: weight,
        lungime: 10,
        latime: 10,
        inaltime: 10
      }, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.services) {
        return {
          success: true,
          services: response.data.services
        };
      }

      return {
        success: false,
        error: 'No services available'
      };
    } catch (error) {
      console.error('FAN Courier services error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Delete/cancel AWB
   */
  async cancelAWB(awbNumber, authToken) {
    try {
      const response = await axios.delete(`${this.baseURL}/api/awb/${awbNumber}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        message: 'AWB cancelled successfully'
      };
    } catch (error) {
      console.error('FAN Courier AWB cancellation error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * High-level method to create shipment for an order
   */
  async createShipment(order) {
    try {
      console.log('=== FAN Courier createShipment START ===');
      console.log('Order ID:', order._id);
      console.log('Order Number:', order.orderNumber);
      console.log('Shipping Address:', JSON.stringify(order.shippingAddress, null, 2));

      // Authenticate first
      const authResult = await this.authenticate();
      console.log('Auth result:', authResult.success ? 'SUCCESS' : 'FAILED - ' + authResult.error);

      if (!authResult.success) {
        return {
          success: false,
          error: `Authentication failed: ${authResult.error}`
        };
      }

      // Get recipient name - check multiple possible field locations
      // For authenticated orders: order.userId is populated with { name, email }
      // For guest orders: use guestName
      const recipientName =
        order.guestName ||  // Guest orders have guestName
        order.userId?.name ||  // Authenticated users - populated userId
        order.shippingAddress?.name ||  // Direct name field in shippingAddress
        (order.shippingAddress?.firstName && order.shippingAddress?.lastName
          ? `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`.trim()
          : null) ||  // firstName + lastName combined
        order.shippingAddress?.firstName ||  // Just firstName if no lastName
        'Necunoscut';

      // Get recipient phone - check multiple possible field locations
      // Note: User model doesn't have phone, so it should be in shippingAddress
      const recipientPhone =
        order.guestPhone ||  // Guest orders have guestPhone
        order.shippingAddress?.phone ||  // Direct phone field in shippingAddress
        order.shippingAddress?.phoneNumber ||  // Alternative field name
        order.userId?.phone ||  // In case phone is added to User model later
        '0700000000';

      // Get recipient email
      const recipientEmail =
        order.guestEmail ||  // Guest orders have guestEmail
        order.userId?.email ||  // Authenticated users - populated userId
        order.shippingAddress?.email ||
        '';

      console.log('Resolved recipient:', { recipientName, recipientPhone, recipientEmail });

      // Prepare order data for AWB creation with correct FAN Courier format
      const orderData = {
        orderNumber: order.orderNumber,
        recipientName,
        recipientPhone,
        recipientEmail,
        city: order.shippingAddress?.city,
        county: order.shippingAddress?.county,
        street: order.shippingAddress?.street,
        streetNumber: order.shippingAddress?.streetNumber || '1',
        postalCode: order.shippingAddress?.postalCode || '000000',
        weight: this.calculateOrderWeight(order),
        declaredValue: order.grandTotal,
        cashOnDelivery: order.paymentMethod === 'cash_on_delivery' ? order.grandTotal : 0,
        contents: this.generateContentsDescription(order.items)
      };

      console.log('Prepared orderData for AWB:', JSON.stringify(orderData, null, 2));

      // Create AWB
      const awbResult = await this.createAWB(orderData, authResult.token);
      console.log('AWB Result:', JSON.stringify(awbResult, null, 2));
      
      if (awbResult.success) {
        return {
          success: true,
          awbNumber: awbResult.awbNumber,
          cost: awbResult.cost,
          pdfLink: awbResult.pdf_link,
          trackingCode: awbResult.awbNumber
        };
      } else {
        return {
          success: false,
          error: awbResult.error
        };
      }
    } catch (error) {
      console.error('FAN Courier shipment creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * High-level method to track an order
   */
  async trackOrder(trackingCode) {
    try {
      const authResult = await this.authenticate();
      if (!authResult.success) {
        return {
          success: false,
          error: `Authentication failed: ${authResult.error}`
        };
      }

      return await this.trackShipment(trackingCode, authResult.token);
    } catch (error) {
      console.error('FAN Courier order tracking error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate estimated weight for an order based on items
   */
  calculateOrderWeight(order) {
    // Basic weight calculation - 0.5kg per item as default
    // This should be customized based on actual product weights
    const itemCount = order.items.reduce((total, item) => total + item.quantity, 0);
    return Math.max(1, itemCount * 0.5); // Minimum 1kg
  }

  /**
   * Generate contents description for customs
   */
  generateContentsDescription(items) {
    if (items.length === 1) {
      return items[0].name;
    }
    return `Produse electronice (${items.length} articole)`;
  }

  /**
   * Map FAN Courier status to internal order status
   */
  mapStatusToOrderStatus(fanCourierStatus) {
    const statusMapping = {
      'Expediat': 'shipped',
      'In livrare': 'shipped',
      'Livrat': 'delivered',
      'Returnat': 'cancelled',
      'Anulat': 'cancelled'
    };

    return statusMapping[fanCourierStatus] || 'processing';
  }

  /**
   * Get AWB label PDF
   */
  async getAWBLabelPDF(awbNumber) {
    try {
      console.log('=== getAWBLabelPDF START ===');
      console.log('AWB Number:', awbNumber);
      console.log('Client ID:', this.clientId);

      const authResult = await this.authenticate();
      if (!authResult.success) {
        return {
          success: false,
          error: `Authentication failed: ${authResult.error}`
        };
      }

      // Build URL with query params - use baseURL not reportsURL per Postman collection
      const url = `${this.baseURL}/awb/label?clientId=${this.clientId}&awbs[]=${awbNumber}&pdf=1&dpi=300`;
      console.log('Request URL:', url);

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${authResult.token}`,
          'Accept': 'application/pdf'
        },
        responseType: 'arraybuffer',
        timeout: 30000
      });

      console.log('Response status:', response.status);
      console.log('Response content-type:', response.headers['content-type']);

      return {
        success: true,
        pdf: response.data
      };
    } catch (error) {
      const errorData = error.response?.data;
      // If it's a buffer, convert to string for logging
      const errorMessage = Buffer.isBuffer(errorData) ? errorData.toString('utf8') : errorData;
      console.error('Error retrieving AWB label PDF:', errorMessage || error.message);
      return {
        success: false,
        error: typeof errorMessage === 'string' ? errorMessage : (error.response?.data?.message || error.message)
      };
    }
  }
}

module.exports = new FanCourierService();
