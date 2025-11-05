import React, { useState, useEffect, useCallback } from 'react';
import ReviewCard from './ReviewCard';
import ReviewForm from './ReviewForm';
import { useAuth } from '../AuthContext';
import { Star, Filter, ChevronDown, MessageSquare } from 'lucide-react';

const ReviewsList = ({ productId, onReviewUpdate }) => {
  const { isAuthenticated, getToken } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const sortOptions = [
    { value: 'newest', label: 'Cele mai noi' },
    { value: 'oldest', label: 'Cele mai vechi' },
    { value: 'highest', label: 'Nota cea mai mare' },
    { value: 'lowest', label: 'Nota cea mai mică' },
    { value: 'helpful', label: 'Cele mai utile' }
  ];

  const fetchReviews = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/reviews/product/${productId}?page=${currentPage}&sort=${sortBy}`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch reviews');

      const data = await response.json();
      setReviews(data.reviews);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError('Eroare la încărcarea recenziilor');
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [productId, currentPage, sortBy]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/reviews/stats/${productId}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, [productId]);

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, [productId, currentPage, sortBy, fetchReviews, fetchStats]);

  const handleSubmitReview = async (reviewData) => {
    if (!isAuthenticated()) {
      alert('Pentru a scrie o recenzie trebuie să fi autentificat');
      return;
    }

    setSubmitting(true);
    try {
      const token = getToken();
      const url = editingReview
        ? `/api/reviews/${editingReview._id}`
        : '/api/reviews';

      const response = await fetch(url, {
        method: editingReview ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(reviewData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error submitting review');
      }

      alert(editingReview ? 'Recenzia a fost actualizată cu succes!' : 'Recenzia a fost trimisă cu succes! Va fi publicată după aprobare.');

      setShowForm(false);
      setEditingReview(null);

      // Refresh reviews and stats
      await fetchReviews();
      await fetchStats();

      // Notify parent component to update rating
      if (onReviewUpdate) {
        onReviewUpdate();
      }

    } catch (err) {
      alert(err.message);
      console.error('Error submitting review:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleHelpfulVote = async (reviewId, helpful) => {
    if (!isAuthenticated()) {
      alert('Pentru a vota trebuie să fi autentificat');
      return;
    }

    try {
      const token = getToken();
      const response = await fetch(`/api/reviews/${reviewId}/helpful`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ helpful })
      });

      if (!response.ok) throw new Error('Failed to vote');

      // Update the review in the local state
      setReviews(prev => prev.map(review =>
        review._id === reviewId
          ? {
              ...review,
              helpfulVotes: helpful ? review.helpfulVotes + 1 : Math.max(0, review.helpfulVotes - 1),
              userVote: helpful
            }
          : review
      ));

    } catch (err) {
      console.error('Error voting:', err);
      alert('Eroare la votare');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Ești sigur că vrei să ștergi această recenzie?')) return;

    try {
      const token = getToken();
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete review');

      alert('Recenzia a fost ștearsă cu succes!');
      await fetchReviews();
      await fetchStats();

      // Notify parent component to update rating
      if (onReviewUpdate) {
        onReviewUpdate();
      }

    } catch (err) {
      console.error('Error deleting review:', err);
      alert('Eroare la ștergerea recenziei');
    }
  };

  const handleEditReview = (review) => {
    setEditingReview(review);
    setShowForm(true);
  };

  const handleFlagReview = async (reviewId) => {
    if (!window.confirm('Vrei să raportezi această recenzie ca fiind nepotrivită?')) return;

    // This would typically send a report to admin
    alert('Recenzia a fost raportată. Mulțumim!');
  };

  const renderRatingDistribution = () => {
    if (!stats || stats.totalReviews === 0) return null;

    return (
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">Distribuția notelor</h4>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map(rating => {
            const count = stats.ratingDistribution[rating] || 0;
            const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;

            return (
              <div key={rating} className="flex items-center space-x-3 text-sm">
                <span className="w-3 text-gray-600">{rating}</span>
                <Star className="w-3 h-3 text-yellow-400 fill-current" />
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-gray-600 w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSummary = () => {
    if (!stats || stats.totalReviews === 0) {
      return (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Acest produs nu are încă recenzii
          </h3>
          <p className="text-gray-600 mb-6">
            Fii primul care scrie o recenzie și ajută alți cumpărători!
          </p>
          {isAuthenticated() && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Scrie prima recenzie
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Overall rating */}
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start space-x-2 mb-2">
              <span className="text-4xl font-bold text-gray-900">{stats.averageRating}</span>
              <div>
                <div className="flex items-center">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star
                      key={index}
                      className={`w-5 h-5 ${
                        index < Math.round(stats.averageRating)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-600">
                  {stats.totalReviews} {stats.totalReviews === 1 ? 'recenzie' : 'recenzii'}
                </p>
              </div>
            </div>
          </div>

          {/* Rating distribution */}
          <div>
            {renderRatingDistribution()}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Se încarcă recenziile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => {
            setError(null);
            setLoading(true);
            fetchReviews();
          }}
          className="mt-4 text-blue-600 hover:text-blue-700"
        >
          Încearcă din nou
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderSummary()}

      {/* Write review button */}
      {isAuthenticated() && !showForm && stats && stats.totalReviews > 0 && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            Scrie o recenzie
          </button>
        </div>
      )}

      {/* Review form */}
      {showForm && (
        <ReviewForm
          productId={productId}
          editingReview={editingReview}
          onSubmit={handleSubmitReview}
          onCancel={() => {
            setShowForm(false);
            setEditingReview(null);
          }}
          isLoading={submitting}
        />
      )}

      {/* Reviews list */}
      {reviews.length > 0 && (
        <>
          {/* Sort controls */}
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Recenzii ({stats?.totalReviews || 0})
            </h3>

            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Filter className="w-4 h-4" />
                <span>{sortOptions.find(opt => opt.value === sortBy)?.label}</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showSortMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                  <div className="py-1">
                    {sortOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value);
                          setCurrentPage(1);
                          setShowSortMenu(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                          sortBy === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reviews */}
          <div className="space-y-6">
            {reviews.map(review => (
              <ReviewCard
                key={review._id}
                review={review}
                onHelpfulVote={handleHelpfulVote}
                onEdit={handleEditReview}
                onDelete={handleDeleteReview}
                onFlag={handleFlagReview}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 pt-6">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>

              <div className="flex space-x-1">
                {Array.from({ length: totalPages }, (_, index) => (
                  <button
                    key={index + 1}
                    onClick={() => setCurrentPage(index + 1)}
                    className={`px-3 py-2 border rounded-md ${
                      currentPage === index + 1
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Următor
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReviewsList;