# Spotify Integration Setup

The app includes optional Spotify integration for playing music during focus sessions.

## Setup Instructions

### 1. Create a Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click "Create app"
4. Fill in the details:
   - **App name**: 10K Hours App
   - **App description**: Productivity app for skill mastery
   - **Redirect URI**: `http://127.0.0.1:1420/spotify-callback`
   - **API/SDKs**: Web API
5. Click "Save"
6. Copy your **Client ID** from the app settings

### 2. Configure the App

1. Create a `.env` file in the root directory (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

2. Add your Spotify Client ID to `.env`:
   ```
   VITE_SPOTIFY_CLIENT_ID=your_client_id_here
   ```

3. Restart the dev server:
   ```bash
   npm run tauri:dev
   ```

### 3. Connect Spotify in Focus Mode

1. Open the app and go to **Focus Mode** (click Focus Mode in sidebar)
2. Click **"Connect Spotify"** button at the bottom
3. **Important**: A popup window should open for Spotify login
   - If no popup appears, check:
     - Browser popup blocker settings (allow popups for 127.0.0.1)
     - Console for errors (F12 → Console tab)
     - `.env` file exists with correct `VITE_SPOTIFY_CLIENT_ID`
     - Dev server was restarted after creating `.env`
4. Log in with your Spotify account in the popup
5. Grant the requested permissions
6. The popup will close automatically and show "Successfully connected!"
7. Close the popup if it doesn't auto-close

**Note**: After connecting, you may need to refresh the Focus Mode page to see the music controls.

### 4. Using Spotify Controls

Once connected, in Focus Mode you can:
- **Show/Hide Music Panel**: Toggle music controls
- **Play/Pause**: Control current playback
- **Next/Previous**: Skip tracks
- **Volume Control**: Adjust playback volume
- **Quick Playlists**: Start playing from your saved playlists
- **Disconnect**: Remove Spotify connection

## Required Spotify Permissions

The app requests these permissions:
- `user-read-playback-state` - See what you're currently playing
- `user-modify-playback-state` - Control playback (play, pause, skip)
- `user-read-currently-playing` - Read current track info
- `playlist-read-private` - Access your playlists
- `playlist-read-collaborative` - Access collaborative playlists

## Troubleshooting

### No popup window appears when clicking "Connect Spotify"
1. **Check if Client ID is set**:
   - Open browser console (F12)
   - Look for error: "Spotify Client ID not configured"
   - If you see this, make sure `.env` file exists with `VITE_SPOTIFY_CLIENT_ID=your_id`
   
2. **Check browser popup blocker**:
   - Look for a popup blocked icon in the address bar
   - Click it and select "Always allow popups from 127.0.0.1"
   - Try connecting again
   
3. **Verify dev server restart**:
   - After creating `.env`, you MUST restart `npm run tauri:dev`
   - Environment variables are only loaded on server start
   
4. **Check console for errors**:
   - Press F12 to open Developer Tools
   - Go to Console tab
   - Look for red error messages
   - Share the error if you need help

### "Failed to connect to Spotify"
- Make sure `VITE_SPOTIFY_CLIENT_ID` is set in `.env`
- Verify the Client ID is correct in Spotify Dashboard
- Restart the dev server after adding the `.env` file

### "Authentication expired"
- Click "Disconnect Spotify" and reconnect
- The app will automatically refresh tokens when needed

### No playback controls appear
- Make sure you have Spotify open and playing on a device
- The Web API requires an active Spotify session
- You need Spotify Premium for full playback control

### Popup blocked
- Allow popups for 127.0.0.1 in your browser settings
- The OAuth flow requires a popup window

### "This redirect URI is not secure" error
- Make sure you use `http://127.0.0.1:1420/spotify-callback` (NOT localhost)
- Spotify requires the explicit IPv4 address for HTTP redirect URIs

## Without Spotify

The app works perfectly fine without Spotify integration. All core features (skills, tasks, timer, analytics) work independently. Spotify is purely optional for background music during focus sessions.
