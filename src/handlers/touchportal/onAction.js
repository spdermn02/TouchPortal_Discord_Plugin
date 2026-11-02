// TPClient onAction

const { ActivityType } = require("../../../discord-rpc/src/constants.js");
const discordKeyMap = require("../../utils/discordKeys.js");

const {
  logIt,
  getUserIdFromIndex,
  convertPercentageToVolume,
  setStateBasedOnValue,
  dataValue,
  toInt,
} = require("../../utils/helpers.js");

// One repeat timer per held action. A single shared global let two held buttons overwrite
// each other's timer id, leaving one ramping forever.
const holdTimers = new Map();

function stopHold(key) {
  const timer = holdTimers.get(key);
  if (timer) {
    clearInterval(timer);
    holdTimers.delete(key);
  }
}

function startHold(key, DG, tick) {
  stopHold(key);
  holdTimers.set(
    key,
    setInterval(() => {
      // Connection dropped while the button is held: stop instead of throwing every 100ms.
      if (!DG.Client || !DG.connected) {
        stopHold(key);
        return;
      }
      try {
        tick();
      } catch (err) {
        stopHold(key);
        logIt("ERROR", `held action ${key}: ${err}`);
      }
    }, 100),
  );
}

// Resolve the voice-user choice (an index into the current channel, or a CustomN alias from
// the VoiceActivity Tracker setting) to a Discord user id.
function resolveUserId(choice, DG) {
  if (choice === undefined) {
    return undefined;
  }
  const customId = Object.keys(DG.customVoiceAcivityUsers).find((key) => DG.customVoiceAcivityUsers[key] === choice);
  if (customId) {
    return customId;
  }
  return getUserIdFromIndex(choice, DG.currentVoiceUsers);
}

