const RPC = require("discord-rpc");
const TP = require("touchportal-api");
const { open } = require("out-url");
const path = require("path");
const discordKeyMap = require("./discordkeys");
const { settings } = require("cluster");
const ProcessWatcher = require(path.join(__dirname,"/process_watcher"));
const platform = require('process').platform;

const app_monitor = {
  "darwin": "/Applications/Discord.app/Contents/MacOS/Discord",
  "win32": "Discord.exe"
};

const PLUGIN_CONNECTED_SETTING = 'Plugin Connected';

let discordRunning = false;
let pluginSettings = { 'Plugin Connected' : 'No', 'Skip Process Watcher':'No', 'Debug Mode':'Off' };
let accessToken = undefined;
let connecting = false;
const scopes = ["identify", "rpc",  "guilds" ];
//const scopes = ["identify", "rpc"];
const redirectUri = "http://localhost";

//Change this to API?
const updateUrl = "https://raw.githubusercontent.com/spdermn02/TouchPortal_Discord_Plugin/master/package.json";
const releaseUrl = "https://github.com/spdermn02/TouchPortal_Discord_Plugin/releases";

const pluginId = "TPDiscord";

const TPClient = new TP.Client();
const procWatcher = new ProcessWatcher();
let DiscordClient = null;

// - START - TP
let muteState = 0;
let deafState = 0;
let last_voice_channel_subs = [];
let discord_voice_channel_connected = 'No';
let discord_voice_channel_name = '<None>';
let discord_voice_channel_id = '<None>';
let discord_voice_channel_server_name = '<None>';
let discord_voice_channel_server_id = '<None>';
let discord_voice_average_ping = '0.00';
let discord_voice_hostname = '<None>';
let discord_voice_volume = '0.00';
let discord_voice_mode_type = 'UNKNOWN';
let guilds = {};
let channels = {};
let discordPTTKeys = [];

let pttKeyStateId = 'discordPTTKeyboardKey';

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
      //let vsCreate = await DiscordClient.subscribe("VOICE_STATE_CREATE",{channel_id: channelId}, voiceState);
      //let vsUpdate = await DiscordClient.subscribe("VOICE_STATE_UPDATE",{channel_id: channelId}, voiceState);
      //let vsDelete = await DiscordClient.subscribe("VOICE_STATE_DELETE",{channel_id: channelId}, voiceState);
      //last_voice_channel_subs = [ vsCreate, vsUpdate, vsDelete ];
      await DiscordClient.selectVoiceChannel(channelId, {timeout: 5, force: true});
    }
    else {
      await DiscordClient.selectTextChannel(channelId, {timeout: 5});
    }
  }
  else if( message.actionId === "discord_hangup_voice" ) {
    DiscordClient.selectVoiceChannel(null,{timeout:5});
  }
  else if( message.actionId === "discord_reset_push_to_talk_key" ) {
    discordPTTKeys = [];
  }
  else if( message.actionId === "discord_push_to_talk_key" ) {
    let keyCode = discordKeyMap.keyboard.keyMap[message.data[0].value];
    discordPTTKeys.push({type:0, code: keyCode , name: message.data[0].value});
  }
  else if( message.actionId === "discord_set_push_to_talk_key" ) {
    DiscordClient.setVoiceSettings({'mode':{'shortcut':discordPTTKeys}});
  }
  else if( message.actionId == "discord_voice_mode_change" ) {
    if( message.data[0].id === "discordVoiceMode") {
      let modeType = "VOICE_ACTIVITY";
      if (message.data[0].value === "Push To Talk" ) {
        modeType = "PUSH_TO_TALK";
      }
      else if( message.data[0].value === "Voice Activity" ) {
        modeType = "VOICE_ACTIVITY";
      }
      else {
        modeType = discord_voice_mode_type == "VOICE_ACTIVITY" ? "PUSH_TO_TALK": "VOICE_ACTIVITY";
      }
      DiscordClient.setVoiceSettings({'mode':{'type':modeType}});
    }
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
      TPClient.choiceUpdateSpecific('discordServerChannel',channels[guildId][channelType.toLowerCase()].array,data.instanceId);
    }
  }
});

