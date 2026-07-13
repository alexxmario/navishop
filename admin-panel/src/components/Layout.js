import React from 'react';
import { Layout as RALayout, AppBar, Menu, Sidebar } from 'react-admin';
import { Box, Typography } from '@mui/material';
import { adminTokens as t } from '../theme';

// Bară albă, plată, cu bordură jos — logo tip „wordmark" + etichetă ADMIN
const CustomAppBar = () => (
  <AppBar
    color="inherit"
    sx={{
      backgroundColor: t.paper,
      color: t.ink,
      boxShadow: 'none',
      borderBottom: `1px solid ${t.line}`,
      '& .MuiToolbar-root': {
        backgroundColor: t.paper,
        minHeight: '56px',
      },
      '& .MuiIconButton-root': {
        color: t.steel,
      },
      '& .RaLoadingIndicator-loader': {
        color: t.blue,
      },
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25, flex: 1, minWidth: 0 }}>
      <Typography
        component="div"
        sx={{
          fontWeight: 700,
          fontSize: '1.05rem',
          letterSpacing: '-0.02em',
          color: t.ink,
          whiteSpace: 'nowrap',
        }}
      >
        PilotOn<Box component="span" sx={{ color: t.blue }}>.</Box>
      </Typography>
      <Box
        component="span"
        sx={{
          fontFamily: t.mono,
          fontSize: '0.62rem',
          fontWeight: 500,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: t.blue,
          border: `1px solid ${t.line}`,
          borderRadius: '4px',
          padding: '2px 6px',
          whiteSpace: 'nowrap',
        }}
      >
        Admin
      </Box>
    </Box>
  </AppBar>
);

// Meniul rămâne identic funcțional; stilurile itemilor vin din tema
// RaMenuItemLink (fundal închis, text deschis, iconiță albastră pe activ)
const CustomMenu = () => (
  <Menu sx={{ pt: 1.5 }}>
    <Menu.DashboardItem />
    <Menu.ResourceItem name="orders" />
    <Menu.ResourceItem name="products" />
    <Menu.ResourceItem name="reviews" />
    <Menu.ResourceItem name="users" />
    <Menu.ResourceItem name="b2b-applications" />
    <Menu.ResourceItem name="contact-messages" />
  </Menu>
);

// Lateral întunecat, în limbajul panoului enavigatii
const CustomSidebar = () => (
  <Sidebar
    sx={{
      '& .MuiDrawer-paper': {
        background: t.night,
        borderRight: 'none',
        width: 248,
      },
      '& .MuiPaper-root': {
        background: t.night,
      },
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
        background: t.mist,
        minHeight: '100vh',
        padding: { xs: '16px 12px', sm: '24px 24px', lg: '28px 32px' },
      },
    }}
  >
    {children}
  </RALayout>
);

export default CustomLayout;
