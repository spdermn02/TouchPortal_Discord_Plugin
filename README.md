# Touch Portal Plugin to Interact with Discord

- [Touch Portal Plugin to Interact with Discord](#touch-portal-plugin-to-interact-with-discord)
  - [Description](#description)
  - [Initial Setup or Reconfiguration](#initial-setup-or-reconfiguration)
    - [Steps the Video guides you through](#steps-the-video-guides-you-through)
  - [Buttons](#buttons)
- [How-To Upgrade to v3.0.0](#how-to-upgrade-to-v300)

## Description

Mute and Deafen Discord directly from Touch Portal with only Minor configuration needed

## Initial Setup or Reconfiguration
YouTube Video How-To Setup the Plugin: [https://youtu.be/NJOZKOGXnqw](https://youtu.be/NJOZKOGXnqw)

### Steps the Video guides you through
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
Discord Mute: (download)[resources/DiscordMute.tpb]

Discord Deafen: (download)[resources/DiscordDeafen.tpb]




<br><br>
# How-To Upgrade to v3.0.0

1. Windows
   1. Go to %APPDATA%\TouchPortal\plugins OR Users\\\<userid>\Documents\TouchPortal\plugins
2. Mac
   1. Go to User\\\<userid>\Documents\TouchPortal\plugins
3. create new folder config
4. go to TPDiscord folder
5. copy tpdiscord.db
6. go back to your newly created config directory, paste tpdiscord.db
7. Open TouchPortal and import new plugin .tpp file for your OS
8. This should utilize the file in the new config directory instead now.
   1. If you experience issues, please jump into the TouchPortal discord, and find the #discord channel