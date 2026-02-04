import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Grid, 
  Box, 
  Avatar,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button
} from '@mui/material';
import { 
  ShoppingCart, 
  LocalShipping, 
  Inventory,
  TrendingUp,
  Assessment,
  Speed,
  Timeline,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon
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
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { buildApiUrl } from '../config/api';

// Helper function to make authenticated API calls
const apiCall = async (endpoint) => {
  const token = localStorage.getItem('token');
  const response = await fetch(buildApiUrl(endpoint), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
};

const StatCard = ({ title, value, icon, color = 'primary', trend, subtitle }) => (
  <Card 
    sx={{ 
      height: '100%',
      background: `linear-gradient(135deg, ${color === 'primary' ? '#1976d2' : 
                   color === 'success' ? '#4caf50' :
                   color === 'warning' ? '#ff9800' :
                   color === 'info' ? '#2196f3' : '#1976d2'} 0%, ${
                   color === 'primary' ? '#1565c0' : 
                   color === 'success' ? '#388e3c' :
                   color === 'warning' ? '#f57c00' :
                   color === 'info' ? '#1976d2' : '#1565c0'} 100%)`,
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '50%',
        transform: 'scale(2) translate(60%, -60%)',
      }
    }}
  >
    <CardContent sx={{ position: 'relative', zIndex: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h4" component="div" sx={{ fontWeight: 700 }}>
          {value}
        </Typography>
        <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', width: 56, height: 56 }}>
          {icon}
        </Avatar>
      </Box>
      <Typography variant="body1" sx={{ opacity: 0.9, fontWeight: 500 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" sx={{ opacity: 0.7, mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
      {trend && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <TrendingUp sx={{ fontSize: 16 }} />
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            {trend}
          </Typography>
        </Box>
      )}
    </CardContent>
  </Card>
);

const ChartCard = ({ title, icon, children, height = 300 }) => (
  <Card sx={{ height: '100%', p: 2 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
      <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
        {icon}
      </Avatar>
      <Typography variant="h6" component="div">
        {title}
      </Typography>
    </Box>
    <Box sx={{ height: height }}>
      {children}
    </Box>
  </Card>
);

const getStatusColor = (status) => {
  switch (status) {
    case 'Pending': return 'warning';
    case 'Processing': return 'info';
    case 'Shipped': return 'primary';
    case 'Delivered': return 'success';
    default: return 'default';
  }
};

export const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    stats: null,
    sales: [],
    productDistribution: [],
    recentOrders: [],
    loading: true,
    error: null
  });

  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);

      const [stats, sales, productDistribution, recentOrders] = await Promise.all([
        apiCall('/dashboard/stats'),
        apiCall('/dashboard/sales?months=6'),
        apiCall('/dashboard/product-distribution'),
        apiCall('/dashboard/recent-orders?limit=5')
      ]);

      setDashboardData({
        stats,
        sales,
        productDistribution,
        recentOrders,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDashboardData(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const { stats, sales, productDistribution, recentOrders, loading, error } = dashboardData;

  if (loading && !stats) {
    return (
      <Box sx={{
        p: 4,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '50vh'
      }}>
        <Typography variant="h6">Se încarcă datele...</Typography>
      </Box>
    );
  }

  if (error && !stats) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h6" color="error" gutterBottom>
          Eroare la încărcarea panoului: {error}
        </Typography>
        <Button variant="contained" onClick={fetchDashboardData}>
          Reîncearcă
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: 4, 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      minHeight: '100vh'
    }}>
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h3" 
          gutterBottom 
          sx={{ 
            fontWeight: 800, 
            background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          PilotOn Panou de Administrare
        </Typography>
        
        <Typography variant="h6" color="textSecondary" sx={{ mb: 1 }}>
          Administrare Sisteme de Navigație
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Assessment sx={{ color: '#1976d2' }} />
          <Typography variant="body1" color="textSecondary">
            Procesare Comenzi și Analiză Business
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6} lg={3}>
          <StatCard
            title="Comenzi în așteptare"
            subtitle="Așteaptă confirmarea"
            value={stats?.orders?.pending?.toString() || '0'}
            icon={<ShoppingCart sx={{ fontSize: 32 }} />}
            color="warning"
            trend={refreshing ? 'Se actualizează...' : 'Date live'}
          />
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <StatCard
            title="Comenzi în procesare"
            subtitle="Se pregătesc"
            value={stats?.orders?.processing?.toString() || '0'}
            icon={<Speed sx={{ fontSize: 32 }} />}
            color="info"
            trend={refreshing ? 'Se actualizează...' : 'Date live'}
          />
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <StatCard
            title="Comenzi expediate"
            subtitle="În tranzit"
            value={stats?.orders?.shipped?.toString() || '0'}
            icon={<LocalShipping sx={{ fontSize: 32 }} />}
            color="success"
            trend={refreshing ? 'Se actualizează...' : 'Date live'}
          />
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <StatCard
            title="Produse active"
            subtitle="Disponibile în stoc"
            value={stats?.products?.active?.toString() || '0'}
            icon={<Inventory sx={{ fontSize: 32 }} />}
            color="primary"
            trend={stats?.products?.lowStock ? `${stats.products.lowStock} stoc redus` : 'Stoc complet'}
          />
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <ChartCard 
            title="Sumar Vânzări și Comenzi" 
            icon={<BarChartIcon />}
            height={400}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="orders"
                  stackId="1"
                  stroke="#8884d8"
                  fill="#8884d8"
                  name="Comenzi"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  stackId="2"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  name="Venituri (RON)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <ChartCard 
            title="Distribuție Produse" 
            icon={<PieChartIcon />}
            height={400}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {productDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>

      {/* Website Traffic and Recent Orders */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                  <Timeline />
                </Avatar>
                <Typography variant="h6" component="div">
                  Statistici rapide
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                    <Typography variant="h5" color="white">
                      {stats?.revenue?.thisMonth?.toLocaleString() || '0'} RON
                    </Typography>
                    <Typography variant="body2" color="white">Luna aceasta</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
                    <Typography variant="h5" color="white">
                      {stats?.revenue?.total?.toLocaleString() || '0'} RON
                    </Typography>
                    <Typography variant="body2" color="white">Venit total</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
                    <Typography variant="h5" color="white">
                      {stats?.users?.total || '0'}
                    </Typography>
                    <Typography variant="body2" color="white">Utilizatori înregistrați</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'error.light', borderRadius: 2 }}>
                    <Typography variant="h5" color="white">
                      {stats?.products?.lowStock || '0'}
                    </Typography>
                    <Typography variant="body2" color="white">Produse cu stoc redus</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                  <Assessment />
                </Avatar>
                <Typography variant="h6" component="div">
                  Comenzi recente
                </Typography>
              </Box>
              <TableContainer component={Paper} sx={{ maxHeight: 240 }}>
                <Table stickyHeader size="small">
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
                          <Typography variant="body2" fontWeight="medium">
                            {order.orderNumber}
                          </Typography>
                          {order.orderType === 'guest' && (
                            <Chip label="Vizitator" size="small" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {order.customer}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {order.product}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {order.amount}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={order.status}
                            color={getStatusColor(order.status)}
                            size="small"
                          />
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
          <ChartCard 
            title="Defalcare venituri lunare" 
            icon={<BarChartIcon />}
            height={350}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'revenue' ? `${value.toLocaleString()} RON` : value,
                    name === 'revenue' ? 'Venituri' : 'Comenzi'
                  ]}
                />
                <Legend />
                <Bar dataKey="orders" fill="#8884d8" name="Comenzi" />
                <Bar dataKey="revenue" fill="#82ca9d" name="Venituri (RON)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>

    </Box>
  );
};

export default Dashboard;
