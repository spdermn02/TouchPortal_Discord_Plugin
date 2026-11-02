#!/bin/sh
# Launcher for the Touch Portal Discord plugin on macOS and Linux.
#
# Touch Portal runs this via `sh <path>`, which is the whole point: a script passed to an
# interpreter does not need an execute bit of its own. Touch Portal does not preserve the
# Unix mode bits stored in the .tpp when it unpacks a plugin, so the executable arrives
# without permission to run and nothing that relies on those bits can start it. Restoring
# the bit here is therefore load-bearing, not a fallback.
#
# Touch Portal also cannot handle more than one command in a plugin_start_cmd_* value, so
# the chmod cannot be folded into entry.tp - it has to live in a script.
#
# Keep this POSIX sh. Touch Portal invokes `sh`, which is dash on Debian and Ubuntu, so
# bash-only syntax such as [[ ]] fails outright.

prog=tpdiscord

# Resolve our own directory. Touch Portal does not guarantee the working directory, so
# nothing here may depend on it.
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd) || exit 1

chmod +x "$dir/$prog" 2>/dev/null

# exec, so this process is replaced by the plugin rather than lingering as a parent that
# exits immediately. Touch Portal supervises the process it spawned; if the shell returns,
# Touch Portal considers the plugin dead.
exec "$dir/$prog"
