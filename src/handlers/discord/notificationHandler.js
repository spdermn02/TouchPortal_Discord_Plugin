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
      console.log("Channel ID not found in any guild, treating as DM");
      channelType = "dm";
    } else {
      console.log(`Guild ID: ${guildId}`);
      console.log(`Guild Name: ${guildName}`);
      console.log(`Channel Type: ${channelType}`);
    }
    
    // Doing stuff based on the channel type
    switch (channelType) {
      case "voice":
        console.log("Looks like you just got tagged in a voice channel.. not sure what we can do with that yet..");
        // this.DG.Client.selectVoiceChannel(channelId, {timeout: 5});
        break;
      
      case "text":
        content = data.body;
        logIt("INFO", "TEXT CHANNEL |  Guild:", guildName, "Author:", userName, "ID:", userId, "Channel ID:", channelId, "Content:", content);
        // should we make a category for 'new notification' and use it for text notification, 
        // and then keep the one we have for DMs as such.. sure its a notification but people recognize it as a 'DM' solely..
        break;
      
      case "dm":
        content = data.message.body;
        userAvatarBase64 = await imageToBase64(avatarUrl);
        //// Save this for if we need to captrue the last X dms
        // this.TPClient.createState("discord_DM_user", "DM: UserName",  userName, "DirectMessage");
        // this.TPClient.createState("discord_DM_userID", "DM: UserID", userId, "DirectMessage");
        // this.TPClient.createState("discord_DM_channelID", "DM: ChannelID", channelId, "DirectMessage");
        // this.TPClient.createState("discord_DM_content", "DM: Content:", content, "DirectMessage");
        // const userAvatarBase64 = await imageToBase64(avatarUrl);
        // this.TPClient.createState("discord_DM_avatar", "avatarIcon", userAvatarBase64, "DirectMessage");
  
        this.TPClient.stateUpdate("discord_newDM_eventState", "true");
        this.TPClient.stateUpdate("discord_newDM_eventState", "false");
        this.TPClient.stateUpdate("discord_DM_user", userName);
        this.TPClient.stateUpdate("discord_DM_userID", userId);
        this.TPClient.stateUpdate("discord_DM_channelID", channelId);
        this.TPClient.stateUpdate("discord_DM_content", content);
        this.TPClient.stateUpdate("discord_DM_timestamp", timeStamp);
        this.TPClient.stateUpdate("discord_DM_avatar", userAvatarBase64);
  
        logIt("INFO", "DIRECT MESSAGE | Author:", userName, "ID:", userId, "Channel ID:", channelId, "Content:", content);

      default:
        console.log("Unknown channel type");
        break;
    }

  }
}

module.exports = {NotificationHandler};
