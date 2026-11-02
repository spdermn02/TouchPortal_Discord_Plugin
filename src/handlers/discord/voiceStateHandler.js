// voiceStateHandler

const { logIt, diff, convertVolumeToPercentage, platform, discord_paths } = require("../../utils/helpers.js");

// Event handlers run straight off the RPC socket. Anything they throw (or reject with) must
// stop here: an uncaught error in one handler should cost one state update, not the plugin.
const guard = (name, fn) => {
  return (...args) => {
    try {
      const result = fn(...args);
      if (result && typeof result.catch === "function") {
        result.catch((err) => logIt("ERROR", `${name}: ${(err && err.stack) || err}`));
      }
    } catch (err) {
      logIt("ERROR", `${name}: ${(err && err.stack) || err}`);
    }
  };
};

class VoiceStateHandler {
  constructor(DG, TPClient, userStateHandler, notificationHandler, voiceChannelHandler, procWatcher) {
    this.TPClient = TPClient;
    this.DG = DG;
    this.userStateHandler = userStateHandler;
    this.voiceChannelHandler = voiceChannelHandler;
    this.doLogin = null;
    this.processNames = procWatcher.processNames; // this is from procWatcher for us to set processName to false when disconnected..
    // this is a bit of a 'hack' for when user disconnects from a update on discord

    // not using?
    // this.repopulateUserStates = this.userStateHandler.repopulateUserStates;
    this.notification = notificationHandler;

    this.prevMuteState = this.DG.voiceSettings.prevVoiceActivityData.mute;
    this.prevDeafState = this.DG.voiceSettings.prevVoiceActivityData.deaf;
    this.hasPlayedBeforeStopping = false;
  }

  initiate_doLogin = (doLogin) => {
    this.doLogin = doLogin;
  };

