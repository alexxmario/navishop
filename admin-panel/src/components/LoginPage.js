import React from 'react';
import { Login } from 'react-admin';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Container,
} from '@mui/material';
import { adminTokens as t } from '../theme';

const LoginPage = () => (
  <Box
    sx={{
      minHeight: '100vh',
      backgroundColor: t.night,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 2,
    }}
  >
    <Container maxWidth="xs">
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25, mb: 3, justifyContent: 'center' }}>
        <Typography
          component="div"
          sx={{
            fontWeight: 700,
            fontSize: '1.5rem',
            letterSpacing: '-0.02em',
            color: t.paper,
          }}
        >
          PilotOn<Box component="span" sx={{ color: t.blue }}>.</Box>
        </Typography>
        <Box
          component="span"
          sx={{
            fontFamily: t.mono,
            fontSize: '0.64rem',
            fontWeight: 500,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#64b5f6',
            border: `1px solid ${t.nightLine}`,
            borderRadius: '4px',
            padding: '2px 7px',
          }}
        >
          Admin
        </Box>
      </Box>

      <Card
        sx={{
          borderRadius: '16px',
          border: `1px solid ${t.nightLine}`,
          boxShadow: 'none',
          overflow: 'hidden',
        }}
      >
        <CardContent sx={{ padding: 4 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: t.ink }}>
              Bine ați revenit
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Autentificați-vă pentru a gestiona afacerea
            </Typography>
          </Box>

          <Login
            sx={{
              '& .MuiCard-root': {
                boxShadow: 'none',
                border: 'none',
                background: 'transparent',
              },
              '& .MuiCardContent-root': {
                padding: 0,
              },
              '& .MuiTextField-root': {
                marginBottom: 2,
              },
              '& .MuiButton-root': {
                borderRadius: 999,
                padding: '11px 24px',
                fontSize: '0.95rem',
                fontWeight: 600,
                boxShadow: 'none',
                backgroundColor: t.blue,
                '&:hover': {
                  backgroundColor: t.blueDark,
                  boxShadow: 'none',
                },
              },
            }}
          />

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">
              Date de acces demo: <strong>admin</strong> / <strong>admin123456</strong>
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Typography
        sx={{
          textAlign: 'center',
          mt: 3,
          fontFamily: t.mono,
          fontSize: '0.66rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#5d666f',
        }}
      >
        © 2025 PilotOn · Sisteme de navigație
      </Typography>
    </Container>
  </Box>
);

export default LoginPage;
