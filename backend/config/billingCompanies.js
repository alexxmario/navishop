// Companies available for SmartBill invoicing and Fan Courier shipping.
//
// SmartBill: all companies share the same account credentials
// (SMARTBILL_USERNAME / SMARTBILL_TOKEN) — only the fiscal code (CIF) and the
// invoice series differ per company.
//
// Fan Courier: the sender printed on an AWB is not part of the AWB payload —
// it is whoever owns the account behind clientId. So each company needs its own
// Fan Courier account for its AWBs to go out under its own name.
//
// Sensible defaults are baked in below; each value can be overridden via env on
// the server without a code deploy:
//   PilotOn          -> SMARTBILL_CIF / SMARTBILL_SERIES
//                       FAN_COURIER_CLIENT_ID / _USERNAME / _PASSWORD
//   Perfect Century  -> SMARTBILL_CIF_PC / SMARTBILL_SERIES_PC
//                       FAN_COURIER_CLIENT_ID_PC / _USERNAME_PC / _PASSWORD_PC
const BILLING_COMPANIES = [
  {
    id: 'piloton',
    name: 'PilotOn SRL',
    cif: process.env.SMARTBILL_CIF || '34378664',
    series: process.env.SMARTBILL_SERIES || 'P',
    fanCourier: {
      clientId: process.env.FAN_COURIER_CLIENT_ID,
      username: process.env.FAN_COURIER_USERNAME,
      password: process.env.FAN_COURIER_PASSWORD,
    },
  },
  {
    id: 'perfect-century',
    name: 'Perfect Century SRL',
    cif: process.env.SMARTBILL_CIF_PC || '26175588',
    series: process.env.SMARTBILL_SERIES_PC || 'PC',
    fanCourier: {
      clientId: process.env.FAN_COURIER_CLIENT_ID_PC,
      username: process.env.FAN_COURIER_USERNAME_PC,
      password: process.env.FAN_COURIER_PASSWORD_PC,
    },
  },
];

// Look up a company by its id (e.g. 'piloton'). Returns null if unknown.
function getBillingCompany(id) {
  return BILLING_COMPANIES.find((c) => c.id === id) || null;
}

// Fan Courier credentials for a company, or null when that company has no
// account configured. Callers must treat null as "cannot ship as this company"
// rather than silently falling back to another company's account — an AWB
// issued on the wrong account labels and bills the wrong legal entity.
function getFanCourierAccount(companyId) {
  const company = getBillingCompany(companyId);
  if (!company) return null;

  const { clientId, username, password } = company.fanCourier || {};
  if (!clientId || !username || !password) return null;

  return { companyId: company.id, companyName: company.name, clientId, username, password };
}

// Safe list for the admin UI dropdown (no internal-only fields). `canShip` lets
// the UI warn before an order is invoiced under a company that cannot ship.
function listBillingCompanies() {
  return BILLING_COMPANIES.map(({ id, name, cif }) => ({
    id,
    name,
    cif,
    canShip: getFanCourierAccount(id) !== null,
  }));
}

module.exports = {
  BILLING_COMPANIES,
  getBillingCompany,
  getFanCourierAccount,
  listBillingCompanies,
};
