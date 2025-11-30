# 🚀 Run Your App Now!

## Step 1: Verify Prerequisites

Open PowerShell and check:

```powershell
node --version
# Should show v18 or higher

rustc --version
# Should show rustc 1.x.x

cargo --version
# Should show cargo 1.x.x
```

If any are missing, see `SETUP.md` for installation instructions.

## Step 2: Start the App

```powershell
cd "d:\SNK\Projects\PA"
npm run tauri:dev
```

**What happens:**
1. Vite starts dev server (http://localhost:1420)
2. Tauri compiles Rust code (first time: 2-5 minutes)
3. App window opens automatically
4. Hot reload enabled for React changes

## Step 3: Try It Out!

### Create Your First Skill

1. Click **"Skills"** in the sidebar
2. Click **"New Skill"** button (top right)
3. Fill in:
   - Skill Name: `Learn Programming`
   - Goal Hours: `10000` (or any number)
   - Description: `Master software development`
   - Color: Pick any color
4. Click **"Create Skill"**
5. Click the skill card to make it **active**

### See Your Flip Timer

1. Click **"Dashboard"** in the sidebar
2. Watch the flip timer counting down from your goal!
3. Your stats appear below (Total Hours, Streak, Active Skills)

### Test the Pomodoro Timer

1. Go back to **"Skills"**
2. Create a second skill or use existing one
3. *(Note: Kanban not built yet, so Pomodoro needs task integration)*
4. For now, timer is visible on Dashboard when skill is active

## What You'll See

### Dashboard
```
┌─────────────────────────────────────┐
│  Welcome back, User                 │
│  Currently working on: [Skill Name] │
├─────────────────────────────────────┤
│                                     │
│    [FLIP TIMER COUNTDOWN]           │
│    9999:23:45:12                    │
│                                     │
├─────────────────────────────────────┤
│  Total Hours  │  Streak  │  Skills │
│     0.0       │   🔥 0   │    1    │
└─────────────────────────────────────┘
```

### Skills Page
```
┌──────────────────────────────────────┐
│  Skills              [+ New Skill]   │
├──────────────────────────────────────┤
│  ┌─────────────────┐  ┌────────────┐│
│  │ 🟢 Learn Python │  │ 🔵 Guitar  ││
│  │ 0.0 / 10000 h   │  │ 5.2 / 1000h││
│  │ ▓░░░░░░░░░ 0%   │  │ ▓▓░░░░ 52% ││
│  │ Active Skill    │  │            ││
│  └─────────────────┘  └────────────┘│
└──────────────────────────────────────┘
```

## Common First-Run Issues

### "Error: Command failed"
**Cause:** Rust not installed or not in PATH

**Fix:**
```powershell
rustup update
rustup default stable
```

### "Port 1420 in use"
**Cause:** Previous dev server still running

**Fix:**
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 1420).OwningProcess | Stop-Process
```

### "Cannot find module 'react'"
**Cause:** Dependencies not installed

**Fix:**
```powershell
npm install
```

### Window opens but blank screen
**Cause:** Build error, check terminal

**Fix:** Look for errors in the PowerShell window running `tauri:dev`

## Development Tips

### Hot Reload
- Edit any `.tsx` file in `src/`
- Save the file
- App window updates automatically (no restart needed)

### View Console Logs
- Right-click in app window
- Select "Inspect Element" or press `F12`
- Console tab shows frontend logs
- PowerShell terminal shows backend (Rust) logs

### Stop the App
- Press `Ctrl+C` in PowerShell
- Or close the app window

### Restart Fresh
```powershell
# Stop current dev server (Ctrl+C)
# Then restart
npm run tauri:dev
```

## Database Location

Your data is stored in:
```
C:\Users\[YourName]\AppData\Roaming\com.10khours.app\app.db
```

To view/edit:
```powershell
# Install SQLite if needed
# Open database
sqlite3 "$env:APPDATA\com.10khours.app\app.db"

# List all skills
SELECT * FROM skills;

# Exit
.quit
```

## What Works Right Now

✅ **Create skills** - Full CRUD operations  
✅ **Set active skill** - Click any skill card  
✅ **Flip timer** - Counts down to your goal  
✅ **Progress tracking** - Visual bars show completion  
✅ **Streak tracking** - Daily activity logging  
✅ **Stats dashboard** - Total hours, streaks, skill count  
✅ **Navigation** - Smooth page transitions  
✅ **Minimal UI** - Clean black/white Notion-style  

## What's Coming Soon

⏳ Tasks & Kanban board  
⏳ Profile with calendar heatmap  
⏳ Achievement badges  
⏳ Reflection journal  
⏳ Focus mode  
⏳ Spotify integration  

## Next Steps

1. **Create some skills** - Try different goal hours
2. **Set one as active** - Watch the flip timer
3. **Check the dashboard** - See your stats
4. **Explore the code** - All files are documented
5. **Add features** - See `IMPLEMENTATION_SUMMARY.md` for guidance

## Need Help?

- Check `SETUP.md` for detailed troubleshooting
- Check `IMPLEMENTATION_SUMMARY.md` for what's built
- Look at terminal output for error messages
- Verify all prerequisites are installed

---

## Quick Test Checklist

- [ ] App window opens
- [ ] Sidebar shows 5 menu items
- [ ] Dashboard displays welcome message
- [ ] Can navigate to Skills page
- [ ] Can create a new skill
- [ ] Skill appears in grid
- [ ] Can click skill to make it active
- [ ] Dashboard flip timer updates
- [ ] Stats show on dashboard

If all checked ✅ - **You're ready to start tracking your 10,000 hours!** 🎉

---

**Pro Tip:** Keep the PowerShell terminal open while developing - it shows useful logs and build info!
