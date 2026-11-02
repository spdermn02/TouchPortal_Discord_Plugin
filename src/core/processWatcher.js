"use strict";

const EventEmitter = require("events");
const findProcess = require("find-process");
const path = require("path");
const { logIt } = require("../utils/helpers");
const platform = require("process").platform;
const LOOP_INTERVAL = 10000;
const find = findProcess.default || findProcess;

class ProcessWatcher extends EventEmitter {
  constructor(_options = {}) {
    super();
    this.loop = null;
    this.processNames = {};
    if (platform == "win32") {
      const CMDPath = path.resolve(process.env.windir + path.sep + "system32");
      const pathArray = (process.env.PATH || "").split(path.delimiter);
      pathArray.push(CMDPath);
      const WBEMPath = path.resolve(CMDPath + path.sep + "wbem");
      pathArray.push(WBEMPath);
      process.env.PATH = pathArray.join(path.delimiter);
    }
  }
  watch(processName) {
    // Touch Portal sends Settings on every settings change, and each one lands here. Without
    // this guard every change stacked another polling interval on top of the last.
    if (this.loop != null && this.processNames[processName]) {
      return;
    }
    this.stopWatch();
    this.processNames[processName] = {};
    let that = this;
    this.loop = setInterval(() => {
      that.isProcessReady(processName);
    }, LOOP_INTERVAL);
    this.isProcessReady(processName);
  }
  stopWatch() {
    clearInterval(this.loop);
    this.loop = null;
  }
  async isProcessReady(processName) {
    let emitEvent = null;

    await find("name", processName, true)
      .then((list) => {
        if (this.loop == null) {
          emitEvent = null;
          return;
        }
        if (!this.processNames[processName]) {
          this.processNames[processName] = {};
        }
        if (list.length > 0) {
          if (!this.processNames[processName].isRunning) {
            this.processNames[processName].isRunning = true;
            emitEvent = true;
          }
        } else {
          this.processNames[processName].isRunning = false;
          emitEvent = false;
        }
      })
      .catch((err) => {
        emitEvent = null;
        logIt("INFO", `TPDiscord: Unable to determine if process running, error occured - ${err}`);
      });

    if (emitEvent) {
      this.emit("processRunning", processName);
    } else if (emitEvent != null && !emitEvent) {
      this.emit("processTerminated", processName);
    }
  }
}

module.exports = { ProcWatcher: ProcessWatcher };
