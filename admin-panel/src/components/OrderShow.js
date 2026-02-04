import React, { useState, useEffect } from 'react';
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
  Button,
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

const InvoicePDFViewer = ({ orderId, invoiceNumber }) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPDF = async () => {
      try {
        const apiUrl = localStorage.getItem('apiUrl') || window.location.origin.replace(':81', '');
        const token = localStorage.getItem('token');

        const response = await fetch(`${apiUrl}/api/orders/${orderId}/invoice-pdf`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch invoice PDF');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchPDF();

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [orderId]);

  if (loading) {
    return (
      <Box sx={{ mt: 3, textAlign: 'center', py: 4 }}>
        <Typography>Se încarcă factura PDF...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        <Typography variant="body2">Eroare la încărcarea facturii: {error}</Typography>
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
        Previzualizare factură SmartBill
      </Typography>
      <Box
        sx={{
          border: '2px solid #e0e0e0',
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: '#f5f5f5'
        }}
      >
        <iframe
          src={pdfUrl}
          style={{
            width: '100%',
            height: '800px',
            border: 'none',
            display: 'block'
          }}
          title="SmartBill Invoice PDF"
        />
      </Box>
      <Box sx={{ mt: 2 }}>
        <Button
          variant="contained"
          component="a"
          href={pdfUrl}
          download={`factura-${invoiceNumber}.pdf`}
          startIcon={<InvoiceIcon />}
        >
          Descarcă factura PDF
        </Button>
      </Box>
    </Box>
  );
};

const AWBLabelViewer = ({ orderId, awbNumber }) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPDF = async () => {
      try {
        const apiUrl = localStorage.getItem('apiUrl') || window.location.origin.replace(':81', '');
        const token = localStorage.getItem('token');

        const response = await fetch(`${apiUrl}/api/orders/${orderId}/awb-pdf`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch AWB label PDF');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchPDF();

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [orderId]);

  if (loading) {
    return (
      <Box sx={{ mt: 3, textAlign: 'center', py: 4 }}>
        <Typography>Se încarcă eticheta AWB...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        <Typography variant="body2">Eroare la încărcarea etichetei AWB: {error}</Typography>
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
        Previzualizare etichetă AWB Fan Courier
      </Typography>
      <Box
        sx={{
          border: '2px solid #e0e0e0',
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: '#f5f5f5'
        }}
      >
        <iframe
          src={pdfUrl}
          style={{
            width: '100%',
            height: '800px',
            border: 'none',
            display: 'block'
          }}
          title="Fan Courier AWB Label PDF"
        />
      </Box>
      <Box sx={{ mt: 2 }}>
        <Button
          variant="contained"
          component="a"
          href={pdfUrl}
          download={`awb-${awbNumber}.pdf`}
          startIcon={<ShipIcon />}
        >
          Descarcă eticheta AWB
        </Button>
      </Box>
    </Box>
  );
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
            onClick={() => openDialog('confirm')}
            startIcon={<ConfirmIcon />}
            variant="contained"
            color="primary"
            sx={{ ml: 1 }}
          >
            Confirmă comanda
          </Button>
        )}
        {canProcess && (
          <Button
            onClick={() => openDialog('process')}
            startIcon={<InvoiceIcon />}
            variant="contained"
            color="secondary"
            sx={{ ml: 1, fontWeight: 'bold' }}
          >
            PROCESEAZĂ → SmartBill
          </Button>
        )}
        {canShip && (
          <Button
            onClick={() => openDialog('ship')}
            startIcon={<ShipIcon />}
            variant="contained"
            color="success"
            sx={{ ml: 1 }}
          >
            Expediază comanda
          </Button>
        )}
        {canCancel && (
          <Button
            onClick={() => openDialog('cancel')}
            startIcon={<CancelIcon />}
            variant="outlined"
            color="error"
            sx={{ ml: 1 }}
          >
            Anulează comanda
          </Button>
        )}
      </TopToolbar>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          {actionType === 'confirm' && 'Confirmă comanda'}
          {actionType === 'process' && 'Procesează comanda și generează factura'}
          {actionType === 'ship' && 'Expediază comanda și generează AWB'}
          {actionType === 'cancel' && 'Anulează comanda'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {actionType === 'confirm' && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Aceasta va confirma comanda și va notifica clientul. Statusul comenzii se va schimba în <strong>"Confirmată"</strong>.
              </Typography>
            </Alert>
          )}
          {actionType === 'process' && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                <strong>⚡ Procesare manuală SmartBill</strong>
              </Typography>
              <Typography variant="body2" gutterBottom>
                Aceasta va:
              </Typography>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li><strong>Genera factura SmartBill</strong> (acum se face manual de admin)</li>
                <li>Schimba statusul comenzii în "În procesare"</li>
                <li>Trimite factura clientului prin email</li>
                <li>Genera URL de plată dacă metoda de plată este SmartBill Online</li>
              </ul>
            </Alert>
          )}
          {actionType === 'ship' && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Aceasta va:
              </Typography>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>Genera AWB Fan Courier</li>
                <li>Schimba statusul în "Expediată"</li>
                <li>Trimite informațiile de urmărire clientului</li>
              </ul>
            </Alert>
          )}
          {actionType === 'cancel' && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Aceasta va anula comanda și va notifica clientul. <strong>Această acțiune nu poate fi anulată.</strong>
              </Typography>
            </Alert>
          )}
          
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Detalii comandă:
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Order #{record.orderNumber} - {record.grandTotal} RON
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Client: {record.shippingAddress?.firstName} {record.shippingAddress?.lastName}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={loading} variant="text">
            Anulează
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
            {loading ? 'Se procesează...' :
             actionType === 'confirm' ? 'Confirmă comanda' :
             actionType === 'process' ? 'Procesează și facturează' :
             actionType === 'ship' ? 'Expediază comanda' :
             'Anulează comanda'
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
          Comanda a fost anulată la {new Date(record.updatedAt).toLocaleDateString()}
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
              Status comandă
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
              Ultima actualizare
            </Typography>
            <Typography variant="body2">
              {new Date(record.updatedAt).toLocaleDateString()}
            </Typography>
          </Box>
        </Box>
        
        {/* Quick Action Hints */}
        <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
          <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
            💡 Acțiunea următoare:
            {record.status === 'pending' && ' Confirmați comanda pentru a continua'}
            {record.status === 'confirmed' && ' 🔥 PROCESAȚI comanda pentru a genera factura SmartBill'}
            {record.status === 'processing' && ' Expediați comanda pentru a genera AWB Fan Courier'}
            {record.status === 'shipped' && ' Comanda este pe drum spre client'}
            {record.status === 'delivered' && ' Comanda a fost finalizată cu succes'}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export const OrderShow = () => (
  <Show actions={<OrderActions />}>
    <TabbedShowLayout>
      <Tab label="Detalii comandă">
        <FunctionField
          render={record => <OrderStatusSection record={record} />}
        />

        {/* Order Summary */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Sumar comandă</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField source="orderNumber" label="Nr. comandă" />
                <DateField source="createdAt" label="Data comenzii" />
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
                <NumberField source="shippingCost" options={{ style: 'currency', currency: 'RON' }} label="Livrare" />
                <NumberField source="grandTotal" options={{ style: 'currency', currency: 'RON' }} label="Total" />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Informații client</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FunctionField
                  label="Client"
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
                  label="Plată"
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
            <Typography variant="h6" gutterBottom>Produse comandate</Typography>
            <FunctionField
              render={record => (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Produs</TableCell>
                        <TableCell align="center">Cantitate</TableCell>
                        <TableCell align="right">Preț</TableCell>
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

      <Tab label="Livrare și Adrese">
        {/* Shipping Address */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Adresă de livrare</Typography>
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
            <Typography variant="h6" gutterBottom>Adresă de facturare</Typography>
            <FunctionField
              render={record => (
                <Box>
                  {record.billingAddress?.sameAsShipping ? (
                    <Typography color="textSecondary">Aceeași cu adresa de livrare</Typography>
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
            <Typography variant="h6" gutterBottom>Informații livrare</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField source="shipping.provider" label="Furnizor" />
                <TextField source="shipping.awbNumber" label="Număr AWB" />
                <TextField source="trackingCode" label="Cod urmărire" />
              </Grid>
              <Grid item xs={12} md={6}>
                <DateField source="shipping.estimatedDelivery" label="Livrare estimată" />
                <DateField source="shipping.actualDelivery" label="Livrare efectivă" />
                <NumberField source="shipping.cost" options={{ style: 'currency', currency: 'RON' }} label="Cost livrare" />
              </Grid>
            </Grid>

            {/* AWB Label PDF Viewer */}
            <FunctionField
              render={record => {
                if (record.shipping && record.shipping.awbNumber) {
                  return (
                    <AWBLabelViewer
                      orderId={record.id}
                      awbNumber={record.shipping.awbNumber}
                    />
                  );
                }
                return (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      Eticheta AWB nu a fost încă generată. Apăsați "Expediază comanda" pentru a genera AWB-ul.
                    </Typography>
                  </Alert>
                );
              }}
            />
          </CardContent>
        </Card>
      </Tab>

      <Tab label="Factură și Plată">
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Informații factură</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField source="invoice.invoiceId" label="ID Factură" />
                <TextField source="invoice.invoiceNumber" label="Nr. factură" />
                <DateField source="invoice.createdAt" label="Data facturii" />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField source="paymentId" label="ID Plată" />
                <FunctionField
                  label="Status plată"
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

            {/* Invoice PDF Viewer */}
            <FunctionField
              render={record => {
                if (record.invoice && record.invoice.invoiceNumber) {
                  return (
                    <InvoicePDFViewer
                      orderId={record.id}
                      invoiceNumber={record.invoice.invoiceNumber}
                    />
                  );
                }
                return (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      Factura nu a fost încă generată. Apăsați "PROCESEAZĂ → SmartBill" pentru a genera factura.
                    </Typography>
                  </Alert>
                );
              }}
            />
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Notițe</Typography>
            <TextField source="notes" label="Notițe client" multiline />
          </CardContent>
        </Card>
      </Tab>
    </TabbedShowLayout>
  </Show>
);

export default OrderShow;