
// Declaring empty objects for states, events, actions, and connectors
const PLUGIN_ID = "TPDiscord";
const PLUGIN_NAME = "Touch Portal Discord Plugin";

const PLUGIN_FOLDER = "tpdiscord"
const PLUGIN_ICON = "tpdiscord.png"


let states = {}
let events = {}
let actions = {}
let connectors = {}


let TP_PLUGIN_INFO = {
    sdk: 6,
    version: 5000,
    TPDiscord_Version:"5.0.0",
    name: `${PLUGIN_NAME}`,
    id: `${PLUGIN_ID}`,
    plugin_start_cmd_windows: "\"%TP_PLUGIN_FOLDER%tpdiscord\\tpdiscord.exe\"",
    plugin_start_cmd_mac: `sh %TP_PLUGIN_FOLDER%${PLUGIN_FOLDER}/start_tpdiscord.sh`,
    plugin_start_cmd_linux: `sh %TP_PLUGIN_FOLDER%${PLUGIN_FOLDER}/start_tpdiscord.sh`,
    configuration: {
        colorDark: "#23272A",
        colorLight: "#7289DA"
    },
}


let TP_PLUGIN_SETTINGS = [
    {
        name: "Discord Client Id",
        type: "text",
        default: "",
        maxLength: 20
    },
    {
        name: "Discord Client Secret",
        type: "text",
        isPassword: true,
        default: "",
        maxLength: 36
    },
    {
        name: "Plugin Connected",
        type: "text",
        readOnly: true,
        default: "Disconnected"
    },
    {
        name: "Skip Process Watcher",
        type: "text",
        default: "No",
        maxLength: 3
    },
    {
        name: "Discord Debug Mode",
        type: "text",
        default: "Off",
        maxLength: 3
    },
    {
        name: "VoiceActivity Tracker - Seperate each ID by commas",
        type: "text",
        default: ""
    }
]



let TP_PLUGIN_CATEGORIES = {
    "Discord": {
        id: "TPDiscord",
        name: "Discord",
        imagepath: `%TP_PLUGIN_FOLDER%${PLUGIN_FOLDER}/${PLUGIN_ICON}`,
    },
    "VoiceChannel Info": {
        id: "TPDiscord_VoiceChannel",
        name: "VoiceChannel Info",
        imagepath: `%TP_PLUGIN_FOLDER%${PLUGIN_FOLDER}/${PLUGIN_ICON}`,
    },
    "Discord Settings": {
        id: "TPDiscord_Settings",
        name: "Discord Settings",
        imagepath: `%TP_PLUGIN_FOLDER%${PLUGIN_FOLDER}/${PLUGIN_ICON}`,
    },
    "Direct Message": {
        id: "TPDiscord_DirectMessage",
        name: "Direct Message",
        imagepath: `%TP_PLUGIN_FOLDER%${PLUGIN_FOLDER}/${PLUGIN_ICON}`,
    },
    "Mentions": {
        id: "TPDiscord_Mentions",
        name: "Mentions",
        imagepath: `%TP_PLUGIN_FOLDER%${PLUGIN_FOLDER}/${PLUGIN_ICON}`,
    }

}




// ----------------------------------------------------
// Adding states for DM Category
// ----------------------------------------------------
Object.assign(states, {
    "DM1":{
        id: "discord_DM_user",
        category: "Direct Message",
        type: "text",
        desc: "DM: UserName",
        default: ""
    },
    "DM2":{
        id: "discord_DM_userID",
        category: "Direct Message",
        type: "text",
        desc: "DM: UserID",
        default: ""
    },
    "DM3":{
        id: "discord_DM_channelID",
        category: "Direct Message",
        type: "text",
        desc: "DM: ChannelID",
        default: ""
    },
    "DM4":{
        id: "discord_DM_content",
        category: "Direct Message",
        type: "text",
        desc: "DM: Content",
        default: ""
    },
    "DM5":{
        id: "discord_newDM_eventState",
        category: "Direct Message",
        type: "text",
        desc: "Discord New DM Event",
        default: "False"
    },
    "DM6":{
        id: "discord_DM_timestamp",
        category: "Direct Message",
        type: "text",
        desc: "DM: Timestamp",
        default: ""
    },
   "DM7": {
        id: "discord_DM_avatar",
        category: "Direct Message",
        type: "text",
        desc: "DM: User Avatar",
        default: ""
    }
})


