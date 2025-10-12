import React, { useState, useEffect } from 'react';
import { AuthManager } from '../../auth';

export default function AuthDebug() {
  const [authData, setAuthData] = useState({});
  const [rawData, setRawData] = useState({});

  useEffect(() => {
    // Get auth data from AuthManager
    const user = AuthManager.getUser();
    const token = AuthManager.getToken();
    const session = AuthManager.getSession();
    
    // Get raw localStorage data
    const rawUser = localStorage.getItem('auth_user');
    const rawToken = localStorage.getItem('auth_token');
    const rawSession = localStorage.getItem('auth_session');
    
    setAuthData({
      user,
      token: token ? token.substring(0, 20) + '...' : null,
      session,
      isAuthenticated: AuthManager.isAuthenticated()
    });
    
    setRawData({
      rawUser,
      rawToken: rawToken ? rawToken.substring(0, 20) + '...' : null,
      rawSession
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Authentication Debug</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* AuthManager Data */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">AuthManager Data</h2>
            <div className="space-y-2">
              <div>
                <strong>Is Authenticated:</strong> {authData.isAuthenticated ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>User Role:</strong> {authData.user?.role || 'N/A'}
              </div>
              <div>
                <strong>Is Coordinator:</strong> {authData.user?.is_coordinator ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>User ID:</strong> {authData.user?.id || 'N/A'}
              </div>
              <div>
                <strong>Email:</strong> {authData.user?.email || 'N/A'}
              </div>
              <div>
                <strong>Name:</strong> {authData.user?.firstname} {authData.user?.lastname}
              </div>
              <div>
                <strong>Token:</strong> {authData.token || 'N/A'}
              </div>
              <div>
                <strong>Session:</strong> {authData.session || 'N/A'}
              </div>
            </div>
          </div>
          
          {/* Raw localStorage Data */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Raw localStorage Data</h2>
            <div className="space-y-2">
              <div>
                <strong>Raw User:</strong>
                <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                  {rawData.rawUser || 'N/A'}
                </pre>
              </div>
              <div>
                <strong>Raw Token:</strong> {rawData.rawToken || 'N/A'}
              </div>
              <div>
                <strong>Raw Session:</strong> {rawData.rawSession || 'N/A'}
              </div>
            </div>
          </div>
          
          {/* Full User Object */}
          <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Full User Object</h2>
            <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(authData.user, null, 2)}
            </pre>
          </div>
          
          {/* Coordinator Check Logic */}
          <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Coordinator Check Logic</h2>
            <div className="space-y-2">
              <div>
                <strong>user.role === 'coordinator':</strong> {authData.user?.role === 'coordinator' ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>user.role === 'faculty':</strong> {authData.user?.role === 'faculty' ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>user.is_coordinator === true:</strong> {authData.user?.is_coordinator === true ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>Combined Check:</strong> {
                  (authData.user?.role === 'coordinator' || (authData.user?.role === 'faculty' && authData.user?.is_coordinator === true)) ? 'Yes' : 'No'
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
