import React from 'react';
import {
  Create,
  TextInput,
  NumberInput,
  BooleanInput,
  SelectInput,
  ArrayInput,
  SimpleFormIterator,
  TabbedForm,
  FormTab,
} from 'react-admin';
import { Box, Typography, Card, Grid } from '@mui/material';
import ImageField from './ImageField';
import StructuredDescriptionEditor from './StructuredDescriptionEditor';

const ProductCreateForm = () => {
  return (
    <TabbedForm>
      {/* Tab 1: Images */}
      <FormTab label="Images">
        <ImageField source="images" maxImages={20} />
      </FormTab>

      {/* Tab 2: Pricing & Stock */}
      <FormTab label="Pricing & Stock">
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

      {/* Tab 4: Technical Specifications */}
      <FormTab label="Technical Specifications">
        {/* Connectivity Options */}
        <Card sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Connectivity Options
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Add connectivity features like CarPlay, Bluetooth, Wi-Fi, etc.
          </Typography>

          <ArrayInput source="connectivityOptions">
            <SimpleFormIterator>
              <TextInput
                fullWidth
                label="Connectivity Option"
                placeholder="e.g., CarPlay & Android Auto Wireless"
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


        {/* Hardware Specifications */}
        <Card sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Hardware Specifications
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TextInput
                source="detailedSpecs.processor"
                label="Processor"
                fullWidth
                placeholder="e.g., Octa Core"
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
                source="detailedSpecs.ram"
                label="RAM"
                fullWidth
                placeholder="e.g., 8GB"
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
                source="detailedSpecs.storage"
                label="Storage"
                fullWidth
                placeholder="e.g., 256GB"
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

        {/* Display Specifications */}
        <Card sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Display Specifications
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextInput
                source="displaySpecs.technology"
                label="Display Technology"
                fullWidth
                placeholder="e.g., QLED"
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
                source="displaySpecs.resolution"
                label="Resolution"
                fullWidth
                placeholder="e.g., 2K"
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

      {/* Tab 5: Romanian Specifications */}
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
    </TabbedForm>
  );
};

export const ProductCreate = () => (
  <Create
    sx={{
      '& .RaCreate-card': {
        borderRadius: 3,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }
    }}
  >
    <ProductCreateForm />
  </Create>
);

export default ProductCreate;