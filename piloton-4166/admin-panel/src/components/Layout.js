import React from 'react';
import { Layout as RALayout, AppBar, Menu, Sidebar } from 'react-admin';
import { Box, Typography } from '@mui/material';
import { Navigation, Business } from '@mui/icons-material';

// Custom AppBar with PilotOn branding
const CustomAppBar = () => (
  <AppBar 
    sx={{ 
      '& .MuiToolbar-root': { 
        background: 'linear-gradient(90deg, #1976d2 0%, #1565c0 100%)',
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
          sx={{ 
            fontWeight: 700,
            color: 'white',
            letterSpacing: '0.5px'
          }}
        >
          PilotOn
        </Typography>
        <Typography 
          variant="caption" 
          component="div" 
          sx={{ 
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '0.75rem',
            marginTop: '-2px'
          }}
        >
          Navigation Systems Admin
        </Typography>
      </Box>
    </Box>
  </AppBar>
);

// Custom Menu with icons
const CustomMenu = () => (
  <Menu>
    <Menu.DashboardItem />
    <Menu.ResourceItem name="orders" />
    <Menu.ResourceItem name="products" />
    <Menu.ResourceItem name="users" />
  </Menu>
);

// Custom Sidebar
const CustomSidebar = () => (
  <Sidebar 
    sx={{ 
      '& .MuiDrawer-paper': { 
        background: 'linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%)',
        borderRight: '1px solid #e0e0e0',
        width: 240,
      }
    }}
  >
    <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', mb: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Business sx={{ color: '#1976d2', fontSize: 20 }} />
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#333' }}>
          Admin Panel
        </Typography>
      </Box>
    </Box>
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
        background: '#f8f9fa',
        minHeight: '100vh',
      }
    }}
  >
    {children}
  </RALayout>
);

export default CustomLayout;