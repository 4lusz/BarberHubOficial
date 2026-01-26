import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [barbershop, setBarbershop] = useState(null);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
      
      if (response.data.role === 'barber' && response.data.barbershop_id) {
        const barbershopRes = await api.get('/barbershops/me');
        setBarbershop(barbershopRes.data);
      }
    } catch (error) {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user: userData } = response.data;
    
    localStorage.setItem('token', token);
    setUser(userData);
    
    if (userData.role === 'barber' && userData.barbershop_id) {
      const barbershopRes = await api.get('/barbershops/me');
      setBarbershop(barbershopRes.data);
    }
    
    return userData;
  };

  const register = async (data) => {
    const response = await api.post('/auth/register', data);
    const { token, user: userData, barbershop: barbershopData } = response.data;
    
    localStorage.setItem('token', token);
    setUser(userData);
    if (barbershopData) {
      setBarbershop(barbershopData);
    }
    
    return userData;
  };

  const loginWithGoogle = async (sessionId) => {
    const response = await api.post(`/auth/google-session?session_id=${sessionId}`);
    const { token, user: userData } = response.data;
    
    localStorage.setItem('token', token);
    setUser(userData);
    
    if (userData.role === 'barber' && userData.barbershop_id) {
      const barbershopRes = await api.get('/barbershops/me');
      setBarbershop(barbershopRes.data);
    }
    
    return userData;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Ignore errors
    }
    localStorage.removeItem('token');
    setUser(null);
    setBarbershop(null);
  };

  const updateBarbershop = (data) => {
    setBarbershop(data);
  };

  const value = {
    user,
    loading,
    barbershop,
    login,
    register,
    loginWithGoogle,
    logout,
    checkAuth,
    updateBarbershop,
    isAuthenticated: !!user,
    isBarber: user?.role === 'barber',
    isClient: user?.role === 'client',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
