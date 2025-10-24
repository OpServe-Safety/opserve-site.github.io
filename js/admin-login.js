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
            // Authenticate with Supabase
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) throw error;
            
            // Store session info (Supabase handles the session automatically)
            sessionStorage.setItem('adminAuth', JSON.stringify({
                email: email,
                timestamp: Date.now()
            }));
            
            // Redirect to dashboard
            window.location.href = 'admin-dashboard.html';
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
    async function checkAuth() {
        try {
            const { data: { session }, error } = await window.supabaseClient.auth.getSession();
            
            if (session && !error) {
                // Already logged in, redirect to dashboard
                window.location.href = 'admin-dashboard.html';
            }
        } catch (error) {
            console.error('Auth check error:', error);
            // Not logged in or error, stay on login page
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
