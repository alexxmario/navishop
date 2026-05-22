import React from 'react';
import { Layout as RALayout, AppBar, Menu, Sidebar } from 'react-admin';
import { Box, Typography, Divider } from '@mui/material';
import logoSvg from '../logo.svg';

// Custom AppBar
const CustomAppBar = () => (
  <AppBar
    sx={{
      '& .MuiToolbar-root': {
        backgroundColor: '#18181b',
        minHeight: '56px',
        px: 2,
      }
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
      <img
        src={logoSvg}
        alt="PilotOn"
        style={{ height: 24, filter: 'brightness(0) invert(1)' }}
      />
      <Typography
        variant="body2"
        sx={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400, fontSize: '0.8rem' }}
      >
        /
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500, fontSize: '0.8rem' }}
      >
        Admin
      </Typography>
    </Box>
  </AppBar>
);

// Custom Menu
const CustomMenu = () => (
  <Menu>
    <Menu.DashboardItem />
    <Menu.ResourceItem name="orders" />
    <Menu.ResourceItem name="products" />
    <Menu.ResourceItem name="reviews" />
    <Menu.ResourceItem name="users" />
    <Menu.ResourceItem name="b2b-applications" />
  </Menu>
);

// Custom Sidebar
const CustomSidebar = () => (
  <Sidebar
    sx={{
      '& .MuiDrawer-paper': {
        backgroundColor: '#18181b',
        backgroundImage: 'none',
        borderRight: 'none',
        width: 220,
        pt: 1,
      }
    }}
  >
    <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 0.5 }} />
    <CustomMenu />
  </Sidebar>
);

// Main Layout
export const CustomLayout = ({ children, ...props }) => (
  <RALayout
    {...props}
    appBar={CustomAppBar}
    sidebar={CustomSidebar}
    sx={{
      '& .RaLayout-content': {
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
      }
    }}
  >
    {children}
  </RALayout>
);

export default CustomLayout;
