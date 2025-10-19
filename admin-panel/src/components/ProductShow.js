import React, { useState, useEffect, useCallback } from 'react';
import {
  Show,
  TextField,
  NumberField,
  TabbedShowLayout,
  Tab,
  FunctionField,
  useRecordContext,
  useNotify,
  useRefresh,
} from 'react-admin';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  Button,
  Rating,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert
} from '@mui/material';
import {
  Inventory,
  Star,
  LocalOffer,
  Visibility,
  Edit,
  Delete,
  CheckCircle,
  Cancel,
  Pending,
  ThumbUp
} from '@mui/icons-material';

// Cross-Sell Display Component
const CrossSellDisplay = ({ productId }) => {
  const [crossSellData, setCrossSellData] = useState(null);

  useEffect(() => {
    const fetchCrossSellData = async () => {
      try {
        const response = await fetch(`http://localhost:5001/api/products/${productId}/cross-sell`);
        if (response.ok) {
          const data = await response.json();
          setCrossSellData(data);
        }
      } catch (error) {
        console.error('Failed to fetch cross-sell data:', error);
      }
    };

    if (productId) {
      fetchCrossSellData();
    }
  }, [productId]);

  if (!crossSellData) {
    return (
      <Box sx={{ textAlign: 'center', p: 2 }}>
        <Typography>Loading cross-sell data...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {crossSellData?.crossSellProducts?.length > 0 ? (
        <Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              All Compatible Accessories ({crossSellData.totalCrossSells})
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {crossSellData.directCrossSells} direct cross-sells + {crossSellData.reverseCrossSells} reverse relationships
            </Typography>
          </Box>
          <Grid container spacing={2}>
            {crossSellData.crossSellProducts.map((product, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Card sx={{ border: '1px solid #e0e0e0' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      {product.images?.[0]?.url && (
                        <img
                          src={product.images[0].url}
                          alt={product.name}
                          style={{
                            width: 60,
                            height: 60,
                            objectFit: 'cover',
                            borderRadius: 4
                          }}
                        />
                      )}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                          {product.name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                          {product.brand} • {product.price} lei
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip label={product.category} size="small" variant="outlined" />
                          {product.stock > 0 ? (
                            <Chip label="În stoc" size="small" color="success" />
                          ) : (
                            <Chip label="Stoc epuizat" size="small" color="error" />
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', p: 4, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No Cross-Sell Products
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            This product doesn't have any compatible accessories configured yet.
          </Typography>
          <Button
            variant="contained"
            startIcon={<Edit />}
            onClick={() => window.open(`#/products/${productId}`, '_blank')}
          >
            Add Cross-Sell Products
          </Button>
        </Box>
      )}
    </Box>
  );
};

// Review Overview Stats Component
const ReviewOverviewStats = ({ record }) => {
  const [reviewStats, setReviewStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`http://localhost:5001/api/reviews/stats/${record.id}`);
        if (response.ok) {
          const stats = await response.json();
          setReviewStats(stats);
        }
      } catch (error) {
        console.error('Failed to fetch review stats:', error);
      }
    };

    if (record?.id) {
      fetchStats();
    }
  }, [record?.id]);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
          <Star sx={{ fontSize: 40, color: 'white', mb: 1 }} />
          <Typography variant="h4" color="white">
            {reviewStats?.averageRating?.toFixed(1) || '0.0'}
          </Typography>
          <Typography variant="body2" color="white">Average Rating</Typography>
        </Box>
      </Grid>

      <Grid item xs={12} md={4}>
        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
          <Typography variant="h4" color="white">
            {reviewStats?.totalReviews || 0}
          </Typography>
          <Typography variant="body2" color="white">Total Reviews</Typography>
        </Box>
      </Grid>

      <Grid item xs={12} md={4}>
        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
          <Typography variant="h4" color="white">
            {reviewStats?.ratingDistribution?.[5] || 0}
          </Typography>
          <Typography variant="body2" color="white">5-Star Reviews</Typography>
        </Box>
      </Grid>
    </Grid>
  );
};

// Reviews Management Component
const ProductReviewsTab = () => {
  const record = useRecordContext();
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, reviewId: null });
  const notify = useNotify();
  const refresh = useRefresh();

  const fetchReviews = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/reviews/product/${record.id}?page=1&limit=50`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  }, [record.id]);

  const fetchReviewStats = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/reviews/stats/${record.id}`);
      if (response.ok) {
        const stats = await response.json();
        setReviewStats(stats);
      }
    } catch (error) {
      console.error('Failed to fetch review stats:', error);
    }
  }, [record.id]);

  useEffect(() => {
    if (record?.id) {
      fetchReviews();
      fetchReviewStats();
    }
  }, [record?.id, fetchReviews, fetchReviewStats]);

  const handleStatusChange = async (reviewId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:5001/api/reviews/admin/${reviewId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        notify(`Review ${newStatus} successfully`, { type: 'success' });
        fetchReviews();
        fetchReviewStats();
        refresh();
      } else {
        throw new Error('Failed to update review status');
      }
    } catch (error) {
      notify('Error updating review status', { type: 'error' });
    }
  };

  const handleDeleteReview = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/reviews/${deleteDialog.reviewId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        notify('Review deleted successfully', { type: 'success' });
        fetchReviews();
        fetchReviewStats();
        refresh();
      } else {
        throw new Error('Failed to delete review');
      }
    } catch (error) {
      notify('Error deleting review', { type: 'error' });
    } finally {
      setDeleteDialog({ open: false, reviewId: null });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <Typography>Loading reviews...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Review Stats Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom color="primary">
            Review Statistics
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
                <Star sx={{ fontSize: 40, color: 'white', mb: 1 }} />
                <Typography variant="h4" color="white">
                  {reviewStats?.averageRating?.toFixed(1) || '0.0'}
                </Typography>
                <Typography variant="body2" color="white">Average Rating</Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                <Typography variant="h4" color="white">
                  {reviewStats?.totalReviews || 0}
                </Typography>
                <Typography variant="body2" color="white">Total Reviews</Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
                <Pending sx={{ fontSize: 40, color: 'white', mb: 1 }} />
                <Typography variant="h4" color="white">
                  {reviews.filter(r => r.status === 'pending').length}
                </Typography>
                <Typography variant="body2" color="white">Pending</Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
                <CheckCircle sx={{ fontSize: 40, color: 'white', mb: 1 }} />
                <Typography variant="h4" color="white">
                  {reviews.filter(r => r.status === 'approved').length}
                </Typography>
                <Typography variant="body2" color="white">Approved</Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" color="primary">
              Product Reviews ({reviews.length})
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Star />}
              onClick={() => window.open(`#/reviews?filter=%7B"productId":"${record.id}"%7D`, '_blank')}
            >
              Manage All Reviews
            </Button>
          </Box>
          <Divider sx={{ mb: 3 }} />

          {reviews.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Star sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                No Reviews Yet
              </Typography>
              <Typography variant="body2" color="textSecondary">
                This product hasn't received any reviews from customers yet.
              </Typography>
            </Box>
          ) : (
            <List>
              {reviews.slice(0, 10).map((review) => (
                <ListItem key={review._id} sx={{ border: 1, borderColor: 'grey.200', borderRadius: 1, mb: 2 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {review.title}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Rating value={review.rating} size="small" readOnly />
                            <Typography variant="body2" color="textSecondary">
                              by {review.userName}
                            </Typography>
                            <Chip
                              label={review.status}
                              color={getStatusColor(review.status)}
                              size="small"
                            />
                          </Box>
                        </Box>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          {review.comment.substring(0, 200)}
                          {review.comment.length > 200 && '...'}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ThumbUp sx={{ fontSize: 14 }} />
                          <Typography variant="caption">{review.helpfulVotes} helpful</Typography>
                          <Typography variant="caption" color="textSecondary">
                            • {new Date(review.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {review.status === 'pending' && (
                        <>
                          <IconButton
                            color="success"
                            onClick={() => handleStatusChange(review._id, 'approved')}
                            title="Approve Review"
                          >
                            <CheckCircle />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => handleStatusChange(review._id, 'rejected')}
                            title="Reject Review"
                          >
                            <Cancel />
                          </IconButton>
                        </>
                      )}
                      {review.status === 'rejected' && (
                        <IconButton
                          color="success"
                          onClick={() => handleStatusChange(review._id, 'approved')}
                          title="Approve Review"
                        >
                          <CheckCircle />
                        </IconButton>
                      )}
                      {review.status === 'approved' && (
                        <IconButton
                          color="warning"
                          onClick={() => handleStatusChange(review._id, 'pending')}
                          title="Set Pending"
                        >
                          <Pending />
                        </IconButton>
                      )}
                      <IconButton
                        color="error"
                        onClick={() => setDeleteDialog({ open: true, reviewId: review._id })}
                        title="Delete Review"
                      >
                        <Delete />
                      </IconButton>
                      <IconButton
                        color="primary"
                        onClick={() => window.open(`#/reviews/${review._id}/show`, '_blank')}
                        title="View Full Review"
                      >
                        <Visibility />
                      </IconButton>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}

          {reviews.length > 10 && (
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Alert severity="info">
                Showing first 10 reviews. Click "Manage All Reviews" to see all {reviews.length} reviews.
              </Alert>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, reviewId: null })}
      >
        <DialogTitle>Delete Review</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to permanently delete this review? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, reviewId: null })}>
            Cancel
          </Button>
          <Button onClick={handleDeleteReview} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export const ProductShow = () => (
  <Show
    sx={{
      '& .RaShow-card': {
        borderRadius: 3,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }
    }}
  >
    <TabbedShowLayout>
      {/* Images Tab */}
      <Tab label="Images">
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              Product Images
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <FunctionField
              render={record => (
                <Box>
                  {record.images?.length > 0 ? (
                    <Grid container spacing={3}>
                      {record.images.map((image, index) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                          <Card sx={{ position: 'relative', overflow: 'hidden' }}>
                            <Box sx={{ position: 'relative' }}>
                              <img
                                src={image.url}
                                alt={`Product image ${index + 1}`}
                                style={{
                                  width: '100%',
                                  height: 200,
                                  objectFit: 'cover'
                                }}
                              />
                              {image.isPrimary && (
                                <Chip
                                  label="Primary"
                                  color="primary"
                                  size="small"
                                  sx={{
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    backgroundColor: 'rgba(0,0,0,0.7)',
                                    color: 'white'
                                  }}
                                />
                              )}
                            </Box>
                            <CardContent sx={{ p: 2 }}>
                              <Typography variant="body2" color="textSecondary">
                                Image {index + 1}
                              </Typography>
                              {image.alt && (
                                <Typography variant="caption" display="block">
                                  Alt: {image.alt}
                                </Typography>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Box sx={{ textAlign: 'center', p: 4, bgcolor: 'grey.50', borderRadius: 2 }}>
                      <Typography variant="h6" color="textSecondary" gutterBottom>
                        No Images
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        This product doesn't have any images uploaded yet.
                      </Typography>
                      <FunctionField
                        render={record => (
                          <Button
                            variant="contained"
                            startIcon={<Edit />}
                            onClick={() => window.open(`#/products/${record.id}`, '_blank')}
                          >
                            Add Images
                          </Button>
                        )}
                      />
                    </Box>
                  )}
                </Box>
              )}
            />
          </CardContent>
        </Card>
      </Tab>

      {/* Overview Tab */}
      <Tab label="Overview">
        {/* Quick Stats */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              Product Overview
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
              {/* Pricing Info */}
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
                  <LocalOffer sx={{ fontSize: 40, color: 'white', mb: 1 }} />
                  <Typography variant="h5" color="white">
                    <NumberField source="price" />
                  </Typography>
                  <Typography variant="body2" color="white">Current Price</Typography>
                </Box>
              </Grid>

              {/* Stock Info */}
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                  <Inventory sx={{ fontSize: 40, color: 'white', mb: 1 }} />
                  <Typography variant="h5" color="white">
                    <NumberField source="stock" />
                  </Typography>
                  <Typography variant="body2" color="white">In Stock</Typography>
                </Box>
              </Grid>

              {/* Status */}
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
                  <Visibility sx={{ fontSize: 40, color: 'white', mb: 1 }} />
                  <Typography variant="h6" color="white">
                    <TextField source="status" />
                  </Typography>
                  <Typography variant="body2" color="white">Status</Typography>
                </Box>
              </Grid>

              {/* Flags */}
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
                  <Star sx={{ fontSize: 40, color: 'white', mb: 1 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <FunctionField
                      render={record => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}>
                          {record.featured && <Chip label="Featured" size="small" color="primary" />}
                          {record.newProduct && <Chip label="New" size="small" color="success" />}
                          {record.onSale && <Chip label="On Sale" size="small" color="error" />}
                        </Box>
                      )}
                    />
                  </Box>
                  <Typography variant="body2" color="white">Product Flags</Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Rating Overview */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              Customer Reviews Overview
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <FunctionField
              render={record => <ReviewOverviewStats record={record} />}
            />
          </CardContent>
        </Card>

        {/* Quick Edit Actions */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Quick Actions</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FunctionField
                  render={record => (
                    <Button
                      variant="contained"
                      startIcon={<Edit />}
                      onClick={() => window.open(`#/products/${record.id}`, '_blank')}
                    >
                      Edit Product
                    </Button>
                  )}
                />
                <FunctionField
                  render={record => (
                    <Button
                      variant="outlined"
                      startIcon={<Visibility />}
                      onClick={() => window.open(`/product/${record.slug}`, '_blank')}
                    >
                      View on Frontend
                    </Button>
                  )}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Tab>

      {/* Technical Specifications Tab */}
      <Tab label="Technical Specifications">
        {/* Connectivity Options */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              Connectivity Options
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <FunctionField
              render={record => (
                <Box>
                  {record.connectivityOptions?.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {record.connectivityOptions.map((option, index) => (
                        <Chip
                          key={index}
                          label={option}
                          variant="outlined"
                          color="primary"
                          sx={{ mb: 1 }}
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No connectivity options specified
                    </Typography>
                  )}
                </Box>
              )}
            />
          </CardContent>
        </Card>


        {/* Hardware & Display Specs */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Hardware Specifications
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Box sx={{ space: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="textSecondary">Processor:</Typography>
                    <TextField source="detailedSpecs.processor" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="textSecondary">RAM:</Typography>
                    <TextField source="detailedSpecs.ram" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="textSecondary">Storage:</Typography>
                    <TextField source="detailedSpecs.storage" />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Display Specifications
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Box sx={{ space: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="textSecondary">Technology:</Typography>
                    <TextField source="displaySpecs.technology" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="textSecondary">Resolution:</Typography>
                    <TextField source="displaySpecs.resolution" />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Tab>

      {/* Romanian Specifications Tab */}
      <Tab label="Romanian Specifications">
        {/* Hardware & Display Romanian */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Specificații Hardware
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Box sx={{ space: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="textSecondary">Model Procesor:</Typography>
                    <TextField source="romanianSpecs.hardware.modelProcesor" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="textSecondary">Memorie RAM:</Typography>
                    <TextField source="romanianSpecs.hardware.memorieRAM" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="textSecondary">Capacitate Stocare:</Typography>
                    <TextField source="romanianSpecs.hardware.capacitateStocare" />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Specificații Display
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Box sx={{ space: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="textSecondary">Diagonala Display:</Typography>
                    <TextField source="romanianSpecs.display.diagonalaDisplay" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="textSecondary">Tehnologie Display:</Typography>
                    <TextField source="romanianSpecs.display.tehnologieDisplay" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="textSecondary">Rezoluție Display:</Typography>
                    <TextField source="romanianSpecs.display.rezolutieDisplay" />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Package & Compatibility */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              Pachet și Compatibilitate
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                  Conținut Pachet:
                </Typography>
                <TextField source="romanianSpecs.package.continutPachet" />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Destinat pentru:
                </Typography>
                <TextField source="romanianSpecs.compatibility.destinatPentru" />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Tip Montare:
                </Typography>
                <TextField source="romanianSpecs.compatibility.tipMontare" />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* General Info */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              Informații Generale
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="body2" color="textSecondary">SKU</Typography>
                  <Typography variant="h6">
                    <TextField source="romanianSpecs.general.sku" />
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="body2" color="textSecondary">Brand</Typography>
                  <Typography variant="h6">
                    <TextField source="romanianSpecs.general.brand" />
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="body2" color="textSecondary">Categorii</Typography>
                  <Typography variant="h6">
                    <TextField source="romanianSpecs.general.categorii" />
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="body2" color="textSecondary">Sistem Operare</Typography>
                  <Typography variant="h6">
                    <TextField source="romanianSpecs.general.sistemOperare" />
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Tab>

      {/* Structured Description Tab */}
      <Tab label="Structured Description">
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Product Description</Typography>
              <FunctionField
                render={record => (
                  <Button
                    variant="outlined"
                    startIcon={<Edit />}
                    size="small"
                    onClick={() => window.open(`#/products/${record.id}`, '_blank')}
                    sx={{ ml: 2 }}
                  >
                    Edit Structure
                  </Button>
                )}
              />
            </Box>
            <Divider sx={{ mb: 3 }} />

            <FunctionField
              render={record => {
                console.log('ProductShow - Full record:', record);
                console.log('ProductShow - structuredDescription:', record.structuredDescription);
                console.log('ProductShow - sections:', record.structuredDescription?.sections);
                console.log('ProductShow - sections length:', record.structuredDescription?.sections?.length);

                // Check if sections exist and are an array
                const sections = record.structuredDescription?.sections;
                const hasSections = Array.isArray(sections) && sections.length > 0;
                console.log('ProductShow - hasSections:', hasSections);

                return (
                <Box>

                  {hasSections ? (
                    <Box sx={{ space: 3 }}>
                      {sections.map((section, sectionIndex) => (
                        <Card key={sectionIndex} sx={{ mb: 3, border: '1px solid #e0e0e0' }}>
                          <CardContent>
                            <Typography
                              variant="h6"
                              sx={{
                                color: 'primary.main',
                                mb: 2,
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <span style={{ fontSize: '1.5rem', marginRight: '12px' }}>
                                {section.icon}
                              </span>
                              {section.title}
                            </Typography>
                            <Box sx={{ space: 2 }}>
                              {section.points?.map((point, pointIndex) => (
                                <Box
                                  key={pointIndex}
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    mb: 2
                                  }}
                                >
                                  <Box sx={{
                                    width: 8,
                                    height: 8,
                                    bgcolor: 'primary.main',
                                    borderRadius: '50%',
                                    mt: 1,
                                    mr: 2,
                                    flexShrink: 0
                                  }} />
                                  <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                                    {point}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', p: 4, bgcolor: 'grey.50', borderRadius: 2 }}>
                      <Typography variant="h6" color="textSecondary" gutterBottom>
                        No Structured Description
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        Add a structured description to showcase this product's features beautifully.
                      </Typography>
                      <FunctionField
                        render={record => (
                          <Button
                            variant="contained"
                            startIcon={<Edit />}
                            onClick={() => window.open(`#/products/${record.id}`, '_blank')}
                          >
                            Add Structured Description
                          </Button>
                        )}
                      />
                    </Box>
                  )}
                </Box>
                );
              }}
            />
          </CardContent>
        </Card>
      </Tab>

      {/* Reviews Tab */}
      <Tab label="Reviews & Ratings">
        <ProductReviewsTab />
      </Tab>

      {/* SEO & Pricing Tab */}
      <Tab label="SEO & Pricing">
        {/* Pricing Details */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              Pricing Information
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 3, bgcolor: 'success.light', borderRadius: 2 }}>
                  <Typography variant="h4" color="white">
                    <NumberField source="price" />
                  </Typography>
                  <Typography variant="body1" color="white">Current Price</Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 3, bgcolor: 'info.light', borderRadius: 2 }}>
                  <Typography variant="h4" color="white">
                    <NumberField source="originalPrice" />
                  </Typography>
                  <Typography variant="body1" color="white">Original Price</Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 3, bgcolor: 'warning.light', borderRadius: 2 }}>
                  <Typography variant="h4" color="white">
                    <NumberField source="discount" />%
                  </Typography>
                  <Typography variant="body1" color="white">Discount</Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* SEO Information */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              SEO Information
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Box sx={{ space: 3 }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                  SEO Title:
                </Typography>
                <TextField source="seoTitle" />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                  SEO Description:
                </Typography>
                <TextField source="seoDescription" />
              </Box>

              <Box>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                  Tags:
                </Typography>
                <FunctionField
                  render={record => (
                    <Box>
                      {record.tags?.length > 0 ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {record.tags.map((tag, index) => (
                            <Chip
                              key={index}
                              label={tag}
                              variant="outlined"
                              color="secondary"
                            />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          No tags specified
                        </Typography>
                      )}
                    </Box>
                  )}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Tab>

      {/* Cross-Sell Tab */}
      <Tab label="Cross-Sell">
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              Cross-Sell Products (Accesorii compatibile)
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <FunctionField
              render={record => (
                <CrossSellDisplay productId={record.id} />
              )}
            />
          </CardContent>
        </Card>
      </Tab>
    </TabbedShowLayout>
  </Show>
);

export default ProductShow;