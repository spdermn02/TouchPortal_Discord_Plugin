// voiceStateHandler

const { DG } = require('../../config.js');
const TPClient = require('../../core/TPCLIENT.js');
const { logIt, diff, convertVolumeToPercentage, platform} = require('../../utils/helpers.js');
const { voiceChannel } = require('./onVoiceChannelChange.js');
const userStateHandler = require('./userStateHandler.js');
const NotificationHandler = require('./notificationHandler.js');


      
class VoiceStateHandler {
    constructor( doLogin ) {
        // this.client = client; // DG.Client 
        this.doLogin = doLogin;
        this.addUserData = userStateHandler.addUserData;
        this.updateUserStates = userStateHandler.updateUserStates;
        this.deleteUserStates = userStateHandler.deleteUserStates;
        this.repopulateUserStates = userStateHandler.repopulateUserStates;

        this.notification = NotificationHandler;

    }
      
    registerEvents = () => {

        DG.Client.on("ready", async () => {
          console.log("ON READY TRIGGERED")
            if (!DG.accessToken || ( DG.Client.accessToken != undefined && DG.accessToken != DG.Client.accessToken )) {
                DG.accessToken = DG.Client.accessToken;

                console.log("Access Token Received", DG.accessToken)
            }
            
            logIt("INFO"," < ---------------   Discord Connected   --------------- >");

            TPClient.stateUpdate("discord_connected","Connected");
            TPClient.settingUpdate("Plugin Connected","Connected");


            /// should these subscriptions be moved out of here?
      
            await DG.Client.subscribe("VOICE_SETTINGS_UPDATE").catch((err) => {logIt("ERROR",err)});
            await DG.Client.subscribe("GUILD_CREATE").catch((err) => {logIt("ERROR",err)});
            await DG.Client.subscribe("CHANNEL_CREATE").catch((err) => {logIt("ERROR",err)});
            await DG.Client.subscribe("VOICE_CHANNEL_SELECT").catch((err) => {logIt("ERROR",err)});
            await DG.Client.subscribe("VOICE_CONNECTION_STATUS").catch((err) => {logIt("ERROR",err)});
            await DG.Client.subscribe("VIDEO_STATE_UPDATE").catch((err) => {logIt("ERROR",err)});
            await DG.Client.subscribe("SCREENSHARE_STATE_UPDATE").catch((err) => {logIt("ERROR",err)});
            await DG.Client.subscribe("NOTIFICATION_CREATE").catch((err) => {logIt("ERROR",err)});

            
            await this.getGuilds();
            await this.getSoundboardSounds();
            });
            

            DG.Client.on("NOTIFICATION_CREATE", (data) => {
              // When getting DMs, or Tagged in a message.. can give  you details as to where.. so could set up a button to take to channel where tagged technically..
              // Select channel action would need a custom input for channel ID
              this.notification.onNotification(data);

            })

            // should these events be pushed into their own file or remain here?
            DG.Client.on("VOICE_STATE_CREATE", (data) => {
              this.voiceState('create',data);
            })
      
            DG.Client.on("VOICE_STATE_UPDATE", (data) => {
              this.voiceState('update',data);
            })
      
            DG.Client.on("VOICE_STATE_DELETE", (data) => {
              this.voiceState('delete',data);
            })
      
            DG.Client.on("SPEAKING_START", (data) => {
              this.voiceState('speaking',data);
            })
          
            DG.Client.on("SPEAKING_STOP", (data) => {
              this.voiceState('stop_speaking',data);
            })
          
            DG.Client.on('VOICE_SETTINGS_UPDATE', (data) => {
              this.voiceActivity(data);
            })
      
            DG.Client.on('GUILD_CREATE', (data) => {
              this.guildCreate(data);
            })
      
            DG.Client.on('CHANNEL_CREATE', (data) => {
              this.channelCreate(data);
            })
            
            DG.Client.on('VOICE_CHANNEL_SELECT', (data) => {
                voiceChannel(data);
            })
      
            DG.Client.on('VOICE_CONNECTION_STATUS', (data) => {
              this.voiceConnectionStatus(data);
            })
      
            DG.Client.on('VIDEO_STATE_UPDATE', (data) => {
              TPClient.stateUpdate("discord_camera_status",data.active? "On" : "Off")
            })
          
            DG.Client.on('SCREENSHARE_STATE_UPDATE', (data) => {
              TPClient.stateUpdate("discord_screenshare_status",data.active? "On" : "Off")
            })
          
            DG.Client.on("disconnected", () => {
              logIt("WARN","discord connection closed, will attempt reconnect, once process detected");
              TPClient.settingUpdate("Plugin Connected","Disconnected");
              TPClient.stateUpdate("discord_connected","Disconnected");
              if( platform != 'win32' ) {
                return this.doLogin();
              }
            });

        }

