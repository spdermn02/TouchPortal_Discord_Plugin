# Touch Portal Discord Plugin — Change Log

All notable changes to this plugin, newest first. Version numbers match the release tag
and the `TPDiscord_Version` reported to Touch Portal.

---

## v5.2.0 — unreleased

Build and packaging release. No new actions, events, or states — this fixes the Linux and
macOS packages, which had never worked correctly.

### Fixed
- **Linux and macOS packages shipped a non-executable plugin.** The `.tpp` archive is a zip,
  and the build stamped it with a Windows host byte and mode `0666`. Unix extractors only
  honour permission bits when the archive advertises a UNIX host, so the execute bit was
  silently discarded on every release. Packages now carry a UNIX host byte with mode `0755`
  on the executable and `0644` on data files, regardless of which OS built them.
- **Plugin crashed on startup on Linux.** `src/utils/discordkeys.js` was required as
  `./utils/discordKeys.js` (capital K) from `src/index.js` and `onAction.js`. Case-insensitive
  filesystems hid this on Windows and macOS; on Linux it was a hard `MODULE_NOT_FOUND`.
  The file is now named `discordKeys.js` to match.
- **macOS binaries were unusable on Apple Silicon.** Cross-compiled binaries were never
  code-signed, and macOS kills unsigned executables outright on arm64. macOS builds are now
  produced on macOS runners and ad-hoc signed.
- **Plugin was not supervised correctly on Linux and macOS.** The old start script
  backgrounded the executable with `&` and exited, so Touch Portal lost track of the process
  it had spawned. The start command now `exec`s the plugin so it replaces the shell.
- **Start script was not POSIX-compatible.** It used a bash-only `[[ ]]` test under a
  `#!/bin/sh` shebang, which fails outright on Debian and Ubuntu, where `/bin/sh` is dash.
- `entry.tp` advertised version `5.1.0` while the released package was `5.1.2`, which could
  mislead Touch Portal's update check. The version is now bumped in one place.

### Changed
- **Executables are now built with Node's Single Executable Application format** (Node 22 +
  `esbuild` + `postject`), replacing `vercel/pkg`. `pkg` is archived, caps out at Node 18,
  and has no macOS arm64 target.
- **CI builds each platform on its own runner** instead of cross-compiling everything from
  Windows: Windows, Linux, macOS (Intel), and macOS (Apple Silicon). SEA injects the plugin
  into a copy of the host's own `node` binary, so per-platform builds are a requirement of
  the format — and they are what make macOS signing possible.
- `npm run build` now compiles the `touchportal-api` dependency itself. That package ships
  uncompiled sources and its `main` points at a directory that does not exist until its
  own tsconfig is built; this was previously a separate Windows-only CI step.
- Minimum Node version is now 22.

### Added
- **Native Apple Silicon (arm64) package.** Previously macOS shipped x64-only.

### Removed
- `base/start_tpdiscord.sh`. It existed only to `chmod +x` the executable, working around the
  packaging bug above. The POSIX start command now re-applies the execute bit inline as a
  fallback, since Touch Portal does not document whether its extractor preserves zip modes.

---

## v5.1.2 — 2026-06-28

### Added
- New Event — **Discord: Mute Status Changed**, fires on local mute changes.
- New Event — **Discord: Deafen Status Changed**, fires on local deafen changes.

### Fixed
- Guild soundboard sounds failed to load for users without Discord Nitro / server premium.

### Changed
- Build and release process updated to work with current Node and TypeScript versions.

---

## v5.0.0 — 2024-12-04

Large rework of the plugin's structure and surface, developed across `5.0.0-alpha-1`
through `alpha-6`. This release introduced Touch Portal **events** to the plugin for the
first time.

### Added
- New Categories — **VoiceChannel Info**, **Discord Settings**, **Direct Message**, **Mentions**.
- New Events (the plugin had none before this release):
  - **Discord: New Direct Message (DM)**
  - **Discord | New Mention**
  - **Discord: Default Audio Device Changed**
- New Actions:
  - **Discord Select Channel (by ID)** — replaces the separate DM text and DM voice actions.
  - **Discord: Set Default Audio Device (Input/Output)**
  - **Discord: Set Volume for Default Audio Device (Input/Output)**
- New Connector — **Adjust VC User Volume**, a per-user volume slider.
- 18 new States, covering:
  - Direct messages — user, user ID, channel ID, content, timestamp, avatar
  - Mentions — user, user ID, channel ID, content, timestamp, avatar, channel type
  - Current input and output audio device names
  - Event-trigger states for the three new events
- New Setting — **VoiceActivity Tracker**, a comma-separated list of user IDs to track.

### Changed
- Source reorganised into `src/core/`, `src/handlers/discord/`, `src/handlers/touchportal/`
  and `src/utils/`, with filenames normalised to camelCase.
- `DiscordConfig` and `ProcWatcher` extracted into their own classes and modules;
  `DEFAULT_BASE64_AVATAR` moved out of `index.js`.
- Reworked entry generation to guarantee unique action, event, and state IDs.
- "Reset Push to Talk Keys" action description clarified.

### Fixed
- Discord error `e3081` triggered by Touch Portal in certain states.
- Crashes when Discord restarted to apply an update.
- Mute and deafen state handling in several specific scenarios, plus unnecessary
  mute/deafen state updates.
