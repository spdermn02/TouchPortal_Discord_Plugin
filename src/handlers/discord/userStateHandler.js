const { convertVolumeToPercentage, imageToBase64, logIt, createStates, diff } = require("../../utils/helpers.js");
const DEFAULT_BASE64_AVATAR = require("../../utils/DEFAULT_BASE64_AVATAR.js");

class UserStateHandler {
  constructor(TPClient, DG) {
    // This is a 128px base64 image of a blank avatar
    this.TPClient = TPClient;
    this.DG = DG;
    this.base64Avatar =
      "iVBORw0KGgoAAAANSUhEUgAAAIAAAACAAgMAAAC+UIlYAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAlQTFRFAAAAAAAAAAAAg2PpwAAAAAN0Uk5TAAIBv0eWygAAADdJREFUeJztziEBACAMAEHWgerrgacSIWjAFAbu9YmPVhQAAAAAAAAAAAAA8DDo6wxyjusPH4ANKzEDgZ7ZsS4AAAAASUVORK5CYII=";
    this.oldUserData = {};
  }

  // Recompute and publish the participant list. Skips any entry without a user object, so a
  // malformed voice state can never take this down.
  updateParticipantCount = () => {
    const users = Object.values(this.DG.currentVoiceUsers || {}).filter((u) => u && u.user && u.user.id);
    this.DG.voiceChannelInfo.voice_channel_participants =
      users.length > 0 ? users.map((u) => u.user.username).join("|") : "<None>";
    this.DG.voiceChannelInfo.voice_channel_participant_ids =
      users.length > 0 ? users.map((u) => u.user.id).join("|") : "<None>";
    this.TPClient.stateUpdateMany([
      { id: "discord_voice_channel_participants", value: this.DG.voiceChannelInfo.voice_channel_participants },
      { id: "discord_voice_channel_participant_ids", value: this.DG.voiceChannelInfo.voice_channel_participant_ids },
    ]);
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
    if (!data || !data.user || !data.user.id) {
      return;
    }
    const userId = data.user.id;
    const existing = this.DG.currentVoiceUsers[userId];
    const isNew = existing === undefined;

    // Resolve the avatar BEFORE touching currentVoiceUsers. This used to insert an empty {}
    // placeholder and then await the CDN fetch; any other voice event landing during that
    // await walked the map, hit the placeholder's missing .user, and crashed the plugin.
    let base64Avatar = existing && existing.base64Avatar;
    if (base64Avatar === undefined) {
      if (data.user.avatar) {
        const avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${data.user.avatar}.webp?size=128`;
        base64Avatar = (await imageToBase64(avatarUrl)) || DEFAULT_BASE64_AVATAR;
      } else {
        base64Avatar = DEFAULT_BASE64_AVATAR;
      }
    }

    // A concurrent call for the same user may have finished first; keep its avatar.
    const latest = this.DG.currentVoiceUsers[userId];
    this.DG.currentVoiceUsers[userId] = {
      ...(latest || {}),
      ...data,
      base64Avatar: (latest && latest.base64Avatar) || base64Avatar,
    };

    if (isNew) {
      logIt("DEBUG", `User ${data.nick} has joined the voice channel`);
      this.updateParticipantCount();
    }
  };

  // statePrefix is the full state id prefix, e.g. "user_3" or "Custom0".
  generateUserUpdates(statePrefix, user) {
    // Only push updates for the states that have changed
    const updates = [];
    if (!user) {
      return updates;
    }
    const p = statePrefix;

    if (user.voice_state && user.voice_state.deaf !== undefined) {
      updates.push({ id: `${p}_deaf`, value: user.voice_state.deaf ? "On" : "Off" });
    }
    if (user.voice_state && user.voice_state.self_deaf !== undefined) {
      updates.push({ id: `${p}_self_deaf`, value: user.voice_state.self_deaf ? "On" : "Off" });
    }
    if (user.voice_state && user.voice_state.self_mute !== undefined) {
      updates.push({ id: `${p}_self_mute`, value: user.voice_state.self_mute ? "On" : "Off" });
    }
    if (user.mute !== undefined) {
      updates.push({ id: `${p}_mute`, value: user.mute ? "On" : "Off" });
    }
    if (user.voice_state && user.voice_state.mute !== undefined) {
      updates.push({ id: `${p}_server_mute`, value: user.voice_state.mute ? "On" : "Off" });
    }
    if (user.user && user.user.id !== undefined) {
      updates.push({ id: `${p}_id`, value: user.user.id });
    }
    if (user.nick !== undefined) {
      updates.push({ id: `${p}_nick`, value: user.nick });
    }
    if (user.base64Avatar !== undefined) {
      updates.push({ id: `${p}_avatar`, value: user.base64Avatar });
    }
    if (user.user && user.user.avatar !== undefined) {
      updates.push({ id: `${p}_avatarID`, value: user.user.avatar });
    }
    return updates;
  }

  updateUserStates = async (data) => {
    try {
      // if user is not added, we add it..
      await this.addUserData(data);

      const userId = data && data.user && data.user.id;
      const user = userId && this.DG.currentVoiceUsers[userId];
      if (!user) {
        return;
      }
      const userIndex = Object.keys(this.DG.currentVoiceUsers).indexOf(userId);
      const previousUserData = this.oldUserData[userId] || {};

      // Get the difference between the previous user data and the current user data
      const userDiff = diff(previousUserData, user);

      // Now check if there are 11 or more users in the channel, if so, we need to create more user states
      if (Object.keys(this.DG.currentVoiceUsers).length >= 11) {
        createStates(`user_${userIndex}`, this.DG.DEFAULT_USER_STATES, `VC | User_${userIndex}`, this.TPClient);
      }

      // Updating general user states
      let updates = this.generateUserUpdates(`user_${userIndex}`, userDiff);

      // Only updating user volume connector/state if volume has changed
      if (userDiff && Object.prototype.hasOwnProperty.call(userDiff, "volume") && typeof user.volume === "number") {
        let newVolume = convertVolumeToPercentage(user.volume) / 2;
        this.TPClient.connectorUpdate(
          `discord_voice_volume_action_connector|voiceUserList_connector=${userIndex}`,
          newVolume,
        );
        updates.push({ id: `user_${userIndex}_volume`, value: Math.round(newVolume) });
      }

      // Updating states for general user
      if (updates.length > 0) {
        this.TPClient.stateUpdateMany(updates);
      }

      // Update custom voice activity users if applicable
      if (Object.prototype.hasOwnProperty.call(this.DG.customVoiceAcivityUsers, userId)) {
        let customUserIndex = this.DG.customVoiceAcivityUsers[userId];
        let customUpdates = this.generateUserUpdates(customUserIndex, user);
        this.TPClient.stateUpdateMany(customUpdates);
      }
    } catch (error) {
      logIt("ERROR", `updateUserStates: ${error}`);
    }

    // Keeping track of previous user data
    if (data && data.user && data.user.id) {
      this.oldUserData[data.user.id] = this.DG.currentVoiceUsers[data.user.id];
    }
  };

  deleteUserStates = async (data) => {
    if (!data || !data.user || !data.user.id) {
      return;
    }
    const selfId = this.DG.Client && this.DG.Client.user ? this.DG.Client.user.id : undefined;
    if (selfId === data.user.id) {
      logIt("DEBUG", "Client User has left the voice channel");
      await this.clearUserStates();
    } else {
      logIt("DEBUG", `${data.nick} (${data.user.id}) has left the voice channel`);
      // remove user from currentVoiceUsers
      delete this.DG.currentVoiceUsers[data.user.id];
      delete this.oldUserData[data.user.id];
      // Now lets repopulate the list
      await this.repopulateUserStates();
    }

    this.updateParticipantCount();
  };

  repopulateUserStates = async () => {
    await this.clearUserStates();
    Object.keys(this.DG.currentVoiceUsers).forEach((userId, userIndex) => {
      const user = this.DG.currentVoiceUsers[userId];
      if (!user || !user.user) {
        return;
      }
      const vs = user.voice_state || {};
      const p = `user_${userIndex}`;
      const updates = [
        { id: `${p}_deaf`, value: vs.deaf ? "On" : "Off" },
        { id: `${p}_self_deaf`, value: vs.self_deaf ? "On" : "Off" },
        { id: `${p}_self_mute`, value: vs.self_mute ? "On" : "Off" },
        { id: `${p}_mute`, value: user.mute ? "On" : "Off" },
        { id: `${p}_server_mute`, value: vs.mute ? "On" : "Off" },
        { id: `${p}_id`, value: user.user.id },
        { id: `${p}_nick`, value: user.nick || "" },
        {
          id: `${p}_volume`,
          value: typeof user.volume === "number" ? Math.round(convertVolumeToPercentage(user.volume) / 2) : 0,
        },
        // addUserData stores the avatar at the top level; voiceChannel stores it on .user.
        { id: `${p}_avatar`, value: user.base64Avatar || user.user.base64Avatar || DEFAULT_BASE64_AVATAR },
        { id: `${p}_avatarID`, value: user.user.avatar || "" },
      ];
      this.TPClient.stateUpdateMany(updates);
    });
  };
}

module.exports = { UserStateHandler };
