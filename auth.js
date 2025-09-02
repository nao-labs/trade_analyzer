// auth.js - Handles API Authentication and Token Management

const AUTH_API_BASE_URL = 'http://152.42.239.83:4000/api';
const TOKEN_KEY = 'jwt_token';

/**
 * Logs in to the API using a username and password, then stores the JWT.
 * @param {string} username - The API username.
 *
 * @param {string} password - The API password.
 * @returns {Promise<boolean>} - True if login was successful, false otherwise.
 */
async function loginAndStoreToken(username, password) {
    console.log('Attempting to log in and fetch API token...');
    try {
        const response = await fetch(`${AUTH_API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
            throw new Error(`Authentication failed with status: ${response.status}`);
        }

        const data = await response.json();

        if (data && data.token) {
            localStorage.setItem(TOKEN_KEY, data.token);
            console.log('✅ Login successful. Token has been stored.');
            alert('API Login Successful!');
            return true;
        } else {
            throw new Error('Login response did not contain a token.');
        }
    } catch (error) {
        console.error('❌ API Login Error:', error);
        localStorage.removeItem(TOKEN_KEY); // Clear any stale token
        alert(`API Login Failed: ${error.message}`);
        return false;
    }
}

/**
 * Retrieves the stored JWT token from localStorage.
 * This function will be used by other modules to authenticate API requests.
 * @returns {string|null} - The stored JWT token or null if not found.
 */
function getApiToken() {
    return localStorage.getItem(TOKEN_KEY);
}

/**
 * Clears the stored JWT token from localStorage.
 */
function logout() {
    localStorage.removeItem(TOKEN_KEY);
    console.log('Logged out and token has been cleared.');
    alert('You have been logged out.');
}

// Make functions globally available
window.loginAndStoreToken = loginAndStoreToken;
window.getApiToken = getApiToken;
window.logout = logout;