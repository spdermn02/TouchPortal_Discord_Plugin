const { logIt, imageToBase64 } = require("../../utils/helpers.js");

class NotificationHandler {
  constructor(TPClient, DG) {
    this.TPClient = TPClient;
    this.DG = DG;
  }

  extractForumOrAnnouncementName = (title) => {
    if (typeof title !== "string") {
      return null;
    }
    const regex = /\(\s*"[^"]*"\s*,\s*([^)]*)\s*\)/;
    const match = title.match(regex);

    if (match) {
      // Extract the part after the comma
      const extracted = match[1].trim();
      // Split by comma if needed and take the first part
      const parts = extracted.split(",");
      return parts[0].trim(); // Return the trimmed forum/announcement name
    }
    return null;
  };

  async onNotification(data) {
    // When getting DMs, or Tagged in a message.. can give  you details as to where.. so could set up a button to take to channel where tagged technically..
    // Select channel action would need a custom input for channel ID
    // Deliberately not logging the payload: it carries message/DM content, and the Touch
    // Portal log is a plain file users paste into bug reports.
    const message = data && data.message;
    const author = message && message.author;
    if (!data || !author) {
      logIt("DEBUG", "Notification without message author, ignoring");
      return;
    }
    logIt("DEBUG", `Notification Create for channel ${data.channel_id}`);

    let channelId = data.channel_id;
    let userId = author.id;
    let userName = author.username; //username;
    let avatarUrl = data.icon_url;
    let timeStamp = message.timestamp;

    let content = "";
    let userAvatarBase64 = "";

    // GuildID is not always available.. so we need to find it based on the channelID
    // This allows us to return the guildID the message is in as well as the guildName and determine if its a voice or a text channel
    let guildId;
    let guildName;
    let channelType;
    const guildIdx = (this.DG.guilds && this.DG.guilds.idx) || {};
    for (const [key, value] of Object.entries(this.DG.channels || {})) {
      if (!value) {
        continue;
      }
      if (value.voice.names[channelId]) {
        guildId = key;
        guildName = guildIdx[key];
        channelType = "voice";
        break;
      } else if (value.text.names[channelId]) {
        guildId = key;
        guildName = guildIdx[key];
        channelType = "text";
        break;
      } else if (value.announcement.names[channelId]) {
        guildId = key;
        guildName = guildIdx[key];
        channelType = "announcement";
        break;
      } else {
        // Handle forum or DM in the same iteration if none of the above match
        const forumOrAnnouncementName = this.extractForumOrAnnouncementName(data.title);
        if (forumOrAnnouncementName && value.forum.idx[forumOrAnnouncementName]) {
          guildId = key;
          guildName = guildIdx[key];
          channelType = "forum";
          break;
        }
      }
    }

    // If channelType is still not set, it defaults to DM
    if (!channelType) {
      logIt("DEBUG", "Channel ID not found in any guild, treating as DM");
      channelType = "dm";
    }
    logIt("DEBUG", `Guild ID: ${guildId}, Name: ${guildName}, ChannelType: ${channelType}`);

    // Doing stuff based on the channel type
    let states = [];
    switch (channelType) {
      case "voice":
        logIt("INFO", "Looks like you just got tagged in a voice channel.. not sure what we can do with that yet..");
        break;

      case "text":
      case "forum":
      case "announcement":
        content = data.body || "";
        userAvatarBase64 = await imageToBase64(avatarUrl);

        states.push(
          { id: "discord_newMention_eventState", value: "true" },
          { id: "discord_Mention_channelType", value: channelType },
          { id: "discord_Mention_user", value: userName },
          { id: "discord_Mention_userID", value: userId },
          { id: "discord_Mention_channelID", value: channelId },
          { id: "discord_Mention_content", value: content },
          { id: "discord_Mention_timestamp", value: timeStamp },
          { id: "discord_Mention_avatar", value: userAvatarBase64 },
        );

        this.TPClient.stateUpdateMany(states);
        this.TPClient.stateUpdate("discord_newMention_eventState", "false");
        logIt("DEBUG", `Notification for ${channelType} channel ${channelId}`);
        break;

      case "dm":
        logIt("DEBUG", `DM notification in channel ${channelId}`);
        content = data.body || "";
        userAvatarBase64 = await imageToBase64(avatarUrl);
        //// Save this for if we need to captrue the last X dms
        // this.TPClient.createState("discord_DM_user", "DM: UserName",  userName, "DirectMessage");
        // this.TPClient.createState("discord_DM_userID", "DM: UserID", userId, "DirectMessage");
        // this.TPClient.createState("discord_DM_channelID", "DM: ChannelID", channelId, "DirectMessage");
        // this.TPClient.createState("discord_DM_content", "DM: Content:", content, "DirectMessage");
        // const userAvatarBase64 = await imageToBase64(avatarUrl);
        // this.TPClient.createState("discord_DM_avatar", "avatarIcon", userAvatarBase64, "DirectMessage");

        states.push(
          { id: "discord_newDM_eventState", value: "true" },
          { id: "discord_DM_user", value: userName },
          { id: "discord_DM_userID", value: userId },
          { id: "discord_DM_channelID", value: channelId },
          { id: "discord_DM_content", value: content },
          { id: "discord_DM_timestamp", value: timeStamp },
          { id: "discord_DM_avatar", value: userAvatarBase64 },
        );

        this.TPClient.stateUpdateMany(states);
        this.TPClient.stateUpdate("discord_newDM_eventState", "false");
        break;
      default:
        logIt("ERROR", "Unknown channel type");
        break;
    }
  }
}

module.exports = { NotificationHandler };