async function onAction(message, isHeld, DG) {
  logIt("DEBUG", JSON.stringify(message));
  if (!message || !message.actionId) {
    return;
  }
  if (!DG.Client) {
    logIt("WARN", `Action ${message.actionId}: no Discord client, ignoring`);
    return;
  }
  if (message.actionId === "discord_select_channel") {
    let server = dataValue(message, 0);
    let type = dataValue(message, 1);
    let channelName = dataValue(message, 2);
    let guildId = DG.guilds && DG.guilds.idx ? DG.guilds.idx[server] : undefined;

    logIt("DEBUG", "select discord channel", server, channelName, guildId);

    const channelList = guildId && type && DG.channels[guildId] && DG.channels[guildId][String(type).toLowerCase()];
    let channelId = channelList ? channelList.idx[channelName] : undefined;
    if (!channelId) {
      logIt("WARN", `Select channel: could not find ${type} channel "${channelName}" on "${server}"`);
      return;
    }

    try {
      if (type === "Voice") {
        await DG.Client.selectVoiceChannel(channelId, {
          timeout: 5,
          force: true,
        });
      } else {
        await DG.Client.selectTextChannel(channelId, { timeout: 5 });
      }
    } catch (error) {
      logIt("ERROR", `Failed to select channel: Channel ID: ${channelId}`);
      logIt("DEBUG", error);
    }
  } else if (message.actionId === "discord_setActivity") {
    let activityType = dataValue(message, 0);
    let activityDetails = dataValue(message, 1);
    let activityState = dataValue(message, 2);
    let activityName = dataValue(message, 3);
    // let activityImage = message.data[4].value;
    // let activityImageText = message.data[5].value;
    // let activityStartTimestamp = message.data[6].value;
    // let activityLargeImageKey = message.data[7].value;
    // let activityLargeImageText = message.data[8].value;
    // let activitySmallImageKey = message.data[9].value;
    // let activitySmallImageText = message.data[10].value;
    // let activityButtonLabel = message.data[11].value;
    // let activityButtonUrl = message.data[12].value;
    let chosenActivityType = ActivityType[activityType];

    let activity = {
      name: activityName,
      type: chosenActivityType,
      state: activityState,
      details: activityDetails,
      // emoji: {name: "TP_LOGO", id: "1270597276439416934", animated: false},
      // assets: {
      // largeImageKey: activityLargeImageKey,
      // largeImageText: activityLargeImageText,
      // smallImageKey: activitySmallImageKey,
      // smallImageText: activitySmallImageText,
      // },
      // timestamps: {start: Date.now()},
      // buttons: [{label: "Test Button", url: "http://www.touch-portal.com"}, {label: "Test Button 2", url: "http://www.touch-portal.com"}],
    };

    // if (activityImage) {
    //   activity.assets.largeImageKey = activityImage;
    //   activity.assets.largeImageText = activityImageText;
    // }

    await DG.Client.setActivity(activity);
  } else if (message.actionId === "discord_play_sound") {
    let soundValue = dataValue(message, 0);
    let sound;

    if (!DG.soundBoard || !DG.soundBoard.idx) {
      logIt("WARN", "Play sound: soundboard not loaded yet");
      return;
    }

    if (soundValue === "RANDOM SOUND") {
      // Without Nitro only Discord's default sounds can be played cross-server
      const pool = !DG.userPremiumType && DG.soundBoard.default ? DG.soundBoard.default : DG.soundBoard;
      // Filtering out the "RANDOM SOUND" choice before picking a random sound
      const availableSounds = (pool.array || []).filter((soundName) => soundName !== "RANDOM SOUND");
      const randomSoundName = availableSounds[Math.floor(Math.random() * availableSounds.length)];
      sound = pool.idx[randomSoundName];
    } else {
      // Getting sound if not random
      sound = DG.soundBoard.idx[soundValue];
    }
    if (!sound) {
      logIt("WARN", `Play sound: sound "${soundValue}" not found`);
      return;
    }
    try {
      // logIt("INFO", `${sound.name} ${sound.sound_id} ${sound.guild_id}`);
      await DG.Client.playSoundboardSound(sound.name, sound.sound_id, sound.guild_id);
    } catch (err) {
      logIt("ERROR", `Playing a sound failed: ${err}`);
    }
  } else if (message.actionId === "discord_toggle_camera") {
    await DG.Client.toggleVideo();
  } else if (message.actionId == "discord_toggle_screenshare") {
    await DG.Client.toggleScreenshare();
  } else if (
    message.actionId === "discord_dm_voice_select" ||
    message.actionId === "discord_dm_text_select" ||
    message.actionId === "discord_select_channel_custom"
  ) {
    let channelId = dataValue(message, 0);
    let channelType;
    if (message.actionId === "discord_dm_voice_select") {
      channelType = "voice";
    } else if (message.actionId === "discord_dm_text_select") {
      channelType = "text";
    } else if (message.actionId === "discord_select_channel_custom") {
      channelType = dataValue(message, 1); // "text" or "voice"
    }
    channelType = String(channelType || "").toLowerCase();
    channelId = String(channelId || "").trim();
    if (!/^\d+$/.test(channelId)) {
      logIt("WARN", `Select channel: "${channelId}" is not a valid Discord channel ID`);
      return;
    }

    if (channelType === "voice") {
      try {
        await DG.Client.selectVoiceChannel(channelId, {
          timeout: 5,
          force: true,
        });
      } catch (error) {
        logIt("ERROR", `Failed to select voice channel: Channel ID: ${channelId} - Please check for correct ID`);
        logIt("DEBUG", `Select Voice/DM Channel: ${error}`);
      }
    } else if (channelType === "text") {
      try {
        await DG.Client.selectTextChannel(channelId, { timeout: 5 });
      } catch (error) {
        logIt("ERROR", `Failed to select channel: Channel ID: ${channelId} - Please check for correct ID`);
        logIt("DEBUG", `Select Text/DM Channel: ${error}`);
      }
    }
  } else if (message.actionId === "discord_hangup_voice") {
    await DG.Client.selectVoiceChannel(null, { timeout: 5 });
  } else if (message.actionId === "discord_reset_push_to_talk_key") {
    DG.PTTKeys = [];
  } else if (message.actionId === "discord_push_to_talk_key") {
    const keyName = dataValue(message, 0);
    let keyCode = discordKeyMap.keyboard.keyMap[keyName];
    if (keyCode === undefined) {
      logIt("WARN", `Push to talk: unknown key "${keyName}"`);
      return;
    }
    DG.PTTKeys.push({ type: 0, code: keyCode, name: keyName });
  } else if (message.actionId === "discord_set_push_to_talk_key") {
    DG.Client.setVoiceSettings({ mode: { shortcut: DG.PTTKeys } });
  } else if (message.actionId == "discord_voice_mode_change") {
    if (message.data && message.data[0] && message.data[0].id === "discordVoiceMode") {
      let modeType = "";
      if (message.data[0].value === "Push To Talk") {
        modeType = "PUSH_TO_TALK";
      } else if (message.data[0].value === "Voice Activity") {
        modeType = "VOICE_ACTIVITY";
      } else {
        modeType = DG.voiceSettings.voice_mode_type == "VOICE_ACTIVITY" ? "PUSH_TO_TALK" : "VOICE_ACTIVITY";
      }
      DG.Client.setVoiceSettings({ mode: { type: modeType } });
    }
  } else if (message.actionId === "discord_push_to_talk") {
    if (isHeld) {
      DG.Client.setVoiceSettings({ deaf: false, mute: false });
    } else {
      DG.Client.setVoiceSettings({ deaf: false, mute: true });
    }
  } else if (message.actionId === "discord_push_to_mute") {
    if (isHeld) {
      DG.Client.setVoiceSettings({ deaf: false, mute: true });
    } else {
      DG.Client.setVoiceSettings({ deaf: false, mute: false });
    }
  } else if (message.actionId === "discord_voice_volume_action") {
    const userChoice = dataValue(message, 1);
    const userId = resolveUserId(userChoice, DG);
    // Keyed on the button's choice, not the resolved id: if the user leaves mid-hold the id
    // no longer resolves on release, and the timer would be orphaned.
    const holdKey = `voice_volume:${userChoice}`;

    // Release always stops the ramp, even if the user has since left the channel.
    if (isHeld === false) {
      stopHold(holdKey);
      return;
    }
    if (!userId) {
      logIt("WARN", "User not found for volume action", JSON.stringify(message));
      return;
    }
    const amount = toInt(dataValue(message, 0), 0);

    // If isHeld is undefined or null, set the volume directly
    if (isHeld === undefined || isHeld === null) {
      DG.voiceChannelInfo.voice_volume = Math.max(0, Math.min(amount, 200));
      await DG.Client.setUserVoiceSettings(userId, {
        volume: convertPercentageToVolume(DG.voiceChannelInfo.voice_volume),
      });
    }
    // If isHeld is true, start an interval to increase the volume
    if (isHeld) {
      startHold(holdKey, DG, () => {
        DG.voiceChannelInfo.voice_volume = toInt(DG.voiceChannelInfo.voice_volume, 0) + amount * 2;
        DG.voiceChannelInfo.voice_volume = Math.max(0, Math.min(DG.voiceChannelInfo.voice_volume, 200));

        Promise.resolve(
          DG.Client.setUserVoiceSettings(userId, {
            volume: convertPercentageToVolume(DG.voiceChannelInfo.voice_volume),
          }),
        ).catch((err) => logIt("ERROR", `setUserVoiceSettings: ${err}`));
      });
    }
  } else if (message.actionId === "discord_setDefaultAudioDevice_volume") {
    let deviceType = dataValue(message, 0);
    const holdKey = `device_volume:${deviceType}`;
    if (isHeld === false) {
      stopHold(holdKey);
      return;
    }
    if (deviceType !== "Input" && deviceType !== "Output") {
      logIt("WARN", `Device volume: unknown device type "${deviceType}"`);
      return;
    }
    const amount = toInt(dataValue(message, 1), 0);

    const adjustDeviceVolume = () => {
      let volume;
      if (deviceType === "Input") {
        DG.voiceSettings.inputDeviceVolume = toInt(DG.voiceSettings.inputDeviceVolume, 0) + amount;
        DG.voiceSettings.inputDeviceVolume = Math.max(0, Math.min(DG.voiceSettings.inputDeviceVolume, 100));
        volume = DG.voiceSettings.inputDeviceVolume;
      } else {
        DG.voiceSettings.outputDeviceVolume = toInt(DG.voiceSettings.outputDeviceVolume, 0) + amount;
        DG.voiceSettings.outputDeviceVolume = Math.max(0, Math.min(DG.voiceSettings.outputDeviceVolume, 200));
        volume = DG.voiceSettings.outputDeviceVolume;
      }

      const voiceSettings = {
        [deviceType.toLowerCase()]: { volume: convertPercentageToVolume(volume) },
      };

      // Setting the volume
      Promise.resolve(DG.Client.setVoiceSettings(voiceSettings))
        .then(() => logIt("DEBUG", `Successfully set ${deviceType} volume to`, volume))
        .catch((error) => logIt("ERROR", `Error setting ${deviceType} volume:`, error));
    };

    if (isHeld === undefined || isHeld === null) {
      adjustDeviceVolume();
    }
    if (isHeld) {
      startHold(holdKey, DG, adjustDeviceVolume);
    }
  } else if (message.actionId === "discord_setDefaultAudioDevice") {
    let deviceName = dataValue(message, 0);
    let deviceType = dataValue(message, 1);
    logIt("INFO", "Setting default audio device", deviceType, deviceName);

    let devices = [];
    if (deviceType === "Input") {
      devices = DG.voiceSettings.inputDevices;
    } else if (deviceType === "Output") {
      devices = DG.voiceSettings.outputDevices;
    }
    const match = (Array.isArray(devices) ? devices : []).find((device) => device && device.name === deviceName);
    const deviceID = match ? match.id : undefined;

    if (deviceID) {
      if (deviceType === "Input") {
        logIt("DEBUG", "Attempting to set input device to", deviceID);
        await DG.Client.setVoiceSettings({
          input: {
            device: deviceID,
          },
        });
      } else if (deviceType === "Output") {
        logIt("DEBUG", "Attempting to set output device to", deviceID);
        await DG.Client.setVoiceSettings({
          output: {
            device: deviceID,
          },
        });
      }
    } else {
      logIt("WARN", "Device ID not found for device name:", deviceName);
    }
  } else if (Array.isArray(message.data) && message.data.length > 0 && message.data[0]) {
    if (message.data[0].id === "discordDeafenAction") {
      // maintaining backwards compatibility if message.data[1] doesn't exist, for old discord pages with deafen buttons..
      if (!message.data[1] || message.data[1].value === "Self") {
        DG.voiceSettings.deafState = setStateBasedOnValue(message.data[0].value, DG.voiceSettings.deafState);
        DG.Client.setVoiceSettings({ deaf: 1 === DG.voiceSettings.deafState });
        logIt("DEBUG", "Deafen State set to ", DG.voiceSettings.deafState, " for self");
        // we cant deafen other users. only our self..
        // } else {
        // const userId = getUserIdFromIndex(message.data[1].value, DG.currentVoiceUsers);
        // if (userId !== undefined) {
        // DG.voiceSettings.deafState = setStateBasedOnValue(message.data[0].value, DG.voiceSettings.deafState);
        // DG.Client.setUserVoiceSettings(userId, { deaf: 1 === DG.voiceSettings.deafState });
        // logIt("DEBUG","Deafen State set to ",DG.voiceSettings.deafState, " for user ", userId);
        // }
      }
    } else if (message.data[0].id === "discordMuteAction") {
      // maintaing backwards compatible if message.data[1] doesnt exist, for old discord pages with mute buttons..
      if (!message.data[1] || message.data[1].value === "Self") {
        DG.voiceSettings.muteState = setStateBasedOnValue(message.data[0].value, DG.voiceSettings.muteState);
        DG.Client.setVoiceSettings({ mute: 1 === DG.voiceSettings.muteState });
        logIt("DEBUG", "Mute State set to ", DG.voiceSettings.muteState, " for self");
      } else {
        const userId = resolveUserId(message.data[1].value, DG);
        if (userId !== undefined) {
          DG.voiceSettings.muteState = setStateBasedOnValue(message.data[0].value, DG.voiceSettings.muteState);
          DG.Client.setUserVoiceSettings(userId, {
            mute: 1 === DG.voiceSettings.muteState,
          });
          logIt("DEBUG", "Mute State set to ", DG.voiceSettings.muteState, " for user ", userId);
        }
      }
    } else if (message.data[0].id === "discordEchoCancellationAction") {
      DG.voiceSettings.echo_cancellation = setStateBasedOnValue(
        message.data[0].value,
        DG.voiceSettings.echo_cancellation,
      );
      DG.Client.setVoiceSettings({
        echoCancellation: 1 === DG.voiceSettings.echo_cancellation,
      });
    } else if (message.data[0].id === "discordNoiseSuppressionAction") {
      DG.voiceSettings.noise_suppression = setStateBasedOnValue(
        message.data[0].value,
        DG.voiceSettings.noise_suppression,
      );
      DG.Client.setVoiceSettings({
        noiseSuppression: 1 === DG.voiceSettings.noise_suppression,
      });
    } else if (message.data[0].id === "discordAutomaticGainControlAction") {
      DG.voiceSettings.automatic_gain_control = setStateBasedOnValue(
        message.data[0].value,
        DG.voiceSettings.automatic_gain_control,
      );
      DG.Client.setVoiceSettings({
        automaticGainControl: 1 === DG.voiceSettings.automatic_gain_control,
      });
    } else if (message.data[0].id === "discordQOSHighPacketPriorityAction") {
      DG.voiceSettings.qos_priority = setStateBasedOnValue(message.data[0].value, DG.voiceSettings.qos_priority);
      DG.Client.setVoiceSettings({ qos: 1 === DG.voiceSettings.qos_priority });
    } else if (message.data[0].id === "discordSilenceWarningAction") {
      DG.voiceSettings.silence_warning = setStateBasedOnValue(message.data[0].value, DG.voiceSettings.silence_warning);
      DG.Client.setVoiceSettings({
        silenceWarning: 1 === DG.voiceSettings.silence_warning,
      });
    }
  } else {
    logIt("WARN", "No data in Action Message", JSON.stringify(message));
  }
}

module.exports = { onAction };
