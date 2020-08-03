const RPC = require("discord-rpc");
const discordDb = require("./discorddb");
const TP = require("touchportal-api");
const express = require("express");
const bodyParser = require("body-parser");
const { open } = require("out-url");
const path = require("path");

let clientId = undefined;
let clientSecret = undefined;
let accessToken = undefined;
const scopes = ["identify", "rpc"];
const redirectUri = "http://localhost";

const pluginId = "TPDiscord";

let DiscordClient = new RPC.Client({ transport: "ipc" });
const TPClient = new TP.Client();
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
const port = 9403;

let muteState = 0;
let deafState = 0;

TPClient.on("Action", (data) => {
  if (data.data && data.data.length > 0) {
    if (data.data[0].id === "discordDeafenAction") {
      if (data.data[0].value === "Toggle") {
        deafState = 1 - deafState;
      } else if (data.data[0].value === "Off") {
        deafState = 0;
      } else if (data.data[0].value === "On") {
        deafState = 1;
      }
      DiscordClient.setVoiceSettings({ deaf: 1 === deafState });
    }
    if (data.data[0].id === "discordMuteAction") {
      if (data.data[0].value === "Toggle") {
        muteState = 1 - muteState;
      } else if (data.data[0].value === "Off") {
        muteState = 0;
      } else if (data.data[0].value === "On") {
        muteState = 1;
      }
      DiscordClient.setVoiceSettings({ mute: 1 === muteState });
    }
  } else {
    console.log(
      pluginId,
      ": WARN : No data in Action Message",
      JSON.stringify(data)
    );
  }
});

TPClient.on("ListChange", (data) => {
  console.log(pluginId, ": DEBUG : ListChange :" + JSON.stringify(data));
});

TPClient.on("Info", (data) => {
  console.log(pluginId, ": DEBUG : Info :" + JSON.stringify(data));
});

const voiceActivity = function (data) {
  if (data.mute) {
    muteState = 1;
  } else {
    muteState = 0;
  }
  if (data.deaf) {
    deafState = 1;
    muteState = 1;
  } else {
    deafState = 0;
  }

  let states = [
    { id: "discord_mute", value: muteState ? "On" : "Off" },
    { id: "discord_deafen", value: deafState ? "On" : "Off" },
  ];
  TPClient.stateUpdateMany(states);
};

const subscribe = function (data) {
  if (!data || !data.mode || !data.mode.type) {
    console.log(
      pluginId,
      ": ERROR : subscribe : event has no data or known mode.type"
    );
    return;
  }
  switch (data.mode.type) {
    case "VOICE_ACTIVITY":
      voiceActivity(data);
      break;
    default:
      console.log(pluginId, ": DEBUG : Unhandled mode.type " + data.mode.type);
  }
};

DiscordClient.on("ready", () => {
  if (!accessToken) {
    discordDb.db.insert({
      _id: "discordToken",
      accessToken: DiscordClient.accessToken,
    });
  }

  TPClient.connect({ pluginId });

  DiscordClient.subscribe("VOICE_SETTINGS_UPDATE", subscribe);
});

DiscordClient.on("disconnected", () => {
  console.log(pluginId, ": WARN : discord connection closed");

  //doLogin();
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname + "/discordkeys.html"));
});

app.post("/store", async (req, res) => {
  const data = req.body;

  if (data.clientId && data.clientSecret) {
    clientId = data.clientId;
    clientSecret = data.clientSecret;
  } else {
    res.sendFile(path.join(__dirname + "/error.html"));
    return;
  }

  let appId = await discordDb.db.findOne({ _id: "appid" });
  let id = "";
  if (appId) {
    id = appId._id;
  }
  if (id === undefined || id === "") {
    discordDb.db.insert({
      _id: "appid",
      clientId: data.clientId,
      clientSecret: data.clientSecret,
    });
  } else {
    discordDb.db.update(
      { _id: id },
      {
        _id: "appid",
        clientId: data.clientId,
        clientSecret: data.clientSecret,
      },
      {},
      function (err, numReplaced) {}
    );
  }

  res.sendFile(path.join(__dirname + "/success.html"));
});

app.use(express.static(path.join(__dirname + "/public")));
app.listen(port, () =>
  console.log(
    pluginId,
    `: DEBUG : Example app listening at http://localhost:${port}`
  )
);

var waitForClientId = (timeoutms) =>
  new Promise((r, j) => {
    var check = () => {
      if (clientId !== undefined) {
        r();
      } else if ((timeoutms -= 100) < 0) j("timed out, restart Touch Portal!");
      else setTimeout(check, 100);
    };
    setTimeout(check, 100);
  });

var waitForLogin = (timeoutms) =>
  new Promise((r, j) => {
    var check = () => {
      if (DiscordClient.user != null) {
        r();
      } else {
        DiscordClient.login({
          clientId,
          clientSecret,
          accessToken,
          scopes,
          redirectUri,
        }).catch((error) => console.log(error));
        if (DiscordClient.user != null) {
          r();
        } else if ((timeoutms -= 5000) < 0)
          j("timed out, restart Touch Portal!");
        else setTimeout(check, 5000);
      }
    };
    check();
  });

async function doLogin() {
  let appDoc = await discordDb.db.findOne({ _id: "appid" });
  if (!appDoc) {
    open(`https://discord.com/developers/applications`);

    open(`http://localhost:${port}`);
  }
  if (
    appDoc &&
    appDoc.clientId !== undefined &&
    appDoc.clientSecret !== undefined
  ) {
    clientId = appDoc.clientId;
    clientSecret = appDoc.clientSecret;
  }

  if (clientId === undefined) {
    await waitForClientId(30 * 60 * 1000); // wait for 30 minutes
  }

  let aTDoc = await discordDb.db.findOne({ _id: "discordToken" });
  if (aTDoc && aTDoc.accessToken !== undefined) {
    accessToken = aTDoc.accessToken;
  }

  // Log in to RPC with client id
  await waitForLogin(5 * 60 * 1000); //wait for 5 minutes
  //await client.login({
  //  clientId,
  //  clientSecret,
  //  accessToken,
  //  scopes,
  //  redirectUri,
  //});
}

doLogin();
