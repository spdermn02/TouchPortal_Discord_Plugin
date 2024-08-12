const {convertVolumeToPercentage, imageToBase64, logIt, createStates} = require("../../utils/helpers.js");

class UserStateHandler {
  constructor(TPClient, DG) {
    // This is a 128px base64 image of a blank avatar
    this.TPClient = TPClient;
    this.DG = DG;
    this.base64Avatar = "iVBORw0KGgoAAAANSUhEUgAAAIAAAACAAgMAAAC+UIlYAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAlQTFRFAAAAAAAAAAAAg2PpwAAAAAN0Uk5TAAIBv0eWygAAADdJREFUeJztziEBACAMAEHWgerrgacSIWjAFAbu9YmPVhQAAAAAAAAAAAAA8DDo6wxyjusPH4ANKzEDgZ7ZsS4AAAAASUVORK5CYII=";
  }

  updateParticipantCount = async () => {
    this.DG.voiceChannelInfo.voice_channel_participants = Object.keys(DG.currentVoiceUsers).length > 0 ? Object.values(DG.currentVoiceUsers).map(user => user.user.username).join("|") : "<None>";
    this.DG.voiceChannelInfo.voice_channel_participant_ids = Object.keys(this.DG.currentVoiceUsers).length > 0 ? Object.values(this.DG.currentVoiceUsers).map(user => user.user.id).join("|") : "<None>";
  };

  clearUserStates = async () => {
    Object.keys(this.TPClient.customStates)
      .filter((key) => key.includes("user_"))
      .forEach((key) => {
        this.TPClient.stateUpdate(key, key.includes("_Speaking") ? "Off" : "");
        // this should write every keys with .avatar to the base64Avatar but its not?
        if (key.includes("_avatar")) {
          this.TPClient.stateUpdate(key, this.base64Avatar);
        }
      });
  };

  addUserData = async (data) => {
    if (!this.DG.currentVoiceUsers.hasOwnProperty(data.user.id)) {
      // Add the user to the currentVoiceUsers object
      logIt("DEBUG", `User ${data.nick} has joined the voice channel`);
      this.DG.currentVoiceUsers[data.user.id] = data;
      this.updateParticipantCount();
    }
  };

  generateUserUpdates(userIndex, user, idPrefix = "user") {
    return [
      { id: `${idPrefix}_${userIndex}_deaf`, value: user.voice_state.deaf ? "On" : "Off" },
      { id: `${idPrefix}_${userIndex}_self_deaf`, value: user.voice_state.self_deaf ? "On" : "Off" },
      { id: `${idPrefix}_${userIndex}_self_mute`, value: user.voice_state.self_mute ? "On" : "Off" },
      { id: `${idPrefix}_${userIndex}_mute`, value: user.mute ? "On" : "Off" },
      { id: `${idPrefix}_${userIndex}_server_mute`, value: user.voice_state.mute ? "On" : "Off" },
      { id: `${idPrefix}_${userIndex}_id`, value: user.user.id },
      { id: `${idPrefix}_${userIndex}_nick`, value: user.nick },
      { id: `${idPrefix}_${userIndex}_volume`, value: Math.round(user.volume) },
      { id: `${idPrefix}_${userIndex}_avatar`, value: user.base64Avatar },
      { id: `${idPrefix}_${userIndex}_avatarID`, value: user.user.avatar }
    ];
}


  updateUserStates = async (data) => {
    try {
      // if user is not added, we add it..
      await this.addUserData(data);

      // Getting user index from the currentVoiceUsers object
      const userIndex = Object.keys(this.DG.currentVoiceUsers).indexOf(data.user.id);
      const user = this.DG.currentVoiceUsers[data.user.id];

      // Now check if there are 11 or more users in the channel, if so, we need to create more user states
      if (Object.keys(this.DG.currentVoiceUsers).length >= 11) {
        createStates(`user_${userIndex}`, this.DG.DEFAULT_USER_STATES, `VC | User_${userIndex}`, this.TPClient);
      }

      // If user doesn't have a base64Avatar from previous update, we fetch it and add it to the user object
      if (user.base64Avatar == undefined) {
        const avatarUrl = `https://cdn.discordapp.com/avatars/${user.user.id}/${user.user.avatar}.webp?size=128`;
        this.DG.currentVoiceUsers[data.user.id].base64Avatar = await imageToBase64(avatarUrl);
      }

      // Updating general user states
      let updates = this.generateUserUpdates(userIndex, user);
      this.TPClient.stateUpdateMany(updates);

      let volume = convertVolumeToPercentage(this.DG.currentVoiceUsers[data.user.id].volume) / 2;
      this.TPClient.connectorUpdate(`discord_voice_volume_action_connector|voiceUserList_connector=${userIndex}`, volume );

      // This is for CustomVoiceActivityusers which will be defined by the end user to track specific users
      if (this.DG.customVoiceAcivityUsers.hasOwnProperty(data.user.id)) {
          let customUserIndex = this.DG.customVoiceAcivityUsers[data.user.id];
          let customUpdates = this.generateUserUpdates(customUserIndex, user, "customUser");
          this.TPClient.stateUpdateMany(customUpdates);
      }
    } catch (error) {
      logIt("ERROR", `updateUserStates: ${error}`);
    }
  }

  deleteUserStates = async (data) => {
    if (this.DG.Client.user.id === data.user.id) {
      logIt("DEBUG", "Client User has left the voice channel");
      await this.clearUserStates();
    } else {
      logIt("DEBUG", `${data.nick} (${data.user.id}) has left the voice channel`);
      // remove user from currentVoiceUsers
      delete this.DG.currentVoiceUsers[data.user.id];
      // Now lets repopulate the list
      this.repopulateUserStates();
    }

    this.updateParticipantCount();
  };

  repopulateUserStates = async (idPrefix = "user") => {
    await this.clearUserStates();
    // Loop over all users in this.DG.currentVoiceUsers
    for (let userId in this.DG.currentVoiceUsers) {
      const user = this.DG.currentVoiceUsers[userId];
      const userIndex = Object.keys(this.DG.currentVoiceUsers).indexOf(userId);
      let updates = [
        { id: `${idPrefix}_${userIndex}_deaf`, value: user.voice_state.deaf ? "On" : "Off" },
        { id: `${idPrefix}_${userIndex}_self_deaf`, value: user.voice_state.self_deaf ? "On" : "Off" },
        { id: `${idPrefix}_${userIndex}_self_mute`, value: user.voice_state.self_mute ? "On" : "Off" },
        { id: `${idPrefix}_${userIndex}_mute`, value: user.voice_state.mute ? "On" : "Off" },
        { id: `${idPrefix}_${userIndex}_id`, value: user.user.id },
        { id: `${idPrefix}_${userIndex}_nick`, value: user.nick },
        { id: `${idPrefix}_${userIndex}_volume`, value: Math.round(user.volume) },
        { id: `${idPrefix}_${userIndex}_avatar`, value: user.user.base64Avatar },
        { id: `${idPrefix}_${userIndex}_avatarID`, value: user.user.avatar }
      ]; 
      this.TPClient.stateUpdateMany(updates);
    }
  };
}


module.exports = {UserStateHandler};
