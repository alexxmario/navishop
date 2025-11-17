import React, { useState, useEffect, useRef } from 'react';
import {
  Edit,
  TextInput,
  NumberInput,
  BooleanInput,
  SelectInput,
  ArrayInput,
  SimpleFormIterator,
  TabbedForm,
  FormTab,
  useRecordContext,
  useNotify,
  useInput,
  required,
} from 'react-admin';
import {
  Box,
  Typography,
  Card,
  Grid,
  TextField,
  Button,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import { Delete as DeleteIcon, Search as SearchIcon, Add as AddIcon } from '@mui/icons-material';
import ImageField from './ImageField';
import StructuredDescriptionEditor from './StructuredDescriptionEditor';
import { buildApiUrl, resolveImageUrl } from '../config/api';
import { useFormContext } from 'react-hook-form';

const normalizeImageUrls = (product) => {
  if (!product?.images) return product;
  return {
    ...product,
    images: product.images.map(image => ({
      ...image,
      url: resolveImageUrl(image?.url)
    }))
  };
};

const generateSlug = (value = '') =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 120);

const requiredField = required();
const requiredCategory = required('Selectează categoria');

const ProductDetailsSection = () => {
  const form = useFormContext();
  const nameValue = form?.watch('name');
  const slugValue = form?.watch('slug');
  const slugEditedRef = useRef(false);

  useEffect(() => {
    if (!form || slugEditedRef.current || !nameValue) return;
    if (!slugValue || slugValue.length === 0) {
      form.setValue('slug', generateSlug(nameValue), { shouldDirty: true });
    }
  }, [nameValue, slugValue, form]);

  const markSlugEdited = () => {
    slugEditedRef.current = true;
  };

  if (!form) return null;

  return (
    <Card sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Product Details
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextInput
            source="name"
            label="Product Name"
            fullWidth
            validate={requiredField}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '1.2rem',
                minHeight: '60px'
              }
            }}
            onChange={() => {
              slugEditedRef.current = false;
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextInput
            source="slug"
            label="URL Slug"
            helperText="Used in the storefront URL (e.g. /product/your-slug)"
            fullWidth
            validate={requiredField}
            onChange={markSlugEdited}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '1.1rem',
                minHeight: '56px'
              }
            }}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextInput
            source="brand"
            label="Brand"
            fullWidth
            validate={requiredField}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '1.1rem',
                minHeight: '56px'
              }
            }}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextInput
            source="model"
            label="Model / Generation"
            fullWidth
            helperText="Optional - shown in admin filters"
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '1.1rem',
                minHeight: '56px'
              }
            }}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <SelectInput
            source="category"
            label="Category"
            fullWidth
            validate={requiredCategory}
            choices={[
              { id: 'navigatii-gps', name: 'Navigații GPS' },
              { id: 'carplay-android', name: 'CarPlay / Android Auto' },
              { id: 'camere-marsarier', name: 'Camere Marsarier' },
              { id: 'sisteme-multimedia', name: 'Sisteme Multimedia' },
              { id: 'dvr', name: 'DVR' },
              { id: 'accesorii', name: 'Accesorii' },
            ]}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '1.1rem',
                minHeight: '56px'
              }
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextInput
            source="sku"
            label="SKU / Internal Code"
            fullWidth
            validate={requiredField}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '1.1rem',
                minHeight: '56px'
              }
            }}
          />
        </Grid>
      </Grid>
    </Card>
  );
};

const ProductEditHeading = () => {
  const record = useRecordContext();
  if (!record) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <Card sx={{ p: 3, bgcolor: 'primary.dark' }}>
        <Typography variant="overline" color="white" sx={{ letterSpacing: 1 }}>
          Editing Product
        </Typography>
        <Typography variant="h4" color="white" sx={{ mt: 1, fontWeight: 'bold' }}>
          {record.name}
        </Typography>
        <Typography variant="body2" color="rgba(255,255,255,0.8)">
          SKU: {record.sku} • Category: {record.category}
        </Typography>
      </Card>
    </Box>
  );
};

