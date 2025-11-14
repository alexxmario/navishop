import React, { createContext, useContext, useState, useEffect } from 'react';

const RecentlyViewedContext = createContext();

export const useRecentlyViewed = () => {
  const context = useContext(RecentlyViewedContext);
  if (!context) {
    throw new Error('useRecentlyViewed must be used within a RecentlyViewedProvider');
  }
  return context;
};

export const RecentlyViewedProvider = ({ children }) => {
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  useEffect(() => {
    // Load recently viewed products from localStorage on mount
    const saved = localStorage.getItem('recentlyViewed');
    if (saved) {
      try {
        setRecentlyViewed(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading recently viewed products:', error);
      }
    }
  }, []);

  const addToRecentlyViewed = (product) => {
    if (!product || !product._id) return;

    setRecentlyViewed(prev => {
      // Remove if already exists
      const filtered = prev.filter(item => item._id !== product._id);
      
      // Add to beginning of array
      const updated = [product, ...filtered];
      
      // Keep only last 10 items
      const limited = updated.slice(0, 10);
      
      // Save to localStorage
      localStorage.setItem('recentlyViewed', JSON.stringify(limited));
      
      return limited;
    });
  };

  const clearRecentlyViewed = () => {
    setRecentlyViewed([]);
    localStorage.removeItem('recentlyViewed');
  };

  const value = {
    recentlyViewed,
    addToRecentlyViewed,
    clearRecentlyViewed
  };

  return (
    <RecentlyViewedContext.Provider value={value}>
      {children}
    </RecentlyViewedContext.Provider>
  );
};

export default RecentlyViewedContext;