const RPC = require("../discord-rpc");
const { open } = require("out-url");
const discordKeyMap = require("./discordkeys");
const { DG } = require('./config.js');
const TPClient = require('./TPCLIENT');
const { logIt, isEmpty, wait, diff, convertPercentageToVolume, convertVolumeToPercentage,
       getUserIdFromIndex, setStateBasedOnValue, platform} = require('./helpers');


       
// weird stuff happening with user avatars.. think its caused by default touchportal action setIcon from url...
// some people sharing same avatar and when we manually fetch it.. it changes.. then when we fetch the other which matched it.. it causes the OTHER to change again???

// Stopped the user from appearing in 'voice states', this is causing user0 to be 'blank' and doesnt update as expected.. 
// Do we manually set user0 data to the current user?? or find out why its not updating as expected

// I broke something with the process watcher.. I initiate it inside of process_watcher first, this way it can be exported/imported into index.js and TPClient.js
// It seems to keep on wanting to try to connect? - or two instances of it are running...

// const customVoiceAcivityUsers = { 
//   Custom1: "855126542370603108",
//   Custom2: "855126542370603108",
//   Custom3: "855126542370603108"
// }



TPClient.on("Action", async (message, isHeld) => {
  logIt("DEBUG",JSON.stringify(message));
  if( message.actionId === "discord_select_channel" ) {
    let server = message.data[0].value;
    let type = message.data[1].value;
    let channelName = message.data[2].value;
    let guildId = DG.guilds.idx[server];

    logIt("DEBUG","select discord channel", server, channelName, guildId);

    let channelId = DG.channels[guildId][type.toLowerCase()].idx[channelName];
    
    if( type === 'Voice' ) {
      await DG.Client.selectVoiceChannel(channelId, {timeout: 5, force: true});
    }
    else {
      await DG.Client.selectTextChannel(channelId, {timeout: 5});
    }
  }
  else if( message.actionId === "discord_play_sound" ) {
    let sound = DG.soundBoard.idx[message.data[0].value];
    try {
      await DG.Client.playSoundboardSound(sound.name, sound.sound_id, sound.guild_id);
    }
    catch(err) {
      logIt("ERROR","Playing a sound failed "+err);
    }
  }
  else if( message.actionId === "discord_toggle_camera" )  {
    await DG.Client.toggleVideo();
  }
  else if( message.actionId == "discord_toggle_screenshare" ) {
    await DG.Client.toggleScreenshare();
  }
  else if( message.actionId === "discord_dm_voice_select" ) {
    let channelId = message.data[0].value;
    await DG.Client.selectVoiceChannel(channelId,{timeout: 5, force: true});
  }
  else if( message.actionId === "discord_dm_text_select" ) {
    let channelId = message.data[0].value;
    await DG.Client.selectTextChannel(channelId,{timeout: 5});
  }
  else if( message.actionId === "discord_hangup_voice" ) {
    DG.Client.selectVoiceChannel(null,{timeout:5});
  }
  else if( message.actionId === "discord_reset_push_to_talk_key" ) {
    DG.PTTKeys = [];
  }
  else if( message.actionId === "discord_push_to_talk_key" ) {
    let keyCode = discordKeyMap.keyboard.keyMap[message.data[0].value];
    DG.PTTKeys.push({type:0, code: keyCode , name: message.data[0].value});
  }
  else if( message.actionId === "discord_set_push_to_talk_key" ) {
    DG.Client.setVoiceSettings({'mode':{'shortcut':DG.PTTKeys}});
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
        modeType = DG.voice_mode_type == "VOICE_ACTIVITY" ? "PUSH_TO_TALK": "VOICE_ACTIVITY";
      }
      DG.Client.setVoiceSettings({'mode':{'type':modeType}});
    }
  }
  else if( message.actionId === "discord_push_to_talk") {
    if( isHeld ) {
      DG.Client.setVoiceSettings({ deaf: false, mute: false });
    }
    else {
      DG.Client.setVoiceSettings({ deaf: false, mute: true });
    }
  }
  else if( message.actionId === "discord_push_to_mute")
  {
    if( isHeld ) {
      DG.Client.setVoiceSettings({ deaf: false, mute: true});
    }
    else {
      DG.Client.setVoiceSettings({ deaf: false, mute: false });
    }
  }
  else if (message.actionId === "discord_voice_volume_action") {
    let userId;

    // Is user in our custom list of users?
    if (Object.values(DG.customVoiceAcivityUsers).includes(message.data[1].value)) {
      userId = Object.keys(DG.customVoiceAcivityUsers).find(key => DG.customVoiceAcivityUsers[key] === message.data[1].value);
    } else {
      userId = getUserIdFromIndex(message.data[1].value, DG.currentVoiceUsers);
    }

    // If isHeld is undefined or null, set the volume directly
    if (isHeld === undefined || isHeld === null) {
      DG.voice_volume = parseInt(message.data[0].value, 10);
      DG.Client.setUserVoiceSettings(userId, { volume: convertPercentageToVolume(DG.voice_volume) });
    }
    // If isHeld is true, start an interval to increase the volume
    if (isHeld) {
      intervalId = setInterval(() => {
        DG.voice_volume += parseInt(message.data[0].value, 10) * 2;
        DG.voice_volume = Math.max(0, Math.min(DG.voice_volume, 200)); 
      
        DG.Client.setUserVoiceSettings(userId, { volume: convertPercentageToVolume(DG.voice_volume) });
      }, 100);
    }
    // If isHeld is false, clear the interval
    if (isHeld === false) {
      clearInterval(intervalId);
    }

  }


  else if (message.data && message.data.length > 0) {
    if (message.data[0].id === "discordDeafenAction") {
      // maintaining backwards compatibility if message.data[1] doesn't exist, for old discord pages with deafen buttons..
      if (!message.data[1] || message.data[1].value === "Self") {
        DG.deafState = setStateBasedOnValue(message.data[0].value, DG.deafState);
        DG.Client.setVoiceSettings({ deaf: 1 === DG.deafState });
        logIt("DEBUG","Deafen State set to ",DG.deafState, " for self");

        // we cant deafen other users. only our self..
      // } else {
        // const userId = getUserIdFromIndex(message.data[1].value, DG.currentVoiceUsers);
        // if (userId !== undefined) {
          // DG.deafState = setStateBasedOnValue(message.data[0].value, DG.deafState);
          // DG.Client.setUserVoiceSettings(userId, { deaf: 1 === DG.deafState });
          // logIt("DEBUG","Deafen State set to ",DG.deafState, " for user ", userId);
        // }
      }
    }
    else if (message.data[0].id === "discordMuteAction") {
      // maintaing backwards compatible if message.data[1] doesnt exist, for old discord pages with mute buttons..
      if (!message.data[1] || message.data[1].value === "Self") {
        DG.muteState = setStateBasedOnValue(message.data[0].value, DG.muteState);
        DG.Client.setVoiceSettings({ mute: 1 === DG.muteState });
        logIt("DEBUG","Mute State set to ",DG.muteState, " for self");
      } else {
        let userId;
        // Is user in our custom list of users?
        if (Object.values(DG.customVoiceAcivityUsers).includes(message.data[1].value)) {
          userId = Object.keys(DG.customVoiceAcivityUsers).find(key => DG.customVoiceAcivityUsers[key] === message.data[1].value);
        } else {
          userId = getUserIdFromIndex(message.data[1].value, DG.currentVoiceUsers);
        }
        if (userId !== undefined) {
          DG.muteState = setStateBasedOnValue(message.data[0].value, DG.muteState);
          DG.Client.setUserVoiceSettings(userId, { mute: 1 === DG.muteState });
          logIt("DEBUG","Mute State set to ",DG.muteState, " for user ", userId);
        }
      
      }
    }
    else if (message.data[0].id === "discordEchoCancellationAction") {
      DG.echo_cancellation = setStateBasedOnValue(message.data[0].value, DG.echo_cancellation);
      DG.Client.setVoiceSettings({ echoCancellation: 1 === DG.echo_cancellation });
    }
    else if (message.data[0].id === "discordNoiseSuppressionAction") {
      DG.noise_suppression = setStateBasedOnValue(message.data[0].value, DG.noise_suppression);
      DG.Client.setVoiceSettings({ noiseSuppression: 1 === DG.noise_suppression });
    }
    else if (message.data[0].id === "discordAutomaticGainControlAction") {
      DG.automatic_gain_control = setStateBasedOnValue(message.data[0].value, DG.automatic_gain_control);
      DG.Client.setVoiceSettings({ automaticGainControl: 1 === DG.automatic_gain_control });
    }
    else if (message.data[0].id === "discordQOSHighPacketPriorityAction") {
      DG.qos_priority = setStateBasedOnValue(message.data[0].value, DG.qos_priority);
      DG.Client.setVoiceSettings({ qos: 1 === DG.qos_priority });
    }
    else if (message.data[0].id === "discordSilenceWarningAction") {
      DG.silence_warning = setStateBasedOnValue(message.data[0].value, DG.silence_warning);
      DG.Client.setVoiceSettings({ silenceWarning: 1 === DG.silence_warning });
    }

  } else {
    logIt("WARN","No data in Action Message",
      JSON.stringify(message)
    );
  }
});