- `voice_channel_participant_ids` was not being updated.
- Reconnection handling on non-Windows systems.
- Update notifications not firing correctly.
- Process watcher reliability (TP-99).
- Set Output/Input Device volume when triggered on press (#104).
- Performance of base64 avatar conversion.

### Removed
- **Discord Auto Gain Control** action.
- **Discord DM Voice Channel** and **Discord DM Text Channel** actions, superseded by
  **Discord Select Channel (by ID)**.

---

## v4.4.0 — 2024-03-04

### Added
- New States:
  - **Discord Voice Channel Participants** — pipe-delimited list of nicknames for users in
    the voice channel you have joined. Updates continually as users join and leave.
  - All new states related to Voice Settings and Voice/Speaker Volume.
  - **Camera Status** — `On` or `Off`.
  - **Screenshare Status** — `On` or `Off`.
- New Actions:
  - A range of new audio-based actions to control the different voice settings.
  - Join a DM-based text or voice channel by ID. Joining voice does **not** ring the other
    person, it just joins the channel.
  - **Push To Mute** — OnHold action; mutes/deafens you while held, reverting on release.
  - **Push To Talk** — OnHold action; unmutes/undeafens you while held, re-muting on release.
  - **Play Soundboard** — play integrated or server-specific sounds from Touch Portal while
    in a voice call.
  - **Toggle Camera** — turn your camera on or off.
  - **Toggle Screenshare** — turn your screenshare on or off. When turning it on you will
    still be asked what to share.
- New Connectors — sliders to control input and output volume.

### Fixed
- Several issues related to joining and moving between voice channels. If you still hit one,
  please open an Issue.

### Changed
- New build process using `scripts/build.js` instead of hard-coding the build in
  `package.json`, making it more generic.
- Voice Settings changes now only send back the relevant changes rather than everything
  every time.
- New Discord scopes required to support the added functionality.
- Now uses a customised version of `discord-rpc`: https://github.com/spdermn02/RPC

---

## v4.3.1 — 2022-07-24

### Added
- Setting to enable or disable **Debug Mode** (`Off` or `On`), to stop log spam unless it is
  needed for debugging.
- Update notifications now use Touch Portal's own notification system.

### Changed
- Improved plugin startup time by loading guild and channel information correctly.
- Channel Create and Guild Create events now only handle their own channel or guild, which
  also improves load times. This mostly went unnoticed unless you were reading the logs, but
  it was a real problem and could cause issues.
- Updated to `touchportal-api` 3.2.0.
- Refactored `entry.tp` into a single file supporting both Windows and macOS.

---

## v4.3.0 — 2022-07-23

### Added
- New State — **Discord Process Running**: `Yes`, `No`, or `Unknown` (starts as `Unknown`).
  - *Note*: Windows reports all three values. macOS always reports `Unknown` until a process
    watcher is implemented for it.
- New State — **Discord Connected**: `Connected` or `Disconnected`.

---

## v4.2.2 — 2022-06-12

### Fixed
- Mute and Deafen state value corrected from `0ff` to `Off`.
- Removed the unneeded `messages.read` scope from the Discord scope list.

---

## v4.2.1

### Changed
- Pull in `touchportal-api` 3.1.2, which fixes the update check failing and killing the
  process.

---

## v4.2.0

### Added
- Three new States — **Discord Voice Channel ID**, **Discord Voice Channel Server**,
  **Discord Voice Channel Server ID**.

---

## v4.1.0

### Changed
- Updated `discord-rpc` to 4.0.1, picking up the bug fix for #41 and enhancement #20.
- No more re-authorization prompt if you have already authorized your developer app, so
  restarts connect cleanly.
- Refactored the event subscription process to suit the `discord-rpc` update. All events
  verified to still fire as expected.

---

## v4.0.5

### Changed
- Updated `find-process` to 1.4.7, picking up the bug fix for #32.

---

## v4.0.4

### Fixed
- Process watcher for those who experienced issues. It now forces the directories it needs
  onto the environment path (Windows only).

---

## v4.0.3

### Fixed
- Voice Activity and PTT switching.

---

## v4.0.2

### Added
- Setting reporting whether Discord was connected to successfully — `Disconnected` or
  `Connected`.
- (Windows only) Setting to disable the Process Watcher, for systems that do not recognise
  the application properly.
  - *Note*: This can require stopping and starting TPDiscord if Discord closes while
    authenticated. Do this from Touch Portal Settings → Plug-Ins → "Touch Portal Discord
    Plugin", click Stop, wait a few seconds, then click Start.

---

## v4.0.1

- Minor fixes; details were not recorded at the time.

---

## v4.0.0

### Added
- Action for Voice Mode changes — PTT to Voice Activity and back.
- Action for changing the Push-To-Talk hotkey.
- Action to go to a specific voice or text channel in a Discord server you belong to.
- Action to hang up the call when in a voice channel.
- Voice connection statistics — voice server and ping average.
- State for the voice channel you are connected to.
- State for voice mode type.
- Watches for `Discord.exe` before attempting to connect, polling every 10 seconds. This can
  cause a slight connection delay if startup is slow. Windows only at this stage.

### Changed
- Reworked for the Touch Portal v2.3 plugin API changes.
- Settings moved from a custom config file into Touch Portal. This requires reconfiguration
  using the Discord dev app you already have set up.
  - Authorization is now requested each time Touch Portal or the plugin starts, guaranteeing
    a fresh access token.
    - *Note*: This may be reworked later to store the access token; storing it caused
      problems during development.

### Fixed
- Longer wait times between reconnect attempts (also released as a pre-v4.0.0 fix).

---

## pre-v4.0.0

- Mute yourself in Discord.
- Deafen yourself in Discord.
- Fixes for connection issues.
