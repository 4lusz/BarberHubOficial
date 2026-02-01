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
  const [needsPayment, setNeedsPayment] = useState(false);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
      
      if (response.data.role === 'barber') {
        if (response.data.barbershop_id) {
          const barbershopRes = await api.get('/barbershops/me');
          setBarbershop(barbershopRes.data);
          
          // CRITICAL: Only allow access if plan_status is 'active'
          const planStatus = barbershopRes.data?.plan_status;
          if (planStatus === 'active') {
            setNeedsPayment(false);
          } else {
            // pending, expired, cancelled, or any other status = needs payment
            setNeedsPayment(true);
          }
        } else {
          // No barbershop at all
          setNeedsPayment(true);
        }
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
    const { token, user: userData, needs_payment, plan_status } = response.data;
    
    localStorage.setItem('token', token);
    setUser(userData);
    
    // CRITICAL: Set needs_payment based on plan_status, not just presence of barbershop
    if (userData.role === 'barber') {
      if (userData.barbershop_id) {
        const barbershopRes = await api.get('/barbershops/me');
        setBarbershop(barbershopRes.data);
        
        // Only allow if plan_status is 'active'
        const actualStatus = barbershopRes.data?.plan_status || plan_status;
        setNeedsPayment(actualStatus !== 'active');
      } else {
        setNeedsPayment(true);
      }
    } else {
      setNeedsPayment(false);
    }
    
    return { user: userData, needs_payment, plan_status };
  };

  const register = async (data) => {
    const response = await api.post('/auth/register', data);
    const { token, user: userData, needs_payment } = response.data;
    
    localStorage.setItem('token', token);
    setUser(userData);
    setNeedsPayment(needs_payment || false);
    
    return { user: userData, needs_payment };
  };

  const loginWithGoogle = async (sessionId) => {
    const response = await api.post(`/auth/google-session?session_id=${sessionId}`);
    const { token, user: userData, needs_payment } = response.data;
    
    localStorage.setItem('token', token);
    setUser(userData);
    setNeedsPayment(needs_payment || false);
    
    if (userData.role === 'barber' && userData.barbershop_id) {
      const barbershopRes = await api.get('/barbershops/me');
      setBarbershop(barbershopRes.data);
    }
    
    return { user: userData, needs_payment };
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
    setNeedsPayment(false);
  };

  const updateBarbershop = (data) => {
    setBarbershop(data);
    setNeedsPayment(false);
  };

  const value = {
    user,
    loading,
    barbershop,
    needsPayment,
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
