// TPCLIENT.js

const TP = require("touchportal-api");
const TPClient = new TP.Client();
const {onListChange} = require("../handlers/touchportal/onListChange.js");
const {onConnectorChange} = require("../handlers/touchportal/onConnectorChange.js");
const {onAction} = require("../handlers/touchportal/onAction.js");

const discordKeyMap = require("../utils/discordKeys.js");
const {DG} = require("../discord_config.js");
const {logIt, platform, app_monitor} = require("../utils/helpers.js");

// ON ACTION is in onAction.js
// ON CONNECTOR CHANGE is in onConnectorChange.js
// ON LIST CHANGE is in onListChange.js

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

TPClient.on("Update", (curVersion, newVersion) => {
  console.log("DEBUG", "Update: current version:" + curVersion + " new version:" + newVersion);
  TPClient.sendNotification(
    `${DG.pluginId}_update_notification`,
    `Discord Plugin Update Available (${newVersion})`,
    `\nPlease updated to get the latest bug fixes and new features\n\nCurrent Installed Version: ${curVersion}`,
    [
      {
        id: `${DG.pluginId}_update_notification_go_to_download`,
        title: "Go To Download Location",
      },
    ]
  );
});

TPClient.on("NotificationClicked", (data) => {
  logIt("DEBUG", JSON.stringify(data));
  if (data.optionId === `${DG.pluginId}_update_notification_go_to_download`) {
    open(DG.releaseUrl);
  }
});

TPClient.on("Close", (data) => {
  logIt("WARN", "Closing due to TouchPortal sending closePlugin message");
  TPClient.stateUpdate("discord_running", "Unknown");
  TPClient.settingUpdate(PLUGIN_CONNECTED_SETTING, "Disconnected");
});

TPClient.on("Action", (data) => {
  onAction(data);
});

TPClient.on("ConnectorChange", (data) => {
  onConnectorChange(data);
});

TPClient.on("ListChange", (data) => {
  onListChange(data);
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

module.exports = TPClient;
