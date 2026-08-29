const axios = require('axios');

// Never hold a cached Fan Courier token longer than this, whatever expiry the
// login response claims. See the note in authenticate().
const MAX_CACHED_TOKEN_MS = 55 * 60 * 1000;

// Fan Courier signals a dead token with 401, or with a 4xx body reading
// "These credentials have expired" / "Unauthenticated".
function isAuthFailure(error) {
  const status = error.response?.status;
  if (status === 401) return true;
  if (!status || status >= 500) return false;

  const body = error.response?.data;
  const text = Buffer.isBuffer(body)
    ? body.toString('utf8')
    : (typeof body === 'string' ? body : JSON.stringify(body || ''));
  return /credentials have expired|unauthenticated|invalid token|token.*expired/i.test(text);
}

class FanCourierService {
  constructor() {
    // FAN Courier API endpoints from their official Postman collection
    this.baseURL = 'https://api.fancourier.ro';
    this.reportsURL = 'https://api.fancourier.ro/reports';

    // Default account, used when a caller does not name a company. Per-company
    // accounts come from config/billingCompanies.js and are passed in per call,
    // because the sender printed on an AWB is the owner of the account.
    this.defaultAccount = {
      companyId: null,
      companyName: 'default',
      clientId: process.env.FAN_COURIER_CLIENT_ID,
      username: process.env.FAN_COURIER_USERNAME,
      password: process.env.FAN_COURIER_PASSWORD
    };

    // Auth state is per account (keyed by username), never shared between them.
    this.authState = new Map();

    if (!this.defaultAccount.clientId || !this.defaultAccount.username || !this.defaultAccount.password) {
      console.warn('FAN Courier credentials not configured. Please set FAN_COURIER_CLIENT_ID, FAN_COURIER_USERNAME, and FAN_COURIER_PASSWORD environment variables.');
    }
  }

  /**
   * Resolve which Fan Courier account a call should use.
   * @param {Object} [account] - { clientId, username, password, companyName }
   */
  resolveAccount(account) {
    if (account && account.clientId && account.username && account.password) {
      return account;
    }
    return this.defaultAccount;
  }

  /**
   * Run an authenticated request, retrying once on a rejected token.
   *
   * A cached token can die before we expect it to — Fan Courier states the
   * expiry in Romania local time with no zone, and a token can also be revoked
   * server-side at any point. Rather than trying to predict that, drop the
   * cached token and retry once whenever Fan Courier rejects it.
   *
   * @param {Object} account - Account to authenticate as
   * @param {(token: string) => Promise} run - Receives a bearer token
   */
  async withAuthRetry(account, run) {
    const acc = this.resolveAccount(account);

    for (const force of [false, true]) {
      const authResult = await this.authenticate(acc, { force });
      if (!authResult.success) {
        const err = new Error(authResult.error);
        err.authFailure = true;
        throw err;
      }

      try {
        return await run(authResult.token);
      } catch (error) {
        if (force || !isAuthFailure(error)) {
          throw error;
        }
        console.warn(`FAN Courier rejected the cached token for ${acc.companyName || 'default'}; re-authenticating and retrying once.`);
      }
    }
  }