// Cross-Sell Products Manager Component
const CrossSellManager = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const {
    field: { value, onChange },
  } = useInput({ source: 'crossSellProducts', defaultValue: [] });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [crossSellProducts, setCrossSellProducts] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Load existing cross-sell products from form value or record
  useEffect(() => {
    const fetchCrossSellProducts = async () => {
      const crossSellIds = value || record?.crossSellProducts || [];
      if (crossSellIds.length > 0) {
        try {
          // Fetch full product data for existing cross-sell products
          const productPromises = crossSellIds.map(async (productId) => {
            const response = await fetch(buildApiUrl(`products/id/${productId}`));
            if (response.ok) {
              const data = await response.json();
              return normalizeImageUrls(data);
            }
            return null;
          });

          const products = await Promise.all(productPromises);
          const validProducts = products.filter(p => p !== null);
          setCrossSellProducts(validProducts);
        } catch (error) {
          console.error('Failed to fetch cross-sell products:', error);
        }
      }
    };

    fetchCrossSellProducts();
  }, [value, record]);

  // Search products function
  const searchProducts = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        buildApiUrl(`products?search=${encodeURIComponent(query)}&limit=50&status=active`)
      );

      if (response.ok) {
        const data = await response.json();
        // Filter out current product and already selected products
        const filteredProducts = data.products
          .map(normalizeImageUrls)
          .filter(product =>
          product._id !== record?.id &&
          !crossSellProducts.some(existing => existing._id === product._id)
        );
        setSearchResults(filteredProducts);
        setHasSearched(true);
      }
    } catch (error) {
      console.error('Failed to search products:', error);
      notify('Failed to search products', { type: 'error' });
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input change with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchProducts(searchQuery);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddProduct = (product) => {
    const newCrossSellProducts = [...crossSellProducts, product];
    setCrossSellProducts(newCrossSellProducts);

    // Update form value with product IDs
    const productIds = newCrossSellProducts.map(p => p._id);
    onChange(productIds);

    // Remove from search results
    setSearchResults(prev => prev.filter(p => p._id !== product._id));

    notify('Cross-sell product added successfully', { type: 'success' });
  };

  const handleRemoveProduct = (productId) => {
    const newCrossSellProducts = crossSellProducts.filter(p => p._id !== productId);
    setCrossSellProducts(newCrossSellProducts);

    // Update form value with product IDs
    const productIds = newCrossSellProducts.map(p => p._id);
    onChange(productIds);

    notify('Cross-sell product removed successfully', { type: 'success' });
  };

  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom color="primary">
        Cross-Sell Products Management
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Search and add compatible accessories that will be shown as "Accesorii compatibile" on the product page.
      </Typography>

      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search products by name, brand, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {isSearching ? <CircularProgress size={20} /> : <SearchIcon />}
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              fontSize: '1.1rem',
              minHeight: '56px'
            }
          }}
        />
      </Box>

      {/* Search Results */}
      {hasSearched && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
            Search Results ({searchResults.length})
          </Typography>

          {searchResults.length > 0 ? (
            <List sx={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 1 }}>
              {searchResults.map((product) => (
                <ListItem
                  key={product._id}
                  sx={{
                    borderBottom: '1px solid #f0f0f0',
                    '&:last-child': { borderBottom: 'none' }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mr: 2 }}>
                    {product.images?.[0]?.url && (
                      <img
                        src={resolveImageUrl(product.images[0].url)}
                        alt={product.name}
                        style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }}
                      />
                    )}
                  </Box>
                  <ListItemText
                    primary={product.name}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          {product.brand} • {product.price} lei • Stock: {product.stock}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          <Chip label={product.category} size="small" variant="outlined" />
                          {product.featured && <Chip label="Featured" size="small" color="primary" />}
                          {product.stock > 0 ? (
                            <Chip label="În stoc" size="small" color="success" />
                          ) : (
                            <Chip label="Stoc epuizat" size="small" color="error" />
                          )}
                        </Box>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => handleAddProduct(product)}
                    >
                      Add
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          ) : (
            <Alert severity="info">
              No products found for "{searchQuery}". Try different search terms.
            </Alert>
          )}
        </Box>
      )}

      {/* Selected Cross-Sell Products */}
      <Box>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
          Selected Cross-Sell Products ({crossSellProducts.length})
        </Typography>

        {crossSellProducts.length > 0 ? (
          <List>
            {crossSellProducts.map((product) => (
              <ListItem
                key={product._id}
                sx={{
                  border: 1,
                  borderColor: 'success.light',
                  borderRadius: 1,
                  mb: 1,
                  bgcolor: 'success.50'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mr: 2 }}>
                  {product.images?.[0]?.url && (
                    <img
                      src={product.images[0].url}
                      alt={product.name}
                      style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }}
                    />
                  )}
                </Box>
                <ListItemText
                  primary={product.name}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        {product.brand} • {product.price} lei • Stock: {product.stock}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Chip label={product.category} size="small" variant="outlined" />
                        {product.stock > 0 ? (
                          <Chip label="În stoc" size="small" color="success" />
                        ) : (
                          <Chip label="Stoc epuizat" size="small" color="error" />
                        )}
                      </Box>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    color="error"
                    onClick={() => handleRemoveProduct(product._id)}
                    title="Remove cross-sell product"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        ) : (
          <Alert severity="info">
            No cross-sell products selected. Use the search bar above to find and add compatible accessories.
          </Alert>
        )}
      </Box>
    </Card>
  );
};


