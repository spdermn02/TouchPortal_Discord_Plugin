const RPC = require("../../../discord-rpc/src/index.js");
const {DG} = require("../../discord_config.js");
const TPClient = require("../../core/TPClient.js");
const {convertVolumeToPercentage, imageToBase64, logIt} = require("../../utils/helpers.js");

class UserStateHandler {
  constructor() {
    // This is a 128px base64 image of a blank avatar
    this.base64Avatar =
      "iVBORw0KGgoAAAANSUhEUgAAAIAAAACAAgMAAAC+UIlYAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAlQTFRFAAAAAAAAAAAAg2PpwAAAAAN0Uk5TAAIBv0eWygAAADdJREFUeJztziEBACAMAEHWgerrgacSIWjAFAbu9YmPVhQAAAAAAAAAAAAA8DDo6wxyjusPH4ANKzEDgZ7ZsS4AAAAASUVORK5CYII=";
  }

  clearUserStates = async () => {
    Object.keys(TPClient.customStates)
      .filter((key) => key.includes("user_"))
      .forEach((key) => {
        TPClient.stateUpdate(key, key.includes("_Speaking") ? "Off" : "");
        // this should write every keys with .avatar to the base64Avatar but its not?
        if (key.includes("_avatar")) {
          TPClient.stateUpdate(key, this.base64Avatar);
        }
      });
  };

  addUserData = async (data) => {
    if (!DG.currentVoiceUsers.hasOwnProperty(data.user.id)) {
      // Add the user to the currentVoiceUsers object
      console.log(`User ${data.nick} has joined the voice channel`);
      DG.currentVoiceUsers[data.user.id] = data;
    }
  };

  updateUserStates = async (data) => {
    // we are updating user states and info directly from DG.currentVoiceUsers as we keep it updated inside of voiceState function which calls this function
    try {
      // if user is not added, we add it..
      await this.addUserData(data);

      DG.currentVoiceUsers[data.user.id] = data;

      const userIndex = Object.keys(DG.currentVoiceUsers).indexOf(data.user.id);
      const user = DG.currentVoiceUsers[data.user.id];

      if (user.base64Avatar == undefined) {
        const avatarUrl = `https://cdn.discordapp.com/avatars/${user.user.id}/${user.user.avatar}.webp?size=128`;
        DG.currentVoiceUsers[data.user.id].base64Avatar = await imageToBase64(avatarUrl);
      }

      let updates = [];

      // console.log(Object.keys(DG.currentVoiceUsers).length, " Current Voice Users")

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

      TPClient.stateUpdateMany(updates);

      // Divide by 2 to convert range from 0-200 to 0-100
      let volume = convertVolumeToPercentage(DG.currentVoiceUsers[data.user.id].volume) / 2;
      TPClient.connectorUpdate(
        `discord_voice_volume_action_connector|voiceUserList_connector=${userIndex}`,
        volume
      );

      // This is for CustomVoiceActivityusers which will be defined by the end user to track specific users
      if (DG.customVoiceAcivityUsers.hasOwnProperty(data.user.id)) {
        let userIndex = DG.customVoiceAcivityUsers[data.user.id];
        let updates = [
          {
            id: `${userIndex}_id`,
            value: DG.currentVoiceUsers[data.user.id].user.id,
          },
          {
            id: `${userIndex}_nick`,
            value: DG.currentVoiceUsers[data.user.id].nick,
          },
          {
            id: `${userIndex}_avatar`,
            value: DG.currentVoiceUsers[data.user.id].user.base64Avatar,
          },
          {
            id: `${userIndex}_avatarID`,
            value: DG.currentVoiceUsers[data.user.id].user.avatar,
          },
          {
            id: `${userIndex}_mute`,
            value: DG.currentVoiceUsers[data.user.id].mute ? "On" : "Off",
          },
          {
            id: `${userIndex}_deaf`,
            value: DG.currentVoiceUsers[data.user.id].voice_state.deaf ? "On" : "Off",
          },
          {
            id: `${userIndex}_self_deaf`,
            value: DG.currentVoiceUsers[data.user.id].voice_state.self_deaf ? "On" : "Off",
          },
          {
            id: `${userIndex}_self_mute`,
            value: DG.currentVoiceUsers[data.user.id].voice_state.self_mute ? "On" : "Off",
          },
          {
            id: `${userIndex}_server_mute`,
            value: DG.currentVoiceUsers[data.user.id].voice_state.mute ? "On" : "Off",
          },
          {
            id: `${userIndex}_volume`,
            value: Math.round(DG.currentVoiceUsers[data.user.id].volume),
          },
        ];
        TPClient.stateUpdateMany(updates);
      }
    } catch (error) {
      logIt("ERROR", "updateUserStates: " + error, "ERROR");
    }
  };

  deleteUserStates = async (data) => {
    if (DG.Client.user.id === data.user.id) {
      logIt("INFO", "Client User has left the voice channel");
      await userStateHandler.clearUserStates();
    } else {
      logIt("INFO", `${data.nick} (${data.user.id}) has left the voice channel`);
      // remove user from currentVoiceUsers
      delete DG.currentVoiceUsers[data.user.id];
      // Now lets repopulate the list
      this.repopulateUserStates();
    }
  };

  repopulateUserStates = async () => {
    await this.clearUserStates();
    // Loop over all users in DG.currentVoiceUsers
    for (let userId in DG.currentVoiceUsers) {
      const user = DG.currentVoiceUsers[userId];
      const userIndex = Object.keys(DG.currentVoiceUsers).indexOf(userId);

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

      TPClient.stateUpdateMany(updates);
    }
  };
}

const userStateHandler = new UserStateHandler();

module.exports = userStateHandler;
