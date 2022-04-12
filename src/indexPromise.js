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
let discord_voice_channel_connected = 'No';
let discord_voice_channel_name = '<None>';
let discord_voice_average_ping = '0.00';
let discord_voice_hostname = '<None>';
let discord_voice_volume = '0.00';
let discord_voice_mode_type = '0.00';
let guilds = {};
let channels = {};

let instanceIds = {};

TPClient.on("Action", async (message) => {
  logIt("DEBUG",JSON.stringify(message));
  if( message.actionId === "discord_select_channel" ) {
    let server = message.data[0].value;
    let type = message.data[1].value;
    let channelName = message.data[2].value;
    let guildId = guilds.idx[server];

    logIt("DEBUG","select discord channel", server, channelName, guildId);

    let channelId = channels[guildId][type.toLowerCase()].idx[channelName];
    
    if( type === 'Voice' ) {
      await DiscordClient.selectVoiceChannel(channelId, {timeout: 5, force: true});
    }
    else {
      await DiscordClient.selectTextChannel(channelId, {timeout: 5});
    }
  }
  else if( message.actionId === "discord_hangup_voice" ) {
    DiscordClient.selectVoiceChannel(null,{timeout:5});
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
          idx: {},
          names: {}
        },
        text: {
          array: [],
          idx: {},
          names: {}
        }
      }

      chData.forEach(async (channel,idx) => {
        // Type 0 is Text channel, 2 is Voice channel
        if( channel.type == 0 ) {
          channels[guildId].text.array.push(channel.name);
          channels[guildId].text.idx[channel.name] = channel.id;
          channels[guildId].text.names[channel.id] = channel.name;
        }
        else if( channel.type == 2 ) {
          channels[guildId].voice.array.push(channel.name);
          channels[guildId].voice.idx[channel.name] = channel.id;
          channels[guildId].voice.names[channel.id] = channel.name;
          await DiscordClient.subscribe("VOICE_STATE_CREATE",{channel_id: channel.id}, voiceState);
          await DiscordClient.subscribe("VOICE_STATE_UPDATE",{channel_id: channel.id}, voiceState);
          await DiscordClient.subscribe("VOICE_STATE_DELETE",{channel_id: channel.id}, voiceState);
        }
      });
      logIt("DEBUG", guildId, channelType);

      TPClient.choiceUpdateSpecific('discordServerChannel',channels[guildId][channelType.toLowerCase()].array,data.instanceId);
    }
  }
});

TPClient.on("Info", (data) => {
  logIt("DEBUG","Info : We received info from Touch-Portal");
});

