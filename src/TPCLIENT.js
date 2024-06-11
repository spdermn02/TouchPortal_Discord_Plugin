// TPCLIENT.js

const { logIt,  platform, app_monitor } = require('./helpers');
// const {convertPercentageToVolume, updateUrl,  getUserIdFromIndex} = require('./helpers');
const setupConnectorChangeListener = require('./connectors');


const TP = require("touchportal-api");
const TPClient = new TP.Client();
const discordKeyMap = require("./discordkeys");
const { DG } = require('./config.js');



TPClient.on("Info", (data) => {
    logIt("DEBUG","Info : We received info from Touch-Portal");

    // Setup TP Connector Listener
    setupConnectorChangeListener(TPClient);
  
    TPClient.choiceUpdate(DG.pttKeyStateId,Object.keys(discordKeyMap.keyboard.keyMap));
    TPClient.stateUpdate('discord_running','Unknown');
    TPClient.stateUpdate("discord_connected","Disconnected");
  
    function createDefaultUserStates() {
      for (let i = 0; i < 10; i++) {
          
          for (let j = 0; j < DG.DEFAULTUSERSTATES.length; j++) {
            const state = DG.DEFAULTUSERSTATES[j];
            TPClient.createState(
              `user_${i}_${state.id}`,
              `VC | User ${i} ${state.title}`,
              state.value,
              `VC | User_${i}`
            );
          } 
      }
    }
    // Call the function to create the default user states
    createDefaultUserStates();
  });




TPClient.on("Settings", (data) => {
    
    logIt("DEBUG","Settings: New Settings from Touch-Portal ");
    let reconnect = false;
    data.forEach( (setting) => {
      let key = Object.keys(setting)[0];
      if( (DG.pluginSettings[key] == undefined || DG.pluginSettings[key] != setting[key] ) && ["Discord Client Id","Discord Client Secret"].find( ele => ele == key) ) {
        reconnect = true;
      }
      DG.pluginSettings[key] = setting[key];
        logIt("DEBUG","Settings: Setting received for |"+key+"|");
    });
    if( DG.accessToken != undefined ) {
      if( reconnect) {
        logIt("INFO","Settings: Reconnecting to Discord due to settings change");
        DG.Client.removeAllListeners();
        DG.Client.destroy();
        DG.Client = null;
        return;
      }
      else {
        return;
      }
    }
    if( platform != 'win32' || DG.pluginSettings['Skip Process Watcher'].toLowerCase() == 'yes') {
      TPClient.stateUpdate('discord_running','Unknown');
      DG.procWatcher.stopWatch();
      doLogin();
    }
    else if( platform == 'win32' && DG.pluginSettings['Skip Process Watcher'].toLowerCase() == 'no' ){
        if (!DG.isRunning) { // maybe not best solution but some reason this was being triggered more than once  thought maybe two clients loading but when sending message only one returns?
            logIt('INFO',`Starting process watcher for ${app_monitor[platform]}`);
            DG.procWatcher.watch(app_monitor[platform]);
            
        }
    }
  });




TPClient.on("Update", (curVersion, newVersion) => {
    console.log("DEBUG","Update: current version:"+curVersion+" new version:"+newVersion);
    TPClient.sendNotification(`${DG.pluginId}_update_notification`,`Discord Plugin Update Available (${newVersion})`,
      `\nPlease updated to get the latest bug fixes and new features\n\nCurrent Installed Version: ${curVersion}`,
      [{id: `${DG.pluginId}_update_notification_go_to_download`, title: "Go To Download Location" }]
    );
});




TPClient.on("NotificationClicked", (data) => {
    logIt("DEBUG",JSON.stringify(data))
    if( data.optionId === `${DG.pluginId}_update_notification_go_to_download`) {
      open(DG.releaseUrl);
    }
});



TPClient.on("Close", (data) => {
    logIt("WARN","Closing due to TouchPortal sending closePlugin message");
    TPClient.stateUpdate('discord_running','Unknown');
    TPClient.settingUpdate(PLUGIN_CONNECTED_SETTING,"Disconnected");
});
  








// module.exports = { TPClient, setProcessWatcher };
module.exports = TPClient;
