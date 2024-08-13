// voiceStateHandler


const {logIt, diff, convertVolumeToPercentage, convertPercentageToVolume, platform} = require("../../utils/helpers.js");


class VoiceStateHandler {
  constructor(DG,  TPClient, userStateHandler, notificationHandler, voiceChannelHandler) {
    this.TPClient = TPClient;
    this.DG = DG
    this.userStateHandler = userStateHandler;
    this.voiceChannelHandler = voiceChannelHandler;
    this.doLogin = null;

    // not using?
    // this.repopulateUserStates = this.userStateHandler.repopulateUserStates;

    this.notification = notificationHandler;
  }

  initiate_doLogin = (doLogin) => {
    this.doLogin = doLogin;
  }

  registerEvents = () => {
    this.DG.Client.on("ready", async () => {
      if (
        !this.DG.accessToken ||
        (this.DG.Client.accessToken != undefined && this.DG.accessToken != this.DG.Client.accessToken)
      ) {
        this.DG.accessToken = this.DG.Client.accessToken;
      }

      logIt("INFO", " < ---------------   Discord Connected   --------------- >");

      this.TPClient.stateUpdate("discord_connected", "Connected");
      this.TPClient.settingUpdate("Plugin Connected", "Connected");
      this.DG.connected = true;

      /// should these subscriptions be moved out of here?

      await this.DG.Client.subscribe("VOICE_SETTINGS_UPDATE").catch((err) => {
        logIt("ERROR", err);
      });
      await this.DG.Client.subscribe("VOICE_CHANNEL_SELECT").catch((err) => {
        logIt("ERROR", err);
      });
      await this.DG.Client.subscribe("VOICE_CONNECTION_STATUS").catch((err) => {
        logIt("ERROR", err);
      });

      await this.DG.Client.subscribe("CHANNEL_CREATE").catch((err) => {
        logIt("ERROR", err);
      });
      await this.DG.Client.subscribe("VIDEO_STATE_UPDATE").catch((err) => {
        logIt("ERROR", err);
      });
      await this.DG.Client.subscribe("SCREENSHARE_STATE_UPDATE").catch((err) => {
        logIt("ERROR", err);
      });
      await this.DG.Client.subscribe("NOTIFICATION_CREATE").catch((err) => {
        logIt("ERROR", err);
      });
      await this.DG.Client.subscribe("GUILD_CREATE").catch((err) => {
        logIt("ERROR", err);
      });
      await this.DG.Client.subscribe("CURRENT_USER_UPDATE").catch((err) => {
        logIt("ERROR", err);
      });
      
      // how to maybe get thread create events? 
      // https://github.com/Wumpus-Central/discrapper-canary/blob/75f0797775371f774081fa60b661b55afe880e76/chunks/218315.js#L36
      

      await this.getGuilds();
      await this.getSoundboardSounds();
    }); 

    // If user changes their name,a vatar, premium_type... 
    this.DG.Client.on("CURRENT_USER_UPDATE", (data) => {
      logIt("DEBUG", "Current User Update", JSON.stringify(data));
      let userId = data.id;
      let userName = data.username; // or global_name ?
      let userPremiumType = data.premium_type;
      let userAvatar = data.avatar;

      this.DG.userID = data.id;
      this.DG.userPremiumType = data.premium_type;
      // we can decide if
      // this.TPClient.stateUpdate("discord_user_id", data.id);
      // this.TPClient.stateUpdate("discord_user_name", data.username);
      // this.TPClient.stateUpdate("discord_user_discriminator", data.discriminator);
      // this.TPClient.stateUpdate("discord_user_avatar", data.avatar);
      // this.TPClient.stateUpdate("discord_user_avatarID", data.avatarID);
    });

    this.DG.Client.on("NOTIFICATION_CREATE", (data) => {
      // When getting DMs, or Tagged in a message.. can give  you details as to where.. so could set up a button to take to channel where tagged technically..
      // Select channel action would need a custom input for channel ID
      this.notification.onNotification(data);
    });

    // should these events be pushed into their own file or remain here?
    this.DG.Client.on("VOICE_STATE_CREATE", (data) => {
      this.voiceState("create", data);
    });

    this.DG.Client.on("VOICE_STATE_UPDATE", (data) => {
      this.voiceState("update", data);
    });

    this.DG.Client.on("VOICE_STATE_DELETE", (data) => {
      this.voiceState("delete", data);
    });

    this.DG.Client.on("SPEAKING_START", (data) => {
      this.voiceState("speaking", data);
    });

    this.DG.Client.on("SPEAKING_STOP", (data) => {
      this.voiceState("stop_speaking", data);
    });

    this.DG.Client.on("VOICE_SETTINGS_UPDATE", (data) => {
      this.voiceSettings(data);
    });

    this.DG.Client.on("GUILD_CREATE", (data) => {
      this.guildCreate(data);
    });

    this.DG.Client.on("CHANNEL_CREATE", (data) => {
      this.channelCreate(data);
    });

    this.DG.Client.on("VOICE_CHANNEL_SELECT", (data) => {
      this.voiceChannelHandler.voiceChannel(data, this.userStateHandler);
    });

    this.DG.Client.on("VOICE_CONNECTION_STATUS", (data) => {
      this.voiceConnectionStatus(data);
    });

    this.DG.Client.on("VIDEO_STATE_UPDATE", (data) => {
      this.TPClient.stateUpdate("discord_camera_status", data.active ? "On" : "Off");
    });

    this.DG.Client.on("SCREENSHARE_STATE_UPDATE", (data) => {
      this.TPClient.stateUpdate("discord_screenshare_status", data.active ? "On" : "Off");
    });

    this.DG.Client.on("disconnected", () => {
      logIt("WARN", "discord connection closed, will attempt reconnect, once process detected");
      this.TPClient.settingUpdate("Plugin Connected", "Disconnected");
      this.TPClient.stateUpdate("discord_connected", "Disconnected");
      this.DG.connected = false;
      if (platform != "win32" && this.DG.pluginSettings["Skip Process Watcher"] === "No") {
        return this.doLogin();
      }
    });
  };

