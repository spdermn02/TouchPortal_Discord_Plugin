
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
        imagepath: `%TP_PLUGIN_FOLDER%${PLUGIN_FOLDER}/${PLUGIN_ICON}.png`,
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
    "1":{
        id: "discord_DM_user",
        category: "Direct Message",
        type: "text",
        desc: "DM: UserName",
        default: ""
    },
    "2":{
        id: "discord_DM_userID",
        category: "Direct Message",
        type: "text",
        desc: "DM: UserID",
        default: ""
    },
    "3":{
        id: "discord_DM_channelID",
        category: "Direct Message",
        type: "text",
        desc: "DM: ChannelID",
        default: ""
    },
    "4":{
        id: "discord_DM_content",
        category: "Direct Message",
        type: "text",
        desc: "DM: Content",
        default: ""
    },
    "5":{
        id: "discord_newDM_eventState",
        category: "Direct Message",
        type: "text",
        desc: "Discord New DM Event",
        default: "False"
    },
    "6":{
        id: "discord_DM_timestamp",
        category: "Direct Message",
        type: "text",
        desc: "DM: Timestamp",
        default: ""
    },
   "7": {
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

})

// ----------------------------------------------------
// Adding states for Discord Settings Category
// ----------------------------------------------------
Object.assign(states, {
   "8": {
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
   "9":{
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
    "10":{
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
    "11":{
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
    "12":{
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
   "13": {
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
    "24":{
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
    "25":{
        id: "discord_voice_channel_server_id",
        category: "VoiceChannel Info",
        type: "text",
        desc: "Discord Voice Channel Server ID",
        default: ""
    },
   "26": {
        id: "discord_voice_channel_server_name",
        category: "VoiceChannel Info",
        type: "text",
        desc: "Discord Voice Channel Server Name",
        default: ""
    },
    "27":{
        id: "discord_voice_channel_id",
        category: "VoiceChannel Info",
        type: "text",
        desc: "Discord Voice Channel ID",
        default: ""
    },
    "28":{
        id: "discord_voice_channel_name",
        category: "VoiceChannel Info",
        type: "text",
        desc: "Discord Voice Channel Name",
        default: ""
    },
    "29":{
        id: "discord_voice_average_ping",
        category: "VoiceChannel Info",
        type: "text",
        desc: "Discord Voice Average Ping",
        default: "0.00"
    },
    "30":{
        id: "discord_voice_hostname",
        category: "VoiceChannel Info",
        type: "text",
        desc: "Discord Voice Hostname",
        default: ""
    },
    "31":{
        id: "discord_voice_channel_participants",
        category: "VoiceChannel Info",
        type: "text",
        desc: "Discord Voice Channel Participants",
        default: "<None>"
    },
    "32":{
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
    "14":{
        id: "discord_inputDevice",
        category: "Discord",
        type: "text",
        desc: "Discord Current Input Device",
        default: ""
    },
    "15":{
        id: "discord_outputDevice",
        category: "Discord",
        type: "text",
        desc: "Discord Current Input Device",
        default: ""
    },
    "16":{
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
    "17":{
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
    "18":{
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
    "19":{
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
    "20":{
        id: "discord_speaker_volume",
        category: "Discord",
        type: "text",
        desc: "Discord Speaker Volume",
        default: "0.00"
    },
    "21":{
        id: "discord_voice_volume",
        category: "Discord",
        type: "text",
        desc: "Discord Voice Volume",
        default: "0.00"
    },
    "22":{
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
    "23":{
        id: "discord_connected",
        category: "Discord",
        type: "choice",
        desc: "Discord Connected",
        default: "",
        valueChoices:[
            "Connected",
            "Disconnected"
        ]
    }
})


// Adding Actions for Main Category
Object.assign(actions, {
   "1": {
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
    "2":{
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
    "3":{
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
   "4": {
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
    "5":{
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


    "6":{
        id: "discord_automatic_gain_control_action",
        category: "Discord",
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
    "7":{
        id: "discord_echo_cancellation_action",
        category: "Discord",
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
    "8":{
        id: "discord_noise_suppression_action",
        category: "Discord",
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
    "9":{
        id: "discord_qos_high_packet_priority_action",
        category: "Discord",
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
    "10":{
        id: "discord_silence_warning_action",
        category: "Discord",
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
   "11": {
       id: "discord_hangup_voice",
       category: "Discord",
       prefix: "Discord:",
       name:"Discord Hang Up",
       type:"communicate",
       tryInline:"true",
       format:"Discord: Hang Up Voice Channel"
    },
    "12":{
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
    "13":{
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
    "14":{
       id: "discord_voice_mode_change",
       category: "Discord",
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
    "15":{
       id: "discord_reset_push_to_talk_key",
       category: "Discord",
       prefix: "Discord:",
       name:"Discord Store Reset Push To Talk Keys",
       type:"communicate",
       tryInline:"true",
       format:"Discord: Reset Push To Talk Keys"
    },
    "16":{
       id: "discord_push_to_talk_key",
       category: "Discord",
       prefix: "Discord:",
       name:"Discord Push To Talk Key",
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
    "17":{
       id: "discord_set_push_to_talk_key",
       category: "Discord",
       prefix: "Discord:",
       name:"Discord Store Push To Talk Keys",
       type:"communicate",
       tryInline:"true",
       format:"Discord: Store Push To Talk Keys"
    },
    "18":{
       id: "discord_dm_voice_select",
       category: "Discord",
       prefix: "Discord:",
       name:"Discord DM Voice Channel",
       type:"communicate",
       tryInline:"true",
       format:"Discord: Go to Voice Channel with id: {$discordDMVoiceChannelId$}",
       data:[
            {
               id:"discordDMVoiceChannelId",
               type:"text",
               label:"Discord DM Voice Channel Id",
               default:""
           }
       ]
    },
    "19":{
       id: "discord_dm_text_select",
       category: "Discord",
       prefix: "Discord:",
       name:"Discord DM Text Channel",
       type:"communicate",
       tryInline:"true",
       format:"Discord: Go to Text Channel with id: {$discordDMTextChannelId$}",
       data:[
            {
               id:"discordDMTextChannelId",
               type:"text",
               label:"Discord DM Text Channel Id",
               default:""
           }
       ]
    },
    "20":{
        id: "discord_toggle_camera",
        category: "Discord",
        prefix: "Discord:",
        name: "Discord: Toggle Camera",
        type: "communicate",
        tryInline: "true",
        format: "Discord: Toggle Camera On/Off"
    },
    "21":{
        id: "discord_toggle_screenshare",
        category: "Discord",
        prefix: "Discord:",
        name: "Discord: Toggle Screen Share",
        type: "communicate",
        tryInline: "true",
        format: "Discord: Toggle Screen Share On/Off"
    },
    "22":{
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
    "23":{
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
    category: "Direct Message",
    name: "Discord: New Direct Message (DM)",
    format: "When receiving a new Direct Message $val",
    type: "communicate",
    valueChoices: [
      "True"
        ],
    valueType: "choice",
    valueStateId: "discord_newDM_eventState"
  },
  "2": {
    id: "discord_newMention",
    category: "Direct Message",
    name: "Discord | New Mention",
    format: "When receiving a new Mention $val",
    type: "communicate",
    valueChoices: [
      "True"
    ],
    valueType: "choice",
    valueStateId: "discord_newMention_eventState"
    }
})






// #!/usr/bin/env node

// const fs = require('fs');
// const path = require('path');

// // Function to read the JavaScript file
// const readJSFile = (filePath) => {
//     try {
//         return fs.readFileSync(filePath, 'utf8');
//     } catch (err) {
//         console.error(`Error reading file from disk: ${err}`);
//         process.exit(1);
//     }
// };

// // Initialize the categories array
// const initializeCategories = () => {
//     let categoriesArray = [];
//     for (let key in TP_PLUGIN_CATEGORIES) {
//         let category = TP_PLUGIN_CATEGORIES[key];
//         category.connectors = [];
//         category.actions = [];
//         category.events = [];
//         category.states = [];
//         categoriesArray.push(category);
//     }
//     return categoriesArray;
// };

// // Process each item type and update the categories array
// const processItems = (categoriesArray) => {
//     const items = [
//         { type: 'actions', data: actions },
//         { type: 'states', data: states },
//         { type: 'events', data: events },
//         { type: 'connectors', data: connectors }
//     ];

//     for (let itemType of items) {
//         for (let itemIndex in itemType.data) {
//             let item = itemType.data[itemIndex];
//             let category = categoriesArray.find(cat => cat.name === item.category);

//             if (category) {
//                 delete item.category;

//                 if (itemType.type === 'actions') {
//                     category.actions.push(item);
//                 } else if (itemType.type === 'states') {
//                     category.states.push(item);
//                 } else if (itemType.type === 'events') {
//                     category.events.push(item);
//                 } else if (itemType.type === 'connectors') {
//                     category.connectors.push(item);
//                 }
//             } else {
//                 console.warn(`Warning: Category "${item.category}" not found for ${itemType.type.slice(0, -1)} with ID "${item.id}" and index "${itemIndex}".`);
//             }
//         }
//     }
// };

// // Combine all the information into a single JSON object
// const combineInfo = (categoriesArray) => {
//     return {
//         "sdk": TP_PLUGIN_INFO.sdk,
//         "version": TP_PLUGIN_INFO.version,
//         "TPDiscord_Version": TP_PLUGIN_INFO.TPDiscord_Version,
//         name: TP_PLUGIN_INFO.name,
//         id: TP_PLUGIN_INFO.id,
//         "plugin_start_cmd_windows": TP_PLUGIN_INFO.plugin_start_cmd_windows,
//         "plugin_start_cmd_mac": TP_PLUGIN_INFO.plugin_start_cmd_mac,
//         "plugin_start_cmd_linux": TP_PLUGIN_INFO.plugin_start_cmd_linux,
//         "configuration": TP_PLUGIN_INFO.configuration,
//         "settings": TP_PLUGIN_SETTINGS,
//         "categories": categoriesArray
//     };
// };

// // Write the JSON object to a file
// const writeToFile = (jsonString) => {
//     fs.writeFile('tppentry.tp', jsonString, (err) => {
//         if (err) {
//             console.error(err);
//             return;
//         }
//         console.log("File has been created");
//     });
// };

// // Main function
// const main = () => {
//     // Get the file name from command line arguments
//     const args = process.argv.slice(2);
//     if (args.length < 1) {
//         console.error('Please provide the file name to be parsed as a command-line argument.');
//         process.exit(1);
//     }

//     const fileName = args[0];
//     const filePath = path.resolve(fileName);

//     // Read the JavaScript file
//     const fileContent = readJSFile(filePath);

//     // Execute the JavaScript content
//     eval(fileContent);

//     // Initialize categories
//     const categoriesArray = initializeCategories();

//     // Process items
//     processItems(categoriesArray);

//     // Combine information
//     const combinedJSON = combineInfo(categoriesArray);

//     // Convert the combined object to a JSON string
//     const jsonString = JSON.stringify(combinedJSON, null, 4);

//     // Output JSON string to console
//     console.log(jsonString);

//     // Write to tppentry.tp file
//     writeToFile(jsonString);
// };

// // Execute the main function
// main();










// function main() {


//     // Creating the Entry.tp...

//     // Initialize the categories array
//     let categoriesArray = [];

//     // Convert TP_PLUGIN_CATEGORIES to an array format and add empty connectors, actions, events, and states
//     for (let key in TP_PLUGIN_CATEGORIES) {
//         let category = TP_PLUGIN_CATEGORIES[key];
//         category.connectors = [];
//         category.actions = [];
//         category.events = [];
//         category.states = [];
//         categoriesArray.push(category);
//     }

//     // Define an array of item types to process
//     const items = [
//         { type: 'actions', data: actions },
//         { type: 'states', data: states },
//         { type: 'events', data: events },
//         { type: 'connectors', data: connectors }
//     ];

//     // Process each item type
//     for (let itemType of items) {
//         for (let itemIndex in itemType.data) {
//             let item = itemType.data[itemIndex];
//             let category = categoriesArray.find(cat => cat.name === item.category);

//             if (category) {
//                 // Remove the 'category' key from the item
//                 delete item.category;

//                 // Add the item to the corresponding category array
//                 if (itemType.type === 'actions') {
//                     category.actions.push(item);
//                 } else if (itemType.type === 'states') {
//                     category.states.push(item);
//                 } else if (itemType.type === 'events') {
//                     category.events.push(item);
//                 } else if (itemType.type === 'connectors') {
//                     category.connectors.push(item);
//                 }
//             } else {
//                 console.warn(`Warning: Category "${item.category}" not found for ${itemType.type.slice(0, -1)} with ID "${item.id}" and index "${itemIndex}".`);
//             }
//         }
//     }

//     // Combine all the information into a single JSON object
//     let combinedJSON = {
//         "sdk": TP_PLUGIN_INFO.sdk,
//         "version": TP_PLUGIN_INFO.version,
//         "TPDiscord_Version": TP_PLUGIN_INFO.TPDiscord_Version,
//         name: TP_PLUGIN_INFO.name,
//         id: TP_PLUGIN_INFO.id,
//         "plugin_start_cmd_windows": TP_PLUGIN_INFO.plugin_start_cmd_windows,
//         "plugin_start_cmd_mac": TP_PLUGIN_INFO.plugin_start_cmd_mac,
//         "plugin_start_cmd_linux": TP_PLUGIN_INFO.plugin_start_cmd_linux,
//         "configuration": TP_PLUGIN_INFO.configuration,
//         "settings": TP_PLUGIN_SETTINGS,
//         "categories": categoriesArray
//     };

//     // Convert the combined object to a JSON string
//     let jsonString = JSON.stringify(combinedJSON, null, 4);

//     console.log(jsonString);



//     // write to tppentry.tp
//     const fs = require('fs');
//     fs.writeFile('tppentry.tp', jsonString, (err) => {
//         if (err) {
//             console.error(err);
//             return;
//         }
//         console.log("File has been created");
//     });
// }


// main();




























// // Creating the Entry.tp...

// // Initialize the categories array
// let categoriesArray = [];

// // Convert TP_PLUGIN_CATEGORIES to an array format and add empty connectors, actions, events, and states
// for (let key in TP_PLUGIN_CATEGORIES) {
//     let category = TP_PLUGIN_CATEGORIES[key];
//     category.connectors = [];
//     category.actions = [];
//     category.events = [];
//     category.states = [];
//     categoriesArray.push(category);
// }


// // Add actions to the corresponding categories
// for (let actionIndex in actions) {
//     let action = actions[actionIndex];
//     let category = categoriesArray.find(cat => cat.name === action.category);
    
//     if (category) {
//         // removing the 'category' key from the connector object as not needed for entry.tp
//         delete action.category;
//         category.actions.push(action);
//     } else {
//         console.warn(`Warning: Category "${action.category}" not found for action with ID "${action.id}" and index "${actionIndex}".`);
//     }
// }


// // Add states to the corresponding categories
// for (let stateIndex in states) {
//     let state = states[stateIndex];
//     let category = categoriesArray.find(cat => cat.name === state.category);
//     if (category) {
//         delete state.category;

//         category.states.push(state);
//     } else {
//         console.warn(`Warning: Category "${state.category}" not found for state with ID "${state.id} with key ${stateIndex}".`);
//     }
// }

// // add events to the corresponding categories
// for (let eventKey in events) {
//     let event = events[eventKey];
//     let category = categoriesArray.find(cat => cat.name === event.category);

//     if (category) {
//         delete event.category;
//         category.events.push(event);
//     } else {
//         console.warn(`Warning: Category "${event.category}" not found for event with ID "${event.id} with key ${stateIndex}".`);
//     }
// }

// // add connectors to the corresponding categories
// for (let connectorKey in connectors) {
//     let connector = connectors[connectorKey];
//     let category = categoriesArray.find(cat => cat.name === connector.category);

//     if (category) {
//         delete connector.category;
//         category.connectors.push(connector);
//     } else {
//         console.warn(`Warning: Category "${connector.category}" not found for connector with ID "${connector.id} with key ${stateIndex}".`);
//     }
// }



// // Combine all the information into a single JSON object
// let combinedJSON = {
//     "sdk": TP_PLUGIN_INFO.sdk,
//     "version": TP_PLUGIN_INFO.version,
//     "TPDiscord_Version": TP_PLUGIN_INFO.TPDiscord_Version,
//     name: TP_PLUGIN_INFO.name,
//     id: TP_PLUGIN_INFO.id,
//     "plugin_start_cmd_windows": TP_PLUGIN_INFO.plugin_start_cmd_windows,
//     "plugin_start_cmd_mac": TP_PLUGIN_INFO.plugin_start_cmd_mac,
//     "plugin_start_cmd_linux": TP_PLUGIN_INFO.plugin_start_cmd_linux,
//     "configuration": TP_PLUGIN_INFO.configuration,
//     "settings": TP_PLUGIN_SETTINGS,
//     "categories": categoriesArray
// };

// // Convert the combined object to a JSON string
// let jsonString = JSON.stringify(combinedJSON, null, 4);

// console.log(jsonString);