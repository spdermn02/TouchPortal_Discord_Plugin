//onListChange

const {DG} = require("../../discord_config.js");
const TPClient = require("../../core/TPClient.js");
const {logIt, isEmpty} = require("../../utils/helpers.js");

// onListChange = async (data) => {
async function onListChange(data) {
  logIt("DEBUG", "ListChange :" + JSON.stringify(data));
  if (isEmpty(DG.instanceIds[data.instanceId])) {
    DG.instanceIds[data.instanceId] = {};
  }
  if (isEmpty(DG.instanceIds[data.instanceId][data.actionId])) {
    DG.instanceIds[data.instanceId][data.actionId] = {};
  }
  if (data.actionId === "discord_select_channel" && data.listId !== "discordServerChannel") {
    DG.instanceIds[data.instanceId][data.actionId][data.listId] = data.value;

    let guildName = undefined;
    let channelType = "Text";

    if (!isEmpty(DG.instanceIds[data.instanceId][data.actionId].discordServerList)) {
      guildName = DG.instanceIds[data.instanceId][data.actionId].discordServerList;
    }

    if (!isEmpty(DG.instanceIds[data.instanceId][data.actionId].discordChannelType)) {
      channelType = DG.instanceIds[data.instanceId][data.actionId].discordChannelType;
    }

    if (isEmpty(guildName) || isEmpty(channelType)) {
      return;
    }

    if (!isEmpty(DG.guilds.idx) && DG.guilds.idx[guildName]) {
      let guildId = DG.guilds.idx[guildName];
      TPClient.choiceUpdateSpecific(
        "discordServerChannel",
        DG.channels[guildId][channelType.toLowerCase()].array,
        data.instanceId
      );
    }
  }
}

module.exports = {onListChange};