  /**
   * Get authentication token from FAN Courier API
   * @param {Object} [account] - Account to authenticate as; defaults to env account
   * @param {Object} [options]
   * @param {boolean} [options.force] - Discard any cached token first
   */
  async authenticate(account, { force = false } = {}) {
    const acc = this.resolveAccount(account);

    if (!acc.clientId || !acc.username || !acc.password) {
      return {
        success: false,
        error: `FAN Courier credentials not configured for ${acc.companyName || 'default account'}`
      };
    }

    if (force) {
      this.authState.delete(acc.username);
    }

    const state = this.authState.get(acc.username) || {};

    const hasValidCache = !force && state.token && state.expiry && Date.now() < state.expiry - 60000;
    if (hasValidCache) {
      return { success: true, token: state.token, expires_at: state.expiry };
    }

    if (state.pending) {
      return state.pending;
    }

    const pending = (async () => {
      try {
        const response = await axios.post(`${this.baseURL}/login?username=${acc.username}&password=${acc.password}`);

        if (response.status === 200 && response.data?.data?.token) {
          // Fan Courier returns `expiresAt` (older docs show `expires_at`) as a
          // bare "YYYY-MM-DD HH:MM:SS" with no zone — it is Romania local time,
          // so Date.parse on a UTC server reads it hours into the future and we
          // would keep serving a dead token. Never trust it as an upper bound:
          // cap the cached lifetime to a window comfortably inside any real one,
          // and rely on the 401 retry below for anything we get wrong.
          const expiresRaw = response.data.data.expiresAt || response.data.data.expires_at;
          const parsed = expiresRaw ? Date.parse(expiresRaw) : NaN;
          const capped = Date.now() + MAX_CACHED_TOKEN_MS;
          const expiresAt = Number.isNaN(parsed) ? capped : Math.min(parsed, capped);
          this.authState.set(acc.username, { token: response.data.data.token, expiry: expiresAt });
          return {
            success: true,
            token: response.data.data.token,
            expires_at: expiresRaw
          };
        }

        this.authState.delete(acc.username);
        return {
          success: false,
          error: 'Authentication failed - no token received'
        };
      } catch (error) {
        console.error(`FAN Courier authentication error (${acc.companyName || 'default'}):`, error.response?.data || error.message);
        this.authState.delete(acc.username);
        return {
          success: false,
          error: error.response?.data?.message || error.message
        };
      }
    })();

    this.authState.set(acc.username, { ...state, pending });
    const result = await pending;

    // Drop the in-flight marker, keeping whatever token the call stored.
    const settled = this.authState.get(acc.username);
    if (settled && settled.pending === pending) {
      const { pending: _drop, ...rest } = settled;
      if (rest.token) {
        this.authState.set(acc.username, rest);
      } else {
        this.authState.delete(acc.username);
      }
    }

    return result;
  }

  /**
   * Create AWB (shipping label) for an order using FAN Courier API format
   * @param {Object} orderData - Order data
   * @param {string} authToken - Authentication token
   * @param {Object} awbOptions - Custom AWB options from admin panel
   */
  async createAWB(orderData, authToken, awbOptions = {}, account) {
    try {
      // Pick the first value the admin actually supplied. A plain `||` chain
      // would discard a deliberate 0 (e.g. "no ramburs on this COD order") and
      // silently fall back to the order total.
      const pickNumber = (...values) => {
        for (const value of values) {
          if (value === undefined || value === null || value === '') continue;
          const parsed = Number(value);
          if (Number.isFinite(parsed)) return parsed;
        }
        return 0;
      };

      // Build options array based on awbOptions
      const options = [];
      if (awbOptions.openOnDelivery) options.push('A');  // Deschidere la livrare
      if (awbOptions.oPOD) options.push('X');  // oPOD
      if (awbOptions.saturdayDelivery) options.push('S');  // Livrare sambata
      if (awbOptions.pickupPrealert) options.push('P');  // Pick-up Prealert
      if (awbOptions.returnFromRecipient) options.push('R');  // AWB cu preluare de la destinatar

      // Determine service type
      const serviceType = awbOptions.serviceType || 'Standard';

      // Determine payment (who pays for shipping)
      const payment = awbOptions.paymentBy || (orderData.cashOnDelivery > 0 ? 'recipient' : 'sender');

      // Determine refund type (for Cont Colector services)
      let refund = null;
      if (serviceType.includes('Cont Colector') && awbOptions.refund) {
        refund = awbOptions.refund;
      }

      // Determine packages (parcel vs envelope)
      const isEnvelope = awbOptions.isEnvelope || false;
      const numberOfPackages = parseInt(awbOptions.numberOfPackages) || 1;

      const awbData = {
        clientId: parseInt(this.resolveAccount(account).clientId),
        shipments: [
          {
            info: {
              service: serviceType,
              bank: '',
              bankAccount: '',
              packages: {
                parcel: isEnvelope ? 0 : numberOfPackages,
                envelope: isEnvelope ? numberOfPackages : 0
              },
              weight: pickNumber(awbOptions.weight, orderData.weight, 1),
              cod: pickNumber(awbOptions.codValue, orderData.cashOnDelivery),
              declaredValue: pickNumber(awbOptions.declaredValue, orderData.declaredValue),
              payment: payment,
              refund: refund,
              returnPayment: 'sender',
              observation: awbOptions.observations || `Comanda: ${orderData.orderNumber}`,
              content: awbOptions.contents || orderData.contents || `Comanda #${orderData.orderNumber}`,
              dimensions: {
                length: pickNumber(awbOptions.length, orderData.length, 10),
                height: pickNumber(awbOptions.height, orderData.height, 10),
                width: pickNumber(awbOptions.width, orderData.width, 10)
              },
              costCenter: null,
              options: options
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
                zipCode: awbOptions.postalCode || orderData.postalCode
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
  async trackShipment(awbNumber, authToken, account) {
    try {
      const clientId = this.resolveAccount(account).clientId;
      const response = await axios.get(`${this.reportsURL}/awb/tracking?clientId=${clientId}&awb[]=${awbNumber}`, {
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
  async cancelAWB(awbNumber, authToken, account) {
    try {
      // Per the official Postman collection the endpoint is
      // DELETE /awb?clientId=..&awb=.. — not /api/awb/:awb, which 404s.
      // An AWB can only be cancelled from the account that issued it.
      const clientId = this.resolveAccount(account).clientId;
      const response = await axios.delete(`${this.baseURL}/awb?clientId=${clientId}&awb=${awbNumber}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        message: 'AWB cancelled successfully',
        data: response.data
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
   * @param {Object} order - The order document
   * @param {Object} awbOptions - Custom AWB options from admin panel
   */
  async createShipment(order, awbOptions = {}, account) {
    try {
      const acc = this.resolveAccount(account);

      console.log('=== FAN Courier createShipment START ===');
      console.log('Order ID:', order._id);
      console.log('Order Number:', order.orderNumber);
      console.log('Sender account:', acc.companyName, `(clientId ${acc.clientId})`);
      console.log('Shipping Address:', JSON.stringify(order.shippingAddress, null, 2));
      console.log('AWB Options:', JSON.stringify(awbOptions, null, 2));

      // Authenticate first
      const authResult = await this.authenticate(acc);
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

      // Create AWB with custom options
      const awbResult = await this.createAWB(orderData, authResult.token, awbOptions, acc);
      console.log('AWB Result:', JSON.stringify(awbResult, null, 2));

      if (awbResult.success) {
        return {
          success: true,
          awbNumber: awbResult.awbNumber,
          cost: awbResult.cost,
          pdfLink: awbResult.pdf_link,
          trackingCode: awbResult.awbNumber,
          companyId: acc.companyId,
          companyName: acc.companyName
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
  async trackOrder(trackingCode, account) {
    try {
      const acc = this.resolveAccount(account);
      const authResult = await this.authenticate(acc);
      if (!authResult.success) {
        return {
          success: false,
          error: `Authentication failed: ${authResult.error}`
        };
      }

      return await this.trackShipment(trackingCode, authResult.token, acc);
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
  async getAWBLabelPDF(awbNumber, account) {
    try {
      // A label can only be fetched from the account that issued the AWB.
      const acc = this.resolveAccount(account);

      console.log('=== getAWBLabelPDF START ===');
      console.log('AWB Number:', awbNumber);
      console.log('Sender account:', acc.companyName, `(clientId ${acc.clientId})`);

      // Build URL with query params - use baseURL not reportsURL per Postman collection
      const url = `${this.baseURL}/awb/label?clientId=${acc.clientId}&awbs[]=${awbNumber}&pdf=1&dpi=300`;
      console.log('Request URL:', url);

      const response = await this.withAuthRetry(acc, (token) => axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf'
        },
        responseType: 'arraybuffer',
        timeout: 30000
      }));

      console.log('Response status:', response.status);
      console.log('Response content-type:', response.headers['content-type']);

      return {
        success: true,
        pdf: response.data
      };
    } catch (error) {
      if (error.authFailure) {
        return { success: false, error: `Authentication failed: ${error.message}` };
      }
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
