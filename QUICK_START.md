# LinkedIn OAuth - Quick Start (5 Minutes)

## What You Have Now

✅ Serverless API functions in `/api/` folder  
✅ Updated frontend JavaScript  
✅ Vercel configuration  
✅ Security best practices implemented  

---

## 🚀 Deploy in 3 Steps

### 1️⃣ Get LinkedIn Credentials

Go to: https://www.linkedin.com/developers/apps (your app)

**Copy these:**
- Client ID
- Client Secret

**Add redirect URL:**
- `https://YOUR-SITE.vercel.app/api/linkedin-callback` (you'll get this URL after deploying)

---

### 2️⃣ Deploy to Vercel

**Go to:** https://vercel.com/new

1. Import your GitHub repository
2. **Before deploying**, add Environment Variables:
   - `LINKEDIN_CLIENT_ID` = (paste your Client ID)
   - `LINKEDIN_CLIENT_SECRET` = (paste your Client Secret)  
   - `LINKEDIN_REDIRECT_URI` = `https://YOUR-SITE.vercel.app/api/linkedin-callback`
3. Click **Deploy**
4. Wait 1-2 minutes

---

### 3️⃣ Update LinkedIn Redirect URL

1. Copy your Vercel deployment URL (e.g., `your-project.vercel.app`)
2. Go back to LinkedIn App → Auth tab
3. Update redirect URL to: `https://your-project.vercel.app/api/linkedin-callback`
4. Save

---

## ✅ Test It

1. Visit your deployed site
2. Click "APPLY NOW"
3. Click "Import from LinkedIn"
4. Login with LinkedIn
5. Your name & email should auto-fill!

---

## 🎯 What It Does

**Currently populates:**
- ✅ First Name
- ✅ Last Name
- ✅ Email

**Note:** Work history still needs to be entered manually (LinkedIn API limitation)

---

## 📖 Need More Help?

See the full setup guide: `LINKEDIN_SETUP.md`

---

## 🔐 Security Reminders

- ✅ Never commit `.env` file to Git
- ✅ Client Secret is stored securely in Vercel
- ✅ HTTPS is automatic with Vercel
- ✅ CSRF protection is implemented

**You're all set! 🎉**
