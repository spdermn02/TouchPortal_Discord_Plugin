const TP = require("touchportal-api");
const TPClient = new TP.Client();
const RPC = require("../discord-rpc/src/index.js");

const {DG} = require("./discord_config.js");
const {pluginId} = require("./discord_config.js");
const discordKeyMap = require("./utils/discordKeys.js");
const {logIt, convertPercentageToVolume, getUserIdFromIndex, platform, app_monitor, isEmpty, setDebugMode} = require("./utils/helpers.js");
const {DiscordConnector} = require("./core/DiscordConnector.js");
const {UserStateHandler} = require("./handlers/discord/userStateHandler.js");
const {VoiceStateHandler} = require("./handlers/discord/voiceStateHandler.js");
const {NotificationHandler} = require("./handlers/discord/notificationHandler.js");
const {VoiceChannelHandler}= require("./handlers/discord/voiceChannelHandler.js");
const {onAction} = require("./handlers/touchportal/onAction.js");




// ----------------------------------------------------
// On Info
// ----------------------------------------------------
TPClient.on("Info", (data) => {
  console.log("Info Triggered.. creating default user states");
  logIt("DEBUG", "Info : We received info from Touch-Portal");
  // Adding predefined states for the users
  TPClient.choiceUpdate(DG.pttKeyStateId, Object.keys(discordKeyMap.keyboard.keyMap));
  TPClient.stateUpdate("discord_running", "Unknown");
  TPClient.stateUpdate("discord_connected", "Disconnected");

  // Create the default user states

  for (let i = 0; i < 10; i++) {
    createStates(`user_${i}`, DG.DEFAULT_USER_STATES, `VC | User_${i}`);
  }
});





// ----------------------------------------------------
// On Settings
// ----------------------------------------------------
TPClient.on("Settings", (data) => {
  console.log("Settings triggered.. creating custom user states");

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

  setDebugMode(DG.pluginSettings["Discord Debug Mode"]);
  // console.log("Debug mode: ", DG.pluginSettings["Discord Debug Mode"]);

  if (DG.pluginSettings["VoiceActivity Tracker - Seperate each ID by commas"].length > 0) {
    let customUsers =
      DG.pluginSettings["VoiceActivity Tracker - Seperate each ID by commas"].split(",");
    customUsers.forEach((user, index) => {
      DG.customVoiceAcivityUsers[user] = `Custom${index}`;
    });

    for (let userId in DG.customVoiceAcivityUsers) {
      try {
        let customID = DG.customVoiceAcivityUsers[userId];
        createStates(customID, DG.DEFAULT_USER_STATES);
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
    DG.procWatcher.stopWatch();
    doLogin();
  } else if (
    platform == "win32" &&
    DG.pluginSettings["Skip Process Watcher"].toLowerCase() == "no"
  ) {
    logIt("INFO", `Starting process watcher for ${app_monitor[platform]}`);
    DG.procWatcher.watch(app_monitor[platform]);
  }
});




// ----------------------------------------------------
// On Update
// ----------------------------------------------------
TPClient.on("Update", (curVersion, newVersion) => {
  console.log("DEBUG", "Update: current version:" + curVersion + " new version:" + newVersion);
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
  TPClient.settingUpdate(PLUGIN_CONNECTED_SETTING, "Disconnected");
});




// ----------------------------------------------------
// On Action
// ----------------------------------------------------
TPClient.on("Action", (data, isHeld) => {
  onAction(data, isHeld);
});




// ----------------------------------------------------
// On Connector Change
// ----------------------------------------------------
TPClient.on("ConnectorChange", (data) => {
    logIt("DEBUG", `Connector change event fired ` + JSON.stringify(data));
    const action = data.connectorId;
  
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

function createStates(prefix, states, group = `${prefix} - States`) {
  for (let state of states) {
    let stateId = `${prefix}_${state.id}`;
    if (!TPClient.customStates[stateId]) {
      // Check if the state already exists
      TPClient.createState(stateId, `${prefix} ${state.title}`, state.value, group);
    }
  }
}




const notificationHandler = new NotificationHandler(TPClient, DG);
const userStateHandler = new UserStateHandler(TPClient, DG );
const voiceChannelHandler = new VoiceChannelHandler(DG, TPClient, userStateHandler);
const voiceStateHandler = new VoiceStateHandler(DG,  TPClient, userStateHandler, notificationHandler, voiceChannelHandler);
// voiceStateHandler.registerEvents(); - happens inside of DiscordConnector

const Discord = new DiscordConnector(TPClient, DG, RPC, userStateHandler, notificationHandler, voiceStateHandler);









// Process Watcher
Discord.DG.procWatcher.on("processRunning", (processName) => {
  logIt("INFO", `${processName} detected as running`);
  TPClient.stateUpdate("discord_running", "Yes");

  // Lets shutdown the connection so we can re-establish it
  setTimeout(function () {
    logIt("INFO", "Discord is running, attempting to Connect");
    Discord.doLogin();
  }, 1000);
});

Discord.DG.procWatcher.on("processTerminated", (processName) => {
  logIt("WARN", `${processName} not detected as running`);
  TPClient.stateUpdate("discord_running", "No");
  if (Discord.DG.Client) {
    Discord.DG.Client.removeAllListeners();
    Discord.DG.Client.destroy();
    Discord.DG.Client = null;
  }
});


console.log("Initiating TP CLient");
TPClient.connect({pluginId: pluginId, updateUrl: DG.updateUrl});


