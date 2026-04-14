# Tailscale Funnel Setup Guide

## Step 1: Install Tailscale

Download and install from: https://tailscale.com/download/windows

## Step 2: Sign Up and Login

1. Open Tailscale from system tray (bottom right corner)
2. Click "Log in"
3. Sign up with Google, Microsoft, or email
4. Complete authentication in browser

## Step 3: Enable Funnel (Public Access)

Open PowerShell or Command Prompt as Administrator and run:

```bash
# Start your backend first (make sure it's running on port 8080)
# Then enable Tailscale Funnel
tailscale funnel 8080
```

This will output something like:
```
Available on the internet:
https://your-machine-name.tailnet-name.ts.net/
```

**This URL is permanent and won't change!**

## Step 4: Copy Your Permanent URL

The URL will look like:
```
https://desktop-abc123.tail1234.ts.net
```

Copy this URL - this is your permanent backend URL!

## Step 5: Update Frontend Configuration

Update `vercel.json`:
```json
{
  "env": {
    "VITE_API_URL": "https://your-machine-name.tailnet-name.ts.net"
  },
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Update `.env.production`:
```
VITE_API_URL=https://your-machine-name.tailnet-name.ts.net
```

## Step 6: Configure Backend CORS

Update your Spring Boot backend to allow the Vercel domain:

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
            .allowedOrigins(
                "http://localhost:5173",
                "https://frontend-rho-peach-62.vercel.app"
            )
            .allowedMethods("*")
            .allowedHeaders("*")
            .allowCredentials(true);
    }
}
```

## Step 7: Keep Funnel Running

To keep Funnel running in the background:

**Option A: Run in PowerShell**
```bash
tailscale funnel 8080
```
Keep this window open.

**Option B: Run as Windows Service (Advanced)**
Create a scheduled task to run on startup.

## Step 8: Deploy Frontend

```bash
git add vercel.json .env.production
git commit -m "Update to Tailscale Funnel URL"
git push
```

---

## Important Notes:

✅ **Permanent URL** - Never changes as long as you use the same machine
✅ **Free** - No cost
✅ **Secure** - Uses WireGuard VPN technology
✅ **No port forwarding** - Works behind any firewall/NAT
✅ **HTTPS included** - Automatic SSL certificate

⚠️ **Requirements:**
- Your computer must be running
- Backend must be running on port 8080
- Tailscale Funnel must be active

---

## Troubleshooting:

### "Funnel not available"
Make sure you're on the latest Tailscale version and Funnel is enabled for your account.

### "Port already in use"
Make sure your backend is running on port 8080 first, then run Funnel.

### "Connection refused"
Check that your backend is actually running and accessible on localhost:8080

---

## Alternative: Use Tailscale Serve (Private Access Only)

If you only want your team to access it (not public):

```bash
tailscale serve 8080
```

This requires team members to install Tailscale and join your network.
