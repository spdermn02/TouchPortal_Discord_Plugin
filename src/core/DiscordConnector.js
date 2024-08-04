// Discord Connector

const {open} = require("out-url");
const {logIt, isEmpty} = require("../utils/helpers.js");

class DiscordConnector {
  constructor(TPClient, DG, RPC, userStateHandler, notificationHandler, voiceStateHandler) {
    this.TPClient = TPClient;
    this.DG = DG;
    this.RPC = RPC;
    this.userStateHandler = userStateHandler;
    this.notificationHandler = notificationHandler;
    this.voiceStateHandler = voiceStateHandler;
    
  }

  connectToDiscord = () => {
    try {
      this.DG.Client = new this.RPC.Client({transport: "ipc"});

      /// how do we initiate this outside of this class... hmm
      // const voiceStateHandler = new VoiceStateHandler(this, this.TPClient, this.userStateHandler, this.notificationHandler);
      this.voiceStateHandler.registerEvents();

      this.discordLogin();
    } catch (error) {
      logIt("ERROR", "Error connecting to Discord", error);
    }
  };

  discordLogin = () => {
    this.DG.Client.login({
      clientId: this.DG.pluginSettings["Discord Client Id"],
      clientSecret: this.DG.pluginSettings["Discord Client Secret"],
      accessToken: this.DG.accessToken,
      scopes: this.DG.scopes,
      redirectUri: this.DG.redirectUri,
      prompt: "none",
    }).catch((error) => {
      logIt("ERROR", "login error", error);
      if (error.code == 4009) {
        this.DG.connecting = false;
        this.DG.accessToken = null;
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
          !isEmpty(this.DG.pluginSettings["Discord Client Id"]) &&
          !isEmpty(this.DG.pluginSettings["Discord Client Secret"])
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
      this.DG.connecting = true;
      const check = () => {
        if (this.DG.Client && this.DG.Client.user != null) {
          this.DG.connecting = false;
          r();
        } else {
          this.connectToDiscord();
          if (this.DG.Client && this.DG.Client.user != null) {
            this.DG.connecting = false;
            r();
          } else {
            setTimeout(check, 5000);
          }
        }
      };
      setTimeout(check, 500);
    });

  doLogin = async () => {
    if (this.DG.connecting) {
      return;
    }
    if (this.DG.Client) {
      this.DG.Client.removeAllListeners();
      this.DG.Client.destroy();
      this.DG.Client = null;
    }

    if (
      isEmpty(this.DG.pluginSettings["Discord Client Id"]) ||
      isEmpty(this.DG.pluginSettings["Discord Client Secret"])
    ) {
      open(`https://discord.com/developers/applications`);

      await this.waitForClientId(30 * 60 * 1000); // wait for 30 minutes
    }

    // Start Login process
    console.log("Waiting for Login");
    await this.waitForLogin();
  };

  
}



module.exports = {DiscordConnector};
