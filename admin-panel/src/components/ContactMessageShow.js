import React from 'react';
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
  Grid,
  Divider
} from '@mui/material';
import {
  Email,
  Person,
  Phone,
  DirectionsCar,
  CheckCircle,
  MarkEmailRead
} from '@mui/icons-material';

const StatusChip = ({ status }) => {
  const config = {
    new: { label: 'Nou', color: 'warning' },
    read: { label: 'Citit', color: 'info' },
    resolved: { label: 'Rezolvat', color: 'success' }
  }[status] || { label: 'Nou', color: 'warning' };

  return (
    <Chip
      label={config.label}
      color={config.color}
      sx={{ fontWeight: 600, fontSize: '0.875rem' }}
    />
  );
};

const ContactMessageActions = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const refresh = useRefresh();
  const dataProvider = useDataProvider();

  if (!record) return null;

  const updateStatus = async (status, successMessage) => {
    try {
      await dataProvider.update('contact-messages', {
        id: record.id,
        data: { status },
        previousData: record
      });
      notify(successMessage, { type: 'success' });
      refresh();
    } catch (error) {
      notify('Eroare la actualizare', { type: 'error' });
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
      {record.status !== 'resolved' && (
        <Button
          variant="contained"
          color="success"
          size="large"
          startIcon={<CheckCircle />}
          onClick={() => updateStatus('resolved', 'Mesaj marcat ca rezolvat')}
        >
          Marchează ca rezolvat
        </Button>
      )}
      {record.status === 'resolved' && (
        <Button
          variant="outlined"
          color="info"
          size="large"
          startIcon={<MarkEmailRead />}
          onClick={() => updateStatus('read', 'Mesaj redeschis')}
        >
          Redeschide
        </Button>
      )}
      <Button
        variant="contained"
        color="primary"
        size="large"
        startIcon={<Email />}
        href={`mailto:${record.email}?subject=Re: ${encodeURIComponent(record.subject || '')}`}
      >
        Răspunde pe email
      </Button>
    </Box>
  );
};

const Field = ({ label, children }) => (
  <Box>
    <Typography variant="caption" color="textSecondary">{label}</Typography>
    <Box sx={{ fontWeight: 500 }}>{children}</Box>
  </Box>
);

export const ContactMessageShow = () => (
  <Show>
    <SimpleShowLayout>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" component="h2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Email /> Mesaj de contact
            </Typography>
            <FunctionField render={record => <StatusChip status={record.status} />} />
          </Box>

          <Grid container spacing={3}>
            {/* Sender */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Person fontSize="small" /> Expeditor
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Field label="Nume">
                      <TextField source="name" />
                    </Field>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Email fontSize="small" color="action" />
                      <Field label="Email">
                        <EmailField source="email" />
                      </Field>
                    </Box>
                    <FunctionField render={record => record.phone ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Phone fontSize="small" color="action" />
                        <Field label="Telefon">
                          <TextField source="phone" />
                        </Field>
                      </Box>
                    ) : null} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Vehicle (optional) */}
            <Grid size={{ xs: 12, md: 6 }}>
              <FunctionField render={record => (
                (record.carBrand || record.carModel || record.year) ? (
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DirectionsCar fontSize="small" /> Vehicul
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {record.carBrand && <Field label="Marca">{record.carBrand}</Field>}
                        {record.carModel && <Field label="Model">{record.carModel}</Field>}
                        {record.year && <Field label="An">{record.year}</Field>}
                      </Box>
                    </CardContent>
                  </Card>
                ) : (
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DirectionsCar fontSize="small" /> Vehicul
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="body2" color="textSecondary">
                        Nu au fost furnizate detalii despre vehicul.
                      </Typography>
                    </CardContent>
                  </Card>
                )
              )} />
            </Grid>

            {/* Message */}
            <Grid size={{ xs: 12 }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>Mesaj</Typography>
                  <Divider sx={{ my: 2 }} />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Field label="Subiect">
                        <TextField source="subject" />
                      </Field>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Field label="Data primirii">
                        <DateField source="createdAt" showTime />
                      </Field>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" color="textSecondary">Conținut</Typography>
                      <FunctionField render={record => (
                        <Typography variant="body1" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                          {record.message}
                        </Typography>
                      )} />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <ContactMessageActions />
        </CardContent>
      </Card>
    </SimpleShowLayout>
  </Show>
);

export default ContactMessageShow;
