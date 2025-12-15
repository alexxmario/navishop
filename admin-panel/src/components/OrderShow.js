import React, { useState } from 'react';
import {
  Show,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  TabbedShowLayout,
  Tab,
  useShowController,
  useUpdate,
  useNotify,
  Button,
  TopToolbar,
  EditButton,
} from 'react-admin';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CheckCircle as ConfirmIcon,
  LocalShipping as ShipIcon,
  Receipt as InvoiceIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';

const getStatusColor = (status) => {
  switch (status) {
    case 'pending': return 'warning';
    case 'confirmed': return 'info';
    case 'processing': return 'primary';
    case 'shipped': return 'secondary';
    case 'delivered': return 'success';
    case 'cancelled': return 'error';
    default: return 'default';
  }
};

const getPaymentStatusColor = (status) => {
  switch (status) {
    case 'pending': return 'warning';
    case 'completed': return 'success';
    case 'failed': return 'error';
    case 'cancelled': return 'default';
    default: return 'default';
  }
};

const OrderActions = () => {
  const { record } = useShowController();
  const [update] = useUpdate();
  const notify = useNotify();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAction = async (action, data = {}) => {
    setLoading(true);
    try {
      await update('orders', {
        id: record.id,
        data: { action, ...data },
        previousData: record,
      });
      notify(`Order ${action} successfully`, { type: 'success' });
      setDialogOpen(false);
      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      notify(`Failed to ${action} order: ${error.message}`, { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (type) => {
    setActionType(type);
    setDialogOpen(true);
  };

  if (!record) return null;

  const canConfirm = record.status === 'pending';
  const canProcess = record.status === 'confirmed';
  const canShip = record.status === 'processing';
  const canCancel = ['pending', 'confirmed'].includes(record.status);

  return (
    <>
      <TopToolbar sx={{ gap: 1 }}>
        <EditButton />
        {canConfirm && (
          <Button
            label="Confirm Order"
            onClick={() => openDialog('confirm')}
            startIcon={<ConfirmIcon />}
            variant="contained"
            color="primary"
            sx={{ ml: 1 }}
          />
        )}
        {canProcess && (
          <Button
            label="PROCESS → SmartBill"
            onClick={() => openDialog('process')}
            startIcon={<InvoiceIcon />}
            variant="contained"
            color="secondary"
            sx={{ ml: 1, fontWeight: 'bold' }}
          />
        )}
        {canShip && (
          <Button
            label="Ship Order"
            onClick={() => openDialog('ship')}
            startIcon={<ShipIcon />}
            variant="contained"
            color="success"
            sx={{ ml: 1 }}
          />
        )}
        {canCancel && (
          <Button
            label="Cancel Order"
            onClick={() => openDialog('cancel')}
            startIcon={<CancelIcon />}
            variant="outlined"
            color="error"
            sx={{ ml: 1 }}
          />
        )}
      </TopToolbar>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          {actionType === 'confirm' && 'Confirm Order'}
          {actionType === 'process' && 'Process Order & Generate Invoice'}
          {actionType === 'ship' && 'Ship Order & Generate AWB'}
          {actionType === 'cancel' && 'Cancel Order'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {actionType === 'confirm' && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                This will confirm the order and notify the customer. The order status will change to <strong>"Confirmed"</strong>.
              </Typography>
            </Alert>
          )}
          {actionType === 'process' && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                <strong>⚡ Manual SmartBill Processing</strong>
              </Typography>
              <Typography variant="body2" gutterBottom>
                This will:
              </Typography>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li><strong>Generate SmartBill invoice</strong> (this is now done manually by admin)</li>
                <li>Change order status to "Processing"</li>
                <li>Send invoice to customer via email</li>
                <li>Generate payment URL if payment method is SmartBill Online</li>
              </ul>
            </Alert>
          )}
          {actionType === 'ship' && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                This will:
              </Typography>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>Generate Fan Courier AWB</li>
                <li>Change status to "Shipped"</li>
                <li>Send tracking information to customer</li>
              </ul>
            </Alert>
          )}
          {actionType === 'cancel' && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2">
                This will cancel the order and notify the customer. <strong>This action cannot be undone.</strong>
              </Typography>
            </Alert>
          )}
          
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Order Details:
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Order #{record.orderNumber} - {record.grandTotal} RON
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Customer: {record.shippingAddress?.firstName} {record.shippingAddress?.lastName}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={() => handleAction(actionType)}
            variant="contained"
            color={actionType === 'cancel' ? 'error' : 'primary'}
            disabled={loading}
            startIcon={loading ? null : 
              actionType === 'confirm' ? <ConfirmIcon /> :
              actionType === 'process' ? <InvoiceIcon /> :
              actionType === 'ship' ? <ShipIcon /> :
              <CancelIcon />
            }
          >
            {loading ? 'Processing...' : 
             actionType === 'confirm' ? 'Confirm Order' :
             actionType === 'process' ? 'Process & Invoice' :
             actionType === 'ship' ? 'Ship Order' :
             'Cancel Order'
            }
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const OrderStatusSection = ({ record }) => {
  if (record.status === 'cancelled') {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        <Typography variant="body2">
          Order was cancelled on {new Date(record.updatedAt).toLocaleDateString()}
        </Typography>
      </Alert>
    );
  }

  return (
    <Card sx={{ mb: 3, borderRadius: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Order Status
            </Typography>
            <Chip 
              label={record.status}
              color={getStatusColor(record.status)}
              size="large"
              sx={{ 
                textTransform: 'capitalize', 
                fontWeight: 600,
                fontSize: '1rem',
                height: 36
              }}
            />
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Last Updated
            </Typography>
            <Typography variant="body2">
              {new Date(record.updatedAt).toLocaleDateString()}
            </Typography>
          </Box>
        </Box>
        
        {/* Quick Action Hints */}
        <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
          <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
            💡 Next Action: 
            {record.status === 'pending' && ' Confirm this order to proceed with processing'}
            {record.status === 'confirmed' && ' 🔥 PROCESS order to manually generate SmartBill invoice'}
            {record.status === 'processing' && ' Ship order to generate Fan Courier AWB'}
            {record.status === 'shipped' && ' Order is on its way to customer'}
            {record.status === 'delivered' && ' Order completed successfully'}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export const OrderShow = () => (
  <Show actions={<OrderActions />}>
    <TabbedShowLayout>
      <Tab label="Order Details">
        <FunctionField
          render={record => <OrderStatusSection record={record} />}
        />

        {/* Order Summary */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Order Summary</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField source="orderNumber" label="Order Number" />
                <DateField source="createdAt" label="Order Date" />
                <FunctionField
                  label="Status"
                  render={record => (
                    <Chip 
                      label={record.status} 
                      color={getStatusColor(record.status)}
                      size="small"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <NumberField source="orderTotal" options={{ style: 'currency', currency: 'RON' }} label="Subtotal" />
                <NumberField source="shippingCost" options={{ style: 'currency', currency: 'RON' }} label="Shipping" />
                <NumberField source="grandTotal" options={{ style: 'currency', currency: 'RON' }} label="Total" />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Customer Information</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FunctionField
                  label="Customer"
                  render={record => (
                    <Box>
                      <Typography variant="body1">{record.userId?.name}</Typography>
                      <Typography variant="body2" color="textSecondary">{record.userId?.email}</Typography>
                    </Box>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FunctionField
                  label="Payment"
                  render={record => (
                    <Box>
                      <Typography variant="body2">{record.paymentMethod?.replace('_', ' ')}</Typography>
                      <Chip 
                        label={record.paymentStatus} 
                        color={getPaymentStatusColor(record.paymentStatus)}
                        size="small"
                      />
                    </Box>
                  )}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Items */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Order Items</Typography>
            <FunctionField
              render={record => (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell align="center">Quantity</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {record.items?.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {item.image && (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  style={{ width: 50, height: 50, objectFit: 'cover', marginRight: 16 }}
                                />
                              )}
                              <Typography variant="body2">{item.name}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">{item.quantity}</TableCell>
                          <TableCell align="right">{item.price} RON</TableCell>
                          <TableCell align="right">{(item.price * item.quantity).toFixed(2)} RON</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            />
          </CardContent>
        </Card>
      </Tab>

      <Tab label="Shipping & Addresses">
        {/* Shipping Address */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Shipping Address</Typography>
            <FunctionField
              render={record => (
                <Box>
                  <Typography>{record.shippingAddress?.street}</Typography>
                  <Typography>{record.shippingAddress?.city}, {record.shippingAddress?.county}</Typography>
                  <Typography>{record.shippingAddress?.postalCode}, {record.shippingAddress?.country}</Typography>
                </Box>
              )}
            />
          </CardContent>
        </Card>

        {/* Billing Address */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Billing Address</Typography>
            <FunctionField
              render={record => (
                <Box>
                  {record.billingAddress?.sameAsShipping ? (
                    <Typography color="textSecondary">Same as shipping address</Typography>
                  ) : (
                    <>
                      <Typography>{record.billingAddress?.street}</Typography>
                      <Typography>{record.billingAddress?.city}, {record.billingAddress?.county}</Typography>
                      <Typography>{record.billingAddress?.postalCode}, {record.billingAddress?.country}</Typography>
                    </>
                  )}
                </Box>
              )}
            />
          </CardContent>
        </Card>

        {/* Shipping Information */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Shipping Information</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField source="shipping.provider" label="Provider" />
                <TextField source="shipping.awbNumber" label="AWB Number" />
                <TextField source="trackingCode" label="Tracking Code" />
              </Grid>
              <Grid item xs={12} md={6}>
                <DateField source="shipping.estimatedDelivery" label="Est. Delivery" />
                <DateField source="shipping.actualDelivery" label="Actual Delivery" />
                <NumberField source="shipping.cost" options={{ style: 'currency', currency: 'RON' }} label="Shipping Cost" />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Tab>

      <Tab label="Invoice & Payment">
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Invoice Information</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField source="invoice.invoiceId" label="Invoice ID" />
                <TextField source="invoice.invoiceNumber" label="Invoice Number" />
                <DateField source="invoice.createdAt" label="Invoice Date" />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField source="paymentId" label="Payment ID" />
                <FunctionField
                  label="Payment Status"
                  render={record => (
                    <Chip 
                      label={record.paymentStatus} 
                      color={getPaymentStatusColor(record.paymentStatus)}
                      size="small"
                    />
                  )}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Notes</Typography>
            <TextField source="notes" label="Customer Notes" multiline />
          </CardContent>
        </Card>
      </Tab>
    </TabbedShowLayout>
  </Show>
);

export default OrderShow;