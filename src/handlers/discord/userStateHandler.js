const {convertVolumeToPercentage, imageToBase64, logIt, createStates, diff} = require("../../utils/helpers.js");

class UserStateHandler {
  constructor(TPClient, DG) {
    // This is a 128px base64 image of a blank avatar
    this.TPClient = TPClient;
    this.DG = DG;
    this.base64Avatar = "iVBORw0KGgoAAAANSUhEUgAAAIAAAACAAgMAAAC+UIlYAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAlQTFRFAAAAAAAAAAAAg2PpwAAAAAN0Uk5TAAIBv0eWygAAADdJREFUeJztziEBACAMAEHWgerrgacSIWjAFAbu9YmPVhQAAAAAAAAAAAAA8DDo6wxyjusPH4ANKzEDgZ7ZsS4AAAAASUVORK5CYII=";
    this.oldUserData = {};
  }

  updateParticipantCount = async () => {
    this.DG.voiceChannelInfo.voice_channel_participants = Object.keys(this.DG.currentVoiceUsers).length > 0 ? Object.values(this.DG.currentVoiceUsers).map(user => user.user.username).join("|") : "<None>";
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
    let userId = data.user.id;

    // Initialize user if it doesn't exist
    if (!this.DG.currentVoiceUsers.hasOwnProperty(userId)) {
      logIt("DEBUG", `User ${data.nick} has joined the voice channel`);
      this.updateParticipantCount();
      this.DG.currentVoiceUsers[userId] = {};
    }
  
    const user = this.DG.currentVoiceUsers[userId];
    if (user.base64Avatar === undefined) {
      const avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${data.user.avatar}.webp?size=128`;
      user.base64Avatar = await imageToBase64(avatarUrl);
    }
  
    this.DG.currentVoiceUsers[userId] = {
      ...data,
      base64Avatar: user.base64Avatar
    };
  };

  generateUserUpdates(userIndex, user, idPrefix = "user") {
    // Only push updates for the states that have changed
    const updates = [];

    if (user.voice_state && user.voice_state.deaf !== undefined) {
      updates.push({ id: `${idPrefix}_${userIndex}_deaf`, value: user.voice_state.deaf ? "On" : "Off" });
    }
    if (user.voice_state && user.voice_state.self_deaf !== undefined) {
      updates.push({ id: `${idPrefix}_${userIndex}_self_deaf`, value: user.voice_state.self_deaf ? "On" : "Off" });
    }
    if (user.voice_state && user.voice_state.self_mute !== undefined) {
      updates.push({ id: `${idPrefix}_${userIndex}_self_mute`, value: user.voice_state.self_mute ? "On" : "Off" });
    }
    if (user.mute !== undefined) {
      updates.push({ id: `${idPrefix}_${userIndex}_mute`, value: user.mute ? "On" : "Off" });
    }
    if (user.voice_state && user.voice_state.mute !== undefined) {
      updates.push({ id: `${idPrefix}_${userIndex}_server_mute`, value: user.voice_state.mute ? "On" : "Off" });
    }
    if (user.user && user.user.id !== undefined) {
      updates.push({ id: `${idPrefix}_${userIndex}_id`, value: user.user.id });
    }
    if (user.nick !== undefined) {
      updates.push({ id: `${idPrefix}_${userIndex}_nick`, value: user.nick });
    }
    if (user.base64Avatar !== undefined) {
      updates.push({ id: `${idPrefix}_${userIndex}_avatar`, value: user.base64Avatar });
    }
    if (user.user && user.user.avatar !== undefined) {
      updates.push({ id: `${idPrefix}_${userIndex}_avatarID`, value: user.user.avatar });
    }
    return updates;
}

  updateUserStates = async (data) => {
    try {
      // if user is not added, we add it..
      await this.addUserData(data);

      const userId = data.user.id;
      const userIndex = Object.keys(this.DG.currentVoiceUsers).indexOf(userId);
      const user = this.DG.currentVoiceUsers[userId];
      const previousUserData = this.oldUserData[userId] || {};

      // Get the difference between the previous user data and the current user data
      const userDiff = diff(previousUserData, user);

      // Now check if there are 11 or more users in the channel, if so, we need to create more user states
      if (Object.keys(this.DG.currentVoiceUsers).length >= 11) {
        createStates(`user_${userIndex}`, this.DG.DEFAULT_USER_STATES, `VC | User_${userIndex}`, this.TPClient);
      }

      // Updating general user states
      let updates = this.generateUserUpdates(userIndex, userDiff);

      // Only updating user volume connector/state if volume has changed
      if (userDiff.hasOwnProperty("volume")) {
        let newVolume = convertVolumeToPercentage(user.volume) / 2;
        this.TPClient.connectorUpdate(`discord_voice_volume_action_connector|voiceUserList_connector=${userIndex}`, newVolume);
        updates.push({ id: `user_${userIndex}_volume`, value: Math.round(newVolume) })
      }

      // Updating states for general user
      if (updates.length > 0) {
        this.TPClient.stateUpdateMany(updates);
      }

      // Update custom voice activity users if applicable
      if (this.DG.customVoiceAcivityUsers.hasOwnProperty(userId)) {
        let customUserIndex = this.DG.customVoiceAcivityUsers[userId];
        let customUpdates = this.generateUserUpdates(customUserIndex, user, "customUser");
        this.TPClient.stateUpdateMany(customUpdates);
      }
    } catch (error) {
      logIt("ERROR", `updateUserStates: ${error}`);
    }

    // Keeping track of previous user data
    this.oldUserData[data.user.id] = this.DG.currentVoiceUsers[data.user.id]
  };

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
