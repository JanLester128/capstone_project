import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Set up token management for authentication
const setAuthToken = () => {
    const tokens = [
        localStorage.getItem('student_token'),
        localStorage.getItem('faculty_token'),
        localStorage.getItem('coordinator_token'),
        localStorage.getItem('registrar_token')
    ];
    
    const token = tokens.find(t => t !== null);
    
    if (token) {
        window.axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete window.axios.defaults.headers.common['Authorization'];
    }
};

// Set initial token
setAuthToken();

// Axios interceptor to handle 401 responses (token expired/invalid)
window.axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear all tokens
            localStorage.removeItem('student_token');
            localStorage.removeItem('faculty_token');
            localStorage.removeItem('coordinator_token');
            localStorage.removeItem('registrar_token');
            
            // Clear authorization header
            delete window.axios.defaults.headers.common['Authorization'];
            
            // Redirect to login
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Export function to update token
window.setAuthToken = setAuthToken;
