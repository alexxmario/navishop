import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  ShowButton,
  FunctionField,
  TextInput,
  SelectInput,
  Pagination,
  FilterList,
  FilterListItem,
  useNotify,
  useRefresh,
  useDataProvider
} from 'react-admin';
import { Chip, Card, CardContent, Box, Typography, Button } from '@mui/material';
import { Email, MarkEmailRead, MarkEmailUnread, CheckCircle } from '@mui/icons-material';

const ContactMessageFilters = [
  <TextInput source="search" placeholder="Caută mesaje..." alwaysOn key="search" />,
  <SelectInput
    source="status"
    choices={[
      { id: 'new', name: 'Noi' },
      { id: 'read', name: 'Citite' },
      { id: 'resolved', name: 'Rezolvate' },
    ]}
    alwaysOn
    key="status"
  />,
];

const ContactMessageSidebar = () => (
  <Card sx={{
    order: -1,
    mr: 2,
    mt: 9,
    width: 220,
  }}>
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
        <Email sx={{ fontSize: 17, color: 'primary.main' }} />
        <Typography sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'text.secondary' }}>
          Mesaje Contact
        </Typography>
      </Box>

      <FilterList
        label="Status"
        icon={<MarkEmailUnread sx={{ fontSize: 20 }} />}
      >
        <FilterListItem label="Noi" value={{ status: 'new' }} />
        <FilterListItem label="Citite" value={{ status: 'read' }} />
        <FilterListItem label="Rezolvate" value={{ status: 'resolved' }} />
      </FilterList>
    </CardContent>
  </Card>
);

const ContactMessagePagination = () => <Pagination rowsPerPageOptions={[10, 25, 50]} />;

const statusConfig = {
  new: { label: 'Nou', color: 'warning', icon: <MarkEmailUnread sx={{ fontSize: 16 }} /> },
  read: { label: 'Citit', color: 'info', icon: <MarkEmailRead sx={{ fontSize: 16 }} /> },
  resolved: { label: 'Rezolvat', color: 'success', icon: <CheckCircle sx={{ fontSize: 16 }} /> }
};

export const ContactMessageList = () => {
  const notify = useNotify();
  const refresh = useRefresh();
  const dataProvider = useDataProvider();

  const handleResolve = async (id, e) => {
    e.stopPropagation();
    try {
      await dataProvider.update('contact-messages', {
        id,
        data: { status: 'resolved' },
        previousData: {}
      });
      notify('Mesaj marcat ca rezolvat', { type: 'success' });
      refresh();
    } catch (error) {
      notify('Eroare la actualizare', { type: 'error' });
    }
  };

  return (
    <List
      filters={ContactMessageFilters}
      aside={<ContactMessageSidebar />}
      pagination={<ContactMessagePagination />}
      sort={{ field: 'createdAt', order: 'DESC' }}
    >
      <Datagrid
        rowClick="show"
        optimized
        sx={{
          '& .RaDatagrid-row:hover': { cursor: 'pointer' }
        }}
      >
        <FunctionField
          label="Expeditor"
          render={record => (
            <Box>
              <Typography
                variant="body2"
                sx={{ fontWeight: record.status === 'new' ? 700 : 500 }}
              >
                {record.name}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {record.email}
              </Typography>
            </Box>
          )}
        />

        <TextField source="subject" label="Subiect" />

        <FunctionField
          label="Mesaj"
          render={record => (
            <Typography
              variant="body2"
              sx={{
                maxWidth: 280,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: 'text.secondary'
              }}
            >
              {record.message}
            </Typography>
          )}
        />

        <FunctionField
          label="Status"
          render={record => {
            const config = statusConfig[record.status] || statusConfig.new;
            return (
              <Chip
                label={config.label}
                icon={config.icon}
                color={config.color}
                size="small"
                sx={{ fontWeight: 500 }}
              />
            );
          }}
        />

        <DateField source="createdAt" label="Data" showTime />

        <FunctionField
          label="Acțiuni"
          render={record => (
            record.status !== 'resolved' ? (
              <Button
                size="small"
                variant="contained"
                color="success"
                onClick={(e) => handleResolve(record.id, e)}
                sx={{ minWidth: 110 }}
              >
                Rezolvă
              </Button>
            ) : null
          )}
        />

        <ShowButton />
      </Datagrid>
    </List>
  );
};

export default ContactMessageList;