        async voiceState(event, data) {
            logIt("DEBUG","Voice State", event, JSON.stringify(data));
            let ids = [];
          
            if (event === "create") {
              if (data.user.id !== DG.Client.user.id) {
                await this.addUserData(data);
              }
            }
          
            if (event === "delete") {
              this.deleteUserStates(data);
            }
          
            if (event === "speaking" || event === "stop_speaking") {
              this.handleSpeakingEvent(event, data);
            }
          
            if (event === "update") {
              if (data.user.id !== DG.Client.user.id) {
                this.updateUserStates(data);
              }
            }
        }



        handleSpeakingEvent(event, data) {
          let userId = data.user_id;
          if (DG.currentVoiceUsers.hasOwnProperty(userId)) {
            const isSpeaking = event === "speaking";

            DG.currentVoiceUsers[userId].speaking = isSpeaking;

            const userIndex = Object.keys(DG.currentVoiceUsers).indexOf(userId);
            TPClient.stateUpdate(`user_${userIndex}_Speaking`, isSpeaking ? "On" : "Off");
      
      
            // Check if user in custom watch list..
        
            if (DG.customVoiceAcivityUsers.hasOwnProperty(userId)) {
              // console.log("User exists");
              TPClient.stateUpdate(`${DG.customVoiceAcivityUsers[userId]}_Speaking`, isSpeaking ? "On" : "Off");
            }
        
            logIt("INFO", DG.currentVoiceUsers[userId].nick, isSpeaking ? "started speaking" : "stopped speaking");
          }
      }




