# Power Outage Recovery Guide

## What the Script Does

The `start-actionsheet-system.bat` script automatically:

1. ✅ **Checks if backend is running** (port 8080)
2. ✅ **Starts backend if needed** (Spring Boot JAR)
3. ✅ **Creates new Cloudflare Tunnel**
4. ✅ **Extracts the tunnel URL**
5. ✅ **Displays Vercel environment variable**
6. ✅ **Saves URL to file** for reference
7. ✅ **Keeps tunnel running**

## Setup Instructions

### 1. Update the Script Paths

Edit `start-actionsheet-system.bat` and update these lines:

```batch
REM Change to your backend directory (UPDATE THIS PATH!)
cd /d "E:\Action Sheet System\backend"

REM Start backend in background (UPDATE THE JAR NAME!)
start "Backend Server" java -jar actionsheet-backend.jar
```

**Replace with your actual:**
- Backend directory path
- JAR file name

### 2. Place Script on Desktop

Move `start-actionsheet-system.bat` to your Desktop for easy access.

## After Power Outage

### Step 1: Run the Script
Double-click `start-actionsheet-system.bat`

### Step 2: Copy the URL
The script will display something like:
```
Variable Name: VITE_API_URL
Variable Value: https://new-random-words.trycloudflare.com
```

### Step 3: Update Vercel
1. Go to: https://vercel.com/your-account/frontend-rho-peach-62/settings/environment-variables
2. Find `VITE_API_URL` variable
3. Click "Edit"
4. Paste the new URL
5. Click "Save"

### Step 4: Redeploy
1. Go to Deployments tab
2. Click "Redeploy" on latest deployment
3. **UNCHECK** "Use existing Build Cache"
4. Click "Redeploy"

### Step 5: Done!
Wait 1-2 minutes for deployment, then your system is back online!

## Files Created

- `tunnel-url.txt` - Contains the current tunnel URL for reference
- Backend logs in separate window
- Tunnel logs in main window

## Troubleshooting

### "Backend failed to start"
- Check if Java is installed
- Verify JAR file path and name
- Check if port 8080 is available

### "Cloudflared not found"
- Ensure cloudflared.exe is in System32 or PATH
- Reinstall cloudflared if needed

### "Tunnel creation failed"
- Check internet connection
- Try running script as Administrator
- Restart computer and try again

## Pro Tips

1. **Pin script to taskbar** for quick access
2. **Create desktop shortcut** with custom icon
3. **Bookmark Vercel settings page** for faster updates
4. **Keep tunnel-url.txt** to track URL changes

---

## One-Click Recovery Summary

1. 🖱️ **Click script** → System starts
2. 📋 **Copy URL** → From script output  
3. 🌐 **Paste in Vercel** → Update environment variable
4. 🚀 **Redeploy** → System back online

**Total time: ~3 minutes after power outage!**