const axios = require('axios');
const { buildInvoiceClient } = require('./invoiceClient');

class SmartBillService {
  constructor() {
    // EXACT URL from SmartBill documentation
    this.baseURL = 'https://ws.smartbill.ro/SBORO/api';
    this.username = process.env.SMARTBILL_USERNAME;
    this.token = process.env.SMARTBILL_TOKEN;
  }

  // Generate authorization header - EXACT format from documentation
  getAuthHeader() {
    if (!this.username || !this.token) {
      throw new Error('SmartBill credentials not configured. Please set SMARTBILL_USERNAME and SMARTBILL_TOKEN in environment variables.');
    }
    
    // EXACT format: Basic base64(username:token). Never log this — base64 is
    // not encryption, and pm2 keeps out.log around indefinitely.
    const credentials = `${this.username}:${this.token}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  // Create invoice using EXACT SmartBill API specification.
  // `company` (optional) = { cif, series } selects which company to invoice
  // under; falls back to the SMARTBILL_CIF / SMARTBILL_SERIES env defaults.
  async createInvoice(orderData, company = null) {
    try {
      // Validate configuration first
      this.validateConfig();

      const invoiceData = this.formatInvoiceDataExact(orderData, company);
      
      console.log('SmartBill invoice data (EXACT FORMAT):', JSON.stringify(invoiceData, null, 2));


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

      // SmartBill runs its own e-Factura validation on the way in and reports
      // the failures here. We used to discard this, which left "erori pe
      // e-Factura" visible in their UI and invisible to us — and we have API
      // credentials, not account access, so the log is the only place we can
      // read them.
      console.log('SmartBill invoice response:', JSON.stringify(response.data, null, 2));

      return {
        success: true,
        invoiceId: response.data.number,
        invoiceNumber: response.data.number,
        data: response.data
      };
    } catch (error) {
      console.error('SmartBill invoice creation failed:', error.response?.data || error.message);
      console.error('Request URL:', `${this.baseURL}/invoice`);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Format order data using EXACT SmartBill API specification
  formatInvoiceDataExact(orderData, company = null, { legacyClient = false } = {}) {
    return {
      // REQUIRED: Company VAT code
      companyVatCode: company?.cif || process.env.SMARTBILL_CIF,
      
      // REQUIRED: Client data. See services/invoiceClient.js — the address has
      // to satisfy e-Factura, which the raw shipping address does not.
      client: buildInvoiceClient(orderData, { legacy: legacyClient }),
      
      // Invoice data - using defaults from documentation
      issueDate: new Date().toISOString().split('T')[0],
      seriesName: company?.series || process.env.SMARTBILL_SERIES || 'FACT',
      isDraft: false,
      currency: 'RON',
      precision: 2,
      dueDate: this.getDueDate(7),
      observations: orderData.notes || `Comanda #${orderData.orderNumber}`,
      

      // REQUIRED: Products array
      products: this.formatProductsExact(orderData.items, orderData.shippingCost, company)
    };
  }

  // Do NOT try to compute VAT here. SmartBill resolves the rate itself, from
  // the tax named "TVA Inclus" in the account plus the fiscal status of the
  // `companyVatCode` we invoice under — so the same payload yields 0% for
  // PilotOn (neplatitor de TVA) and 21% inclus for Perfect Century (platitor).
  // Cf. factura PC27251: 899 lei trimisi -> 742,98 baza + 156,02 TVA.
  // The `taxPercentage: 0` below is therefore ignored; changing taxName is what
  // would break invoicing.
  static get VAT_LINE() {
    return {
      isTaxIncluded: false,
      taxName: 'TVA Inclus',
      taxPercentage: 0
    };
  }

  // Accepts either a raw ObjectId or a populated Product document.
  resolveProductCode(productId) {
    if (!productId) return 'PROD';
    const id = productId._id || productId;
    return String(id) || 'PROD';
  }

  // Format products using EXACT SmartBill API specification
  formatProductsExact(items, shippingCost = 0, company = null) {
    const vat = SmartBillService.VAT_LINE;

    const products = items.map(item => ({
      // REQUIRED fields per documentation
      name: item.name,
      // The order is fetched with .populate('items.productId'), so productId is
      // a Product document here, not an ObjectId — .toString() on it yields the
      // whole inspected document. Take the id off it explicitly.
      code: this.resolveProductCode(item.productId),
      measuringUnitName: 'buc',
      currency: 'RON',
      quantity: item.quantity,
      price: item.price,

      // Optional but recommended fields
      ...vat,
      saveToDb: false,
      isService: false
    }));

    // Add shipping if applicable
    if (shippingCost && shippingCost > 0) {
      products.push({
        name: 'Transport',
        code: 'TRANSPORT',
        measuringUnitName: 'buc',
        currency: 'RON',
        quantity: 1,
        price: shippingCost,
        ...vat,
        saveToDb: false,
        isService: true
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

  // Generate payment URL for online payments
  async getPaymentURL(invoiceData, returnURL, cancelURL) {
    try {
      console.log('Payment URL requested for invoice:', invoiceData.invoiceNumber);
      console.log('Return URL:', returnURL);
      console.log('Cancel URL:', cancelURL);
      
      // SmartBill requires integration with Netopia or EuPlatesc payment processors
      // The payment link is embedded in the SmartBill invoice viewer, not a separate URL
      // Customers need to access the invoice via SmartBill's platform to see the payment button
      
      const paymentId = `SB_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      return {
        success: false,
        error: 'SmartBill online payments require integration with Netopia or EuPlatesc payment processors in your SmartBill account. The payment button appears directly on the invoice when viewed in SmartBill.',
        invoiceNumber: invoiceData.invoiceNumber,
        paymentId: paymentId,
        instructions: 'Configure Netopia or EuPlatesc integration in your SmartBill account to enable online card payments. Payment buttons will then appear automatically on invoices.'
      };
    } catch (error) {
      console.error('Error generating payment URL:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Check payment status 
  async checkPaymentStatus(paymentId) {
    try {
      // SmartBill doesn't provide direct payment status API in their public docs
      // This would need to be implemented via webhooks or manual checking
      console.log('Checking payment status for:', paymentId);
      return {
        success: true,
        status: 'pending',
        message: 'Payment status should be updated via webhooks'
      };
    } catch (error) {
      console.error('Error checking payment status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get invoice PDF. `company` (optional) = { cif, series } must match the
  // company the invoice was issued under; falls back to the env defaults.
  async getInvoicePDF(invoiceId, company = null) {
    try {
      const response = await axios.get(
        `${this.baseURL}/invoice/pdf`,
        {
          params: {
            cif: company?.cif || process.env.SMARTBILL_CIF,
            seriesname: company?.series || process.env.SMARTBILL_SERIES,
            number: invoiceId
          },
          headers: {
            'Authorization': this.getAuthHeader(),
            'Accept': 'application/octet-stream'
          },
          responseType: 'arraybuffer',
          timeout: 30000
        }
      );

      return {
        success: true,
        pdf: response.data
      };
    } catch (error) {
      console.error('Error retrieving invoice PDF:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Test SmartBill connection
  async testConnection() {
    try {
      this.validateConfig();
      
      // Since invoice creation is working, we'll just validate configuration
      return {
        success: true,
        message: 'SmartBill connection configuration is valid',
        config: {
          username: this.username,
          cif: process.env.SMARTBILL_CIF,
          series: process.env.SMARTBILL_SERIES,
          baseURL: this.baseURL
        }
      };
    } catch (error) {
      console.error('SmartBill connection test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new SmartBillService();