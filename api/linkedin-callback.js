// LinkedIn OAuth - Step 2: Handle Callback and Get User Data
export default async function handler(req, res) {
    const { code, state } = req.query;
    
    // Get environment variables
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
    
    // Validate environment variables
    if (!clientId || !clientSecret || !redirectUri) {
        return res.status(500).json({ 
            error: 'Server configuration error' 
        });
    }
    
    // Verify state for CSRF protection
    const cookies = req.headers.cookie?.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
    }, {});
    
    const savedState = cookies?.linkedin_oauth_state;
    
    if (!state || state !== savedState) {
        return res.status(400).json({ 
            error: 'Invalid state parameter. Possible CSRF attack.' 
        });
    }
    
    // Validate authorization code
    if (!code) {
        return res.status(400).json({ 
            error: 'No authorization code received' 
        });
    }
    
    try {
        // Exchange authorization code for access token
        const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirectUri,
                client_id: clientId,
                client_secret: clientSecret,
            }),
        });
        
        if (!tokenResponse.ok) {
            throw new Error('Failed to get access token');
        }
        
        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;
        
        // Get user profile information
        const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });
        
        if (!profileResponse.ok) {
            throw new Error('Failed to get user profile');
        }
        
        const profileData = await profileResponse.json();
        
        // Extract relevant information
        const userData = {
            name: profileData.name || '',
            given_name: profileData.given_name || '',
            family_name: profileData.family_name || '',
            email: profileData.email || '',
            // Note: LinkedIn's newer API has limited work history access
            // You may need to request additional permissions or use LinkedIn's Profile API
        };
        
        // Return HTML that sends data back to the parent window
        const htmlResponse = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>LinkedIn Authentication Successful</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        background-color: #f5f5f5;
                    }
                    .container {
                        text-align: center;
                        background: white;
                        padding: 40px;
                        border-radius: 10px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .success {
                        color: #0a66c2;
                        font-size: 24px;
                        margin-bottom: 20px;
                    }
                    .loading {
                        color: #666;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="success">✓ LinkedIn Authentication Successful</div>
                    <div class="loading">Importing your information...</div>
                </div>
                <script>
                    // Send data to parent window (the main application)
                    if (window.opener) {
                        window.opener.postMessage({
                            type: 'LINKEDIN_AUTH_SUCCESS',
                            data: ${JSON.stringify(userData)}
                        }, window.location.origin);
                        
                        // Close this popup after a brief delay
                        setTimeout(() => {
                            window.close();
                        }, 1500);
                    } else {
                        document.querySelector('.loading').textContent = 'Please close this window and return to the application.';
                    }
                </script>
            </body>
            </html>
        `;
        
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(htmlResponse);
        
    } catch (error) {
        console.error('LinkedIn OAuth error:', error);
        
        // Return error HTML
        const errorHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Authentication Error</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        background-color: #f5f5f5;
                    }
                    .container {
                        text-align: center;
                        background: white;
                        padding: 40px;
                        border-radius: 10px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .error {
                        color: #d32f2f;
                        font-size: 24px;
                        margin-bottom: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="error">✗ Authentication Failed</div>
                    <p>Please close this window and try again.</p>
                </div>
                <script>
                    if (window.opener) {
                        window.opener.postMessage({
                            type: 'LINKEDIN_AUTH_ERROR',
                            error: 'Authentication failed'
                        }, window.location.origin);
                    }
                </script>
            </body>
            </html>
        `;
        
        res.setHeader('Content-Type', 'text/html');
        res.status(500).send(errorHtml);
    }
}