  async voiceState(event, data) {
    logIt("DEBUG", "Voice State", event, JSON.stringify(data));
    let ids = [];

    if (event === "create") {
      if (data.user.id !== this.DG.Client.user.id) {
        await this.userStateHandler.addUserData(data);
      }
    }

    if (event === "delete") {
      this.userStateHandler.deleteUserStates(data);
    }

    if (event === "speaking" || event === "stop_speaking") {
      this.handleSpeakingEvent(event, data);
    }

    if (event === "update") {
      if (data.user.id !== this.DG.Client.user.id) {
        this.userStateHandler.updateUserStates(data);
      }
    }
  }

  handleSpeakingEvent(event, data) {
    let userId = data.user_id;
    if (this.DG.currentVoiceUsers.hasOwnProperty(userId)) {
      const isSpeaking = event === "speaking";

      this.DG.currentVoiceUsers[userId].speaking = isSpeaking;

      const userIndex = Object.keys(this.DG.currentVoiceUsers).indexOf(userId);
      this.TPClient.stateUpdate(`user_${userIndex}_Speaking`, isSpeaking ? "On" : "Off");

      // Check if user in custom watch list..

      if (this.DG.customVoiceAcivityUsers.hasOwnProperty(userId)) {
        // console.log("User exists");
        this.TPClient.stateUpdate(
          `${this.DG.customVoiceAcivityUsers[userId]}_Speaking`,
          isSpeaking ? "On" : "Off"
        );
      }

      logIt(
        "INFO",
        this.DG.currentVoiceUsers[userId].nick,
        isSpeaking ? "started speaking" : "stopped speaking"
      );
    }
  }


