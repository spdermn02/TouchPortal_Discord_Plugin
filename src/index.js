const TPClient = require("./core/TPClient.js");
const {DG} = require("./discord_config.js");
const {logIt} = require("./utils/helpers.js");
const RPC = require("../discord-rpc/src/index.js");

const {DiscordConnector} = require("./core/DiscordConnector.js");

const {UserStateHandler} = require("./handlers/discord/userStateHandler.js");
const {VoiceStateHandler} = require("./handlers/discord/voiceStateHandler.js");
const {NotificationHandler} = require("./handlers/discord/notificationHandler.js");

const userStateHandler = new UserStateHandler(TPClient, DG );
const notificationHandler = new NotificationHandler(DG);
const voiceStateHandler = new VoiceStateHandler(DG,  TPClient, userStateHandler, notificationHandler);
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
TPClient.connect({pluginId: DG.pluginId, updateUrl: DG.updateUrl});


