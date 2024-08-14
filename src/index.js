const TP = require("touchportal-api");
const TPClient = new TP.Client();
const RPC = require("../discord-rpc/src/index.js");

const {DiscordConfig, pluginId} = require("./discordConfig.js");
const discordKeyMap = require("./utils/discordKeys.js");
const {logIt, convertPercentageToVolume, getUserIdFromIndex, platform, app_monitor, isEmpty, setDebugMode, createStates} = require("./utils/helpers.js");
const {procWatcher} = require("./core/processWatcher.js");
const {DiscordConnector} = require("./core/DiscordConnector.js");
const {UserStateHandler} = require("./handlers/discord/userStateHandler.js");
const {VoiceStateHandler} = require("./handlers/discord/voiceStateHandler.js");
const {NotificationHandler} = require("./handlers/discord/notificationHandler.js");
const {VoiceChannelHandler}= require("./handlers/discord/voiceChannelHandler.js");
const {onAction} = require("./handlers/touchportal/onAction.js");



// Issues
// Set Activity is not working properly, it is not updating the activity on discord (onAction.js)
// possible issue with Notification for DMs etc where if channel is a announcement channel it will return as a DM as it doesnt get a proper channel type.. its not voice/text basically? i dont know
// ^^ also doesn show for channel choice list..

// To Do
// Fix Set Activity
// Fix Crash when discord reboots for an update
// 


// ----------------------------------------------------
// On Info
// ----------------------------------------------------
TPClient.on("Info", (data) => {
  logIt("DEBUG", "Info : We received info from Touch-Portal");
  // Adding predefined states for the users
  TPClient.choiceUpdate(DG.pttKeyStateId, Object.keys(discordKeyMap.keyboard.keyMap));
  TPClient.stateUpdate("discord_running", "Unknown");
  TPClient.stateUpdate("discord_connected", "Disconnected");

  // Create the default user states

  for (let i = 0; i < 10; i++) {
    createStates(`user_${i}`, DG.DEFAULT_USER_STATES, `VC | User_${i}`, TPClient);
  }
});





// ----------------------------------------------------
// On Settings
// ----------------------------------------------------
TPClient.on("Settings", (data) => {
  logIt("DEBUG", "Settings: New Settings from Touch-Portal ");
  let reconnect = false;
  data.forEach((setting) => {
    let key = Object.keys(setting)[0];
    if (
      (DG.pluginSettings[key] == undefined || DG.pluginSettings[key] != setting[key]) &&
      ["Discord Client Id", "Discord Client Secret"].find((ele) => ele == key)
    ) {
      reconnect = true;
    }
    DG.pluginSettings[key] = setting[key];
   
    logIt("DEBUG", "Settings: Setting received for |" + key + "|");
  });

  // Setting the debug mode for logit
  setDebugMode(DG.pluginSettings["Discord Debug Mode"]);

  if (DG.pluginSettings["VoiceActivity Tracker - Seperate each ID by commas"].length > 0) {
    let customUsers =
      DG.pluginSettings["VoiceActivity Tracker - Seperate each ID by commas"].split(",");
    customUsers.forEach((user, index) => {
      DG.customVoiceAcivityUsers[user] = `Custom${index}`;
    });

    for (let userId in DG.customVoiceAcivityUsers) {
      try {
        let customID = DG.customVoiceAcivityUsers[userId];
        createStates({prefix:customID, states:DG.DEFAULT_USER_STATES, TPClient:TPClient});
      } catch (error) {}
    }
  }

  if (DG.accessToken != undefined) {
    if (reconnect) {
      logIt("INFO", "Settings: Reconnecting to Discord due to settings change");
      DG.Client.removeAllListeners();
      DG.Client.destroy();
      DG.Client = null;
      return;
    } else {
      return;
    }
  }

  if (platform != "win32" || DG.pluginSettings["Skip Process Watcher"].toLowerCase() == "yes") {
    TPClient.stateUpdate("discord_running", "Unknown");
    ProcWatcher.stopWatch();
    Discord.doLogin()
  } else if (
    platform == "win32" &&
    DG.pluginSettings["Skip Process Watcher"].toLowerCase() == "no"
  ) {
    logIt("INFO", `Starting process watcher for ${app_monitor[platform]}`);
    ProcWatcher.watch(app_monitor[platform]);
  }
});




// ----------------------------------------------------
// On Update
// ----------------------------------------------------
TPClient.on("Update", (curVersion, newVersion) => {
  logIt("DEBUG", "Update: current version:" + curVersion + " new version:" + newVersion);
  TPClient.sendNotification(
    `${pluginId}_update_notification`,
    `Discord Plugin Update Available (${newVersion})`,
    `\nPlease updated to get the latest bug fixes and new features\n\nCurrent Installed Version: ${curVersion}`,
    [
      {
        id: `${pluginId}_update_notification_go_to_download`,
        title: "Go To Download Location",
      },
    ]
  );
});




// ----------------------------------------------------
// On Notification Clicked
// ----------------------------------------------------
TPClient.on("NotificationClicked", (data) => {
  logIt("DEBUG", JSON.stringify(data));
  if (data.optionId === `${pluginId}_update_notification_go_to_download`) {
    open(DG.releaseUrl);
  }
});




// ----------------------------------------------------
// On TouchPortal Close
// ----------------------------------------------------
TPClient.on("Close", (data) => {
  logIt("WARN", "Closing due to TouchPortal sending closePlugin message");
  TPClient.stateUpdate("discord_running", "Unknown");
  TPClient.stateUpdate("discord_connected", "Disconnected");
  TPClient.settingUpdate("Plugin Connected", "Disconnected");
});




