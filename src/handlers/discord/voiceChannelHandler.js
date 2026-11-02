const { logIt, wait, imageToBase64 } = require("../../utils/helpers.js");
const DEFAULT_BASE64_AVATAR = require("../../utils/DEFAULT_BASE64_AVATAR.js");

class VoiceChannelHandler {
  constructor(DG, TPClient, userStateHandler) {
    this.DG = DG;
    this.TPClient = TPClient;
    this.userStateHandler = userStateHandler;
  }

  voiceChannel = async (data, userStateHandler) => {
    logIt("DEBUG", "Voice Channel join", JSON.stringify(data));
    if (!data) {
      return;
    }

    //  await DiscordClient.subscribe("MESSAGE_CREATE", { channel_id: "1125087354969915464"}).catch((err) => {logIt("ERROR",err)});
    await userStateHandler.clearUserStates();
    await this.unsubscribeFromEvents();

    if (data.channel_id == null) {
      this.DG.voiceChannelInfo.voice_channel_name = "<None>";
      this.DG.voiceChannelInfo.voice_channel_id = "<None>";
      this.DG.voiceChannelInfo.voice_channel_server_id = "<None>";
      this.DG.voiceChannelInfo.voice_channel_server_name = "<None>";
      this.DG.voiceChannelInfo.voice_channel_participants = "<None>";
      this.DG.voiceChannelInfo.voice_channel_participant_ids = "<None>";
    } else if (data.guild_id == null) {
      this.DG.voiceChannelInfo.voice_channel_id = data.channel_id;
      this.DG.voiceChannelInfo.voice_channel_name = "Personal";
      this.DG.voiceChannelInfo.voice_channel_server_id = "Personal";
      this.DG.voiceChannelInfo.voice_channel_server_name = "Personal";

      // Subscribe to voice channel events
      await this.subscribeToEvents(data.channel_id);
    } else {
      // The guild may not be indexed yet (fresh boot, or a server joined after startup).
      // Fall back to what the payload says; the channel lookup below fills in the name.
      const guildChannels = this.DG.channels[data.guild_id];
      this.DG.voiceChannelInfo.voice_channel_name =
        (guildChannels && guildChannels.voice.names[data.channel_id]) || data.name || "<Unknown>";

      this.DG.voiceChannelInfo.voice_channel_id = data.channel_id;
      this.DG.voiceChannelInfo.voice_channel_server_id = data.guild_id;
      this.DG.voiceChannelInfo.voice_channel_server_name =
        (this.DG.guilds && this.DG.guilds.idx && this.DG.guilds.idx[data.guild_id]) || "<Unknown>";

      logIt(
        "DEBUG",
        "Subscribing to Voice Channel [",
        this.DG.voiceChannelInfo.voice_channel_name,
        "] with ID [",
        this.DG.voiceChannelInfo.voice_channel_id,
        "] on Server [",
        this.DG.voiceChannelInfo.voice_channel_server_name,
        "] with ID [",
        this.DG.voiceChannelInfo.voice_channel_server_id,
        "]",
      );

      // Subscribe to voice channel events
      await this.subscribeToEvents(data.channel_id);

      logIt("DEBUG", "COMPLETE - Subscribing to Voice Channel");
    }

    // when we first join a channel, or plugin launches we get the voice states of the users in the channel
    // console.time('for...of');
    if (this.DG.voiceChannelInfo.voice_channel_id !== "<None>" && this.DG.Client) {
      let avatarUrl;
      const selfId = this.DG.Client.user ? this.DG.Client.user.id : undefined;
      const channel = await this.DG.Client.getChannel(this.DG.voiceChannelInfo.voice_channel_id);
      if (channel && channel.name && this.DG.voiceChannelInfo.voice_channel_name === "<Unknown>") {
        this.DG.voiceChannelInfo.voice_channel_name = channel.name;
      }
      const voiceStates = channel && Array.isArray(channel.voice_states) ? channel.voice_states : [];

      await Promise.all(
        voiceStates.map(async (vs) => {
          if (vs && vs.user && vs.user.id && vs.user.id !== selfId) {
            logIt("DEBUG", "User VS: ", vs, "User: ", vs.user.username);

            vs.speaking = false; // adding speaking to the object to track speaking status
            if (!vs.user.avatar) {
              vs.user.base64Avatar = DEFAULT_BASE64_AVATAR;
            } else {
              avatarUrl = `https://cdn.discordapp.com/avatars/${vs.user.id}/${vs.user.avatar}.webp?size=128`;

              vs.user.base64Avatar = (await imageToBase64(avatarUrl)) || DEFAULT_BASE64_AVATAR;
            }
            // userStateHandler reads the avatar from the top level
            vs.base64Avatar = vs.user.base64Avatar;

            this.DG.currentVoiceUsers[vs.user.id] = vs;
          }
        }),
      );
      // console.timeEnd('for...of');

      Object.keys(this.DG.currentVoiceUsers).forEach((key, i) => {
        // Making sure not to add Client User to the list as it's not needed and would likely cause issues being in the flow of things for certain actions that cant be used on the client user
        const entry = this.DG.currentVoiceUsers[key];
        if (entry && entry.user && entry.user.id !== selfId) {
          // When we join a voice channel, update the states for all users in the channel
          let states = this.userStateHandler.generateUserUpdates(`user_${i}`, entry);
          if (states.length > 0) {
            this.TPClient.stateUpdateMany(states);
          }
        }
      });

      this.userStateHandler.updateParticipantCount();
    }

    let states = [
      { id: "discord_voice_channel_name", value: this.DG.voiceChannelInfo.voice_channel_name },
      { id: "discord_voice_channel_id", value: this.DG.voiceChannelInfo.voice_channel_id },
      { id: "discord_voice_channel_server_name", value: this.DG.voiceChannelInfo.voice_channel_server_name },
      { id: "discord_voice_channel_server_id", value: this.DG.voiceChannelInfo.voice_channel_server_id },
      { id: "discord_voice_channel_participants", value: this.DG.voiceChannelInfo.voice_channel_participants },
      { id: "discord_voice_channel_participant_ids", value: this.DG.voiceChannelInfo.voice_channel_participant_ids },
    ];

    this.TPClient.stateUpdateMany(states);
  };

