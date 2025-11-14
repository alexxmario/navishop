const axios = require('axios');

class FanCourierService {
  constructor() {
    // FAN Courier API endpoints from their official Postman collection
    this.baseURL = 'https://api.fancourier.ro';
    this.reportsURL = 'https://api.fancourier.ro/reports';
    this.clientId = process.env.FAN_COURIER_CLIENT_ID;
    this.username = process.env.FAN_COURIER_USERNAME;
    this.password = process.env.FAN_COURIER_PASSWORD;
    
    if (!this.clientId || !this.username || !this.password) {
      console.warn('FAN Courier credentials not configured. Please set FAN_COURIER_CLIENT_ID, FAN_COURIER_USERNAME, and FAN_COURIER_PASSWORD environment variables.');
    }
  }

  /**
   * Get authentication token from FAN Courier API
   */
  async authenticate() {
    try {
      // FAN Courier API v2.0 authentication from Postman collection
      const response = await axios.post(`${this.baseURL}/login?username=${this.username}&password=${this.password}`);

      if (response.status === 200 && response.data && response.data.data && response.data.data.token) {
        return {
          success: true,
          token: response.data.data.token,
          expires_at: response.data.data.expires_at
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
    }
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
          return {
            success: false,
            error: `AWB creation failed: ${awbResult.errors.join(', ')}`
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
      // Authenticate first
      const authResult = await this.authenticate();
      if (!authResult.success) {
        return {
          success: false,
          error: `Authentication failed: ${authResult.error}`
        };
      }

      // Prepare order data for AWB creation with correct FAN Courier format
      const orderData = {
        orderNumber: order.orderNumber,
        recipientName: order.shippingAddress.name || 'Necunoscut',
        recipientPhone: order.shippingAddress.phone || '0700000000',
        recipientEmail: order.shippingAddress.email || '',
        city: order.shippingAddress.city,
        county: order.shippingAddress.county,
        street: order.shippingAddress.street,
        streetNumber: order.shippingAddress.streetNumber || '1',
        postalCode: order.shippingAddress.postalCode || '000000',
        weight: this.calculateOrderWeight(order),
        declaredValue: order.grandTotal,
        cashOnDelivery: order.paymentMethod === 'cash_on_delivery' ? order.grandTotal : 0,
        contents: this.generateContentsDescription(order.items)
      };

      // Create AWB
      const awbResult = await this.createAWB(orderData, authResult.token);
      
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
}

module.exports = new FanCourierService();