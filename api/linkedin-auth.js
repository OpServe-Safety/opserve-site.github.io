// LinkedIn OAuth - Step 1: Initiate Authentication
export default function handler(req, res) {
    // Get environment variables
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
    
    // Validate environment variables
    if (!clientId || !redirectUri) {
        return res.status(500).json({ 
            error: 'Server configuration error. Please contact administrator.' 
        });
    }
    
    // Generate a random state for CSRF protection
    const state = Math.random().toString(36).substring(2, 15);
    
    // Store state in a cookie for verification later
    res.setHeader('Set-Cookie', `linkedin_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/`);
    
    // LinkedIn OAuth scopes we need
    const scope = 'openid profile email';
    
    // Build LinkedIn authorization URL
    const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', scope);
    
    // Redirect user to LinkedIn login
    res.redirect(authUrl.toString());
}