  handleDeviceChange(type, data) {
    if (data.hasOwnProperty(type)) {
      logIt("INFO", `Default ${type} device has changed.`);
      
      const devicesArray = Array.isArray(data[type].available_devices) 
        ? data[type].available_devices
        : Object.values(data[type].available_devices);
        
      if (devicesArray.length > 0 && devicesArray.some(device => device.id && device.name)) {
        // This is when we startup and get a full array of devices
        logIt("DEBUG", `Available ${type} devices:`, devicesArray);
    
        this.DG.voiceSettings[`${type}Devices`] = devicesArray;
        this.DG.voiceSettings[`${type}DeviceNames`] = devicesArray.map(device => device.name);
        this.DG.voiceSettings[`${type}DeviceVolume`] = data[type].volume;
        this.DG.voiceSettings[`${type}DeviceId`] = data[type].device_id;
    
        const matchedDevice = this.DG.voiceSettings[`${type}Devices`].find(device => device.id === this.DG.voiceSettings[`${type}DeviceId`]);
    
        if (matchedDevice) {
          this.TPClient.stateUpdate(`discord_${type}Device`, matchedDevice.name);
          this.TPClient.stateUpdate(`discord_default_audio_device_change_eventState`, `${type.charAt(0).toUpperCase() + type.slice(1)}`);

          logIt("DEBUG", `${type.charAt(0).toUpperCase() + type.slice(1)} Device:`, matchedDevice.name);
        } else {
          logIt("ERROR", `No ${type} device matched the ID.`);
        }
      } else {
        // This is when we are already started and the array is empty
        this.DG.voiceSettings[`${type}DeviceId`] = data[type].device_id;
        this.DG.voiceSettings[`${type}DeviceVolume`] = data[type].volume;
    
        const matchedDevice = this.DG.voiceSettings[`${type}Devices`].find(device => device.id === this.DG.voiceSettings[`${type}DeviceId`]);
        if (matchedDevice) {
          this.TPClient.stateUpdate(`discord_${type}Device`, matchedDevice.name);
          this.TPClient.stateUpdate(`discord_default_audio_device_change_eventState`, `${type.charAt(0).toUpperCase() + type.slice(1)}`);
        }
        logIt("DEBUG", `Using ${type} device ID:`, this.DG.voiceSettings[`${type}DeviceId`]);
      }

      this.TPClient.stateUpdate(`discord_default_audio_device_change_eventState`, ``);

    } else {
      logIt("INFO", `No ${type} device data found.`);
    }
  }

