const {logIt, imageToBase64} = require("../../utils/helpers.js");


class NotificationHandler {
  
  constructor(TPClient, DG) {
    this.TPClient = TPClient;
    this.DG = DG;
  }
  async onNotification(data) {
    // When getting DMs, or Tagged in a message.. can give  you details as to where.. so could set up a button to take to channel where tagged technically..
    // Select channel action would need a custom input for channel ID
    logIt("DEBUG", "Notification Create", JSON.stringify(data));

  
    let channelId = data.channel_id;
    let userId = data.message.author.id;
    let userName = data.message.author.username; //username;
    let avatarUrl = data.icon_url;
    let timeStamp = data.message.timestamp;
  
    let content = '';
    let userAvatarBase64 = '';

    // GuildID is not always available.. so we need to find it based on the channelID
    // This allows us to return the guildID the message is in as well as the guildName and determine if its a voice or a text channel
    let guildId;
    let guildName;
    let channelType;
    for (const [key, value] of Object.entries(this.DG.channels)) {
      if (value.voice.names[channelId]) {
        guildId = key;
        guildName = this.DG.guilds.idx[key];
        channelType = "voice";
        break;
      } else if (value.text.names[channelId]) {
        guildId = key;
        guildName = this.DG.guilds.idx[key];
        channelType = "text";
        break;
      }
    }
  
    // If no guildId found, it must be a DM
    if (!guildId) {
      logIt("DEBUG", "Channel ID not found in any guild, treating as DM");
      channelType = "dm";
    } else {
      logIt("DEBUG", `Guild ID: ${guildId}`);
      logIt("DEBUG", `Guild Name: ${guildName}`);
      logIt("DEBUG", `Channel Type: ${channelType}`);
    }
    
    // Doing stuff based on the channel type
    let states = []
    switch (channelType) {
      case "voice":
        logIt("INFO", "Looks like you just got tagged in a voice channel.. not sure what we can do with that yet..");
        // this.DG.Client.selectVoiceChannel(channelId, {timeout: 5});
        break;
      
      case "text":
        
        content = data.body;
        userAvatarBase64 = await imageToBase64(avatarUrl);
        
        states.push(
           { id: "discord_newMention_eventState", value: "true" },
           { id: "discord_Mention_user", value: userName },
           { id: "discord_Mention_userID", value: userId },
           { id: "discord_Mention_channelID", value: channelId },
           { id: "discord_Mention_content", value: content },
           { id: "discord_Mention_timestamp", value: timeStamp },
           { id: "discord_Mention_avatar", value: userAvatarBase64 }
          );
          
        this.TPClient.stateUpdateMany(states);
        this.TPClient.stateUpdate("discord_newMention_eventState", "false");
        logIt("INFO", "TEXT CHANNEL |  Guild:", guildName, "Author:", userName, "ID:", userId, "Channel ID:", channelId, "Content:", content);
      
      case "dm":
        logIt("INFO", `DM Info: ${JSON.stringify(data)}`);
        content = data.message.body;
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
          { id: "discord_DM_avatar", value: userAvatarBase64 }
        );

        this.TPClient.stateUpdateMany(states);
        this.TPClient.stateUpdate("discord_newDM_eventState", "false");
        logIt("INFO", "DIRECT MESSAGE | Author:", userName, "ID:", userId, "Channel ID:", channelId, "Content:", content);

      default:
        logIt("ERROR", "Unknown channel type");
        break;
    }

  }
}

module.exports = {NotificationHandler};
