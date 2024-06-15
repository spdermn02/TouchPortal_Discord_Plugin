// TPCLIENT.js

const TP = require("touchportal-api");
const TPClient = new TP.Client();
const discordKeyMap = require("../utils/discordkeys.js");
const { DG } = require('../config.js');
const { logIt,  platform, app_monitor } = require('../utils/helpers.js');



// ON ACTION is in onAction.js
// ON CONNECTOR CHANGE is in onConnectorChange.js
// ON LIST CHANGE is in onListChange.js



// TPClient.on("Info", (data) => {
//     logIt("DEBUG","Info : We received info from Touch-Portal");

//     // Making sttes for Custom Voice Activity Users - allows users to have custom states for particular people
//     const states = ["id", "Speaking", "mute", "deaf", "avatar", "avatarID", "nick", "volume", "self_mute", "self_deaf", "server_mute" ];
//     for (let userId in DG.customVoiceAcivityUsers) {
//       for (let state of states) {
//         let customID = DG.customVoiceAcivityUsers[userId];
//         let stateId = `${customID}_${state}`;
//         let stateDesc = `${customID} ${state}`;
//         TPClient.createState(stateId, stateDesc, "", `${customID} - States`);
//       }
//     }

//     // Adding custom states for the users if present
//     let predefinedList = ["Self", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
//     let combinedList = predefinedList.concat(Object.values(DG.customVoiceAcivityUsers));
//     TPClient.choiceUpdate('voiceUserList', combinedList);

  
//     TPClient.choiceUpdate(DG.pttKeyStateId,Object.keys(discordKeyMap.keyboard.keyMap));
//     TPClient.stateUpdate('discord_running','Unknown');
//     TPClient.stateUpdate("discord_connected","Disconnected");
  
//     function createDefaultUserStates() {
//       for (let i = 0; i < 10; i++) {
          
//           for (let j = 0; j < DG.DEFAULTUSERSTATES.length; j++) {
//             const state = DG.DEFAULTUSERSTATES[j];
//             TPClient.createState(
//               `user_${i}_${state.id}`,
//               `VC | User ${i} ${state.title}`,
//               state.value,
//               `VC | User_${i}`
//             );
//           } 
//       }
//     }
//     // Call the function to create the default user states
//     createDefaultUserStates();

//   });

TPClient.on("Info", (data) => {
  logIt("DEBUG","Info : We received info from Touch-Portal");

  function createStates(prefix, states, group = `${prefix} - States`) {
      for (let state of states) {
          TPClient.createState(
              `${prefix}_${state.id}`,
              `${prefix} ${state.title}`,
              state.value,
              group
          );
      }
  }

  // Making states for Custom Voice Activity Users - allows users to have custom states for particular people
  for (let userId in DG.customVoiceAcivityUsers) {
      let customID = DG.customVoiceAcivityUsers[userId];
      createStates(customID, DG.DEFAULTUSERSTATES);
  }

  // Adding predefined states for the users
  TPClient.choiceUpdate(DG.pttKeyStateId,Object.keys(discordKeyMap.keyboard.keyMap));
  TPClient.stateUpdate('discord_running','Unknown');
  TPClient.stateUpdate("discord_connected","Disconnected");

  // Create the default user states
  for (let i = 0; i < 10; i++) {
      createStates(`user_${i}`, DG.DEFAULTUSERSTATES, `VC | User_${i}`);
  }
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
        console.log("DG.isRunning is: ", DG.isRunning)
        // if (!DG.isRunning) { // maybe not best solution but some reason this was being triggered more than once  thought maybe two clients loading but when sending message only one returns?
          console.log("Ok its running lets start process watcher")
          logIt('INFO',`Starting process watcher for ${app_monitor[platform]}`);
            DG.procWatcher.watch(app_monitor[platform]);
            
        // }
    }
    console.log("SETTINGS RECEIVED2")
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
  





module.exports = TPClient;
