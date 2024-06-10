const RPC = require("../discord-rpc");
const TP = require("touchportal-api");
const { open } = require("out-url");
const path = require("path");
const discordKeyMap = require("./discordkeys");
const ProcessWatcher = require(path.join(__dirname,"/process_watcher"));
const platform = require('process').platform;
const Config = require('./config');
const { log } = require("console");

// weird stuff happening with user avatars.. think its caused by default touchportal action setIcon from url...
// some people sharing same avatar and when we manually fetch it.. it changes.. then when we fetch the other which matched it.. it causes the OTHER to change again???

// Stopped the user from appearing in 'voice states', this is causing user0 to be 'blank' and doesnt update as expected.. 
// Do we manually set user0 data to the current user?? or find out why its not updating as expected



const PLUGIN_CONNECTED_SETTING = 'Plugin Connected';

let discordRunning = false;
let pluginSettings = { 'Plugin Connected' : 'No', 'Skip Process Watcher':'No', 'Discord Debug Mode':'Off' };
let accessToken = undefined;
let connecting = false;
const scopes = ["identify", "rpc",  "guilds", "rpc.activities.write", "rpc.voice.read", "rpc.voice.write", "rpc.video.read","rpc.video.write", "rpc.screenshare.read","rpc.screenshare.write", "rpc.notifications.read" ];

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
let soundBoard = {};

let pttKeyStateId = 'discordPTTKeyboardKey';

let instanceIds = {};



