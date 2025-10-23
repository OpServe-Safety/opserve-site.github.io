# LinkedIn OAuth Integration - Setup Guide

This guide will walk you through setting up LinkedIn authentication for the OpServe Safety Group job application form.

---

## 📋 Prerequisites

1. LinkedIn Developer Account (you already have this!)
2. Vercel account (free): https://vercel.com
3. Git repository for your project
4. Your LinkedIn App credentials

---

## 🔧 Part 1: LinkedIn App Configuration

### 1. Configure Your LinkedIn App

Go to your LinkedIn App: https://www.linkedin.com/developers/apps

#### Required Settings:

**OAuth 2.0 Settings:**
- Click on "Auth" tab
- Add Redirect URLs:
  - For local testing: `http://localhost:3000/api/linkedin-callback`
  - For production: `https://your-domain.vercel.app/api/linkedin-callback`
  
**Products:**
- Request access to: **"Sign In with LinkedIn using OpenID Connect"**
- Request access to: **"Profile API"** (if available)

**OAuth 2.0 Scopes:**
- ✅ `openid`
- ✅ `profile`
- ✅ `email`

### 2. Get Your Credentials

From the "Auth" tab, copy:
- **Client ID** (you'll need this)
- **Client Secret** (you'll need this - keep it secret!)

---

## 🚀 Part 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Easiest)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Add LinkedIn OAuth integration"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to https://vercel.com/new
   - Click "Import Git Repository"
   - Select your GitHub repository
   - Click "Import"

3. **Configure Environment Variables**
   
   In Vercel dashboard, before deploying:
   - Click "Environment Variables"
   - Add these three variables:
   
   | Name | Value | Environment |
   |------|-------|-------------|
   | `LINKEDIN_CLIENT_ID` | Your Client ID | Production, Preview, Development |
   | `LINKEDIN_CLIENT_SECRET` | Your Client Secret | Production, Preview, Development |
   | `LINKEDIN_REDIRECT_URI` | `https://your-domain.vercel.app/api/linkedin-callback` | Production |
   | `LINKEDIN_REDIRECT_URI` | `http://localhost:3000/api/linkedin-callback` | Development |

4. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete (usually 1-2 minutes)
   - Note your deployed URL (e.g., `your-project.vercel.app`)

5. **Update LinkedIn Redirect URL**
   - Go back to LinkedIn App settings
   - Update the redirect URL to match your Vercel deployment:
     `https://your-project.vercel.app/api/linkedin-callback`

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Link to existing project? **No**
   - Project name? **osg** (or your preferred name)
   - Which directory? **./** (current directory)

4. **Add Environment Variables**
   ```bash
   vercel env add LINKEDIN_CLIENT_ID
   vercel env add LINKEDIN_CLIENT_SECRET
   vercel env add LINKEDIN_REDIRECT_URI
   ```

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

---

## 🧪 Part 3: Test Locally (Optional)

To test on your local machine before deploying:

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Create Local Environment File**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your credentials:
   ```
   LINKEDIN_CLIENT_ID=your_actual_client_id
   LINKEDIN_CLIENT_SECRET=your_actual_client_secret
   LINKEDIN_REDIRECT_URI=http://localhost:3000/api/linkedin-callback
   ```

3. **Run Development Server**
   ```bash
   vercel dev
   ```

4. **Test**
   - Open http://localhost:3000
   - Click "Apply Now"
   - Click "Import from LinkedIn"
   - Verify OAuth flow works

---

## ✅ Part 4: Verify It's Working

1. **Go to your deployed site**
   - Click "APPLY NOW"
   - Click "Import from LinkedIn" button

2. **What should happen:**
   - Popup window opens
   - LinkedIn login page appears
   - After login, you're asked to authorize the app
   - Popup closes automatically
   - Your name and email are filled in the form

3. **If it doesn't work:**
   - Check Vercel logs: `vercel logs`
   - Verify environment variables are set
   - Check LinkedIn redirect URL matches exactly
   - Check browser console for errors

---

## 🔐 Security Best Practices

✅ **DO:**
- Keep Client Secret in Vercel environment variables only
- Use HTTPS in production (automatic with Vercel)
- Verify the `state` parameter (already implemented)
- Use `HttpOnly` cookies (already implemented)

❌ **DON'T:**
- Never commit `.env` file to Git
- Never expose Client Secret in frontend code
- Never disable HTTPS in production

---

## 📝 Important Notes

### LinkedIn API Limitations

**⚠️ Work History Access:**
LinkedIn's current API (as of 2024) has limited access to work history data. The basic OpenID Connect + Profile API only provides:
- ✅ Name (first, last)
- ✅ Email
- ✅ Profile picture (optional)
- ❌ Work history (requires Partner Program access)

To get full work history, you would need to:
1. Apply for LinkedIn's Marketing Developer Platform
2. Get approved for Partner Program
3. Request additional scopes

**For now:** The integration will auto-fill name and email, but users will need to manually enter their work history.

---

## 🆘 Troubleshooting

### Issue: "Redirect URI mismatch"
**Solution:** Make sure the redirect URI in LinkedIn App settings matches exactly:
- Production: `https://your-domain.vercel.app/api/linkedin-callback`
- Local: `http://localhost:3000/api/linkedin-callback`

### Issue: "Invalid client credentials"
**Solution:** Double-check your Client ID and Client Secret in Vercel environment variables.

### Issue: "CORS error"
**Solution:** This shouldn't happen with Vercel, but if it does, the API routes are configured to handle CORS properly.

### Issue: Popup blocked
**Solution:** Make sure users allow popups from your site. Add a message if popup is blocked.

---

## 📚 Resources

- LinkedIn OAuth 2.0 Documentation: https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication
- Vercel Documentation: https://vercel.com/docs
- Vercel Environment Variables: https://vercel.com/docs/concepts/projects/environment-variables

---

## 🎉 You're Done!

Your LinkedIn integration is now live! Users can import their name and email from LinkedIn when applying for jobs.

**Next Steps:**
1. Test the integration thoroughly
2. Monitor Vercel logs for any errors
3. Consider adding analytics to track usage
4. If needed, apply for LinkedIn Partner Program for work history access

---

Need help? Check the Vercel logs or reach out to your development team!
