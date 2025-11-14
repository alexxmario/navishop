import React, { useState, useEffect } from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  ReferenceField,
  NumberField,
  SelectField,
  EditButton,
  ShowButton,
  DeleteButton,
  FilterForm,
  TextInput,
  SelectInput,
  DateInput,
  TopToolbar,
  ExportButton,
  CreateButton,
  BulkDeleteButton,
  useListContext,
  useNotify,
  useRefresh,
  useUpdate,
  FunctionField,
  WrapperField,
  useRecordContext
} from 'react-admin';
import {
  Card,
  CardContent,
  Chip,
  Rating,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField as MuiTextField,
  Box,
  Typography,
  Tooltip,
  Menu,
  MenuItem
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Pending,
  MoreVert,
  Visibility,
  Edit,
  Delete,
  Flag,
  Star
} from '@mui/icons-material';

// Custom action buttons component
const ReviewActionButtons = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const refresh = useRefresh();
  const [update] = useUpdate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [adminDialog, setAdminDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await fetch(`http://localhost:5001/api/reviews/admin/${record.id}/status`, {
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

      notify(`Review ${newStatus} successfully`, { type: 'success' });
      refresh();
    } catch (error) {
      notify('Error updating review status', { type: 'error' });
    }
    handleMenuClose();
    setAdminDialog(false);
    setAdminNotes('');
  };

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
    <>
      <WrapperField>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            icon={getStatusIcon(record.status)}
            label={record.status}
            color={getStatusColor(record.status)}
            size="small"
          />

          <IconButton onClick={handleMenuClick} size="small">
            <MoreVert />
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            {record.status !== 'approved' && (
              <MenuItem onClick={() => handleStatusChange('approved')}>
                <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
                Approve
              </MenuItem>
            )}

            {record.status !== 'rejected' && (
              <MenuItem onClick={() => setAdminDialog(true)}>
                <Cancel sx={{ mr: 1, color: 'error.main' }} />
                Reject
              </MenuItem>
            )}

            {record.status !== 'pending' && (
              <MenuItem onClick={() => handleStatusChange('pending')}>
                <Pending sx={{ mr: 1, color: 'warning.main' }} />
                Set Pending
              </MenuItem>
            )}
          </Menu>
        </Box>
      </WrapperField>

      {/* Admin Notes Dialog */}
      <Dialog open={adminDialog} onClose={() => setAdminDialog(false)}>
        <DialogTitle>Reject Review</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Optionally provide a reason for rejecting this review:
          </Typography>
          <MuiTextField
            fullWidth
            multiline
            rows={3}
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Reason for rejection (optional)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdminDialog(false)}>Cancel</Button>
          <Button onClick={() => handleStatusChange('rejected')} color="error">
            Reject Review
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// Custom rating display component
const RatingDisplay = () => {
  const record = useRecordContext();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Rating value={record.rating} readOnly size="small" />
      <Typography variant="body2">({record.rating}/5)</Typography>
    </Box>
  );
};

// Custom review preview component
const ReviewPreview = () => {
  const record = useRecordContext();
  return (
    <Box sx={{ maxWidth: 300 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
        {record.title}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical'
        }}
      >
        {record.comment}
      </Typography>
    </Box>
  );
};

// Custom helpful votes display
const HelpfulVotesDisplay = () => {
  const record = useRecordContext();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Star sx={{ fontSize: 16, color: 'gold' }} />
      <Typography variant="body2">{record.helpfulVotes}</Typography>
    </Box>
  );
};

// Custom filters
const ReviewFilters = [
  <TextInput source="search" label="Search" alwaysOn />,
  <SelectInput source="status" label="Status" choices={[
    { id: 'pending', name: 'Pending' },
    { id: 'approved', name: 'Approved' },
    { id: 'rejected', name: 'Rejected' },
  ]} />,
  <SelectInput source="rating" label="Rating" choices={[
    { id: '5', name: '5 Stars' },
    { id: '4', name: '4 Stars' },
    { id: '3', name: '3 Stars' },
    { id: '2', name: '2 Stars' },
    { id: '1', name: '1 Star' },
  ]} />,
];

// Custom actions toolbar
const ReviewListActions = () => (
  <TopToolbar>
    <ExportButton />
  </TopToolbar>
);

// Custom bulk actions
const ReviewBulkActions = () => (
  <BulkDeleteButton />
);

// Main ReviewList component
export const ReviewList = () => {
  return (
    <List
      title="Review Management"
      filters={<FilterForm filters={ReviewFilters} />}
      actions={<ReviewListActions />}
      bulkActionButtons={<ReviewBulkActions />}
      perPage={25}
      sort={{ field: 'createdAt', order: 'DESC' }}
    >
      <Datagrid rowClick="show" bulkActionButtons={<ReviewBulkActions />}>
        <TextField source="userName" label="Customer" />

        <ReferenceField
          source="productId"
          reference="products"
          link="show"
          label="Product"
        >
          <TextField source="name" />
        </ReferenceField>

        <FunctionField
          label="Rating"
          render={() => <RatingDisplay />}
        />

        <FunctionField
          label="Review"
          render={() => <ReviewPreview />}
        />

        <FunctionField
          label="Helpful Votes"
          render={() => <HelpfulVotesDisplay />}
        />

        <DateField source="createdAt" label="Date" />

        <FunctionField
          label="Status"
          render={() => <ReviewActionButtons />}
        />

        <EditButton />
        <ShowButton />
        <DeleteButton />
      </Datagrid>
    </List>
  );
};

export default ReviewList;