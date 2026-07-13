import React, { useState } from 'react';
import {
  Show,
  SimpleShowLayout,
  TextField,
  EmailField,
  DateField,
  FunctionField,
  useNotify,
  useRefresh,
  useDataProvider,
  useRecordContext
} from 'react-admin';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField as MuiTextField,
  Alert,
  Grid,
  Divider
} from '@mui/material';
import {
  Business,
  Person,
  Email,
  Phone,
  LocationOn,
  CheckCircle,
  Cancel,
  ContentCopy
} from '@mui/icons-material';

const StatusChip = ({ status }) => {
  const statusConfig = {
    pending: { label: 'În așteptare', color: 'warning' },
    approved: { label: 'Aprobat', color: 'success' },
    rejected: { label: 'Respins', color: 'error' }
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <Chip
      label={config.label}
      color={config.color}
      sx={{ fontWeight: 600, fontSize: '0.875rem' }}
    />
  );
};

const ApprovalDialog = ({ open, onClose, onConfirm, password, existingAccount }) => {
  const handleCopyPassword = () => {
    navigator.clipboard.writeText(password);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Cont B2B {existingAccount ? 'Actualizat' : 'Creat'} cu Succes
      </DialogTitle>
      <DialogContent>
        {!existingAccount && password ? (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Cont nou creat. Trimite următoarele credențiale clientului:
            </Alert>
            <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, mb: 2 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Parola temporară:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="h6"
                  sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                >
                  {password}
                </Typography>
                <Button
                  size="small"
                  startIcon={<ContentCopy />}
                  onClick={handleCopyPassword}
                >
                  Copiază
                </Button>
              </Box>
            </Box>
            <Typography variant="body2" color="textSecondary">
              Clientul poate folosi email-ul și parola de mai sus pentru autentificare.
              Va beneficia automat de reducere 20% la toate produsele.
            </Typography>
          </>
        ) : (
          <Alert severity="success">
            {existingAccount
              ? 'Contul existent a fost actualizat la cont B2B cu reducere 20%.'
              : 'Contul B2B a fost creat cu succes.'}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onConfirm} color="primary" variant="contained">
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const RejectDialog = ({ open, onClose, onConfirm }) => {
  const [notes, setNotes] = useState('');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Respinge Cererea B2B</DialogTitle>
      <DialogContent>
        <MuiTextField
          autoFocus
          margin="dense"
          label="Motiv respingere (opțional)"
          fullWidth
          multiline
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Introduceți motivul respingerii..."
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Anulează</Button>
        <Button onClick={() => onConfirm(notes)} color="error" variant="contained">
          Respinge
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const B2BApplicationActions = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const refresh = useRefresh();
  const dataProvider = useDataProvider();

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approvalResult, setApprovalResult] = useState(null);

  if (!record || record.status !== 'pending') {
    return null;
  }

  const handleApprove = async () => {
    try {
      const result = await dataProvider.update('b2b-applications', {
        id: record.id,
        data: { action: 'approve' },
        previousData: record
      });

      setApprovalResult(result.data);
      setApproveDialogOpen(true);
    } catch (error) {
      notify('Eroare la aprobare', { type: 'error' });
    }
  };

  const handleReject = async (notes) => {
    try {
      await dataProvider.update('b2b-applications', {
        id: record.id,
        data: { action: 'reject', reviewNotes: notes },
        previousData: record
      });

      notify('Cerere respinsă', { type: 'success' });
      setRejectDialogOpen(false);
      refresh();
    } catch (error) {
      notify('Eroare la respingere', { type: 'error' });
    }
  };

  const handleApprovalDialogClose = () => {
    setApproveDialogOpen(false);
    setApprovalResult(null);
    refresh();
  };

  return (
    <>
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <Button
          variant="contained"
          color="success"
          size="large"
          startIcon={<CheckCircle />}
          onClick={handleApprove}
        >
          Aprobă Cererea
        </Button>
        <Button
          variant="outlined"
          color="error"
          size="large"
          startIcon={<Cancel />}
          onClick={() => setRejectDialogOpen(true)}
        >
          Respinge Cererea
        </Button>
      </Box>

      <ApprovalDialog
        open={approveDialogOpen}
        onClose={handleApprovalDialogClose}
        onConfirm={handleApprovalDialogClose}
        password={approvalResult?.temporaryPassword}
        existingAccount={approvalResult?.existingAccount}
      />

      <RejectDialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        onConfirm={handleReject}
      />
    </>
  );
};

export const B2BApplicationShow = () => (
  <Show>
    <SimpleShowLayout>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" component="h2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Business /> Cerere Cont B2B
            </Typography>
            <FunctionField render={record => <StatusChip status={record.status} />} />
          </Box>

          <Grid container spacing={3}>
            {/* Company Information */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Business fontSize="small" /> Informații Companie
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Denumirea companiei
                      </Typography>
                      <TextField source="companyName" sx={{ display: 'block', fontWeight: 500 }} />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        CUI/CIF
                      </Typography>
                      <TextField source="vatNumber" sx={{ display: 'block', fontWeight: 500 }} />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Adresa
                      </Typography>
                      <FunctionField
                        render={record => (
                          <Typography variant="body2">
                            {record.companyAddress?.street}<br />
                            {record.companyAddress?.city}, {record.companyAddress?.county}<br />
                            {record.companyAddress?.postalCode}
                          </Typography>
                        )}
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Contact Information */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Person fontSize="small" /> Persoană de Contact
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Nume
                      </Typography>
                      <TextField source="contactName" sx={{ display: 'block', fontWeight: 500 }} />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Email fontSize="small" color="action" />
                      <Box>
                        <Typography variant="caption" color="textSecondary" display="block">
                          Email
                        </Typography>
                        <EmailField source="email" sx={{ fontWeight: 500 }} />
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Phone fontSize="small" color="action" />
                      <Box>
                        <Typography variant="caption" color="textSecondary" display="block">
                          Telefon
                        </Typography>
                        <TextField source="phone" sx={{ fontWeight: 500 }} />
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Application Details */}
            <Grid size={{ xs: 12 }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Detalii Cerere
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="caption" color="textSecondary">
                        Data cererii
                      </Typography>
                      <DateField source="createdAt" showTime sx={{ display: 'block', fontWeight: 500 }} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="caption" color="textSecondary">
                        Status
                      </Typography>
                      <FunctionField render={record => <StatusChip status={record.status} />} />
                    </Grid>
                    <FunctionField
                      render={record => (
                        record.reviewedAt ? (
                          <Grid size={{ xs: 12, sm: 4 }}>
                            <Typography variant="caption" color="textSecondary">
                              Data procesare
                            </Typography>
                            <DateField source="reviewedAt" showTime sx={{ display: 'block', fontWeight: 500 }} />
                          </Grid>
                        ) : null
                      )}
                    />
                    <FunctionField
                      render={record => (
                        record.reviewNotes ? (
                          <Grid size={{ xs: 12 }}>
                            <Typography variant="caption" color="textSecondary">
                              Note
                            </Typography>
                            <TextField source="reviewNotes" sx={{ display: 'block', mt: 1 }} />
                          </Grid>
                        ) : null
                      )}
                    />
                    <FunctionField
                      render={record => (
                        record.temporaryPassword ? (
                          <Grid size={{ xs: 12 }}>
                            <Typography variant="caption" color="textSecondary">
                              Parolă Generată
                            </Typography>
                            <Box sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              bgcolor: 'grey.100',
                              p: 1.5,
                              borderRadius: 1,
                              mt: 1
                            }}>
                              <Typography
                                variant="body1"
                                sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                              >
                                {record.temporaryPassword}
                              </Typography>
                              <Button
                                size="small"
                                startIcon={<ContentCopy />}
                                onClick={() => {
                                  navigator.clipboard.writeText(record.temporaryPassword);
                                }}
                              >
                                Copiază
                              </Button>
                            </Box>
                          </Grid>
                        ) : null
                      )}
                    />
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <B2BApplicationActions />
        </CardContent>
      </Card>
    </SimpleShowLayout>
  </Show>
);

export default B2BApplicationShow;
