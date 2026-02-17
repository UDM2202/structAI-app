import React, { createContext, useState, useContext, useEffect } from 'react';

const LoadingContext = createContext();

export const LoadingProvider = ({ children }) => {
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [showLoading, setShowLoading] = useState(false);

  // Check if this is the first login of the session
  const triggerFirstLoginLoading = () => {
    const hasSeenLoading = sessionStorage.getItem('hasSeenLoading');
    
    if (!hasSeenLoading) {
      setShowLoading(true);
      setIsFirstLogin(true);
      sessionStorage.setItem('hasSeenLoading', 'true');
      
      // Auto-hide after animation completes
      setTimeout(() => {
        setShowLoading(false);
      }, 2800); // Matches animation duration
    }
  };

  return (
    <LoadingContext.Provider value={{ 
      showLoading, 
      isFirstLogin, 
      triggerFirstLoginLoading 
    }}>
      {children}
      {showLoading && <StructuralLoadingAnimation />}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => useContext(LoadingContext);