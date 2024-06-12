const procWatcher = require('./process_watcher');

class DiscordG {
    constructor() {

      // This will be a list the user can define in plugin settings to have custom 'listeners' for certain people...
      // In a broadcast situation, if i want a certain person have an overlay attached, if their index changes then it would be hard to coordinate properly.
      // With this, we check the list, if user is speaking then we update their custom states.
      // user will just define userIDs seperated by commas.. we will then assign them the proper ID of 'Custom1' etc.. OR we let user decide on name but that could cause issues 
      this.customVoiceAcivityUsers = { 
        "855126542370603108": "Custom1",
        "855126542370603109": "Custom2",
        "855126542370603110": "Custom3"
      }
      
        this.DEFAULTUSERSTATES = [
        { id: 'Speaking', title: 'Status: isSpeaking', value: 'Off' },
        { id: 'id', title: 'ID', value: '' },
        { id: 'nick', title: 'Nickname', value: '' },
        { id: 'mute', title: 'Status: Mute', value: 'Off' },
        { id: 'self_mute', title: 'Status: Self Mute', value: 'Off' },
        { id: 'self_deaf', title: 'Status: Self Deaf', value: 'Off' },
        { id: 'deaf', title: 'Status: Deafen', value: 'Off' },
        { id: 'volume', title: 'Volume', value: '0' },
        { id: 'avatar', title: 'Avatar', value: '' }
      ];

        this.pluginId = "TPDiscord";
        this.pluginSettings = { 'Plugin Connected' : 'No', 'Skip Process Watcher':'No', 'Discord Debug Mode':'Off' };
        this.updateUrl = "https://raw.githubusercontent.com/spdermn02/TouchPortal_Discord_Plugin/master/package.json";
        this.releaseUrl = "https://github.com/spdermn02/TouchPortal_Discord_Plugin/releases";


        this.scopes = ["identify", "rpc",  "guilds", "rpc.activities.write", "rpc.voice.read", "rpc.voice.write", "rpc.video.read", "rpc.video.write", "rpc.screenshare.read","rpc.screenshare.write", "rpc.notifications.read" ];
        this.connecting = false;
        this.redirectUri = "http://localhost";  // same here..
      //  this.discordWin32 = "Discord.exe"; // not sure why this was defined in config.js before when it could be used directly where it needed as its only used one place
 

        this.isRunning = false;
        this.muteState = 0; 
        this.deafState = 0; 
        this.automatic_gain_control = 0;  
        this.noise_suppression = 0; 
        this.echo_cancellation = 0; 
        this.silence_warning = 0; 
        this.qos_priority = 0; 
        this.last_voice_channel_subs = []; 
        this.voice_channel_connected = 'No'; 
        this.voice_channel_name = '<None>'; 
        this.voice_channel_id = '<None>'; 
        this.voice_channel_server_name = '<None>'; 
        this.voice_channel_server_id = '<None>'; 
        this.voice_average_ping = '0.00'; 
        this.voice_hostname = '<None>'; 
        this.voice_volume = '0'; 
        this.speaker_volume = '0'; 
        this.speaker_volume_connector = '0'; 
        this.voice_mode_type = 'UNKNOWN'; 
        this.voice_channel_participants = '<None>'; 
        this.voice_channel_participant_ids = '<None>';  
        this.guilds = {}; 
        this.channels = {}; 
        this.PTTKeys = []; 
        this.soundBoard = {}; 
        this.pttKeyStateId = 'discordPTTKeyboardKey'; 
        this.instanceIds = {}; 
  
  

        this.currentVoiceUsers = {};
        this.Client = null;
        this.accessToken = undefined;
  
        this.procWatcher = new procWatcher();
  
        this.prevVoiceActivityData = {}
          
      }
  }



  module.exports = {
      DG: new DiscordG() 
   
  };
  