  registerEvents = () => {
    this.DG.Client.on(
      "ready",
      guard("ready", async () => {
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

        const events = [
          "VOICE_SETTINGS_UPDATE",
          "VOICE_CHANNEL_SELECT",
          "VOICE_CONNECTION_STATUS",
          "CHANNEL_CREATE",
          "VIDEO_STATE_UPDATE",
          "SCREENSHARE_STATE_UPDATE",
          "NOTIFICATION_CREATE",
          "GUILD_CREATE",
          "CURRENT_USER_UPDATE",
        ];
        for (const event of events) {
          if (!this.DG.Client) {
            return; // torn down mid-startup
          }
          await this.DG.Client.subscribe(event).catch((err) => {
            logIt("ERROR", `subscribe ${event}: ${err}`);
          });
        }

        // how to maybe get thread create events?
        // https://github.com/Wumpus-Central/discrapper-canary/blob/75f0797775371f774081fa60b661b55afe880e76/chunks/218315.js#L36

        await this.getGuilds().catch((err) => logIt("ERROR", `getGuilds: ${err}`));
        await this.getSoundboardSounds().catch((err) => logIt("ERROR", `getSoundboardSounds: ${err}`));
      }),
    );

    // If user changes their name,a vatar, premium_type...
    this.DG.Client.on("CURRENT_USER_UPDATE", (data) => {
      if (!data) {
        return;
      }
      logIt("DEBUG", "Current User Update", data.id);
      // let userId = data.id;
      // let userName = data.username; // or global_name ?
      // let userPremiumType = data.premium_type;
      // let userAvatar = data.avatar;

      this.DG.userId = data.id;
      this.DG.userPremiumType = data.premium_type || 0;
      // we can decide if
      // this.TPClient.stateUpdate("discord_user_id", data.id);
      // this.TPClient.stateUpdate("discord_user_name", data.username);
      // this.TPClient.stateUpdate("discord_user_discriminator", data.discriminator);
      // this.TPClient.stateUpdate("discord_user_avatar", data.avatar);
      // this.TPClient.stateUpdate("discord_user_avatarID", data.avatarID);
    });

    // When getting DMs, or Tagged in a message.. can give  you details as to where.. so could set up a button to take to channel where tagged technically..
    // Select channel action would need a custom input for channel ID
    this.DG.Client.on(
      "NOTIFICATION_CREATE",
      guard("NOTIFICATION_CREATE", (data) => this.notification.onNotification(data)),
    );

    // should these events be pushed into their own file or remain here?
    this.DG.Client.on("VOICE_STATE_CREATE", guard("VOICE_STATE_CREATE", (data) => this.voiceState("create", data)));

    this.DG.Client.on("VOICE_STATE_UPDATE", guard("VOICE_STATE_UPDATE", (data) => this.voiceState("update", data)));

    this.DG.Client.on("VOICE_STATE_DELETE", guard("VOICE_STATE_DELETE", (data) => this.voiceState("delete", data)));

    this.DG.Client.on("SPEAKING_START", guard("SPEAKING_START", (data) => this.voiceState("speaking", data)));

    this.DG.Client.on("SPEAKING_STOP", guard("SPEAKING_STOP", (data) => this.voiceState("stop_speaking", data)));

    this.DG.Client.on("VOICE_SETTINGS_UPDATE", guard("VOICE_SETTINGS_UPDATE", (data) => this.voiceSettings(data)));

    this.DG.Client.on("GUILD_CREATE", guard("GUILD_CREATE", (data) => this.guildCreate(data)));

    this.DG.Client.on("CHANNEL_CREATE", guard("CHANNEL_CREATE", (data) => this.channelCreate(data)));

    this.DG.Client.on(
      "VOICE_CHANNEL_SELECT",
      guard("VOICE_CHANNEL_SELECT", (data) => this.voiceChannelHandler.voiceChannel(data, this.userStateHandler)),
    );

    this.DG.Client.on(
      "VOICE_CONNECTION_STATUS",
      guard("VOICE_CONNECTION_STATUS", (data) => this.voiceConnectionStatus(data)),
    );

    this.DG.Client.on(
      "VIDEO_STATE_UPDATE",
      guard("VIDEO_STATE_UPDATE", (data) => {
        this.TPClient.stateUpdate("discord_camera_status", data && data.active ? "On" : "Off");
      }),
    );

    this.DG.Client.on(
      "SCREENSHARE_STATE_UPDATE",
      guard("SCREENSHARE_STATE_UPDATE", (data) => {
        this.TPClient.stateUpdate("discord_screenshare_status", data && data.active ? "On" : "Off");
      }),
    );

    // Without an error listener, an 'error' emit (e.g. from the transport) throws.
    this.DG.Client.on("error", (err) => logIt("ERROR", `Discord client error: ${err}`));

    this.DG.Client.on("disconnected", () => {
      logIt("WARN", "discord connection closed, will attempt reconnect, once process detected");
      this.TPClient.settingUpdate("Plugin Connected", "Disconnected");
      this.TPClient.stateUpdate("discord_connected", "Disconnected");

      this.DG.connected = false;

      // setting procWatcher processNames to false so we can force it to try to reconnect.
      // Only present when the watcher is actually running (Windows, not skipped): on Linux
      // there is no discord_paths entry at all, and this used to throw and kill the plugin.
      const watched = this.processNames[discord_paths[platform]];
      if (watched) {
        watched.isRunning = false;
      }

      const skipWatcher = String(this.DG.pluginSettings["Skip Process Watcher"] || "").toLowerCase() == "yes";
      if ((platform != "win32" || skipWatcher) && this.doLogin) {
        this.doLogin();
      }
    });
  };

  async voiceState(event, data) {
    logIt("DEBUG", "Voice State", event, JSON.stringify(data));
    if (!data) {
      return;
    }
    const selfId = this.DG.Client && this.DG.Client.user ? this.DG.Client.user.id : undefined;
    // SPEAKING_* events carry user_id; everything else carries a user object.
    if (event !== "speaking" && event !== "stop_speaking" && !(data.user && data.user.id)) {
      logIt("DEBUG", `Voice State ${event}: no user in payload, ignoring`);
      return;
    }

    if (event === "create") {
      if (data.user.id !== selfId) {
        await this.userStateHandler.addUserData(data);
      }
    }

    if (event === "delete") {
      await this.userStateHandler.deleteUserStates(data);
    }

    if (event === "speaking" || event === "stop_speaking") {
      await this.handleSpeakingEvent(event, data);
    }

    if (event === "update") {
      if (data.user.id !== selfId) {
        await this.userStateHandler.updateUserStates(data);
      }
    }
  }

