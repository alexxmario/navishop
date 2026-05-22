import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Divider,
} from '@mui/material';
import {
  ShoppingCart,
  LocalShipping,
  Inventory,
  Speed,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Refresh,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { buildApiUrl } from '../config/api';

const apiCall = async (endpoint) => {
  const token = localStorage.getItem('token');
  const response = await fetch(buildApiUrl(endpoint), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error(`API call failed: ${response.statusText}`);
  return response.json();
};

const ICON_PALETTE = {
  primary: { bg: '#eff6ff', color: '#2563eb' },
  success:  { bg: '#f0fdf4', color: '#16a34a' },
  warning:  { bg: '#fffbeb', color: '#d97706' },
  info:     { bg: '#f0f9ff', color: '#0ea5e9' },
  error:    { bg: '#fef2f2', color: '#dc2626' },
};

const StatCard = ({ title, value, icon, color = 'primary', subtitle }) => {
  const c = ICON_PALETTE[color] || ICON_PALETTE.primary;
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 38,
            height: 38,
            borderRadius: 1.5,
            bgcolor: c.bg,
            color: c.color,
            mb: 2,
          }}
        >
          {React.cloneElement(icon, { sx: { fontSize: 19 } })}
        </Box>
        <Typography sx={{ fontSize: '1.625rem', fontWeight: 700, lineHeight: 1, color: 'text.primary', mb: 0.5 }}>
          {value}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

const ChartCard = ({ title, children, height = 300, action }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6">{title}</Typography>
        {action}
      </Box>
      <Box sx={{ height }}>{children}</Box>
    </CardContent>
  </Card>
);

const getStatusColor = (status) => {
  switch (status) {
    case 'Pending':    return 'warning';
    case 'Processing': return 'info';
    case 'Shipped':    return 'primary';
    case 'Delivered':  return 'success';
    default:           return 'default';
  }
};

export const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    stats: null,
    sales: [],
    productDistribution: [],
    recentOrders: [],
    loading: true,
    error: null,
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const [stats, sales, productDistribution, recentOrders] = await Promise.all([
        apiCall('/dashboard/stats'),
        apiCall('/dashboard/sales?months=6'),
        apiCall('/dashboard/product-distribution'),
        apiCall('/dashboard/recent-orders?limit=5'),
      ]);
      setDashboardData({ stats, sales, productDistribution, recentOrders, loading: false, error: null });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDashboardData((prev) => ({ ...prev, loading: false, error: error.message }));
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const { stats, sales, productDistribution, recentOrders, loading, error } = dashboardData;

  if (loading && !stats) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Typography variant="body1" color="text.secondary">Se încarcă datele...</Typography>
      </Box>
    );
  }

  if (error && !stats) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="body1" color="error" sx={{ mb: 2 }}>
          Eroare la încărcarea panoului: {error}
        </Typography>
        <Button variant="outlined" size="small" onClick={fetchDashboardData}>
          Reîncearcă
        </Button>
      </Box>
    );
  }

  const today = new Date().toLocaleDateString('ro-RO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: 'background.default', minHeight: '100vh' }}>

      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Panou de Administrare
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, textTransform: 'capitalize' }}>
            {today}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<Refresh sx={{ fontSize: 16 }} />}
          onClick={fetchDashboardData}
          disabled={refreshing}
          sx={{ color: 'text.secondary', borderColor: 'divider' }}
        >
          {refreshing ? 'Actualizare...' : 'Actualizează'}
        </Button>
      </Box>

      {/* Stat Cards */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Comenzi în așteptare"
            subtitle="Așteaptă confirmarea"
            value={stats?.orders?.pending?.toString() ?? '0'}
            icon={<ShoppingCart />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Comenzi în procesare"
            subtitle="Se pregătesc"
            value={stats?.orders?.processing?.toString() ?? '0'}
            icon={<Speed />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Comenzi expediate"
            subtitle="În tranzit"
            value={stats?.orders?.shipped?.toString() ?? '0'}
            icon={<LocalShipping />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Produse active"
            subtitle={stats?.products?.lowStock ? `${stats.products.lowStock} cu stoc redus` : 'Stoc complet'}
            value={stats?.products?.active?.toString() ?? '0'}
            icon={<Inventory />}
            color="primary"
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <ChartCard title="Vânzări și comenzi" height={360}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sales} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  labelStyle={{ color: '#0f172a', fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12 }} />
                <Area yAxisId="left"  type="monotone" dataKey="orders"  stroke="#2563eb" fill="url(#colorOrders)"  strokeWidth={2} name="Comenzi" dot={false} />
                <Area yAxisId="right" type="monotone" dataKey="revenue" stroke="#16a34a" fill="url(#colorRevenue)" strokeWidth={2} name="Venituri (RON)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <ChartCard title="Distribuție produse" height={360}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productDistribution}
                  cx="50%"
                  cy="46%"
                  outerRadius={100}
                  innerRadius={52}
                  dataKey="value"
                  paddingAngle={2}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {productDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>

      {/* Quick Stats + Recent Orders */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>Rezumat financiar</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                {[
                  { label: 'Venit luna aceasta', value: `${(stats?.revenue?.thisMonth || 0).toLocaleString()} RON`, color: '#16a34a' },
                  { label: 'Venit total', value: `${(stats?.revenue?.total || 0).toLocaleString()} RON`, color: '#2563eb' },
                  { label: 'Utilizatori înregistrați', value: stats?.users?.total?.toString() || '0', color: '#0f172a' },
                  { label: 'Produse stoc redus', value: stats?.products?.lowStock?.toString() || '0', color: '#d97706' },
                ].map(({ label, value, color }) => (
                  <Box key={label}>
                    <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color, lineHeight: 1, mb: 0.5 }}>
                      {value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3, pb: '24px !important' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Comenzi recente</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Comandă</TableCell>
                      <TableCell>Client</TableCell>
                      <TableCell>Sumă</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {order.orderNumber}
                          </Typography>
                          {order.orderType === 'guest' && (
                            <Typography variant="caption" color="text.secondary">Vizitator</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{order.customer}</Typography>
                          <Typography variant="caption" color="text.secondary">{order.product}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{order.amount}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={order.status} color={getStatusColor(order.status)} size="small" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Monthly Revenue Bar Chart */}
      <Grid container spacing={2.5}>
        <Grid item xs={12}>
          <ChartCard title="Venituri lunare" height={320}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sales} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  formatter={(value, name) => [
                    name === 'revenue' ? `${value.toLocaleString()} RON` : value,
                    name === 'revenue' ? 'Venituri' : 'Comenzi',
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12 }} />
                <Bar dataKey="orders"  fill="#2563eb" name="Comenzi"       radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="revenue" fill="#16a34a" name="Venituri (RON)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>

    </Box>
  );
};

export default Dashboard;
