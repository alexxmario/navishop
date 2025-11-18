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

  buildPayloadString(values = []) {
    return values
      .map((value) => (value ? `${value.length}${value}` : '-'))
      .join('');
  }

  generateSignature(values) {
    this.ensureConfig();
    const payload = this.buildPayloadString(values);
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

    const baseFields = [
      ['amount', amount],
      ['curr', 'RON'],
      ['invoice_id', order.orderNumber],
      ['order_desc', options.description || `Plata pentru comanda ${order.orderNumber}`],
      ['merch_id', this.merchantId],
      ['timestamp', this.generateTimestamp()],
      ['nonce', nonce]
    ];

    const optionalFields = [
      ['merch_name', this.merchantName],
      ['merch_url', this.merchantUrl],
      ['email', order.guestEmail || order.billingAddress?.email || ''],
      ['phone', order.guestPhone || order.shippingAddress?.phone || ''],
      ['backtosite', this.formatUrl(options.returnURL, paymentId, order.orderNumber)],
      ['cancelbacktosite', this.formatUrl(options.cancelURL, paymentId, order.orderNumber)]
    ];

    const payloadEntries = [...baseFields, ...optionalFields].filter(([_, value]) => value !== undefined);
    const payload = Object.fromEntries(payloadEntries);

    const hashValues = baseFields.map(([_, value]) => value || '');
    payload.fp_hash = this.generateSignature(hashValues);

    const esc = encodeURIComponent;
    const query = payloadEntries
      .concat([['fp_hash', payload.fp_hash]])
      .map(([key, value]) => `${esc(key)}=${esc(value ?? '')}`)
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
    const responseFields = [
      'amount',
      'curr',
      'invoice_id',
      'ep_id',
      'merch_id',
      'action',
      'message',
      'approval',
      'timestamp',
      'nonce'
    ];
    const values = responseFields.map((field) => payload[field] || '');
    const expected = this.generateSignature(values);
    return expected === receivedHash;
  }
}

module.exports = new EuplatescService();
