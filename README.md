# Touch Portal Plugin to Interact with Discord

- [Touch Portal Plugin to Interact with Discord](#touch-portal-plugin-to-interact-with-discord)
  - [Description](#description)
  - [ChangeLog](#changelog)
  - [Plugin Capabilities](#plugin-capabilities)
    - [Actions](#actions)
    - [States](#states)
  - [Initial Setup or Reconfiguration](#initial-setup-or-reconfiguration)
    - [Steps the Video guides you through](#steps-the-video-guides-you-through)
  - [Buttons](#buttons)
- [Cleanup pre-v4.0.0 config](#cleanup-pre-v400-config)

## Description

Mute and Deafen Discord directly from Touch Portal with only Minor configuration needed<br>
Jump to specific Voice or Text channels on servers you joiend to <br>
Hangup voice calls<br>
See Voice Connection Stats (server, ping)<br>
Toggle/Set Push To Talk or Voice Activity Modes <br>
Set Push To Talk Hotkey Combinations<br>

## ChangeLog
```
pre-v4.0.0
  - Mute yourself in Discord
  - Deafen yourself in Discord
  - Worked on fixing connection issues
v4.0.0
  Additions:
    - Action for Voice Mode Changes - PTT to Voice Activity (and back again)
    - Action for Push-To-Talk Hotkey Changing
    - Action to Go to specific Voice or Text channel within a Discord server you belong to
    - If in a Voice Channel allow you to hang up the call
    - Voice Connection Statistics
        Voice Server
        Ping Average
    - State for Voice Channel Connected to
    - State for Voice Mode Type
  Updates:
    - Reworked to with Touch Portal v2.3 plugin api enhancement/changes
    - Settings moved from custom built config to inside Touch Portal (will require reconfiguration using discord dev app you already have setup)
      - Will now request authorization EACH time Touch Portal (or the plug-in) starts, this way guaranteeing your Access Token is fresh
        - *Note*: May be reworked in the future to store Access Token but found issues with this implementation during development. 
  Bug Fixes:
    - Added bug fix from pre-v4.0.0 here as well - longer wait times between attempted reconnect
```

## Plugin Capabilities
### Actions
 - Discord Mute - Mute yourself in Discord
 - Discord Deafen - Deafen yourself in Discord (inherently mutes as well)
 - Discord Hang Up - When in a voice call this will hang up the voice call
 - Discord Select Channel - go to a specific voice/text channel in a given server
 - Discord Reset Push To Talk Keys - resets array inside the plugin, doesn't affect Discord directly
 - Discord Push To Talk Key - adds key to the push to talk key array inside the plugin, doesn't affect Discord Directly
 - Discord Store Push To Talk Keys - store the key combinations in the push to talk key array to Discord to use with Push to Talk
 - Discord Voice Input Volume - set/up/down your voice input volume - __TODO__
 - Discord Voice Output Volume - set/up/down your voice output volume - __TODO__

### States
 - Discord Mute (Yes/No)
 - Discord Deafen (Yes/No)
 - Discord Voice Channel Connected (Yes/No)
 - Discord Voice Channle Name (Connected channel name/&lt;None&gt;)
 - Discord Voice Average Ping (value is in milliseconds)
 - Discord Voice Hostname
 - Discord Voice Mode Type (PUSH_TO_TALK/VOICE_ACTIVITY)
 - Discord Voice Input Volume - __TODO__
 - Discord Voice Output Volume - __TODO__
## Initial Setup or Reconfiguration
__TODO__ - Need to remake  <br/>
YouTube Video How-To Setup the Plugin: [https://youtu.be/NJOZKOGXnqw](https://youtu.be/NJOZKOGXnqw)

### Steps the Video guides you through
__TODO__ - Need to update for v4.0.0 changes <br/>
<ol>
                  <li>Make sure Discord Application is open on your PC</li>
                  <li>
                    Visit:
                    <a
                      target="_blank"
                      href="https://discord.com/developers/applications"
                    >
                      Discord Developer Portal
                    </a>
                  </li>
                  <li>Login with your Discord Credentials</li>
                  <li>Go to "Applications" on the left side of the portal</li>
                  <li>
                    Click "New Application" in the top right of the Applications
                    page
                  </li>
                  <li>
                    Name your Application "Touch Portal Plugin" (or whatever you
                    want to call it), and click "Create"
                  </li>
                  <li>Go to "OAuth2" on the left side of the Site</li>
                  <li>Click the "Add Redirect" button</li>
                  <li>Enter in: http://localhost</li>
                  <li>
                    Go to OAuth2 URL Generator section, and in the dropdown
                    "SELECT REDIRECT URL" select the only entry
                  </li>
                  <li>Click "Save Changes"</li>
                  <li>
                    Go to "General Information" on the left side of the Site
                  </li>
                  <li>
                    Locate the Client Id and click the "Copy" button, go to the
                    other site that was open (<a href="http://localhost:9403"
                      >http://localhost:9403</a
                    >) and paste in the client id into the "Discord App Client
                    ID:" field
                  </li>
                  <li>Go back to the developer portal website</li>
                  <li>
                    Locate the Client Secret and click the "Copy" butto, go to
                    the other site that was open (<a
                      href="http://localhost:9403"
                      >http://localhost:9403</a
                    >) and paste in the client secret into the "Discord App
                    Client Secret:" field
                  </li>
                  <li>
                    Click "STORE", if for some reason you need to start over,
                    click "RESET"
                  </li>
                  <li>
                    At this point, you should get a pop-up in Discord to
                    authorize your "Touch Portal Plugin" to access your discord,
                    click "Authorize"
                  </li>
                  <li>
                    Now setup your Mute and Deafen buttons inside Touch Portal
                    and you are all set to go
                  </li>
                </ol>

## Buttons
__TODO__ Fix Broken Links <br/>
Discord Mute: (download)[resources/DiscordMute.tpb]

Discord Deafen: (download)[resources/DiscordDeafen.tpb]

__TODO__ Add example images/buttons for other new features


<br><br>

# Cleanup pre-v4.0.0 config
1) After importing v4.0.0 plugin
2) On Windows
   1) Go to %APPDATA%\TouchPortal\plugins
3) On Mac
   1) Go to /Users/&lt;Your User Name&gt;/Documents/TouchPortal/plugins
4) Delete the config folder (this was only used by this plugin)