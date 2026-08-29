#!/usr/bin/env node
/**
 * Află exact ce respinge validarea e-Factura din SmartBill, pentru o comandă
 * reală — fără acces la interfața SmartBill.
 *
 * Rulează pe VPS, unde .env are credențialele:
 *
 *   node scripts/debugEfactura.js GO441487048
 *       Nu trimite nimic. Afișează comanda, blocul `client` vechi și cel nou,
 *       și diferențele dintre ele. Începe întotdeauna de aici.
 *
 *   node scripts/debugEfactura.js GO441487048 --probe
 *       Trimite la SmartBill variantele de payload ca DRAFT (isDraft: true) și
 *       afișează răspunsul complet pentru fiecare. Draftul nu consumă număr de
 *       factură, dar se creează în contul real — șterge-le după.
 *
 *   node scripts/debugEfactura.js GO441487048 --probe --only=new
 *       Doar o variantă (original | legacy | new | minimal).
 *
 * Ideea probei: aceeași comandă, trimisă în variante care diferă printr-un
 * singur lucru. Varianta care trece validarea spune care câmp era problema —
 * spre deosebire de a ghici din cod, care aici a eșuat de patru ori.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

const Order = require('../models/Order');
const GuestOrder = require('../models/GuestOrder');
// Registers the schema `items.productId` refs — without it, populate throws
// MissingSchemaError. The server gets this for free via the routes.
require('../models/Product');
const smartbillService = require('../services/smartbillServiceCorrect');
const { getBillingCompany } = require('../config/billingCompanies');
const { buildOrderInvoicePayload, buildInvoiceClient } = require('../services/invoiceClient');

const BASE_URL = 'https://ws.smartbill.ro/SBORO/api';

function authHeader() {
  const { SMARTBILL_USERNAME, SMARTBILL_TOKEN } = process.env;
  if (!SMARTBILL_USERNAME || !SMARTBILL_TOKEN) {
    throw new Error('Lipsesc SMARTBILL_USERNAME / SMARTBILL_TOKEN din .env');
  }
  return `Basic ${Buffer.from(`${SMARTBILL_USERNAME}:${SMARTBILL_TOKEN}`).toString('base64')}`;
}

async function loadOrder(orderNumber) {
  const order = await Order.findOne({ orderNumber })
    .populate('items.productId', 'name images slug')
    .populate('userId', 'name email');
  if (order) return { order, isGuestOrder: false };

  const guestOrder = await GuestOrder.findOne({ orderNumber })
    .populate('items.productId', 'name images slug');
  if (guestOrder) return { order: guestOrder, isGuestOrder: true };

  return { order: null, isGuestOrder: false };
}

// Cel mai sărac bloc `client` acceptabil. Dacă nici ăsta nu trece, problema nu
// e în adresă, ci în altceva (produse, TVA, tipul de client).
function minimalClient(payload) {
  return {
    name: payload.guestName,
    address: payload.shippingAddress?.street,
    city: payload.shippingAddress?.city,
    county: payload.shippingAddress?.county,
    country: 'Romania',
    isTaxPayer: false,
    saveToDb: false,
  };
}

function diffClients(before, after) {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  const rows = [];
  for (const key of keys) {
    const a = before[key];
    const b = after[key];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      rows.push(`  ${key}: ${JSON.stringify(a)}  ->  ${JSON.stringify(b)}`);
    }
  }
  return rows.length ? rows.join('\n') : '  (identice)';
}

async function probe(label, invoiceData) {
  console.log(`\n--- PROBĂ: ${label} ---`);
  const draft = { ...invoiceData, isDraft: true };
  try {
    const response = await axios.post(`${BASE_URL}/invoice`, draft, {
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 30000,
    });
    console.log('HTTP 200. Răspuns SmartBill:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log(`EȘEC (HTTP ${error.response?.status || '—'}). Răspuns SmartBill:`);
    console.log(JSON.stringify(error.response?.data ?? error.message, null, 2));
  }
}

async function main() {
  const args = process.argv.slice(2);
  const orderNumber = args.find((a) => !a.startsWith('--'));
  const shouldProbe = args.includes('--probe');
  const onlyArg = args.find((a) => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.split('=')[1] : null;

  if (!orderNumber) {
    console.error('Utilizare: node scripts/debugEfactura.js <orderNumber> [--probe] [--only=original|legacy|new|minimal]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const { order, isGuestOrder } = await loadOrder(orderNumber);
  if (!order) {
    console.error(`Comanda ${orderNumber} nu există.`);
    process.exit(1);
  }

  const companyId = order.invoice?.companyId || 'perfect-century';
  const company = getBillingCompany(companyId);

  console.log('='.repeat(72));
  console.log(`Comanda ${orderNumber}  (${isGuestOrder ? 'guest' : 'user'})`);
  console.log(`Firma facturare: ${company?.name} (CIF ${company?.cif}, seria ${company?.series})`);
  console.log(`Factura emisă:   ${order.invoice?.companySeries || '—'}${order.invoice?.invoiceNumber || ''}`);
  console.log(`Tip facturare:   ${order.invoiceData?.invoiceType || 'person'}`);
  console.log(`Plată:           ${order.paymentMethod} / ${order.paymentStatus}`);
  console.log(`Total:           ${order.grandTotal} RON (transport ${order.shippingCost})`);
  console.log('='.repeat(72));

  console.log('\nAdresa de livrare din comandă:');
  console.log(JSON.stringify(order.shippingAddress, null, 2));
  console.log('\nAdresa de facturare din comandă:');
  console.log(JSON.stringify(order.billingAddress, null, 2));

  const payload = buildOrderInvoicePayload(order, isGuestOrder);

  const clients = {
    legacy: buildInvoiceClient(payload, { legacy: true }),
    new: buildInvoiceClient(payload),
    minimal: minimalClient(payload),
  };

  console.log('\nBloc `client` VECHI (ce s-a trimis până acum):');
  console.log(JSON.stringify(clients.legacy, null, 2));
  console.log('\nBloc `client` NOU:');
  console.log(JSON.stringify(clients.new, null, 2));
  console.log('\nDiferențe vechi -> nou:');
  console.log(diffClients(clients.legacy, clients.new));

  // Four payloads that differ one step at a time.
  //
  //   original — byte-for-byte what produced the invoice that SmartBill
  //              flagged. The control: if this one passes, drafts are not
  //              being validated and the whole probe proves nothing.
  //   legacy   — old client block, product code fixed
  //   new      — client block rebuilt for e-Factura
  //   minimal  — barest possible client; if even this fails, the address is
  //              not the problem
  //
  // Never let these fall through to the env flag — the point is to test each
  // variant explicitly, not whatever production happens to be set to.
  const invoices = {
    original: smartbillService.formatInvoiceDataExact(payload, company, {
      legacyClient: true,
      legacyProductCode: true,
    }),
    legacy: smartbillService.formatInvoiceDataExact(payload, company, { legacyClient: true }),
    new: smartbillService.formatInvoiceDataExact(payload, company, { legacyClient: false }),
    minimal: {
      ...smartbillService.formatInvoiceDataExact(payload, company, { legacyClient: false }),
      client: clients.minimal,
    },
  };

  if (!shouldProbe) {
    console.log('\nFactura completa care s-ar trimite (varianta noua):');
    console.log(JSON.stringify(invoices.new, null, 2));
    console.log('\nLungimea campului `code` pe fiecare varianta:');
    for (const [label, inv] of Object.entries(invoices)) {
      console.log(`  ${label}: ${inv.products.map((pr) => String(pr.code).length).join(', ')} caractere`);
    }
    console.log('\nNu s-a trimis nimic. Adaugă --probe ca să trimiți variantele ca draft.');
    await mongoose.disconnect();
    return;
  }

  console.log('\n' + '='.repeat(72));
  console.log('ATENȚIE: se creează DRAFTURI în contul SmartBill real. Șterge-le după.');
  console.log('='.repeat(72));

  for (const [label, invoiceData] of Object.entries(invoices)) {
    if (only && only !== label) continue;
    await probe(label, invoiceData);
  }

  console.log('\n' + '-'.repeat(72));
  console.log('Cum se citeste:');
  console.log('  - `original` cu 200 => ciornele NU sunt validate pentru e-Factura,');
  console.log('    deci proba spune doar daca API-ul accepta payload-ul, nu si SPV-ul.');
  console.log('  - un 400 pe orice varianta este definitiv: acel payload nu poate fi trimis.');
  console.log('Daca `new` trece, productia il poate folosi: SMARTBILL_CLIENT_V2=true in');
  console.log('backend/.env, apoi pm2 restart. Pana atunci se trimite blocul vechi.');
  console.log('Sterge ciornele create in SmartBill.');

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('Eroare:', error);
  process.exit(1);
});