  voiceSettings = (newData) => {
    logIt("DEBUG", "voiceSettings", JSON.stringify(newData));
    const data = diff(this.DG.voiceSettings.prevVoiceActivityData, newData);
    // // We always need these
    data.mute = newData.mute;
    data.deaf = newData.deaf;
 
    const states = [];
    const connectors = [];

    if (data.hasOwnProperty('input') && data.input.hasOwnProperty('device_id')) {
      this.handleDeviceChange('input', data);
    }
    if (data.hasOwnProperty('output') && data.output.hasOwnProperty('device_id')) {      
      this.handleDeviceChange('output', data);
    }
    
    if (data.hasOwnProperty("mute") && data.mute != this.DG.voiceSettings.prevVoiceActivityData.mute) {
      if (data.mute) {
        this.DG.voiceSettings.muteState = 1;
      } else {
        this.DG.voiceSettings.muteState = 0;
      }
      logIt("DEBUG", `discord mute is ${this.DG.voiceSettings.muteState} `);
      states.push({id: "discord_mute", value: this.DG.voiceSettings.muteState ? "On" : "Off"});
    }

    if (data.hasOwnProperty("deaf") && data.deaf != this.DG.voiceSettings.prevVoiceActivityData.deaf) {
      if (data.deaf) {
        this.DG.voiceSettings.deafState = 1;
        this.DG.voiceSettings.muteState = 1;
      } else {
        this.DG.voiceSettings.deafState = 0;
        this.DG.voiceSettings.muteState = 0;
      }
      states.push({id: "discord_deafen", value: this.DG.voiceSettings.deafState ? "On" : "Off"});
      states.push({id: "discord_mute", value: this.DG.voiceSettings.muteState ? "On" : "Off"});
      logIt("DEBUG", `discord deafen is ${this.DG.voiceSettings.deafState}`);
    }

    if ( data.hasOwnProperty("input") && data.input.hasOwnProperty("volume") && data.input.volume > -1) {
      this.DG.voiceChannelInfo.voice_volume = convertVolumeToPercentage(data.input.volume);
      states.push({id: "discord_voice_volume", value: this.DG.voiceChannelInfo.voice_volume});
      connectors.push({ id: "discord_voice_volume_connector", value: this.DG.voiceChannelInfo.voice_volume});
    }
    if (
      data.hasOwnProperty("output") && data.output.hasOwnProperty("volume") && data.output.volume > -1) {
      this.DG.voiceChannelInfo.speaker_volume = convertVolumeToPercentage(data.output.volume);
      this.DG.voiceChannelInfo.speaker_volume_connector = Math.round(convertVolumeToPercentage(data.output.volume) / 2);
      states.push({id: "discord_speaker_volume", value: this.DG.voiceChannelInfo.speaker_volume});
      connectors.push({ id: "discord_speaker_volume_connector", value: this.DG.voiceChannelInfo.speaker_volume_connector,});
    }
    if (data.hasOwnProperty("mode") && data.mode.hasOwnProperty("type") && data.mode.type != "") {
      this.DG.voiceSettings.voice_mode_type = data.mode.type;
      states.push({id: "discord_voice_mode_type", value: this.DG.voiceSettings.voice_mode_type});
    }
    if (
      data.hasOwnProperty("automatic_gain_control") ||
      data.hasOwnProperty("automaticGainControl")
    ) {
      this.DG.voiceSettings.automatic_gain_control = data.automatic_gain_control || data.automaticGainControl ? 1 : 0;
      states.push({ id: "discord_automatic_gain_control", value: this.DG.voiceSettings.automatic_gain_control ? "On" : "Off"});
    }
    if (data.hasOwnProperty("noise_suppression") || data.hasOwnProperty("noiseSuppression")) {
      this.DG.voiceSettings.noise_suppression = data.noise_suppression || data.noiseSuppression ? 1 : 0;
      states.push({ id: "discord_noise_suppression", value: this.DG.voiceSettings.noise_suppression ? "On" : "Off"});
    }
    if (data.hasOwnProperty("echo_cancellation") || data.hasOwnProperty("echoCancellation")) {
      this.DG.voiceSettings.echo_cancellation = data.echo_cancellation || data.echoCancellation ? 1 : 0;
      states.push({id: "discord_echo_cancellation", value: this.DG.voiceSettings.echo_cancellation ? "On" : "Off" });
    }
    if (data.hasOwnProperty("silence_warning") || data.hasOwnProperty("silenceWarning")) {
      this.DG.voiceSettings.silence_warning = data.silence_warning || data.silenceWarning ? 1 : 0;
      states.push({
        id: "discord_silence_warning",
        value: this.DG.voiceSettings.silence_warning ? "On" : "Off",
      });
    }
    if (data.hasOwnProperty("qos") || data.hasOwnProperty("qos")) {
      this.DG.voiceSettings.qos_priority = data.qos ? 1 : 0;
      states.push({id: "discord_qos_priority",value: this.DG.voiceSettings.qos_priority ? "On" : "Off"});
    }

    if (states.length > 0) {
      this.TPClient.stateUpdateMany(states);
    }
    if (connectors.length > 0) {
      this.TPClient.connectorUpdateMany(connectors);
    }

    this.DG.voiceSettings.prevVoiceActivityData = newData;

  };

