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
  useDataProvider,
  useNotify,
  useRedirect,
  useRefresh,
  Button,
} from 'react-admin';
import { Box, Typography, Card, CardContent, Avatar, Chip, Rating, CircularProgress } from '@mui/material';
import { Inventory, Category, Star, ShoppingCart, LocalOffer, FileCopy } from '@mui/icons-material';
import { buildApiUrl } from '../config/api';

// Rating Column Component
const RatingColumn = ({ record }) => {
  const [reviewStats, setReviewStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(buildApiUrl(`reviews/stats/${record.id}`));
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
        <Typography variant="caption" color="textSecondary">Se încarcă...</Typography>
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

// Duplicate Button Component
const DuplicateButton = ({ record }) => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const redirect = useRedirect();
  const refresh = useRefresh();
  const [loading, setLoading] = useState(false);

  const handleDuplicate = async (e) => {
    e.stopPropagation(); // Prevent row click

    if (!record) return;

    setLoading(true);
    try {
      // Create a copy of the product without the id and with modified name/sku
      const { id, _id, createdAt, updatedAt, ...productData } = record;

      const duplicatedProduct = {
        ...productData,
        name: `${record.name} (Copie)`,
        sku: `${record.sku}-COPY-${Date.now().toString().slice(-6)}`,
        slug: `${record.slug}-copie-${Date.now().toString().slice(-6)}`,
      };

      const { data } = await dataProvider.create('products', { data: duplicatedProduct });

      notify('Produsul a fost duplicat cu succes!', { type: 'success' });
      refresh();
      redirect('edit', 'products', data.id);
    } catch (error) {
      console.error('Failed to duplicate product:', error);
      notify('Eroare la duplicarea produsului', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      label="Dublează"
      onClick={handleDuplicate}
      disabled={loading}
      sx={{
        minWidth: 'auto',
        padding: '4px 8px',
        '& .MuiButton-startIcon': {
          marginRight: '4px'
        }
      }}
    >
      {loading ? (
        <CircularProgress size={18} />
      ) : (
        <FileCopy sx={{ fontSize: 18 }} />
      )}
    </Button>
  );
};

const ProductFilters = [
  <TextInput source="search" placeholder="Caută produse..." alwaysOn />,
  <SelectInput
    source="category"
    choices={[
      { id: 'navigatii-gps', name: 'Navigații GPS' },
      { id: 'carplay-android', name: 'CarPlay/Android' },
      { id: 'camere-marsarier', name: 'Camere Marsarier' },
      { id: 'accesorii', name: 'Accesorii' },
      { id: 'module-carplay', name: 'Module CarPlay' },
      { id: 'portbagaj-electric', name: 'Portbagaj Electric' },
      { id: 'lumini-ambientale', name: 'Lumini Ambientale' },
    ]}
    alwaysOn
  />,
  <TextInput source="brand" placeholder="Brand" />,
  <NumberInput source="minPrice" placeholder="Preț minim" />,
  <NumberInput source="maxPrice" placeholder="Preț maxim" />,
  <BooleanInput source="featured" label="Recomandat" />,
  <BooleanInput source="onSale" label="La reducere" />,
  <BooleanInput source="inStock" label="În stoc" />,
];

const ProductSidebar = () => (
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
        <Inventory sx={{ fontSize: 17, color: 'primary.main' }} />
        <Typography sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'text.secondary' }}>
          Filtrează produse
        </Typography>
      </Box>
      
      <FilterList 
        label="Categorii"
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
        <FilterListItem label="Navigații GPS" value={{ category: 'navigatii-gps' }} />
        <FilterListItem label="CarPlay/Android" value={{ category: 'carplay-android' }} />
        <FilterListItem label="Camere marsarier" value={{ category: 'camere-marsarier' }} />
        <FilterListItem label="Accesorii" value={{ category: 'accesorii' }} />
        <FilterListItem label="Module CarPlay" value={{ category: 'module-carplay' }} />
        <FilterListItem label="Portbagaj Electric" value={{ category: 'portbagaj-electric' }} />
        <FilterListItem label="Lumini Ambientale" value={{ category: 'lumini-ambientale' }} />
      </FilterList>

      <FilterList
        label="Specificații"
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
        <FilterListItem label="32GB Stocare" value={{ 'romanianSpecs.hardware.capacitateStocare': '32 GB' }} />
        <FilterListItem label="64GB Stocare" value={{ 'romanianSpecs.hardware.capacitateStocare': '64 GB' }} />
        <FilterListItem label="Ecran 9 Inch" value={{ 'romanianSpecs.display.diagonalaDisplay': '9 Inch' }} />
        <FilterListItem label="Ecran 10 Inch" value={{ 'romanianSpecs.display.diagonalaDisplay': '10 Inch' }} />
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
        <FilterListItem label="În stoc" value={{ inStock: true, outOfStock: undefined }} />
        <FilterListItem label="Stoc epuizat" value={{ outOfStock: true, inStock: undefined }} />
        <FilterListItem label="Stoc redus" value={{ lowStock: true }} />
      <FilterListItem label="Recomandat" value={{ featured: true }} />
      <FilterListItem label="La reducere" value={{ onSale: true }} />
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
  >
    <Datagrid 
      rowClick="show" 
      optimized
      sx={{
        '& .RaDatagrid-row:hover': { cursor: 'pointer' }
      }}
    >
      <FunctionField
        label="Produs"
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
        label="Categorie"
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
        label="Specificații"
        render={record => (
          <Box sx={{ minWidth: 120 }}>
            {record.romanianSpecs?.hardware?.memorieRAM && (
              <Typography variant="caption" display="block" color="textSecondary">
                RAM: {record.romanianSpecs.hardware.memorieRAM}
              </Typography>
            )}
            {record.romanianSpecs?.hardware?.capacitateStocare && (
              <Typography variant="caption" display="block" color="textSecondary">
                Stocare: {record.romanianSpecs.hardware.capacitateStocare}
              </Typography>
            )}
            {record.romanianSpecs?.display?.diagonalaDisplay && (
              <Typography variant="caption" display="block" color="textSecondary">
                Ecran: {record.romanianSpecs.display.diagonalaDisplay}
              </Typography>
            )}
          </Box>
        )}
      />
      <NumberField source="price" options={{ style: 'currency', currency: 'RON' }} />
      <FunctionField
        label="Stoc"
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
                label="Recomandat"
                icon={<Star sx={{ fontSize: 14 }} />}
                size="small" 
                color="primary" 
                variant="filled"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            )}
            {record.onSale && (
              <Chip 
                label="Reducere"
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
        label="Evaluare"
        render={record => <RatingColumn record={record} />}
      />
      <DateField source="createdAt" />
      <FunctionField
        label="Acțiuni"
        render={record => (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <DuplicateButton record={record} />
          </Box>
        )}
      />
      <EditButton />
      <ShowButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

export default ProductList;
