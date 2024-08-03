const procWatcher = require("./core/process_watcher");
const DEFAULT_BASE64_AVATAR = require("./utils/DEFAULT_BASE64_AVATAR.js");

class DiscordG {
  constructor() {
    this.pluginId = "TPDiscord";
    this.pluginSettings = {
      "Plugin Connected": "No",
      "Skip Process Watcher": "No",
      "Discord Debug Mode": "Off",
      "VoiceActivity Tracker - Seperate each ID by commas": "",
    };

    this.updateUrl = "https://raw.githubusercontent.com/spdermn02/TouchPortal_Discord_Plugin/master/package.json";
    this.releaseUrl = "https://github.com/spdermn02/TouchPortal_Discord_Plugin/releases";
    this.redirectUri = "http://localhost"; // same here..

    this.Client = null; // Discord Client
    this.accessToken = undefined; // Discord Access Token
    this.procWatcher = new procWatcher(); // Process Watcher
    this.connecting = false;

    this.scopes = [
      "identify",
      "rpc",
      "guilds",
      "rpc.activities.write",
      "rpc.voice.read",
      "rpc.voice.write",
      "rpc.video.read",
      "rpc.video.write",
      "rpc.screenshare.read",
      "rpc.screenshare.write",
      "rpc.notifications.read",
    ];
   
    this.DEFAULT_BASE64_AVATAR = DEFAULT_BASE64_AVATAR;

    this.DEFAULT_USER_STATES = [ // used on creation of states for each user when plugin first boots
      {id: "Speaking", title: "Status: isSpeaking", value: "Off"},
      {id: "id", title: "ID", value: ""},
      {id: "nick", title: "Nickname", value: ""},
      {id: "mute", title: "Status: Mute", value: "Off"},
      {id: "self_mute", title: "Status: Self Mute", value: "Off"},
      {id: "self_deaf", title: "Status: Self Deaf", value: "Off"},
      {id: "deaf", title: "Status: Deafen", value: "Off"},
      {id: "volume", title: "Volume", value: "0"},
      {id: "avatar", title: "Avatar", value: ""},
      {id: "avatarID", title: "Avatar ID", value: ""},
      {id: "server_mute", title: "Status: Server Mute", value: "Off"},
    ];

  
    this.voiceSettings = {
      automatic_gain_control: 0,
      noise_suppression: 0,
      echo_cancellation: 0,
      silence_warning: 0,
      qos_priority: 0,
      muteState: 0,
      deafState: 0,
      voice_mode_type: "UNKNOWN",
      prevVoiceActivityData: {}  // keeping track of end user voice settings data
    };

    this.voiceChannelInfo = {
      last_voice_channel_subs: [],
      voice_channel_connected: "No",
      voice_channel_name: "<None>",
      voice_channel_id: "<None>",
      voice_channel_server_name: "<None>",
      voice_channel_server_id: "<None>",
      voice_average_ping: "0.00",
      voice_hostname: "<None>",
      voice_channel_participants: "<None>",
      voice_channel_participant_ids: "<None>",
      voice_volume: "0",
      speaker_volume: "0",
      speaker_volume_connector: "0",
    };

    this.currentVoiceUsers = {}; // The Current People in Voice Chat
    this.customVoiceAcivityUsers = {};


    this.guilds = {};
    this.channels = {};

    this.PTTKeys = [];
    this.soundBoard = {};
    this.pttKeyStateId = "discordPTTKeyboardKey";

    this.instanceIds = {};

    // this.prevVoiceActivityData = {}; // Used for Self States

  } 
}

module.exports = {
  DG: new DiscordG(),
};