TPClient.on("Info", (data) => {
  logIt("DEBUG","Info : We received info from Touch-Portal");

  TPClient.choiceUpdate(pttKeyStateId,Object.keys(discordKeyMap.keyboard.keyMap));
  TPClient.stateUpdate('discord_running','Unknown');
  TPClient.stateUpdate("discord_connected","Disconnected");
  if( platform != 'darwin' && pluginSettings['Skip Process Watcher'].toLowerCase() == 'no' ){
      logIt('INFO',`Starting process watcher for ${app_monitor[platform]}`);
      procWatcher.watch(app_monitor[platform]);
  }


});

TPClient.on("Settings", (data) => {
  logIt("DEBUG","Settings: New Settings from Touch-Portal ");
  data.forEach( (setting) => {
    let key = Object.keys(setting)[0];
    pluginSettings[key] = setting[key];

    logIt("DEBUG","Settings: Setting received for |"+key+"|");
  });
  if( platform == 'darwin' || pluginSettings['Skip Process Watcher'].toLowerCase() == 'yes') {
    TPClient.stateUpdate('discord_running','Unknown');
    procWatcher.stopWatch();
    doLogin();
  }
});

TPClient.on("Update", (curVersion, newVersion) => {
  logIt("DEBUG","Update: current version:"+curVersion+" new version:"+newVersion);
  TPClient.sendNotification(`${pluginId}_update_notification`,`Discord Plugin Update Available (${newVersion})`,
    `\nPlease updated to get the latest bug fixes and new features\n\nCurrent Installed Version: ${curVersion}`,
    [{id: `${pluginId}_update_notification_go_to_download`, title: "Go To Download Location" }]
  );
});

TPClient.on("NotificationClicked", (data) => {
  logIt("DEBUG",JSON.stringify(data))
  if( data.optionId === `${pluginId}_update_notification_go_to_download`) {
    open(releaseUrl);
  }
});

