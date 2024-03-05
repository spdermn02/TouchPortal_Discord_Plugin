<h1> Touch Portal Plugin to Interact with Discord </h1>
![](https://img.shields.io/github/downloads/spdermn02/TouchPortal_Discord_Plugin/total)

- [Touch Portal Plugin to Interact with Discord](#touch-portal-plugin-to-interact-with-discord)
  - [Description](#description)
  - [ChangeLog](#changelog)
  - [Plugin Capabilities](#plugin-capabilities)
    - [Actions](#actions)
    - [Connectors](#connectors)
    - [States](#states)
    - [Events](#events)
  - [Installation and Configuration](#installation-and-configuration)
  - [Known Issues \& Solutions](#known-issues--solutions)
    - [Discord Mute:](#discord-mute)
    - [Discord Deafen:](#discord-deafen)
    - [Discord Go To Channel](#discord-go-to-channel)
    - [Discord Voice Type](#discord-voice-type)
    - [Discord Voice Hangup](#discord-voice-hangup)
    - [Discord Push To Talk Keys](#discord-push-to-talk-keys)
- [Sample Page](#sample-page)
- [Cleanup pre-v4.0.0 config](#cleanup-pre-v400-config)
- [Dependencies](#dependencies)
- [Versioning](#versioning)
- [Authors](#authors)
- [License](#license)
- [Bugs/Enhancements](#bugsenhancements)
- [Acknowledgements](#acknowledgements)

## Description

Mute and Deafen Discord directly from Touch Portal with only Minor configuration needed<br>
Jump to specific Voice or Text channels on servers you joiend to <br>
Hangup voice calls<br>
See Voice Connection Stats (server, ping)<br>
Toggle/Set Push To Talk or Voice Activity Modes <br>
Set Push To Talk Hotkey Combinations<br>
Change Voice Settings<br>
Control Microphone/Speaker Volume via Sliders<br>
Open DM Text by ID<br>
Open DM Voice Call by ID<br>
Play Soundboard Sounds<br>
Push to Mute<br>
Push to Talk

## [ChangeLog](CHANGELOG.md)

## Plugin Capabilities
### Actions
 - Discord Mute - Mute yourself in Discord
 - Discord Deafen - Deafen yourself in Discord (inherently mutes as well)
 - Discord Voice Mode - Change between Voice Activity and Push-To-Talk Modes
 - Discord Hang Up - When in a voice call this will hang up the voice call
 - Discord Select Channel - go to a specific voice/text channel in a given server
 - Discord Reset Push To Talk Keys - resets array inside the plugin, doesn't affect Discord directly
 - Discord Push To Talk Key - adds key to the push to talk key array inside the plugin, doesn't affect Discord Directly
 - Discord Store Push To Talk Keys - store the key combinations in the push to talk key array to Discord to use with Push to Talk
 - Discord Auto Gain Control - Toggle/Enable/Disable Auto Gain Control
 - Discord Quality of Service Priority - Toggle/Enable/Disable Quality of Service Priority
 - Discord Echo Cancellation - Toggle/Enable/Disable Echo Cancellation
 - Discord Noise Suppression - Toggle/Enable/Disable Noise Suppression - if using Krisp, doesn't do anything to disable that
 - Discord Silence Warning - Toggle/Enable/Disable Silence Warning (not exactly sure what this does due to not much documentation around this)
 - Discord DM Voice Channel - Join a Personal or Group DM Voice Channel by Channel ID (Note: Does not ring the other person, it just forces you into the voice channel)
 - Discord DM Text Channel - Join a Personal or Group DM Text Channel by Channel ID
 - Discord Push To Talk - (only works in Voice Activity mode) - Un-Mutes/Deafens on hold, re-Mutes on release
 - Discord Push To Mute - (only works in Voice Activity mode) - Mutes/Deafens on hold, un-Mutes/Deafens on release
 - Discord Play Sound - Trigger Discord Soundboard sounds from Touch Portal
 - Discord Toggle Camera - Toggle the Camera on/off in Voice Chat
 - Discord Toggle Screenshare - Toggle the Screenshare on/off - when turned on will prompt to select what thing to screenshare.

### Connectors
 - Adjust Input Volume
   - Slider to control the Voice Volume
 - Adjust Output Volume
   - Slider to control the Speaker Volume

### States
 - Discord Mute 
   - Valid Values: On, Off
 - Discord Deafen
   - Valid Values: On, Off
 - Discord Voice Channel Connected
   - Valid Values: Yes, No
 - Discord Voice Channel Name 
   - Value: Connected voice channel name or 'Personal' &lt;None&gt;
   - Note: This will be 'Personal' when connecting an audio call outside of a server (through DM)
 - Discord Voice Channel ID 
   - Value: Connected voice channel id or &lt;None&gt;
 - Discord Voice Channel Server Name 
   - Value: Connected voice channel server name or 'Personal' or &lt;None&gt;
   - Note: This will be 'Personal' when connecting an audio call outside of a server (through DM)
- Discord Voice Channel Server ID 
   - Value: Connected voice channel server id or 'Personal' or &lt;None&gt;
   - Note: This will be 'Personal' when connecting an audio call outside of a server (through DM)
 - Discord Voice Average Ping
   - Value: in milliseconds
 - Discord Voice Hostname
   - Value: Voice Host connected to at Discord
 - Discord Voice Mode Type 
   - Valid Values: PUSH_TO_TALK, VOICE_ACTIVITY
 - Discord Process Running
   - Valid Values: Yes, No, Unknown 
   - Note: Windows only, Mac will always be Unknown (until I find a good process watcher script for MacOS)
 - Discord Connected
   - Valid Values: Connected, Disconnected
 - Discord Automatic Gain Control
   - Valid Values: On, Off
 - Discord Echo Cancellation
   - Valid Values: On, Off
 - Discord Noise Suppression
   - Valid Values: On, Off
 - Discord Quality of Service Priority
   - Valid Values: On, Off
 - Discord Voice Channel Participants
   - Value: Will be a string of all participants in the current voice channel separated by a `|` character (for now)
 - Discord Voice Channel Participants IDs
   - Value: Will be a string of all participant IDs in the current voice channel separated by a `|` character (for now)
 - Discord Voice Volume
   - Value: Number indicating your current Voice Volume
 - Discord Speaker Volume
   - Value: Number indicating your current Speaker Volume
 - Discord Camera 
   - Value: `On` or `Off` indicating camera status in voice call
 - Discord Screenshare
   - Value: `On` or `Off` indicating screen sharing status in voice call

### Events
This plugin does not use any hardcoded events, you will just want to use `When Plug-in state Changes` Event that is built into Touch Portal if you want to trigger things based on state changes from this plugin

## Installation and Configuration
1. Make sure Discord app is open on your PC or Mac
2. Download the .tpp file the installer for your OS from here: [Releases](https://github.com/spdermn02/TouchPortal_Discord_Plugin/releases/latest)
3. Go to Touch Portal Settings (the gear icon)
4. Go To Plug-ins
5. Click the Import Plug-in button
6. Navigate to the downloaded tpp file, select it and press Open
7. A popup should tell you Successfully Imported plugin
   1. If this is your first time importing, you will be asked To Trust the Plugin, to prevent this from popping up each time you start Touch Portal, click Trust Always
8. Now Select Touch Portal Discord Plugin in the dropdown on the Plug-ins settings page
9. The Discord Application page should have auto opened on your PC in your browser
   1. if not Visit: <a target="_blank" href="https://discord.com/developers/applications" > Discord Developer Portal </a>
10. Login with your Discord Credentials
11. **If you already have an application from previous plugin usage, click "OAuth2" and skip to Step 19.**
12. Go to "Applications" on the left side of the portal
13. Click "New Application" in the top right of the Applications page
14. Name your Application "Touch Portal Plugin" (or whatever you want to call it), and click "Create"
15. Go to "OAuth2" on the left side of the Site
16. Click the "Add Redirect" button
17. Enter in: `http://localhost` exactly, not trailing slash, and not https://
18. Click "Save Changes"
19. Locate the Client Id and click the "Copy" button, go to the Touch Portal Settings Window and paste in the client id into the "Discord Client Id" field
20. Go back to the developer portal website
21. Locate the Client Secret and click the "Reset Secret" button, If you have 2FA enabled it will ask for a Token
   1. Once the secret displays, click "Copy", go to Touch Portal Settings window and paste in the client secret into the "Discord Client Secret" field
   2. Example: <br> ![Discord Settings](resources/images/TP-Discord-Plugin-Config.png)
22. Click "Save" 
23. After a few seconds, you should get asked to authorize the application you created as a plugin in Discord,  click "Authorize"
    1.  These scopes are needed in order for my plugin to interact with your Discord app.
    ![TP Authorize](resources/images/Discord-Auth-Popup.png)
24. If for some reason, you mis-clicked and the authorize window went away
   1. Click the Stop button on the Touch Portal Discord Plugin settings page
   2. Then Click Start button and it should then re-ask you to authorize
25. Now you should be able to use the new functions of the Touch Portal Discord Plugin!

## Known Issues & Solutions
1. **My Buttons no longer work**
   1. Make sure Discord is open
   2. Go to Touch Portal Settings
   3. Click Plug-ins
   4. Select Touch Portal Discord Plugin in the dropdown
   5. Click Stop button
   6. Click Start Button
   7. Reauthorize the Plugin
1. **The server list blanked out**
   1. delete the action and readd it
   2. if that doesn't work stop and start the plugin as notated above
1. **The channel list blanked out**
   1. Change the server dropdown to a different server, and back again to the server you want
2. **Turn on Debug Log Mode**
   1. Go to Settings -> Plug-ins
   2. Select `Touch Portal Discord Plugin` in the dropdown
   3. set `Discord Debug Mode` to `On`
   4. click Save button
   5. to Turn off change it to `Off`

### Discord Mute: 
[Sample Mute Button](https://github.com/spdermn02/TouchPortal_Discord_Plugin/tree/master/resources/DiscordMute.tpb)
<br>![Discord Mute](resources/images/TP-Discord-Mute.gif)

### Discord Deafen: 
[Sample Deafen Button](https://github.com/spdermn02/TouchPortal_Discord_Plugin/tree/master/resources/DiscordDeafen.tpb)
<br>![Discord Deafen](resources/images/TP-Discord-Deafen.gif)

### Discord Go To Channel
![Discord Go To Channel](resources/images/TP-Discord-GoTo-Channel.gif)

### Discord Voice Type
![Discord Voice Type](resources/images/TP-Discord-VoiceType.gif)

### Discord Voice Hangup
![Discord Voice Hangup](resources/images/TP-Discord-Voice-Hangup.png)

### Discord Push To Talk Keys
*NOTE*: This DOES NOT press them, it sets them as the push to talk keys inside discord
<br>
![Discord PTT Keys](resources/images/TP-Discord-PTTKeys.gif)

# Sample Page
[Sample Page Download](https://github.com/spdermn02/TouchPortal_Discord_Plugin/tree/master/resources/TPDiscord-Sample.tpz)
<br>
Has a sample button for all actions, and states to display info (TODO: Need to update this page)

# Cleanup pre-v4.0.0 config
1) After importing v4.0.0 plugin
2) On Windows
   1) Go to %APPDATA%\TouchPortal\plugins
3) On Mac
   1) Go to /Users/&lt;Your User Name&gt;/Documents/TouchPortal/plugins
4) Delete the config folder (this was only used by this plugin)

# Dependencies
 - [discord-rpc](https://www.npmjs.com/package/discord-rpc)
 - [find-process](https://www.npmjs.com/package/find-process)
 - [out-url](https://www.npmjs.com/package/out-url)
 - [touchportal-api](https://www.npmjs.com/package/touchportal-api)
 - [pkg](https://www.npmjs.com/package/pkg)
 - [adm-zip](https://www.npmjs.com/package/adm-zip)

# Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/spdermn02/tpohm_plugin/tags).

# Authors

- **Jameson Allen** - _Initial work_ - [Spdermn02](https://github.com/spdermn02)

# License

This project is licensed under the GPL 3.0 License - see the [LICENSE](LICENSE) file for details

# Bugs/Enhancements
Use the Github Issues tab to report any bugs/enhancements for this plug-in. Or mention them in the Official Touch Portal discord channel #discord

# Acknowledgements
1. Thank you to Reinier and Ty the Touch Portal Creators
2. Thank you to all the users of the Discord Plugin
3. Thank you to [50 Shades of Skittles](https://www.twitch.tv/50_shades_of_skittles) for Testing
4. Thank you to Dominikk#5392 in the Touch Portal Discord for helping troubleshoot for 4.0.4 bug fix
5. Thank you Discord for not shutting down the RPC API
