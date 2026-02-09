# Expo Backend Connection Troubleshooting

## Problem
Expo mobile app shows "server not reachable" but web version works fine.

## Root Cause
- `localhost:5000` works in web browsers
- Expo mobile apps can't access `localhost` - they need your computer's IP address
- Windows Firewall may block external connections to Node.js

## Current Configuration
- Web: `http://localhost:5000` ✅
- Mobile: `http://10.212.38.219:5000` ❌ (blocked by firewall)

## Solutions (Try in order)

### Solution 1: Windows Firewall Rule (Recommended)
1. **Run as Administrator:**
   - Right-click Command Prompt → "Run as administrator"
   - Run: `netsh advfirewall firewall add rule name="Node.js Port 5000" dir=in action=allow protocol=TCP localport=5000`

### Solution 2: Windows Firewall GUI
1. Press `Windows + R`, type `wf.msc`, press Enter
2. Click "Inbound Rules" → "New Rule"
3. Select "Port" → "TCP" → "Specific local ports: 5000"
4. Allow the connection → Apply to all profiles
5. Name: "Node.js Server Port 5000"

### Solution 3: Temporary Firewall Disable (Testing Only)
1. Press `Windows + R`, type `firewall.cpl`, press Enter
2. Click "Turn Windows Defender Firewall on or off"
3. Turn off for "Private networks" only
4. Test Expo app
5. **Turn firewall back on after testing**

### Solution 4: Use Expo Tunnel (Alternative)
1. In your Expo development server, use tunnel mode:
   ```bash
   expo start --tunnel
   ```
2. This creates a public URL that bypasses local network issues

### Solution 5: Change Server Port
If port 5000 is problematic, try port 3000:
1. Update `server/server.js`: `const PORT = process.env.PORT || 3000;`
2. Update `slyth-app/src/constants/api.js` to use port 3000
3. Restart server

## Testing Connection
1. **Test locally:** Open `http://localhost:5000` in browser
2. **Test externally:** Open `http://10.212.38.219:5000` in browser
3. **If external fails:** It's a firewall issue

## IP Address Changes
Your IP address may change. To find current IP:
```cmd
ipconfig | findstr "IPv4"
```
Update the IP in `slyth-app/src/constants/api.js`

## Current Status
- Server running: ✅
- Local access: ✅  
- External access: ❌ (firewall blocked)
- Solution needed: Windows Firewall rule