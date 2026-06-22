import React from 'react';
import { Layout as RALayout, AppBar, Menu, Sidebar } from 'react-admin';
import { Box, Typography } from '@mui/material';
import { Navigation } from '@mui/icons-material';

// Custom AppBar — solid blue, no gradient
const CustomAppBar = () => (
  <AppBar
    sx={{
      '& .MuiToolbar-root': {
        backgroundColor: '#1565c0',
        minHeight: '64px',
      }
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
      <Navigation sx={{ fontSize: 28, color: 'white' }} />
      <Box>
        <Typography
          variant="h6"
          component="div"
          sx={{ fontWeight: 700, color: 'white', letterSpacing: '0.5px' }}
        >
          PilotOn
        </Typography>
        <Typography
          variant="caption"
          component="div"
          sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.7rem', mt: '-2px' }}
        >
          Administrare Sisteme de Navigație
        </Typography>
      </Box>
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
    <Menu.ResourceItem name="contact-messages" />
  </Menu>
);

// White sidebar — no gradient, proper MUI defaults apply
const CustomSidebar = () => (
  <Sidebar
    sx={{
      '& .MuiDrawer-paper': {
        background: '#ffffff',
        borderRight: '1px solid #e0e0e0',
        width: 240,
      }
    }}
  >
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
        background: '#f5f5f5',
        minHeight: '100vh',
      }
    }}
  >
    {children}
  </RALayout>
);

export default CustomLayout;
