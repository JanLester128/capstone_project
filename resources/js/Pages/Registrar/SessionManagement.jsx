import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import Sidebar from '../layouts/Sidebar';
import Swal from 'sweetalert2';
import { 
    FaUsers, 
    FaDesktop, 
    FaMobile, 
    FaTabletAlt,
    FaChrome,
    FaFirefox,
    FaSafari,
    FaEdge,
    FaSignOutAlt,
    FaSyncAlt,
    FaExclamationTriangle,
    FaClock,
    FaMapMarkerAlt,
    FaSpinner
} from 'react-icons/fa';

export default function SessionManagement({ auth }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        try {
            const saved = localStorage.getItem('registrar-sidebar-collapsed');
            return saved ? JSON.parse(saved) : false;
        } catch (error) {
            return false;
        }
    });
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Fetch active sessions
    const fetchActiveSessions = async () => {
        try {
            const response = await fetch('/auth/active-sessions', {
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                }
            });

            if (response.ok) {
                const data = await response.json();
                setSessions(data.active_sessions || []);
            } else {
                console.error('Failed to fetch sessions');
            }
        } catch (error) {
            console.error('Error fetching sessions:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchActiveSessions();
        
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchActiveSessions, 30000);
        return () => clearInterval(interval);
    }, []);

    // Force logout user
    const handleForceLogout = async (userId, userName) => {
        const result = await Swal.fire({
            title: 'Force Logout User',
            html: `
                <div class="text-left">
                    <p class="mb-2">Are you sure you want to force logout <strong>${userName}</strong>?</p>
                    <p class="text-sm text-gray-600">This will terminate all active sessions for this user.</p>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Force Logout',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch('/auth/force-logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                    },
                    body: JSON.stringify({ user_id: userId })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    await Swal.fire({
                        icon: 'success',
                        title: 'User Logged Out',
                        text: data.message,
                        timer: 3000
                    });
                    
                    // Refresh sessions list
                    fetchActiveSessions();
                } else {
                    throw new Error(data.message || 'Failed to force logout');
                }
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.message || 'Failed to force logout user'
                });
            }
        }
    };

    // Get device icon
    const getDeviceIcon = (deviceInfo) => {
        if (!deviceInfo) return FaDesktop;
        const device = deviceInfo.toLowerCase();
        if (device.includes('mobile')) return FaMobile;
        if (device.includes('tablet')) return FaTabletAlt;
        return FaDesktop;
    };

    // Get browser icon
    const getBrowserIcon = (browserInfo) => {
        if (!browserInfo) return FaChrome;
        const browser = browserInfo.toLowerCase();
        if (browser.includes('chrome')) return FaChrome;
        if (browser.includes('firefox')) return FaFirefox;
        if (browser.includes('safari')) return FaSafari;
        if (browser.includes('edge')) return FaEdge;
        return FaChrome;
    };

    // Format time ago
    const timeAgo = (dateString) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}d ago`;
    };

    // Get role color
    const getRoleColor = (role) => {
        switch (role) {
            case 'registrar': return 'bg-purple-100 text-purple-800';
            case 'faculty': return 'bg-blue-100 text-blue-800';
            case 'coordinator': return 'bg-green-100 text-green-800';
            case 'student': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Handle sidebar toggle
    const handleSidebarToggle = (collapsed) => {
        setSidebarCollapsed(collapsed);
        try {
            localStorage.setItem('registrar-sidebar-collapsed', JSON.stringify(collapsed));
        } catch (error) {
            console.error('Failed to save sidebar state:', error);
        }
    };

    return (
        <>
            <Head title="Session Management" />
            
            <div className="min-h-screen bg-gray-50 flex">
                <Sidebar onToggle={handleSidebarToggle} />
                
                {/* Main Content */}
                <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                    {/* Header */}
                    <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Session Management</h1>
                                <p className="text-sm text-gray-600 mt-1">
                                    Monitor and manage active user sessions
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-sm font-medium text-gray-900">
                                        {sessions.length} Active Sessions
                                    </p>
                                    <p className="text-xs text-gray-500">Currently online</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setRefreshing(true);
                                        fetchActiveSessions();
                                    }}
                                    disabled={refreshing}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    <FaSyncAlt className={`text-sm ${refreshing ? 'animate-spin' : ''}`} />
                                    Refresh
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <FaSpinner className="animate-spin text-blue-500 text-2xl mr-3" />
                                <span className="text-gray-600">Loading active sessions...</span>
                            </div>
                        ) : sessions.length === 0 ? (
                            <div className="text-center py-12">
                                <FaUsers className="mx-auto text-gray-300 text-5xl mb-4" />
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Sessions</h3>
                                <p className="text-gray-600">There are currently no active user sessions.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                {sessions.map((session) => {
                                    const DeviceIcon = getDeviceIcon(session.device_info);
                                    const BrowserIcon = getBrowserIcon(session.browser_info);
                                    
                                    return (
                                        <div key={session.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
                                            {/* User Info */}
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                                                        {session.user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900">{session.user.name}</h3>
                                                        <p className="text-sm text-gray-500">{session.user.email}</p>
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(session.user.role)}`}>
                                                    {session.user.role}
                                                </span>
                                            </div>

                                            {/* Session Details */}
                                            <div className="space-y-3 mb-4">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <DeviceIcon className="text-gray-400" />
                                                    <span>{session.device_info || 'Unknown Device'}</span>
                                                </div>
                                                
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <BrowserIcon className="text-gray-400" />
                                                    <span>{session.browser_info || 'Unknown Browser'}</span>
                                                </div>
                                                
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <FaMapMarkerAlt className="text-gray-400" />
                                                    <span>{session.ip_address || 'Unknown IP'}</span>
                                                </div>
                                                
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <FaClock className="text-gray-400" />
                                                    <span>Active {timeAgo(session.last_activity)}</span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="pt-4 border-t border-gray-100">
                                                <button
                                                    onClick={() => handleForceLogout(session.user.id, session.user.name)}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                                                >
                                                    <FaSignOutAlt />
                                                    Force Logout
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Info Panel */}
                        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
                            <div className="flex items-start gap-3">
                                <FaExclamationTriangle className="text-blue-600 mt-1 flex-shrink-0" />
                                <div>
                                    <h4 className="font-semibold text-blue-900 mb-2">Session Management Information</h4>
                                    <ul className="text-sm text-blue-800 space-y-1">
                                        <li>• Each user can only have one active session at a time</li>
                                        <li>• Sessions automatically expire after 24 hours or 30 minutes of inactivity</li>
                                        <li>• Force logout will terminate all active sessions for the selected user</li>
                                        <li>• Session data is automatically cleaned up periodically</li>
                                        <li>• Users will be redirected to login if their session becomes invalid</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
