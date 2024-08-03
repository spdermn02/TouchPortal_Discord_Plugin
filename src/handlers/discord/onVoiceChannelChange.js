const {DG} = require("../../discord_config.js");
const TPClient = require("../../core/TPClient.js");
const {logIt, wait, imageToBase64} = require("../../utils/helpers.js");
const userStateHandler = require("./userStateHandler.js");

const voiceChannel = async (data) => {
  logIt("DEBUG", "Voice Channel join", JSON.stringify(data));

  //  await DiscordClient.subscribe("MESSAGE_CREATE", { channel_id: "1125087354969915464"}).catch((err) => {logIt("ERROR",err)});
  await userStateHandler.clearUserStates();
  await unsubscribeFromEvents();

  if (data.channel_id == null) {
    DG.voiceChannelInfo.voice_channel_name = "<None>";
    DG.voiceChannelInfo.voice_channel_id = "<None>";
    DG.voiceChannelInfo.voice_channel_server_id = "<None>";
    DG.voiceChannelInfo.voice_channel_server_name = "<None>";
    DG.voiceChannelInfo.voice_channel_participants = "<None>";
    DG.voiceChannelInfo.voice_channel_participant_ids = "<None>";
  } else if (data.guild_id == null) {
    DG.voiceChannelInfo.voice_channel_id = data.channel_id;
    DG.voiceChannelInfo.voice_channel_name = "Personal";
    DG.voiceChannelInfo.voice_channel_server_id = "Personal";
    DG.voiceChannelInfo.voice_channel_server_name = "Personal";

    // Subscribe to voice channel events
    await subscribeToEvents(data.channel_id);
  } else {
    // Lookup Voice Channel Name
    if (!DG.channels[data.guild_id] || !DG.channels[data.guild_id].voice) {
      try {
        // if user changes channels while plugin is booting, it may error/crash without this..
        getGuildChannels(data.guild_id).then(() => {
          if (DG.channels[data.guild_id] && DG.channels[data.guild_id].voice) {
            DG.voiceChannelInfo.voice_channel_name = DG.channels[data.guild_id].voice.names[data.channel_id];
          }
        });
      } catch (error) {
        logIt("ERROR", "Error getting Guild Channels", error);
      }
    } else {
      DG.voiceChannelInfo.voice_channel_name = DG.channels[data.guild_id].voice.names[data.channel_id];
    }

    DG.voiceChannelInfo.voice_channel_id = data.channel_id;
    DG.voiceChannelInfo.voice_channel_server_id = data.guild_id;

    try {
      // was getting times where the guilds.idx was not available on a fresh boot
      DG.voiceChannelInfo.voice_channel_server_name = DG.guilds.idx[data.guild_id];
    } catch (error) {
      // Call getGuilds function to initialize guilds in case it's not available
      DG.guilds = await getGuilds();
      DG.voiceChannelInfo.voice_channel_server_name = DG.guilds.idx[data.guild_id];
    }

    logIt(
      "DEBUG",
      "Subscribing to Voice Channel [",
      DG.voiceChannelInfo.voice_channel_name,
      "] with ID [",
      DG.voiceChannelInfo.voice_channel_id,
      "] on Server [",
      DG.voiceChannelInfo.voice_channel_server_name,
      "] with ID [",
      DG.voiceChannelInfo.voice_channel_server_id,
      "]"
    );

    // Subscribe to voice channel events
    await subscribeToEvents(data.channel_id);

    logIt("DEBUG", "COMPLETE - Subscribing to Voice Channel");
  }

  // when we first join a channel, or plugin launches we get the voice states of the users in the channel
  // console.time('for...of');
  if (DG.voiceChannelInfo.voice_channel_id !== "<None>") {
    let ids = [];
    let avatarUrl;
    const channel = await DG.Client.getChannel(DG.voiceChannelInfo.voice_channel_id);

    await Promise.all(
      channel.voice_states.map(async (vs) => {
        if (vs.user.id !== DG.Client.user.id) {
          console.log("User ID: ", vs.user.id, "User: ", vs.user.username);

          vs.speaking = false; // adding speaking to the object to track speaking status
          if (vs.user.avatar === null) {
            vs.user.base64Avatar = DG.DEFAULT_BASE64_AVATAR;
          } else if (vs.user.avatar !== null) {
            avatarUrl = `https://cdn.discordapp.com/avatars/${vs.user.id}/${vs.user.avatar}.webp?size=128`;

            vs.user.base64Avatar = await imageToBase64(avatarUrl);
          }

          DG.currentVoiceUsers[vs.user.id] = vs;
        }
      })
    );
    // console.timeEnd('for...of');

    DG.voiceChannelInfo.voice_channel_participants =
      Object.keys(DG.currentVoiceUsers).length > 0
        ? Object.keys(DG.currentVoiceUsers).join("|")
        : "<None>";
    Object.keys(DG.currentVoiceUsers).forEach((key, i) => {
      // Making sure not to add Client User to the list as it's not needed and would likely cause issues being in the flow of things for certain actions that cant be used on the client user
      if (DG.currentVoiceUsers[key].user.id !== DG.Client.user.id) {
        ids.push(DG.currentVoiceUsers[key].user.id);
        // When we join a voice channel, update the states for all users in the channel
        TPClient.stateUpdateMany([
          {id: [`user_${i}_Speaking`], value: "Off"},
          {id: [`user_${i}_id`], value: DG.currentVoiceUsers[key].user.id},
          {id: [`user_${i}_nick`], value: DG.currentVoiceUsers[key].nick},
          {
            id: [`user_${i}_mute`],
            value: DG.currentVoiceUsers[key].mute ? "On" : "Off",
          },
          {
            id: [`user_${i}_deaf`],
            value: DG.currentVoiceUsers[key].voice_state.deaf ? "On" : "Off",
          },
          {
            id: [`user_${i}_self_deaf`],
            value: DG.currentVoiceUsers[key].voice_state.self_deaf ? "On" : "Off",
          },
          {
            id: [`user_${i}_self_mute`],
            value: DG.currentVoiceUsers[key].voice_state.self_mute ? "On" : "Off",
          },
          {
            id: [`user_${i}_server_mute`],
            value: DG.currentVoiceUsers[key].voice_state.mute ? "On" : "Off",
          },
          {
            id: [`user_${i}_avatar`],
            value: DG.currentVoiceUsers[key].user.base64Avatar,
          },
          {
            id: [`user_${i}_avatarID`],
            value: DG.currentVoiceUsers[key].user.avatar,
          },

          {id: [`user_${i}_volume`], value: DG.currentVoiceUsers[key].volume},
        ]);
      }
    });
    DG.voiceChannelInfo.voice_channel_participant_ids = ids.length > 0 ? ids.join("|") : "<None>";
  }

  let states = [
    {id: "discord_voice_channel_name", value: DG.voiceChannelInfo.voice_channel_name},
    {id: "discord_voice_channel_id", value: DG.voiceChannelInfo.voice_channel_id},
    {
      id: "discord_voice_channel_server_name",
      value: DG.voiceChannelInfo.voice_channel_server_name,
    },
    {id: "discord_voice_channel_server_id", value: DG.voiceChannelInfo.voice_channel_server_id},
    {
      id: "discord_voice_channel_participants",
      value: DG.voiceChannelInfo.voice_channel_participants,
    },
    {
      id: "discord_voice_channel_participant_ids",
      value: DG.voiceChannelInfo.voice_channel_participant_ids,
    },
  ];

  TPClient.stateUpdateMany(states);
};

