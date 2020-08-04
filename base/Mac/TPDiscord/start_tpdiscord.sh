#!/bin/sh

prog=tpdiscord

chmod +x tpdiscord

pid=`ps -ef | grep -v grep | grep -i "\./${prog}" | awk '{print $2}'`

if [[ "x$pid" != "x" && $pid -gt 0 ]]
then
	echo "`date +"%F %T%Z"`: ${prog} already running, killing it to start again"
        kill -9 $pid
	sleep 1
fi

./$prog > ${prog}log.txt 2>&1 &