  async handleSpeakingEvent(event, data) {
    let userId = data.user_id;
    // logIt("INFO", "Test");
    // Vine boom 1464809420654645288 1352422295402057759
    if (Object.prototype.hasOwnProperty.call(this.DG.currentVoiceUsers, userId)) {
      const isSpeaking = event === "speaking";

      this.DG.currentVoiceUsers[userId].speaking = isSpeaking;

      const userIndex = Object.keys(this.DG.currentVoiceUsers).indexOf(userId);
      this.TPClient.stateUpdate(`user_${userIndex}_Speaking`, isSpeaking ? "On" : "Off");

      // Check if user in custom watch list..

      if (Object.prototype.hasOwnProperty.call(this.DG.customVoiceAcivityUsers, userId)) {
        // console.log("User exists");
        this.TPClient.stateUpdate(`${this.DG.customVoiceAcivityUsers[userId]}_Speaking`, isSpeaking ? "On" : "Off");
      }

      // if (this.DG.currentVoiceUsers[userId].nick === "") {
      //   if (!this.hasPlayedBeforeStopping) {
      //     await this.DG.Client.playSoundboardSound("Vine boom", "1464809420654645288", "1352422295402057759");
      //     logIt("INFO", "Triggered");
      //     this.hasPlayedBeforeStopping = true;
      //   }

      //   if (!isSpeaking) {
      //     this.hasPlayedBeforeStopping = false;
      //   }
      // }

      logIt("INFO", this.DG.currentVoiceUsers[userId].nick, isSpeaking ? "started speaking" : "stopped speaking");
    }
  }

  handleDeviceChange(type, data) {
    if (Object.prototype.hasOwnProperty.call(data, type)) {
      logIt("INFO", `Default ${type} device has changed.`);

      const available = data[type] && data[type].available_devices;
      const devicesArray = Array.isArray(available) ? available : Object.values(available || {});

      if (devicesArray.length > 0 && devicesArray.some((device) => device.id && device.name)) {
        // This is when we startup and get a full array of devices
        logIt("DEBUG", `Available ${type} devices:`, devicesArray);

        this.DG.voiceSettings[`${type}Devices`] = devicesArray;
        this.DG.voiceSettings[`${type}DeviceNames`] = devicesArray.map((device) => device.name);
        this.DG.voiceSettings[`${type}DeviceVolume`] = data[type].volume;
        this.DG.voiceSettings[`${type}DeviceId`] = data[type].device_id;

        const matchedDevice = this.DG.voiceSettings[`${type}Devices`].find(
          (device) => device.id === this.DG.voiceSettings[`${type}DeviceId`],
        );

        if (matchedDevice) {
          this.TPClient.stateUpdate(`discord_${type}Device`, matchedDevice.name);
          this.TPClient.stateUpdate(
            "discord_default_audio_device_change_eventState",
            `${type.charAt(0).toUpperCase() + type.slice(1)}`,
          );

          logIt("DEBUG", `${type.charAt(0).toUpperCase() + type.slice(1)} Device:`, matchedDevice.name);
        } else {
          logIt("ERROR", `No ${type} device matched the ID.`);
        }
      } else {
        // This is when we are already started and the array is empty
        this.DG.voiceSettings[`${type}DeviceId`] = data[type].device_id;
        this.DG.voiceSettings[`${type}DeviceVolume`] = data[type].volume;

        const knownDevices = this.DG.voiceSettings[`${type}Devices`];
        const matchedDevice = (Array.isArray(knownDevices) ? knownDevices : []).find(
          (device) => device.id === this.DG.voiceSettings[`${type}DeviceId`],
        );
        if (matchedDevice) {
          this.TPClient.stateUpdate(`discord_${type}Device`, matchedDevice.name);
          this.TPClient.stateUpdate(
            "discord_default_audio_device_change_eventState",
            `${type.charAt(0).toUpperCase() + type.slice(1)}`,
          );
        }
        logIt("DEBUG", `Using ${type} device ID:`, this.DG.voiceSettings[`${type}DeviceId`]);
      }

      this.TPClient.stateUpdate("discord_default_audio_device_change_eventState", "");
    } else {
      logIt("INFO", `No ${type} device data found.`);
    }
  }

