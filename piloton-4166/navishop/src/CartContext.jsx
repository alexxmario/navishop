import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from './services/api';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCart();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCart = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (token) {
        // User is authenticated - try to load from server
        try {
          const cart = await apiService.getCart();
          const serverItems = cart.items || [];
          
          // Merge with localStorage cart if it exists
          const localCart = JSON.parse(localStorage.getItem('localCart') || '[]');
          const mergedCart = mergeCartItems(serverItems, localCart);
          
          // If there were local items, sync them to server
          if (localCart.length > 0) {
            await syncLocalCartToServer(localCart);
            localStorage.removeItem('localCart'); // Clear local cart after sync
          }
          
          setCartItems(mergedCart);
        } catch (error) {
          console.error('Failed to load server cart:', error);
          // Fall back to localStorage
          const localCart = JSON.parse(localStorage.getItem('localCart') || '[]');
          setCartItems(localCart);
        }
      } else {
        // User not authenticated - load from localStorage
        const localCart = JSON.parse(localStorage.getItem('localCart') || '[]');
        setCartItems(localCart);
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  const mergeCartItems = (serverItems, localItems) => {
    const merged = [...serverItems];
    
    localItems.forEach(localItem => {
      const existingIndex = merged.findIndex(item => 
        (item.productId || item._id) === localItem.productId
      );
      
      if (existingIndex > -1) {
        // Item exists in server cart, add quantities
        merged[existingIndex].quantity += localItem.quantity;
      } else {
        // Item doesn't exist in server cart, add it
        merged.push(localItem);
      }
    });
    
    return merged;
  };

  const syncLocalCartToServer = async (localItems) => {
    try {
      for (const item of localItems) {
        await apiService.addToCart(item);
      }
    } catch (error) {
      console.error('Failed to sync local cart to server:', error);
    }
  };

  const getCartItemsCount = () => {
    const count = cartItems.reduce((total, item) => total + item.quantity, 0);
    console.log('Cart items count:', count, 'cartItems:', cartItems);
    return count;
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const addToCart = async (product) => {
    try {
      setLoading(true);
      console.log('Adding product to cart:', product);
      
      const cartData = {
        productId: product._id || product.id,
        name: product.name,
        price: product.price,
        quantity: product.quantity || 1,
        slug: product.slug,
        images: product.images || [],
        image: product.images?.[0]?.url || product.images?.[0] || null
      };
      
      console.log('Cart data being sent:', cartData);
      
      // Check if user is authenticated
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (token) {
        // User is authenticated - save to server
        try {
          const updatedCart = await apiService.addToCart(cartData);
          console.log('Cart updated successfully:', updatedCart);
          setCartItems(updatedCart.items || []);
          return updatedCart;
        } catch (serverError) {
          // If server fails, fall back to localStorage
          console.warn('Server cart failed, using localStorage:', serverError);
          addToLocalStorageCart(cartData);
        }
      } else {
        // User not authenticated - save to localStorage
        addToLocalStorageCart(cartData);
      }
      
    } catch (error) {
      console.error('Failed to add to cart:', error);
      // Always fall back to localStorage if everything else fails
      const fallbackData = {
        productId: product._id || product.id,
        name: product.name,
        price: product.price,
        quantity: product.quantity || 1,
        slug: product.slug,
        images: product.images || [],
        image: product.images?.[0]?.url || product.images?.[0] || null
      };
      addToLocalStorageCart(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  const addToLocalStorageCart = (cartData) => {
    try {
      const existingCart = JSON.parse(localStorage.getItem('localCart') || '[]');
      const existingItemIndex = existingCart.findIndex(item => item.productId === cartData.productId);
      
      if (existingItemIndex > -1) {
        existingCart[existingItemIndex].quantity += cartData.quantity;
      } else {
        existingCart.push(cartData);
      }
      
      localStorage.setItem('localCart', JSON.stringify(existingCart));
      setCartItems(existingCart);
      console.log('Added to localStorage cart:', existingCart);
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  };

  const updateQuantity = async (productId, newQuantity) => {
    if (newQuantity < 1) return;
    
    try {
      setLoading(true);
      console.log('Updating cart item:', productId, 'to quantity:', newQuantity);
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (token) {
        // User authenticated - update on server
        try {
          const updatedCart = await apiService.updateCartItem(productId, newQuantity);
          setCartItems(updatedCart.items || []);
          return updatedCart;
        } catch (error) {
          console.warn('Server update failed, updating localStorage:', error);
          updateLocalStorageQuantity(productId, newQuantity);
        }
      } else {
        // User not authenticated - update localStorage
        updateLocalStorageQuantity(productId, newQuantity);
      }
    } catch (error) {
      console.error('Failed to update cart:', error);
      updateLocalStorageQuantity(productId, newQuantity);
    } finally {
      setLoading(false);
    }
  };

  const updateLocalStorageQuantity = (productId, newQuantity) => {
    try {
      const localCart = JSON.parse(localStorage.getItem('localCart') || '[]');
      const itemIndex = localCart.findIndex(item => item.productId === productId);
      
      if (itemIndex > -1) {
        localCart[itemIndex].quantity = newQuantity;
        localStorage.setItem('localCart', JSON.stringify(localCart));
        setCartItems(localCart);
      }
    } catch (error) {
      console.error('Failed to update localStorage cart:', error);
    }
  };

  const removeFromCart = async (productId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (token) {
        // User authenticated - remove from server
        try {
          const updatedCart = await apiService.removeFromCart(productId);
          setCartItems(updatedCart.items || []);
          return updatedCart;
        } catch (error) {
          console.warn('Server removal failed, removing from localStorage:', error);
          removeFromLocalStorage(productId);
        }
      } else {
        // User not authenticated - remove from localStorage
        removeFromLocalStorage(productId);
      }
    } catch (error) {
      console.error('Failed to remove from cart:', error);
      removeFromLocalStorage(productId);
    } finally {
      setLoading(false);
    }
  };

  const removeFromLocalStorage = (productId) => {
    try {
      const localCart = JSON.parse(localStorage.getItem('localCart') || '[]');
      const filteredCart = localCart.filter(item => item.productId !== productId);
      localStorage.setItem('localCart', JSON.stringify(filteredCart));
      setCartItems(filteredCart);
    } catch (error) {
      console.error('Failed to remove from localStorage cart:', error);
    }
  };

  const clearCart = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (token) {
        // User authenticated - clear server cart
        try {
          await apiService.clearCart();
        } catch (error) {
          console.warn('Failed to clear server cart:', error);
        }
      }
      
      // Always clear localStorage cart
      localStorage.removeItem('localCart');
      setCartItems([]);
    } catch (error) {
      console.error('Failed to clear cart:', error);
      // Still try to clear localStorage
      localStorage.removeItem('localCart');
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    cartItems,
    loading,
    getCartItemsCount,
    getCartTotal,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    loadCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};