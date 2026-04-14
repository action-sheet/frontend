# Vercel Environment Variable Setup

## Problem
The frontend is still using the old Cloudflare URL because Vercel doesn't have the environment variable set.

## Solution

### 1. Go to Vercel Dashboard
https://vercel.com/

### 2. Select Your Project
Click on "frontend-rho-peach-62" (or your project name)

### 3. Go to Settings
Click "Settings" in the top navigation

### 4. Click "Environment Variables" in the left sidebar

### 5. Add New Environment Variable

Click "Add New" and enter:

**Variable Name:**
```
VITE_API_URL
```

**Value:**
```
https://backend-k9ji.onrender.com
```

**Environments:** Check all three boxes:
- ✅ Production
- ✅ Preview  
- ✅ Development

Click "Save"

### 6. Redeploy

Go to "Deployments" tab and click the three dots (...) on the latest deployment, then click "Redeploy"

**IMPORTANT:** Uncheck "Use existing Build Cache" to force a fresh build with the new environment variable.

---

## Alternative: Add via vercel.json

You can also add environment variables in `vercel.json`, but this is NOT recommended for sensitive data:

```json
{
  "env": {
    "VITE_API_URL": "https://backend-k9ji.onrender.com"
  },
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Then commit and push:
```bash
git add vercel.json
git commit -m "Add API URL to vercel.json"
git push
```

---

## Verify It Worked

After redeployment, open browser console on https://frontend-rho-peach-62.vercel.app and check:

1. The API calls should now go to `https://backend-k9ji.onrender.com`
2. No more Cloudflare URL errors
3. CORS errors should be gone (if backend is configured correctly)
