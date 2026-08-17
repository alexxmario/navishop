import React, { useEffect, useRef } from 'react';
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
  required,
  minValue,
} from 'react-admin';
import { useFormContext } from 'react-hook-form';
import { Box, Typography, Card, Grid } from '@mui/material';
import ImageField from './ImageField';
import StructuredDescriptionEditor from './StructuredDescriptionEditor';

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
const requiredNumber = [required(), minValue(0)];

const ProductDetailsSection = () => {
  const { watch, setValue } = useFormContext();
  const nameValue = watch('name');
  const slugValue = watch('slug');
  const slugEditedRef = useRef(false);

  useEffect(() => {
    if (slugEditedRef.current || !nameValue) return;
    if (!slugValue || slugValue.length === 0) {
      setValue('slug', generateSlug(nameValue), { shouldDirty: true });
    }
  }, [nameValue, slugValue, setValue]);

  const markSlugEdited = () => {
    slugEditedRef.current = true;
  };

  return (
    <Card sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Detalii produs
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextInput
            source="name"
            label="Nume produs"
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
        <Grid size={{ xs: 12, md: 6 }}>
          <TextInput
            source="slug"
            label="Slug URL"
            helperText="Folosit în URL-ul magazinului (ex: /product/slug-ul-dvs)"
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
        <Grid size={{ xs: 12, md: 4 }}>
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
        <Grid size={{ xs: 12, md: 4 }}>
          <TextInput
            source="model"
            label="Model / Generație"
            fullWidth
            required
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '1.1rem',
                minHeight: '56px'
              }
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <SelectInput
            source="category"
            label="Categorie"
            fullWidth
            validate={requiredCategory}
            choices={[
              { id: 'navigatii-gps', name: 'Navigații GPS' },
              { id: 'carplay-android', name: 'CarPlay / Android Auto' },
              { id: 'camere-marsarier', name: 'Camere Marsarier' },
              { id: 'accesorii', name: 'Accesorii' },
              { id: 'module-carplay', name: 'Module CarPlay' },
              { id: 'portbagaj-electric', name: 'Portbagaj Electric' },
              { id: 'lumini-ambientale', name: 'Lumini Ambientale' },
            ]}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '1.1rem',
                minHeight: '56px'
              }
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextInput
            source="sku"
            label="SKU / Cod intern"
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

const ProductCreateForm = () => {
  return (
    <TabbedForm>
      {/* Tab 1: Images */}
      <FormTab label="Imagini">
        <ImageField source="images" />
      </FormTab>

      {/* Tab 2: Pricing & Stock */}
      <FormTab label="Prețuri și Stoc">
        {/* Basic Details */}
        <ProductDetailsSection />

        {/* Pricing Section */}
        <Card sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Informații prețuri
          </Typography>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <NumberInput
                source="price"
                label="Preț curent"
                fullWidth
                defaultValue={0}
                validate={requiredNumber}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.2rem',
                    minHeight: '60px'
                  }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <NumberInput
                source="originalPrice"
                label="Preț original"
                fullWidth
                defaultValue={0}
                validate={[minValue(0)]}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.1rem',
                    minHeight: '56px'
                  }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <NumberInput
                source="discount"
                label="Reducere %"
                fullWidth
                defaultValue={0}
                validate={[minValue(0)]}
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
            Gestionare stoc
          </Typography>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <NumberInput
                source="stock"
                label="Cantitate în stoc"
                fullWidth
                defaultValue={0}
                validate={requiredNumber}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.2rem',
                    minHeight: '60px'
                  }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <NumberInput
                source="lowStockThreshold"
                label="Alertă stoc redus"
                fullWidth
                defaultValue={5}
                validate={[minValue(0)]}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.1rem',
                    minHeight: '56px'
                  }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <SelectInput
                source="status"
                label="Status produs"
                fullWidth
                defaultValue="active"
                choices={[
                  { id: 'active', name: 'Activ' },
                  { id: 'inactive', name: 'Inactiv (Ascuns din magazin)' },
                  { id: 'discontinued', name: 'Întrerupt' },
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
            Etichete produs
          </Typography>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <BooleanInput
                source="featured"
                label="Produs recomandat"
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
            <Grid size={{ xs: 12, md: 4 }}>
              <BooleanInput
                source="newProduct"
                label="Produs nou"
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
            <Grid size={{ xs: 12, md: 4 }}>
              <BooleanInput
                source="onSale"
                label="La reducere"
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
      <FormTab label="SEO și Etichete">
        <Card sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Informații SEO
          </Typography>

          <TextInput
            source="seoTitle"
            fullWidth
            label="Titlu SEO"
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
            label="Descriere SEO"
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
                label="Etichetă"
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
      <FormTab label="Specificații">
        {/* Hardware */}
        <Card sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Specificații Hardware
          </Typography>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
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
            <Grid size={{ xs: 12, md: 4 }}>
              <TextInput
                source="romanianSpecs.hardware.frecventa"
                label="Frecvență"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.1rem',
                    minHeight: '56px'
                  }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
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
            <Grid size={{ xs: 12, md: 4 }}>
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
            <Grid size={{ xs: 12, md: 4 }}>
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
            <Grid size={{ xs: 12, md: 4 }}>
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
            <Grid size={{ xs: 12, md: 4 }}>
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
            <Grid size={{ xs: 12, md: 6 }}>
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
            <Grid size={{ xs: 12, md: 6 }}>
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
            <Grid size={{ xs: 12, md: 4 }}>
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
            <Grid size={{ xs: 12, md: 4 }}>
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
            <Grid size={{ xs: 12, md: 4 }}>
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
            <Grid size={{ xs: 12 }}>
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
            <Grid size={{ xs: 12, md: 6 }}>
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
            <Grid size={{ xs: 12, md: 6 }}>
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
            <Grid size={{ xs: 12 }}>
              <TextInput
                source="romanianSpecs.additional.limitari"
                label="Limitări (la nivel de mașină)"
                helperText="Se afișează ca avertisment galben deasupra butonului de coș. Lasă gol dacă modelul nu are limitări."
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
          </Grid>
        </Card>

        {/* General Info */}
        <Card sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Informații Generale
          </Typography>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 3 }}>
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
            <Grid size={{ xs: 12, md: 3 }}>
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
            <Grid size={{ xs: 12, md: 3 }}>
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
            <Grid size={{ xs: 12, md: 3 }}>
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
      <FormTab label="Descriere structurată">
        <StructuredDescriptionEditor source="structuredDescription.sections" />
      </FormTab>
    </TabbedForm>
  );
};

export const ProductCreate = () => (
  <Create
    sx={{
      '& .RaCreate-card': {
        borderRadius: '16px',
        border: '1px solid #e4e7ec',
        boxShadow: 'none'
      }
    }}
  >
    <ProductCreateForm />
  </Create>
);

export default ProductCreate;
