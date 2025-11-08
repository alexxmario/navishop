import React, { useState, useEffect } from 'react';
import {
  List,
  Datagrid,
  NumberField,
  DateField,
  EditButton,
  ShowButton,
  DeleteButton,
  FilterList,
  FilterListItem,
  TextInput,
  SelectInput,
  NumberInput,
  BooleanInput,
  FunctionField,
  Pagination,
} from 'react-admin';
import { Box, Typography, Card, CardContent, Avatar, Chip, Rating } from '@mui/material';
import { Inventory, Category, Star, ShoppingCart, LocalOffer } from '@mui/icons-material';
import { apiUrl } from '../config/api';

// Rating Column Component
const RatingColumn = ({ record }) => {
  const [reviewStats, setReviewStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${apiUrl}/reviews/stats/${record.id}`);
        if (response.ok) {
          const stats = await response.json();
          setReviewStats(stats);
        }
      } catch (error) {
        console.error('Failed to fetch review stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (record?.id) {
      fetchStats();
    }
  }, [record?.id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" color="textSecondary">Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
      <Rating
        value={reviewStats?.averageRating || 0}
        size="small"
        readOnly
        precision={0.1}
      />
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Typography variant="caption" sx={{ fontWeight: 500 }}>
          {reviewStats?.averageRating?.toFixed(1) || '0.0'}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          ({reviewStats?.totalReviews || 0})
        </Typography>
      </Box>
    </Box>
  );
};

const ProductFilters = [
  <TextInput source="search" placeholder="Search products..." alwaysOn />,
  <SelectInput
    source="category"
    choices={[
      { id: 'navigatii-gps', name: 'Navigații GPS' },
      { id: 'carplay-android', name: 'CarPlay/Android' },
      { id: 'camere-marsarier', name: 'Camere Marsarier' },
      { id: 'sisteme-multimedia', name: 'Sisteme Multimedia' },
      { id: 'dvr', name: 'DVR' },
      { id: 'accesorii', name: 'Accesorii' },
    ]}
    alwaysOn
  />,
  <TextInput source="brand" placeholder="Brand" />,
  <NumberInput source="minPrice" placeholder="Min Price" />,
  <NumberInput source="maxPrice" placeholder="Max Price" />,
  <BooleanInput source="featured" label="Featured" />,
  <BooleanInput source="onSale" label="On Sale" />,
  <BooleanInput source="inStock" label="In Stock" />,
];

const ProductSidebar = () => (
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
          <Inventory />
        </Avatar>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#333' }}>
          Filter Products
        </Typography>
      </Box>
      
      <FilterList 
        label="Categories" 
        icon={<Category sx={{ fontSize: 20 }} />}
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
        <FilterListItem label="GPS Navigation" value={{ category: 'navigatii-gps' }} />
        <FilterListItem label="CarPlay/Android" value={{ category: 'carplay-android' }} />
        <FilterListItem label="Backup Cameras" value={{ category: 'camere-marsarier' }} />
        <FilterListItem label="Multimedia" value={{ category: 'sisteme-multimedia' }} />
        <FilterListItem label="DVR" value={{ category: 'dvr' }} />
        <FilterListItem label="Accessories" value={{ category: 'accesorii' }} />
      </FilterList>

      <FilterList
        label="Romanian Specs"
        icon={<Inventory sx={{ fontSize: 20 }} />}
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
        <FilterListItem label="2GB RAM" value={{ 'romanianSpecs.hardware.memorieRAM': '2 GB' }} />
        <FilterListItem label="4GB RAM" value={{ 'romanianSpecs.hardware.memorieRAM': '4 GB' }} />
        <FilterListItem label="32GB Storage" value={{ 'romanianSpecs.hardware.capacitateStocare': '32 GB' }} />
        <FilterListItem label="64GB Storage" value={{ 'romanianSpecs.hardware.capacitateStocare': '64 GB' }} />
        <FilterListItem label="9 Inch Display" value={{ 'romanianSpecs.display.diagonalaDisplay': '9 Inch' }} />
        <FilterListItem label="10 Inch Display" value={{ 'romanianSpecs.display.diagonalaDisplay': '10 Inch' }} />
      </FilterList>
      
      <FilterList 
        label="Status" 
        icon={<LocalOffer sx={{ fontSize: 20 }} />}
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
        <FilterListItem label="In Stock" value={{ inStock: true }} />
        <FilterListItem label="Low Stock" value={{ lowStock: true }} />
        <FilterListItem label="Featured" value={{ featured: true }} />
        <FilterListItem label="On Sale" value={{ onSale: true }} />
      </FilterList>
    </CardContent>
  </Card>
);

const ProductPagination = () => <Pagination rowsPerPageOptions={[10, 25, 50, 100]} />;

export const ProductList = () => (
  <List
    filters={ProductFilters}
    aside={<ProductSidebar />}
    pagination={<ProductPagination />}
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
      <FunctionField
        label="Product"
        render={record => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 200 }}>
            <Box sx={{ width: 50, height: 50, borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
              {record.images && record.images.length > 0 ? (
                <img
                  src={record.images.find(img => img.isPrimary)?.url || record.images[0]?.url}
                  alt={record.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Box sx={{ 
                  width: '100%', 
                  height: '100%', 
                  bgcolor: 'primary.light', 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Inventory sx={{ color: 'white', fontSize: 20 }} />
                </Box>
              )}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                {record.name}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                SKU: {record.sku}
              </Typography>
            </Box>
          </Box>
        )}
      />
      <FunctionField
        label="Category"
        render={record => (
          <Chip 
            label={record.category?.replace('-', ' ')}
            icon={<Category sx={{ fontSize: 16 }} />}
            size="small"
            variant="outlined"
            sx={{ textTransform: 'capitalize' }}
          />
        )}
      />
      <FunctionField
        label="Brand"
        render={record => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 24, height: 24, bgcolor: 'secondary.light', fontSize: 12 }}>
              {record.brand?.charAt(0)?.toUpperCase() || 'N'}
            </Avatar>
            <Typography variant="body2">{record.brand}</Typography>
          </Box>
        )}
      />
      <FunctionField
        label="Romanian Specs"
        render={record => (
          <Box sx={{ minWidth: 120 }}>
            {record.romanianSpecs?.hardware?.memorieRAM && (
              <Typography variant="caption" display="block" color="textSecondary">
                RAM: {record.romanianSpecs.hardware.memorieRAM}
              </Typography>
            )}
            {record.romanianSpecs?.hardware?.capacitateStocare && (
              <Typography variant="caption" display="block" color="textSecondary">
                Storage: {record.romanianSpecs.hardware.capacitateStocare}
              </Typography>
            )}
            {record.romanianSpecs?.display?.diagonalaDisplay && (
              <Typography variant="caption" display="block" color="textSecondary">
                Display: {record.romanianSpecs.display.diagonalaDisplay}
              </Typography>
            )}
          </Box>
        )}
      />
      <NumberField source="price" options={{ style: 'currency', currency: 'RON' }} />
      <FunctionField
        label="Stock"
        render={record => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShoppingCart sx={{ 
              fontSize: 16, 
              color: record.stock === 0 ? 'error.main' : 
                     record.stock <= (record.lowStockThreshold || 5) ? 'warning.main' : 'success.main'
            }} />
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 500,
                color: record.stock === 0 ? 'error.main' : 
                       record.stock <= (record.lowStockThreshold || 5) ? 'warning.main' : 'success.main'
              }}
            >
              {record.stock}
            </Typography>
          </Box>
        )}
      />
      <FunctionField
        label="Status"
        render={record => (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {record.featured && (
              <Chip 
                label="Featured" 
                icon={<Star sx={{ fontSize: 14 }} />}
                size="small" 
                color="primary" 
                variant="filled"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            )}
            {record.onSale && (
              <Chip 
                label="Sale" 
                icon={<LocalOffer sx={{ fontSize: 14 }} />}
                size="small" 
                color="error" 
                variant="filled"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            )}
            {!record.featured && !record.onSale && (
              <Typography variant="caption" color="textSecondary">
                Standard
              </Typography>
            )}
          </Box>
        )}
      />
      <FunctionField
        label="Rating"
        render={record => <RatingColumn record={record} />}
      />
      <DateField source="createdAt" />
      <EditButton />
      <ShowButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

export default ProductList;
