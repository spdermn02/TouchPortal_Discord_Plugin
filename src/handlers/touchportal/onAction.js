// TPClient onAction

const TPClient = require('../../core/TPCLIENT.js');
const discordKeyMap = require("../../utils/discordkeys.js");
const { DG } = require('../../config.js');
const { logIt, getUserIdFromIndex, convertPercentageToVolume, setStateBasedOnValue } = require('../../utils/helpers.js');


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