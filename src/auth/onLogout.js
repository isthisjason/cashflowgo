import axios from '../axiosConfig';

const onLogout = async () => {
    try {
        const response = await axios.post('/accounts/logout/');
        console.log(response.data.message); // Debugging: Log logout success message
        localStorage.removeItem('loggedInUser'); // Clear local user state
        window.location.href = '/login'; // Redirect to login page
    } catch (error) {
        console.error("Logout failed:", error.response?.data || error.message);
    }
};

export default onLogout;