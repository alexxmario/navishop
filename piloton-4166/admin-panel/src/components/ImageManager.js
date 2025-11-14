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
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Star,
  StarBorder,
  Edit,
  Visibility,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

const ImageManager = ({ images = [], onChange, maxImages = 10 }) => {
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [error, setError] = useState('');

  // Debug logging
  useEffect(() => {
    console.log('ImageManager received images:', images);
  }, [images]);

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5001/api/upload/image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    return response.json();
  };

  const deleteImage = async (imageUrl) => {
    const filename = imageUrl.split('/').pop();
    const token = localStorage.getItem('token');
    
    const response = await fetch(`http://localhost:5001/api/upload/image/${filename}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete image');
    }

    return response.json();
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    if (images.length + acceptedFiles.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed`);
      return;
    }

    setUploading(true);
    setError('');

    try {
      const uploadPromises = acceptedFiles.map(uploadImage);
      const uploadResults = await Promise.all(uploadPromises);
      
      const newImages = uploadResults.map((result, index) => ({
        url: result.url,
        alt: acceptedFiles[index].name,
        isPrimary: images.length === 0 && index === 0, // First image is primary if no images exist
      }));

      onChange([...images, ...newImages]);
    } catch (err) {
      setError('Failed to upload images: ' + err.message);
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
      await deleteImage(imageToRemove.url);
      
      const newImages = images.filter((_, i) => i !== index);
      
      // If we removed the primary image, make the first remaining image primary
      if (imageToRemove.isPrimary && newImages.length > 0) {
        newImages[0].isPrimary = true;
      }
      
      onChange(newImages);
    } catch (err) {
      setError('Failed to delete image: ' + err.message);
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
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CloudUpload />
          Product Images ({images.length}/{maxImages})
        </Typography>
        
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
              <Typography>Uploading images...</Typography>
            </Box>
          ) : (
            <Box>
              <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                {isDragActive ? 'Drop images here' : 'Drag & drop images here'}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                or click to select files
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Supported: JPEG, PNG, GIF, WebP (max 5MB each)
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
              First image URL: {images[0]?.url}
            </Typography>
          )}
        </Box>

        {/* Image Grid */}
        {images.length > 0 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Current Images ({images.length})
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
                        backgroundImage: `url(${image.url?.startsWith('http') ? image.url : `http://localhost:5001${image.url}`})`,
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
                              label="Primary" 
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
                            Image {index + 1}
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
          <DialogTitle>Image Preview</DialogTitle>
          <DialogContent>
            {previewImage && (
              <img
                src={previewImage.url?.startsWith('http') ? previewImage.url : `http://localhost:5001${previewImage.url}`}
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
            <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default ImageManager;