TPClient.on("Close", (data) => {
  logIt("WARN","Closing due to TouchPortal sending closePlugin message");
  TPClient.stateUpdate('discord_running','Unknown');
  TPClient.settingUpdate(PLUGIN_CONNECTED_SETTING,"Disconnected");
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
      logIt("DEBUG","voice mode is",data.mode.type);
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

  const getGuilds = async () => {
    let data = await DiscordClient.getGuilds();

    if( !data || !data.guilds ) { logIt("ERROR", "guild data not available"); return; }

    guilds = {
      array : [],
      idx: {}
    };

    // Switched this up because of the .forEach not honoroing the await process,
    // but native if does
    for ( let i = 0; i < data.guilds.length; i++ ) {
      await assignGuildIndex(data.guilds[i],i);
    }

    TPClient.choiceUpdate('discordServerList',guilds.array)
  };

  const assignGuildIndex = async (guild, counter) => {
    guilds.array.push(guild.name);
    guilds.idx[guild.name] = guild.id;
    guilds.idx[guild.id] = guild.name;

    //Look into maybe using a promise and an await here.. 
    // to limit having to do this timeout thingy
    await buildGuildChannelIndex(guild.id);
  };

  const buildGuildChannelIndex = async(guildId) => {
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
    };

    chData.forEach(async (channel,idx) => {
      assignChannelIndex(guildId, channel);
    });
  };
  const assignChannelIndex = (guildId, channel) => {
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
    }
  }

  getGuild = async(data) => {
    let guild = await DiscordClient.getGuild(data.id);
    await assignGuildIndex(guild,1);

    TPClient.choiceUpdate('discordServerList',guilds.array)
  };

  getChannel = async (data) => {
    let channel = await DiscordClient.getChannel(data.id);
    assignChannelIndex(channel.guild_id,channel);
  };

  voiceState = async (data) => {
      logIt("DEBUG","Voice State", JSON.stringify(data));
  };
  voiceChannel = async (data) => {
      logIt("DEBUG",'Voice Channel:',JSON.stringify(data));
      if ( last_voice_channel_subs.length > 0 ) {
        last_voice_channel_subs.forEach( sub => {
          sub.unsubscribe();
        })
        last_voice_channel_subs = [];
      }
      if( data.channel_id == null ) {
        discord_voice_channel_name = '<None>';
        discord_voice_channel_id = '<None>';
        discord_voice_channel_server_id = '<None>';
        discord_voice_channel_server_name = '<None>';
      }
      else if( data.guild_id == null ) {
        discord_voice_channel_id = data.channel_id;
        discord_voice_channel_name = 'Personal';
        discord_voice_channel_server_id = 'Personal';
        discord_voice_channel_server_name = 'Personal';
        let vsCreate = await DiscordClient.subscribe("VOICE_STATE_CREATE",{channel_id: data.channel_id});
        let vsUpdate = await DiscordClient.subscribe("VOICE_STATE_UPDATE",{channel_id: data.channel_id});
        let vsDelete = await DiscordClient.subscribe("VOICE_STATE_DELETE",{channel_id: data.channel_id});
        DiscordClient.on("VOICE_STATE_CREATE", (data) => {voiceState(data);})
        DiscordClient.on("VOICE_STATE_UPDATE", (data) => {voiceState(data);})
        DiscordClient.on("VOICE_STATE_DELETE", (data) => {voiceState(data);})
        last_voice_channel_subs = [ vsCreate, vsUpdate, vsDelete ];
      }
      else {
        // Lookup Voice Channel Name
        discord_voice_channel_name = channels[data.guild_id].voice.names[data.channel_id];
        discord_voice_channel_id = data.channel_id;
        discord_voice_channel_server_id = data.guild_id;
        discord_voice_channel_server_name = guilds.idx[data.guild_id];
        let vsCreate = await DiscordClient.subscribe("VOICE_STATE_CREATE",{channel_id: data.channel_id});
        let vsUpdate = await DiscordClient.subscribe("VOICE_STATE_UPDATE",{channel_id: data.channel_id});
        let vsDelete = await DiscordClient.subscribe("VOICE_STATE_DELETE",{channel_id: data.channel_id});
        DiscordClient.on("VOICE_STATE_CREATE", (data) => {voiceState(data);})
        DiscordClient.on("VOICE_STATE_UPDATE", (data) => {voiceState(data);})
        DiscordClient.on("VOICE_STATE_DELETE", (data) => {voiceState(data);})
        last_voice_channel_subs = [ vsCreate, vsUpdate, vsDelete ];
      }

      var states = [
        { id: 'discord_voice_channel_name', value: discord_voice_channel_name},
        { id: 'discord_voice_channel_id', value: discord_voice_channel_id},
        { id: 'discord_voice_channel_server_name', value: discord_voice_channel_server_name},
        { id: 'discord_voice_channel_server_id', value: discord_voice_channel_server_id},
      ];

      TPClient.stateUpdateMany(states);
  };
  guildCreate = async (data) => {
      logIt("DEBUG",'Guild Create:',JSON.stringify(data));
      getGuild(data);
  };
  channelCreate = async (data) => {
      logIt("DEBUG",'Channel Create:',JSON.stringify(data));
      getChannel(data);
  };
  
  voiceConnectionStatus = async (data) => {
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
        { id: 'discord_voice_channel_name', value: discord_voice_channel_name},
        { id: 'discord_voice_channel_id', value: discord_voice_channel_id},
        { id: 'discord_voice_channel_server_name', value: discord_voice_channel_server_name},
        { id: 'discord_voice_channel_server_id', value: discord_voice_channel_server_id},
      ];
      TPClient.stateUpdateMany(states);
  };

  DiscordClient.on("ready", async () => {
    if (!accessToken || ( DiscordClient.accessToken != undefined && accessToken != DiscordClient.accessToken )) {
      accessToken = DiscordClient.accessToken;
    }

    TPClient.stateUpdate("discord_connected","Connected");

    //DiscordClient.setVoiceSettings({'mode':{'type':'PUSH_TO_TALK','shortcut':[{'type':0,'code':16,'name':'shift'},{'type':0,'code':123,'name':'F12'}]}});
    // Left Shift 160
    // Right Shift = 161
    // Left control = 162
    // Right control = 163
    // Left Alt = 164
    // Right Alt = 165
    //"shortcut":[{"type":0,"code":160,"name":"shift"},{"type":0,"code":123,"name":"f12"}]

    TPClient.settingUpdate(PLUGIN_CONNECTED_SETTING,"Connected");

    await DiscordClient.subscribe("VOICE_SETTINGS_UPDATE");
    await DiscordClient.subscribe("GUILD_CREATE");
    await DiscordClient.subscribe("CHANNEL_CREATE");
    await DiscordClient.subscribe("VOICE_CHANNEL_SELECT");
    await DiscordClient.subscribe("VOICE_CONNECTION_STATUS");

    getGuilds();
    
  });
  DiscordClient.on('VOICE_SETTINGS_UPDATE', (data) => {
    voiceActivity(data);
  })
  DiscordClient.on('GUILD_CREATE', (data) => {
    guildCreate(data);
  })
  DiscordClient.on('CHANNEL_CREATE', (data) => {
    channelCreate(data);
  })
  DiscordClient.on('VOICE_CHANNEL_SELECT', (data) => {
    voiceChannel(data);
  })
  DiscordClient.on('VOICE_CONNECTION_STATUS', (data) => {
    voiceConnectionStatus(data);
  })

  DiscordClient.on("disconnected", () => {
    logIt("WARN","discord connection closed, will attempt reconnect, once process detected");
    TPClient.settingUpdate(PLUGIN_CONNECTED_SETTING,"Disconnected");
    TPClient.stateUpdate("discord_connected","Disconnected");
    if( platform == 'darwin' ) {
      return doLogin();
    }
  });

  const prompt = 'none';
  DiscordClient.login({
    clientId : pluginSettings["Discord Client Id"],
    clientSecret: pluginSettings["Discord Client Secret"],
    accessToken,
    scopes,
    redirectUri,
    prompt
  }).catch((error) => {
    logIt("ERROR","login error",error);
    if( error.code == 4009 ) {
      connecting = false;
      accessToken = null;
      logIt("INFO","Attempting Login again");
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

// Process Watcher
procWatcher.on('processRunning', (processName) => {
  discordRunning = true;
  TPClient.stateUpdate('discord_running',discordRunning ? 'Yes' : 'No');
  // Lets shutdown the connection so we can re-establish it
  setTimeout(function() {
      logIt('INFO', "Discord is running, attempting to Connect");
      doLogin();
  }, 1000);
});
procWatcher.on('processTerminated', (processName) => {
  logIt('WARN',`${processName} not detected as running`);
  if( !discordRunning ) {
      // We already did this once, don't need to keep repeating it
      return;
  }
  logIt('WARN',`Disconnect active connections to Discord`);
  discordRunning = false;
  TPClient.stateUpdate('discord_running',discordRunning ? 'Yes' : 'No');
  if ( DiscordClient ) {
    DiscordClient.removeAllListeners();
    DiscordClient.destroy();
    DiscordClient = null;
  }
});
// End Process Watcher


function isEmpty(val) {
  return val === undefined || val === null || val === '';
}

function logIt() {
  const curTime = new Date().toISOString();
  const message = [...arguments];
  const type = message.shift();
  if( type == "DEBUG" && pluginSettings["Debug Mode"].toLowerCase() == "off") { return }
 
  console.log(curTime,":",pluginId,":"+type+":",message.join(" "));
}

// We are going to connect to TP first, then Discord
// That way if TP shuts down the plugin will be shutdown too
TPClient.connect({ pluginId, updateUrl });
