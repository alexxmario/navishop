import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Title } from 'react-admin';
import {
  Box,
  Card,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Button,
} from '@mui/material';
import { ExpandMore, Refresh, WarningAmber } from '@mui/icons-material';
import { buildApiUrl } from '../config/api';
import { adminTokens as t } from '../theme';

// Grila de prețuri pe treapta ramei (Alex, 3 sep 2026). Indexul din tuplu =
// treapta: 0 = ramă sub 100 lei, 1 = 100-200 inclusiv, 2 = peste 200.
// Prețul produsului e singura urmă a ramei în baza de date — treapta se citește
// înapoi din el, deci pagina rămâne corectă fără să dublăm aici lista de rame.
const GRID = {
  '2GB 32GB 4 CORE': [849, 899, 949],
  '4GB 64GB 4 CORE': [999, 1049, 1099],
  '4GB 64GB 8 CORE': [1399, 1449, 1499],
  '4GB 64GB 8CORE': [1599, 1649, 1699],
  '6GB 128GB 8 CORE': [1599, 1649, 1699],
  '8GB 256GB 8 CORE': [2299, 2349, 2399],
  '2K 4GB 64GB 8 CORE': [1999, 2049, 2099],
  '2K 8GB 256GB 8 CORE': [2799, 2849, 2899],
  '2K 12GB 256GB 8 CORE': [3299, 3299, 3299],
};

// Ordinea din pagina de model (setul canonic de 9)
const CONFIGS = Object.keys(GRID);

// „2K 12GB" costă la fel pe toate treptele, deci nu spune nimic despre ramă
const TIER_BLIND = new Set(['2K 12GB 256GB 8 CORE']);

const TIERS = [
  { key: 0, label: 'sub 100', color: '#2e7d32', bg: '#eaf4ea' },
  { key: 1, label: '100 – 200', color: '#0277bd', bg: '#e8f2fa' },
  { key: 2, label: 'peste 200', color: '#e65100', bg: '#fdf0e4' },
];

const CAR_BRANDS = [
  'Alfa Romeo', 'Land Rover', 'Mercedes Benz', 'Mercedes', 'Volkswagen', 'VW',
  'Audi', 'BMW', 'Toyota', 'Ford', 'Opel', 'Dacia', 'Renault', 'Peugeot',
  'Citroen', 'Honda', 'Nissan', 'Hyundai', 'Kia', 'Mazda', 'Mitsubishi',
  'Subaru', 'Volvo', 'Skoda', 'Seat', 'Fiat', 'Lancia', 'Jeep', 'Chevrolet',
  'Jaguar', 'Porsche', 'Mini', 'Smart', 'Suzuki', 'Isuzu', 'Iveco', 'Infiniti',
  'Lexus', 'Acura', 'Genesis', 'Cadillac', 'DS', 'Cupra', 'Dodge', 'Chrysler',
  'SsangYong', 'Rover', 'Universala', '2DIN Universala',
];

const OEM_RE = /\b(CIC|CCC|NBT|EVO|NOS|NJS|NSJ|NTG|MMI\s*[23]?G?|RMC|MHI2|HN\+?R)\b/i;

// Aceeași clasificare ca backend/scripts/checkPricesRama.py: spațiul din
// „8 CORE" vs „8CORE" separă cele două 4GB+64GB octa-core (1,6 vs 2,0 GHz).
const configOf = (name) => {
  if (/\btesla\b/i.test(name)) return null;
  if (/\bQLED\b/i.test(name)) return null;
  if (/\b4G\b/.test(name)) return null;
  if (/\b3K\b/i.test(name)) return null;
  if (OEM_RE.test(name)) return null;

  const is2k = /\b2K\b/i.test(name);
  const inchMatch = name.match(/(\d+(?:\.\d+)?)\s*inch\b/i);
  const inch = inchMatch ? inchMatch[1] : null;
  if (inch !== null && !['9', '10', '10.1'].includes(inch)) return null;

  const m = name.match(/(\d+)\s*GB\s+(\d+)\s*GB\s+(8\s?CORE|4\s*CORE|OCTA\s*CORE|QUAD\s*CORE)/i);
  if (!m) return null;
  const [, ram, rom] = m;
  const cores = m[3].replace(/\s+/g, ' ').toUpperCase();

  let coreKey;
  if (cores === '4 CORE' || cores === '4CORE' || cores === 'QUAD CORE') coreKey = '4 CORE';
  else if (cores === '8 CORE') coreKey = '8 CORE';
  else if (cores === '8CORE') coreKey = '8CORE';
  else return null;

  let key = `${ram}GB ${rom}GB ${coreKey}`;
  if (!(ram === '4' && rom === '64') || is2k) key = key.replace('8CORE', '8 CORE');
  if (is2k) key = `2K ${key}`;
  if (!GRID[key]) return null;
  return { config: key, inch };
};

