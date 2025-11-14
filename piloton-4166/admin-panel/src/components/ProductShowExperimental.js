import React from 'react';
import {
  Show,
  TextField,
  NumberField,
  BooleanField,
  DateField,
  ChipField,
  TabbedShowLayout,
  Tab,
  FunctionField,
} from 'react-admin';
import { Box, Typography, Grid, Card, CardContent, Chip, Avatar, Divider } from '@mui/material';
import { Inventory, Star, LocalOffer, Visibility, ShoppingCart } from '@mui/icons-material';
import ImageSlider360 from './ImageSlider360';

export const ProductShowExperimental = () => (
  <Show
    sx={{
      '& .RaShow-card': {
        borderRadius: 3,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }
    }}
  >
    <TabbedShowLayout>
      <Tab label="General" icon={<Inventory />}>
        {/* Product Header */}
        <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <CardContent>
            <FunctionField
              render={record => (
                <Box sx={{ display: 'flex', gap: 3 }}>
                  {/* Primary Image */}
                  <Box sx={{ flexShrink: 0 }}>
                    {record.images?.length > 0 ? (
                      <img
                        src={record.images.find(img => img.isPrimary)?.url || record.images[0]?.url}
                        alt={record.name}
                        style={{ width: 200, height: 200, objectFit: 'cover', borderRadius: 12 }}
                      />
                    ) : (
                      <Box sx={{ 
                        width: 200, 
                        height: 200, 
                        bgcolor: 'primary.light', 
                        borderRadius: 3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Inventory sx={{ fontSize: 60, color: 'white' }} />
                      </Box>
                    )}
                  </Box>
                  
                  {/* Product Info */}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#333' }}>
                      {record.name}
                    </Typography>
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                      {record.brand} - {record.model}
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {record.shortDescription}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                      {record.featured && (
                        <Chip icon={<Star />} label="Featured" color="primary" variant="filled" />
                      )}
                      {record.onSale && (
                        <Chip icon={<LocalOffer />} label="On Sale" color="error" variant="filled" />
                      )}
                      {record.newProduct && (
                        <Chip label="New" color="success" variant="filled" />
                      )}
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {record.price} RON
                      </Typography>
                      {record.originalPrice && record.originalPrice > record.price && (
                        <Typography 
                          variant="body1" 
                          sx={{ textDecoration: 'line-through', color: 'text.secondary' }}
                        >
                          {record.originalPrice} RON
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              )}
            />
          </CardContent>
        </Card>
        
        {/* THIS IS WHERE YOU CAN EXPERIMENT WITH NEW IMAGE DISPLAY DESIGNS */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Product Images - 360° View (Experimental)</Typography>
            <FunctionField
              render={record => (
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    StockX-style 360° image slider - drag to rotate or use controls
                  </Typography>
                  
                  {/* 360° IMAGE SLIDER */}
                  <ImageSlider360 
                    images={record.images || []} 
                    productName={record.name}
                  />
                  {/* END OF 360° SLIDER */}
                  
                  {/* Original Grid for Comparison */}
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Original Grid Layout (for comparison):
                    </Typography>
                    <Grid container spacing={2}>
                      {record.images?.map((image, index) => (
                        <Grid item key={index}>
                          <Box sx={{ position: 'relative' }}>
                            <img
                              src={image.url}
                              alt={image.alt || record.name}
                              style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8 }}
                            />
                            {image.isPrimary && (
                              <Chip
                                label="Primary"
                                size="small"
                                color="primary"
                                sx={{ position: 'absolute', top: 4, right: 4 }}
                              />
                            )}
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                  
                </Box>
              )}
            />
          </CardContent>
        </Card>
        
        {/* Basic Information */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Basic Information</Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField source="name" fullWidth />
                <TextField source="slug" fullWidth />
                <TextField source="sku" label="SKU" fullWidth />
              </Grid>
              <Grid item xs={12} md={6}>
                <ChipField source="category" />
                <TextField source="subcategory" fullWidth />
                <TextField source="brand" fullWidth />
                <TextField source="model" fullWidth />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        
        {/* Pricing */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Pricing</Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
                  <Typography variant="caption" color="white">Current Price</Typography>
                  <NumberField 
                    source="price" 
                    options={{ style: 'currency', currency: 'RON' }}
                    sx={{ 
                      '& .MuiTypography-root': { 
                        fontSize: '1.5rem', 
                        fontWeight: 700, 
                        color: 'white' 
                      } 
                    }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
                  <Typography variant="caption" color="textSecondary">Original Price</Typography>
                  <NumberField source="originalPrice" options={{ style: 'currency', currency: 'RON' }} />
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                  <Typography variant="caption" color="white">Discount</Typography>
                  <NumberField 
                    source="discount" 
                    options={{ style: 'percent' }}
                    sx={{ 
                      '& .MuiTypography-root': { 
                        fontSize: '1.2rem', 
                        fontWeight: 600, 
                        color: 'white' 
                      } 
                    }}
                  />
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        
        {/* Stock & Status */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Stock & Status</Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
                  <ShoppingCart sx={{ color: 'white', fontSize: 32 }} />
                  <Box>
                    <Typography variant="caption" color="white">Stock Available</Typography>
                    <NumberField 
                      source="stock" 
                      sx={{ 
                        '& .MuiTypography-root': { 
                          fontSize: '1.5rem', 
                          fontWeight: 700, 
                          color: 'white' 
                        } 
                      }}
                    />
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
                  <Typography variant="caption" color="white">Low Stock Alert</Typography>
                  <NumberField 
                    source="lowStockThreshold" 
                    sx={{ 
                      '& .MuiTypography-root': { 
                        fontSize: '1.2rem', 
                        fontWeight: 600, 
                        color: 'white' 
                      } 
                    }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="caption" color="textSecondary">Status</Typography>
                  <Box sx={{ mt: 1 }}>
                    <ChipField source="status" sx={{ fontSize: '1rem' }} />
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        
        {/* Product Flags */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Product Flags</Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Featured Product</Typography>
                  <BooleanField source="featured" />
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>New Product</Typography>
                  <BooleanField source="newProduct" />
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>On Sale</Typography>
                  <BooleanField source="onSale" />
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        
        {/* Descriptions */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Product Descriptions</Typography>
            <Divider sx={{ mb: 2 }} />
            <TextField source="description" multiline rows={4} fullWidth sx={{ mb: 2 }} />
            <TextField source="shortDescription" multiline rows={2} fullWidth />
          </CardContent>
        </Card>
        
        {/* Timestamps */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Timestamps</Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <DateField source="createdAt" />
              </Grid>
              <Grid item xs={6}>
                <DateField source="updatedAt" />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Tab>
      
      <Tab label="Compatibility">
        <FunctionField
          render={record => (
            <Box>
              {record.compatibility?.map((compat, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6">{compat.brand}</Typography>
                    {compat.model && <Typography>Model: {compat.model}</Typography>}
                    {compat.models?.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="subtitle2">Models:</Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                          {compat.models.map((model, idx) => (
                            <Chip key={idx} label={model} size="small" />
                          ))}
                        </Box>
                      </Box>
                    )}
                    {(compat.yearFrom || compat.yearTo) && (
                      <Typography sx={{ mt: 1 }}>
                        Years: {compat.yearFrom || '?'} - {compat.yearTo || '?'}
                      </Typography>
                    )}
                    {compat.years?.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="subtitle2">Years:</Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                          {compat.years.map((year, idx) => (
                            <Chip key={idx} label={year} size="small" />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        />
      </Tab>
      
      <Tab label="Specifications">
        <FunctionField
          render={record => (
            <Grid container spacing={2}>
              {record.specifications?.map((spec, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="body2" fontWeight="bold">{spec.key}</Typography>
                    <Typography variant="body2">{spec.value}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        />
        
        {/* Features */}
        <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Features</Typography>
        <FunctionField
          render={record => (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {record.features?.map((feature, index) => (
                <Chip key={index} label={feature} />
              ))}
            </Box>
          )}
        />
        
        {/* In the Box */}
        <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>In the Box</Typography>
        <FunctionField
          render={record => (
            <Box>
              {record.inTheBox?.map((item, index) => (
                <Typography key={index} variant="body2">• {item}</Typography>
              ))}
            </Box>
          )}
        />
      </Tab>
      
      <Tab label="SEO & Meta" icon={<Visibility />}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>SEO Information</Typography>
            <Divider sx={{ mb: 2 }} />
            <TextField source="seoTitle" fullWidth sx={{ mb: 2 }} />
            <TextField source="seoDescription" multiline rows={3} fullWidth />
          </CardContent>
        </Card>
        
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Tags</Typography>
            <Divider sx={{ mb: 2 }} />
            <FunctionField
              render={record => (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {record.tags?.map((tag, index) => (
                    <Chip key={index} label={tag} size="small" color="primary" variant="outlined" />
                  ))}
                </Box>
              )}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Analytics</Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={3}>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
                  <Visibility sx={{ color: 'white', fontSize: 32, mb: 1 }} />
                  <Typography variant="caption" color="white" display="block">Views</Typography>
                  <NumberField source="viewCount" sx={{ '& .MuiTypography-root': { color: 'white', fontWeight: 600 } }} />
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                  <ShoppingCart sx={{ color: 'white', fontSize: 32, mb: 1 }} />
                  <Typography variant="caption" color="white" display="block">Purchases</Typography>
                  <NumberField source="purchaseCount" sx={{ '& .MuiTypography-root': { color: 'white', fontWeight: 600 } }} />
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
                  <Star sx={{ color: 'white', fontSize: 32, mb: 1 }} />
                  <Typography variant="caption" color="white" display="block">Rating</Typography>
                  <NumberField source="averageRating" sx={{ '& .MuiTypography-root': { color: 'white', fontWeight: 600 } }} />
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'secondary.light', borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>📝</Typography>
                  <Typography variant="caption" color="white" display="block">Reviews</Typography>
                  <NumberField source="totalReviews" sx={{ '& .MuiTypography-root': { color: 'white', fontWeight: 600 } }} />
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Tab>
    </TabbedShowLayout>
  </Show>
);

export default ProductShowExperimental;