const {convertVolumeToPercentage, imageToBase64, logIt} = require("../../utils/helpers.js");

class UserStateHandler {
  constructor(TPClient, DG) {
    // This is a 128px base64 image of a blank avatar
    this.TPClient = TPClient;
    this.DG = DG;
    this.base64Avatar =
      "iVBORw0KGgoAAAANSUhEUgAAAIAAAACAAgMAAAC+UIlYAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAlQTFRFAAAAAAAAAAAAg2PpwAAAAAN0Uk5TAAIBv0eWygAAADdJREFUeJztziEBACAMAEHWgerrgacSIWjAFAbu9YmPVhQAAAAAAAAAAAAA8DDo6wxyjusPH4ANKzEDgZ7ZsS4AAAAASUVORK5CYII=";
  }

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
      console.log(`User ${data.nick} has joined the voice channel`);
      this.DG.currentVoiceUsers[data.user.id] = data;
    }
  };

  updateUserStates = async (data) => {
    // we are updating user states and info directly from this.DG.currentVoiceUsers as we keep it updated inside of voiceState function which calls this function
    try {
      // if user is not added, we add it..
      await this.addUserData(data);

      this.DG.currentVoiceUsers[data.user.id] = data;

      const userIndex = Object.keys(this.DG.currentVoiceUsers).indexOf(data.user.id);
      const user = this.DG.currentVoiceUsers[data.user.id];

      if (user.base64Avatar == undefined) {
        const avatarUrl = `https://cdn.discordapp.com/avatars/${user.user.id}/${user.user.avatar}.webp?size=128`;
        this.DG.currentVoiceUsers[data.user.id].base64Avatar = await imageToBase64(avatarUrl);
      }

      let updates = [];

      // console.log(Object.keys(this.DG.currentVoiceUsers).length, " Current Voice Users")

      updates.push({
        id: `user_${userIndex}_deaf`,
        value: user.voice_state.deaf ? "On" : "Off",
      });
      updates.push({
        id: `user_${userIndex}_self_deaf`,
        value: user.voice_state.self_deaf ? "On" : "Off",
      });
      updates.push({
        id: `user_${userIndex}_self_mute`,
        value: user.voice_state.self_mute ? "On" : "Off",
      });
      updates.push({
        id: `user_${userIndex}_mute`,
        value: user.mute ? "On" : "Off",
      });
      updates.push({
        id: `user_${userIndex}_server_mute`,
        value: user.voice_state.mute ? "On" : "Off",
      });
      updates.push({
        id: `user_${userIndex}_mute`,
        value: user.mute ? "On" : "Off",
      });
      updates.push({id: `user_${userIndex}_id`, value: user.user.id});
      updates.push({id: `user_${userIndex}_nick`, value: user.nick});
      updates.push({
        id: `user_${userIndex}_volume`,
        value: Math.round(user.volume),
      });
      updates.push({id: `user_${userIndex}_avatar`, value: user.base64Avatar});
      updates.push({id: `user_${userIndex}_avatarID`, value: user.user.avatar});

      this.TPClient.stateUpdateMany(updates);

      // Divide by 2 to convert range from 0-200 to 0-100
      let volume = convertVolumeToPercentage(this.DG.currentVoiceUsers[data.user.id].volume) / 2;
      this.TPClient.connectorUpdate(
        `discord_voice_volume_action_connector|voiceUserList_connector=${userIndex}`,
        volume
      );

      // This is for CustomVoiceActivityusers which will be defined by the end user to track specific users
      if (this.DG.customVoiceAcivityUsers.hasOwnProperty(data.user.id)) {
        let userIndex = this.DG.customVoiceAcivityUsers[data.user.id];
        let updates = [
          {
            id: `${userIndex}_id`,
            value: this.DG.currentVoiceUsers[data.user.id].user.id,
          },
          {
            id: `${userIndex}_nick`,
            value: this.DG.currentVoiceUsers[data.user.id].nick,
          },
          {
            id: `${userIndex}_avatar`,
            value: this.DG.currentVoiceUsers[data.user.id].user.base64Avatar,
          },
          {
            id: `${userIndex}_avatarID`,
            value: this.DG.currentVoiceUsers[data.user.id].user.avatar,
          },
          {
            id: `${userIndex}_mute`,
            value: this.DG.currentVoiceUsers[data.user.id].mute ? "On" : "Off",
          },
          {
            id: `${userIndex}_deaf`,
            value: this.DG.currentVoiceUsers[data.user.id].voice_state.deaf ? "On" : "Off",
          },
          {
            id: `${userIndex}_self_deaf`,
            value: this.DG.currentVoiceUsers[data.user.id].voice_state.self_deaf ? "On" : "Off",
          },
          {
            id: `${userIndex}_self_mute`,
            value: this.DG.currentVoiceUsers[data.user.id].voice_state.self_mute ? "On" : "Off",
          },
          {
            id: `${userIndex}_server_mute`,
            value: this.DG.currentVoiceUsers[data.user.id].voice_state.mute ? "On" : "Off",
          },
          {
            id: `${userIndex}_volume`,
            value: Math.round(this.DG.currentVoiceUsers[data.user.id].volume),
          },
        ];
        this.TPClient.stateUpdateMany(updates);
      }
    } catch (error) {
      logIt("ERROR", `updateUserStates: ${error}`);
    }
  };

  deleteUserStates = async (data) => {
    if (this.DG.Client.user.id === data.user.id) {
      logIt("INFO", "Client User has left the voice channel");
      await this.clearUserStates();
    } else {
      logIt("INFO", `${data.nick} (${data.user.id}) has left the voice channel`);
      // remove user from currentVoiceUsers
      delete this.DG.currentVoiceUsers[data.user.id];
      // Now lets repopulate the list
      this.repopulateUserStates();
    }
  };

  repopulateUserStates = async () => {
    await this.clearUserStates();
    // Loop over all users in this.DG.currentVoiceUsers
    for (let userId in this.DG.currentVoiceUsers) {
      const user = this.DG.currentVoiceUsers[userId];
      const userIndex = Object.keys(this.DG.currentVoiceUsers).indexOf(userId);

      let updates = [];
      updates.push({
        id: `user_${userIndex}_deaf`,
        value: user.voice_state.deaf ? "On" : "Off",
      });
      updates.push({
        id: `user_${userIndex}_self_deaf`,
        value: user.voice_state.self_deaf ? "On" : "Off",
      });
      updates.push({
        id: `user_${userIndex}_self_mute`,
        value: user.voice_state.self_mute ? "On" : "Off",
      });
      updates.push({
        id: `user_${userIndex}_mute`,
        value: user.voice_state.mute ? "On" : "Off",
      });
      updates.push({id: `user_${userIndex}_id`, value: user.user.id});
      updates.push({id: `user_${userIndex}_nick`, value: user.nick});
      updates.push({
        id: `user_${userIndex}_volume`,
        value: Math.round(user.volume),
      });
      updates.push({
        id: `user_${userIndex}_avatar`,
        value: user.user.base64Avatar,
      });
      updates.push({id: `user_${userIndex}_avatarID`, value: user.user.avatar});

      this.TPClient.stateUpdateMany(updates);
    }
  };
}


module.exports = {UserStateHandler};
// This need done somewhere else and passed where needded
// const userStateHandler = new UserStateHandler();

// module.exports = userStateHandler;