const brandOf = (name) => {
  const clean = name.replace(/^Navigatie\s+PilotOn\s+/i, '').replace(/^Tip\s+Tesla\s+/i, '');
  const found = CAR_BRANDS.find((b) => new RegExp(`^${b}\\s+`, 'i').test(clean));
  if (!found) return null;
  if (found.toUpperCase() === 'VW') return 'Volkswagen';
  if (found.toLowerCase() === 'mercedes') return 'Mercedes Benz';
  if (found === '2DIN Universala') return 'Universala';
  return found;
};

// Numele paginii de model: tot ce e înainte de diagonală / 2K / memorie
const modelOf = (name) => {
  const rest = name.replace(/^Navigatie\s+PilotOn\s+/i, '');
  const cut = rest.match(/\s+(?:\b2K\b|\d+(?:\.\d+)?\s*inch\b|\d+\s*GB\b)/i);
  return (cut ? rest.slice(0, cut.index) : rest).trim();
};

const fetchAllProducts = async (onProgress) => {
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const all = [];
  let page = 1;
  let totalPages = 1;
  do {
    const url = buildApiUrl(
      `/products?category=navigatii-gps&limit=1000&page=${page}&sortBy=_id&sortOrder=asc`
    );
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Nu am putut citi produsele (${res.status})`);
    const data = await res.json();
    all.push(...(data.products || []));
    totalPages = data.pagination?.totalPages || 1;
    onProgress(Math.round((page / totalPages) * 100));
    page += 1;
  } while (page <= totalPages);
  return all;
};

// Sufixele de SKU ale celor 9 configurații. Prefixul rămas identifică rama, așa
// că pe paginile cu două-trei rame el e singurul lucru care spune care produs
// ține de care ramă (titlurile diferă doar prin scriere, ca să nu se ciocnească
// slugurile). Ordinea contează: „4GBOPO2" trebuie încercat înaintea lui „4GBOPO".
const SKU_SUFFIXES = [
  '4GBOPO2', '12GB2KPO', '4GB2KPO', '8GB2KPO',
  '2GBQPO', '4GBQPO', '4GBOPO', '6GBOPO', '8GBOPO',
];

const skuFamilyPrefix = (sku) => {
  if (!sku) return null;
  const suf = SKU_SUFFIXES.find((s) => sku.endsWith(s));
  return suf ? sku.slice(0, -suf.length) : null;
};

// O pagină poate avea mai multe rame, fiecare cu setul ei de 9 (Alex, 3 sep).
// Se sparge doar când chiar e cazul — dacă o configurație apare de mai multe
// ori — ca să nu rupem în fragmente familiile cu SKU-uri vechi (PILOT-1234).
const splitByRama = (group) => {
  const perConfig = {};
  group.items.forEach((it) => {
    perConfig[it.config] = (perConfig[it.config] || 0) + 1;
  });
  const ramas = Math.max(...Object.values(perConfig));
  if (ramas <= 1) return [group];

  const clusters = new Map();
  group.items.forEach((it) => {
    const key = skuFamilyPrefix(it.sku) || '—';
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key).push(it);
  });
  if (clusters.size < 2) return [group];
  return Array.from(clusters.values()).map((items) => ({ ...group, items }));
};

// Grupează produsele în familii (o ramă = un set de 9) și deduce treapta de
// preț din prețurile membrilor.
const buildFamilies = (products) => {
  const groups = new Map();

  products.forEach((p) => {
    const name = p.name || '';
    if (!/^Navigatie PilotOn\b/i.test(name)) return;
    const c = configOf(name);
    if (!c) return;
    const brand = brandOf(name);
    if (!brand) return;
    const model = modelOf(name);
    const size = c.inch === '10' || c.inch === '10.1' ? 10 : c.inch === '9' ? 9 : null;
    const key = `${model}|${size ?? '?'}`;
    if (!groups.has(key)) {
      groups.set(key, { brand, model, size, items: [] });
    }
    groups.get(key).items.push({ ...p, config: c.config });
  });

  // Produsele 2K fără diagonală în titlu se atașează ramei lor. Întâi după
  // prefixul de SKU (merge și când pagina are două rame), apoi, dacă pagina are
  // o singură diagonală, după ea.
  const sizedOfModel = new Map();
  groups.forEach((g, key) => {
    if (g.size === null) return;
    if (!sizedOfModel.has(g.model)) sizedOfModel.set(g.model, []);
    sizedOfModel.get(g.model).push({ key, group: g });
  });

  Array.from(groups.entries()).forEach(([key, g]) => {
    if (g.size !== null) return;
    const candidates = sizedOfModel.get(g.model) || [];
    if (!candidates.length) return;

    const leftovers = [];
    g.items.forEach((it) => {
      const prefix = skuFamilyPrefix(it.sku);
      let target = null;
      if (prefix) {
        let bestLen = -1;
        candidates.forEach(({ group }) => {
          group.items.forEach((sibling) => {
            const sp = skuFamilyPrefix(sibling.sku);
            if (!sp) return;
            const shared = sp === prefix || sp.startsWith(prefix) || prefix.startsWith(sp);
            if (shared && Math.min(sp.length, prefix.length) > bestLen) {
              bestLen = Math.min(sp.length, prefix.length);
              target = group;
            }
          });
        });
      }
      if (!target && candidates.length === 1) target = candidates[0].group;
      if (target) target.items.push(it);
      else leftovers.push(it);
    });

    if (leftovers.length) g.items = leftovers;
    else groups.delete(key);
  });

  const ramas = Array.from(groups.values()).flatMap(splitByRama);

  return ramas.map((g) => {
    const votes = [0, 0, 0];
    const prices = {};
    g.items.forEach((it) => {
      if (prices[it.config] === undefined) prices[it.config] = it.price;
      if (TIER_BLIND.has(it.config)) return;
      const idx = GRID[it.config].indexOf(it.price);
      if (idx >= 0) votes[idx] += 1;
    });
    const total = votes.reduce((a, b) => a + b, 0);
    const best = votes.indexOf(Math.max(...votes));
    const tier = total === 0 ? null : best;
    const offGrid = g.items.filter(
      (it) => !TIER_BLIND.has(it.config) && GRID[it.config].indexOf(it.price) === -1
    );
    const mixed = votes.filter((v) => v > 0).length > 1;
    const id = `${g.model}|${g.size ?? '?'}|${skuFamilyPrefix(g.items[0]?.sku) || g.items[0]?.slug}`;
    return { ...g, id, tier, mixed, offGrid, prices, count: g.items.length };
  });
};

const TierChip = ({ tier, mixed }) => {
  if (tier === null) {
    return (
      <Chip
        size="small"
        label="necunoscută"
        sx={{ fontFamily: t.mono, fontSize: '0.66rem', bgcolor: t.mist, color: t.steel }}
      />
    );
  }
  const s = TIERS[tier];
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
      <Chip
        size="small"
        label={s.label}
        sx={{
          fontFamily: t.mono,
          fontSize: '0.66rem',
          fontWeight: 600,
          letterSpacing: '0.04em',
          bgcolor: s.bg,
          color: s.color,
          border: `1px solid ${s.color}22`,
        }}
      />
      {mixed && (
        <Tooltip title="Produsele familiei nu cad toate pe aceeași treaptă">
          <WarningAmber sx={{ fontSize: 15, color: '#e65100' }} />
        </Tooltip>
      )}
    </Box>
  );
};

const microLabelSx = {
  fontFamily: t.mono,
  fontSize: '0.62rem',
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: t.steel,
};

const BrandSection = ({ brand, families, defaultExpanded }) => {
  const counts = [0, 0, 0];
  families.forEach((f) => {
    if (f.tier !== null) counts[f.tier] += 1;
  });

  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      disableGutters
      sx={{
        border: `1px solid ${t.line}`,
        borderRadius: '6px !important',
        boxShadow: 'none',
        mb: 1,
        '&:before': { display: 'none' },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: t.paper, minHeight: 52 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, pr: 2 }}>
          <Typography sx={{ fontWeight: 700, color: t.ink, fontSize: '0.95rem' }}>
            {brand}
          </Typography>
          <Box component="span" sx={{ ...microLabelSx }}>
            {families.length} {families.length === 1 ? 'ramă' : 'rame'}
          </Box>
          <Box sx={{ flex: 1 }} />
          {TIERS.map((s, i) =>
            counts[i] > 0 ? (
              <Box
                key={s.key}
                sx={{
                  fontFamily: t.mono,
                  fontSize: '0.66rem',
                  color: s.color,
                  bgcolor: s.bg,
                  border: `1px solid ${s.color}22`,
                  borderRadius: '4px',
                  px: 0.75,
                  py: '2px',
                }}
              >
                {s.label}: {counts[i]}
              </Box>
            ) : null
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0, borderTop: `1px solid ${t.line}` }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: t.mist }}>
                <TableCell sx={microLabelSx}>Model</TableCell>
                <TableCell sx={microLabelSx} align="center">Diag.</TableCell>
                <TableCell sx={microLabelSx} align="center">Produse</TableCell>
                <TableCell sx={microLabelSx}>Categorie ramă</TableCell>
                {CONFIGS.map((c) => (
                  <TableCell key={c} sx={{ ...microLabelSx, whiteSpace: 'nowrap' }} align="right">
                    {c.replace('256GB ', '256 ').replace('128GB ', '128 ').replace('GB ', ' ')}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {families.map((f) => (
                <TableRow key={f.id} hover>
                  <TableCell sx={{ color: t.ink, fontSize: '0.83rem' }}>{f.model}</TableCell>
                  <TableCell align="center" sx={{ fontFamily: t.mono, fontSize: '0.75rem', color: t.steel }}>
                    {f.size ? `${f.size}"` : '—'}
                  </TableCell>
                  <TableCell align="center">
                    <Box
                      component="span"
                      sx={{
                        fontFamily: t.mono,
                        fontSize: '0.72rem',
                        color: f.count === 9 ? t.steel : '#e65100',
                        fontWeight: f.count === 9 ? 400 : 700,
                      }}
                    >
                      {f.count}
                    </Box>
                  </TableCell>
                  <TableCell><TierChip tier={f.tier} mixed={f.mixed} /></TableCell>
                  {CONFIGS.map((c) => {
                    const price = f.prices[c];
                    const onGrid = price !== undefined && GRID[c].includes(price);
                    return (
                      <TableCell
                        key={c}
                        align="right"
                        sx={{
                          fontFamily: t.mono,
                          fontSize: '0.72rem',
                          color: price === undefined ? t.line : onGrid ? t.steel : '#e65100',
                          fontWeight: price !== undefined && !onGrid ? 700 : 400,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {price === undefined ? '—' : price}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export const PriceList = () => {
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('toate');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProgress(0);
    try {
      const products = await fetchAllProducts(setProgress);
      setFamilies(buildFamilies(products));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return families.filter((f) => {
      if (q && !`${f.brand} ${f.model}`.toLowerCase().includes(q)) return false;
      if (tierFilter === 'toate') return true;
      if (tierFilter === 'atentie') return f.mixed || f.offGrid.length > 0 || f.count !== 9;
      return String(f.tier) === tierFilter;
    });
  }, [families, search, tierFilter]);

  const byBrand = useMemo(() => {
    const map = new Map();
    filtered.forEach((f) => {
      if (!map.has(f.brand)) map.set(f.brand, []);
      map.get(f.brand).push(f);
    });
    return Array.from(map.entries())
      .map(([brand, list]) => [brand, list.sort((a, b) => a.model.localeCompare(b.model, 'ro'))])
      .sort((a, b) => a[0].localeCompare(b[0], 'ro'));
  }, [filtered]);

  const totals = useMemo(() => {
    const counts = [0, 0, 0];
    let attention = 0;
    families.forEach((f) => {
      if (f.tier !== null) counts[f.tier] += 1;
      if (f.mixed || f.offGrid.length > 0 || f.count !== 9) attention += 1;
    });
    return { counts, attention };
  }, [families]);

  return (
    <Box>
      <Title title="Prețuri" />

      <Card sx={{ p: 2.5, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 320px', minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, color: t.ink, mb: 0.5 }}>
              Familiile de 9 produse, pe categorii de preț
            </Typography>
            <Typography sx={{ color: t.steel, fontSize: '0.83rem' }}>
              Fiecare ramă de 9" sau 10" are un set de 9 configurații. Categoria se citește
              din prețurile setului: sub 100, 100 – 200 sau peste 200 de lei ramă.
            </Typography>
          </Box>
          <Button
            onClick={load}
            startIcon={<Refresh />}
            size="small"
            sx={{ flexShrink: 0 }}
            disabled={loading}
          >
            Reîncarcă
          </Button>
        </Box>

        {!loading && !error && (
          <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
            <Box sx={{ ...microLabelSx, alignSelf: 'center' }}>{families.length} rame</Box>
            {TIERS.map((s, i) => (
              <Box
                key={s.key}
                sx={{
                  fontFamily: t.mono,
                  fontSize: '0.7rem',
                  color: s.color,
                  bgcolor: s.bg,
                  border: `1px solid ${s.color}22`,
                  borderRadius: '4px',
                  px: 1,
                  py: '3px',
                }}
              >
                {s.label}: <b>{totals.counts[i]}</b>
              </Box>
            ))}
            {totals.attention > 0 && (
              <Box
                sx={{
                  fontFamily: t.mono,
                  fontSize: '0.7rem',
                  color: '#e65100',
                  bgcolor: '#fdf0e4',
                  border: '1px solid #e6510022',
                  borderRadius: '4px',
                  px: 1,
                  py: '3px',
                }}
              >
                de verificat: <b>{totals.attention}</b>
              </Box>
            )}
          </Box>
        )}
      </Card>

      {loading && (
        <Card sx={{ p: 3 }}>
          <Typography sx={{ color: t.steel, fontSize: '0.85rem', mb: 1.5 }}>
            Se citesc produsele… {progress}%
          </Typography>
          <LinearProgress variant="determinate" value={progress} />
        </Card>
      )}

      {error && (
        <Card sx={{ p: 3 }}>
          <Typography sx={{ color: '#c62828' }}>{error}</Typography>
        </Card>
      )}

      {!loading && !error && (
        <>
          <Card sx={{ p: 1.5, mb: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Caută marcă sau model…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flex: '1 1 260px' }}
            />
            <ToggleButtonGroup
              size="small"
              exclusive
              value={tierFilter}
              onChange={(e, v) => v && setTierFilter(v)}
            >
              <ToggleButton value="toate" sx={{ ...microLabelSx, px: 1.5 }}>Toate</ToggleButton>
              {TIERS.map((s) => (
                <ToggleButton key={s.key} value={String(s.key)} sx={{ ...microLabelSx, px: 1.5 }}>
                  {s.label}
                </ToggleButton>
              ))}
              <ToggleButton value="atentie" sx={{ ...microLabelSx, px: 1.5 }}>De verificat</ToggleButton>
            </ToggleButtonGroup>
          </Card>

          {byBrand.length === 0 ? (
            <Card sx={{ p: 3 }}>
              <Typography sx={{ color: t.steel }}>Nicio ramă nu se potrivește filtrelor.</Typography>
            </Card>
          ) : (
            byBrand.map(([brand, list]) => (
              <BrandSection
                key={brand}
                brand={brand}
                families={list}
                defaultExpanded={byBrand.length <= 3}
              />
            ))
          )}
        </>
      )}
    </Box>
  );
};

export default PriceList;
