const TPClient = require("./core/TPClient.js");
const onListChange = require("./handlers/touchportal/onListChange.js");
// const onConnectorChange = require('./handlers/touchportal/onConnectorChange.js');
const onAction = require("./handlers/touchportal/onAction.js");

const {DG} = require("./discord_config.js");
require("./core/DiscordConnector.js"); // allows CD = new connectToDiscrd2(); to initiate in the connectToDiscord class

console.log("Initiating TP CLient");
TPClient.connect({pluginId: DG.pluginId, updateUrl: DG.updateUrl});
