// Discord Connector

const RPC = require("../../discord-rpc/src/index.js");
const { open } = require("out-url");
const { DG } = require('../discord_config.js');
const { logIt, isEmpty} = require('../utils/helpers.js');
const TPClient = require('./TPCLIENT.js');

const { VoiceStateHandler } = require('../handlers/discord/voiceStateHandler.js');







class DiscordConnector {
        constructor() {
        }
        
         connectToDiscord = () => {
          try {
            DG.Client = new RPC.Client({ transport: "ipc" });

            const voiceStateHandler = new VoiceStateHandler(CD.doLogin);
            voiceStateHandler.registerEvents();

            this.discordLogin();
          } catch (error) {
            logIt("ERROR","Error connecting to Discord",error);
          }
        }

        discordLogin = () => {
          console.log(DG.accessToken)
            DG.Client.login({
              clientId : DG.pluginSettings["Discord Client Id"],
              clientSecret: DG.pluginSettings["Discord Client Secret"],
              accessToken: DG.accessToken,
              scopes: DG.scopes,
              redirectUri: DG.redirectUri,
              prompt: 'none'
            }).catch((error) => {
              logIt("ERROR","login error",error);
              if( error.code == 4009 ) {
                DG.connecting = false;
                DG.accessToken = null;
                logIt("INFO","Attempting Login again");
                this.doLogin();
              }
            });
          }
          
          // Discord Login 
        waitForClientId = (timeoutms) =>
            new Promise((r, j) => {
              const check = () => {
                if (!isEmpty(DG.pluginSettings["Discord Client Id"]) && !isEmpty(DG.pluginSettings["Discord Client Secret"])) {
                
                  r();
                } else if ((timeoutms -= 1000) < 0) { 
                  j("timed out, restart Touch Portal!"); 
                }
                else setTimeout(check, 1000);
              };
              setTimeout(check, 1000);
            });
          
        waitForLogin = () =>
            new Promise((r, j) => {
            DG.connecting = true;
            const check = () => {
                if (DG.Client && DG.Client.user != null) {
                DG.connecting = false;
                r();
                } else {
                  this.connectToDiscord();
                if (DG.Client && DG.Client.user != null) {
                    DG.connecting = false;
                    r();
                } else { 
                    setTimeout(check, 5000);
                }
                }
            };
            setTimeout(check,500);
        });
          
        doLogin = async () => {
            if( DG.connecting ) { return; }
            if( DG.Client ) {
            DG.Client.removeAllListeners();
            DG.Client.destroy();
            DG.Client = null;
            }
            
            if (isEmpty(DG.pluginSettings["Discord Client Id"]) || isEmpty(DG.pluginSettings["Discord Client Secret"]) ) {
                open(`https://discord.com/developers/applications`);
                
                await this.waitForClientId(30 * 60 * 1000); // wait for 30 minutes
            }

            // Start Login process
            console.log("Waiting for Login")
            await this.waitForLogin(); 
            }  
  }


  // Defining Connect Clast as CD
  const  CD = new DiscordConnector();

// async function connectAndSetup() {
  // console.log("About to doLogin()")
  // await CD.doLogin();

  // const voiceStateHandler = new VoiceStateHandler(DG.Client, CD.doLogin);
  // voiceStateHandler.registerEvents();
// }





// Can/should we move this to its own func?
DG.procWatcher.on('processRunning', (processName) => {
  logIt('INFO',`${processName} detected as running`);
  DG.isRunning = true;
  TPClient.stateUpdate('discord_running',DG.isRunning ? 'Yes' : 'No');
  // Lets shutdown the connection so we can re-establish it
  setTimeout(function() {
      logIt('INFO', "Discord is running, attempting to Connect");
      CD.doLogin();
  }, 1000);
});

DG.procWatcher.on('processTerminated', (processName) => {
  logIt('WARN',`${processName} not detected as running`);
  if( !DG.isRunning ) {
      // We already did this once, don't need to keep repeating it
      return;
  }
  logIt('WARN',`Disconnect active connections to Discord`);
  DG.isRunning = false;
  TPClient.stateUpdate('discord_running',DG.isRunning ? 'Yes' : 'No');
  if ( DG.Client ) {
    DG.Client.removeAllListeners();
    DG.Client.destroy();
    DG.Client = null;
  }
});




// export { CD };



  

  module.exports = { DiscordConnector };
  