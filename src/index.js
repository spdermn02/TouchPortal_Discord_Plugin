const RPC = require("discord-rpc");
const TP = require("touchportal-api");
const { open } = require("out-url");
const path = require("path");
const TouchPortalClient = require("touchportal-api/src/client");

let pluginSettings = {};
let accessToken = undefined;
let connecting = false;
const scopes = ["identify", "rpc",  "guilds", "messages.read" ];
//const scopes = ["identify", "rpc"];
const redirectUri = "http://localhost";

const pluginId = "TPDiscord";

const TPClient = new TP.Client();
let DiscordClient = null;

// - START - TP
let muteState = 0;
let deafState = 0;
let guilds = {};
let channels = {};

let instanceIds = {};

TPClient.on("Action", async (message) => {
  logIt("DEBUG",message);
  if( message.actionId === "discord_select_channel" ) {
    let server = message.data[0].value;
    let type = message.data[1].value;
    let channelName = message.data[2].value;
    let guildId = guilds.idx[server];

    logIg("DEBUG","select discord channel", server, channelName, guildId);

    let channelId = channels[guildId][type.toLowerCase()].idx[channelName];
    
    if( type === 'Voice' ) {
      await DiscordClient.selectVoiceChannel(channelId, {timeout: 5});
      await DiscordClient.subscribe("VOICE_STATE_CREATE",{channel_id: channelId}, voiceState);
      await DiscordClient.subscribe("VOICE_STATE_UPDATE",{channel_id: channelId}, voiceState);
      await DiscordClient.subscribe("VOICE_STATE_DELETE",{channel_id: channelId}, voiceState);
      TPClient.stateUpdate("discord_voice_channel_active","On");
    }
    else {
      await DiscordClient.selectTextChannel(channelId, {timeout: 5});
    }
  }
  else if( message.actionId === "discord_hangup_voice" ) {
    DiscordClient.selectVoiceChannel(null,{timeout:5});
      TPClient.stateUpdate("discord_voice_channel_active","Off");
  }
  else if (message.data && message.data.length > 0) {
    if (message.data[0].id === "discordDeafenAction") {
      if (message.data[0].value === "Toggle") {
        deafState = 1 - deafState;
      } else if (message.data[0].value === "Off") {
        deafState = 0;
      } else if (message.data[0].value === "On") {
        deafState = 1;
      }
      DiscordClient.setVoiceSettings({ deaf: 1 === deafState });
    }
  else if (message.data[0].id === "discordMuteAction") {
      if (message.data[0].value === "Toggle") {
        muteState = 1 - muteState;
      } else if (message.data[0].value === "Off") {
        muteState = 0;
      } else if (message.data[0].value === "On") {
        muteState = 1;
      }
      DiscordClient.setVoiceSettings({ mute: 1 === muteState });
    }
  } else {
    logIt("WARN","No data in Action Message",
      JSON.stringify(message)
    );
  }
});

TPClient.on("ListChange", async (data) => {
  logIt("DEBUG","ListChange :" + JSON.stringify(data));
  if( isEmpty(instanceIds[data.instanceId]) ) { instanceIds[data.instanceId] = {};}
  if( isEmpty(instanceIds[data.instanceId][data.actionId]) ) { instanceIds[data.instanceId][data.actionId] = {}; }
  if( data.actionId === 'discord_select_channel' && data.listId !== 'discordServerChannel') {
    instanceIds[data.instanceId][data.actionId][data.listId]  = data.value;

    let guildName = undefined;
    let channelType = 'Text';

    if( !isEmpty(instanceIds[data.instanceId][data.actionId].discordServerList)) {
        guildName = instanceIds[data.instanceId][data.actionId].discordServerList;
    }

    if( !isEmpty(instanceIds[data.instanceId][data.actionId].discordChannelType)) {
        channelType = instanceIds[data.instanceId][data.actionId].discordChannelType;
    }

    if( isEmpty(guildName) || isEmpty(channelType) ) { return; }

    if( !isEmpty(guilds.idx) && guilds.idx[guildName] ) {
      let guildId = guilds.idx[guildName];
      let chData = await getGuildChannels(guildId);
      channels[guildId] = {
        voice: {
          array: [],
          idx: {}
        },
        text: {
          array: [],
          idx: {}
        }
      }

      chData.forEach((channel,idx) => {
        // Type 0 is Text channel, 2 is Voice channel
        if( channel.type == 0 ) {
          channels[guildId].text.array.push(channel.name);
          channels[guildId].text.idx[channel.name] = channel.id;
        }
        else if( channel.type == 2 ) {
          channels[guildId].voice.array.push(channel.name);
          channels[guildId].voice.idx[channel.name] = channel.id;
        }
      });
      logIt("DEBUG", guildId, channelType);

      TPClient.choiceUpdateSpecific('discordServerChannel',channels[guildId][channelType.toLowerCase()].array,data.instanceId);
    }
  }
});

TPClient.on("Info", (data) => {
  logIt("DEBUG","Info :" + JSON.stringify(data));
});

TPClient.on("Settings", (data) => {
  logIt("DEBUG","Settings :" + JSON.stringify(data));
  data.forEach( (setting) => {
    let key = Object.keys(setting)[0];
    pluginSettings[key] = setting[key];
  });

  doLogin();
});

TPClient.on("Close", (data) => {
  logIt("WARN","Closing due to TouchPortal sending closePlugin message"
  );
});
// - END - TP

// - START - Discord
let getGuildChannels = () => { };
let voiceState = () => {};
let voiceChannel = () => {};
let guildCreate = () => {};
let channelCreate = () => {};
let voiceConnectionStatus = () => {};

