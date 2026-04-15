# Cloudflare Zero Trust Permanent Tunnel Setup

## Step 1: Create Cloudflare Zero Trust Account

1. Go to: https://one.dash.cloudflare.com/
2. Sign up with your email (same as regular Cloudflare account)
3. **Skip payment info** - choose "Continue with Free Plan"
4. Complete email verification

## Step 2: Login via CLI

```cmd
cloudflared tunnel login
```

This opens your browser - login and authorize the CLI.

## Step 3: Create Named Tunnel

```cmd
cloudflared tunnel create actionsheet-backend
```

**Output will show:**
```
Tunnel credentials written to C:\Users\administrator.ACG\.cloudflared\TUNNEL-ID.json
Created tunnel actionsheet-backend with id TUNNEL-ID
```

**Copy the TUNNEL-ID** - you'll need it!

## Step 4: Create Config File

Create file: `C:\Users\administrator.ACG\.cloudflared\config.yml`

```yaml
tunnel: actionsheet-backend
credentials-file: C:\Users\administrator.ACG\.cloudflared\TUNNEL-ID.json

ingress:
  - service: http://localhost:8080
```

**Replace `TUNNEL-ID`** with the actual ID from Step 3.

## Step 5: Route DNS (Creates Permanent URL)

```cmd
cloudflared tunnel route dns actionsheet-backend actionsheet-backend
```

This creates a permanent URL: `https://actionsheet-backend.cfargotunnel.com`

## Step 6: Run Named Tunnel

```cmd
cloudflared tunnel run actionsheet-backend
```

## Step 7: Get Your Permanent URL

Go to: https://one.dash.cloudflare.com/
- Navigate to: **Access** → **Tunnels**
- Find your tunnel: **actionsheet-backend**
- Copy the permanent URL (e.g., `https://actionsheet-backend.cfargotunnel.com`)

## Step 8: Update Frontend

Update `vercel.json`:
```json
{
  "env": {
    "VITE_API_URL": "https://actionsheet-backend.cfargotunnel.com"
  },
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## Step 9: Deploy

```cmd
git add vercel.json && git commit -m "Add permanent Cloudflare tunnel" && git push
```

---

## Benefits of Named Tunnel:

✅ **Permanent URL** - Never changes  
✅ **Free forever** - No payment required  
✅ **Auto-reconnect** - Survives network issues  
✅ **Better reliability** - Enterprise-grade  
✅ **Dashboard management** - View status online  

## Auto-Start on Boot (Optional)

Create Windows Task:
1. Open Task Scheduler
2. Create Basic Task
3. Trigger: At startup
4. Action: `cloudflared tunnel run actionsheet-backend`
5. Check "Run whether user is logged on or not"

---

## Troubleshooting

### "Payment required"
- Choose "Continue with Free Plan" during signup
- Free tier includes tunnels

### "Tunnel not found"
- Verify tunnel name: `cloudflared tunnel list`
- Check config file path and tunnel ID

### "DNS route failed"
- Try: `cloudflared tunnel route dns actionsheet-backend actionsheet-backend.cfargotunnel.com`

---

## Final Result

**Permanent URL:** `https://actionsheet-backend.cfargotunnel.com`

This URL:
- ✅ Never changes
- ✅ Works after power outages
- ✅ No need to update Vercel
- ✅ Professional and reliable