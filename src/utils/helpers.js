const platform = require("process").platform;
const { pluginId } = require("../discordConfig.js");
const { discord_paths } = require("../discordPaths.js");
let debugMode = "INFO";

function setDebugMode(mode) {
  debugMode = mode;
}

function logIt() {
  const curTime = new Date().toISOString();
  const message = [...arguments];
  const type = message.shift();
  if (type == "DEBUG" && String(debugMode || "off").toLowerCase() == "off") {
    return;
  }

  console.log(curTime, ":", pluginId, ":" + type + ":", message.join(" "));
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
  const userIds = Object.keys(currentVoiceUsers || {});
  return userIds[userIndex];
}

// Avatars only ever come from Discord's CDN. Refusing anything else keeps a malformed or
// unexpected URL in an RPC payload from turning the plugin into a generic HTTP fetcher.
const IMAGE_HOSTS = new Set(["cdn.discordapp.com", "media.discordapp.net"]);
const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const IMAGE_TIMEOUT_MS = 5000;

// Resolves to a base64 string, or "" when the image cannot be fetched. Never rejects.
const imageToBase64 = async (imageUrl) => {
  try {
    if (typeof imageUrl !== "string" || imageUrl === "") {
      return "";
    }
    const url = new URL(imageUrl);
    if (url.protocol !== "https:" || !IMAGE_HOSTS.has(url.hostname)) {
      logIt("DEBUG", `imageToBase64: refusing non-Discord image host ${url.hostname}`);
      return "";
    }
    const response = await fetch(url, { signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS) });
    if (!response.ok) {
      return "";
    }
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > IMAGE_MAX_BYTES) {
      return "";
    }
    return Buffer.from(arrayBuffer).toString("base64");
  } catch (error) {
    logIt("DEBUG", `imageToBase64: ${error}`);
    return "";
  }
};

// Tear down the current Discord client without ever throwing or leaving a rejected promise
// behind. destroy() rejects or hangs when the client never got a socket, and nothing that
// calls this is in a position to handle that.
function destroyClient(DG) {
  const client = DG.Client;
  DG.Client = null;
  DG.connected = false;
  if (!client) {
    return;
  }
  try {
    client.removeAllListeners();
    Promise.resolve(client.destroy()).catch((err) => logIt("DEBUG", `destroyClient: ${err}`));
  } catch (err) {
    logIt("DEBUG", `destroyClient: ${err}`);
  }
}

// Value of the nth entry of a Touch Portal action/connector data array, or undefined.
function dataValue(message, index) {
  const data = message && Array.isArray(message.data) ? message.data : [];
  return data[index] ? data[index].value : undefined;
}

// parseInt that returns `fallback` instead of NaN.
function toInt(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
}

// passing tpclient to func to make life simple for now... will refactor later
function createStates(prefix, states, group = `${prefix} - States`, TPClient) {
  for (let state of states || []) {
    let stateId = `${prefix}_${state.id}`;
    if (!TPClient.customStates[stateId]) {
      // Check if the state already exists
      TPClient.createState(stateId, `VC | ${prefix} ${state.title}`, state.value, group);
    }
  }
}

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
  destroyClient,
  dataValue,
  toInt,
  setDebugMode,
  createStates,
  platform,
  discord_paths,
};
