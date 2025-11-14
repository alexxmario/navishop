import React from 'react';
import { Login } from 'react-admin';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Container,
  Avatar,
} from '@mui/material';
import { Navigation, AdminPanelSettings } from '@mui/icons-material';

const LoginPage = () => (
  <Box
    sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 2,
    }}
  >
    <Container maxWidth="sm">
      <Card
        sx={{
          borderRadius: 3,
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            background: 'linear-gradient(90deg, #1976d2 0%, #1565c0 100%)',
            color: 'white',
            padding: 4,
            textAlign: 'center',
          }}
        >
          <Avatar
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              width: 80,
              height: 80,
              margin: '0 auto 16px',
            }}
          >
            <Navigation sx={{ fontSize: 40 }} />
          </Avatar>
          
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            PilotOn
          </Typography>
          
          <Typography variant="body1" sx={{ opacity: 0.9, mb: 1 }}>
            Navigation Systems
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <AdminPanelSettings sx={{ fontSize: 20 }} />
            <Typography variant="h6" sx={{ fontWeight: 500 }}>
              Admin Panel
            </Typography>
          </Box>
        </Box>
        
        <CardContent sx={{ padding: 4 }}>
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#333' }}>
              Welcome Back
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Sign in to manage your navigation systems business
            </Typography>
          </Box>
          
          <Login
            sx={{
              '& .MuiCard-root': {
                boxShadow: 'none',
                background: 'transparent',
              },
              '& .MuiCardContent-root': {
                padding: 0,
              },
              '& .MuiTextField-root': {
                marginBottom: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              },
              '& .MuiButton-root': {
                borderRadius: 2,
                padding: '12px 24px',
                fontSize: '1rem',
                fontWeight: 600,
                background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1565c0 30%, #1976d2 90%)',
                },
              },
            }}
          />
          
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">
              Demo Credentials: <strong>admin</strong> / <strong>admin123456</strong>
            </Typography>
          </Box>
        </CardContent>
      </Card>
      
      <Box sx={{ textAlign: 'center', mt: 3, color: 'rgba(255, 255, 255, 0.8)' }}>
        <Typography variant="body2">
          © 2025 PilotOn Navigation Systems. Professional admin panel for order processing.
        </Typography>
      </Box>
    </Container>
  </Box>
);

export default LoginPage;