  subscribeToEvents = async (channelId) => {
    const events = [
      { name: "VOICE_STATE_CREATE", description: "Voice State Create" },
      { name: "VOICE_STATE_UPDATE", description: "Voice State Update" },
      { name: "VOICE_STATE_DELETE", description: "Voice State Delete" },
      { name: "SPEAKING_START", description: "Speaking Start" },
      { name: "SPEAKING_STOP", description: "Speaking Stop" },
    ];

    for (let event of events) {
      if (!this.DG.Client) {
        return;
      }
      const subscription = await this.DG.Client.subscribe(event.name, {
        channel_id: channelId,
      }).catch((err) => {
        logIt("ERROR", `subscribe ${event.name}: ${err}`);
      });
      if (subscription) {
        logIt("DEBUG", `Subscribed to ${event.description}`);
        this.DG.voiceChannelInfo.last_voice_channel_subs.push({
          subscription,
          description: event.description,
        });
      }
      await wait(0.15);
    }
  };

  unsubscribeFromEvents = async () => {
    if (this.DG.voiceChannelInfo.last_voice_channel_subs.length > 0) {
      logIt("DEBUG", "START - Unsubscribing from Voice Channel voice states");
      for (let i = 0; i < this.DG.voiceChannelInfo.last_voice_channel_subs.length; i++) {
        logIt("DEBUG", `Unsubscribing from ${this.DG.voiceChannelInfo.last_voice_channel_subs[i].description}`);
        // await this.DG.voiceChannelInfo.last_voice_channel_subs[i].unsubscribe();
        // took off await and it fixed the unsubscribe issue/subscribe
        const sub = this.DG.voiceChannelInfo.last_voice_channel_subs[i].subscription;
        if (sub && typeof sub.unsubscribe === "function") {
          Promise.resolve(sub.unsubscribe()).catch((err) => logIt("DEBUG", `unsubscribe: ${err}`));
        }

        await wait(0.15);
      }

      logIt("INFO", "COMPLETE - Unsubscribing from Voice Channel voice states");
      this.DG.voiceChannelInfo.last_voice_channel_subs = [];
      await wait(0.15);
    }
    // Always reset, even if subscribing failed last time, so users from the previous
    // channel never leak into the next one.
    this.DG.currentVoiceUsers = {};
    this.userStateHandler.oldUserData = {};
  };
}

module.exports = { VoiceChannelHandler };
