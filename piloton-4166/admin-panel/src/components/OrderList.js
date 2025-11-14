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
  <TextInput source="orderNumber" placeholder="Order Number" alwaysOn />,
  <SelectInput
    source="status"
    choices={[
      { id: 'pending', name: 'Pending' },
      { id: 'confirmed', name: 'Confirmed' },
      { id: 'processing', name: 'Processing' },
      { id: 'shipped', name: 'Shipped' },
      { id: 'delivered', name: 'Delivered' },
      { id: 'cancelled', name: 'Cancelled' },
    ]}
    alwaysOn
  />,
  <SelectInput
    source="paymentMethod"
    choices={[
      { id: 'cash_on_delivery', name: 'Cash on Delivery' },
      { id: 'bank_transfer', name: 'Bank Transfer' },
      { id: 'card', name: 'Card' },
      { id: 'smartbill_online', name: 'SmartBill Online' },
      { id: 'smartbill_transfer', name: 'SmartBill Transfer' },
    ]}
  />,
  <DateInput source="createdFrom" label="From Date" />,
  <DateInput source="createdTo" label="To Date" />,
];

const OrderSidebar = () => (
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
        <Avatar sx={{ 
          bgcolor: 'primary.main', 
          width: 48, 
          height: 48, 
          mx: 'auto', 
          mb: 1 
        }}>
          <ShoppingBag />
        </Avatar>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#333' }}>
          Filter Orders
        </Typography>
      </Box>
      
      <FilterList 
        label="Order Status" 
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
        <FilterListItem label="Pending" value={{ status: 'pending' }} />
        <FilterListItem label="Confirmed" value={{ status: 'confirmed' }} />
        <FilterListItem label="Processing" value={{ status: 'processing' }} />
        <FilterListItem label="Shipped" value={{ status: 'shipped' }} />
        <FilterListItem label="Delivered" value={{ status: 'delivered' }} />
        <FilterListItem label="Cancelled" value={{ status: 'cancelled' }} />
      </FilterList>
      
      <FilterList 
        label="Payment Status" 
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
        <FilterListItem label="Pending Payment" value={{ paymentStatus: 'pending' }} />
        <FilterListItem label="Payment Completed" value={{ paymentStatus: 'completed' }} />
        <FilterListItem label="Payment Failed" value={{ paymentStatus: 'failed' }} />
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
      <TextField source="orderNumber" />
      
      <FunctionField
        label="Customer"
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
                    label="Guest" 
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
        label="Items"
        render={record => (
          <Typography variant="body2">
            {record.items?.length || 0} items
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
        label="Payment"
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
        label="Shipping"
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
                  Not shipped
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