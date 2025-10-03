import React from 'react';
import { Link } from '@inertiajs/react';
import { FaExclamationTriangle, FaCalendarAlt, FaArrowRight, FaTimes } from 'react-icons/fa';

/**
 * SchoolYearWarning Component
 * 
 * Displays a warning when no active school year exists, following Nielsen's HCI principles:
 * 1. Visibility of system status - Clear warning about missing school year
 * 2. Error prevention - Guides users to create school year first
 * 3. Help and documentation - Provides clear next steps
 */
const SchoolYearWarning = ({ 
    show = true, 
    onDismiss = null, 
    variant = 'warning', // 'warning', 'error', 'info'
    showActions = true,
    className = '',
    title = 'No Active School Year Found',
    message = 'You need to create and activate a school year before managing academic data.',
    actionText = 'Create School Year',
    actionLink = '/registrar/school-years'
}) => {
    if (!show) return null;

    const variants = {
        warning: {
            container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
            icon: 'text-yellow-600',
            button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
            link: 'text-yellow-700 hover:text-yellow-900'
        },
        error: {
            container: 'bg-red-50 border-red-200 text-red-800',
            icon: 'text-red-600',
            button: 'bg-red-600 hover:bg-red-700 text-white',
            link: 'text-red-700 hover:text-red-900'
        },
        info: {
            container: 'bg-blue-50 border-blue-200 text-blue-800',
            icon: 'text-blue-600',
            button: 'bg-blue-600 hover:bg-blue-700 text-white',
            link: 'text-blue-700 hover:text-blue-900'
        }
    };

    const currentVariant = variants[variant] || variants.warning;

    return (
        <div className={`border rounded-lg p-4 mb-6 ${currentVariant.container} ${className}`}>
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    <FaExclamationTriangle className={`w-5 h-5 ${currentVariant.icon}`} />
                </div>
                
                <div className="ml-3 flex-1">
                    <h3 className="text-sm font-semibold mb-1">
                        {title}
                    </h3>
                    <p className="text-sm mb-3">
                        {message}
                    </p>
                    
                    {showActions && (
                        <div className="flex items-center gap-3">
                            <Link
                                href={actionLink}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${currentVariant.button}`}
                            >
                                <FaCalendarAlt className="w-4 h-4" />
                                {actionText}
                                <FaArrowRight className="w-3 h-3" />
                            </Link>
                            
                            <Link
                                href="/registrar/school-years"
                                className={`text-sm font-medium ${currentVariant.link} hover:underline`}
                            >
                                View All School Years
                            </Link>
                        </div>
                    )}
                </div>
                
                {onDismiss && (
                    <div className="flex-shrink-0 ml-3">
                        <button
                            onClick={onDismiss}
                            className={`p-1 rounded-md ${currentVariant.icon} hover:bg-black hover:bg-opacity-10 transition-colors duration-200`}
                            title="Dismiss warning"
                        >
                            <FaTimes className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * Compact version for smaller spaces
 */
export const SchoolYearWarningCompact = ({ 
    show = true, 
    className = '',
    message = 'No active school year. Create one first.',
    actionLink = '/registrar/school-years'
}) => {
    if (!show) return null;

    return (
        <div className={`flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm ${className}`}>
            <FaExclamationTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
            <span className="flex-1">{message}</span>
            <Link
                href={actionLink}
                className="text-yellow-700 hover:text-yellow-900 font-medium hover:underline flex-shrink-0"
            >
                Fix Now
            </Link>
        </div>
    );
};

/**
 * Inline version for forms and modals
 */
export const SchoolYearWarningInline = ({ 
    show = true, 
    className = '',
    message = 'Active school year required'
}) => {
    if (!show) return null;

    return (
        <div className={`flex items-center gap-2 text-sm text-yellow-700 ${className}`}>
            <FaExclamationTriangle className="w-4 h-4" />
            <span>{message}</span>
        </div>
    );
};

export default SchoolYearWarning;
