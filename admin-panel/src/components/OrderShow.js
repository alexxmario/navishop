import React, { useState, useEffect, useRef } from 'react';
import {
  Show,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  TabbedShowLayout,
  Tab,
  useShowController,
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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField as MuiTextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  CircularProgress,
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

// Guest orders shipped before GuestOrder carried a `shipping` sub-document only
// kept the AWB in trackingCode. `TRK...` is the locally generated placeholder,
// not a real Fan Courier AWB.
const resolveAwbNumber = (record) => {
  if (record?.shipping?.awbNumber) return record.shipping.awbNumber;
  const code = record?.trackingCode;
  return code && !code.startsWith('TRK') ? code : null;
};

// Labels are fetched live from Fan Courier on every visit rather than stored,
// so they stay available for months (verified back to 180 days). Nothing is
// cached locally — entering the page always asks for a fresh copy.
const AWBLabelViewer = ({ orderId, awbNumber }) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  // Held in a ref so cleanup revokes the URL that actually exists — a closure
  // over the state would capture null from the render the effect ran in.
  const objectUrlRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const revoke = () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };

    const fetchPDF = async () => {
      setLoading(true);
      setError(null);

      try {
        const apiUrl = localStorage.getItem('apiUrl') || window.location.origin.replace(':81', '');
        const token = localStorage.getItem('token');

        const response = await fetch(`${apiUrl}/api/orders/${orderId}/awb-pdf`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          // Surface what the server actually said — a generic message here is
          // what made "credentials have expired" impossible to diagnose.
          let detail = `${response.status} ${response.statusText}`;
          try {
            const body = await response.json();
            detail = body.error || body.message || detail;
          } catch (_) { /* non-JSON body, keep the status line */ }
          throw new Error(detail);
        }

        const blob = await response.blob();
        if (cancelled) return;

        revoke();
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setPdfUrl(url);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      }
    };

    fetchPDF();

    return () => {
      cancelled = true;
      revoke();
    };
  }, [orderId, attempt]);

  if (loading) {
    return (
      <Box sx={{ mt: 3, textAlign: 'center', py: 6 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }} color="textSecondary">
          Se încarcă eticheta AWB de la Fan Courier...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        sx={{ mt: 2 }}
        action={
          <Button color="inherit" size="small" onClick={() => setAttempt(a => a + 1)}>
            Reîncearcă
          </Button>
        }
      >
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
      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          component="a"
          href={pdfUrl}
          download={`awb-${awbNumber}.pdf`}
          startIcon={<ShipIcon />}
        >
          Descarcă eticheta AWB
        </Button>
        <Button variant="outlined" onClick={() => setAttempt(a => a + 1)}>
          Reîncarcă
        </Button>
      </Box>
    </Box>
  );
};

const confirmMessages = {
  confirm: 'Confirmă comanda?\n\nAceasta va confirma comanda și va notifica clientul.',
  process: 'Procesează comanda și generează factura SmartBill?\n\nAceasta va:\n- Genera factura SmartBill\n- Schimba statusul în "În procesare"\n- Trimite factura clientului prin email',
  cancel: 'ANULEAZĂ comanda?\n\nAceastă acțiune NU poate fi anulată!',
  'cancel-awb': 'Anulează AWB-ul la Fan Courier?\n\nAceasta va:\n- Anula AWB-ul curent la Fan Courier\n- Șterge datele de expediere de pe comandă\n- Readuce comanda în "În procesare", ca să poată fi expediată din nou\n\nFactura NU este afectată.',
};

