// Companies available for SmartBill invoicing.
//
// All companies share the same SmartBill account credentials
// (SMARTBILL_USERNAME / SMARTBILL_TOKEN) — only the fiscal code (CIF) and the
// invoice series differ per company. Sensible defaults are baked in below; each
// value can be overridden via env on the server without a code deploy:
//   PilotOn          -> SMARTBILL_CIF / SMARTBILL_SERIES
//   Perfect Century  -> SMARTBILL_CIF_PC / SMARTBILL_SERIES_PC
const BILLING_COMPANIES = [
  {
    id: 'piloton',
    name: 'PilotOn SRL',
    cif: process.env.SMARTBILL_CIF || '34378664',
    series: process.env.SMARTBILL_SERIES || 'P',
  },
  {
    id: 'perfect-century',
    name: 'Perfect Century SRL',
    cif: process.env.SMARTBILL_CIF_PC || '26175588',
    series: process.env.SMARTBILL_SERIES_PC || 'PC',
  },
];

// Look up a company by its id (e.g. 'piloton'). Returns null if unknown.
function getBillingCompany(id) {
  return BILLING_COMPANIES.find((c) => c.id === id) || null;
}

// Safe list for the admin UI dropdown (no internal-only fields).
function listBillingCompanies() {
  return BILLING_COMPANIES.map(({ id, name, cif }) => ({ id, name, cif }));
}

module.exports = { BILLING_COMPANIES, getBillingCompany, listBillingCompanies };
