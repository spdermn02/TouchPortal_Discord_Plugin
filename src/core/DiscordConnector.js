// Discord Connector

const RPC = require("../../discord-rpc/src/index.js");
const {open} = require("out-url");
const {DG} = require("../discord_config.js");
const {logIt, isEmpty} = require("../utils/helpers.js");
const TPClient = require("./TPClient.js");

const {VoiceStateHandler} = require("../handlers/discord/voiceStateHandler.js");

class DiscordConnector {
  constructor() {}

  connectToDiscord = () => {
    try {
      DG.Client = new RPC.Client({transport: "ipc"});

      const voiceStateHandler = new VoiceStateHandler(ConnectDiscord.doLogin);
      voiceStateHandler.registerEvents();

      this.discordLogin();
    } catch (error) {
      logIt("ERROR", "Error connecting to Discord", error);
    }
  };

  discordLogin = () => {
    DG.Client.login({
      clientId: DG.pluginSettings["Discord Client Id"],
      clientSecret: DG.pluginSettings["Discord Client Secret"],
      accessToken: DG.accessToken,
      scopes: DG.scopes,
      redirectUri: DG.redirectUri,
      prompt: "none",
    }).catch((error) => {
      logIt("ERROR", "login error", error);
      if (error.code == 4009) {
        DG.connecting = false;
        DG.accessToken = null;
        logIt("INFO", "Attempting Login again");
        this.doLogin();
      }
    });
  };

  // Discord Login
  waitForClientId = (timeoutms) =>
    new Promise((r, j) => {
      const check = () => {
        if (
          !isEmpty(DG.pluginSettings["Discord Client Id"]) &&
          !isEmpty(DG.pluginSettings["Discord Client Secret"])
        ) {
          r();
        } else if ((timeoutms -= 1000) < 0) {
          j("timed out, restart Touch Portal!");
        } else setTimeout(check, 1000);
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
      setTimeout(check, 500);
    });

  doLogin = async () => {
    if (DG.connecting) {
      return;
    }
    if (DG.Client) {
      DG.Client.removeAllListeners();
      DG.Client.destroy();
      DG.Client = null;
    }

    if (
      isEmpty(DG.pluginSettings["Discord Client Id"]) ||
      isEmpty(DG.pluginSettings["Discord Client Secret"])
    ) {
      open(`https://discord.com/developers/applications`);

      await this.waitForClientId(30 * 60 * 1000); // wait for 30 minutes
    }

    // Start Login process
    console.log("Waiting for Login");
    await this.waitForLogin();
  };
}

const ConnectDiscord = new DiscordConnector();

// Process Watcher
DG.procWatcher.on("processRunning", (processName) => {
  logIt("INFO", `${processName} detected as running`);
  TPClient.stateUpdate("discord_running", "Yes");

  // Lets shutdown the connection so we can re-establish it
  setTimeout(function () {
    logIt("INFO", "Discord is running, attempting to Connect");
    ConnectDiscord.doLogin();
  }, 1000);
});

DG.procWatcher.on("processTerminated", (processName) => {
  logIt("WARN", `${processName} not detected as running`);
  TPClient.stateUpdate("discord_running", "No");
  if (DG.Client) {
    DG.Client.removeAllListeners();
    DG.Client.destroy();
    DG.Client = null;
  }
});

module.exports = {DiscordConnector};
