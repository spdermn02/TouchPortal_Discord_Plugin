const { open } = require("out-url");
const { logIt, isEmpty, destroyClient, wait } = require("../utils/helpers.js");

const RETRY_SECONDS = 5;

class DiscordConnector {
  constructor(TPClient, DG, RPC, userStateHandler, notificationHandler, voiceStateHandler) {
    this.TPClient = TPClient;
    this.DG = DG;
    this.RPC = RPC;
    this.userStateHandler = userStateHandler;
    this.notificationHandler = notificationHandler;
    this.voiceStateHandler = voiceStateHandler;
  }

  // One login attempt on a fresh client. Resolves when Discord has authenticated us, rejects
  // on any failure. The previous client is always torn down first, so there is never more
  // than one live IPC connection, one set of listeners, or one pending AUTHORIZE prompt.
  connectToDiscord = async () => {
    destroyClient(this.DG);
    this.DG.Client = new this.RPC.Client({ transport: "ipc" });
    this.voiceStateHandler.registerEvents();

    const client = this.DG.Client;
    try {
      await client.login({
        clientId: this.DG.pluginSettings["Discord Client Id"],
        clientSecret: this.DG.pluginSettings["Discord Client Secret"],
        accessToken: this.DG.accessToken,
        scopes: this.DG.scopes,
        redirectUri: this.DG.redirectUri,
        prompt: "none",
      });
    } catch (error) {
      // 4009 is an invalid/expired access token: drop it so the next attempt re-authorizes.
      if (error && error.code == 4009) {
        logIt("INFO", "Access token rejected, will re-authorize");
        this.DG.accessToken = null;
      }
      throw error;
    }
  };

  waitForClientId = (timeoutms) =>
    new Promise((r, j) => {
      const check = () => {
        if (
          !isEmpty(this.DG.pluginSettings["Discord Client Id"]) &&
          !isEmpty(this.DG.pluginSettings["Discord Client Secret"])
        ) {
          r();
        } else if ((timeoutms -= 1000) < 0) {
          j(new Error("timed out waiting for Discord Client Id/Secret, restart Touch Portal!"));
        } else setTimeout(check, 1000);
      };
      setTimeout(check, 1000);
    });

  // Keep trying until a login succeeds. Each attempt finishes (success or failure) before the
  // next one starts.
  waitForLogin = async () => {
    for (;;) {
      try {
        await this.connectToDiscord();
        if (this.DG.Client && this.DG.Client.user != null) {
          return;
        }
      } catch (error) {
        logIt("WARN", `Discord login failed, retrying in ${RETRY_SECONDS}s: ${error && error.message}`);
      }
      await wait(RETRY_SECONDS);
    }
  };

  // Safe to call from anywhere, any number of times: never rejects, and a second call while
  // a login is in progress is a no-op.
  doLogin = async () => {
    if (this.DG.connecting) {
      return;
    }
    this.DG.connecting = true;
    try {
      destroyClient(this.DG);

      if (
        isEmpty(this.DG.pluginSettings["Discord Client Id"]) ||
        isEmpty(this.DG.pluginSettings["Discord Client Secret"])
      ) {
        open("https://discord.com/developers/applications");
        await this.waitForClientId(30 * 60 * 1000); // wait for 30 minutes
      }

      logIt("INFO", "Waiting for Login");
      await this.waitForLogin();
    } catch (error) {
      logIt("ERROR", `doLogin: ${error && error.message}`);
    } finally {
      this.DG.connecting = false;
    }
  };
}

module.exports = { DiscordConnector };