// ----------------------------------------------------
// Adding states for New Mention Category
// ----------------------------------------------------

Object.assign(states, {
    "Mention1":{
        id: "discord_Mention_user",
        category: "Mentions",
        type: "text",
        desc: "Mention: UserName",
        default: ""
    },
    "Mention2":{
        id: "discord_Mention_userID",
        category: "Mentions",
        type: "text",
        desc: "Mention: UserID",
        default: ""
    },
    "Mention3":{
        id: "discord_Mention_channelID",
        category: "Mentions",
        type: "text",
        desc: "Mention: ChannelID",
        default: ""
    },
    "Mention4":{
        id: "discord_Mention_content",
        category: "Mentions",
        type: "text",
        desc: "Mention: Content",
        default: ""
    },
    "Mention5": {
        id: "discord_newMention_eventState",
        category: "Mentions",
        type: "text",
        desc: "Discord New Mention Event",
        default: "False"
    },
    "Mention6":{
        id: "discord_Mention_timestamp",
        category: "Mentions",
        type: "text",
        desc: "Mention: Timestamp",
        default: ""
    },
   "Mention7": {
        id: "discord_Mention_avatar",
        category: "Mentions",
        type: "text",
        desc: "Mention: User Avatar",
        default: ""
    },
    "Mention8":{
        id: "discord_Mention_channelType",
        category: "Mentions",
        type: "text",
        desc: "Mention: Channel Type",
        default: "",
        valueChoices: [
            // "voice",
            "text",
            "forum",
            "announcement",
            "dm"
        ]

    },

})

// ----------------------------------------------------
// Adding states for Discord Settings Category
// ----------------------------------------------------
Object.assign(states, {
   "Settings1": {
        id: "discord_automatic_gain_control",
        category: "Discord Settings",
        type: "choice",
        desc: "Discord Automatic Gain Control",
        default: "Off",
        valueChoices: [
            "Off",
            "On"
        ]
    },
   "Settings2":{
        id: "discord_echo_cancellation",
        category: "Discord Settings",
        type: "choice",
        desc: "Discord Echo Cancellation",
        default: "Off",
        valueChoices: [
            "Off",
            "On"
        ]
    },
    "Settings3":{
        id: "discord_noise_suppression",
        category: "Discord Settings",
        type: "choice",
        desc: "Discord Noise Suppression",
        default: "Off",
        valueChoices: [
            "Off",
            "On"
        ]
    },
    "Settings4":{
        id: "discord_silence_warning",
        category: "Discord Settings",
        type: "choice",
        desc: "Discord Silence Warning",
        default: "Off",
        valueChoices: [
            "Off",
            "On"
        ]
    },
    "Settings5":{
        id: "discord_qos_priority",
        category: "Discord Settings",
        type: "choice",
        desc: "Discord Quality of Service Priority",
        default: "Off",
        valueChoices: [
            "Off",
            "On"
        ]
    },
   "Settings6": {
        id: "discord_voice_mode_type",
        category: "Discord Settings",
        type: "choice",
        desc: "Discord Voice Mode Type",
        default: "",
        valueChoices:[
            "PUSH_TO_TALK",
            "VOICE_ACTIVITY"
        ]
    }
})



