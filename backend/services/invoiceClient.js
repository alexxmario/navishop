// Builds the `client` block sent to SmartBill when issuing an invoice.
//
// This lives on its own so the diagnostic script (scripts/debugEfactura.js) can
// build byte-identical payloads to the ones production sends — a probe that
// tests a slightly different payload than the real one proves nothing.
//
// Background: SmartBill validates every invoice against the e-Factura (SPV)
// rules before it can be uploaded. For a client that already exists in the
// SmartBill client nomenclator, SmartBill fills the address in from its own
// record and our block is ignored — which is why invoices to recurring B2B
// clients passed. For a new persoană fizică there is nothing to fall back on,
// so whatever we send here is what gets validated.

// e-Factura wants a country code, not a localized name. The order model
// defaults to 'România' (with diacritics), which is not one.
function normalizeCountry(value) {
  if (!value) return 'Romania';
  const plain = String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
  if (plain === 'romania' || plain === 'ro') return 'Romania';
  return String(value).trim();
}

function stripDiacritics(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// ANAF rejects Bucharest addresses unless the locality is the sector itself
// ("SECTOR1".."SECTOR6"). Customers type the sector into the street line, so
// pull it out of there when the county is Bucharest.
function extractBucharestSector(address) {
  const match = /\bsector(?:ul)?\s*([1-6])\b/i.exec(stripDiacritics(address));
  return match ? `SECTOR${match[1]}` : null;
}

function isBucharest(county) {
  return /^bucure(s|ș)ti$/i.test(stripDiacritics(county)) || /^b$/i.test(String(county || '').trim());
}

// Pick the address the invoice should carry. Callers upstream already resolve
// `billingAddress` to the shipping one when the customer ticked "same as
// shipping", so billing wins whenever it is present.
function resolveInvoiceAddress(orderData) {
  const billing = orderData.billingAddress;
  const shipping = orderData.shippingAddress || {};
  if (!billing || !billing.street) return shipping;

  // Never borrow the shipping postal code for a billing address in another
  // town — a wrong postal code on a fiscal document is worse than none.
  return billing;
}

// `legacy: true` reproduces the block as it was sent before this module
// existed, so the probe can compare old against new on the same order.
function buildInvoiceClient(orderData, { legacy = false } = {}) {
  const shipping = orderData.shippingAddress || {};

  if (legacy) {
    return {
      name: orderData.guestName,
      address: shipping.street,
      city: shipping.city,
      county: shipping.county,
      country: shipping.country || 'Romania',
      phone: orderData.guestPhone,
      email: orderData.guestEmail,
      isTaxPayer: false,
      saveToDb: false,
    };
  }

  const address = resolveInvoiceAddress(orderData);
  const county = address.county || '';
  let city = address.city || '';

  if (isBucharest(county)) {
    const sector = extractBucharestSector(address.street) || extractBucharestSector(city);
    if (sector) city = sector;
  }

  const client = {
    name: orderData.guestName,
    address: address.street,
    city,
    county,
    country: normalizeCountry(address.country),
    phone: orderData.guestPhone,
    email: orderData.guestEmail,
    isTaxPayer: false,
    saveToDb: false,
  };

  if (address.postalCode) client.postalCode = address.postalCode;

  return client;
}

// The order shape the SmartBill service expects. Both invoice call sites in
// routes/orders.js and the diagnostic script go through this, so a probe is
// guaranteed to test the payload production actually sends.
function buildOrderInvoicePayload(order, isGuestOrder) {
  const billingAddress = order.billingAddress?.sameAsShipping
    ? order.shippingAddress
    : (order.billingAddress || order.shippingAddress);

  return {
    orderNumber: order.orderNumber,
    guestName: isGuestOrder
      ? order.guestName
      : (order.userId?.name || order.shippingAddress?.name || 'Client'),
    guestEmail: isGuestOrder ? order.guestEmail : (order.userId?.email || ''),
    guestPhone: isGuestOrder
      ? (order.guestPhone || '')
      : (order.shippingAddress?.phone || ''),
    items: order.items,
    shippingAddress: order.shippingAddress,
    billingAddress,
    shippingCost: order.shippingCost,
    notes: order.notes,
  };
}

module.exports = {
  buildInvoiceClient,
  buildOrderInvoicePayload,
  resolveInvoiceAddress,
  normalizeCountry,
  extractBucharestSector,
  isBucharest,
};