async function subscribeToEvents(channelId) {
  const events = [
    {name: "VOICE_STATE_CREATE", description: "Voice State Create"},
    {name: "VOICE_STATE_UPDATE", description: "Voice State Update"},
    {name: "VOICE_STATE_DELETE", description: "Voice State Delete"},
    {name: "SPEAKING_START", description: "Speaking Start"},
    {name: "SPEAKING_STOP", description: "Speaking Stop"},
  ];

  for (let event of events) {
    const subscription = await DG.Client.subscribe(event.name, {
      channel_id: channelId,
    }).catch((err) => {
      logIt("ERROR", err);
    });
    logIt("INFO", `Subscribed to ${event.description}`);
    DG.voiceChannelInfo.last_voice_channel_subs.push({
      subscription,
      description: event.description,
    });
    await wait(0.15);
  }
}

const unsubscribeFromEvents = async () => {
  if (DG.voiceChannelInfo.last_voice_channel_subs.length > 0) {
    logIt("DEBUG", "START- Unsubscribing from Voice Channel voice states");
    for (let i = 0; i < DG.voiceChannelInfo.last_voice_channel_subs.length; i++) {
      logIt("INFO", `Unsubscribing from ${DG.voiceChannelInfo.last_voice_channel_subs[i].description}`);
      // await DG.voiceChannelInfo.last_voice_channel_subs[i].unsubscribe();
      // took off await and it fixed the unsubscribe issue/subscribe
      DG.voiceChannelInfo.last_voice_channel_subs[i].subscription.unsubscribe();

      await wait(0.15);
    }

    logIt("DEBUG", "COMPLETE - Unsubscribing from Voice Channel voice states");
    DG.voiceChannelInfo.last_voice_channel_subs = [];
    DG.currentVoiceUsers = {};
    await wait(0.15);
  }
};

module.exports = {voiceChannel};