  voiceConnectionStatus = async (data) => {
    logIt("DEBUG", "Voice Connection:", JSON.stringify(data));
    if (data.state != null && data.state == "VOICE_CONNECTED") {
      // Set Voice Channel Connect State
      this.DG.voiceChannelInfo.voice_channel_connected = "Yes";
      this.DG.voiceChannelInfo.voice_average_ping = data.average_ping.toFixed(2);
      this.DG.voiceChannelInfo.voice_hostname = data.hostname;
    } else if (data.state != null && data.state == "DISCONNECTED") {
      //Set Voice Channel Connect State Off
      this.DG.voiceChannelInfo.voice_channel_connected = "No";
      this.DG.voiceChannelInfo.voice_average_ping = "0";
      this.DG.voiceChannelInfo.voice_hostname = "<None>";
      this.DG.voiceChannelInfo.voice_channel_participants = "<None>";
    }
    let states = [
      {id: "discord_voice_channel_connected", value: this.DG.voiceChannelInfo.voice_channel_connected},
      {id: "discord_voice_average_ping", value: this.DG.voiceChannelInfo.voice_average_ping},
      {id: "discord_voice_hostname", value: this.DG.voiceChannelInfo.voice_hostname},
      {id: "discord_voice_channel_name", value: this.DG.voiceChannelInfo.voice_channel_name},
      {id: "discord_voice_channel_id", value: this.DG.voiceChannelInfo.voice_channel_id},
      {id: "discord_voice_channel_server_name", value: this.DG.voiceChannelInfo.voice_channel_server_name},
      {id: "discord_voice_channel_server_id", value: this.DG.voiceChannelInfo.voice_channel_server_id},
      {id: "discord_voice_channel_participants", value: this.DG.voiceChannelInfo.voice_channel_participants},
      {id: "discord_voice_channel_participant_ids", value: this.DG.voiceChannelInfo.voice_channel_participant_ids}
      
    ];
    this.TPClient.stateUpdateMany(states);
  };

  getGuild = async (data) => {
    let guild = await this.DG.Client.getGuild(data.id);
    await this.assignGuildIndex(guild, 1);

    this.TPClient.choiceUpdate("discordServerList", this.DG.guilds.array);
  };

  getGuildChannels = async (guildId) => {
    logIt("DEBUG", "getGuildChannels for guildId", guildId);
    let channels = await this.DG.Client.getChannels(guildId);
    if (!channels) {
      logIt("ERROR", "No channel data available for guildId", guildId);
      return;
    }
    return channels;
  };

  getChannel = async (data) => {
    let channel = await this.DG.Client.getChannel(data.id);
    this.assignChannelIndex(channel.guild_id, channel);
  };

  guildCreate = async (data) => {
    logIt("DEBUG", "Guild Create:", JSON.stringify(data));
    this.getGuild(data);
  };

  channelCreate = async (data) => {
    logIt("DEBUG", "Channel Create:", JSON.stringify(data));
    this.getChannel(data);
  };

  getGuilds = async () => {
    let data = await this.DG.Client.getGuilds();
    logIt("DEBUG", "GetGuilds:", JSON.stringify(data));
    if (!data || !data.guilds) {
      logIt("ERROR", "guild data not available");
      return;
    }

    this.DG.guilds = {
      array: [],
      idx: {},
    };

    // Switched this up because of the .forEach not honoring the await process,
    // but native if does
    for (let i = 0; i < data.guilds.length; i++) {
      await this.assignGuildIndex(data.guilds[i], i);
    }

    this.TPClient.choiceUpdate("discordServerList", this.DG.guilds.array);

    const voiceChannelData = await this.DG.Client.getSelectedVoiceChannel();
    if (voiceChannelData != null) {
      voiceChannelData.channel_id = voiceChannelData.id;
      this.voiceChannelHandler.voiceChannel(voiceChannelData, this.userStateHandler);
    }
  };

  assignGuildIndex = async (guild, counter) => {
    this.DG.guilds.array.push(guild.name);
    this.DG.guilds.idx[guild.name] = guild.id;
    this.DG.guilds.idx[guild.id] = guild.name;

    // -- Done... Look into maybe using a promise and an await here..
    // -- Done... to limit having to do this timeout thingy
    await this.buildGuildChannelIndex(guild.id);
  };


