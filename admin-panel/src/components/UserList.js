import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  EmailField,
  DateField,
  EditButton,
  ShowButton,
  FunctionField,
  TextInput,
  SelectInput,
  Pagination,
  FilterList,
  FilterListItem,
} from 'react-admin';
import { Avatar, Chip, Card, CardContent, Box, Typography } from '@mui/material';
import { Person, AdminPanelSettings, Google, Facebook, Email } from '@mui/icons-material';

const UserFilters = [
  <TextInput source="search" placeholder="Caută utilizatori..." alwaysOn />,
  <SelectInput
    source="role"
    choices={[
      { id: 'user', name: 'Utilizator' },
      { id: 'admin', name: 'Admin' },
    ]}
    alwaysOn
  />,
];

const UserSidebar = () => (
  <Card sx={{ 
    order: -1, 
    mr: 2, 
    mt: 9, 
    width: 220,
  }}>
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
        <Person sx={{ fontSize: 17, color: 'primary.main' }} />
        <Typography sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'text.secondary' }}>
          Filtrează utilizatori
        </Typography>
      </Box>
      
      <FilterList 
        label="Rol utilizator"
        icon={<AdminPanelSettings sx={{ fontSize: 20 }} />}
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
        <FilterListItem label="Clienți" value={{ role: 'user' }} />
        <FilterListItem label="Administratori" value={{ role: 'admin' }} />
      </FilterList>
      
      <FilterList 
        label="Tip înregistrare"
        icon={<Email sx={{ fontSize: 20 }} />}
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
        <FilterListItem label="Înregistrare Email" value={{ googleId: '{"$exists":false}', facebookId: '{"$exists":false}' }} />
        <FilterListItem label="Google OAuth" value={{ googleId: '{"$exists":true}' }} />
        <FilterListItem label="Facebook OAuth" value={{ facebookId: '{"$exists":true}' }} />
      </FilterList>
    </CardContent>
  </Card>
);

const UserPagination = () => <Pagination rowsPerPageOptions={[10, 25, 50]} />;

export const UserList = () => (
  <List
    filters={UserFilters}
    aside={<UserSidebar />}
    pagination={<UserPagination />}
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
        label="Utilizator"
        render={record => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 200 }}>
            <Avatar
              src={record.avatar}
              sx={{ 
                width: 45, 
                height: 45,
                bgcolor: record.role === 'admin' ? 'primary.main' : 'secondary.main'
              }}
            >
              {record.name?.charAt(0)?.toUpperCase() || 'U'}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                {record.name || 'Utilizator necunoscut'}
              </Typography>
              <Typography variant="caption" color="textSecondary" sx={{ wordBreak: 'break-word' }}>
                {record.email}
              </Typography>
            </Box>
          </Box>
        )}
      />
      
      <FunctionField
        label="Rol"
        render={record => (
          <Chip 
            label={record.role} 
            icon={record.role === 'admin' ? <AdminPanelSettings sx={{ fontSize: 16 }} /> : <Person sx={{ fontSize: 16 }} />}
            color={record.role === 'admin' ? 'primary' : 'secondary'}
            size="small"
            variant={record.role === 'admin' ? 'filled' : 'outlined'}
            sx={{ textTransform: 'capitalize', fontWeight: 500 }}
          />
        )}
      />
      
      <FunctionField
        label="Înregistrare"
        render={record => {
          if (record.googleId) {
            return (
              <Chip 
                label="Google" 
                icon={<Google sx={{ fontSize: 14 }} />}
                color="error" 
                size="small" 
                variant="outlined"
                sx={{ fontWeight: 500 }}
              />
            );
          }
          if (record.facebookId) {
            return (
              <Chip 
                label="Facebook" 
                icon={<Facebook sx={{ fontSize: 14 }} />}
                color="info" 
                size="small" 
                variant="outlined"
                sx={{ fontWeight: 500 }}
              />
            );
          }
          return (
            <Chip 
              label="Email" 
              icon={<Email sx={{ fontSize: 14 }} />}
              color="primary" 
              size="small" 
              variant="outlined"
              sx={{ fontWeight: 500 }}
            />
          );
        }}
      />
      
      <DateField source="createdAt" />
      
      <EditButton />
      <ShowButton />
    </Datagrid>
  </List>
);

export default UserList;