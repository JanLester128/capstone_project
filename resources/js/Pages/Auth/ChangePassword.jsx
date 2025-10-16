import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { FaLock, FaEye, FaEyeSlash, FaKey, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import Swal from 'sweetalert2';

export default function ChangePassword({ userType = 'faculty' }) {
    const { data, setData, post, processing, errors, clearErrors } = useForm({
        new_password: '',
        new_password_confirmation: ''
    });

    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);

    const checkPasswordStrength = (password) => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        return strength;
    };

    const handlePasswordChange = (value) => {
        setData('new_password', value);
        setPasswordStrength(checkPasswordStrength(value));
    };

    const getPasswordStrengthText = () => {
        switch (passwordStrength) {
            case 0:
            case 1:
                return 'Very Weak';
            case 2:
                return 'Weak';
            case 3:
                return 'Fair';
            case 4:
                return 'Good';
            case 5:
                return 'Strong';
            default:
                return '';
        }
    };

    const getPasswordStrengthColor = () => {
        switch (passwordStrength) {
            case 0:
            case 1:
                return 'bg-red-500';
            case 2:
                return 'bg-orange-500';
            case 3:
                return 'bg-yellow-500';
            case 4:
                return 'bg-blue-500';
            case 5:
                return 'bg-green-500';
            default:
                return 'bg-gray-300';
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        clearErrors();

        if (data.new_password !== data.new_password_confirmation) {
            Swal.fire({
                title: 'Password Mismatch',
                text: 'New password and confirmation do not match.',
                icon: 'error'
            });
            return;
        }

        if (passwordStrength < 3) {
            Swal.fire({
                title: 'Weak Password',
                text: 'Please choose a stronger password with at least 8 characters, including uppercase, lowercase, numbers, and special characters.',
                icon: 'warning'
            });
            return;
        }

        post('/auth/change-password', {
            preserveScroll: true,
            onSuccess: () => {
                Swal.fire({
                    title: 'Password Changed Successfully!',
                    text: 'Your password has been updated. You will be redirected to your dashboard.',
                    icon: 'success',
                    timer: 3000,
                    showConfirmButton: false
                }).then(() => {
                    // Redirect to appropriate dashboard based on user type
                    const dashboardUrl = userType === 'student' ? '/student/dashboard' : 
                                       userType === 'registrar' ? '/registrar/dashboard' : 
                                       '/faculty/dashboard';
                    router.visit(dashboardUrl);
                });
            },
            onError: (errors) => {
                console.error('Password change errors:', errors);
                
                // Format validation errors for display
                let errorMessage = '';
                let hasErrors = false;
                
                if (errors.new_password) {
                    errorMessage += `<strong>Password Requirements:</strong><br>• ${errors.new_password}<br><br>`;
                    hasErrors = true;
                }
                if (errors.new_password_confirmation) {
                    errorMessage += `<strong>Password Confirmation:</strong><br>• ${errors.new_password_confirmation}<br><br>`;
                    hasErrors = true;
                }
                if (errors.general) {
                    errorMessage += `<strong>General Error:</strong><br>• ${errors.general}<br><br>`;
                    hasErrors = true;
                }
                
                // If no specific errors, show generic message
                if (!hasErrors) {
                    errorMessage = 'An unexpected error occurred. Please try again.';
                } else {
                    errorMessage += '<small><em>Please check the requirements and try again.</em></small>';
                }
                
                Swal.fire({
                    title: 'Validation Error',
                    html: errorMessage.replace(/\n/g, '<br>'),
                    icon: 'error',
                    confirmButtonText: 'Try Again',
                    confirmButtonColor: '#dc2626'
                });
            }
        });
    };

    const handleCancel = () => {
        Swal.fire({
            title: 'Cancel Password Change?',
            text: 'You will be logged out if you cancel. Are you sure?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Cancel',
            cancelButtonText: 'Continue Changing',
            confirmButtonColor: '#dc2626'
        }).then((result) => {
            if (result.isConfirmed) {
                // Logout and redirect to login
                router.post('/auth/logout', {}, {
                    onFinish: () => {
                        router.visit('/login');
                    }
                });
            }
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
            <Head title="Change Password - ONSTS" />
            
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white text-center">
                    <FaKey className="w-12 h-12 mx-auto mb-3" />
                    <h1 className="text-2xl font-bold">Change Password</h1>
                    <p className="text-blue-100 text-sm mt-1">
                        {userType === 'faculty' ? 'Faculty' : userType === 'registrar' ? 'Registrar' : 'Student'} Portal
                    </p>
                </div>

                {/* Password Change Notice */}
                <div className="p-6 bg-yellow-50 border-b border-yellow-200">
                    <div className="flex items-start gap-3">
                        <FaExclamationTriangle className="text-yellow-600 mt-1 flex-shrink-0" />
                        <div>
                            <h3 className="font-semibold text-yellow-800 text-sm">Password Change Required</h3>
                            <p className="text-yellow-700 text-xs mt-1">
                                For security reasons, you must change your password before accessing your account.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* New Password */}
                        <div>
                            <label htmlFor="new_password" className="block text-gray-700 text-sm font-semibold mb-2">
                                New Password
                            </label>
                            <div className="relative">
                                <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    id="new_password"
                                    type={showNewPassword ? "text" : "password"}
                                    value={data.new_password}
                                    onChange={(e) => handlePasswordChange(e.target.value)}
                                    className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm ${
                                        errors.new_password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                    }`}
                                    placeholder="Enter your new password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showNewPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                                </button>
                            </div>
                            
                            {/* Password Strength Indicator */}
                            {data.new_password && (
                                <div className="mt-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                                            <div 
                                                className={`h-2 rounded-full transition-all ${getPasswordStrengthColor()}`}
                                                style={{ width: `${(passwordStrength / 5) * 100}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-xs font-medium text-gray-600">
                                            {getPasswordStrengthText()}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Use 8+ characters with uppercase, lowercase, numbers, and symbols
                                    </p>
                                </div>
                            )}
                            
                            {errors.new_password && (
                                <p className="text-red-500 text-xs mt-1">{errors.new_password}</p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label htmlFor="new_password_confirmation" className="block text-gray-700 text-sm font-semibold mb-2">
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <FaCheckCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    id="new_password_confirmation"
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={data.new_password_confirmation}
                                    onChange={(e) => setData('new_password_confirmation', e.target.value)}
                                    className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm ${
                                        errors.new_password_confirmation ? 'border-red-300 bg-red-50' : 
                                        data.new_password_confirmation && data.new_password === data.new_password_confirmation ? 'border-green-300 bg-green-50' :
                                        'border-gray-300'
                                    }`}
                                    placeholder="Confirm your new password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showConfirmPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                                </button>
                            </div>
                            {data.new_password_confirmation && data.new_password !== data.new_password_confirmation && (
                                <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
                            )}
                            {errors.new_password_confirmation && (
                                <p className="text-red-500 text-xs mt-1">{errors.new_password_confirmation}</p>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-sm"
                                disabled={processing}
                            >
                                Cancel & Logout
                            </button>
                            <button
                                type="submit"
                                disabled={processing || passwordStrength < 3 || data.new_password !== data.new_password_confirmation}
                                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition-all disabled:cursor-not-allowed text-sm"
                            >
                                {processing ? 'Changing...' : 'Change Password'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-center">
                    <p className="text-xs text-gray-500">
                        Your password must be changed for security compliance
                    </p>
                </div>
            </div>
        </div>
    );
}