const ProductEditForm = () => {
  return (
    <TabbedForm>
      {/* Tab 1: Images */}
      <FormTab label="Images">
        <ImageField source="images" maxImages={20} />
      </FormTab>

      {/* Tab 2: Pricing & Stock */}
      <FormTab label="Pricing & Stock">
        <ProductDetailsSection />
        {/* Pricing Section */}
        <Card sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Pricing Information
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <NumberInput
                source="price"
                label="Current Price"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.2rem',
                    minHeight: '60px'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <NumberInput
                source="originalPrice"
                label="Original Price"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.1rem',
                    minHeight: '56px'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <NumberInput
                source="discount"
                label="Discount %"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.1rem',
                    minHeight: '56px'
                  }
                }}
              />
            </Grid>
          </Grid>
        </Card>

        {/* Stock Management */}
        <Card sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Stock Management
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            To mark a product as out-of-stock (but keep it visible): Set Status to "Active" and Stock Quantity to 0
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <NumberInput
                source="stock"
                label="Stock Quantity"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.2rem',
                    minHeight: '60px'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <NumberInput
                source="lowStockThreshold"
                label="Low Stock Alert"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.1rem',
                    minHeight: '56px'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <SelectInput
                source="status"
                label="Product Status"
                fullWidth
                choices={[
                  { id: 'active', name: 'Active' },
                  { id: 'inactive', name: 'Inactive (Hidden from Frontend)' },
                  { id: 'discontinued', name: 'Discontinued' },
                ]}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.1rem',
                    minHeight: '56px'
                  }
                }}
              />
            </Grid>
          </Grid>
        </Card>

        {/* Product Flags */}
        <Card sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Product Flags
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <BooleanInput
                source="featured"
                label="Featured Product"
                sx={{
                  '& .MuiFormControlLabel-root': {
                    fontSize: '1.1rem'
                  },
                  '& .MuiTypography-root': {
                    fontSize: '1.1rem'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <BooleanInput
                source="newProduct"
                label="New Product"
                sx={{
                  '& .MuiFormControlLabel-root': {
                    fontSize: '1.1rem'
                  },
                  '& .MuiTypography-root': {
                    fontSize: '1.1rem'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <BooleanInput
                source="onSale"
                label="On Sale"
                sx={{
                  '& .MuiFormControlLabel-root': {
                    fontSize: '1.1rem'
                  },
                  '& .MuiTypography-root': {
                    fontSize: '1.1rem'
                  }
                }}
              />
            </Grid>
          </Grid>
        </Card>
      </FormTab>

      {/* Tab 3: SEO & Tags */}
      <FormTab label="SEO & Tags">
        <Card sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            SEO Information
          </Typography>

          <TextInput
            source="seoTitle"
            fullWidth
            label="SEO Title"
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                fontSize: '1.1rem',
                minHeight: '56px'
              }
            }}
          />

          <TextInput
            source="seoDescription"
            multiline
            rows={4}
            fullWidth
            label="SEO Description"
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                fontSize: '1.1rem'
              },
              '& textarea': {
                fontSize: '1.1rem !important'
              }
            }}
          />

          <ArrayInput source="tags">
            <SimpleFormIterator>
              <TextInput
                fullWidth
                label="Tag"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.1rem',
                    minHeight: '56px'
                  }
                }}
              />
            </SimpleFormIterator>
          </ArrayInput>
        </Card>
      </FormTab>

      {/* Tab 4: Romanian Specifications */}
      <FormTab label="Romanian Specifications">
        {/* Hardware */}
        <Card sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Specificații Hardware
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TextInput
                source="romanianSpecs.hardware.modelProcesor"
                label="Model Procesor"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.1rem',
                    minHeight: '56px'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextInput
                source="romanianSpecs.hardware.memorieRAM"
                label="Memorie RAM"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.1rem',
                    minHeight: '56px'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextInput
                source="romanianSpecs.hardware.capacitateStocare"
                label="Capacitate Stocare"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.1rem',
                    minHeight: '56px'
                  }
                }}
              />
            </Grid>
          </Grid>
        </Card>

        {/* Display */}
        <Card sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Specificații Display
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TextInput
                source="romanianSpecs.display.diagonalaDisplay"
                label="Diagonala Display"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.1rem',
                    minHeight: '56px'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextInput
                source="romanianSpecs.display.tehnologieDisplay"
                label="Tehnologie Display"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.1rem',
                    minHeight: '56px'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextInput
                source="romanianSpecs.display.rezolutieDisplay"
                label="Rezoluție Display"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.1rem',
                    minHeight: '56px'
                  }
                }}
              />
            </Grid>
          </Grid>
        </Card>

        {/* Features & Connectivity */}
        <Card sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Funcții și Conectivitate
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextInput
                source="romanianSpecs.features.functii"
                label="Funcții"
                multiline
                rows={3}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.1rem'
                  },
                  '& textarea': {
                    fontSize: '1.1rem !important'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextInput
                source="romanianSpecs.connectivity.conectivitate"
                label="Conectivitate"
                multiline
                rows={3}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.1rem'
                  },
                  '& textarea': {
                    fontSize: '1.1rem !important'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextInput
                source="romanianSpecs.features.splitScreen"
                label="Split Screen"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.1rem',
                    minHeight: '56px'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextInput
                source="romanianSpecs.features.limbiInterfata"
                label="Limbi Interfață"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.1rem',
                    minHeight: '56px'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextInput
                source="romanianSpecs.connectivity.bluetooth"
                label="Bluetooth"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.1rem',
                    minHeight: '56px'
                  }
                }}
              />
            </Grid>
          </Grid>
        </Card>

        {/* Package & Compatibility */}
        <Card sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Pachet și Compatibilitate
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextInput
                source="romanianSpecs.package.continutPachet"
                label="Conținut Pachet"
                multiline
                rows={4}
                fullWidth
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.1rem'
                  },
                  '& textarea': {
                    fontSize: '1.1rem !important'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextInput
                source="romanianSpecs.compatibility.destinatPentru"
                label="Destinat pentru"
                multiline
                rows={2}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.1rem'
                  },
                  '& textarea': {
                    fontSize: '1.1rem !important'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextInput
                source="romanianSpecs.compatibility.tipMontare"
                label="Tip Montare"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.1rem',
                    minHeight: '56px'
                  }
                }}
              />
            </Grid>
          </Grid>
        </Card>

        {/* General Info */}
        <Card sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Informații Generale
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <TextInput
                source="romanianSpecs.general.sku"
                label="SKU"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.1rem',
                    minHeight: '56px'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextInput
                source="romanianSpecs.general.brand"
                label="Brand"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.1rem',
                    minHeight: '56px'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextInput
                source="romanianSpecs.general.categorii"
                label="Categorii"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.1rem',
                    minHeight: '56px'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextInput
                source="romanianSpecs.general.sistemOperare"
                label="Sistem de Operare"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.1rem',
                    minHeight: '56px'
                  }
                }}
              />
            </Grid>
          </Grid>
        </Card>
      </FormTab>

      {/* Tab 6: Structured Description */}
      <FormTab label="Structured Description">
        <StructuredDescriptionEditor source="structuredDescription.sections" />
      </FormTab>

      {/* Tab 7: Cross-Sell */}
      <FormTab label="Cross-Sell">
        <CrossSellManager />
      </FormTab>
    </TabbedForm>
  );
};

const ProductEditWrapper = () => (
  <>
    <ProductEditHeading />
    <ProductEditForm />
  </>
);

export const ProductEdit = () => (
  <Edit
    sx={{
      '& .RaEdit-card': {
        borderRadius: 3,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }
    }}
  >
    <ProductEditWrapper />
  </Edit>
);

export default ProductEdit;
