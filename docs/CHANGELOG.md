<h1>Touch Portal Discord Plugin Change Log</h1>

### v4.4.0
  - Updates:
    - New States -
       - Discord Voice Channel Participants - will be a pipe delimited list of nicknames for users in your current voice channel you have joined. Will continually update as users join and leave.
       - All new states related to Voice Settings and Voice/Speaker Volume
       - Camera Status - `On` or `Off`
       - Screenshare Status - `On` or `Off`
    - New Actions - 
       - A bunch of new Audio based actions to control the different voice settings
       - New action to join DM based Text or Voice Channel by ID (voice does NOT ring the person, just joins voice channel)
       - Push To Mute - OnHold action to Mute/Deafen yourself while on hold, will un-mute/un-deafen when released
       - Push To Talk - OnHold action to UnMute/UnDeafen yourself while held, will re-mute when released
       - Play Soundboard Action - While in a voice call now play integrated or server specific sounds directly from Touch Portal
       - Toggle Camera - Toggle the your camera on/off
       - Toggle Screenshare - Toggle your screenshare on/off (if on will have to chose what to share)
    - New Connectors - Sliders to control input and output volumes
  - Bug Fixes:
    - There were a few related to joining and jumping around voice channels. most of these should be solved (if not open am Issue please) 
  - Refactor:
    - Using a new build process utilizing scripts/build.js instead of hard coding the build process in package.json, making it more generic as well.
    - improved Voice Settings changes to only send back relevant changes and not everything time.
    - New Scopes needed to handle some of the new functionality

### v4.3.1
  - Updates:
    - Improved Startup time of plugin by correctly loading Guild and Channel information
    - Modified Channel Create and Guild Create events to only handle their particular channel and/or guild so faster load times here too
      - Notes: this mostly went unnoticed if you weren't looking at Logs, but it was a problem and can cause issues
    - Updated to touchportal-api 3.2.0
    - Refactored entry.tp to a single file to support both windows and mac
  - Added:
    - Setting to enable Debug Mode or not 
      - Valid Values: Off or On
      - Purpose: Stop spam of messages to log unless needed for debugging purposes
    - Added in update notification process to actually utilize Touch Portal's notification system

### v4.3.0
  - Updates:
    - New State - Discord Process Running, will be `Yes`, `No`, `Unknown` (starts out as Unknown)
      - *Notes*: Windows Only will have all 3 values, MacOS will always be Unknown until a process watcher is implemented for MacOS
    - New State - Discord Connected, will be `Connected` or `Disconnected`

### v4.2.2
  - Bug Fix:
    - Mute and Deafen state value correction from `0ff` to `Off`
    - removed uneeded scope `messages.read` from discord scope list

### v4.2.1
  - Updates:
    - pull in latest version  3.1.2 of touchportal-api module (fixes update check failing and killing process)

### v4.2.0
  - Updates:
    - 3 New States - Discord Voice Channel ID, Discord Voice Channel Server, Discord Voice Channel Server ID

### v4.1.0
  - Package Update:
    - Update discord-rpc npm module to 4.0.1 - to pick up bug fix for #41 and ehancement #20
  - Updates:
    - No More Re-Auhtorization prompt if you have already authorized your developer app, so restarts will be clean and connect without issue
    - Refactored the event subscription process due to discord-rpc npm module update. Verified all events still fire as expected.

### v4.0.5
  - Package Update:
    - Update find-process npm module to 1.4.7 - to pick up bug fix for #32

### v4.0.4
  - Bug Fix:
    - Fixes ProcessWatcher for those who experienced issues, it now forces onto the environment path the directories needed for this to work (Windows only)

### v4.0.3
 - Bug Fix:
   - Fixing Voice Activity and PTT switching

### v4.0.2
 - Updates:
    - Setting to tell you if Discord was successfully connected to - Valid values are 'Disconnected' or 'Connected'
    - (Windows Only) Setting to disable the Process Watcher if for some reason your system isn't recongizing the application properly.
      - *Note*: This could require a stop/start of TPDiscord if Discord closes while authenticated, this can be done inside Touch Portal Settings -> Plug-Ins -> Select "Touch Portal Discord Plugin" and clicking the Stop button, wait a few seconds, click the Start button

### v4.0.1
  - Can't remember.. brain fried

### v4.0.0
 - Additions:
    - Action for Voice Mode Changes - PTT to Voice Activity (and back again)
    - Action for Push-To-Talk Hotkey Changing
    - Action to Go to specific Voice or Text channel within a Discord server you belong to
    - If in a Voice Channel allow you to hang up the call
    - Voice Connection Statistics
        Voice Server
        Ping Average
    - State for Voice Channel Connected to
    - State for Voice Mode Type
    - Watch for Discord.exe to be running before attempting to connect, polls every 10 seconds so could cause slight delay in connection if start up is slow (Win Only, still working Mac)
 - Updates:
    - Reworked to with Touch Portal v2.3 plugin api enhancement/changes
    - Settings moved from custom built config to inside Touch Portal (will require reconfiguration using discord dev app you already have setup)
      - Will now request authorization EACH time Touch Portal (or the plug-in) starts, this way guaranteeing your Access Token is fresh
        - *Note*: May be reworked in the future to store Access Token but found issues with this implementation during development. 
 - Bug Fixes:
    - Added bug fix from pre-v4.0.0 here as well - longer wait times between attempted reconnect

### pre-v4.0.0
  - Mute yourself in Discord
  - Deafen yourself in Discord
  - Worked on fixing connection issues