TPClient.on("ListChange", async (data) => {
  logIt("DEBUG","ListChange :" + JSON.stringify(data));
  if( isEmpty(DG.instanceIds[data.instanceId]) ) { DG.instanceIds[data.instanceId] = {};}
  if( isEmpty(DG.instanceIds[data.instanceId][data.actionId]) ) { DG.instanceIds[data.instanceId][data.actionId] = {}; }
  if( data.actionId === 'discord_select_channel' && data.listId !== 'discordServerChannel') {
    DG.instanceIds[data.instanceId][data.actionId][data.listId]  = data.value;

    let guildName = undefined;
    let channelType = 'Text';

    if( !isEmpty(DG.instanceIds[data.instanceId][data.actionId].discordServerList)) {
        guildName = DG.instanceIds[data.instanceId][data.actionId].discordServerList;
    }

    if( !isEmpty(DG.instanceIds[data.instanceId][data.actionId].discordChannelType)) {
        channelType = DG.instanceIds[data.instanceId][data.actionId].discordChannelType;
    }

    if( isEmpty(guildName) || isEmpty(channelType) ) { return; }

    if( !isEmpty(DG.guilds.idx) && DG.guilds.idx[guildName] ) {
      let guildId = DG.guilds.idx[guildName];
      TPClient.choiceUpdateSpecific('discordServerChannel',DG.channels[guildId][channelType.toLowerCase()].array,data.instanceId);
    }
  }
});