      voiceActivity = (newData) =>  {
          logIt("DEBUG","voiceActivity", JSON.stringify(newData));
          const data = diff(DG.prevVoiceActivityData, newData)
          // We always need these
          data.mute = newData.mute
          data.deaf = newData.deaf
          DG.prevVoiceActivityData = newData;
          const states = []
          const connectors = []
        
          if( data.hasOwnProperty('mute')) {
            if (data.mute) {
              DG.muteState = 1;
            } else {
              DG.muteState = 0;
            }
        
            logIt("discord mute is "+DG.muteState)
            states.push({ id: "discord_mute", value: DG.muteState ? "On" : "Off" })
        }
        if( data.hasOwnProperty('deaf')) {
          if (data.deaf) {
            DG.deafState = 1;
            DG.muteState = 1;
          } else {
            DG.deafState = 0;
          }
          states.push({ id: "discord_deafen", value: DG.deafState ? "On" : "Off" })
          states.push({ id: "discord_mute", value: DG.muteState ? "On" : "Off" })
          logIt("discord deafen is "+DG.deafState)
        }
        
        if( data.hasOwnProperty('input') && data.input.hasOwnProperty('volume') && data.input.volume > -1) {
          DG.voice_volume  = convertVolumeToPercentage(data.input.volume);
          states.push({ id: "discord_voice_volume", value: DG.voice_volume  })
          connectors.push({ id: "discord_voice_volume_connector", value: DG.voice_volume  })
        }
        if( data.hasOwnProperty('output') && data.output.hasOwnProperty('volume') && data.output.volume > -1) {
          DG.speaker_volume = convertVolumeToPercentage(data.output.volume);
          DG.speaker_volume_connector = Math.round(convertVolumeToPercentage(data.output.volume)/2);
          states.push({ id: "discord_speaker_volume", value: DG.speaker_volume })
          connectors.push({ id: "discord_speaker_volume_connector", value: DG.speaker_volume_connector })
        }
        if( data.hasOwnProperty('mode') && data.mode.hasOwnProperty('type') && data.mode.type != '') {
          DG.voice_mode_type = data.mode.type;
          states.push( { id: "discord_voice_mode_type", value: DG.voice_mode_type })
        }
        if( data.hasOwnProperty('automatic_gain_control') || data.hasOwnProperty('automaticGainControl')) {
          DG.automatic_gain_control = data.automatic_gain_control || data.automaticGainControl ? 1 : 0;
          states.push({ id: "discord_automatic_gain_control", value: DG.automatic_gain_control ? "On" : "Off" })
        }
        if( data.hasOwnProperty('noise_suppression') || data.hasOwnProperty('noiseSuppression')) {
          DG.noise_suppression = data.noise_suppression || data.noiseSuppression ? 1 : 0;
          states.push({ id: "discord_noise_suppression", value: DG.noise_suppression ? "On" : "Off" })
        }
        if( data.hasOwnProperty('echo_cancellation') || data.hasOwnProperty('echoCancellation')) {
          DG.echo_cancellation = data.echo_cancellation || data.echoCancellation ? 1 : 0;
          states.push({ id: "discord_echo_cancellation", value: DG.echo_cancellation ? "On" : "Off" })
        }
        if( data.hasOwnProperty('silence_warning') || data.hasOwnProperty('silenceWarning')) {
          DG.silence_warning = data.silence_warning || data.silenceWarning ? 1 : 0;
          states.push({ id: "discord_silence_warning", value: DG.silence_warning ? "On" : "Off" })
        }
        if( data.hasOwnProperty('qos') || data.hasOwnProperty('qos')) {
          DG.qos_priority = data.qos ? 1 : 0;
          states.push({ id: "discord_qos_priority", value: DG.qos_priority ? "On" : "Off" })
        }
        
        if( states.length > 0 ) {
          TPClient.stateUpdateMany(states);
        }
        if( connectors.length > 0 ) {
          TPClient.connectorUpdateMany(connectors);
        }
      }  


      voiceConnectionStatus = async (data) => {
        logIt("DEBUG",'Voice Connection:',JSON.stringify(data));
        if( data.state != null && data.state == 'VOICE_CONNECTED' ) {
          // Set Voice Channel Connect State
          DG.voice_channel_connected = 'Yes';
          DG.voice_average_ping = data.average_ping.toFixed(2);
          DG.voice_hostname = data.hostname;
        }
        else if( data.state != null && data.state == 'DISCONNECTED' ) {
          //Set Voice Channel Connect State Off
          DG.voice_channel_connected = 'No';
          DG.voice_average_ping = '0';
          DG.voice_hostname = '<None>';
          DG.voice_channel_participants = '<None>'
        }
        let states = [
          { id: 'discord_voice_channel_connected', value: DG.voice_channel_connected},
          { id: 'discord_voice_average_ping', value: DG.voice_average_ping},
          { id: 'discord_voice_hostname', value: DG.voice_hostname },
          { id: 'discord_voice_channel_name', value: DG.voice_channel_name},
          { id: 'discord_voice_channel_id', value: DG.voice_channel_id},
          { id: 'discord_voice_channel_server_name', value: DG.voice_channel_server_name},
          { id: 'discord_voice_channel_server_id', value: DG.voice_channel_server_id },
          { id: 'discord_voice_channel_participants', value: DG.voice_channel_participants}
        ];
        TPClient.stateUpdateMany(states);
    };
    




    getGuild = async(data) => {
      let guild = await DG.Client.getGuild(data.id);
      await this.assignGuildIndex(guild,1);
    
      TPClient.choiceUpdate('discordServerList',DG.guilds.array)
    };
    
