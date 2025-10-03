import { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Custom hook for managing school year status
 * Provides real-time school year status and validation
 */
export const useSchoolYearStatus = (initialStatus = null) => {
    const [status, setStatus] = useState(initialStatus || {
        hasActiveSchoolYear: false,
        activeSchoolYear: null,
        schoolYearDisplay: null,
        currentSemester: null,
        isEnrollmentOpen: false,
        loading: true,
        error: null
    });

    const [lastChecked, setLastChecked] = useState(null);

    // Fetch school year status from API
    const fetchStatus = async () => {
        try {
            setStatus(prev => ({ ...prev, loading: true, error: null }));
            
            const response = await axios.get('/registrar/api/school-year-status');
            
            setStatus(prev => ({
                ...prev,
                ...response.data,
                loading: false,
                error: null
            }));
            
            setLastChecked(new Date());
            
            return response.data;
        } catch (error) {
            console.error('Failed to fetch school year status:', error);
            
            setStatus(prev => ({
                ...prev,
                loading: false,
                error: error.message || 'Failed to fetch school year status'
            }));
            
            throw error;
        }
    };

    // Refresh status
    const refresh = () => {
        return fetchStatus();
    };

    // Check if operation is allowed
    const canPerformOperation = (operation) => {
        const operationRequirements = {
            'section_creation': true,
            'schedule_creation': true,
            'subject_creation': true,
            'faculty_creation': false // Faculty can be created without active school year
        };

        const requiresActive = operationRequirements[operation] ?? true;
        return !requiresActive || status.hasActiveSchoolYear;
    };

    // Get validation message for operation
    const getValidationMessage = (operation) => {
        if (canPerformOperation(operation)) {
            return null;
        }

        const messages = {
            'section_creation': 'You need to create and activate a school year before creating sections.',
            'schedule_creation': 'You need to create and activate a school year before creating schedules.',
            'subject_creation': 'You need to create and activate a school year before creating subjects.',
            'default': 'You need to create and activate a school year before performing this action.'
        };

        return messages[operation] || messages.default;
    };

    // Auto-fetch on mount if no initial status provided
    useEffect(() => {
        if (!initialStatus) {
            fetchStatus();
        }
    }, []);

    // Auto-refresh every 5 minutes
    useEffect(() => {
        const interval = setInterval(() => {
            fetchStatus();
        }, 5 * 60 * 1000); // 5 minutes

        return () => clearInterval(interval);
    }, []);

    return {
        status,
        refresh,
        canPerformOperation,
        getValidationMessage,
        lastChecked,
        isLoading: status.loading,
        hasError: !!status.error,
        error: status.error
    };
};

/**
 * Hook specifically for checking if operations are allowed
 */
export const useOperationValidation = (operation, initialStatus = null) => {
    const { status, canPerformOperation, getValidationMessage } = useSchoolYearStatus(initialStatus);

    return {
        isAllowed: canPerformOperation(operation),
        message: getValidationMessage(operation),
        hasActiveSchoolYear: status.hasActiveSchoolYear,
        activeSchoolYear: status.activeSchoolYear,
        isLoading: status.loading
    };
};

export default useSchoolYearStatus;
