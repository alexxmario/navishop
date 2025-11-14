import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check localStorage first (persistent login)
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    } else {
      // Check sessionStorage (session login)
      const sessionToken = sessionStorage.getItem('token');
      const sessionUser = sessionStorage.getItem('user');
      
      if (sessionToken && sessionUser) {
        setToken(sessionToken);
        setUser(JSON.parse(sessionUser));
      }
    }
    setIsLoading(false);
  }, []);

  const login = (userData, userToken, rememberMe = false) => {
    setUser(userData);
    setToken(userToken);
    
    if (rememberMe) {
      // Persistent login - use localStorage
      localStorage.setItem('token', userToken);
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      // Session login - use sessionStorage
      sessionStorage.setItem('token', userToken);
      sessionStorage.setItem('user', JSON.stringify(userData));
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    // Clear both storages
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  };

  const isAuthenticated = () => {
    return !!token && !!user;
  };

  const getToken = () => {
    return token;
  };

  const value = {
    user,
    token,
    isLoading,
    login,
    logout,
    isAuthenticated,
    getToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;