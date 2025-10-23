// Admin Login - To be connected with Supabase later
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('adminLoginForm');
    const loginError = document.getElementById('loginError');
    const errorMessage = document.getElementById('errorMessage');
    
    // Check if already logged in
    checkAuth();
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        
        // Hide previous errors
        loginError.style.display = 'none';
        
        // Disable button during login
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
        
        try {
            // TODO: Replace with Supabase authentication
            // For now, we'll use a simple check (TEMPORARY - INSECURE)
            if (email === 'admin@opservesafetygroup.com') {
                // TEMPORARY: Accept any password for demo
                // Store session (to be replaced with Supabase session)
                sessionStorage.setItem('adminAuth', JSON.stringify({
                    email: email,
                    timestamp: Date.now()
                }));
                
                // Redirect to dashboard
                window.location.href = 'admin-dashboard.html';
            } else {
                throw new Error('Invalid credentials');
            }
        } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = error.message || 'Invalid email or password';
            loginError.style.display = 'block';
            
            // Re-enable button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
    
    // Check if user is already authenticated
    function checkAuth() {
        const auth = sessionStorage.getItem('adminAuth');
        if (auth) {
            try {
                const authData = JSON.parse(auth);
                // Check if session is less than 24 hours old
                const hoursSinceLogin = (Date.now() - authData.timestamp) / (1000 * 60 * 60);
                if (hoursSinceLogin < 24) {
                    // Already logged in, redirect to dashboard
                    window.location.href = 'admin-dashboard.html';
                } else {
                    // Session expired
                    sessionStorage.removeItem('adminAuth');
                }
            } catch (error) {
                sessionStorage.removeItem('adminAuth');
            }
        }
    }
});

// TODO: Supabase Integration
/*
async function loginWithSupabase(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });
    
    if (error) throw error;
    
    // Check if user is admin
    if (email !== 'admin@opservesafetygroup.com') {
        await supabase.auth.signOut();
        throw new Error('Unauthorized access');
    }
    
    return data;
}
*/
