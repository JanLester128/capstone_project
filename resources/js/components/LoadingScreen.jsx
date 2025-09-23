import React from 'react';

const LoadingScreen = ({ 
  title = "LOADING", 
  message = "Please wait...",
  type = "default" 
}) => {
  const getLoadingAnimation = () => {
    switch (type) {
      case 'validating':
        return (
          <div className="relative">
            <div className="animate-pulse rounded-full h-20 w-20 bg-blue-200 mx-auto mb-6"></div>
            <div className="absolute inset-0 rounded-full h-20 w-20 border-4 border-transparent border-t-blue-600 animate-spin mx-auto"></div>
          </div>
        );
      case 'processing':
        return (
          <div className="relative">
            <div className="animate-bounce rounded-full h-20 w-20 bg-gradient-to-r from-blue-400 to-purple-500 mx-auto mb-6"></div>
          </div>
        );
      default:
        return (
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
            <div className="absolute inset-0 rounded-full h-20 w-20 border-4 border-transparent border-t-blue-400 animate-ping mx-auto opacity-75"></div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100"></div>
      <div className="relative z-10 text-center max-w-md mx-auto px-6">
        {getLoadingAnimation()}
        <h3 className="text-2xl font-bold text-gray-800 mb-3">{title}</h3>
        <p className="text-gray-600 text-lg">{message}</p>
        
        {/* Progress indicator */}
        <div className="mt-8 w-full bg-gray-200 rounded-full h-2">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
        </div>
        
        {/* Additional visual elements */}
        <div className="mt-6 flex justify-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