const connectToDiscord = function () {
  DiscordClient = new RPC.Client({ transport: "ipc" });

  const voiceActivity = function (data) {
    logIt("DEBUG","voiceActivity", JSON.stringify(data));
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

  getGuildChannels = async (guildId ) => {
    logIt("DEBUG","getGuildChannels for guildId",guildId);
    let channels = await DiscordClient.getChannels(guildId);
    if( !channels ) { logIt("ERROR","No channel data available for guildId",guildId); return; }
    return channels; 
  }

  const getGuilds = async () => {
    let data = await DiscordClient.getGuilds();

    if( !data || !data.guilds ) { logIt("ERROR", "guild data available"); return; }

    guilds = {
      array : [],
      idx: {}
    };

    data.guilds.forEach( (guild,idx) => {
      guilds.array.push(guild.name);
      guilds.idx[guild.name] = guild.id;
      guilds.idx[guild.id] = guild.name;

      setTimeout(() => { 
        buildGuildChannelIndex(guild.id);
      },100*idx);

    });

    TPClient.choiceUpdate('discordServerList',guilds.array)
  };

  const buildGuildChannelIndex = async(guildId) => {
    let chData = await getGuildChannels(guildId);

    channels[guildId] = {
      array: [],
      idx: {}
    };

    chData.forEach((channel,idx) => {
      channels[guildId].array.push(channel.name);
      channels[guildId].idx[channel.name] = channel.id;
    })
    channels[guildId] = {
      voice: {
        array: [],
        idx: {}
      },
      text: {
        array: [],
        idx: {}
      }
    }

    chData.forEach((channel,idx) => {
      // Type 0 is Text channel, 2 is Voice channel
      if( channel.type == 0 ) {
        channels[guildId].text.array.push(channel.name);
        channels[guildId].text.idx[channel.name] = channel.id;
      }
      else if( channel.type == 2 ) {
        channels[guildId].voice.array.push(channel.name);
        channels[guildId].voice.idx[channel.name] = channel.id;

      }
    });

  };

  voiceState = async (data) => {
      logIt("DEBUG","Voice State", JSON.stringify(data));
  };
  voiceChannel = async (data) => {
      logIt("DEBUG",'Voice Channel:',JSON.stringify(data));
  };
  guildCreate = async (data) => {
      logIt("DEBUG",'Guild Create:',JSON.stringify(data));
      getGuild();
  };
  channelCreate = async (data) => {
      logIt("DEBUG",'Channel Create:',JSON.stringify(data));
      getGuilds();
  };
  voiceConnectionStatus = async (data) => {
      logIt("DEBUG",'Voice Connection:',JSON.stringify(data));
  };

  DiscordClient.on("ready", async () => {
    if (!accessToken || ( DiscordClient.accessToken != undefined && accessToken != DiscordClient.accessToken )) {
      accessToken = DiscordClient.accessToken;
    }

    await DiscordClient.subscribe("VOICE_SETTINGS_UPDATE", voiceActivity);
    await DiscordClient.subscribe("GUILD_CREATE", guildCreate);
    await DiscordClient.subscribe("CHANNEL_CREATE", channelCreate);
    await DiscordClient.subscribe("VOICE_CHANNEL_SELECT", voiceChannel);
    await DiscordClient.subscribe("VOICE_CONNECTION_STATUS", voiceConnectionStatus);

    getGuilds();
    
  });

  DiscordClient.on("disconnected", () => {
    logIt("WARN","discord connection closed, will attempt reconnect");
    doLogin();
  });

  DiscordClient.login({
    clientId : pluginSettings["Discord Client Id"],
    clientSecret: pluginSettings["Discord Client Secret"],
    accessToken,
    scopes,
    redirectUri
  }).catch((error) => {
    logIt("ERROG","login error",error);
    if( error.code == 4009 ) {
      connecting = false;
      accessToken = null;
      logIt("DEBUG","Calling Login");
      doLogin();
    }
  });
};
// - END - Discord

var waitForClientId = (timeoutms) =>
  new Promise((r, j) => {
    var check = () => {
      if (!isEmpty(pluginSettings["Discord Client Id"]) && !isEmpty(pluginSettings["Discord Client Secret"])) {
        r();
      } else if ((timeoutms -= 100) < 0) { 
        j("timed out, restart Touch Portal!"); 
      }
      else setTimeout(check, 100);
    };
    setTimeout(check, 100);
  });

var waitForLogin = () =>
  new Promise((r, j) => {
    connecting = true;
    var check = () => {
      if (DiscordClient && DiscordClient.user != null) {
        connecting = false;
        r();
      } else {
        connectToDiscord();
        if (DiscordClient && DiscordClient.user != null) {
          connecting = false;
          r();
        } else { 
          setTimeout(check, 5000);
        }
      }
    };
    setTimeout(check,500);
  });

async function doLogin() {
  if( connecting ) { return; }
  if( DiscordClient ) {
    DiscordClient.removeAllListeners();
    DiscordClient.destroy();
    DiscordClient = null;
  }

  if (isEmpty(pluginSettings["Discord Client Id"]) || isEmpty(pluginSettings["Discord Client Secret"]) ) {
    open(`https://discord.com/developers/applications`);

    await waitForClientId(30 * 60 * 1000); // wait for 30 minutes

  }

  // Start Login process
  await waitForLogin(); 
}

function isEmpty(val) {
  return val === undefined || val === null || val === '';
}

function logIt() {
  var curTime = new Date().toISOString();
  var message = [...arguments];
  var type = message.shift();
  console.log(curTime,":",pluginId,":"+type+":",message.join(" "));
}

// We are going to connect to TP first, then Discord
// That way if TP shuts down the plugin will be shutdown too
TPClient.connect({ pluginId });