// Process Dialog Component — lets the admin pick which company to invoice under
const ProcessCompanyDialog = ({ open, onClose, onSubmit }) => {
  const [companies, setCompanies] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const notify = useNotify();

  useEffect(() => {
    if (!open) return;
    const fetchCompanies = async () => {
      try {
        const apiUrl = localStorage.getItem('apiUrl') || window.location.origin.replace(':81', '');
        const token = localStorage.getItem('token');
        const response = await fetch(`${apiUrl}/api/orders/billing-companies`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Nu s-au putut încărca companiile');
        setCompanies(data.companies || []);
        if (data.companies?.length) setSelected(data.companies[0].id);
      } catch (error) {
        notify(`Eroare: ${error.message}`, { type: 'error' });
      }
    };
    fetchCompanies();
  }, [open, notify]);

  const handleConfirm = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await onSubmit(selected);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Procesează comanda → SmartBill</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Alegeți compania pe care se va emite factura. Aceasta va genera factura
          SmartBill și va schimba statusul comenzii în „În procesare".
        </Typography>
        <FormControl fullWidth>
          <InputLabel id="billing-company-label">Companie facturare</InputLabel>
          <Select
            labelId="billing-company-label"
            label="Companie facturare"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {companies.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name} (CIF {c.cif})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Anulează</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="secondary"
          disabled={loading || !selected}
          startIcon={loading ? <CircularProgress size={18} /> : <InvoiceIcon />}
        >
          {loading ? 'Se procesează...' : 'Generează factura'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// AWB Options Dialog Component
const AWBOptionsDialog = ({ open, onClose, record, onSubmit }) => {
  const [loading, setLoading] = useState(false);
  const [awbOptions, setAwbOptions] = useState({
    generateAwb: true,
    postalCode: record?.shippingAddress?.postalCode || '',
    serviceType: 'Standard',
    isEnvelope: false,
    numberOfPackages: 1,
    weight: 1,
    length: 10,
    width: 10,
    height: 10,
    codValue: record?.paymentMethod === 'cash_on_delivery' ? record?.grandTotal : 0,
    declaredValue: record?.grandTotal || 0,
    contents: '',
    observations: 'FRAGIL, Contactare telefonica',
    // AWB Options
    paymentBy: 'sender', // sender or recipient
    openOnDelivery: false,
    oPOD: false,
    dropOffPayPoint: false,
    pickupPrealert: false,
    saturdayDelivery: false,
    returnFromRecipient: false,
    refund: '',
  });

  useEffect(() => {
    if (record) {
      // Generate contents from order items
      const contents = record.items?.map(item =>
        `${item.quantity} x ${item.name}`
      ).join(', ') || '';

      // Calculate weight from items (0.5kg per item as default)
      const itemCount = record.items?.reduce((total, item) => total + item.quantity, 0) || 1;
      const calculatedWeight = Math.max(1, itemCount * 0.5);

      setAwbOptions(prev => ({
        ...prev,
        postalCode: record.shippingAddress?.postalCode || '',
        codValue: record.paymentMethod === 'cash_on_delivery' ? record.grandTotal : 0,
        declaredValue: record.grandTotal || 0,
        contents: contents,
        weight: calculatedWeight,
        paymentBy: record.paymentMethod === 'cash_on_delivery' ? 'recipient' : 'sender',
      }));
    }
  }, [record]);

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setAwbOptions(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit(awbOptions);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ bgcolor: 'success.main', color: 'white' }}>
        <ShipIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Generează AWB Fan Courier
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        {/* The AWB is issued on the same company as the invoice, so the sender
            on the label matches the fiscal document. */}
        <Alert severity={record?.invoice?.companyName ? 'info' : 'warning'} sx={{ mb: 3 }}>
          <Typography variant="body2">
            {record?.invoice?.companyName
              ? <>AWB-ul va fi emis pe <strong>{record.invoice.companyName}</strong>, aceeași companie ca factura{record.invoice.invoiceNumber ? ` ${record.invoice.companySeries || ''}${record.invoice.invoiceNumber}` : ''}.</>
              : 'Comanda nu are o companie de facturare salvată. Reprocesați comanda înainte de expediere.'}
          </Typography>
        </Alert>

        <Grid container spacing={3}>
          {/* Left Column - Basic AWB Info */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
              Generează AWB
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Generează AWB</InputLabel>
              <Select
                value={awbOptions.generateAwb ? 'Da' : 'Nu'}
                label="Generează AWB"
                onChange={(e) => setAwbOptions(prev => ({ ...prev, generateAwb: e.target.value === 'Da' }))}
              >
                <MenuItem value="Da">Da</MenuItem>
                <MenuItem value="Nu">Nu</MenuItem>
              </Select>
            </FormControl>

            <MuiTextField
              fullWidth
              label="Cod poștal destinatar"
              value={awbOptions.postalCode}
              onChange={handleChange('postalCode')}
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Tip serviciu</InputLabel>
              <Select
                value={awbOptions.serviceType}
                label="Tip serviciu"
                onChange={handleChange('serviceType')}
              >
                <MenuItem value="Standard">Standard</MenuItem>
                <MenuItem value="Cont Colector">Cont Colector</MenuItem>
                <MenuItem value="Express Loco 1H">Express Loco 1H</MenuItem>
                <MenuItem value="Express Loco 2H">Express Loco 2H</MenuItem>
                <MenuItem value="Express Loco 4H">Express Loco 4H</MenuItem>
                <MenuItem value="Express Loco 6H">Express Loco 6H</MenuItem>
                <MenuItem value="Red Code">Red Code</MenuItem>
                <MenuItem value="Cont Colector Cont">Cont Colector Cont</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={awbOptions.isEnvelope}
                  onChange={handleChange('isEnvelope')}
                />
              }
              label="Plic"
              sx={{ mb: 2, display: 'block' }}
            />

            <MuiTextField
              fullWidth
              label="Număr colete"
              type="number"
              inputProps={{ min: 1 }}
              value={awbOptions.numberOfPackages}
              onChange={handleChange('numberOfPackages')}
              sx={{ mb: 2 }}
            />

            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Dimensiuni colet
            </Typography>
            <Grid container spacing={1} sx={{ mb: 2 }}>
              <Grid size={{ xs: 3 }}>
                <MuiTextField
                  fullWidth
                  label="Greutate"
                  type="number"
                  inputProps={{ min: 0.1, step: 0.1 }}
                  value={awbOptions.weight}
                  onChange={handleChange('weight')}
                  InputProps={{ endAdornment: <Typography variant="caption">kg</Typography> }}
                />
              </Grid>
              <Grid size={{ xs: 3 }}>
                <MuiTextField
                  fullWidth
                  label="Lungime"
                  type="number"
                  inputProps={{ min: 1 }}
                  value={awbOptions.length}
                  onChange={handleChange('length')}
                  InputProps={{ endAdornment: <Typography variant="caption">cm</Typography> }}
                />
              </Grid>
              <Grid size={{ xs: 3 }}>
                <MuiTextField
                  fullWidth
                  label="Lățime"
                  type="number"
                  inputProps={{ min: 1 }}
                  value={awbOptions.width}
                  onChange={handleChange('width')}
                  InputProps={{ endAdornment: <Typography variant="caption">cm</Typography> }}
                />
              </Grid>
              <Grid size={{ xs: 3 }}>
                <MuiTextField
                  fullWidth
                  label="Înălțime"
                  type="number"
                  inputProps={{ min: 1 }}
                  value={awbOptions.height}
                  onChange={handleChange('height')}
                  InputProps={{ endAdornment: <Typography variant="caption">cm</Typography> }}
                />
              </Grid>
            </Grid>

            <MuiTextField
              fullWidth
              label="Valoare ramburs (RON)"
              type="number"
              inputProps={{ min: 0, step: 0.01 }}
              value={awbOptions.codValue}
              onChange={handleChange('codValue')}
              sx={{ mb: 2 }}
            />

            <MuiTextField
              fullWidth
              label="Valoare declarată (RON)"
              type="number"
              inputProps={{ min: 0, step: 0.01 }}
              value={awbOptions.declaredValue}
              onChange={handleChange('declaredValue')}
              sx={{ mb: 2 }}
            />

            <MuiTextField
              fullWidth
              label="Conținut"
              multiline
              rows={3}
              value={awbOptions.contents}
              onChange={handleChange('contents')}
              sx={{ mb: 2 }}
            />

            <MuiTextField
              fullWidth
              label="Observații"
              multiline
              rows={3}
              value={awbOptions.observations}
              onChange={handleChange('observations')}
            />
          </Grid>

          {/* Right Column - AWB Options */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
              Opțiuni AWB
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Plata expediției</InputLabel>
              <Select
                value={awbOptions.paymentBy}
                label="Plata expediției"
                onChange={handleChange('paymentBy')}
              >
                <MenuItem value="sender">Expeditor</MenuItem>
                <MenuItem value="recipient">Destinatar</MenuItem>
              </Select>
            </FormControl>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Opțiuni generare AWB
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={awbOptions.openOnDelivery}
                  onChange={handleChange('openOnDelivery')}
                />
              }
              label="Deschidere la livrare"
              sx={{ display: 'block', mb: 1 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={awbOptions.oPOD}
                  onChange={handleChange('oPOD')}
                />
              }
              label="oPOD (Proof of Delivery)"
              sx={{ display: 'block', mb: 1 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={awbOptions.dropOffPayPoint}
                  onChange={handleChange('dropOffPayPoint')}
                />
              }
              label="DropOff PayPoint"
              sx={{ display: 'block', mb: 1 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={awbOptions.pickupPrealert}
                  onChange={handleChange('pickupPrealert')}
                />
              }
              label="Pick-up Prealert"
              sx={{ display: 'block', mb: 1 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={awbOptions.saturdayDelivery}
                  onChange={handleChange('saturdayDelivery')}
                />
              }
              label="Livrare sâmbătă"
              sx={{ display: 'block', mb: 1 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={awbOptions.returnFromRecipient}
                  onChange={handleChange('returnFromRecipient')}
                />
              }
              label="AWB cu preluare de la destinatar"
              sx={{ display: 'block', mb: 2 }}
            />

            <MuiTextField
              fullWidth
              label="Restituire"
              multiline
              rows={4}
              value={awbOptions.refund}
              onChange={handleChange('refund')}
              placeholder="Ex: cont colector, banca, etc."
            />

            {/* Order Summary */}
            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Rezumat comandă:
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Comandă #{record?.orderNumber}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Client: {record?.shippingAddress?.firstName} {record?.shippingAddress?.lastName}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Adresă: {record?.shippingAddress?.street}, {record?.shippingAddress?.city}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total: {record?.grandTotal} RON
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={loading}>
          Anulează
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="success"
          disabled={loading || !awbOptions.generateAwb}
          startIcon={loading ? <CircularProgress size={20} /> : <ShipIcon />}
        >
          {loading ? 'Se generează AWB...' : 'Generează AWB și Expediază'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const OrderActions = () => {
  const { record } = useShowController();
  const notify = useNotify();
  const [awbDialogOpen, setAwbDialogOpen] = useState(false);
  const [processDialogOpen, setProcessDialogOpen] = useState(false);

  const handleAction = async (action, additionalData = {}) => {
    if (action === 'ship') {
      setAwbDialogOpen(true);
      return;
    }

    if (action === 'process') {
      setProcessDialogOpen(true);
      return;
    }

    const message = confirmMessages[action] || `Ești sigur că vrei să ${action}?`;
    if (!window.confirm(message)) return;

    try {
      const apiUrl = localStorage.getItem('apiUrl') || window.location.origin.replace(':81', '');
      const token = localStorage.getItem('token');

      const response = await fetch(`${apiUrl}/api/orders/${record.id}/process`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, ...additionalData })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Request failed');
      }

      notify(data.message || `Comanda a fost actualizată cu succes`, { type: 'success' });
      window.location.reload();
    } catch (error) {
      notify(`Eroare: ${error.message}`, { type: 'error' });
      window.alert(`Eroare la procesarea comenzii:\n${error.message}`);
    }
  };

  const handleProcessWithCompany = async (company) => {
    try {
      const apiUrl = localStorage.getItem('apiUrl') || window.location.origin.replace(':81', '');
      const token = localStorage.getItem('token');

      const response = await fetch(`${apiUrl}/api/orders/${record.id}/process`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'process', company })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Request failed');
      }

      notify(data.message || 'Comanda a fost procesată cu succes', { type: 'success' });
      setProcessDialogOpen(false);
      window.location.reload();
    } catch (error) {
      notify(`Eroare: ${error.message}`, { type: 'error' });
      window.alert(`Eroare la procesarea comenzii:\n${error.message}`);
    }
  };

  const handleShipWithOptions = async (awbOptions) => {
    try {
      const apiUrl = localStorage.getItem('apiUrl') || window.location.origin.replace(':81', '');
      const token = localStorage.getItem('token');

      const response = await fetch(`${apiUrl}/api/orders/${record.id}/process`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'ship', awbOptions })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Request failed');
      }

      notify(data.message || 'AWB generat cu succes!', { type: 'success' });
      setAwbDialogOpen(false);
      window.location.reload();
    } catch (error) {
      notify(`Eroare: ${error.message}`, { type: 'error' });
      window.alert(`Eroare la generarea AWB:\n${error.message}`);
    }
  };

  if (!record) return null;

  const canConfirm = record.status === 'pending';
  const canProcess = record.status === 'confirmed';
  const canShip = record.status === 'processing';
  const canCancel = ['pending', 'confirmed'].includes(record.status);
  // Undo a shipment sent on the wrong company: cancels the AWB and returns the
  // order to `processing` so it can be shipped again. Invoice is untouched.
  const canCancelAwb = record.status === 'shipped' && !!resolveAwbNumber(record);

  return (
    <>
      <TopToolbar sx={{ gap: 1 }}>
        <EditButton />
        {canConfirm && (
          <Button
            onClick={() => handleAction('confirm')}
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
            onClick={() => handleAction('process')}
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
            onClick={() => handleAction('ship')}
            startIcon={<ShipIcon />}
            variant="contained"
            color="success"
            sx={{ ml: 1 }}
          >
            Expediază comanda
          </Button>
        )}
        {canCancelAwb && (
          <Button
            onClick={() => handleAction('cancel-awb')}
            startIcon={<CancelIcon />}
            variant="outlined"
            color="warning"
            sx={{ ml: 1 }}
          >
            Anulează AWB
          </Button>
        )}
        {canCancel && (
          <Button
            onClick={() => handleAction('cancel')}
            startIcon={<CancelIcon />}
            variant="outlined"
            color="error"
            sx={{ ml: 1 }}
          >
            Anulează comanda
          </Button>
        )}
      </TopToolbar>

      <ProcessCompanyDialog
        open={processDialogOpen}
        onClose={() => setProcessDialogOpen(false)}
        onSubmit={handleProcessWithCompany}
      />

      <AWBOptionsDialog
        open={awbDialogOpen}
        onClose={() => setAwbDialogOpen(false)}
        record={record}
        onSubmit={handleShipWithOptions}
      />
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
    <Card sx={{ mb: 3 }}>
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
              <Grid size={{ xs: 12, md: 6 }}>
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
              <Grid size={{ xs: 12, md: 6 }}>
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
              <Grid size={{ xs: 12, md: 4 }}>
                <FunctionField
                  label="Client"
                  render={record => {
                    const name = record.guestName || record.userId?.name || '-';
                    const email = record.guestEmail || record.userId?.email || '-';
                    return (
                      <Box>
                        <Typography variant="body1">{name}</Typography>
                        <Typography variant="body2" color="textSecondary">{email}</Typography>
                      </Box>
                    );
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FunctionField
                  label="Telefon"
                  render={record => {
                    const phone = record.guestPhone || record.shippingAddress?.phone || '-';
                    return (
                      <Typography variant="body1">{phone}</Typography>
                    );
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
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
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField source="shipping.provider" label="Furnizor" />
                <FunctionField
                  label="Număr AWB"
                  render={record => resolveAwbNumber(record) || '-'}
                />
                <FunctionField
                  label="Expeditor AWB"
                  render={record => record.shipping?.companyName
                    || (resolveAwbNumber(record) ? 'Necunoscut (AWB emis înainte de separarea pe companii)' : '-')}
                />
                <TextField source="trackingCode" label="Cod urmărire" />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <DateField source="shipping.estimatedDelivery" label="Livrare estimată" />
                <DateField source="shipping.actualDelivery" label="Livrare efectivă" />
                <NumberField source="shipping.cost" options={{ style: 'currency', currency: 'RON' }} label="Cost livrare" />
              </Grid>
            </Grid>

            {/* AWB Label PDF Viewer */}
            <FunctionField
              render={record => {
                const awbNumber = resolveAwbNumber(record);
                if (awbNumber) {
                  return (
                    <AWBLabelViewer
                      orderId={record.id}
                      awbNumber={awbNumber}
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
        {/* Invoice Type Section */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Date facturare</Typography>
            <FunctionField
              render={record => {
                const invoiceType = record.invoiceData?.invoiceType || 'person';
                const isCompany = invoiceType === 'company';
                const companyDetails = record.invoiceData?.companyDetails;

                return (
                  <Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="textSecondary">Tip factură</Typography>
                      <Chip
                        label={isCompany ? 'Persoană juridică' : 'Persoană fizică'}
                        color={isCompany ? 'primary' : 'default'}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>

                    {isCompany && companyDetails && (
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" color="textSecondary">Denumire firmă</Typography>
                            <Typography variant="body1">{companyDetails.companyName || '-'}</Typography>
                          </Box>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" color="textSecondary">CUI/CIF</Typography>
                            <Typography variant="body1">{companyDetails.cui || '-'}</Typography>
                          </Box>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" color="textSecondary">Nr. Reg. Comerțului</Typography>
                            <Typography variant="body1">{companyDetails.regCom || '-'}</Typography>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" color="textSecondary">Bancă</Typography>
                            <Typography variant="body1">{companyDetails.bank || '-'}</Typography>
                          </Box>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" color="textSecondary">Cont bancar (IBAN)</Typography>
                            <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                              {companyDetails.bankAccount || '-'}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    )}
                  </Box>
                );
              }}
            />
          </CardContent>
        </Card>

        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Informații factură SmartBill</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField source="invoice.invoiceId" label="ID Factură" />
                <TextField source="invoice.invoiceNumber" label="Nr. factură" />
                <DateField source="invoice.createdAt" label="Data facturii" />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
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