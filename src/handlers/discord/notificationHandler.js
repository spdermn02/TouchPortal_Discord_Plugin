const {logIt, imageToBase64} = require("../../utils/helpers.js");


class NotificationHandler {
  
  constructor(TPClient, DG) {
    this.DG = DG;
    this.TPClient = TPClient;
  }
  async onNotification(data) {
    // When getting DMs, or Tagged in a message.. can give  you details as to where.. so could set up a button to take to channel where tagged technically..
    // Select channel action would need a custom input for channel ID
    logIt("INFO", "Notification Create", JSON.stringify(data));

  
    let channelId = data.channel_id;
    let userId = data.message.author.id;
    let userName = data.message.author.username; //username;
    let avatarUrl = data.icon_url;
    let timeStamp = data.message.timestamp;
  
    let content = '';
    if (data.message && data.message.content_parsed) {
      // if message contains just an image then content would be empty.
      // content = data.message.content_parsed.map((item) => item.content).join(" ");
      content = data.message.body;
    }
  
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
  
    // Allows user to open DM and or Text channel based on notification data we have..
    if (channelType === "voice") {
      // this.DG.Client.selectVoiceChannel(channelId, {timeout: 5});
    } else if (channelType === "text") {

      
      console.log(
        "TEXT CHANNEL |  Guild: ",
        guildName,
        " Author:",
        userName,
        "ID:",
        userId,
        "Channel ID:",
        channelId,
        "Content:",
        content
      );
      // this.DG.Client.selectTextChannel(channelId, {timeout: 5});
    } else if (channelType === "dm") {

      // this.TPClient.createState("discord_DM_user", "DM: UserName",  userName, "DirectMessage");
      // this.TPClient.createState("discord_DM_userID", "DM: UserID", userId, "DirectMessage");
      // this.TPClient.createState("discord_DM_channelID", "DM: ChannelID", channelId, "DirectMessage");
      // this.TPClient.createState("discord_DM_content", "DM: Content:", content, "DirectMessage");
      // const userAvatarBase64 = await imageToBase64(avatarUrl);
      // this.TPClient.createState("discord_DM_avatar", "avatarIcon", userAvatarBase64, "DirectMessage");

      let userAvatarBase64 = await imageToBase64(avatarUrl);
      this.TPClient.stateUpdate("discord_newDM_eventState", "true");
      this.TPClient.stateUpdate("discord_newDM_eventState", "false");
      this.TPClient.stateUpdate("discord_DM_user", userName);
      this.TPClient.stateUpdate("discord_DM_userID", userId);
      this.TPClient.stateUpdate("discord_DM_channelID", channelId);
      this.TPClient.stateUpdate("discord_DM_content", content);
      this.TPClient.stateUpdate("discord_DM_timestamp", timeStamp);
      this.TPClient.stateUpdate("discord_DM_avatar", userAvatarBase64);


      console.log(
        "DIRECT MESSAGE | Author:",
        userName,
        "ID:",
        userId,
        "Channel ID:",
        channelId,
        "Content:",
        content
      );
      // this.DG.Client.selectTextChannel(channelId, {timeout: 5});
    }
  }
}

module.exports = {NotificationHandler};
