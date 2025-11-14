const axios = require('axios');

class SmartBillService {
  constructor() {
    this.baseURL = 'https://ws.smartbill.ro/SBORO/api';
    this.username = process.env.SMARTBILL_USERNAME;
    this.token = process.env.SMARTBILL_TOKEN;
  }

  // Generate authorization header
  getAuthHeader() {
    if (!this.username || !this.token) {
      throw new Error('SmartBill credentials not configured. Please set SMARTBILL_USERNAME and SMARTBILL_TOKEN in environment variables.');
    }
    
    // SmartBill uses Basic auth with username:token
    const credentials = `${this.username}:${this.token}`;
    console.log('SmartBill credentials being used:', this.username, this.token.substring(0, 10) + '...');
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  // Create invoice in SmartBill
  async createInvoice(orderData) {
    try {
      // Validate configuration first
      this.validateConfig();
      
      const invoiceData = this.formatInvoiceData(orderData);
      
      console.log('SmartBill invoice data:', JSON.stringify(invoiceData, null, 2));
      console.log('SmartBill auth header:', this.getAuthHeader());
      
      const response = await axios.post(
        `${this.baseURL}/invoice`,
        invoiceData,
        {
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );

      return {
        success: true,
        invoiceId: response.data.number,
        invoiceNumber: response.data.series + response.data.number,
        data: response.data
      };
    } catch (error) {
      console.error('SmartBill invoice creation failed:', error.response?.data || error.message);
      console.error('Request URL:', `${this.baseURL}/invoice`);
      console.error('Request headers:', {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      });
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get invoice PDF
  async getInvoicePDF(invoiceId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/invoice/pdf`,
        {
          params: { cif: process.env.SMARTBILL_CIF, id: invoiceId },
          headers: {
            'Authorization': this.getAuthHeader(),
            'Accept': 'application/pdf'
          },
          responseType: 'arraybuffer'
        }
      );

      return {
        success: true,
        pdf: response.data
      };
    } catch (error) {
      console.error('SmartBill PDF retrieval failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get payment URL for online payments
  async getPaymentURL(invoiceData, returnURL, cancelURL) {
    try {
      
      const paymentData = {
        invoice: invoiceData.invoiceNumber,
        amount: invoiceData.total,
        currency: 'RON',
        returnUrl: returnURL,
        cancelUrl: cancelURL,
        description: `Plata factura ${invoiceData.invoiceNumber} - PilotOn`
      };

      const response = await axios.post(
        `${this.baseURL}/payment/url`,
        paymentData,
        {
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        paymentURL: response.data.url,
        paymentId: response.data.id
      };
    } catch (error) {
      console.error('SmartBill payment URL generation failed:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Check payment status
  async checkPaymentStatus(paymentId) {
    try {
      
      const response = await axios.get(
        `${this.baseURL}/payment/status`,
        {
          params: { id: paymentId },
          headers: {
            'Authorization': this.getAuthHeader()
          }
        }
      );

      return {
        success: true,
        status: response.data.status, // pending, completed, failed, cancelled
        data: response.data
      };
    } catch (error) {
      console.error('SmartBill payment status check failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Format order data for SmartBill invoice
  formatInvoiceData(orderData) {
    return {
      companyVatCode: process.env.SMARTBILL_CIF,
      client: {
        name: orderData.guestName,
        address: orderData.shippingAddress.street,
        city: orderData.shippingAddress.city,
        county: orderData.shippingAddress.county,
        country: orderData.shippingAddress.country || 'Romania',
        zipCode: orderData.shippingAddress.postalCode,
        phone: orderData.guestPhone,
        email: orderData.guestEmail,
        saveToDb: false,
        isTaxPayer: false
      },
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: this.getDueDate(7),
      deliveryDate: new Date().toISOString().split('T')[0],
      seriesName: process.env.SMARTBILL_SERIES || 'FACT',
      isDraft: false,
      products: this.formatProducts(orderData.items, orderData.shippingCost),
      observations: orderData.notes || `Comanda #${orderData.orderNumber}`
    };
  }

  // Format products for SmartBill
  formatProducts(items, shippingCost = 0) {
    const products = items.map(item => ({
      name: item.name,
      code: item.productId?.toString() || 'PROD',
      isService: false,
      measuringUnitName: 'buc',
      currency: 'RON',
      quantity: item.quantity,
      price: item.price,
      saveToDb: false,
      isDiscount: false
    }));

    // Add shipping if applicable
    if (shippingCost && shippingCost > 0) {
      products.push({
        name: 'Transport',
        code: 'TRANSPORT',
        isService: true,
        measuringUnitName: 'buc',
        currency: 'RON',
        quantity: 1,
        price: shippingCost,
        saveToDb: false,
        isDiscount: false
      });
    }

    return products;
  }

  // Get due date (days from now)
  getDueDate(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  // Test SmartBill connection
  async testConnection() {
    try {
      const response = await axios.get(
        `${this.baseURL}/companies`,
        {
          headers: {
            'Authorization': this.getAuthHeader(),
            'Accept': 'application/json'
          },
          timeout: 10000
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      console.error('SmartBill connection test failed:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  // Validate environment variables
  validateConfig() {
    const required = [
      'SMARTBILL_USERNAME',
      'SMARTBILL_TOKEN',
      'SMARTBILL_CIF'
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing SmartBill configuration: ${missing.join(', ')}. Please check your .env file.`);
    }
  }
}

module.exports = new SmartBillService();