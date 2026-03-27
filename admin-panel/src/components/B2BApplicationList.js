import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  EmailField,
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
import { Business, CheckCircle, Cancel, HourglassEmpty } from '@mui/icons-material';

const B2BApplicationFilters = [
  <TextInput source="search" placeholder="Caută aplicații..." alwaysOn key="search" />,
  <SelectInput
    source="status"
    choices={[
      { id: 'pending', name: 'În așteptare' },
      { id: 'approved', name: 'Aprobate' },
      { id: 'rejected', name: 'Respinse' },
    ]}
    alwaysOn
    key="status"
  />,
];

const B2BApplicationSidebar = () => (
  <Card sx={{
    order: -1,
    mr: 2,
    mt: 9,
    width: 220,
    borderRadius: 3,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)'
  }}>
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Business sx={{
          fontSize: 48,
          color: 'primary.main',
          mb: 1
        }} />
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#333' }}>
          Cereri B2B
        </Typography>
      </Box>

      <FilterList
        label="Status"
        icon={<HourglassEmpty sx={{ fontSize: 20 }} />}
        sx={{
          '& .MuiCollapse-root': {
            '& .MuiList-root': {
              '& .MuiListItem-root': {
                borderRadius: 2,
                mb: 0.5,
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.08)'
                }
              }
            }
          }
        }}
      >
        <FilterListItem label="În așteptare" value={{ status: 'pending' }} />
        <FilterListItem label="Aprobate" value={{ status: 'approved' }} />
        <FilterListItem label="Respinse" value={{ status: 'rejected' }} />
      </FilterList>
    </CardContent>
  </Card>
);

const B2BApplicationPagination = () => <Pagination rowsPerPageOptions={[10, 25, 50]} />;

export const B2BApplicationList = () => {
  const notify = useNotify();
  const refresh = useRefresh();
  const dataProvider = useDataProvider();

  const handleQuickApprove = async (id, e) => {
    e.stopPropagation();
    try {
      await dataProvider.update('b2b-applications', {
        id,
        data: { action: 'approve' },
        previousData: {}
      });
      notify('Cerere aprobată cu succes', { type: 'success' });
      refresh();
    } catch (error) {
      notify('Eroare la aprobare', { type: 'error' });
    }
  };

  const handleQuickReject = async (id, e) => {
    e.stopPropagation();
    try {
      await dataProvider.update('b2b-applications', {
        id,
        data: { action: 'reject', reviewNotes: 'Respins din listă' },
        previousData: {}
      });
      notify('Cerere respinsă', { type: 'success' });
      refresh();
    } catch (error) {
      notify('Eroare la respingere', { type: 'error' });
    }
  };

  return (
    <List
      filters={B2BApplicationFilters}
      aside={<B2BApplicationSidebar />}
      pagination={<B2BApplicationPagination />}
      sort={{ field: 'createdAt', order: 'DESC' }}
      sx={{
        '& .MuiPaper-root': {
          borderRadius: 3,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        },
        '& .RaList-main': {
          '& .MuiCard-root': {
            borderRadius: 3
          }
        }
      }}
    >
      <Datagrid
        rowClick="show"
        optimized
        sx={{
          '& .RaDatagrid-headerRow': {
            backgroundColor: '#f8f9fa',
            '& .MuiTableCell-head': {
              fontWeight: 600,
              color: '#333',
              borderBottom: '2px solid #e0e0e0'
            }
          },
          '& .RaDatagrid-row': {
            '&:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.04)',
              cursor: 'pointer'
            }
          }
        }}
      >
        <TextField source="companyName" label="Companie" />

        <FunctionField
          label="Contact"
          render={record => (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {record.contactName}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {record.email}
              </Typography>
            </Box>
          )}
        />

        <TextField source="vatNumber" label="CUI/CIF" />

        <FunctionField
          label="Adresa"
          render={record => (
            <Typography variant="body2">
              {record.companyAddress?.city}, {record.companyAddress?.county}
            </Typography>
          )}
        />

        <FunctionField
          label="Status"
          render={record => {
            const statusConfig = {
              pending: { label: 'În așteptare', color: 'warning', icon: <HourglassEmpty sx={{ fontSize: 16 }} /> },
              approved: { label: 'Aprobat', color: 'success', icon: <CheckCircle sx={{ fontSize: 16 }} /> },
              rejected: { label: 'Respins', color: 'error', icon: <Cancel sx={{ fontSize: 16 }} /> }
            };

            const config = statusConfig[record.status] || statusConfig.pending;

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

        <DateField source="createdAt" label="Data cererii" />

        <FunctionField
          label="Acțiuni"
          render={record => (
            record.status === 'pending' ? (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  onClick={(e) => handleQuickApprove(record.id, e)}
                  sx={{ minWidth: 80 }}
                >
                  Aprobă
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={(e) => handleQuickReject(record.id, e)}
                  sx={{ minWidth: 80 }}
                >
                  Respinge
                </Button>
              </Box>
            ) : null
          )}
        />

        <ShowButton />
      </Datagrid>
    </List>
  );
};

export default B2BApplicationList;