  voiceSettings = (newData) => {
    logIt("DEBUG", "voiceSettings", JSON.stringify(newData));
    if (!newData || typeof newData !== "object") {
      return;
    }
    const data = diff(this.DG.voiceSettings.prevVoiceActivityData, newData) || {};
    // // We always need these
    data.mute = newData.mute;
    data.deaf = newData.deaf;

    const states = [];
    const connectors = [];

    if (
      data.input != null &&
      typeof data.input === "object" &&
      Object.prototype.hasOwnProperty.call(data.input, "device_id")
    ) {
      this.handleDeviceChange("input", data);
    }
    if (
      data.output != null &&
      typeof data.output === "object" &&
      Object.prototype.hasOwnProperty.call(data.output, "device_id")
    ) {
      this.handleDeviceChange("output", data);
    }
    if (Object.prototype.hasOwnProperty.call(data, "mute") && data.mute !== this.prevMuteState) {
      if (data.mute) {
        this.DG.voiceSettings.muteState = 1;
      } else {
        // Only unmute if not deafened
        if (!data.deaf) {
          this.DG.voiceSettings.muteState = 0;
        }
      }
      logIt("DEBUG", `discord mute is ${this.DG.voiceSettings.muteState}`);
      states.push({ id: "discord_mute", value: this.DG.voiceSettings.muteState ? "On" : "Off" });
    }

    if (Object.prototype.hasOwnProperty.call(data, "deaf") && data.deaf !== this.prevDeafState) {
      if (data.deaf) {
        this.DG.voiceSettings.deafState = 1;
        this.DG.voiceSettings.muteState = 1; // Deafening also mutes
      } else {
        this.DG.voiceSettings.deafState = 0;
        // Only unmute if mute was set due to deafening and not explicitly muted
        if (this.prevDeafState && !data.mute) {
          this.DG.voiceSettings.muteState = 0;
        }
      }
      states.push({ id: "discord_deafen", value: this.DG.voiceSettings.deafState ? "On" : "Off" });
      states.push({ id: "discord_mute", value: this.DG.voiceSettings.muteState ? "On" : "Off" });
      logIt("DEBUG", `discord deafen is ${this.DG.voiceSettings.deafState}`);
    }

    if (
      data.input != null &&
      typeof data.input === "object" &&
      Object.prototype.hasOwnProperty.call(data.input, "volume") &&
      data.input.volume > -1
    ) {
      this.DG.voiceChannelInfo.voice_volume = convertVolumeToPercentage(data.input.volume);
      states.push({ id: "discord_voice_volume", value: this.DG.voiceChannelInfo.voice_volume });
      connectors.push({ id: "discord_voice_volume_connector", value: this.DG.voiceChannelInfo.voice_volume });
    }
    if (
      data.output != null &&
      typeof data.output === "object" &&
      Object.prototype.hasOwnProperty.call(data.output, "volume") &&
      data.output.volume > -1
    ) {
      this.DG.voiceChannelInfo.speaker_volume = convertVolumeToPercentage(data.output.volume);
      this.DG.voiceChannelInfo.speaker_volume_connector = Math.round(convertVolumeToPercentage(data.output.volume) / 2);
      states.push({ id: "discord_speaker_volume", value: this.DG.voiceChannelInfo.speaker_volume });
      connectors.push({
        id: "discord_speaker_volume_connector",
        value: this.DG.voiceChannelInfo.speaker_volume_connector,
      });
    }
    if (
      data.mode != null &&
      typeof data.mode === "object" &&
      Object.prototype.hasOwnProperty.call(data.mode, "type") &&
      data.mode.type != ""
    ) {
      this.DG.voiceSettings.voice_mode_type = data.mode.type;
      states.push({ id: "discord_voice_mode_type", value: this.DG.voiceSettings.voice_mode_type });
    }
    if (
      Object.prototype.hasOwnProperty.call(data, "automatic_gain_control") ||
      Object.prototype.hasOwnProperty.call(data, "automaticGainControl")
    ) {
      this.DG.voiceSettings.automatic_gain_control = data.automatic_gain_control || data.automaticGainControl ? 1 : 0;
      states.push({
        id: "discord_automatic_gain_control",
        value: this.DG.voiceSettings.automatic_gain_control ? "On" : "Off",
      });
    }
    if (
      Object.prototype.hasOwnProperty.call(data, "noise_suppression") ||
      Object.prototype.hasOwnProperty.call(data, "noiseSuppression")
    ) {
      this.DG.voiceSettings.noise_suppression = data.noise_suppression || data.noiseSuppression ? 1 : 0;
      states.push({ id: "discord_noise_suppression", value: this.DG.voiceSettings.noise_suppression ? "On" : "Off" });
    }
    if (
      Object.prototype.hasOwnProperty.call(data, "echo_cancellation") ||
      Object.prototype.hasOwnProperty.call(data, "echoCancellation")
    ) {
      this.DG.voiceSettings.echo_cancellation = data.echo_cancellation || data.echoCancellation ? 1 : 0;
      states.push({ id: "discord_echo_cancellation", value: this.DG.voiceSettings.echo_cancellation ? "On" : "Off" });
    }
    if (
      Object.prototype.hasOwnProperty.call(data, "silence_warning") ||
      Object.prototype.hasOwnProperty.call(data, "silenceWarning")
    ) {
      this.DG.voiceSettings.silence_warning = data.silence_warning || data.silenceWarning ? 1 : 0;
      states.push({
        id: "discord_silence_warning",
        value: this.DG.voiceSettings.silence_warning ? "On" : "Off",
      });
    }
    if (Object.prototype.hasOwnProperty.call(data, "qos")) {
      this.DG.voiceSettings.qos_priority = data.qos ? 1 : 0;
      states.push({ id: "discord_qos_priority", value: this.DG.voiceSettings.qos_priority ? "On" : "Off" });
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
    if (!data) {
      return;
    }
    if (data.state != null && data.state == "VOICE_CONNECTED") {
      // Set Voice Channel Connect State
      this.DG.voiceChannelInfo.voice_channel_connected = "Yes";
      this.DG.voiceChannelInfo.voice_average_ping =
        typeof data.average_ping === "number" ? data.average_ping.toFixed(2) : "0.00";
      this.DG.voiceChannelInfo.voice_hostname = data.hostname || "<None>";
    } else if (data.state != null && data.state == "DISCONNECTED") {
      //Set Voice Channel Connect State Off
      this.DG.voiceChannelInfo.voice_channel_connected = "No";
      this.DG.voiceChannelInfo.voice_average_ping = "0";
      this.DG.voiceChannelInfo.voice_hostname = "<None>";
      this.DG.voiceChannelInfo.voice_channel_participants = "<None>";
    }
    let states = [
      { id: "discord_voice_channel_connected", value: this.DG.voiceChannelInfo.voice_channel_connected },
      { id: "discord_voice_average_ping", value: this.DG.voiceChannelInfo.voice_average_ping },
      { id: "discord_voice_hostname", value: this.DG.voiceChannelInfo.voice_hostname },
      { id: "discord_voice_channel_name", value: this.DG.voiceChannelInfo.voice_channel_name },
      { id: "discord_voice_channel_id", value: this.DG.voiceChannelInfo.voice_channel_id },
      { id: "discord_voice_channel_server_name", value: this.DG.voiceChannelInfo.voice_channel_server_name },
      { id: "discord_voice_channel_server_id", value: this.DG.voiceChannelInfo.voice_channel_server_id },
      { id: "discord_voice_channel_participants", value: this.DG.voiceChannelInfo.voice_channel_participants },
      { id: "discord_voice_channel_participant_ids", value: this.DG.voiceChannelInfo.voice_channel_participant_ids },
    ];
    this.TPClient.stateUpdateMany(states);
  };

  ensureGuildIndex = () => {
    if (!this.DG.guilds || !Array.isArray(this.DG.guilds.array) || !this.DG.guilds.idx) {
      this.DG.guilds = { array: [], idx: {} };
    }
  };

  getGuild = async (data) => {
    if (!data || !data.id || !this.DG.Client) {
      return;
    }
    let guild = await this.DG.Client.getGuild(data.id);
    if (!guild || !guild.id) {
      return;
    }
    this.ensureGuildIndex();
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
    if (!data || !data.id || !this.DG.Client) {
      return;
    }
    let channel = await this.DG.Client.getChannel(data.id);
    if (!channel || !channel.guild_id) {
      return; // DMs/group DMs have no guild to index under
    }
    this.assignChannelIndex(channel.guild_id, channel);
  };

  guildCreate = async (data) => {
    logIt("DEBUG", "Guild Create:", JSON.stringify(data));
    await this.getGuild(data);
  };

  channelCreate = async (data) => {
    logIt("DEBUG", "Channel Create:", JSON.stringify(data));
    await this.getChannel(data);
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
      if (!data.guilds[i] || !data.guilds[i].id) {
        continue;
      }
      // One unreadable guild should not stop the rest from being indexed.
      await this.assignGuildIndex(data.guilds[i], i).catch((err) => {
        logIt("ERROR", `Indexing guild ${data.guilds[i].id} failed: ${err}`);
      });
    }

    this.TPClient.choiceUpdate("discordServerList", this.DG.guilds.array);

    if (!this.DG.Client) {
      return;
    }
    const voiceChannelData = await this.DG.Client.getSelectedVoiceChannel();
    if (voiceChannelData != null) {
      voiceChannelData.channel_id = voiceChannelData.id;
      await this.voiceChannelHandler.voiceChannel(voiceChannelData, this.userStateHandler);
    }
  };