    getGuildChannels = async (guildId ) => {
      logIt("DEBUG","getGuildChannels for guildId",guildId);
      let channels = await DG.Client.getChannels(guildId);
      if( !channels ) { logIt("ERROR","No channel data available for guildId",guildId); return; }
      return channels; 
    }
    
    
    getChannel = async (data) => {
      let channel = await DG.Client.getChannel(data.id);
      this.assignChannelIndex(channel.guild_id,channel);
    };
    
    
    guildCreate = async (data) => {
      logIt("DEBUG",'Guild Create:',JSON.stringify(data));
      this.getGuild(data);
    };

    channelCreate = async (data) => {
      logIt("DEBUG",'Channel Create:',JSON.stringify(data));
      this.getChannel(data);
    };
    


    getGuilds = async () => {
      let data = await DG.Client.getGuilds();
      console.log("Fetched Guilds")
    
      if( !data || !data.guilds ) { logIt("ERROR", "guild data not available"); return; }
    
      DG.guilds = {
        array : [],
        idx: {}
      };
    
      // Switched this up because of the .forEach not honoring the await process,
      // but native if does
      for ( let i = 0; i < data.guilds.length; i++ ) {
        await this.assignGuildIndex(data.guilds[i],i);
      }
    
      TPClient.choiceUpdate('discordServerList',DG.guilds.array)
    
      const voiceChannelData = await DG.Client.getSelectedVoiceChannel();
      if( voiceChannelData != null ) {
        voiceChannelData.channel_id = voiceChannelData.id;
        voiceChannel(voiceChannelData);
      }
    };

      

    assignGuildIndex = async (guild, counter) => {
      DG.guilds.array.push(guild.name);
      DG.guilds.idx[guild.name] = guild.id;
      DG.guilds.idx[guild.id] = guild.name;
    
      //Look into maybe using a promise and an await here.. 
      // to limit having to do this timeout thingy
      await this.buildGuildChannelIndex(guild.id);
    };


    buildGuildChannelIndex = async(guildId) => {
      let chData = await this.getGuildChannels(guildId);
    
      DG.channels[guildId] = {
        voice: {
          array: [],
          idx: {},
          names: {}
        },
        text: {
          array: [],
          idx: {},
          names: {}
        }
      };
    
      chData.forEach(async (channel,idx) => {
        this.assignChannelIndex(guildId, channel);
      });
    };


    assignChannelIndex = (guildId, channel) => {
      // Type 0 is Text channel, 2 is Voice channel
      if( channel.type == 0 ) {
        DG.channels[guildId].text.array.push(channel.name);
        DG.channels[guildId].text.idx[channel.name] = channel.id;
        DG.channels[guildId].text.names[channel.id] = channel.name;
      }
      else if( channel.type == 2 ) {
        DG.channels[guildId].voice.array.push(channel.name);
        DG.channels[guildId].voice.idx[channel.name] = channel.id;
        DG.channels[guildId].voice.names[channel.id] = channel.name;
      }
    }


    getSoundboardSounds = async () => {
  
      let sounds = await DG.Client.getSoundboardSounds();
      
      if( sounds != null ) {
        DG.soundBoard = {
          array: [],
          idx: {}
        }
    
        for( const sound of sounds ) {
          let emojiName = sound.emoji_name != null ? sound.emoji_name + ' - ' : '';
          let guildName = sound.guild_id === "DEFAULT" ? "Discord Sounds" : DG.guilds.idx[sound.guild_id]
          let soundName = guildName + " - " + emojiName + sound.name;
          DG.soundBoard.array.push(soundName);
          DG.soundBoard.idx[soundName] = sound;
          DG.soundBoard.idx[sound.sound_id] = sound;
        }
    
        // Sort by Discord Guild name - seems to make the most sense to collect them into grouped areas.
        DG.soundBoard.array.sort();
    
        TPClient.choiceUpdate('discordSound',DG.soundBoard.array);
      }
    };
    


}


module.exports = { VoiceStateHandler };