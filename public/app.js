document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const authView = document.getElementById('auth-view');
    const dashboardView = document.getElementById('dashboard-view');
    
    const btnLoginTab = document.getElementById('btn-login');
    const btnRegisterTab = document.getElementById('btn-register');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');
    const registerSuccess = document.getElementById('register-success');

    const btnLogout = document.getElementById('btn-logout');
    const welcomeMessage = document.getElementById('welcome-message');
    const dashUsername = document.getElementById('dash-username');
    const dashRole = document.getElementById('dash-role');
    
    const adminPanel = document.getElementById('admin-panel');
    const btnFetchAdmin = document.getElementById('btn-fetch-admin');
    const adminDataResponse = document.getElementById('admin-data-response');

    // API Configuration
    // If we're on port 5500 (Live Server), point to the backend on port 3000
    const API_BASE_URL = window.location.port === '5500' ? 'http://localhost:3000' : '';

    // State
    let token = localStorage.getItem('token');

    // Initialize View
    if (token) {
        fetchUserDetails();
    } else {
        showAuthView();
    }

    // --- Tab Switching Logic ---
    btnLoginTab.addEventListener('click', () => {
        btnLoginTab.classList.add('active');
        btnRegisterTab.classList.remove('active');
        loginForm.classList.add('active-form');
        registerForm.classList.remove('active-form');
        clearMessages();
    });

    btnRegisterTab.addEventListener('click', () => {
        btnRegisterTab.classList.add('active');
        btnLoginTab.classList.remove('active');
        registerForm.classList.add('active-form');
        loginForm.classList.remove('active-form');
        clearMessages();
    });

    function clearMessages() {
        loginError.textContent = '';
        registerError.textContent = '';
        registerSuccess.textContent = '';
    }

    // --- Authentication Logic ---

    // Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
        loginError.textContent = '';
        const btn = loginForm.querySelector('button');
        btn.textContent = 'Signing In...';

        try {
            const res = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (res.ok) {
                token = data.token;
                localStorage.setItem('token', token);
                fetchUserDetails();
            } else {
                loginError.textContent = data.error || 'Login failed.';
            }
        } catch (err) {
            console.error('Login error:', err);
            loginError.textContent = 'Connection error. Is the backend server running on port 3000?';
        } finally {
            btn.textContent = 'Sign In';
        }
    });

    // Register
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const isAdmin = document.getElementById('reg-admin').checked;
        const role = isAdmin ? 'admin' : 'user';

        clearMessages();
        const btn = registerForm.querySelector('button');
        btn.textContent = 'Creating Account...';

        try {
            const res = await fetch(`${API_BASE_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, role })
            });

            const data = await res.json();

            if (res.ok) {
                registerSuccess.textContent = 'Registration successful! You can now log in.';
                registerForm.reset();
                setTimeout(() => btnLoginTab.click(), 2000); // Switch to login after 2s
            } else {
                registerError.textContent = data.error || 'Registration failed.';
            }
        } catch (err) {
            console.error('Registration error:', err);
            registerError.textContent = 'Connection error. Is the backend server running on port 3000?';
        } finally {
            btn.textContent = 'Sign Up';
        }
    });

    // Logout
    btnLogout.addEventListener('click', () => {
        localStorage.removeItem('token');
        token = null;
        showAuthView();
    });

    // --- Protected Routes Logic ---

    async function fetchUserDetails() {
        if (!token) return showAuthView();

        try {
            const res = await fetch(`${API_BASE_URL}/api/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                showDashboardView(data.user);
            } else {
                // Token invalid or expired
                localStorage.removeItem('token');
                token = null;
                showAuthView();
            }
        } catch (err) {
            console.error('Failed to fetch user details');
        }
    }

    btnFetchAdmin.addEventListener('click', async () => {
        adminDataResponse.textContent = 'Fetching...';
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (res.ok) {
                adminDataResponse.textContent = data.message;
            } else {
                adminDataResponse.textContent = data.error;
            }
        } catch (err) {
            adminDataResponse.textContent = 'Failed to connect to admin route.';
        }
    });

    // --- View Management ---

    function showAuthView() {
        authView.classList.add('active-view');
        dashboardView.classList.remove('active-view');
        // Reset forms
        loginForm.reset();
        registerForm.reset();
        clearMessages();
    }

    function showDashboardView(user) {
        authView.classList.remove('active-view');
        dashboardView.classList.add('active-view');
        
        welcomeMessage.textContent = `Welcome back, ${user.username}!`;
        dashUsername.textContent = user.username;
        dashRole.textContent = user.role;

        if (user.role === 'admin') {
            adminPanel.classList.remove('hidden');
        } else {
            adminPanel.classList.add('hidden');
        }
        adminDataResponse.textContent = '';
    }

    // --- Password Visibility Toggle ---
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (input.type === 'password') {
                input.type = 'text';
                this.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>'; // Eye off
            } else {
                input.type = 'password';
                this.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>'; // Eye on
            }
        });
    });

    // --- Password Strength Meter ---
    const regPasswordInput = document.getElementById('reg-password');
    const strengthBar = document.getElementById('strength-bar');
    const strengthText = document.getElementById('strength-text');

    regPasswordInput.addEventListener('input', function() {
        const val = this.value;
        let strength = 0;
        
        if (val.length > 0) strength += 1;
        if (val.length >= 6) strength += 1;
        if (val.length >= 8 && /[A-Z]/.test(val) && /[0-9]/.test(val)) strength += 1;
        if (val.length >= 10 && /[^A-Za-z0-9]/.test(val)) strength += 1;

        if (val.length === 0) {
            strengthBar.style.width = '0%';
            strengthText.textContent = '';
        } else if (strength <= 1) {
            strengthBar.style.width = '25%';
            strengthBar.style.backgroundColor = 'var(--danger)';
            strengthText.textContent = 'Weak';
            strengthText.style.color = 'var(--danger)';
        } else if (strength === 2) {
            strengthBar.style.width = '50%';
            strengthBar.style.backgroundColor = '#f59e0b'; // warning/orange
            strengthText.textContent = 'Fair';
            strengthText.style.color = '#f59e0b';
        } else if (strength === 3) {
            strengthBar.style.width = '75%';
            strengthBar.style.backgroundColor = 'var(--accent)';
            strengthText.textContent = 'Good';
            strengthText.style.color = 'var(--accent)';
        } else {
            strengthBar.style.width = '100%';
            strengthBar.style.backgroundColor = 'var(--success)';
            strengthText.textContent = 'Strong';
            strengthText.style.color = 'var(--success)';
        }
    });
});