TPClient.on("Settings", (data) => {
  logIt("DEBUG","Settings: New Settings from Touch-Portal");
  data.forEach( (setting) => {
    let key = Object.keys(setting)[0];
    pluginSettings[key] = setting[key];
    logIt("DEBUG","Settings: Setting received for |"+key+"|");
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

    if( data.input.volume > -1) {
      discord_voice_volume = data.input.volume.toFixed(2);
    }
    if( data.mode.type != '') {
      discord_voice_mode_type = data.mode.type;
    }

    let states = [
      { id: "discord_mute", value: muteState ? "On" : "Off" },
      { id: "discord_deafen", value: deafState ? "On" : "Off" },
      { id: "discord_voice_volume", value: discord_voice_volume },
      { id: "discord_voice_mode_type", value: discord_voice_mode_type }
    ];
    TPClient.stateUpdateMany(states);
  };

  getGuildChannels = async (guildId ) => {
    logIt("DEBUG","getGuildChannels for guildId",guildId);
    let channels = await DiscordClient.getChannels(guildId);
    if( !channels ) { logIt("ERROR","No channel data available for guildId",guildId); return; }
    return channels; 
  }

  const processGuilds = (data) => {

    if( !data || !data.guilds ) { logIt("ERROR", "guild data not available"); return; }

    guilds = {
      array : [],
      idx: {}
    };

    data.guilds.forEach( (guild,idx) => {
      console.log("Processing guild",guild.id);
      guilds.array.push(guild.name);
      guilds.idx[guild.name] = guild.id;
      guilds.idx[guild.id] = guild.name;

      //Look into maybe using a promise and an await here.. 
      // to limit having to do this timeout thingy
      DiscordClient.getChannels(guild.id).then((channels) => { console.log("Building Channels ",guild.id); buildGuildChannelIndex(guild.id,channels); }).catch(reason => console.log(reason));

    });

    TPClient.choiceUpdate('discordServerList',guilds.array)
  };

  const buildGuildChannelIndex = async(guildId, chData) => {

    channels[guildId] = {
      voice: {
        array: [],
        idx: {},
        names: {}
      },
      text: {
        array: [],
        idx: {},
        names: {}
      }
    };
    console.log("Processing channels for guildId",guildId);
    chData.forEach((channel,idx) => {
      console.log("Processing Channel for guildId",guildId,"channelId",channel.id);
      // Type 0 is Text channel, 2 is Voice channel
      if( channel.type == 0 ) {
        channels[guildId].text.array.push(channel.name);
        channels[guildId].text.idx[channel.name] = channel.id;
        channels[guildId].text.names[channel.id] = channel.name;
      }
      else if( channel.type == 2 ) {
        channels[guildId].voice.array.push(channel.name);
        channels[guildId].voice.idx[channel.name] = channel.id;
        channels[guildId].voice.names[channel.id] = channel.name;
        DiscordClient.subscribe("VOICE_STATE_CREATE",{channel_id: channel.id}, voiceState).then(() => {});
        DiscordClient.subscribe("VOICE_STATE_UPDATE",{channel_id: channel.id}, voiceState).then(() => {});
        DiscordClient.subscribe("VOICE_STATE_DELETE",{channel_id: channel.id}, voiceState).then(() => {});
      }
    });
  };

  voiceState = async (data) => {
      logIt("DEBUG","Voice State", JSON.stringify(data));
  };
  voiceChannel = async (data) => {
      logIt("DEBUG",'Voice Channel:',JSON.stringify(data));
      if ( data.channel_id == null ) {
        //Set Voice Channel Name - <None>
        discord_voice_channel_name = '<None>';
      }
      else {
        // Lookup Voice Channel Name
        discord_voice_channel_name = channels[data.guild_id].voice.names[data.channel_id];
      }

      TPClient.stateUpdate("discord_voice_channel_name",discord_voice_channel_name);
  };
  guildCreate = async (data) => {
      logIt("DEBUG",'Guild Create:',JSON.stringify(data));
      /*getGuilds();*/
  };
  channelCreate = async (data) => {
      logIt("DEBUG",'Channel Create:',JSON.stringify(data));
      /*getGuilds();*/
  };
  voiceConnectionStatus = (data) => {
      logIt("DEBUG",'Voice Connection:',JSON.stringify(data));
      if( data.state != null && data.state == 'VOICE_CONNECTED' ) {
        // Set Voice Channel Connect State
        discord_voice_channel_connected = 'Yes';
        discord_voice_average_ping = data.average_ping.toFixed(2);
        discord_voice_hostname = data.hostname;
      }
      else if( data.state != null && data.state == 'DISCONNECTED' ) {
        //Set Voice Channel Connect State Off
        discord_voice_channel_connected = 'No';
        discord_voice_average_ping = '0';
        discord_voice_hostname = '<None>';
      }
      var states = [
        { id: 'discord_voice_channel_connected', value: discord_voice_channel_connected},
        { id: 'discord_voice_average_ping', value: discord_voice_average_ping},
        { id: 'discord_voice_hostname', value: discord_voice_hostname},
      ];
      TPClient.stateUpdateMany(states);
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

    DiscordClient.getGuilds().then((data) => processGuilds(data)).catch(reason => console.log(reason));
    
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
    logIt("ERROR","login error",error);
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
      } else if ((timeoutms -= 1000) < 0) { 
        j("timed out, restart Touch Portal!"); 
      }
      else setTimeout(check, 1000);
    };
    setTimeout(check, 1000);
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
