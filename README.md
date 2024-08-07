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
  - [Troubleshooting Plugin](#troubleshooting-plugin)
- [Sample Buttons](#sample-buttons)
- [Sample Page](#sample-page)
- [Cleanup pre-v4.0.0 config](#cleanup-pre-v400-config)
- [Dependencies](#dependencies)
- [Versioning](#versioning)
- [Authors](#authors)
- [License](#license)
- [Bugs/Enhancements](#bugsenhancements)
- [Acknowledgements](#acknowledgements)

## Description

The Discord plugin for Touch Portal provides seamless integration, allowing users to control various Discord functionalities directly from Touch Portal with minimal configuration.

### Key Features:
- **Mute and Deafen**: Mute and deafen yourself in Discord effortlessly.
- **Channel Navigation**: Jump to specific voice or text channels on servers you have joined.
- **Call Management**: Hang up voice calls with a single tap.
- **Connection Stats**: View detailed voice connection statistics, including server information and ping.
- **Voice Mode Toggle**: Easily switch between Push-To-Talk and Voice Activity modes.
- **Hotkey Configurations**: Set and manage Push-To-Talk hotkey combinations.
- **Voice Settings Control**: Adjust various voice settings to optimize your Discord experience.
- **Volume Control**: Use sliders to control microphone and speaker volumes.
- **DM Management**: Open Direct Message text or voice calls by ID.
- **Soundboard Integration**: Play soundboard sounds directly through Touch Portal.
- **Push to Mute/Talk**: Utilize Push-To-Mute and Push-To-Talk features for better voice management.

This plugin simplifies your Discord interactions, bringing essential controls to your fingertips.


## [ChangeLog](CHANGELOG.md)

## Plugin Capabilities
### Actions
| **Action**                               | **Description**                                                                                         |
|------------------------------------------|---------------------------------------------------------------------------------------------------------|
| **Mute**                         | Mute yourself in Discord.                                                                               |
| **Deafen**                       | Deafen yourself in Discord (inherently mutes as well).                                                  |
| **Voice Mode**                   | Change between Voice Activity and Push-To-Talk Modes.                                                   |
| **Hang Up**                      | Hang up the voice call when in a voice call.                                                            |
| **Select Channel**               | Go to a specific voice/text channel in a given server.                                                  |
| **Reset Push To Talk Keys**      | Resets the array inside the plugin; doesn't affect Discord directly.                                    |
| **Push To Talk Key**             | Adds a key to the push-to-talk key array inside the plugin; doesn't affect Discord directly.            |
| **Store Push To Talk Keys**      | Store the key combinations in the push-to-talk key array to Discord for use with Push to Talk.          |
| **Auto Gain Control**            | Toggle/Enable/Disable Auto Gain Control.                                                                |
| **Quality of Service Priority**  | Toggle/Enable/Disable Quality of Service Priority.                                                      |
| **Echo Cancellation**            | Toggle/Enable/Disable Echo Cancellation.                                                                |
| **Noise Suppression**            | Toggle/Enable/Disable Noise Suppression. If using Krisp, this does nothing to disable that.             |
| **Silence Warning**              | Toggle/Enable/Disable Silence Warning. (Not much documentation available on this.)                      |
| **DM Voice Channel**             | Join a Personal or Group DM Voice Channel by Channel ID. Note: Does not ring the other person; it just forces you into the voice channel. |
| **DM Text Channel**              | Join a Personal or Group DM Text Channel by Channel ID.                                                 |
| **Push To Talk**                 | (Only works in Voice Activity mode) Un-mutes/Deafens on hold; re-mutes on release.                      |
| **Push To Mute**                 | (Only works in Voice Activity mode) Mutes/Deafens on hold; un-mutes/Deafens on release.                 |
| **Play Sound**                   | Trigger Discord Soundboard sounds from Touch Portal.                                                    |
| **Toggle Camera**                | Toggle the Camera on/off in Voice Chat.                                                                 |
| **Toggle Screenshare**           | Toggle the Screenshare on/off. When turned on, it will prompt to select what to screenshare.            |


### Connectors
| **Connector**           | **Description**                                     |
|-------------------------|-----------------------------------------------------|
| **Adjust Input Volume** | Slider to control the Voice Volume                  |
| **Adjust Output Volume**| Slider to control the Speaker Volume                |


### States
| **State**                               | **Description**                                                                                         |
|-----------------------------------------|---------------------------------------------------------------------------------------------------------|
| **Mute**                        | Valid Values: On, Off                                                                                   |
| **Deafen**                      | Valid Values: On, Off                                                                                   |
| **Voice Channel Connected**     | Valid Values: Yes, No                                                                                   |
| **Voice Channel Name**          | Value: Connected voice channel name or 'Personal' <None>                                                |
| **Voice Channel ID**            | Value: Connected voice channel id or <None>                                                             |
| **Voice Channel Server Name**   | Value: Connected voice channel server name or 'Personal' or <None>                                      |
| **Voice Channel Server ID**     | Value: Connected voice channel server id or 'Personal' or <None>                                        |
| **Voice Average Ping**          | Value: in milliseconds                                                                                  |
| **Voice Hostname**              | Value: Voice Host connected to at Discord                                                               |
| **Voice Mode Type**             | Valid Values: PUSH_TO_TALK, VOICE_ACTIVITY                                                              |
| **Process Running**             | Valid Values: Yes, No, Unknown<br>Note: Currently Windows only, Mac coming soon |
| **Connected**                   | Valid Values: Connected, Disconnected                                                                   |
| **Automatic Gain Control**      | Valid Values: On, Off                                                                                   |
| **Echo Cancellation**           | Valid Values: On, Off                                                                                   |
| **Noise Suppression**           | Valid Values: On, Off                                                                                   |
| **Quality of Service Priority** | Valid Values: On, Off                                                                                   |
| **Voice Volume**                | Value: Number indicating your current Voice Volume                                                      |
| **Speaker Volume**              | Value: Number indicating your current Speaker Volume                                                    |
| **Camera**                      | Value: On or Off indicating camera status in voice call                                                 |
| **Screenshare**                 | Value: On or Off indicating screen sharing status in voice call                                         |
| **Voice Channel Participants**  | Value: Will be a string of all participants in the current voice channel separated by a | character (for now) |
| **Voice Channel Participants IDs** | Value: Will be a string of all participant IDs in the current voice channel separated by a | character (for now) |

### Events
| **Event**              | **Description**                                     |
|------------------------|-----------------------------------------------------|
| **Discord DM**         | Triggered when a Direct Message is received         |
| **Discord Notification** | Triggered when a Notification is received          |


## Installation and Configuration
(VIDEO COMING SOON)<br>
 <img src="https://github.com/user-attachments/assets/ac721f86-e70b-4756-a56c-9ea8a25da0f0" alt="HOW TO INSTALL (THUMB)" style="width: 300px;">
<details>
<summary>HOW TO - Installation and Configuration (CLICK TO EXPAND)</summary>
  
1. **Ensure Discord is Open**
   - Make sure the Discord app is open on your PC or Mac.

2. **Download the Plugin**
   - Download the `.tpp` file for your OS from [Releases](https://github.com/spdermn02/TouchPortal_Discord_Plugin/releases/latest).

3. **Import the Plugin into Touch Portal**
   - Open Touch Portal and go to **Settings** (gear icon).
   - Navigate to **Plug-ins**.
   - Click the **Import Plug-in** button.
   - Select the downloaded `.tpp` file and press **Open**.
   - A popup should confirm the plugin was successfully imported.
   - If this is your first import, you'll be asked to **Trust** the Plugin. To prevent this prompt in the future, click **Trust Always**.

4. **Configure the Plugin**
   - Select **Touch Portal Discord Plugin** from the dropdown on the Plug-ins settings page.

5. **Set Up Your Discord Application**
   - The Discord Application page should automatically open in your browser. If not, visit the [Discord Developer Portal](https://discord.com/developers/applications).
   - Log in with your Discord credentials.

6. **Create a New Application**
   - If you already have an application from previous plugin usage, skip to Step 8.
   - Go to **Applications** on the left side.
   - Click **New Application** in the top right.
   - Name your application (e.g., "Touch Portal Plugin") and click **Create**.

7. **Configure OAuth2 Settings**
   - Go to **OAuth2** on the left side.
   - Click **Add Redirect**.
   - Enter `http://localhost` (without trailing slash or `https://`) and click **Save Changes**.

8. **Get Your Client ID and Secret**
   - Locate the **Client ID** and click **Copy**. Paste it into the "Discord Client Id" field in the Touch Portal Settings.
   - Locate the **Client Secret** and click **Reset Secret**. If 2FA is enabled, enter your token.
     - Once the secret displays, click **Copy** and paste it into the "Discord Client Secret" field in the Touch Portal Settings.
       <br> <img src="resources/images/TP-Discord-Plugin-Config.png" alt="Discord Settings" style="width: 350px;">


9. **Authorize the Application**
   - Click **Save**.
   - After a few seconds, authorize the application when prompted in Discord. Click **Authorize**.
     - These scopes are required for the plugin to interact with your Discord app.
     <br> <img src="resources/images/Discord-Auth-Popup.png" alt="TP Authorize" style="width: 300px;">

10. **Reauthorize if Necessary**
    - If the authorization window closes unexpectedly:
      - Click the **Stop** button on the Touch Portal Discord Plugin settings page.
      - Click **Start** to reinitiate the authorization process.

11. **Start Using the Plugin**
    - You should now be able to use the new functions of the Touch Portal Discord Plugin!

</details>

## Troubleshooting Plugin
<details>
  <summary><strong>My Buttons no longer work (Click to Expand)</strong></summary>
  <ol>
    <li>Make sure Discord is open.</li>
    <li>Go to Touch Portal Settings.</li>
    <li>Click Plug-ins.</li>
    <li>Select Touch Portal Discord Plugin in the dropdown.</li>
    <li>Click Stop button.</li>
    <li>Click Start Button.</li>
    <li>Reauthorize the Plugin.</li>
  </ol>
</details>

<details>
  <summary><strong>The server list blanked out (Click to Expand)</strong></summary>
  <ol>
    <li>Delete the action and re-add it.</li>
    <li>If that doesn't work, stop and start the plugin as noted above.</li>
  </ol>
</details>

<details>
  <summary><strong>The channel list blanked out </strong></summary>
  <ol>
    <li>Change the server dropdown to a different server, then back again to the server you want.</li>
  </ol>
</details>

<details>
  <summary><strong>Turn on Debug Log Mode (Click to Expand)</strong></summary>
  <ol>
    <li>Go to Settings -> Plug-ins.</li>
    <li>Select `Touch Portal Discord Plugin` in the dropdown.</li>
    <li>Set `Discord Debug Mode` to `On`.</li>
    <li>Click Save button.</li>
    <li>To turn off, change it to `Off`.</li>
  </ol>
</details>

## Sample Buttons

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