// ----------------------------------------------------
// On Action
// ----------------------------------------------------
TPClient.on("Action", (data, isHeld) => {
  if (DG.connected) {
    onAction(data, isHeld, DG);
  } else {
    logIt("WARN", "Action: Not connected to Discord, ignoring action");
  }
});




// ----------------------------------------------------
// On Connector Change
// ----------------------------------------------------
TPClient.on("ConnectorChange", (data) => {
    logIt("DEBUG", `Connector change event fired ` + JSON.stringify(data));
    const action = data.connectorId;
    if (DG.connected) {
      if (action === "discord_voice_volume_connector") {
        let newVol = parseInt(data.value, 10);
        newVol = Math.max(0, Math.min(newVol, 100));
        DG.Client.setVoiceSettings({
          input: {volume: convertPercentageToVolume(newVol)},
        });
      } else if (action === "discord_speaker_volume_connector") {
        let newVol = parseInt(data.value, 10);
        newVol = Math.max(0, Math.min(newVol, 100)) * 2;
        DG.Client.setVoiceSettings({
          output: {volume: convertPercentageToVolume(newVol)},
        });
      } else if (action === "discord_voice_volume_action_connector") {
        let newVol = parseInt(data.value, 10);
        newVol = Math.max(0, Math.min(newVol, 100)) * 2;
        const userId = getUserIdFromIndex(data.data[0].value, DG.currentVoiceUsers);
        if (userId !== undefined) {
          logIt("INFO", "Setting Voice Volume for ", userId, " to ", newVol);
          DG.Client.setUserVoiceSettings(userId, {
            volume: convertPercentageToVolume(newVol),
          });
        }
      } else {
        logIt("WARN", `Unknown action called ${action}`);
      }
    } else {
      logIt("WARN", "Action: Not connected to Discord, ignoring action");
    }
  
});


// ----------------------------------------------------
// On List Change
// ----------------------------------------------------
TPClient.on("ListChange", (data) => {
  logIt("DEBUG", "ListChange :" + JSON.stringify(data));
  if (isEmpty(DG.instanceIds[data.instanceId])) {
    DG.instanceIds[data.instanceId] = {};
  }
  if (isEmpty(DG.instanceIds[data.instanceId][data.actionId])) {
    DG.instanceIds[data.instanceId][data.actionId] = {};
  }

  if (data.actionId === "discord_setDefaultAudioDevice") {
    if (data.listId === "discord_DeviceType"){
      if (data.value === "Input") {
      TPClient.choiceUpdate("discord_SelectedDevice", DG.voiceSettings.inputDeviceNames);
      }else if (data.value === "Output") {
        TPClient.choiceUpdate("discord_SelectedDevice", DG.voiceSettings.outputDeviceNames);
      }
    }
  }
  if (data.actionId === "discord_select_channel" && data.listId !== "discordServerChannel") {
    DG.instanceIds[data.instanceId][data.actionId][data.listId] = data.value;

    let guildName = undefined;
    let channelType = "Text";

    if (!isEmpty(DG.instanceIds[data.instanceId][data.actionId].discordServerList)) {
      guildName = DG.instanceIds[data.instanceId][data.actionId].discordServerList;
    }

    if (!isEmpty(DG.instanceIds[data.instanceId][data.actionId].discordChannelType)) {
      channelType = DG.instanceIds[data.instanceId][data.actionId].discordChannelType;
    }

    if (isEmpty(guildName) || isEmpty(channelType)) {
      return;
    }

    if (!isEmpty(DG.guilds.idx) && DG.guilds.idx[guildName]) {
      let guildId = DG.guilds.idx[guildName];
      TPClient.choiceUpdateSpecific(
        "discordServerChannel",
        DG.channels[guildId][channelType.toLowerCase()].array,
        data.instanceId
      );
    }
  }
});



const DG = new DiscordConfig();
const ProcWatcher = new procWatcher();
const notificationHandler = new NotificationHandler(TPClient, DG);
const userStateHandler = new UserStateHandler(TPClient, DG );
const voiceChannelHandler = new VoiceChannelHandler(DG, TPClient, userStateHandler);
const voiceStateHandler = new VoiceStateHandler(DG,  TPClient, userStateHandler, notificationHandler, voiceChannelHandler);
const Discord = new DiscordConnector(TPClient, DG, RPC, userStateHandler, notificationHandler, voiceStateHandler);

voiceStateHandler.initiate_doLogin(Discord.doLogin);


// Process Watcher
ProcWatcher.on("processRunning", (processName) => {
  logIt("INFO", `${processName} detected as running`);
  TPClient.stateUpdate("discord_running", "Yes");

  // Lets shutdown the connection so we can re-establish it
  setTimeout(function () {
    logIt("INFO", "Discord is running, attempting to Connect");
    Discord.doLogin();
  }, 1000);
});

ProcWatcher.on("processTerminated", (processName) => {
  logIt("WARN", `${processName} not detected as running`);
  TPClient.stateUpdate("discord_running", "No");
  if (Discord.DG.Client) {
    Discord.DG.Client.removeAllListeners();
    Discord.DG.Client.destroy();
    Discord.DG.Client = null;
  }
});


logIt("INFO", "Initiating TP Client");
TPClient.connect({pluginId: pluginId, updateUrl: DG.updateUrl});


