import React, { useState } from 'react';
import {
  Show,
  SimpleShowLayout,
  FunctionField,
  TopToolbar,
  EditButton,
  DeleteButton,
  useRecordContext,
  useNotify,
  useRefresh
} from 'react-admin';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Rating,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField as MuiTextField,
  Divider,
  Grid,
  Link as MuiLink
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Pending,
  ThumbUp,
  Star,
  Person,
  Inventory,
  Schedule
} from '@mui/icons-material';
import { buildApiUrl } from '../config/api';

// Custom review content display
const ReviewContent = () => {
  const record = useRecordContext();

  if (!record) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle />;
      case 'rejected': return <Cancel />;
      case 'pending': return <Pending />;
      default: return <Pending />;
    }
  };

  return (
    <Grid container spacing={3}>
      {/* Review Header */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Person sx={{ fontSize: 40, color: 'primary.main' }} />
              <Box>
                <Typography variant="h6">{record.userName}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {record.userEmail}
                </Typography>
              </Box>
              <Box sx={{ ml: 'auto' }}>
                <Chip
                  icon={getStatusIcon(record.status)}
                  label={record.status.toUpperCase()}
                  color={getStatusColor(record.status)}
                />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Rating value={record.rating} readOnly />
              <Typography variant="h6">({record.rating}/5)</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2 }}>
                <ThumbUp sx={{ fontSize: 16 }} />
                <Typography variant="body2">{record.helpfulVotes} voturi utile</Typography>
              </Box>
            </Box>

            <Typography variant="body2" color="textSecondary">
              <Schedule sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
              Trimisă pe {new Date(record.createdAt).toLocaleDateString('ro-RO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Review Title */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Titlu recenzie</Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              {record.title}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Review Comment */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Conținut recenzie</Typography>
            <Typography
              variant="body1"
              sx={{
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                p: 2,
                backgroundColor: 'grey.50',
                borderRadius: 1,
                border: 1,
                borderColor: 'grey.200'
              }}
            >
              {record.comment}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Admin Information */}
      {(record.adminNotes || record.status === 'rejected') && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="error">
                Note admin
              </Typography>
              <Typography variant="body1">
                {record.adminNotes || 'Nu au fost adăugate note de admin.'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Review Images */}
      {record.images && record.images.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Imagini recenzie</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {record.images.map((image, index) => (
                  <img
                    key={index}
                    src={image.url}
                    alt={image.alt || `Review image ${index + 1}`}
                    style={{
                      width: 150,
                      height: 150,
                      objectFit: 'cover',
                      borderRadius: 8,
                      border: '1px solid #e0e0e0'
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Verification Status */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Status verificare</Typography>
            <Chip
              label={record.verified ? 'Achiziție verificată' : 'Neverificată'}
              color={record.verified ? 'success' : 'default'}
              variant={record.verified ? 'filled' : 'outlined'}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

// Admin action buttons
const ReviewAdminActions = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const refresh = useRefresh();
  const [adminDialog, setAdminDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState(record?.adminNotes || '');

  const handleStatusChange = async (newStatus) => {
    try {
      const response = await fetch(buildApiUrl(`reviews/admin/${record.id}/status`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: newStatus,
          adminNotes: adminNotes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update review status');
      }

      notify(`Review ${newStatus} successfully`, { type: 'success' });
      refresh();
    } catch (error) {
      notify('Error updating review status', { type: 'error' });
    }
    setAdminDialog(false);
  };

  return (
    <TopToolbar>
      <Box sx={{ display: 'flex', gap: 1 }}>
        {record?.status !== 'approved' && (
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircle />}
            onClick={() => handleStatusChange('approved')}
          >
            Aprobă
          </Button>
        )}

        {record?.status !== 'rejected' && (
          <Button
            variant="contained"
            color="error"
            startIcon={<Cancel />}
            onClick={() => setAdminDialog(true)}
          >
            Respinge
          </Button>
        )}

        {record?.status !== 'pending' && (
          <Button
            variant="outlined"
            color="warning"
            startIcon={<Pending />}
            onClick={() => handleStatusChange('pending')}
          >
            Setează în așteptare
          </Button>
        )}
      </Box>

      <EditButton />
      <DeleteButton />

      {/* Admin Notes Dialog */}
      <Dialog open={adminDialog} onClose={() => setAdminDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Respinge recenzia</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Opțional, specificați motivul respingerii:
          </Typography>
          <MuiTextField
            fullWidth
            multiline
            rows={4}
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Motivul respingerii (opțional)"
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdminDialog(false)}>Anulează</Button>
          <Button onClick={() => handleStatusChange('rejected')} color="error" variant="contained">
            Respinge recenzia
          </Button>
        </DialogActions>
      </Dialog>
    </TopToolbar>
  );
};

const ProductInformation = () => {
  const record = useRecordContext();

  if (!record) return null;

  const productName = record.product?.name || record.productName || 'Produs indisponibil';
  const productId = typeof record.productId === 'object'
    ? record.productId._id
    : record.productId;
  const productLink = productId ? `#/products/${productId}` : null;

  return (
    <Box sx={{ mb: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Inventory />
            Informații produs
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {productName}
          </Typography>
          {productLink && (
            <MuiLink href={productLink} underline="hover" sx={{ fontWeight: 500 }}>
              Vezi produsul
            </MuiLink>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

// Main ReviewShow component
export const ReviewShow = () => {
  return (
    <Show title="Detalii recenzie" actions={<ReviewAdminActions />}>
      <SimpleShowLayout>
        {/* Product Information */}
        <FunctionField render={() => <ProductInformation />} />

        {/* Review Content */}
        <FunctionField render={() => <ReviewContent />} />
      </SimpleShowLayout>
    </Show>
  );
};

export default ReviewShow;