// ----------------------------------------------------
// Adding states for voiceChannelInfo Category
// ----------------------------------------------------
Object.assign(states, {
    "VoiceChannelInfo_Connected":{
        id: "discord_voice_channel_connected",
        category: "VoiceChannel Info",
        type: "choice",
        desc: "Discord Voice Channel Connected",
        default: "No",
        valueChoices: [
            "No",
            "Yes"
        ]
    },
    "VoiceChannelInfo_serverID":{
        id: "discord_voice_channel_server_id",
        category: "VoiceChannel Info",
        type: "text",
        desc: "Discord Voice Channel Server ID",
        default: ""
    },
   "VoiceChannelInfo_serverName": {
        id: "discord_voice_channel_server_name",
        category: "VoiceChannel Info",
        type: "text",
        desc: "Discord Voice Channel Server Name",
        default: ""
    },
    "VoiceChannelInfo_channelId":{
        id: "discord_voice_channel_id",
        category: "VoiceChannel Info",
        type: "text",
        desc: "Discord Voice Channel ID",
        default: ""
    },
    "VoiceChannelInfo_channelName":{
        id: "discord_voice_channel_name",
        category: "VoiceChannel Info",
        type: "text",
        desc: "Discord Voice Channel Name",
        default: ""
    },
    "VoiceChannelInfo_averagePing":{
        id: "discord_voice_average_ping",
        category: "VoiceChannel Info",
        type: "text",
        desc: "Discord Voice Average Ping",
        default: "0.00"
    },
    "VoiceChannelInfo_hostname":{
        id: "discord_voice_hostname",
        category: "VoiceChannel Info",
        type: "text",
        desc: "Discord Voice Hostname",
        default: ""
    },
    "VoiceChannelInfo_channelParticipants":{
        id: "discord_voice_channel_participants",
        category: "VoiceChannel Info",
        type: "text",
        desc: "Discord Voice Channel Participants",
        default: "<None>"
    },
    "VoiceChannelInfo_channelParticipantIds":{
        id: "discord_voice_channel_participant_ids",
        category: "VoiceChannel Info",
        type: "text",
        desc: "Discord Voice Channel Participant IDs",
        default: "<None>"
    }
})


// ----------------------------------------------------
// Adding states for the main category
// ----------------------------------------------------
Object.assign(states, {
    "Discord_inputDevice":{
        id: "discord_inputDevice",
        category: "Discord",
        type: "text",
        desc: "Discord Current Input Device",
        default: ""
    },
    "Discord_outputDevice":{
        id: "discord_outputDevice",
        category: "Discord",
        type: "text",
        desc: "Discord Current Output Device",
        default: ""
    },
    "Discord_Mute":{
        id: "discord_mute",
        category: "Discord",
        type: "choice",
        desc: "Discord Mute",
        default: "Off",
        valueChoices: [
            "Off",
            "On"
        ]
    },
    "Discord_Deafen":{
        id: "discord_deafen",
        category: "Discord",
        type: "choice",
        desc: "Discord Deafen",
        default: "Off",
        valueChoices: [
            "Off",
            "On"
        ]
    },
    "Discord_cameraStatus":{
        id: "discord_camera_status",
        category: "Discord",
        type:"choice",
        desc:"Discord Camera",
        default: "Off",
        valueChoices: [
            "Off",
            "On"
        ]

    },
    "Discord_screenshareStatus":{
        id: "discord_screenshare_status",
        category: "Discord",
        type:"choice",
        desc:"Discord Screen Share",
        default: "Off",
        valueChoices: [
            "Off",
            "On"
        ]
    },
    "Discord_speakerVolume":{
        id: "discord_speaker_volume",
        category: "Discord",
        type: "text",
        desc: "Discord Speaker Volume",
        default: "0.00"
    },
    "Discord_voiceVolume":{
        id: "discord_voice_volume",
        category: "Discord",
        type: "text",
        desc: "Discord Voice Volume",
        default: "0.00"
    },
    "Discord_Running":{
        id: "discord_running",
        category: "Discord",
        type: "choice",
        desc: "Discord Process Running",
        default: "",
        valueChoices:[
            "Yes",
            "No",
            "Unknown"
        ]
    },
    "Discord_Connected":{
        id: "discord_connected",
        category: "Discord",
        type: "choice",
        desc: "Discord Connected",
        default: "",
        valueChoices:[
            "Connected",
            "Disconnected"
        ]
    },
    "Discord_audioDeviceEvent":{
        id: "discord_default_audio_device_change_eventState",
        category: "Discord",
        type: "choice",
        desc: "Discord Default Audio Device Change Event",
        default: "",
        valueChoices:[
            "Input",
            "Output"
        ]  
    }
})