  assignGuildIndex = async (guild, _counter) => {
    this.ensureGuildIndex();
    if (!this.DG.guilds.array.includes(guild.name)) {
      this.DG.guilds.array.push(guild.name);
    }
    this.DG.guilds.idx[guild.name] = guild.id;
    this.DG.guilds.idx[guild.id] = guild.name;

    // -- Done... Look into maybe using a promise and an await here..
    // -- Done... to limit having to do this timeout thingy
    await this.buildGuildChannelIndex(guild.id);
  };

  buildGuildChannelIndex = async (guildId) => {
    let chData = (await this.getGuildChannels(guildId)) || [];

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

    for (const channel of chData) {
      this.assignChannelIndex(guildId, channel);
    }
  };

  assignChannelIndex = (guildId, channel) => {
    if (!this.DG.channels[guildId]) {
      logIt("WARN", `Guild ID ${guildId} does not exist in this.DG.channels`);
      return;
    }
    if (!channel || !channel.id) {
      return;
    }

    // Type 0 is Text channel, 2 is Voice channel, 5 is Announcement Channels
    if (channel.type == 0) {
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
    if (!this.DG.Client) {
      return;
    }
    const sounds = await this.DG.Client.getSoundboardSounds();

    if (Array.isArray(sounds)) {
      this.DG.soundBoard = {
        array: [],
        idx: {},
        default: {
          array: [],
          idx: {},
        },
        nonDefault: {
          array: [],
          idx: {},
        },
      };

      for (const sound of sounds) {
        if (sound && sound.available) {
          const isDefault = sound.guild_id === "0";
          let emojiName = sound.emoji_name ? sound.emoji_name + " - " : "";
          let guildName = isDefault
            ? "Discord Sounds"
            : (this.DG.guilds.idx && this.DG.guilds.idx[sound.guild_id]) || "Unknown Server";
          let soundName = guildName + " - " + emojiName + sound.name;

          this.DG.soundBoard.array.push(soundName);
          this.DG.soundBoard.idx[soundName] = sound;
          this.DG.soundBoard.idx[sound.sound_id] = sound;

          // RANDOM SOUND for non-Nitro users picks from these; this list was never filled.
          const bucket = isDefault ? this.DG.soundBoard.default : this.DG.soundBoard.nonDefault;
          bucket.array.push(soundName);
          bucket.idx[soundName] = sound;
        }
      }

      this.DG.soundBoard.array.push("RANDOM SOUND");
      this.DG.soundBoard.array.sort();

      this.TPClient.choiceUpdate("discordSound", this.DG.soundBoard.array);
    }
  };
}

module.exports = { VoiceStateHandler };