// - START - Discord   --- This really should be a class?
const connectToDiscord = function () {
  try{
      DG.Client = new RPC.Client({ transport: "ipc" });
      // Discord Events

      DG.Client.on("ready", async () => {
        if (!DG.accessToken || ( DG.Client.accessToken != undefined && DG.accessToken != DG.Client.accessToken )) {
          DG.accessToken = DG.Client.accessToken;
        }
      
        TPClient.stateUpdate("discord_connected","Connected");
        TPClient.settingUpdate("Plugin Connected","Connected");
      
        await DG.Client.subscribe("VOICE_SETTINGS_UPDATE").catch((err) => {logIt("ERROR",err)});
        await DG.Client.subscribe("GUILD_CREATE").catch((err) => {logIt("ERROR",err)});
        await DG.Client.subscribe("CHANNEL_CREATE").catch((err) => {logIt("ERROR",err)});
        await DG.Client.subscribe("VOICE_CHANNEL_SELECT").catch((err) => {logIt("ERROR",err)});
        await DG.Client.subscribe("VOICE_CONNECTION_STATUS").catch((err) => {logIt("ERROR",err)});
        await DG.Client.subscribe("VIDEO_STATE_UPDATE").catch((err) => {logIt("ERROR",err)});
        await DG.Client.subscribe("SCREENSHARE_STATE_UPDATE").catch((err) => {logIt("ERROR",err)});
        await DG.Client.subscribe("NOTIFICATION_CREATE").catch((err) => {logIt("ERROR",err)});
      
        // DG.Client.on("VOICE_STATE_CREATE", (data) => {voiceState('create',data);})
        // DG.Client.on("VOICE_STATE_UPDATE", (data) => {voiceState('update',data);})
        // DG.Client.on("VOICE_STATE_DELETE", (data) => {voiceState('delete',data);})
        // DiscordClient.on("MESSAGE_CREATE", (data) => {console.log("DEBUG", JSON.stringify(data))}) 
      
        // this triggers automatically when we connect to discord rpc.. dont thnk this is needed
        // const voiceSettings = await DiscordClient.getVoiceSettings().catch((err) => {logIt("ERROR",err)});
        // voiceActivity(voiceSettings);
        await getGuilds();
        await getSoundboardSounds();
      });
    

      // Need to create some state to store the last X notifications?  
      // Maybe make an event for if DM, vs if normal message?
      DG.Client.on("NOTIFICATION_CREATE", (data) => {
        // When getting DMs, or Tagged in a message.. can give  you details as to where.. so could set up a button to take to channel where tagged technically..
        // Select channel action would need a custom input for channel ID
        logIt("INFO","Notification Create", JSON.stringify(data));
      })
      
      DG.Client.on("VOICE_STATE_CREATE", (data) => {
        voiceState('create',data);
      })

      DG.Client.on("VOICE_STATE_UPDATE", (data) => {
        voiceState('update',data);
      })

      DG.Client.on("VOICE_STATE_DELETE", (data) => {
        voiceState('delete',data);
      })

      DG.Client.on("SPEAKING_START", (data) => {
        voiceState('speaking',data);
      })
    
      DG.Client.on("SPEAKING_STOP", (data) => {
        voiceState('stop_speaking',data);
      })
    
      DG.Client.on('VOICE_SETTINGS_UPDATE', (data) => {
        voiceActivity(data);
      })

      DG.Client.on('GUILD_CREATE', (data) => {
        guildCreate(data);
      })
      DG.Client.on('CHANNEL_CREATE', (data) => {
        channelCreate(data);
      })
      DG.Client.on('VOICE_CHANNEL_SELECT', (data) => {
        voiceChannel(data);
      })

      DG.Client.on('VOICE_CONNECTION_STATUS', (data) => {
        voiceConnectionStatus(data);
      })

      DG.Client.on('VIDEO_STATE_UPDATE', (data) => {
        TPClient.stateUpdate("discord_camera_status",data.active? "On" : "Off")
      })
    
      DG.Client.on('SCREENSHARE_STATE_UPDATE', (data) => {
        TPClient.stateUpdate("discord_screenshare_status",data.active? "On" : "Off")
      })
    
      DG.Client.on("disconnected", () => {
        logIt("WARN","discord connection closed, will attempt reconnect, once process detected");
        TPClient.settingUpdate("Plugin Connected","Disconnected");
        TPClient.stateUpdate("discord_connected","Disconnected");
        if( platform != 'win32' ) {
          return doLogin();
        }
      });

  discordLogin()

  }
  catch(e) {
    logIt("ERROR","Error in connectToDiscord",e);
  }
};
// - END - Discord


