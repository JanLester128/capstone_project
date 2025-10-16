import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import Sidebar from '../layouts/Sidebar';
import { FaUser, FaEnvelope, FaUserTag, FaEdit, FaSave, FaTimes } from 'react-icons/fa';

export default function RegistrarProfile({ user }) {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        firstname: user?.firstname || '',
        lastname: user?.lastname || '',
        email: user?.email || '',
    });
    const [loading, setLoading] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        try {
            const saved = localStorage.getItem('registrar-sidebar-collapsed');
            return saved ? JSON.parse(saved) : false;
        } catch (error) {
            return false;
        }
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/registrar/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok) {
                setIsEditing(false);
                // You could show a success message here
                window.location.reload();
            } else {
                console.error('Failed to update profile:', result);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            firstname: user?.firstname || '',
            lastname: user?.lastname || '',
            email: user?.email || '',
        });
        setIsEditing(false);
    };

    const handleSidebarToggle = (collapsed) => {
        setSidebarCollapsed(collapsed);
    };

    return (
        <>
            <Head title="Profile - ONSTS" />
            <div className="flex min-h-screen bg-gray-50">
                <Sidebar onToggle={handleSidebarToggle} />
                <div className={`flex-1 transition-all duration-300 ${
                    sidebarCollapsed ? 'ml-16' : 'ml-64'
                }`}>
                    <div className="p-8">
                        {/* Header */}
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
                            <p className="text-gray-600">Manage your account information</p>
                        </div>

                        {/* Profile Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-gray-900">Account Information</h2>
                                {!isEditing ? (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        <FaEdit className="w-4 h-4" />
                                        Edit Profile
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSubmit}
                                            disabled={loading}
                                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                        >
                                            <FaSave className="w-4 h-4" />
                                            {loading ? 'Saving...' : 'Save'}
                                        </button>
                                        <button
                                            onClick={handleCancel}
                                            className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                                        >
                                            <FaTimes className="w-4 h-4" />
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* First Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <FaUser className="inline w-4 h-4 mr-2" />
                                        First Name
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={formData.firstname}
                                            onChange={(e) => setFormData({...formData, firstname: e.target.value})}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    ) : (
                                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                            {user?.firstname || 'Not set'}
                                        </div>
                                    )}
                                </div>

                                {/* Last Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <FaUser className="inline w-4 h-4 mr-2" />
                                        Last Name
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={formData.lastname}
                                            onChange={(e) => setFormData({...formData, lastname: e.target.value})}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    ) : (
                                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                            {user?.lastname || 'Not set'}
                                        </div>
                                    )}
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <FaEnvelope className="inline w-4 h-4 mr-2" />
                                        Email Address
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    ) : (
                                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                            {user?.email || 'Not set'}
                                        </div>
                                    )}
                                </div>

                                {/* Role (Read-only) */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <FaUserTag className="inline w-4 h-4 mr-2" />
                                        Role
                                    </label>
                                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                                            {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Not set'}
                                        </span>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Additional Information */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl mt-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Details</h3>
                            <div className="space-y-4 text-sm text-gray-600">
                                <div className="flex justify-between">
                                    <span>Account ID:</span>
                                    <span className="font-mono">{user?.id}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Account Created:</span>
                                    <span>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Last Updated:</span>
                                    <span>{user?.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'Unknown'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