TPClient.on("Action", async (message, isHeld) => {
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
  else if( message.actionId === "discord_play_sound" ) {
    let sound = soundBoard.idx[message.data[0].value];
    try {
      await DiscordClient.playSoundboardSound(sound.name, sound.sound_id, sound.guild_id);
    }
    catch(err) {
      logIt("ERROR","Playing a sound failed "+err);
    }
  }
  else if( message.actionId === "discord_toggle_camera" )  {
    await DiscordClient.toggleVideo();
  }
  else if( message.actionId == "discord_toggle_screenshare" ) {
    await DiscordClient.toggleScreenshare();
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
  else if( message.actionId === "discord_push_to_talk") {
    if( isHeld ) {
      DiscordClient.setVoiceSettings({ deaf: false, mute: false });
    }
    else {
      DiscordClient.setVoiceSettings({ deaf: false, mute: true });
    }
  }
  else if( message.actionId === "discord_push_to_mute")
  {
    if( isHeld ) {
      DiscordClient.setVoiceSettings({ deaf: true });
    }
    else {
      DiscordClient.setVoiceSettings({ deaf: false, mute: false });
    }
  }
  else if (message.actionId === "discord_voice_volume_action") {
    discord_voice_volume = parseInt(message.data[0].value,10);
    const userId = getUserIdFromIndex(message.data[1].value, currentVoiceUsers);
    DiscordClient.setUserVoiceSettings(userId, { volume: convertPercentageToVolume(discord_voice_volume) });
  }


  else if (message.data && message.data.length > 0) {
    if (message.data[0].id === "discordDeafenAction") {
      // maintaining backwards compatibility if message.data[1] doesn't exist, for old discord pages with deafen buttons..
      if (!message.data[1] || message.data[1].value === "Self") {
        deafState = setStateBasedOnValue(message.data[0].value, deafState);
        DiscordClient.setVoiceSettings({ deaf: 1 === deafState });
        logIt("DEBUG","Deafen State set to ",deafState, " for self");
      } else {
        const userId = getUserIdFromIndex(message.data[1].value, currentVoiceUsers);
        deafState = setStateBasedOnValue(message.data[0].value, deafState);
        DiscordClient.setUserVoiceSettings(userId, { deaf: 1 === deafState });
        logIt("DEBUG","Deafen State set to ",deafState, " for user ", userId);
      }
    }
    else if (message.data[0].id === "discordMuteAction") {
      // maintaing backwards compatible if message.data[1] doesnt exist, for old discord pages with mute buttons..
      if (!message.data[1] || message.data[1].value === "Self") {
        muteState = setStateBasedOnValue(message.data[0].value, muteState);
        DiscordClient.setVoiceSettings({ mute: 1 === muteState });
        logIt("DEBUG","Mute State set to ",muteState, " for self");
      } else {
        const userId = getUserIdFromIndex(message.data[1].value, currentVoiceUsers);
        muteState = setStateBasedOnValue(message.data[0].value, muteState);
        DiscordClient.setUserVoiceSettings(userId, { mute: 1 === muteState });
        logIt("DEBUG","Mute State set to ",muteState, " for user ", userId);
      }
    }
    else if (message.data[0].id === "discordEchoCancellationAction") {
      discord_echo_cancellation = setStateBasedOnValue(message.data[0].value, discord_echo_cancellation);
      DiscordClient.setVoiceSettings({ echoCancellation: 1 === discord_echo_cancellation });
    }
    else if (message.data[0].id === "discordNoiseSuppressionAction") {
      discord_noise_suppression = setStateBasedOnValue(message.data[0].value, discord_noise_suppression);
      DiscordClient.setVoiceSettings({ noiseSuppression: 1 === discord_noise_suppression });
    }
    else if (message.data[0].id === "discordAutomaticGainControlAction") {
      discord_automatic_gain_control = setStateBasedOnValue(message.data[0].value, discord_automatic_gain_control);
      DiscordClient.setVoiceSettings({ automaticGainControl: 1 === discord_automatic_gain_control });
    }
    else if (message.data[0].id === "discordQOSHighPacketPriorityAction") {
      discord_qos_priority = setStateBasedOnValue(message.data[0].value, discord_qos_priority);
      DiscordClient.setVoiceSettings({ qos: 1 === discord_qos_priority });
    }
    else if (message.data[0].id === "discordSilenceWarningAction") {
      discord_silence_warning = setStateBasedOnValue(message.data[0].value, discord_silence_warning);
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
  else if (action == 'discord_voice_volume_action_connector') {
      let newVol = parseInt(message.value,10);
      //Double volume as percentage is actually double what it should be since Discord goes to 200%
      newVol = newVol > 100 ? 100 : newVol;
      newVol = newVol < 0 ? 0 : newVol * 2 ;

      const userId = getUserIdFromIndex(message.data[0].value, currentVoiceUsers);
      console.log("Setting Voice Volume for ", userId, " to ", newVol);
      DiscordClient.setUserVoiceSettings(userId, { volume: convertPercentageToVolume(newVol) });
    
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

  function createDefaultUserStates() {
    for (let i = 0; i < 10; i++) {
        
        for (let j = 0; j < Config.USERSTATES.length; j++) {
          const state = Config.USERSTATES[j];
          TPClient.createState(
            `user_${i}_${state.id}`,
            `VC | User ${i} ${state.title}`,
            state.value,
            `VC | User_${i}`
          );
        }
  
      
    }
  }
  
  // Call the function to create the default user states
  createDefaultUserStates();
  

});

TPClient.on("Settings", (data) => {
  logIt("DEBUG","Settings: New Settings from Touch-Portal ");
  let reconnect = false;
  data.forEach( (setting) => {
    let key = Object.keys(setting)[0];
    if( (pluginSettings[key] == undefined || pluginSettings[key] != setting[key] ) && ["Discord Client Id","Discord Client Secret"].find( ele => ele == key) ) {
      reconnect = true;
    }
    pluginSettings[key] = setting[key];
      logIt("DEBUG","Settings: Setting received for |"+key+"|");
  });
  if( accessToken != undefined ) {
    if( reconnect) {
      logIt("INFO","Settings: Reconnecting to Discord due to settings change");
      DiscordClient.removeAllListeners();
      DiscordClient.destroy();
      DiscordClient = null;
      return;
    }
    else {
      return;
    }
  }
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

function setStateBasedOnValue(value, currentState) {
  // used for various sections of plugin where we need to toggle or choose on/off
  if (value === "Toggle") {
    return 1 - currentState;
  } else if (value === "Off") {
    return 0;
  } else if (value === "On") {
    return 1;
  }
  return currentState;
}

function getUserIdFromIndex(userIndex, currentVoiceUsers) {
  const userIds = Object.keys(currentVoiceUsers);
  return userIds[userIndex];
}



const convertVolumeToPercentage = ( value ) => {
  if( value === 0 ){ return 0; }
  const translation = 20 * Math.log10(value / 100)
  return Math.round(100 * (translation > 0 ? translation / 6 + 1 : (50 + translation) / 50))
}

const connectToDiscord = function () {
  try{
      DiscordClient = new RPC.Client({ transport: "ipc" });
      let prevVoiceActivityData = {}
      const voiceActivity = function (newData) {
        logIt("DEBUG","voiceActivity", JSON.stringify(newData));
        const data = diff(prevVoiceActivityData, newData)
        //We always need these
        data.mute = newData.mute
        data.deaf = newData.deaf
        prevVoiceActivityData = newData;
        const states = []
        const connectors = []
      
        if( data.hasOwnProperty('mute')) {
          if (data.mute) {
            muteState = 1;
          } else {
            muteState = 0;
          }

          logIt("discord mute is "+muteState)
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
        states.push({ id: "discord_mute", value: muteState ? "On" : "Off" })
        logIt("discord deafen is "+deafState)
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
      if( data.hasOwnProperty('noise_suppression') || data.hasOwnProperty('noiseSuppression')) {
        discord_noise_suppression = data.noise_suppression || data.noiseSuppression ? 1 : 0;
        states.push({ id: "discord_noise_suppression", value: discord_noise_suppression ? "On" : "Off" })
      }
      if( data.hasOwnProperty('echo_cancellation') || data.hasOwnProperty('echoCancellation')) {
        discord_echo_cancellation = data.echo_cancellation || data.echoCancellation ? 1 : 0;
        states.push({ id: "discord_echo_cancellation", value: discord_echo_cancellation ? "On" : "Off" })
      }
      if( data.hasOwnProperty('silence_warning') || data.hasOwnProperty('silenceWarning')) {
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

  const getSoundboardSounds = async () => {
    let sounds = await DiscordClient.getSoundboardSounds();
    
    if( sounds != null ) {
      soundBoard = {
        array: [],
        idx: {}
      }

      for( const sound of sounds ) {
        let emojiName = sound.emoji_name != null ? sound.emoji_name + ' - ' : '';
        let guildName = sound.guild_id === "DEFAULT" ? "Discord Sounds" : guilds.idx[sound.guild_id]
        let soundName = guildName + " - " + emojiName + sound.name;
        soundBoard.array.push(soundName);
        soundBoard.idx[soundName] = sound;
        soundBoard.idx[sound.sound_id] = sound;
      }

      // Sort by Discord Guild name - seems to make the most sense to collect them into grouped areas.
      soundBoard.array.sort();

      TPClient.choiceUpdate('discordSound',soundBoard.array);
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


  // For Voice Channel Stuff
  const deleteUserStates = async (data) => {
    let userId = Object.keys(currentVoiceUsers).indexOf(data.user.id);

    // Using the "default userstates" to reset the user states
    let stateUpdates = Config.USERSTATES.map(state => {
      return { id: `user_${userId}_${state.id}`, value: state.value };
    });

    TPClient.stateUpdateMany(stateUpdates);
    delete currentVoiceUsers[data.user.id];
  };

  const updateUserStates = async (data) => {
    const userIndex = Object.keys(currentVoiceUsers).indexOf(data.user.id);

    for (let key in data.voice_state) {
      if (key === 'suppress') continue;
      const stateValue = data.voice_state[key] ? "On" : "Off";
      // console.log("User updated", data.user.id, key, stateValue);
      TPClient.stateUpdate(`user_${userIndex}_${key}`, stateValue);
    }
    TPClient.stateUpdate(`user_${userIndex}_id`, data.user.id);
    TPClient.stateUpdate(`user_${userIndex}_nick`, data.nick);
    TPClient.stateUpdate(`user_${userIndex}_volume`, Math.round(data.volume));
    TPClient.stateUpdate(`user_${userIndex}_avatar`, data.user.avatar);
    TPClient.stateUpdate(`user_${userIndex}_deaf`, data.deaf ? "On" : "Off");
    TPClient.stateUpdate(`user_${userIndex}_mute`, data.mute ? "On" : "Off");

    // Divide by 2 to convert range from 0-200 to 0-100
    let discord_voice_volume = convertVolumeToPercentage(data.volume) / 2;
    TPClient.connectorUpdate(`discord_voice_volume_action_connector|voiceUserList_connector=${userIndex}`, discord_voice_volume);
  };

  function handleSpeakingEvent(event, data) {
    if (currentVoiceUsers.hasOwnProperty(data.user_id)) {
      const isSpeaking = event === "speaking";
      currentVoiceUsers[data.user_id].speaking = isSpeaking;
      const userIndex = Object.keys(currentVoiceUsers).indexOf(data.user_id);
      TPClient.stateUpdate(`user_${userIndex}_Speaking`, isSpeaking ? "On" : "Off");
  
      console.log(currentVoiceUsers[data.user_id].nick, isSpeaking ? "started speaking" : "stopped speaking");
    }
  }

  const voiceState = async (event,data) => {
      logIt("DEBUG","Voice State", event, JSON.stringify(data));
      let ids = [];

      if (event !== "delete" && event !== "speaking" && event !== "stop_speaking") {
        currentVoiceUsers[data.user.id] = data;
      }

      if (event === "delete") {
        deleteUserStates(data);
      }

      if (event === "speaking" || event === "stop_speaking") {
        handleSpeakingEvent(event, data);
      }
      
      if (event === "update") {
        if (data.user.id !== DiscordClient.user.id) {
          console.log("The userid is ", data.user.id, " and the discord user id is ", DiscordClient.user.id);
          updateUserStates(data);
        }
      }

      const userKeys = Object.keys(currentVoiceUsers);
      discord_voice_channel_participants = userKeys.length > 0 ? userKeys.join("|") : '<None>';

      const participant_ids = userKeys
        .filter(key => currentVoiceUsers[key].user)
        .map(key => currentVoiceUsers[key].user.id);
      
      discord_voice_channel_participant_ids = participant_ids.join("|");
      
      TPClient.stateUpdateMany([
        { 'id': 'discord_voice_channel_participants', 'value': discord_voice_channel_participants },
        { 'id': 'discord_voice_channel_participant_ids', 'value': discord_voice_channel_participant_ids}
      ]);
  
  };


  
async function subscribeToEvents(channelId) {
  const events = [
    { name: "VOICE_STATE_CREATE", description: "Voice State Create" },
    { name: "VOICE_STATE_UPDATE", description: "Voice State Update" },
    { name: "VOICE_STATE_DELETE", description: "Voice State Delete" },
    { name: "SPEAKING_START", description: "Speaking Start" },
    { name: "SPEAKING_STOP", description: "Speaking Stop" },
  ];

  for (let event of events) {
    const subscription = await DiscordClient.subscribe(event.name, { channel_id: channelId }).catch((err) => { logIt("ERROR", err) });
    console.log(`Subscribed to ${event.description}`);
    last_voice_channel_subs.push(subscription);
    await wait(0.1);
  }
}

async function unsubscribeFromEvents() {
  if (last_voice_channel_subs.length > 0) {
    logIt("DEBUG","START- Unsubscribing from Voice Channel voice states");
    for(let i = 0; i < last_voice_channel_subs.length; i++) {
      console.log("Unsubscribing from subscription ",i);
      await last_voice_channel_subs[i].unsubscribe();
      await wait(0.1);
    }

    logIt("DEBUG","COMPLETE - Unsubscribing from Voice Channel voice states");
    last_voice_channel_subs = []
    currentVoiceUsers= {}
    await wait(0.1)
  }
}

async function clearUserStates() {
  // Iterate over all users in currentVoiceUsers
  Object.keys(currentVoiceUsers).forEach((userId, index) => {
    // Using the "default userstates" to reset the user states
    let stateUpdates = Config.USERSTATES.map(state => {
      return { id: `user_${index}_${state.id}`, value: state.value };
    });
    TPClient.stateUpdateMany(stateUpdates);
  });
    // Clear currentVoiceUsers
    currentVoiceUsers = {};
}


const voiceChannel = async (data) => {
  logIt("DEBUG","Voice Channel join", JSON.stringify(data));
  //  await DiscordClient.subscribe("MESSAGE_CREATE", { channel_id: "1125087354969915464"}).catch((err) => {logIt("ERROR",err)});
  await clearUserStates();
  await unsubscribeFromEvents();

  if ( data.channel_id == null ) {
    discord_voice_channel_name = '<None>'
    discord_voice_channel_id = '<None>'
    discord_voice_channel_server_id = '<None>'
    discord_voice_channel_server_name = '<None>'
    discord_voice_channel_participants = '<None>'
    discord_voice_channel_participant_ids = '<None>'
  }
  else if ( data.guild_id == null ) {

    discord_voice_channel_id = data.channel_id;
    discord_voice_channel_name = 'Personal';
    discord_voice_channel_server_id = 'Personal';
    discord_voice_channel_server_name = 'Personal';

    // Subscribe to voice channel events
    await subscribeToEvents(data.channel_id);

  }
  else {
    // Lookup Voice Channel Name
    if (!channels[data.guild_id] || !channels[data.guild_id].voice) {
      getGuildChannels(data.guild_id).then(() => {
        if (channels[data.guild_id] && channels[data.guild_id].voice) {
          discord_voice_channel_name = channels[data.guild_id].voice.names[data.channel_id];
        }
      });
    } else {
      discord_voice_channel_name = channels[data.guild_id].voice.names[data.channel_id];
    }
    
    discord_voice_channel_id = data.channel_id;
    discord_voice_channel_server_id = data.guild_id;

    try {
      // was getting times where the guilds.idx was not available on a fresh boot
      discord_voice_channel_server_name = guilds.idx[data.guild_id];
    } catch (error) {
      // Call getGuilds function to initialize guilds in case it's not available
      guilds = await getGuilds();
      discord_voice_channel_server_name = guilds.idx[data.guild_id];
    } 

    logIt("DEBUG","Subscribing to Voice Channel [", discord_voice_channel_name, "] with ID [", discord_voice_channel_id, "] on Server [", discord_voice_channel_server_name, "] with ID [", discord_voice_channel_server_id,"]");

    // Subscribe to voice channel events
    await subscribeToEvents(data.channel_id);

    logIt("DEBUG","COMPLETE - Subscribing to Voice Channel")
    console.log("We subscribed to new subs ", last_voice_channel_subs.length);
  }
      
    if(discord_voice_channel_id !== '<None>' ) {
      let ids = [];
      const channel = await DiscordClient.getChannel(discord_voice_channel_id)
      channel.voice_states.forEach((vs,i) => {
        if (vs.user.id !== DiscordClient.user.id) {
        vs.speaking = false // adding speaking to the object to track speaking status
        currentVoiceUsers[vs.user.id] = vs;
        }

      })

      discord_voice_channel_participants = Object.keys(currentVoiceUsers).length > 0 ? Object.keys(currentVoiceUsers).join("|") : '<None>'
      Object.keys(currentVoiceUsers).forEach((key,i) => {

        // Making sure not to add Client User to the list as it's not needed and would likely cause issues being in the flow of things for certain actions that cant be used on the client user
        if (currentVoiceUsers[key].user.id !== DiscordClient.user.id) {
          ids.push(currentVoiceUsers[key].user.id);

          // For Each user, update the states when joining
          TPClient.stateUpdateMany([
            {id: [`user_${i}_Speaking`], value: "Off"},
            {id: [`user_${i}_id`], value: currentVoiceUsers[key].user.id},
            {id: [`user_${i}_nick`], value: currentVoiceUsers[key].nick},
            {id: [`user_${i}_mute`], value: currentVoiceUsers[key].voice_state.mute ? "On" : "Off"},
            {id: [`user_${i}_deaf`], value: currentVoiceUsers[key].voice_state.deaf ? "On" : "Off"},
            {id: [`user_${i}_avatar`], value: currentVoiceUsers[key].user.avatar},
            {id: [`user_${i}_volume`], value: currentVoiceUsers[key].volume}
          ]);
        }  
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


  // Discord Events

  DiscordClient.on("ready", async () => {
    if (!accessToken || ( DiscordClient.accessToken != undefined && accessToken != DiscordClient.accessToken )) {
      accessToken = DiscordClient.accessToken;
    }

    TPClient.stateUpdate("discord_connected","Connected");
    TPClient.settingUpdate(PLUGIN_CONNECTED_SETTING,"Connected");

    await DiscordClient.subscribe("VOICE_SETTINGS_UPDATE").catch((err) => {logIt("ERROR",err)});
    await DiscordClient.subscribe("GUILD_CREATE").catch((err) => {logIt("ERROR",err)});
    await DiscordClient.subscribe("CHANNEL_CREATE").catch((err) => {logIt("ERROR",err)});
    await DiscordClient.subscribe("VOICE_CHANNEL_SELECT").catch((err) => {logIt("ERROR",err)});
    await DiscordClient.subscribe("VOICE_CONNECTION_STATUS").catch((err) => {logIt("ERROR",err)});
    await DiscordClient.subscribe("VIDEO_STATE_UPDATE").catch((err) => {logIt("ERROR",err)});
    await DiscordClient.subscribe("SCREENSHARE_STATE_UPDATE").catch((err) => {logIt("ERROR",err)});

    await DiscordClient.subscribe("NOTIFICATION_CREATE").catch((err) => {logIt("ERROR",err)});

    DiscordClient.on("VOICE_STATE_CREATE", (data) => {voiceState('create',data);})
    DiscordClient.on("VOICE_STATE_UPDATE", (data) => {voiceState('update',data);})
    DiscordClient.on("VOICE_STATE_DELETE", (data) => {voiceState('delete',data);})
    // DiscordClient.on("MESSAGE_CREATE", (data) => {console.log("DEBUG", JSON.stringify(data))}) 

    const voiceSettings = await DiscordClient.getVoiceSettings().catch((err) => {logIt("ERROR",err)});
    voiceActivity(voiceSettings);
    await getGuilds();
    await getSoundboardSounds();
  });

  DiscordClient.on("NOTIFICATION_CREATE", (data) => {
    // Need to create some state to store the last X notifications?  
    // Maybe make an event for if DM, vs if normal message?
    console.log("DEBUG","Notification Create", JSON.stringify(data));
  })

  DiscordClient.on("SPEAKING_START", (data) => {
    voiceState('speaking',data);
  })

  DiscordClient.on("SPEAKING_STOP", (data) => {
    voiceState('stop_speaking',data);
  })

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
  
  DiscordClient.on('VIDEO_STATE_UPDATE', (data) => {
    TPClient.stateUpdate("discord_camera_status",data.active? "On" : "Off")
  })

  DiscordClient.on('SCREENSHARE_STATE_UPDATE', (data) => {
    TPClient.stateUpdate("discord_screenshare_status",data.active? "On" : "Off")
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
}
catch(e) {
  logIt("ERROR","Error in connectToDiscord",e);
}
};
// - END - Discord


// Discord Login 
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


// HELPER FUNCTIONS

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


function isEmpty(val) {
  return val === undefined || val === null || val === '';
}

const wait = (seconds) => 
           new Promise(resolve => 
             setTimeout(() => 
                 resolve(true), seconds * 1000))

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
