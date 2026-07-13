import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  EditButton,
  ShowButton,
  FunctionField,
  FilterList,
  FilterListItem,
  TextInput,
  SelectInput,
  DateInput,
  Pagination,
} from 'react-admin';
import { Box, Typography, Chip, Card, CardContent, Avatar } from '@mui/material';
import { ShoppingBag, Person, Payment, LocalShipping } from '@mui/icons-material';

const OrderFilters = [
  <TextInput source="orderNumber" placeholder="Număr comandă" alwaysOn />,
  <SelectInput
    source="status"
    choices={[
      { id: 'pending', name: 'În așteptare' },
      { id: 'confirmed', name: 'Confirmată' },
      { id: 'processing', name: 'În procesare' },
      { id: 'shipped', name: 'Expediată' },
      { id: 'delivered', name: 'Livrată' },
      { id: 'cancelled', name: 'Anulată' },
    ]}
    alwaysOn
  />,
  <SelectInput
    source="paymentMethod"
    choices={[
      { id: 'cash_on_delivery', name: 'Ramburs' },
      { id: 'bank_transfer', name: 'Transfer bancar' },
      { id: 'card', name: 'Card' },
      { id: 'smartbill_online', name: 'SmartBill Online' },
      { id: 'smartbill_transfer', name: 'SmartBill Transfer' },
    ]}
  />,
  <DateInput source="createdFrom" label="De la data" />,
  <DateInput source="createdTo" label="Până la data" />,
];

const OrderSidebar = () => (
  <Card sx={{
    order: -1,
    mr: 2,
    mt: 9,
    width: 220,
    // Hide sidebar on mobile/tablet - use top filter bar instead
    display: { xs: 'none', sm: 'none', md: 'block' }
  }}>
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
        <ShoppingBag sx={{ fontSize: 17, color: 'primary.main' }} />
        <Typography sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'text.secondary' }}>
          Filtrează comenzi
        </Typography>
      </Box>
      
      <FilterList 
        label="Status comandă" 
        icon={<ShoppingBag sx={{ fontSize: 20 }} />}
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
        <FilterListItem label="Confirmată" value={{ status: 'confirmed' }} />
        <FilterListItem label="În procesare" value={{ status: 'processing' }} />
        <FilterListItem label="Expediată" value={{ status: 'shipped' }} />
        <FilterListItem label="Livrată" value={{ status: 'delivered' }} />
        <FilterListItem label="Anulată" value={{ status: 'cancelled' }} />
      </FilterList>
      
      <FilterList 
        label="Status plată" 
        icon={<Payment sx={{ fontSize: 20 }} />}
        sx={{
          mt: 2,
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
        <FilterListItem label="Plată în așteptare" value={{ paymentStatus: 'pending' }} />
        <FilterListItem label="Plată finalizată" value={{ paymentStatus: 'completed' }} />
        <FilterListItem label="Plată eșuată" value={{ paymentStatus: 'failed' }} />
      </FilterList>
    </CardContent>
  </Card>
);

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

const OrderPagination = () => <Pagination rowsPerPageOptions={[10, 25, 50]} />;

export const OrderList = () => (
  <List
    filters={OrderFilters}
    aside={<OrderSidebar />}
    pagination={<OrderPagination />}
    sort={{ field: 'createdAt', order: 'DESC' }}
  >
    <Datagrid 
      rowClick="show" 
      optimized
      sx={{
        '& .RaDatagrid-row:hover': { cursor: 'pointer' }
      }}
    >
      <TextField source="orderNumber" />
      
      <FunctionField
        label="Client"
        render={record => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ 
              width: 32, 
              height: 32, 
              bgcolor: record.orderType === 'guest' ? 'orange' : 'primary.light' 
            }}>
              <Person sx={{ fontSize: 16 }} />
            </Avatar>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {record.shippingAddress?.firstName} {record.shippingAddress?.lastName}
                </Typography>
                {record.orderType === 'guest' && (
                  <Chip 
                    label="Vizitator" 
                    size="small" 
                    sx={{ 
                      fontSize: '0.6rem', 
                      height: '16px', 
                      bgcolor: 'orange', 
                      color: 'white',
                      '& .MuiChip-label': { px: 0.5 }
                    }}
                  />
                )}
              </Box>
              <Typography variant="caption" color="textSecondary">
                {record.shippingAddress?.city}, {record.shippingAddress?.county}
              </Typography>
            </Box>
          </Box>
        )}
      />
      
      <FunctionField
        label="Produse"
        render={record => (
          <Typography variant="body2">
            {record.items?.length || 0} produse
          </Typography>
        )}
      />
      
      <NumberField source="grandTotal" options={{ style: 'currency', currency: 'RON' }} />
      
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
      
      <FunctionField
        label="Plată"
        render={record => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Payment sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Box>
              <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                {record.paymentMethod?.replace('_', ' ')}
              </Typography>
              <Chip 
                label={record.paymentStatus} 
                color={record.paymentStatus === 'completed' ? 'success' : 'warning'}
                size="small"
                sx={{ mt: 0.5 }}
              />
            </Box>
          </Box>
        )}
      />
      
      <FunctionField
        label="Livrare"
        render={record => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalShipping sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Box>
              {record.shipping?.awbNumber ? (
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                  AWB: {record.shipping.awbNumber}
                </Typography>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  Neexpediat
                </Typography>
              )}
              {record.trackingCode && (
                <Typography variant="caption" color="primary.main" sx={{ fontWeight: 500 }}>
                  Track: {record.trackingCode}
                </Typography>
              )}
            </Box>
          </Box>
        )}
      />
      
      <DateField source="createdAt" />
      <EditButton />
      <ShowButton />
    </Datagrid>
  </List>
);

export default OrderList;