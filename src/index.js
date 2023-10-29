const RPC = require("discord-rpc");
const TP = require("touchportal-api");
const { open } = require("out-url");
const path = require("path");
const discordKeyMap = require("./discordkeys");
const ProcessWatcher = require(path.join(__dirname,"/process_watcher"));
const platform = require('process').platform;
const Config = require('./config');

const PLUGIN_CONNECTED_SETTING = 'Plugin Connected';

let discordRunning = false;
let pluginSettings = { 'Plugin Connected' : 'No', 'Skip Process Watcher':'No', 'Discord Debug Mode':'Off' };
let accessToken = undefined;
let connecting = false;
const scopes = ["identify", "rpc",  "guilds", "rpc.activities.write", "rpc.voice.read", "rpc.voice.write" ];

const redirectUri = "http://localhost";

//Change this to API?
const updateUrl = "https://raw.githubusercontent.com/spdermn02/TouchPortal_Discord_Plugin/master/package.json";
const releaseUrl = "https://github.com/spdermn02/TouchPortal_Discord_Plugin/releases";

const pluginId = "TPDiscord";

const app_monitor = {
  "darwin": "/Applications/Discord.app/Contents/MacOS/Discord",
  "win32": Config.discordWin32
};

const TPClient = new TP.Client();
const procWatcher = new ProcessWatcher();
let DiscordClient = null;

// - START - TP
let muteState = 0;
let deafState = 0;
let discord_automatic_gain_control = 0;
let discord_noise_suppression = 0;
let discord_echo_cancellation = 0;
let discord_silence_warning = 0;
let discord_qos_priority = 0;
let last_voice_channel_subs = [];
let discord_voice_channel_connected = 'No';
let discord_voice_channel_name = '<None>';
let discord_voice_channel_id = '<None>';
let discord_voice_channel_server_name = '<None>';
let discord_voice_channel_server_id = '<None>';
let discord_voice_average_ping = '0.00';
let discord_voice_hostname = '<None>';
let discord_voice_volume = '0';
let discord_speaker_volume = '0';
let discord_speaker_volume_connector = '0';
let discord_voice_mode_type = 'UNKNOWN';
let discord_voice_channel_participants = '<None>';
let discord_voice_channel_participant_ids = '<None>';
let guilds = {};
let channels = {};
let discordPTTKeys = [];

let pttKeyStateId = 'discordPTTKeyboardKey';

let instanceIds = {};


// Pulled from: https://stackoverflow.com/questions/8431651/getting-a-diff-of-two-json-objects
// BSD License
// Author: Gabriel Gartz
// link: https://stackoverflow.com/users/583049/gabriel-gartz
function diff(obj1, obj2) {
  const result = {};
  if (Object.is(obj1, obj2)) {
      return undefined;
  }
  if (!obj2 || typeof obj2 !== 'object') {
      return obj2;
  }
  Object.keys(obj1 || {}).concat(Object.keys(obj2 || {})).forEach(key => {
      if(obj2[key] !== obj1[key] && !Object.is(obj1[key], obj2[key])) {
          result[key] = obj2[key];
      }
      if(typeof obj2[key] === 'object' && typeof obj1[key] === 'object') {
          const value = diff(obj1[key], obj2[key]);
          if (value !== undefined) {
              result[key] = value;
          }
      }
  });
  return result;
}

