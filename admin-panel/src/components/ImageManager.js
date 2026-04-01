import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  CircularProgress,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  DeleteSweep,
  Star,
  StarBorder,
  Edit,
  Visibility,
  ContentCopy,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { buildApiUrl, resolveImageUrl } from '../config/api';

const getImageSource = (image) => {
  if (!image) return '';
  return resolveImageUrl(image.url || image.relativeUrl);
};

const ImageManager = ({ images = [], onChange, maxImages = 30 }) => {
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [error, setError] = useState('');

  // Copy images from product state
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Delete all images confirmation
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('ImageManager received images:', images);
  }, [images]);

  // Search products for copying images
  const searchProducts = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        buildApiUrl(`products?search=${encodeURIComponent(query)}&limit=20`)
      );

      if (response.ok) {
        const data = await response.json();
        // Only show products that have images
        const productsWithImages = data.products.filter(
          product => product.images && product.images.length > 0
        );
        setSearchResults(productsWithImages);
        setHasSearched(true);
      }
    } catch (error) {
      console.error('Failed to search products:', error);
      setError('Căutare produse eșuată');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input change with debounce
  useEffect(() => {
    if (!copyDialogOpen) return;
    const timeoutId = setTimeout(() => {
      searchProducts(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, copyDialogOpen]);

  // Copy images from selected product
  // Delete all images
  const handleDeleteAllImages = () => {
    onChange([]);
    setDeleteAllDialogOpen(false);
  };

  const handleCopyImages = (product) => {
    if (!product.images || product.images.length === 0) {
      setError('Produsul selectat nu are imagini');
      return;
    }

    // Copy images array, resetting isPrimary based on position
    const copiedImages = product.images.map((img, index) => ({
      url: img.url,
      relativeUrl: img.relativeUrl || img.url,
      alt: img.alt || product.name,
      isPrimary: images.length === 0 && index === 0, // First image is primary only if no existing images
    }));

    // Combine with existing images
    const newImages = [...images, ...copiedImages];

    // Check max limit
    if (newImages.length > maxImages) {
      setError(`Prea multe imagini. Maxim ${maxImages} imagini permise. Aveți ${images.length}, încercați să copiați ${copiedImages.length}.`);
      return;
    }

    onChange(newImages);
    setCopyDialogOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    const token = localStorage.getItem('token');
    const response = await fetch(buildApiUrl('upload/image'), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.message || 'Eroare la încărcarea imaginii');
    }

    return data;
  };

  const deleteImage = async (imageUrl) => {
    if (!imageUrl) {
      throw new Error('Invalid image path');
    }
    const filename = imageUrl.split('/').pop();
    const token = localStorage.getItem('token');
    
    const response = await fetch(buildApiUrl(`upload/image/${filename}`), {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.message || 'Eroare la ștergerea imaginii');
    }

    return data;
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    if (images.length + acceptedFiles.length > maxImages) {
      setError(`Maxim ${maxImages} imagini permise`);
      return;
    }

    setUploading(true);
    setError('');

    try {
      const uploadPromises = acceptedFiles.map(uploadImage);
      const uploadResults = await Promise.all(uploadPromises);
      
      const newImages = uploadResults.map((result, index) => ({
        url: result.url,
        relativeUrl: result.relativeUrl || result.url,
        alt: acceptedFiles[index].name,
        isPrimary: images.length === 0 && index === 0, // First image is primary if no images exist
      }));

      onChange([...images, ...newImages]);
    } catch (err) {
      setError('Eroare la încărcarea imaginilor: ' + err.message);
    } finally {
      setUploading(false);
    }
  }, [images, onChange, maxImages]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const handleRemoveImage = async (index) => {
    try {
      const imageToRemove = images[index];
      const sourcePath = imageToRemove.url || imageToRemove.relativeUrl;
      await deleteImage(sourcePath);
      
      const newImages = images.filter((_, i) => i !== index);
      
      // If we removed the primary image, make the first remaining image primary
      if (imageToRemove.isPrimary && newImages.length > 0) {
        newImages[0].isPrimary = true;
      }
      
      onChange(newImages);
    } catch (err) {
      setError('Eroare la ștergerea imaginii: ' + err.message);
    }
  };

  const handleSetPrimary = (index) => {
    const newImages = images.map((img, i) => ({
      ...img,
      isPrimary: i === index
    }));
    onChange(newImages);
  };

  const handlePreview = (image) => {
    setPreviewImage(image);
    setPreviewOpen(true);
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CloudUpload />
            Imagini produs ({images.length}/{maxImages})
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<ContentCopy />}
              onClick={() => setCopyDialogOpen(true)}
              size="small"
            >
              Copiază de la alt produs
            </Button>
            {images.length > 0 && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteSweep />}
                onClick={() => setDeleteAllDialogOpen(true)}
                size="small"
              >
                Șterge toate
              </Button>
            )}
          </Box>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Upload Zone */}
        <Box
          {...getRootProps()}
          sx={{
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : 'grey.300',
            borderRadius: 2,
            p: 3,
            mb: 3,
            textAlign: 'center',
            cursor: 'pointer',
            bgcolor: isDragActive ? 'primary.light' : 'grey.50',
            transition: 'all 0.3s ease',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'primary.light'
            }
          }}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <CircularProgress />
              <Typography>Se încarcă imaginile...</Typography>
            </Box>
          ) : (
            <Box>
              <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                {isDragActive ? 'Plasați imaginile aici' : 'Trageți și plasați imaginile aici'}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                sau apăsați pentru a selecta
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Acceptate: JPEG, PNG, GIF, WebP (max 5MB fiecare)
              </Typography>
            </Box>
          )}
        </Box>

        {/* Debug Info */}
        <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="caption" display="block">
            Debug: Received {images.length} images
          </Typography>
          {images.length > 0 && (
            <Typography variant="caption" display="block">
              First image URL: {images[0]?.url || images[0]?.relativeUrl}
            </Typography>
          )}
        </Box>

        {/* Image Grid */}
        {images.length > 0 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Imagini curente ({images.length})
            </Typography>
            <Grid container spacing={2}>
              {images.map((image, index) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                  <Card 
                    sx={{ 
                      position: 'relative',
                      borderRadius: 2,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      '&:hover': {
                        transform: 'scale(1.02)',
                        boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                      }
                    }}
                    onClick={() => handlePreview(image)}
                  >
                    <Box
                      sx={{
                        width: '100%',
                        height: 200,
                        backgroundImage: `url(${getImageSource(image)})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        position: 'relative',
                        border: '1px solid #ddd' // Add border to see the box even if image fails
                      }}
                    >
                      {/* Overlay with controls */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.5) 100%)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          p: 1
                        }}
                      >
                        {/* Top controls */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          {image.isPrimary && (
                            <Chip
                              label="Principală"
                              size="small" 
                              color="primary" 
                              icon={<Star />}
                              sx={{ 
                                bgcolor: 'primary.main',
                                color: 'white',
                                fontWeight: 'bold'
                              }}
                            />
                          )}
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage(index);
                            }}
                            sx={{ 
                              color: 'white',
                              bgcolor: 'rgba(244, 67, 54, 0.8)',
                              '&:hover': {
                                bgcolor: 'error.main'
                              }
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </Box>

                        {/* Bottom controls */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'white',
                              fontWeight: 'bold',
                              textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                            }}
                          >
                            Imagine {index + 1}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePreview(image);
                              }}
                              sx={{ 
                                color: 'white',
                                bgcolor: 'rgba(0,0,0,0.5)',
                                '&:hover': {
                                  bgcolor: 'rgba(0,0,0,0.7)'
                                }
                              }}
                            >
                              <Visibility />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetPrimary(index);
                              }}
                              sx={{ 
                                color: image.isPrimary ? '#ffd700' : 'white',
                                bgcolor: 'rgba(0,0,0,0.5)',
                                '&:hover': {
                                  bgcolor: 'rgba(0,0,0,0.7)'
                                }
                              }}
                            >
                              {image.isPrimary ? <Star /> : <StarBorder />}
                            </IconButton>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Preview Dialog */}
        <Dialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Previzualizare imagine</DialogTitle>
          <DialogContent>
            {previewImage && (
              <img
                src={getImageSource(previewImage)}
                alt={previewImage.alt}
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: '70vh',
                  objectFit: 'contain'
                }}
                onError={(e) => {
                  console.error('Failed to load image:', previewImage.url);
                  e.target.style.display = 'none';
                }}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreviewOpen(false)}>Închide</Button>
          </DialogActions>
        </Dialog>

        {/* Copy Images Dialog */}
        <Dialog
          open={copyDialogOpen}
          onClose={() => {
            setCopyDialogOpen(false);
            setSearchQuery('');
            setSearchResults([]);
            setHasSearched(false);
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ContentCopy />
              Copiază imagini de la alt produs
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Caută un produs și copiază toate imaginile lui în produsul curent.
            </Typography>

            {/* Search Bar */}
            <TextField
              fullWidth
              placeholder="Caută produse după nume..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {isSearching ? <CircularProgress size={20} /> : <SearchIcon />}
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            {/* Search Results */}
            {hasSearched && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Rezultate ({searchResults.length})
                </Typography>

                {searchResults.length > 0 ? (
                  <List sx={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 1 }}>
                    {searchResults.map((product) => (
                      <ListItem
                        key={product._id}
                        sx={{
                          borderBottom: '1px solid #f0f0f0',
                          '&:last-child': { borderBottom: 'none' },
                          '&:hover': { bgcolor: 'grey.50' }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mr: 2 }}>
                          {product.images?.[0]?.url && (
                            <img
                              src={resolveImageUrl(product.images[0].url)}
                              alt={product.name}
                              style={{
                                width: 60,
                                height: 60,
                                objectFit: 'cover',
                                borderRadius: 4,
                                border: '1px solid #ddd'
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          )}
                        </Box>
                        <ListItemText
                          primary={product.name}
                          secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <Chip
                                label={`${product.images?.length || 0} imagini`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                              <Typography variant="caption" color="textSecondary">
                                {product.brand} • {product.category}
                              </Typography>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<ContentCopy />}
                            onClick={() => handleCopyImages(product)}
                          >
                            Copiază
                          </Button>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Alert severity="info">
                    Nu s-au găsit produse cu imagini pentru "{searchQuery}"
                  </Alert>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setCopyDialogOpen(false);
              setSearchQuery('');
              setSearchResults([]);
              setHasSearched(false);
            }}>
              Anulează
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete All Images Confirmation Dialog */}
        <Dialog
          open={deleteAllDialogOpen}
          onClose={() => setDeleteAllDialogOpen(false)}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
              <DeleteSweep />
              Șterge toate imaginile?
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography>
              Ești sigur că vrei să ștergi toate cele {images.length} imagini?
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Această acțiune nu poate fi anulată.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteAllDialogOpen(false)}>
              Anulează
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteAllImages}
              startIcon={<DeleteSweep />}
            >
              Șterge toate
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default ImageManager;
