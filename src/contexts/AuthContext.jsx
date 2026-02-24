import React, { createContext, useState, useContext, useEffect } from 'react';

// TEMPORARY MOCK DATA - REMOVE WHEN BACKEND IS READY
const MOCK_USER = {
  id: "mock-user-1",
  name: "John Engineer",
  email: "john@example.com",
  profession: "structural_engineer",
  avatar: null
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // CHANGE THIS LINE: Start with null instead of MOCK_USER
  const [user, setUser] = useState(null); // UPDATED: Start logged out
  const [profile, setProfile] = useState(null); // UPDATED: Start logged out
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if user is already logged in on mount
  useEffect(() => {
    // In mock mode, we don't auto-login
    console.log('Auth initialized - starting logged out');
  }, []);

  const fetchProfile = async () => {
    return MOCK_USER;
  };

  const login = async (credentials, rememberMe) => {
    console.log('Mock login:', credentials);
    setLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setUser(MOCK_USER);
    setProfile(MOCK_USER);
    setLoading(false);
    return { success: true };
  };

  const register = async (userData) => {
    console.log('Mock register:', userData);
    setLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setUser(MOCK_USER);
    setProfile(MOCK_USER);
    setLoading(false);
    return { success: true };
  };

  const logout = async () => {
    console.log('Mock logout');
    setLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  const forgotPassword = async (email) => {
    console.log('Mock forgot password:', email);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true };
  };

  const resetPassword = async (token, newPassword) => {
    console.log('Mock reset password');
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true };
  };

  const updateProfile = async (profileData) => {
    console.log('Mock update profile:', profileData);
    setLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const updatedProfile = { ...MOCK_USER, ...profileData };
    setProfile(updatedProfile);
    setUser(updatedProfile);
    setLoading(false);
    return { success: true };
  };

  const value = {
    user,
    profile,
    loading,
    error,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    fetchProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};