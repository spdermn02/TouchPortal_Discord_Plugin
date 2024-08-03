// HELPER FUNCTIONS
const platform = require("process").platform;
const {DG} = require("../discord_config.js");

const app_monitor = {
  darwin: "/Applications/Discord.app/Contents/MacOS/Discord",
  win32: "Discord.exe",
};

function logIt() {
  const curTime = new Date().toISOString();
  const message = [...arguments];
  const type = message.shift();
  if (type == "DEBUG" && DG.pluginSettings["Discord Debug Mode"].toLowerCase() == "off") {
    return;
  }

  console.log(curTime, ":", DG.pluginId, ":" + type + ":", message.join(" "));
}

function isEmpty(val) {
  return val === undefined || val === null || val === "";
}

const wait = (seconds) => new Promise((resolve) => setTimeout(() => resolve(true), seconds * 1000));

const convertPercentageToVolume = (value) => {
  if (value === 0) {
    return 0;
  }
  const translation = value > 100 ? ((value - 100) / 100) * 6 : (value / 100) * 50 - 50;
  return 100 * Math.pow(10, translation / 20);
};

const convertVolumeToPercentage = (value) => {
  if (value === 0) {
    return 0;
  }
  const translation = 20 * Math.log10(value / 100);
  return Math.round(100 * (translation > 0 ? translation / 6 + 1 : (50 + translation) / 50));
};

// Pulled from: https://stackoverflow.com/questions/8431651/getting-a-diff-of-two-json-objects
// BSD License
// Author: Gabriel Gartz
// link: https://stackoverflow.com/users/583049/gabriel-gartz
function diff(obj1, obj2) {
  const result = {};
  if (Object.is(obj1, obj2)) {
    return undefined;
  }
  if (!obj2 || typeof obj2 !== "object") {
    return obj2;
  }
  Object.keys(obj1 || {})
    .concat(Object.keys(obj2 || {}))
    .forEach((key) => {
      if (obj2[key] !== obj1[key] && !Object.is(obj1[key], obj2[key])) {
        result[key] = obj2[key];
      }
      if (typeof obj2[key] === "object" && typeof obj1[key] === "object") {
        const value = diff(obj1[key], obj2[key]);
        if (value !== undefined) {
          result[key] = value;
        }
      }
    });
  return result;
}

function setStateBasedOnValue(value, currentState) {
  // used for various sections of plugin where we need to toggle or choose on/off
  if (value === "Toggle") {
    return 1 - currentState;
  } else if (value === "Off") {
    return 0;
  } else if (value === "On") {
    return 1;
  }
  return currentState;
}

function getUserIdFromIndex(userIndex, currentVoiceUsers) {
  const userIds = Object.keys(currentVoiceUsers);
  return userIds[userIndex];
}

const imageToBase64 = async (imageUrl) => {
  try {
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return base64;
  } catch (error) {
    console.error(error);
  }
};

module.exports = {
  logIt,
  isEmpty,
  wait,
  convertPercentageToVolume,
  diff,
  convertVolumeToPercentage,
  setStateBasedOnValue,
  getUserIdFromIndex,
  imageToBase64,
  platform,
  app_monitor,
};
