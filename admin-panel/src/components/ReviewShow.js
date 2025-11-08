import React, { useState } from 'react';
import {
  Show,
  SimpleShowLayout,
  TextField,
  DateField,
  ReferenceField,
  NumberField,
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
  Grid
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
import { apiUrl, getImageUrl } from '../config/api';

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
      <Grid item xs={12}>
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
                <Typography variant="body2">{record.helpfulVotes} helpful votes</Typography>
              </Box>
            </Box>

            <Typography variant="body2" color="textSecondary">
              <Schedule sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
              Submitted on {new Date(record.createdAt).toLocaleDateString('ro-RO', {
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
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Review Title</Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              {record.title}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Review Comment */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Review Content</Typography>
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
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="error">
                Admin Notes
              </Typography>
              <Typography variant="body1">
                {record.adminNotes || 'No admin notes provided.'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Review Images */}
      {record.images && record.images.length > 0 && (
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Review Images</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {record.images.map((image, index) => (
                  <img
                    key={index}
                    src={getImageUrl(image.url)}
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
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Verification Status</Typography>
            <Chip
              label={record.verified ? 'Verified Purchase' : 'Unverified'}
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
      const response = await fetch(`${apiUrl}/reviews/admin/${record.id}/status`, {
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
            Approve
          </Button>
        )}

        {record?.status !== 'rejected' && (
          <Button
            variant="contained"
            color="error"
            startIcon={<Cancel />}
            onClick={() => setAdminDialog(true)}
          >
            Reject
          </Button>
        )}

        {record?.status !== 'pending' && (
          <Button
            variant="outlined"
            color="warning"
            startIcon={<Pending />}
            onClick={() => handleStatusChange('pending')}
          >
            Set Pending
          </Button>
        )}
      </Box>

      <EditButton />
      <DeleteButton />

      {/* Admin Notes Dialog */}
      <Dialog open={adminDialog} onClose={() => setAdminDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Review</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Optionally provide a reason for rejecting this review:
          </Typography>
          <MuiTextField
            fullWidth
            multiline
            rows={4}
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Reason for rejection (optional)"
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdminDialog(false)}>Cancel</Button>
          <Button onClick={() => handleStatusChange('rejected')} color="error" variant="contained">
            Reject Review
          </Button>
        </DialogActions>
      </Dialog>
    </TopToolbar>
  );
};

// Main ReviewShow component
export const ReviewShow = () => {
  return (
    <Show title="Review Details" actions={<ReviewAdminActions />}>
      <SimpleShowLayout>
        {/* Product Information */}
        <Box sx={{ mb: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Inventory sx={{ mr: 1, verticalAlign: 'middle' }} />
                Product Information
              </Typography>
              <ReferenceField source="productId" reference="products" link="show">
                <TextField source="name" />
              </ReferenceField>
            </CardContent>
          </Card>
        </Box>

        {/* Review Content */}
        <FunctionField render={() => <ReviewContent />} />
      </SimpleShowLayout>
    </Show>
  );
};

export default ReviewShow;
