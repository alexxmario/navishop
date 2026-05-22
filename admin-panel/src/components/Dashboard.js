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
} from '@mui/material';
import {
  ShoppingCart,
  LocalShipping,
  Inventory,
  Speed,
  TrendingUp,
  Assessment,
  Timeline,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Refresh,
} from '@mui/icons-material';
import {
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
  AreaChart,
  Area,
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

// Solid color backgrounds — no gradient, no pseudo-element decorations
const CARD_COLORS = {
  primary: '#1565c0',
  success:  '#2e7d32',
  warning:  '#e65100',
  info:     '#0277bd',
};

const StatCard = ({ title, value, icon, color = 'primary', subtitle }) => {
  const bg = CARD_COLORS[color] || CARD_COLORS.primary;
  return (
    <Card sx={{ height: '100%', bgcolor: bg, color: 'white' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {value}
          </Typography>
          <Box sx={{ bgcolor: 'rgba(255,255,255,0.18)', borderRadius: 1.5, p: 1, display: 'flex' }}>
            {React.cloneElement(icon, { sx: { fontSize: 26, color: 'white' } })}
          </Box>
        </Box>
        <Typography variant="body1" sx={{ fontWeight: 500, opacity: 0.95 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ opacity: 0.7, mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

const ChartCard = ({ title, icon, children, height = 300 }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <Box sx={{ bgcolor: 'primary.main', borderRadius: 1.5, p: 0.75, display: 'flex', color: 'white' }}>
          {React.cloneElement(icon, { sx: { fontSize: 18 } })}
        </Box>
        <Typography variant="h6">{title}</Typography>
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
        <Typography variant="h6" color="text.secondary">Se încarcă datele...</Typography>
      </Box>
    );
  }

  if (error && !stats) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h6" color="error" gutterBottom>
          Eroare la încărcarea panoului: {error}
        </Typography>
        <Button variant="contained" onClick={fetchDashboardData}>Reîncearcă</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, bgcolor: '#f5f5f5', minHeight: '100vh' }}>

      {/* Header — no gradient text */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Panou de Administrare
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            Administrare Sisteme de Navigație · Procesare Comenzi și Analiză Business
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<Refresh sx={{ fontSize: 16 }} />}
          onClick={fetchDashboardData}
          disabled={refreshing}
        >
          {refreshing ? 'Se actualizează...' : 'Actualizează'}
        </Button>
      </Box>

      {/* Stat Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} xl={3}>
          <StatCard
            title="Comenzi în așteptare"
            subtitle="Așteaptă confirmarea"
            value={stats?.orders?.pending?.toString() ?? '0'}
            icon={<ShoppingCart />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <StatCard
            title="Comenzi în procesare"
            subtitle="Se pregătesc"
            value={stats?.orders?.processing?.toString() ?? '0'}
            icon={<Speed />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <StatCard
            title="Comenzi expediate"
            subtitle="În tranzit"
            value={stats?.orders?.shipped?.toString() ?? '0'}
            icon={<LocalShipping />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <StatCard
            title="Produse active"
            subtitle={stats?.products?.lowStock ? `${stats.products.lowStock} stoc redus` : 'Stoc complet'}
            value={stats?.products?.active?.toString() ?? '0'}
            icon={<Inventory />}
            color="primary"
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <ChartCard title="Sumar Vânzări și Comenzi" icon={<BarChartIcon />} height={380}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sales} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eeeeee" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, fontSize: 13, border: '1px solid #e0e0e0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                />
                <Legend wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
                <Area yAxisId="left"  type="monotone" dataKey="orders"  stroke="#1976d2" fill="rgba(25,118,210,0.12)" strokeWidth={2} name="Comenzi" dot={false} />
                <Area yAxisId="right" type="monotone" dataKey="revenue" stroke="#4caf50" fill="rgba(76,175,80,0.12)"  strokeWidth={2} name="Venituri (RON)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <ChartCard title="Distribuție Produse" icon={<PieChartIcon />} height={380}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productDistribution}
                  cx="50%"
                  cy="46%"
                  outerRadius={110}
                  innerRadius={55}
                  dataKey="value"
                  paddingAngle={2}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {productDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>

      {/* Quick Stats + Recent Orders */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Financial stats — full-width labels so values never get cut off */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Box sx={{ bgcolor: 'primary.main', borderRadius: 1.5, p: 0.75, display: 'flex', color: 'white' }}>
                  <Timeline sx={{ fontSize: 18 }} />
                </Box>
                <Typography variant="h6">Statistici rapide</Typography>
              </Box>

              {/* Full-width rows — values never truncate */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[
                  { label: 'Venit luna aceasta', value: `${(stats?.revenue?.thisMonth || 0).toLocaleString()} RON`, color: 'success.main' },
                  { label: 'Venit total',         value: `${(stats?.revenue?.total || 0).toLocaleString()} RON`,     color: 'primary.main' },
                  { label: 'Utilizatori înregistrați', value: (stats?.users?.total || 0).toString(),                 color: 'text.primary' },
                  { label: 'Produse cu stoc redus',    value: (stats?.products?.lowStock || 0).toString(),           color: 'warning.main' },
                ].map(({ label, value, color }) => (
                  <Box key={label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">{label}</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color, textAlign: 'right', ml: 2 }}>
                      {value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box sx={{ bgcolor: 'primary.main', borderRadius: 1.5, p: 0.75, display: 'flex', color: 'white' }}>
                  <Assessment sx={{ fontSize: 18 }} />
                </Box>
                <Typography variant="h6">Comenzi recente</Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID Comandă</TableCell>
                      <TableCell>Client</TableCell>
                      <TableCell>Sumă</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentOrders.map((order) => (
                      <TableRow key={order.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">{order.orderNumber}</Typography>
                          {order.orderType === 'guest' && (
                            <Chip label="Vizitator" size="small" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{order.customer}</Typography>
                          <Typography variant="caption" color="text.secondary">{order.product}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">{order.amount}</Typography>
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
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <ChartCard title="Defalcare Venituri Lunare" icon={<BarChartIcon />} height={320}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sales} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eeeeee" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, fontSize: 13, border: '1px solid #e0e0e0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  formatter={(value, name) => [
                    name === 'revenue' ? `${value.toLocaleString()} RON` : value,
                    name === 'revenue' ? 'Venituri' : 'Comenzi',
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
                <Bar dataKey="orders"  fill="#1976d2" name="Comenzi"       radius={[4,4,0,0]} maxBarSize={48} />
                <Bar dataKey="revenue" fill="#4caf50" name="Venituri (RON)" radius={[4,4,0,0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>

    </Box>
  );
};

export default Dashboard;