  buildGuildChannelIndex = async (guildId) => {
    let chData = await this.getGuildChannels(guildId);

    this.DG.channels[guildId] = {
      voice: {
        array: [],
        idx: {},
        names: {},
      },
      text: {
        array: [],
        idx: {},
        names: {},
      },
      forum: {
        array: [],
        idx: {},
        names: {},
      },
      announcement: {
        array: [],
        idx: {},
        names: {},
      },
    };

    await Promise.all(
      chData.map(async (channel) => {
        this.assignChannelIndex(guildId, channel);
      })
    );
  };

  assignChannelIndex = (guildId, channel) => {
    if (!this.DG.channels[guildId]) {
      console.error(`Guild ID ${guildId} does not exist in this.DG.channels`);
      return;
    }

    // Type 0 is Text channel, 2 is Voice channel, 5 is Announcement Channels
    if (channel.type == 0 ) {
      this.DG.channels[guildId].text.array.push(channel.name);
      this.DG.channels[guildId].text.idx[channel.name] = channel.id;
      this.DG.channels[guildId].text.names[channel.id] = channel.name;
    } else if (channel.type == 2) {
      this.DG.channels[guildId].voice.array.push(channel.name);
      this.DG.channels[guildId].voice.idx[channel.name] = channel.id;
      this.DG.channels[guildId].voice.names[channel.id] = channel.name;
    } else if (channel.type == 5) {
      this.DG.channels[guildId].announcement.array.push(channel.name);
      this.DG.channels[guildId].announcement.idx[channel.name] = channel.id;
      this.DG.channels[guildId].announcement.names[channel.id] = channel.name;
    } else if (channel.type == 15) {
      // doesnt seem possible to select this type of channel with select_text_channel ?
      this.DG.channels[guildId].forum.array.push(channel.name);
      this.DG.channels[guildId].forum.idx[channel.name] = channel.id;
      this.DG.channels[guildId].forum.names[channel.id] = channel.name;
    }
  };

  getSoundboardSounds = async () => {
    let sounds = await this.DG.Client.getSoundboardSounds();
    if (sounds != null) {
      // Initialize soundboard structure
      this.DG.soundBoard = {
        array: [],
        idx: {},
        default: {
          array: [],
          idx: {}
        },
        nonDefault: {
          array: [],
          idx: {}
        }
      };

      // Process each sound
      for (const sound of sounds) {
        let emojiName = sound.emoji_name ? sound.emoji_name + " - " : "";
        let guildName = sound.guild_id === "DEFAULT" ? "Discord Sounds" : this.DG.guilds.idx[sound.guild_id];
        let soundName = guildName + " - " + emojiName + sound.name;

        logIt("DEBUG", `Processing Sound: ${soundName}, Guild: ${guildName}`);

        // Determine if the sound is default or non-default
        // If user_id is found and it matches the user_Id then they created that sound in their server and they can use it without premium..
        if (sound.guild_id === "DEFAULT" || sound.user_id === this.DG.userID) {
          // Add to default sounds
          logIt("DEBUG", `Adding to default: ${soundName}`);
          this.DG.soundBoard.default.array.push(soundName);
          this.DG.soundBoard.default.idx[soundName] = sound;
        }

        // Add to general soundboard
        this.DG.soundBoard.array.push(soundName);
        this.DG.soundBoard.idx[soundName] = sound;
        this.DG.soundBoard.idx[sound.sound_id] = sound;
    }

   // Adding a random sound feature.. 
   this.DG.soundBoard.default.array.push("RANDOM SOUND")
   this.DG.soundBoard.array.push("RANDOM SOUND")

   this.DG.soundBoard.array.sort();
   this.DG.soundBoard.default.array.sort();
 
  if (this.DG.userPremiumType === 0) {
    this.TPClient.choiceUpdate("discordSound", this.DG.soundBoard.default.array);
    logIt("DEBUG", "User is not premium, default sounds only");
  } else
    this.TPClient.choiceUpdate("discordSound", this.DG.soundBoard.array);
    logIt("DEBUG", "User is premium, all sounds available");
    }
  };
}

module.exports = {VoiceStateHandler};
