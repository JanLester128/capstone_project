import React from 'react';

const LoadingScreen = ({ 
  title = "Loading Application", 
  message = "Please wait while we verify your session...",
  type = "default" 
}) => {
  const getLoadingAnimation = () => {
    switch (type) {
      case 'validating':
        return (
          <div className="relative">
            <div className="animate-pulse rounded-full h-16 w-16 bg-blue-200 mx-auto mb-4"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-blue-600 animate-spin mx-auto"></div>
          </div>
        );
      case 'processing':
        return (
          <div className="relative">
            <div className="animate-bounce rounded-full h-16 w-16 bg-gradient-to-r from-blue-400 to-purple-500 mx-auto mb-4"></div>
          </div>
        );
      default:
        return (
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-blue-400 animate-ping mx-auto"></div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center max-w-md mx-auto px-6">
        {getLoadingAnimation()}
        <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
        <p className="text-gray-500">{message}</p>
        
        {/* Progress indicator */}
        <div className="mt-6 w-full bg-gray-200 rounded-full h-1">
          <div className="bg-blue-600 h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
