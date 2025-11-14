import React, { useState, useEffect } from 'react';
import { Star, X } from 'lucide-react';

const ReviewForm = ({
  productId,
  editingReview = null,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    rating: 0,
    title: '',
    comment: ''
  });
  const [errors, setErrors] = useState({});
  const [hoveredRating, setHoveredRating] = useState(0);

  // Populate form when editing
  useEffect(() => {
    if (editingReview) {
      setFormData({
        rating: editingReview.rating,
        title: editingReview.title,
        comment: editingReview.comment
      });
    }
  }, [editingReview]);

  const validateForm = () => {
    const newErrors = {};

    if (formData.rating === 0) {
      newErrors.rating = 'Te rugăm să dai o notă produsului';
    }

    if (!formData.title.trim()) {
      newErrors.title = 'Titlul este obligatoriu';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Titlul nu poate depăși 100 de caractere';
    }

    if (!formData.comment.trim()) {
      newErrors.comment = 'Comentariul este obligatoriu';
    } else if (formData.comment.length < 10) {
      newErrors.comment = 'Comentariul trebuie să aibă cel puțin 10 caractere';
    } else if (formData.comment.length > 1000) {
      newErrors.comment = 'Comentariul nu poate depăși 1000 de caractere';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = validateForm();
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      try {
        await onSubmit({
          productId,
          rating: formData.rating,
          title: formData.title.trim(),
          comment: formData.comment.trim()
        });

        // Reset form if not editing
        if (!editingReview) {
          setFormData({ rating: 0, title: '', comment: '' });
        }
      } catch (error) {
        console.error('Error submitting review:', error);
      }
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleRatingClick = (rating) => {
    handleInputChange('rating', rating);
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      const isFilled = starValue <= (hoveredRating || formData.rating);

      return (
        <button
          key={index}
          type="button"
          onClick={() => handleRatingClick(starValue)}
          onMouseEnter={() => setHoveredRating(starValue)}
          onMouseLeave={() => setHoveredRating(0)}
          className={`p-1 transition-colors ${
            isFilled ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'
          }`}
        >
          <Star className={`w-8 h-8 ${isFilled ? 'fill-current' : ''}`} />
        </button>
      );
    });
  };

  return (
    <div className="bg-white border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          {editingReview ? 'Editează recenzia' : 'Scrie o recenzie'}
        </h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nota ta *
          </label>
          <div className="flex items-center space-x-1 mb-2">
            {renderStars()}
            {formData.rating > 0 && (
              <span className="ml-2 text-sm text-gray-600">
                ({formData.rating}/5)
              </span>
            )}
          </div>
          {errors.rating && (
            <p className="text-red-600 text-sm">{errors.rating}</p>
          )}
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Titlu *
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Rezumă experiența ta cu acest produs"
            maxLength={100}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.title ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          <div className="flex justify-between mt-1">
            {errors.title && (
              <p className="text-red-600 text-sm">{errors.title}</p>
            )}
            <p className="text-xs text-gray-500 ml-auto">
              {formData.title.length}/100 caractere
            </p>
          </div>
        </div>

        {/* Comment */}
        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
            Comentariu *
          </label>
          <textarea
            id="comment"
            value={formData.comment}
            onChange={(e) => handleInputChange('comment', e.target.value)}
            placeholder="Descrie experiența ta cu acest produs. Ce îți place? Ce nu îți place? Pentru ce fel de utilizare îl recomanzi?"
            rows={6}
            maxLength={1000}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
              errors.comment ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          <div className="flex justify-between mt-1">
            {errors.comment && (
              <p className="text-red-600 text-sm">{errors.comment}</p>
            )}
            <p className="text-xs text-gray-500 ml-auto">
              {formData.comment.length}/1000 caractere
            </p>
          </div>
        </div>

        {/* Guidelines */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
          <h4 className="font-medium text-blue-900 mb-2">Ghid pentru recenzii utile:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Concentrează-te pe experiența ta cu produsul</li>
            <li>• Menționează aspectele pozitive și negative</li>
            <li>• Fii specific și obiectiv</li>
            <li>• Evită conținutul ofensator sau irelevant</li>
          </ul>
        </div>

        {/* Submit buttons */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            Anulează
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className={`px-6 py-2 bg-blue-600 text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isLoading
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Se salvează...' : editingReview ? 'Actualizează' : 'Publică recenzia'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReviewForm;