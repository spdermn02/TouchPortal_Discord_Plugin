const {DG} = require("../../discord_config.js");
const {logIt} = require("../../utils/helpers.js");

class notificationHandler {
  constructor() {}

  async onNotification(data) {
    // When getting DMs, or Tagged in a message.. can give  you details as to where.. so could set up a button to take to channel where tagged technically..
    // Select channel action would need a custom input for channel ID
    logIt("INFO", "Notification Create", JSON.stringify(data));
    const channelId = data.channel_id;
    const userId = data.message.author.id;
    const userName = data.message.author.globalName; //username;

    let content = '';
    if (data.message && data.message.content_parsed) {
      // if message contains just an image then content would be empty.
      content = data.message.content_parsed.map((item) => item.content).join(" ");
    }
    // GuildID is not always available.. so we need to find it based on the channelID
    // This allows us to return the guildID the message is in as well as the guildName and determine if its a voice or a text channel
    let guildId;
    let guildName;
    let channelType;
    for (const [key, value] of Object.entries(DG.channels)) {
      if (value.voice.names[channelId]) {
        guildId = key;
        channelType = "voice";
        break;
      } else if (value.text.names[channelId]) {
        guildId = key;
        guildName = DG.guilds.idx[key];
        channelType = "text";
        break;
      }
    }

    if (guildId) {
      console.log(`Guild ID: ${guildId}`);
      console.log(`Guild Name: ${guildName}`);
      console.log(`Channel Type: ${channelType}`);
    } else {
      console.log("Channel ID not found in any guild");
    }

    // Allows user to open DM and or Text channel based on notification data we have..
    if (channelType === "voice") {
      // DG.Client.selectVoiceChannel(channelId, {timeout: 5});
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
      // DG.Client.selectTextChannel(channelId, {timeout: 5});
    } else if (channelType === undefined) {
      // seems to trigger off non DM messages ??  - need to test more
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
      // DG.Client.selectTextChannel(channelId, {timeout: 5});
    }
  }
}

const NotificationHandler = new notificationHandler();
module.exports = NotificationHandler;
