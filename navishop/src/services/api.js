import { API_BASE_URL } from '../config/env';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    console.log('Making API request:', {
      url,
      method: config.method || 'GET',
      headers: config.headers,
      body: config.body
    });

    try {
      const response = await fetch(url, config);
      
      console.log('API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error response:', errorData);
        
        // Handle token expiration
        if (response.status === 401 && errorData.code === 'TOKEN_EXPIRED') {
          console.warn('Token expired, clearing stored token');
          this.clearAuthToken();
          // Optionally redirect to login or show login modal
          window.dispatchEvent(new CustomEvent('token-expired'));
        }
        
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('API response data:', responseData);
      return responseData;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Product methods
  async getProducts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/products${queryString ? `?${queryString}` : ''}`;
    return this.request(endpoint);
  }

  async getFeaturedProducts() {
    return this.request('/products/featured');
  }

  async getProductBySlug(slug) {
    return this.request(`/products/${slug}`);
  }

  async getCategories() {
    return this.request('/products/categories');
  }

  async searchProducts(query) {
    return this.request(`/products/search/suggestions?q=${encodeURIComponent(query)}`);
  }

  async getProductReviews(productId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/products/${productId}/reviews${queryString ? `?${queryString}` : ''}`;
    return this.request(endpoint);
  }

  // Cart methods
  async getCart() {
    return this.request('/cart', {
      headers: this.getAuthHeaders()
    });
  }

  async addToCart(productData) {
    console.log('API addToCart called with:', productData);
    console.log('Auth headers:', this.getAuthHeaders());
    return this.request('/cart/add', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: productData
    });
  }

  async updateCartItem(productId, quantity) {
    return this.request(`/cart/update/${productId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: { quantity }
    });
  }

  async removeFromCart(productId) {
    return this.request(`/cart/remove/${productId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
  }

  async clearCart() {
    return this.request('/cart/clear', {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
  }

  // Auth methods
  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: credentials
    });
  }

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: userData
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me', {
      headers: this.getAuthHeaders()
    });
  }

  // Guest Order methods
  async createGuestOrder(orderData) {
    return this.request('/guest-orders', {
      method: 'POST',
      body: orderData
    });
  }

  async trackGuestOrder(orderNumber, email) {
    return this.request('/guest-orders/track', {
      method: 'POST',
      body: { orderNumber, email }
    });
  }

  async getGuestOrder(orderNumber, email) {
    return this.request(`/guest-orders/${orderNumber}?email=${encodeURIComponent(email)}`);
  }

  // Order methods (for authenticated users)
  async getUserOrders() {
    return this.request('/orders', {
      headers: this.getAuthHeaders()
    });
  }

  async createUserOrder(orderData) {
    return this.request('/orders', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: orderData
    });
  }

  async getUserOrder(orderId) {
    return this.request(`/orders/${orderId}`, {
      headers: this.getAuthHeaders()
    });
  }

  // Shipping methods
  async getShippingQuote(shippingData) {
    return this.request('/shipping/quote', {
      method: 'POST',
      body: shippingData
    });
  }

  async trackShipment(awbNumber) {
    return this.request(`/shipping/track/${awbNumber}`);
  }

  async createShippingLabel(orderId) {
    return this.request(`/orders/${orderId}/ship`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
  }

  async trackOrder(orderId) {
    return this.request(`/orders/${orderId}/track`, {
      headers: this.getAuthHeaders()
    });
  }

  // Test methods for FAN Courier integration
  async testFanCourierIntegration(testData = {}) {
    return this.request('/fan-courier-test/complete-test', {
      method: 'POST',
      body: testData
    });
  }

  async createTestAWB(awbData) {
    return this.request('/fan-courier-test/create-awb', {
      method: 'POST',
      body: awbData
    });
  }

  async trackTestAWB(awbNumber) {
    return this.request(`/fan-courier-test/track/${awbNumber}`);
  }

  // Helper methods
  getAuthHeaders() {
    // Check both localStorage and sessionStorage for token
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    console.log('Auth token found:', !!token);
    return token ? { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    } : { 'Content-Type': 'application/json' };
  }

  setAuthToken(token) {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
    }
  }

  clearAuthToken() {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
  }
}

const apiServiceInstance = new ApiService();
export default apiServiceInstance;