// Adding Actions for Main Category
Object.assign(actions, {
   "Discord_setDeafen": {
        id: "discord_deafen_action",
        category: "Discord",
        prefix: "Discord:",
        name: "Discord: Deafen",
        type: "communicate",
        tryInline: "true",
        format: "Discord: Set Deafen {$discordDeafenAction$} for user {$voiceUserList$}",
        data: [
            {
                id: "discordDeafenAction",
                type: "choice",
                label: "Deafen Action",
                default: "",
                valueChoices: [
                    "Toggle",
                    "Off",
                    "On"
                ]
            },
            {
                id: "voiceUserList",
                type: "choice",
                label: "Voice User List",
                default: "",
                valueChoices: ["Self", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
            }
        ]
    },
    "Discord_setMute":{
        id: "discord_mute_action",
        category: "Discord",
        prefix: "Discord:",
        name: "Discord: Mute",
        type: "communicate",
        tryInline: "true",
        format: "Discord: Set Mute {$discordMuteAction$}, for user {$voiceUserList$}",
        data: [
            {
                id: "discordMuteAction",
                type: "choice",
                label: "Mute Action",
                default: "",
                valueChoices: [
                    "Toggle",
                    "Off",
                    "On"
                ]
            },
            {
                id: "voiceUserList",
                type: "choice",
                label: "Voice User List",
                default: "",
                valueChoices: ["Self", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
            }
        ]
    },
    "Discord_pushtoTalk":{
        id: "discord_push_to_talk",
        category: "Discord",
        prefix: "Discord:",
        name: "Discord: Push To Talk",
        type: "communicate",
        tryInline: "true",
        hasHoldFunctionality: "true",
        format: "Discord: Push To Talk",
        data: []
    },
   "Discord_pushtoMute": {
        id: "discord_push_to_mute",
        category: "Discord",
        prefix: "Discord:",
        name: "Discord: Push To Mute",
        type: "communicate",
        tryInline: "true",
        hasHoldFunctionality: "true",
        format: "Discord: Push To Mute",
        data: []
    },
    "Discord_setVolume":{
        id: "discord_voice_volume_action",
        category: "Discord",
        prefix: "Discord:",
        name: "Discord: Voice Volume",
        type: "communicate",
        tryInline: "true",
        hasHoldFunctionality: "true",
        format: "Discord: Set Voice Volume {$discordVoiceVolume$} for user {$voiceUserList$} (-10 will lower by 10%)",
        data: [
            {
                id: "discordVoiceVolume",
                type: "text",
                label: "Voice Volume",
                default: "0.00"    
            },
            {
                id: "voiceUserList",
                type: "choice",
                label: "Voice User List",
                default: "",
                valueChoices: ["Self", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]

            }
        ]
    },
    "Discord_setautomaticGain":{
        id: "discord_automatic_gain_control_action",
        category: "Discord Settings",
        prefix: "Discord:",
        name: "Discord: Automatic Gain Control",
        type: "communicate",
        tryInline: "true",
        format: "Discord: Set Automatic Gain Control {$discordAutomaticGainControlAction$}",
        data: [
            {
                id: "discordAutomaticGainControlAction",
                type: "choice",
                label: "Automatic Gain Control Action",
                default: "",
                valueChoices: [
                    "Toggle",
                    "Off",
                    "On"
                ]
            }
        ]
    },
    "Discord_setEchoCancellation":{
        id: "discord_echo_cancellation_action",
        category: "Discord Settings",
        prefix: "Discord:",
        name: "Discord: Echo Cancellation",
        type: "communicate",
        tryInline: "true",
        format: "Discord: Set Echo Cancellation {$discordEchoCancellationAction$}",
        data: [
            {
                id: "discordEchoCancellationAction",
                type: "choice",
                label: "Echo Cancellation Action",
                default: "",
                valueChoices: [
                    "Toggle",
                    "Off",
                    "On"
                ]
            }
        ]
    },
    "Discord_setnoiseSuppression":{
        id: "discord_noise_suppression_action",
        category: "Discord Settings",
        prefix: "Discord:",
        name: "Discord: Noise Suppression",
        type: "communicate",
        tryInline: "true",
        format: "Discord: Set Noise Suppression {$discordNoiseSuppressionAction$} (Note: If using Krisp, this action seems to do nothing)",
        data: [
            {
                id: "discordNoiseSuppressionAction",
                type: "choice",
                label: "Noise Suppression Action",
                default: "",
                valueChoices: [
                    "Toggle",
                    "Off",
                    "On"
                ]
            }
        ]
    },
    "Discord_setQos":{
        id: "discord_qos_high_packet_priority_action",
        category: "Discord Settings",
        prefix: "Discord:",
        name: "Discord: Quality of Service Priority",
        type: "communicate",
        tryInline: "true",
        format: "Discord: Set Quality of Service High Packet Priority {$discordQOSHighPacketPriorityAction$}",
        data: [
            {
                id: "discordQOSHighPacketPriorityAction",
                type: "choice",
                label: "Quality of Service High Packet Priority Action",
                default: "",
                valueChoices: [
                    "Toggle",
                    "Off",
                    "On"
                ]
            }
        ]
    },
    "Discord_setsilenceWarning":{
        id: "discord_silence_warning_action",
        category: "Discord Settings",
        prefix: "Discord:",
        name: "Discord: Silence Warning",
        type: "communicate",
        tryInline: "true",
        format: "Discord: Set Silence Warning {$discordSilenceWarningAction$}",
        data: [
            {
                id: "discordSilenceWarningAction",
                type: "choice",
                label: "Silence Warning Action",
                default: "",
                valueChoices: [
                    "Toggle",
                    "Off",
                    "On"
                ]
            }
        ]
    },
   "Discord_hangupVoice": {
       id: "discord_hangup_voice",
       category: "Discord",
       prefix: "Discord:",
       name:"Discord Hang Up",
       type:"communicate",
       tryInline:"true",
       format:"Discord: Hang Up Voice Channel"
    },
    "Discord_playSound":{
        id: "discord_play_sound",
        category: "Discord",
        prefix: "Discord:",
        name: "Discord: Play Sound",
        type: "communicate",
        tryInline: "true",
        format: "Discord: Play Sound {$discordSound$}",
        data: [
            {
                id: "discordSound",
                type: "choice",
                label: "Discord Sound",
                default: "",
                valueChoices: []
            }
        ]
    },
    "Discord_selectChannel":{
       id: "discord_select_channel",
       category: "Discord",
       prefix: "Discord:",
       name:"Discord Select Channel",
       type:"communicate",
       tryInline:"true",
       format:"Discord: On Server {$discordServerList$} go to {$discordChannelType$} channel {$discordServerChannel$}",
       data:[
           {
               id:"discordServerList",
               type:"choice",
               label:"Discord Server List",
               default:"",
               valueChoices:[]
           },
           {
               id:"discordChannelType",
               type:"choice",
               label:"Discord Channel Type",
               default:"",
               valueChoices:[
                  "Text",
                  "Voice",
                  "Announcement",
                //   "Forum"
               ]
           },
           {
               id:"discordServerChannel",
               type:"choice",
               label:"Discord Server Channel List",
               default:"",
               valueChoices:[]
           }
       ]
    },
    "Discord_setVoiceMode":{
       id: "discord_voice_mode_change",
       category: "Discord Settings",
       prefix: "Discord:",
       name:"Discord Voice Mode",
       type:"communicate",
       tryInline:"true",
       format:"Discord: Set Voice Type to {$discordVoiceMode$}",
       data:[
           {
               id:"discordVoiceMode",
               type:"choice",
               label:"Discord Voice Mode",
               default:"Toggle",
               valueChoices:[
                   "Voice Activity",
                   "Push To Talk",
                   "Toggle"
               ]
           }
       ]
    },
    "Discord_resetPTT":{
       id: "discord_reset_push_to_talk_key",
       category: "Discord Settings",
       prefix: "Discord:",
       name:"Discord Reset Push To Talk Keys",
       type:"communicate",
       tryInline:"true",
       format:"Discord: Reset Push To Talk Keys"
    },
    "Discord_PTT":{
       id: "discord_push_to_talk_key",
       category: "Discord Settings",
       prefix: "Discord",
       name:"Discord Add Push To Talk Key",
       type:"communicate",
       tryInline:"true",
       format:"Discord: Add Push To Talk Key from keyboard Key: {$discordPTTKeyboardKey$}",
       data:[
           {
               id:"discordPTTKeyboardKey",
               type:"choice",
               label:"Discord Push To Talk Keyboard Key",
               default:"",
               valueChoices:[
               ]
           }
       ]
    },
    "Discord_setPTT":{
       id: "discord_set_push_to_talk_key",
       category: "Discord Settings",
       prefix: "Discord:",
       name:"Discord Store Push To Talk Keys",
       type:"communicate",
       tryInline:"true",
       format:"Discord: Store Push To Talk Keys"
    },
    "Discord_selectChannelCustom":{
        id: "discord_select_channel_custom",
        category: "Discord",
        prefix: "Discord:",
        name:"Discord Select Channel (by ID)",
        type:"communicate",
        tryInline:"true",
        format:"Discord: Go to {$discordChannelTypeCustom$} Channel with id: {$discordChannelIdCustom$}",
        data:[
             {
                id:"discordChannelIdCustom",
                type:"text",
                label:"Discord DM Voice Channel Id",
                default:""
            },
            {
             id:"discordChannelTypeCustom",
             type:"choice",
             label:"Discord Channel Type",
             default:"",
             valueChoices:[
                 "Text",
                 "Voice",
             ]
            }
        ]
     },
    "Discord_toggleCamera":{
        id: "discord_toggle_camera",
        category: "Discord",
        prefix: "Discord:",
        name: "Discord: Toggle Camera",
        type: "communicate",
        tryInline: "true",
        format: "Discord: Toggle Camera On/Off"
    },
    "Discord_toggleScreenshare":{
        id: "discord_toggle_screenshare",
        category: "Discord",
        prefix: "Discord:",
        name: "Discord: Toggle Screen Share",
        type: "communicate",
        tryInline: "true",
        format: "Discord: Toggle Screen Share On/Off"
    },
    "Discord_setAudioDevice":{
        id: "discord_setDefaultAudioDevice",
        category: "Discord",
        prefix: "Discord:",
        name: "Discord: Set Default Audio Device (Input/Output)",
        type: "communicate",
        tryInline: "true",
        format: "Discord: Set {$discord_DeviceType$} Device to {$discord_SelectedDevice$}",
        data: [
            {
                id: "discord_SelectedDevice",
                type: "choice",
                label: "Discord Selected Device",
                default: "",
                valueChoices: []
            },
            {
                id: "discord_DeviceType",
                type: "choice",
                label: "Discord Audio Device Type",
                default: "Output",
                valueChoices: ["Input", "Output"]
            }
        ]
    },
    "Discord_setAudioDeviceVolume":{
        id: "discord_setDefaultAudioDevice_volume",
        category: "Discord",
        prefix: "Discord:",
        name: "Discord: Set Volume for Default Audio Device (Input/Output)",
        type: "communicate",
        tryInline: "true",
        hasHoldFunctionality: "true",
        format: "Discord: Set volume for {$discord_DeviceType$} Device to {$discord_deviceVolume$} - (-10 will lower 10%)",
        data: [
            {
                id: "discord_DeviceType",
                type: "choice",
                label: "Discord Audio Device Type",
                default: "Output",
                valueChoices: ["Input", "Output"]
            },
            {
                id: "discord_deviceVolume",
                type: "text",
                label: "Discord Device Volume",
                default: "0.00"
            }
        ]
    },
    // "23":{
    //     id: "discord_setActivity",
    //     category: "Discord",
    //     prefix: "Discord:",
    //     name: "Discord: Set Activity",
    //     type: "communicate",
    //     tryInline: "true",
    //     format: "Discord: Set Activity to {$discord_activity_type$} with details: {$discord_activity_details$}, state: {$discord_activity_state$}, name: {$discord_activity_name$}",
    //     data: [
    //         {
    //             id: "discord_activity_type",
    //             type: "choice",
    //             label: "Discord Activity Type",
    //             default: "",
    //             valueChoices: ["Playing", "Streaming", "Listening", "Watching", "Competing", "Custom"]
    //         },
    //         {
    //             id: "discord_activity_details",
    //             type: "text",
    //             label: "Discord Activity Details",
    //             default: ""
    //         },
    //         {
    //             id: "discord_activity_state",
    //             type: "text",
    //             label: "Discord Activity State",
    //             default: ""
    //         },
    //         {
    //             id: "discord_activity_name",
    //             type: "text",
    //             label: "Discord Activity Name",
    //             default: ""
    //         }
    //     ]
    // }


})




// Adding Connectors for Main Category...
Object.assign(connectors, {
    "1":{
        id: "discord_voice_volume_connector",
        category: "Discord",
        prefix: "Discord:",
        name:"Adjust Input Volume",
        format:"Discord: Adjust Input Volume"
    },
    "2":{
        id: "discord_speaker_volume_connector",
        category: "Discord",
        prefix: "Discord:",
        name:"Adjust Output Volume",
        format:"Discord: Adjust Output Volume"
    },
    "3":{
        id: "discord_voice_volume_action_connector",
        category: "Discord",
        prefix: "Discord:",
        name:"Adjust VC User Volume",
        format:"Discord: Set Voice Volume for user {$voiceUserList_connector$}",
        data: [
            {
                id: "voiceUserList_connector",
                type: "choice",
                label: "Voice User List",
                default: "0",
                valueChoices: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
            }
        ]
    }
})



// Adding Events for Main Category
Object.assign(events, {
    "1":{
    id: "discord_newDM",
    category: "Discord",
    name: "Discord: New Direct Message (DM)",
    format: "When receiving a new Direct Message $val",
    type: "communicate",
    valueChoices: [
      "True",
      "False"
        ],
    valueType: "choice",
    valueStateId: "discord_newDM_eventState"
  },
  "2": {
    id: "discord_newMention",
    category: "Discord",
    name: "Discord | New Mention",
    format: "When receiving a new Mention $val",
    type: "communicate",
    valueChoices: [
      "True",
      "False"
    ],
    valueType: "choice",
    valueStateId: "discord_newMention_eventState"
},
    "3":{
        id: "discord_default_audio_device_change",
        category: "Discord",
        name: "Discord: Default Audio Device Changed",
        format: "When Default $val Device Changed",
        type: "communicate",
        valueChoices: [
            "Input",
            "Output"
        ],
        valueType: "choice",
        valueStateId: "discord_default_audio_device_change_eventState"
    }

})


// module.exports = {PLUGIN_ID, PLUGIN_NAME, PLUGIN_FOLDER, PLUGIN_ICON, TP_PLUGIN_INFO, TP_PLUGIN_SETTINGS}