const convertPercentageToVolume = ( value ) => {
  if( value === 0 ) { return 0; }
  const translation = value > 100 ? ( value - 100 ) / 100 * 6 : value / 100 * 50 - 50
  return 100 * Math.pow(10, translation / 20)
}

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
  else if( message.actionId === "discord_dm_voice_select" ) {
    let channelId = message.data[0].value;
    await DiscordClient.selectVoiceChannel(channelId,{timeout: 5, force: true});
  }
  else if( message.actionId === "discord_dm_text_select" ) {
    let channelId = message.data[0].value;
    await DiscordClient.selectTextChannel(channelId,{timeout: 5});
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
      let modeType = "";
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
    else if (message.data[0].id === "discordEchoCancellationAction") {
      if (message.data[0].value === "Toggle") {
        discord_echo_cancellation = 1 - discord_echo_cancellation;
      } else if (message.data[0].value === "Off") {
        discord_echo_cancellation = 0;
      } else if (message.data[0].value === "On") {
        discord_echo_cancellation = 1;
      }
      DiscordClient.setVoiceSettings({ echoCancellation: 1 === discord_echo_cancellation });
    }
    else if (message.data[0].id === "discordNoiseSuppressionAction") {
      if (message.data[0].value === "Toggle") {
        discord_noise_suppression = 1 - discord_noise_suppression;
      } else if (message.data[0].value === "Off") {
        discord_noise_suppression = 0;
      } else if (message.data[0].value === "On") {
        discord_noise_suppression = 1;
      }
      DiscordClient.setVoiceSettings({ noiseSuppression: 1 === discord_noise_suppression });
    }
    else if (message.data[0].id === "discordAutoGainControlAction") {
      if (message.data[0].value === "Toggle") {
        discord_automatic_gain_control = 1 - discord_automatic_gain_control;
      } else if (message.data[0].value === "Off") {
        discord_automatic_gain_control = 0;
      } else if (message.data[0].value === "On") {
        discord_automatic_gain_control = 1;
      }
      DiscordClient.setVoiceSettings({ automaticGainControl: 1 === discord_automatic_gain_control });
    }
    else if (message.data[0].id === "discordQOSHighPacketPriorityAction") {
      if (message.data[0].value === "Toggle") {
        discord_qos_priority = 1 - discord_qos_priority;
      } else if (message.data[0].value === "Off") {
        discord_qos_priority = 0;
      } else if (message.data[0].value === "On") {
        discord_qos_priority = 1;
      }
      DiscordClient.setVoiceSettings({ qos: 1 === discord_qos_priority });
    }
    else if (message.data[0].id === "discordSilenceWarningAction") {
      if (message.data[0].value === "Toggle") {
        discord_silence_warning = 1 - discord_silence_warning;
      } else if (message.data[0].value === "Off") {
        discord_silence_warning = 0;
      } else if (message.data[0].value === "On") {
        discord_silence_warning = 1;
      }
      DiscordClient.setVoiceSettings({ silenceWarning: 1 === discord_silence_warning });
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

TPClient.on("ConnectorChange",(message) => {
  logIt("DEBUG",`Connector change event fired `+JSON.stringify(message));
  const action = message.connectorId
  console.log(pluginId, ": DEBUG : ",`calling action ${action}`);
  if( action == 'discord_voice_volume_connector' ) {
    let newVol = parseInt(message.value,10);
    newVol = newVol > 100 ? 100 : newVol;
    newVol = newVol < 0 ? 0 : newVol;
    DiscordClient.setVoiceSettings({'input':{'volume':convertPercentageToVolume(newVol)}})
  }
  else if( action == 'discord_speaker_volume_connector' ) {
    let newVol = parseInt(message.value,10);
    //Double speaker volume as percentage is actually double what it should be since Discord goes to 200%
    newVol = newVol > 100 ? 100 : newVol;
    newVol = newVol < 0 ? 0 : newVol * 2 ;
    DiscordClient.setVoiceSettings({'output':{'volume':convertPercentageToVolume(newVol)}})
  }
  else {
    console.log(pluginId, ": ERROR : ",`Unknown action called ${action}`);
  }
});

TPClient.on("Info", (data) => {
  logIt("DEBUG","Info : We received info from Touch-Portal");

  TPClient.choiceUpdate(pttKeyStateId,Object.keys(discordKeyMap.keyboard.keyMap));
  TPClient.stateUpdate('discord_running','Unknown');
  TPClient.stateUpdate("discord_connected","Disconnected");
  

});

TPClient.on("Settings", (data) => {
  logIt("DEBUG","Settings: New Settings from Touch-Portal ");
  data.forEach( (setting) => {
    let key = Object.keys(setting)[0];
    pluginSettings[key] = setting[key];

    logIt("DEBUG","Settings: Setting received for |"+key+"|");
  });
  if( platform != 'win32' || pluginSettings['Skip Process Watcher'].toLowerCase() == 'yes') {
    TPClient.stateUpdate('discord_running','Unknown');
    procWatcher.stopWatch();
    doLogin();
  }
  else if( platform == 'win32' && pluginSettings['Skip Process Watcher'].toLowerCase() == 'no' ){
    logIt('INFO',`Starting process watcher for ${app_monitor[platform]}`);
    procWatcher.watch(app_monitor[platform]);
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
let getGuildChannels = () => { /* Empty as it will be assigned later */ }
let voiceState = () => { /* Empty as it will be assigned later */ }
let voiceChannel = () => { /* Empty as it will be assigned later */ }
let guildCreate = () => { /* Empty as it will be assigned later */ }
let channelCreate = () => { /* Empty as it will be assigned later */ }
let voiceConnectionStatus = () => { /* Empty as it will be assigned later */ }
let currentVoiceUsers = {}

const convertVolumeToPercentage = ( value ) => {
  if( value === 0 ){ return 0; }
  const translation = 20 * Math.log10(value / 100)
  return Math.round(100 * (translation > 0 ? translation / 6 + 1 : (50 + translation) / 50))
}

const connectToDiscord = function () {
  DiscordClient = new RPC.Client({ transport: "ipc" });
  let prevVoiceActivityData = {}
  const voiceActivity = function (newData) {
    logIt("ERROR","voiceActivity", JSON.stringify(newData));
    const data = diff(prevVoiceActivityData, newData)
    prevVoiceActivityData = newData;
    const states = []
    const connectors = []

    if( data.hasOwnProperty('mute')) {
      if (data.mute) {
        muteState = 1;
      } else {
        muteState = 0;
      }
      states.push({ id: "discord_mute", value: muteState ? "On" : "Off" })
    }
    if( data.hasOwnProperty('deaf')) {
      if (data.deaf) {
        deafState = 1;
        muteState = 1;
      } else {
        deafState = 0;
      }
      states.push({ id: "discord_deafen", value: deafState ? "On" : "Off" })
    }

    if( data.hasOwnProperty('input') && data.input.hasOwnProperty('volume') && data.input.volume > -1) {
      discord_voice_volume = convertVolumeToPercentage(data.input.volume);
      states.push({ id: "discord_voice_volume", value: discord_voice_volume })
      connectors.push({ id: "discord_voice_volume_connector", value: discord_voice_volume })
    }
    if( data.hasOwnProperty('output') && data.output.hasOwnProperty('volume') && data.output.volume > -1) {
      discord_speaker_volume = convertVolumeToPercentage(data.output.volume);
      discord_speaker_volume_connector = Math.round(convertVolumeToPercentage(data.output.volume)/2);
      states.push({ id: "discord_speaker_volume", value: discord_speaker_volume })
      connectors.push({ id: "discord_speaker_volume_connector", value: discord_speaker_volume_connector })
    }
    if( data.hasOwnProperty('mode') && data.mode.hasOwnProperty('type') && data.mode.type != '') {
      discord_voice_mode_type = data.mode.type;
      states.push( { id: "discord_voice_mode_type", value: discord_voice_mode_type })
    }
    if( data.hasOwnProperty('automatic_gain_control') || data.hasOwnProperty('automaticGainControl')) {
      discord_automatic_gain_control = data.automatic_gain_control || data.automaticGainControl ? 1 : 0;
      states.push({ id: "discord_automatic_gain_control", value: discord_automatic_gain_control ? "On" : "Off" })
    }
    if( data.hasOwnProperty('noise_suppression') || data.hasOwnProperty('noise_suppression')) {
      discord_noise_suppression = data.noise_suppression || data.noiseSuppression ? 1 : 0;
      states.push({ id: "discord_noise_suppression", value: discord_noise_suppression ? "On" : "Off" })
    }
    if( data.hasOwnProperty('echo_cancellation') || data.hasOwnProperty('echo_cancellation')) {
      discord_echo_cancellation = data.echo_cancellation || data.echoCancellation ? 1 : 0;
      states.push({ id: "discord_echo_cancellation", value: discord_echo_cancellation ? "On" : "Off" })
    }
    if( data.hasOwnProperty('silence_warning') || data.hasOwnProperty('silence_warning')) {
      discord_silence_warning = data.silence_warning || data.silenceWarning ? 1 : 0;
      states.push({ id: "discord_silence_warning", value: discord_silence_warning ? "On" : "Off" })
    }
    if( data.hasOwnProperty('qos') || data.hasOwnProperty('qos')) {
      discord_qos_priority = data.qos ? 1 : 0;
      states.push({ id: "discord_qos_priority", value: discord_qos_priority ? "On" : "Off" })
    }

    if( states.length > 0 ) {
      TPClient.stateUpdateMany(states);
    }
    if( connectors.length > 0 ) {
      TPClient.connectorUpdateMany(connectors);
    }
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

    // Switched this up because of the .forEach not honoring the await process,
    // but native if does
    for ( let i = 0; i < data.guilds.length; i++ ) {
      await assignGuildIndex(data.guilds[i],i);
    }

    TPClient.choiceUpdate('discordServerList',guilds.array)

    const voiceChannelData = await DiscordClient.getSelectedVoiceChannel();
    if( voiceChannelData != null ) {
      voiceChannelData.channel_id = voiceChannelData.id;
      voiceChannel(voiceChannelData);
    }
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

  const getGuild = async(data) => {
    let guild = await DiscordClient.getGuild(data.id);
    await assignGuildIndex(guild,1);

    TPClient.choiceUpdate('discordServerList',guilds.array)
  };

  const getChannel = async (data) => {
    let channel = await DiscordClient.getChannel(data.id);
    assignChannelIndex(channel.guild_id,channel);
  };

  const voiceState = async (event,data) => {
      logIt("ERROR","Voice State", event, JSON.stringify(data));
      let ids = [];
      if( event !== "delete" ) {
        currentVoiceUsers[data.nick] = data;
      }
      else {
        delete currentVoiceUsers[data.nick]
      }
      discord_voice_channel_participants = Object.keys(currentVoiceUsers).length > 0 ? Object.keys(currentVoiceUsers).join("|") : '<None>'
      Object.keys(currentVoiceUsers).forEach((key,i) => {
        ids.push(currentVoiceUsers[key].user.id);
      })
      discord_voice_channel_participant_ids = ids.join("|");
      TPClient.stateUpdateMany([
        { 'id': 'discord_voice_channel_participants', 'value': discord_voice_channel_participants },
        { 'id': 'discord_voice_channel_participant_ids', 'value': discord_voice_channel_participant_ids}
      ])
  
  };
  const voiceChannel = async (data) => {
      if ( last_voice_channel_subs.length > 0 ) {
        for( let i  = 0; i < last_voice_channel_subs.length ; i++ ) {
          await last_voice_channel_subs[i].unsubscribe();
        }
        last_voice_channel_subs = []
        currentVoiceUsers= {}
      }
      if( data.channel_id == null ) {
        discord_voice_channel_name = '<None>'
        discord_voice_channel_id = '<None>'
        discord_voice_channel_server_id = '<None>'
        discord_voice_channel_server_name = '<None>'
        discord_voice_channel_participants = '<None>'
        discord_voice_channel_participant_ids = '<None>'
      }
      else if( data.guild_id == null ) {
        discord_voice_channel_id = data.channel_id;
        discord_voice_channel_name = 'Personal';
        discord_voice_channel_server_id = 'Personal';
        discord_voice_channel_server_name = 'Personal';
        const vsCreate = await DiscordClient.subscribe("VOICE_STATE_CREATE",{channel_id: data.channel_id});
        const vsUpdate = await DiscordClient.subscribe("VOICE_STATE_UPDATE",{channel_id: data.channel_id});
        const vsDelete = await DiscordClient.subscribe("VOICE_STATE_DELETE",{channel_id: data.channel_id}); 
        last_voice_channel_subs = [ vsCreate, vsUpdate, vsDelete ];
      }
      else {
        // Lookup Voice Channel Name
        discord_voice_channel_name = channels[data.guild_id].voice.names[data.channel_id];
        discord_voice_channel_id = data.channel_id;
        discord_voice_channel_server_id = data.guild_id;
        discord_voice_channel_server_name = guilds.idx[data.guild_id];
        const vsCreate = await DiscordClient.subscribe("VOICE_STATE_CREATE",{channel_id: data.channel_id});
        const vsUpdate = await DiscordClient.subscribe("VOICE_STATE_UPDATE",{channel_id: data.channel_id});
        const vsDelete = await DiscordClient.subscribe("VOICE_STATE_DELETE",{channel_id: data.channel_id});
        last_voice_channel_subs = [ vsCreate, vsUpdate, vsDelete ];
      }
      
      if(discord_voice_channel_id !== '<None>' ) {
        let ids = [];
        const channel = await DiscordClient.getChannel(discord_voice_channel_id)
        channel.voice_states.forEach((vs,i) => {
          currentVoiceUsers[vs.nick] = vs;
        })
        discord_voice_channel_participants = Object.keys(currentVoiceUsers).length > 0 ? Object.keys(currentVoiceUsers).join("|") : '<None>'
        Object.keys(currentVoiceUsers).forEach((key,i) => {
          ids.push(currentVoiceUsers[key].user.id);
        })
        discord_voice_channel_participant_ids = ids.length > 0 ? ids.join("|") : '<None>'
      }

      let states = [
        { id: 'discord_voice_channel_name', value: discord_voice_channel_name},
        { id: 'discord_voice_channel_id', value: discord_voice_channel_id},
        { id: 'discord_voice_channel_server_name', value: discord_voice_channel_server_name},
        { id: 'discord_voice_channel_server_id', value: discord_voice_channel_server_id},
        { id: 'discord_voice_channel_participants', value: discord_voice_channel_participants},
        { id: 'discord_voice_channel_participant_ids', value: discord_voice_channel_participant_ids}
      ];

      TPClient.stateUpdateMany(states);
  };
  const guildCreate = async (data) => {
      logIt("DEBUG",'Guild Create:',JSON.stringify(data));
      getGuild(data);
  };
  const channelCreate = async (data) => {
      logIt("DEBUG",'Channel Create:',JSON.stringify(data));
      getChannel(data);
  };
  
  const voiceConnectionStatus = async (data) => {
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
        discord_voice_channel_participants = '<None>'
      }
      let states = [
        { id: 'discord_voice_channel_connected', value: discord_voice_channel_connected},
        { id: 'discord_voice_average_ping', value: discord_voice_average_ping},
        { id: 'discord_voice_hostname', value: discord_voice_hostname},
        { id: 'discord_voice_channel_name', value: discord_voice_channel_name},
        { id: 'discord_voice_channel_id', value: discord_voice_channel_id},
        { id: 'discord_voice_channel_server_name', value: discord_voice_channel_server_name},
        { id: 'discord_voice_channel_server_id', value: discord_voice_channel_server_id},
        { id: 'discord_voice_channel_participants', value: discord_voice_channel_participants}
      ];
      TPClient.stateUpdateMany(states);
  };

  DiscordClient.on("ready", async () => {
    if (!accessToken || ( DiscordClient.accessToken != undefined && accessToken != DiscordClient.accessToken )) {
      accessToken = DiscordClient.accessToken;
    }

    TPClient.stateUpdate("discord_connected","Connected");

    TPClient.settingUpdate(PLUGIN_CONNECTED_SETTING,"Connected");

    await DiscordClient.subscribe("VOICE_SETTINGS_UPDATE");
    await DiscordClient.subscribe("GUILD_CREATE");
    await DiscordClient.subscribe("CHANNEL_CREATE");
    await DiscordClient.subscribe("VOICE_CHANNEL_SELECT");
    await DiscordClient.subscribe("VOICE_CONNECTION_STATUS");

    DiscordClient.on("VOICE_STATE_CREATE", (data) => {voiceState('create',data);})
    DiscordClient.on("VOICE_STATE_UPDATE", (data) => {voiceState('update',data);})
    DiscordClient.on("VOICE_STATE_DELETE", (data) => {voiceState('delete',data);})
    //DiscordClient.on("MESSAGE_CREATE", (data) => {logIt("DEBUG", JSON.stringify(data))}) 
    const voiceSettings = await DiscordClient.getVoiceSettings();
    voiceActivity(voiceSettings);
    getGuilds();
    
    // TODO: Testing with SetActivity
    // DiscordClient.setActivity({
    //   // 'name': 'Touch Portal Plugin Development',
    //   // 'type': 2,
    //   // 'url': 'https://twitch.tv/spdermn02',
    //   // 'state':'Touch Portal', 
    //   // 'details':'Working on testing update to Touch Portal Discord Plugin'
    //   "state": "In a Group",
    //   "details": "Competitive | In a Match",
    //   "assets": {
    //     "large_image": "numbani_map",
    //     "large_text": "Numbani",
    //     "small_image": "pharah_profile",
    //     "small_text": "Pharah"
    //   },
    //   "instance": true
    // })
    //setInterval(() => { DiscordClient.clearActivity() }, 10000)
    
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
    if( platform != 'win32' ) {
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

const waitForClientId = (timeoutms) =>
  new Promise((r, j) => {
    const check = () => {
      if (!isEmpty(pluginSettings["Discord Client Id"]) && !isEmpty(pluginSettings["Discord Client Secret"])) {
        r();
      } else if ((timeoutms -= 1000) < 0) { 
        j("timed out, restart Touch Portal!"); 
      }
      else setTimeout(check, 1000);
    };
    setTimeout(check, 1000);
  });

  const waitForLogin = () =>
  new Promise((r, j) => {
    connecting = true;
    const check = () => {
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
  if( type == "DEBUG" && pluginSettings["Discord Debug Mode"].toLowerCase() == "off") { return }
 
  console.log(curTime,":",pluginId,":"+type+":",message.join(" "));
}

// We are going to connect to TP first, then Discord
// That way if TP shuts down the plugin will be shutdown too
TPClient.connect({ pluginId, updateUrl });
