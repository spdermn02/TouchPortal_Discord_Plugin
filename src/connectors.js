// Connectors.js
// moved from index.js to prove to myself that it works..

const { logIt, convertPercentageToVolume, pluginId, getUserIdFromIndex } = require('./helpers');
const { DG } = require('./config.js');


function setupConnectorChangeListener(TPClient) {


  TPClient.on("ConnectorChange", (message) => {
    logIt("DEBUG", `Connector change event fired ` + JSON.stringify(message));
    const action = message.connectorId;
    // console.log(pluginId, ": DEBUG : ", `calling action ${action}`);
    
    if (action === 'discord_voice_volume_connector') {
      let newVol = parseInt(message.value, 10);
      newVol = Math.max(0, Math.min(newVol, 100));
      DG.Client.setVoiceSettings({ 'input': { 'volume': convertPercentageToVolume(newVol) } });
    } 
    else if (action === 'discord_speaker_volume_connector') {
      let newVol = parseInt(message.value, 10);
      newVol = Math.max(0, Math.min(newVol, 100)) * 2;
      DG.Client.setVoiceSettings({ 'output': { 'volume': convertPercentageToVolume(newVol) } });
    } 
    else if (action === 'discord_voice_volume_action_connector') {
      let newVol = parseInt(message.value, 10);
      newVol = Math.max(0, Math.min(newVol, 100)) * 2;
      const userId = getUserIdFromIndex(message.data[0].value, DG.currentVoiceUsers);
      if (userId !== undefined) {
        logIt("INFO", "Setting Voice Volume for ", userId, " to ", newVol);
        DG.Client.setUserVoiceSettings(userId, { volume: convertPercentageToVolume(newVol) });
      }
    
    } 
    else {
      logIt("DEBUG", pluginId, ": ERROR : ", `Unknown action called ${action}`);
    }
  });

  
}

module.exports = setupConnectorChangeListener;
