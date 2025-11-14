const apiUrl = 'http://localhost:5001/api';

const authProvider = {
  // called when the user attempts to log in
  login: ({ username, password }) => {
    const request = new Request(`${apiUrl}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: username, password }),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    });
    
    return fetch(request)
      .then(response => {
        if (response.status < 200 || response.status >= 300) {
          throw new Error(response.statusText);
        }
        return response.json();
      })
      .then(({ token, user }) => {
        // Check if user has admin role
        if (user.role !== 'admin') {
          throw new Error('Access denied. Admin privileges required.');
        }
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        return Promise.resolve();
      })
      .catch(error => {
        throw new Error(error.message || 'Network error');
      });
  },
  
  // called when the user clicks on the logout button
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return Promise.resolve();
  },
  
  // called when the API returns an error
  checkError: ({ status }) => {
    if (status === 401 || status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return Promise.reject();
    }
    return Promise.resolve();
  },
  
  // called when the user navigates to a new location, to check for authentication
  checkAuth: () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
      return Promise.reject();
    }
    
    try {
      const userData = JSON.parse(user);
      if (userData.role !== 'admin') {
        return Promise.reject();
      }
    } catch (e) {
      return Promise.reject();
    }
    
    return Promise.resolve();
  },
  
  // called when the user navigates to a new location, to check for permissions / roles
  getPermissions: () => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        return Promise.resolve(userData.role);
      } catch (e) {
        return Promise.reject();
      }
    }
    return Promise.reject();
  },
  
  // Get user identity for display
  getIdentity: () => {
    try {
      const user = localStorage.getItem('user');
      if (user) {
        const userData = JSON.parse(user);
        return Promise.resolve({
          id: userData._id,
          fullName: userData.name,
          avatar: userData.avatar,
        });
      }
    } catch (error) {
      // Handle parsing error
    }
    return Promise.reject('No identity');
  },
};

export default authProvider;