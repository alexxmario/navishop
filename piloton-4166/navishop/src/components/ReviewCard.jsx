import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { Star, ThumbsUp, ThumbsDown, MoreVertical, Flag, Edit, Trash2 } from 'lucide-react';

const ReviewCard = ({
  review,
  onHelpfulVote,
  onEdit,
  onDelete,
  onFlag,
  showActions = true,
  compact = false
}) => {
  const { user, isAuthenticated } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const handleVote = async (helpful) => {
    if (!isAuthenticated() || isVoting) return;

    setIsVoting(true);
    try {
      await onHelpfulVote(review._id, helpful);
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setIsVoting(false);
    }
  };

  const isOwnReview = user && review.userId === user._id;
  const canEdit = isOwnReview && review.status !== 'rejected';

  return (
    <div className={`bg-white border border-gray-200 p-6 ${compact ? 'p-4' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
            {review.userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{review.userName}</h4>
            <p className="text-sm text-gray-500">{formatDate(review.createdAt)}</p>
          </div>
        </div>

        {showActions && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                <div className="py-1">
                  {canEdit && (
                    <>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onEdit(review);
                        }}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editează
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onDelete(review._id);
                        }}
                        className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Șterge
                      </button>
                    </>
                  )}
                  {!isOwnReview && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onFlag(review._id);
                      }}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      <Flag className="w-4 h-4 mr-2" />
                      Raportează
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rating and Title */}
      <div className="mb-3">
        <div className="flex items-center space-x-2 mb-2">
          <div className="flex">{renderStars(review.rating)}</div>
          <span className="text-sm text-gray-600">({review.rating}/5)</span>
          {review.verified && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              Achiziție verificată
            </span>
          )}
        </div>
        <h3 className="font-semibold text-gray-900 text-lg">{review.title}</h3>
      </div>

      {/* Comment */}
      <div className="mb-4">
        <p className="text-gray-700 leading-relaxed">{review.comment}</p>
      </div>

      {/* Status indicator for own reviews */}
      {isOwnReview && review.status !== 'approved' && (
        <div className="mb-4">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            review.status === 'pending'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {review.status === 'pending' ? 'În așteptare' : 'Respins'}
          </span>
        </div>
      )}

      {/* Images (if any) */}
      {review.images && review.images.length > 0 && (
        <div className="mb-4 flex space-x-2">
          {review.images.map((image, index) => (
            <img
              key={index}
              src={image.url}
              alt={image.alt || 'Review image'}
              className="w-20 h-20 object-cover rounded-md border border-gray-200"
            />
          ))}
        </div>
      )}

      {/* Helpful votes */}
      {showActions && isAuthenticated() && !isOwnReview && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleVote(true)}
              disabled={isVoting}
              className={`flex items-center space-x-1 text-sm ${
                review.userVote === true
                  ? 'text-green-600'
                  : 'text-gray-500 hover:text-green-600'
              } disabled:opacity-50`}
            >
              <ThumbsUp className="w-4 h-4" />
              <span>Util</span>
            </button>

            <button
              onClick={() => handleVote(false)}
              disabled={isVoting}
              className={`flex items-center space-x-1 text-sm ${
                review.userVote === false
                  ? 'text-red-600'
                  : 'text-gray-500 hover:text-red-600'
              } disabled:opacity-50`}
            >
              <ThumbsDown className="w-4 h-4" />
              <span>Nu e util</span>
            </button>
          </div>

          {review.helpfulVotes > 0 && (
            <span className="text-sm text-gray-500">
              {review.helpfulVotes} {review.helpfulVotes === 1 ? 'persoană' : 'persoane'} consideră util
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ReviewCard;