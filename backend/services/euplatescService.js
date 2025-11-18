const crypto = require('crypto');

class EuplatescService {
  constructor() {
    this.merchantId = process.env.EUPLATESC_MERCHANT_ID;
    this.merchantName = process.env.EUPLATESC_MERCHANT_NAME || '';
    this.merchantUrl = process.env.EUPLATESC_MERCHANT_URL || '';
    this.endpoint = process.env.EUPLATESC_ENDPOINT || 'https://secure.euplatesc.ro/tdsprocess/tranzactd.php';
    this.key = process.env.EUPLATESC_KEY;
  }

  ensureConfig() {
    const missing = [];
    if (!this.merchantId) missing.push('EUPLATESC_MERCHANT_ID');
    if (!this.key) missing.push('EUPLATESC_KEY');
    if (missing.length) {
      throw new Error(`Missing EuPlatesc configuration: ${missing.join(', ')}`);
    }
  }

  buildPayloadString(data) {
    return Object.keys(data)
      .map((key) => {
        const value = data[key];
        return value ? `${value.length}${value}` : '-';
      })
      .join('');
  }

  generateSignature(data) {
    this.ensureConfig();
    const payload = this.buildPayloadString(data);
    const binKey = Buffer.from(this.key, 'hex');
    return crypto.createHmac('md5', binKey).update(payload, 'utf8').digest('hex');
  }

  generateTimestamp() {
    const now = new Date();
    const pad = (num) => num.toString().padStart(2, '0');
    return [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate()),
      pad(now.getHours()),
      pad(now.getMinutes()),
      pad(now.getSeconds())
    ].join('');
  }

  formatUrl(template, paymentId, orderNumber) {
    if (!template) return undefined;
    return template
      .replace(/:paymentId/g, encodeURIComponent(paymentId))
      .replace(/:orderNumber/g, encodeURIComponent(orderNumber));
  }

  createPayment(order, options = {}) {
    this.ensureConfig();

    const amount = Number(order.grandTotal || order.orderTotal).toFixed(2);
    const nonce = crypto.randomBytes(16).toString('hex');
    const paymentId = `${order.orderNumber}-${nonce}`;

    const payload = {
      amount,
      curr: 'RON',
      invoice_id: order.orderNumber,
      order_desc: options.description || `Plata pentru comanda ${order.orderNumber}`,
      merch_id: this.merchantId,
      timestamp: this.generateTimestamp(),
      nonce,
      merch_name: this.merchantName,
      merch_url: this.merchantUrl,
      email: order.guestEmail || order.billingAddress?.email || '',
      phone: order.guestPhone || order.shippingAddress?.phone || '',
      backtosite: this.formatUrl(options.returnURL, paymentId, order.orderNumber),
      cancelbacktosite: this.formatUrl(options.cancelURL, paymentId, order.orderNumber)
    };

    payload.fp_hash = this.generateSignature(payload);

    const esc = encodeURIComponent;
    const query = Object.keys(payload)
      .map((k) => `${esc(k)}=${esc(payload[k] ?? '')}`)
      .join('&');

    return {
      paymentURL: `${this.endpoint}?${query}`,
      paymentId,
      payload
    };
  }

  verifySignature(payload = {}) {
    if (!payload.fp_hash) return false;
    const receivedHash = payload.fp_hash.toLowerCase();
    const data = { ...payload };
    delete data.fp_hash;
    const expected = this.generateSignature(data);
    return expected === receivedHash;
  }
}

module.exports = new EuplatescService();