function discordLogin() {
  DG.Client.login({
    clientId : DG.pluginSettings["Discord Client Id"],
    clientSecret: DG.pluginSettings["Discord Client Secret"],
    accessToken: DG.accessToken,
    scopes: DG.scopes,
    redirectUri: DG.redirectUri,
    prompt: 'none'
  }).catch((error) => {
    logIt("ERROR","login error",error);
    if( error.code == 4009 ) {
      DG.connecting = false;
      DG.accessToken = null;
      logIt("INFO","Attempting Login again");
      doLogin();
    }
  });
}

// Discord Login 
const waitForClientId = (timeoutms) =>
  new Promise((r, j) => {
    const check = () => {
      if (!isEmpty(DG.pluginSettings["Discord Client Id"]) && !isEmpty(DG.pluginSettings["Discord Client Secret"])) {
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
    DG.connecting = true;
    const check = () => {
      if (DG.Client && DG.Client.user != null) {
        DG.connecting = false;
        r();
      } else {
        connectToDiscord();
        if (DG.Client && DG.Client.user != null) {
          DG.connecting = false;
          r();
        } else { 
          setTimeout(check, 5000);
        }
      }
    };
    setTimeout(check,500);
  });

async function doLogin() {
  if( DG.connecting ) { return; }
  if( DG.Client ) {
    DG.Client.removeAllListeners();
    DG.Client.destroy();
    DG.Client = null;
  }

  if (isEmpty(DG.pluginSettings["Discord Client Id"]) || isEmpty(DG.pluginSettings["Discord Client Secret"]) ) {
    open(`https://discord.com/developers/applications`);

    await waitForClientId(30 * 60 * 1000); // wait for 30 minutes
  }

  // Start Login process
  await waitForLogin(); 
}



// Process Watcher
DG.procWatcher.on('processRunning', (processName) => {
  logIt('INFO',`${processName} detected as running`);
  DG.isRunning = true;
  TPClient.stateUpdate('discord_running',DG.isRunning ? 'Yes' : 'No');
  // Lets shutdown the connection so we can re-establish it
  setTimeout(function() {
      logIt('INFO', "Discord is running, attempting to Connect");
      doLogin();
  }, 1000);
});

DG.procWatcher.on('processTerminated', (processName) => {
  logIt('WARN',`${processName} not detected as running`);
  if( !DG.isRunning ) {
      // We already did this once, don't need to keep repeating it
      return;
  }
  logIt('WARN',`Disconnect active connections to Discord`);
  DG.isRunning = false;
  TPClient.stateUpdate('discord_running',DG.isRunning ? 'Yes' : 'No');
  if ( DG.Client ) {
    DG.Client.removeAllListeners();
    DG.Client.destroy();
    DG.Client = null;
  }
});
// End Process Watcher





const getGuild = async(data) => {
  let guild = await DG.Client.getGuild(data.id);
  await assignGuildIndex(guild,1);

  TPClient.choiceUpdate('discordServerList',DG.guilds.array)
};

const getGuildChannels = async (guildId ) => {
  logIt("DEBUG","getGuildChannels for guildId",guildId);
  let channels = await DG.Client.getChannels(guildId);
  if( !channels ) { logIt("ERROR","No channel data available for guildId",guildId); return; }
  return channels; 
}


const getChannel = async (data) => {
  let channel = await DG.Client.getChannel(data.id);
  assignChannelIndex(channel.guild_id,channel);
};


const guildCreate = async (data) => {
  logIt("DEBUG",'Guild Create:',JSON.stringify(data));
  getGuild(data);
};
const channelCreate = async (data) => {
  logIt("DEBUG",'Channel Create:',JSON.stringify(data));
  getChannel(data);
};


const getGuilds = async () => {
  let data = await DG.Client.getGuilds();

  if( !data || !data.guilds ) { logIt("ERROR", "guild data not available"); return; }

  DG.guilds = {
    array : [],
    idx: {}
  };

  // Switched this up because of the .forEach not honoring the await process,
  // but native if does
  for ( let i = 0; i < data.guilds.length; i++ ) {
    await assignGuildIndex(data.guilds[i],i);
  }

  TPClient.choiceUpdate('discordServerList',DG.guilds.array)

  const voiceChannelData = await DG.Client.getSelectedVoiceChannel();
  if( voiceChannelData != null ) {
    voiceChannelData.channel_id = voiceChannelData.id;
    voiceChannel(voiceChannelData);
  }
};



const assignGuildIndex = async (guild, counter) => {
  DG.guilds.array.push(guild.name);
  DG.guilds.idx[guild.name] = guild.id;
  DG.guilds.idx[guild.id] = guild.name;

  //Look into maybe using a promise and an await here.. 
  // to limit having to do this timeout thingy
  await buildGuildChannelIndex(guild.id);
};


const buildGuildChannelIndex = async(guildId) => {
  let chData = await getGuildChannels(guildId);

  DG.channels[guildId] = {
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
    DG.channels[guildId].text.array.push(channel.name);
    DG.channels[guildId].text.idx[channel.name] = channel.id;
    DG.channels[guildId].text.names[channel.id] = channel.name;
  }
  else if( channel.type == 2 ) {
    DG.channels[guildId].voice.array.push(channel.name);
    DG.channels[guildId].voice.idx[channel.name] = channel.id;
    DG.channels[guildId].voice.names[channel.id] = channel.name;
  }
}



////////////
const voiceChannel = async (data) => {
  logIt("DEBUG","Voice Channel join", JSON.stringify(data));
  //  await DiscordClient.subscribe("MESSAGE_CREATE", { channel_id: "1125087354969915464"}).catch((err) => {logIt("ERROR",err)});
  await clearUserStates();
  await unsubscribeFromEvents();

  if ( data.channel_id == null ) {
    DG.voice_channel_name = '<None>'
    DG.voice_channel_id = '<None>'
    DG.voice_channel_server_id = '<None>'
    DG.voice_channel_server_name = '<None>'
    DG.voice_channel_participants = '<None>'
    DG.voice_channel_participant_ids = '<None>'
  }
  else if ( data.guild_id == null ) {

    DG.voice_channel_id = data.channel_id;
    DG.voice_channel_name = 'Personal';
    DG.voice_channel_server_id = 'Personal';
    DG.voice_channel_server_name = 'Personal';

    // Subscribe to voice channel events
    await subscribeToEvents(data.channel_id);

  }
  else {
    // Lookup Voice Channel Name
    if (!DG.channels[data.guild_id] || !DG.channels[data.guild_id].voice) {
      getGuildChannels(data.guild_id).then(() => {
        if (DG.channels[data.guild_id] && DG.channels[data.guild_id].voice) {
          DG.voice_channel_name = DG.channels[data.guild_id].voice.names[data.channel_id];
        }
      });
    } else {
      DG.voice_channel_name = DG.channels[data.guild_id].voice.names[data.channel_id];
    }
    
    DG.voice_channel_id = data.channel_id;
    DG.voice_channel_server_id = data.guild_id;

    try {
      // was getting times where the guilds.idx was not available on a fresh boot
      DG.voice_channel_server_name = DG.guilds.idx[data.guild_id];
    } catch (error) {
      // Call getGuilds function to initialize guilds in case it's not available
      DG.guilds = await getGuilds();
      DG.voice_channel_server_name = DG.guilds.idx[data.guild_id];
    } 

    logIt("DEBUG","Subscribing to Voice Channel [", DG.voice_channel_name, "] with ID [", DG.voice_channel_id, "] on Server [", DG.voice_channel_server_name, "] with ID [", DG.voice_channel_server_id ,"]");

    // Subscribe to voice channel events
    await subscribeToEvents(data.channel_id);

    logIt("DEBUG","COMPLETE - Subscribing to Voice Channel")
  }
      
    if(DG.voice_channel_id !== '<None>' ) {
      let ids = [];
      const channel = await DG.Client.getChannel(DG.voice_channel_id)
      channel.voice_states.forEach((vs,i) => {
        if (vs.user.id !== DG.Client.user.id) {
        vs.speaking = false // adding speaking to the object to track speaking status
        DG.currentVoiceUsers[vs.user.id] = vs;
        }
      })

      DG.voice_channel_participants = Object.keys(DG.currentVoiceUsers).length > 0 ? Object.keys(DG.currentVoiceUsers).join("|") : '<None>'
      Object.keys(DG.currentVoiceUsers).forEach((key,i) => {

        // Making sure not to add Client User to the list as it's not needed and would likely cause issues being in the flow of things for certain actions that cant be used on the client user
      if (DG.currentVoiceUsers[key].user.id !== DG.Client.user.id) {
        ids.push(DG.currentVoiceUsers[key].user.id);

          // For Each user, update the states when joining
        TPClient.stateUpdateMany([
          {id: [`user_${i}_Speaking`], value: "Off"},
          {id: [`user_${i}_id`], value: DG.currentVoiceUsers[key].user.id},
          {id: [`user_${i}_nick`], value: DG.currentVoiceUsers[key].nick},
          {id: [`user_${i}_mute`], value: DG.currentVoiceUsers[key].voice_state.mute ? "On" : "Off"},
          {id: [`user_${i}_deaf`], value: DG.currentVoiceUsers[key].voice_state.deaf ? "On" : "Off"},
          {id: [`user_${i}_avatar`], value: DG.currentVoiceUsers[key].user.avatar},
          {id: [`user_${i}_volume`], value: DG.currentVoiceUsers[key].volume}
        ]);
        }  
      })
        DG.voice_channel_participant_ids = ids.length > 0 ? ids.join("|") : '<None>'
    }

    let states = [
      { id: 'discord_voice_channel_name', value: DG.voice_channel_name},
      { id: 'discord_voice_channel_id', value: DG.voice_channel_id},
      { id: 'discord_voice_channel_server_name', value: DG.voice_channel_server_name},
      { id: 'discord_voice_channel_server_id', value: DG.voice_channel_server_id },
      { id: 'discord_voice_channel_participants', value: DG.voice_channel_participants},
      { id: 'discord_voice_channel_participant_ids', value: DG.voice_channel_participant_ids}
    ];

    TPClient.stateUpdateMany(states);
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
      const subscription = await DG.Client.subscribe(event.name, { channel_id: channelId }).catch((err) => { logIt("ERROR", err) });
      logIt("DEBUG", `Subscribed to ${event.description}`);
      DG.last_voice_channel_subs.push(subscription);
      await wait(0.1);
    }
}
  
async function unsubscribeFromEvents() {
    if (DG.last_voice_channel_subs.length > 0) {
      logIt("DEBUG","START- Unsubscribing from Voice Channel voice states");
      for(let i = 0; i < DG.last_voice_channel_subs.length; i++) {
        logIt("DEBUG", "Unsubscribing from subscription ",i);
        await DG.last_voice_channel_subs[i].unsubscribe();
        await wait(0.1);
      }
  
      logIt("DEBUG","COMPLETE - Unsubscribing from Voice Channel voice states");
      DG.last_voice_channel_subs = []
      DG.currentVoiceUsers= {}
      await wait(0.1)
    }
}
  
async function clearUserStates() {
    // Iterate over all users in currentVoiceUsers
    Object.keys(DG.currentVoiceUsers).forEach((userId, index) => {
      // Using the "default userstates" to reset the user states
      let stateUpdates = DG.DEFAULTUSERSTATES.map(state => {
        return { id: `user_${index}_${state.id}`, value: state.value };
      });
      TPClient.stateUpdateMany(stateUpdates);
    });
      // Clear DG.currentVoiceUsers
      DG.currentVoiceUsers = {};
}
///////////  

// General

const getSoundboardSounds = async () => {
  
  let sounds = await DG.Client.getSoundboardSounds();
  
  if( sounds != null ) {
    DG.soundBoard = {
      array: [],
      idx: {}
    }

    for( const sound of sounds ) {
      let emojiName = sound.emoji_name != null ? sound.emoji_name + ' - ' : '';
      let guildName = sound.guild_id === "DEFAULT" ? "Discord Sounds" : DG.guilds.idx[sound.guild_id]
      let soundName = guildName + " - " + emojiName + sound.name;
      DG.soundBoard.array.push(soundName);
      DG.soundBoard.idx[soundName] = sound;
      DG.soundBoard.idx[sound.sound_id] = sound;
    }

    // Sort by Discord Guild name - seems to make the most sense to collect them into grouped areas.
    DG.soundBoard.array.sort();

    TPClient.choiceUpdate('discordSound',DG.soundBoard.array);
  }
};




// For Voice Channel Stuff
const deleteUserStates = async (data) => {
    let userId = Object.keys(DG.currentVoiceUsers).indexOf(data.user.id);

    // Using the "default userstates" to reset the user states
    let stateUpdates = DG.DEFAULTUSERSTATES.map(state => {
      return { id: `user_${userId}_${state.id}`, value: state.value };
    });

    TPClient.stateUpdateMany(stateUpdates);
    delete DG.currentVoiceUsers[data.user.id];
  };

  const updateUserStates = async (data) => {
    const userIndex = Object.keys(DG.currentVoiceUsers).indexOf(data.user.id);

    for (let key in data.voice_state) {
      if (key === 'suppress') continue;
      const stateValue = data.voice_state[key] ? "On" : "Off";
      TPClient.stateUpdate(`user_${userIndex}_${key}`, stateValue);
    }
    TPClient.stateUpdate(`user_${userIndex}_id`, data.user.id);
    TPClient.stateUpdate(`user_${userIndex}_nick`, data.nick);
    TPClient.stateUpdate(`user_${userIndex}_volume`, Math.round(data.volume));
    TPClient.stateUpdate(`user_${userIndex}_avatar`, data.user.avatar);
    TPClient.stateUpdate(`user_${userIndex}_mute`, data.mute ? "On" : "Off");

    // Divide by 2 to convert range from 0-200 to 0-100
    let volume = convertVolumeToPercentage(data.volume) / 2;
    TPClient.connectorUpdate(`discord_voice_volume_action_connector|voiceUserList_connector=${userIndex}`, volume);


    if (DG.customVoiceAcivityUsers.hasOwnProperty(data.user.id)) {

      let userId = DG.customVoiceAcivityUsers[data.user.id];
      let updates = [
        { id: `${userId}_id`, value: data.user.id },
        { id: `${userId}_nick`, value: data.nick },
        { id: `${userId}_avatar`, value: data.user.avatar },
        { id: `${userId}_mute`, value: data.mute ? "On" : "Off" },
        { id: `${userId}_deaf`, value: data.voice_state.deaf ? "On" : "Off" },
        { id: `${userId}_self_deaf`, value: data.voice_state.self_deaf ? "On" : "Off" },
        { id: `${userId}_self_mute`, value: data.voice_state.self_mute ? "On" : "Off" },
        { id: `${userId}_volume`, value: Math.round(data.volume) }
      ];
      TPClient.stateUpdateMany(updates);

    } 
  };

function handleSpeakingEvent(event, data) {
    if (DG.currentVoiceUsers.hasOwnProperty(data.user_id)) {
      const isSpeaking = event === "speaking";
      DG.currentVoiceUsers[data.user_id].speaking = isSpeaking;
      const userIndex = Object.keys(DG.currentVoiceUsers).indexOf(data.user_id);
      TPClient.stateUpdate(`user_${userIndex}_Speaking`, isSpeaking ? "On" : "Off");


      // Check if user in custom watch list..
      let userId = data.user_id;
      if (DG.customVoiceAcivityUsers.hasOwnProperty(userId)) {
        // console.log("User exists");
        TPClient.stateUpdate(`${DG.customVoiceAcivityUsers[userId]}_Speaking`, isSpeaking ? "On" : "Off");
      }
  
      logIt("INFO", DG.currentVoiceUsers[data.user_id].nick, isSpeaking ? "started speaking" : "stopped speaking");
    }
}


const voiceConnectionStatus = async (data) => {
    logIt("DEBUG",'Voice Connection:',JSON.stringify(data));
    if( data.state != null && data.state == 'VOICE_CONNECTED' ) {
      // Set Voice Channel Connect State
      DG.voice_channel_connected = 'Yes';
      DG.voice_average_ping = data.average_ping.toFixed(2);
      DG.voice_hostname = data.hostname;
    }
    else if( data.state != null && data.state == 'DISCONNECTED' ) {
      //Set Voice Channel Connect State Off
      DG.voice_channel_connected = 'No';
      DG.voice_average_ping = '0';
      DG.voice_hostname = '<None>';
      DG.voice_channel_participants = '<None>'
    }
    let states = [
      { id: 'discord_voice_channel_connected', value: DG.voice_channel_connected},
      { id: 'discord_voice_average_ping', value: DG.voice_average_ping},
      { id: 'discord_voice_hostname', value: DG.voice_hostname },
      { id: 'discord_voice_channel_name', value: DG.voice_channel_name},
      { id: 'discord_voice_channel_id', value: DG.voice_channel_id},
      { id: 'discord_voice_channel_server_name', value: DG.voice_channel_server_name},
      { id: 'discord_voice_channel_server_id', value: DG.voice_channel_server_id },
      { id: 'discord_voice_channel_participants', value: DG.voice_channel_participants}
    ];
    TPClient.stateUpdateMany(states);
};

const voiceState = async (event,data) => {
  logIt("DEBUG","Voice State", event, JSON.stringify(data));
  let ids = [];

  if (event !== "delete" && event !== "speaking" && event !== "stop_speaking") {
    DG.currentVoiceUsers[data.user.id] = data;
  }

  if (event === "delete") {
    deleteUserStates(data);
  }

  if (event === "speaking" || event === "stop_speaking") {
    handleSpeakingEvent(event, data);
  }
  
  if (event === "update") {
    if (data.user.id !== DG.Client.user.id) {
      updateUserStates(data);
    }
  }

  const userKeys = Object.keys(DG.currentVoiceUsers);
  DG.voice_channel_participants = userKeys.length > 0 ? userKeys.join("|") : '<None>';

  const participant_ids = userKeys
    .filter(key => DG.currentVoiceUsers[key].user)
    .map(key => DG.currentVoiceUsers[key].user.id);
  
  DG.voice_channel_participant_ids = participant_ids.join("|");
  
  TPClient.stateUpdateMany([
    { 'id': 'discord_voice_channel_participants', 'value': DG.voice_channel_participants },
    { 'id': 'discord_voice_channel_participant_ids', 'value': DG.voice_channel_participant_ids}
  ]);

};

const voiceActivity = function (newData) {
  logIt("DEBUG","voiceActivity", JSON.stringify(newData));
  const data = diff(DG.prevVoiceActivityData, newData)
  // We always need these
  data.mute = newData.mute
  data.deaf = newData.deaf
  DG.prevVoiceActivityData = newData;
  const states = []
  const connectors = []

  if( data.hasOwnProperty('mute')) {
    if (data.mute) {
      DG.muteState = 1;
    } else {
      DG.muteState = 0;
    }

    logIt("discord mute is "+DG.muteState)
    states.push({ id: "discord_mute", value: DG.muteState ? "On" : "Off" })
}
if( data.hasOwnProperty('deaf')) {
  if (data.deaf) {
    DG.deafState = 1;
    DG.muteState = 1;
  } else {
    DG.deafState = 0;
  }
  states.push({ id: "discord_deafen", value: DG.deafState ? "On" : "Off" })
  states.push({ id: "discord_mute", value: DG.muteState ? "On" : "Off" })
  logIt("discord deafen is "+DG.deafState)
}

if( data.hasOwnProperty('input') && data.input.hasOwnProperty('volume') && data.input.volume > -1) {
  DG.voice_volume  = convertVolumeToPercentage(data.input.volume);
  states.push({ id: "discord_voice_volume", value: DG.voice_volume  })
  connectors.push({ id: "discord_voice_volume_connector", value: DG.voice_volume  })
}
if( data.hasOwnProperty('output') && data.output.hasOwnProperty('volume') && data.output.volume > -1) {
  DG.speaker_volume = convertVolumeToPercentage(data.output.volume);
  DG.speaker_volume_connector = Math.round(convertVolumeToPercentage(data.output.volume)/2);
  states.push({ id: "discord_speaker_volume", value: DG.speaker_volume })
  connectors.push({ id: "discord_speaker_volume_connector", value: DG.speaker_volume_connector })
}
if( data.hasOwnProperty('mode') && data.mode.hasOwnProperty('type') && data.mode.type != '') {
  DG.voice_mode_type = data.mode.type;
  states.push( { id: "discord_voice_mode_type", value: DG.voice_mode_type })
}
if( data.hasOwnProperty('automatic_gain_control') || data.hasOwnProperty('automaticGainControl')) {
  DG.automatic_gain_control = data.automatic_gain_control || data.automaticGainControl ? 1 : 0;
  states.push({ id: "discord_automatic_gain_control", value: DG.automatic_gain_control ? "On" : "Off" })
}
if( data.hasOwnProperty('noise_suppression') || data.hasOwnProperty('noiseSuppression')) {
  DG.noise_suppression = data.noise_suppression || data.noiseSuppression ? 1 : 0;
  states.push({ id: "discord_noise_suppression", value: DG.noise_suppression ? "On" : "Off" })
}
if( data.hasOwnProperty('echo_cancellation') || data.hasOwnProperty('echoCancellation')) {
  DG.echo_cancellation = data.echo_cancellation || data.echoCancellation ? 1 : 0;
  states.push({ id: "discord_echo_cancellation", value: DG.echo_cancellation ? "On" : "Off" })
}
if( data.hasOwnProperty('silence_warning') || data.hasOwnProperty('silenceWarning')) {
  DG.silence_warning = data.silence_warning || data.silenceWarning ? 1 : 0;
  states.push({ id: "discord_silence_warning", value: DG.silence_warning ? "On" : "Off" })
}
if( data.hasOwnProperty('qos') || data.hasOwnProperty('qos')) {
  DG.qos_priority = data.qos ? 1 : 0;
  states.push({ id: "discord_qos_priority", value: DG.qos_priority ? "On" : "Off" })
}

if( states.length > 0 ) {
  TPClient.stateUpdateMany(states);
}
if( connectors.length > 0 ) {
  TPClient.connectorUpdateMany(connectors);
}
};


// We are going to connect to TP first, then Discord
// That way if TP shuts down the plugin will be shutdown too
TPClient.connect({ pluginId: DG.pluginId, updateUrl:DG.updateUrl });
