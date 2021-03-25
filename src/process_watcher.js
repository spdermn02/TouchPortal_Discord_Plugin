"use strict";

const EventEmitter = require("events")
const find  = require('find-process');
const LOOP_INTERVAL = 10000;

class ProcessReady extends EventEmitter {
    constructor(options = {}) {
        super();
        this.loop = null;
        this.processNames = {};
    }
    watch(processName) {
        this.processNames[processName] = {};
        let that = this;
        this.loop = setInterval(() => {
            that.isProcessReady(processName);
        }, LOOP_INTERVAL);
        this.isProcessReady(processName);
    }
    stopWatch(){
        clearInterval(this.loop);
        this.loop = null;
    }
    async isProcessReady(processName){
        let emitEvent = null;
        await find('name',processName,true).then((list) => {
          if( list.length > 0 ) {
              if(this.processNames[processName] == null || !this.processNames[processName]['isRunning'] ) {
                this.processNames[processName].isRunning = true;
                emitEvent = true;
              }
          }
          else {
              this.processNames[processName].isRunning = false;
              emitEvent = false;
          }
        });

        if( emitEvent ) {
            this.emit('processRunning',processName);
        }
        else if( emitEvent != null && !emitEvent ) {
            this.emit('processTerminated',processName);
        }
    }
}

module.exports = ProcessReady;