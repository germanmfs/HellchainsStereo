/**
 * @name HellchainsStereo
 * @version hellchainsW
 * @description Hellclan's Stereo plugin with spatial audio processing and Haas effect
 * @authorLink https://github.com/germanmfs
 * @linktree https://linktr.ee/hellchains
 * @source https://github.com/germanmfs/HellchainsStereo
 * @updateUrl https://github.com/germanmfs/HellchainsStereo/blob/main/HellchainsStereo.plugin.js
 */

/*@cc_on
@if (@_jscript)
	
	// Offer to self-install for clueless users that try to run this directly.
	var shell = WScript.CreateObject("WScript.Shell");
	var fs = new ActiveXObject("Scripting.FileSystemObject");
	var pathPlugins = shell.ExpandEnvironmentStrings("%APPDATA%\\BetterDiscord\\plugins");
	var pathSelf = WScript.ScriptFullName;
	// Put the user at ease by addressing them in the first person
	shell.Popup("It looks like you've mistakenly tried to run me directly. \n(Don't do that!)", 0, "I'm a plugin for BetterDiscord", 0x30);
	if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
		shell.Popup("I'm in the correct folder already.", 0, "I'm already installed", 0x40);
	} else if (!fs.FolderExists(pathPlugins)) {
		shell.Popup("I can't find the BetterDiscord plugins folder.\nAre you sure it's even installed?", 0, "Can't install myself", 0x10);
	} else if (shell.Popup("Should I copy myself to BetterDiscord's plugins folder for you?", 0, "Do you need some help?", 0x34) === 6) {
		fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
		// Show the user where to put plugins in the future
		shell.Exec("explorer " + pathPlugins);
		shell.Popup("I'm installed!", 0, "Successfully installed", 0x40);
	}
	WScript.Quit();

@else@*/

module.exports = (() => {
  const config = {
    "main": "index.js",
    "info": {
      "name": "HellchainsStereo",
      "authors": [
        {
          "name": "hellchains",
          "discord_id": "810948947022708786",
          "github_username": "germanmfs"
        }
      ],
      "authorLink": "https://github.com/germanmfs",
      "version": "0.0.8",
      "description": "Hellclan's Stereo plugin",
      "github": "https://github.com/germanmfs",
      "github_raw": "https://github.com/germanmfs"
    },
    "changelog": [
      {
        "title": "Changes",
        "items": [
          "HUGE UPDATE!, I added Spatial sound to the Stereo and stereo Panning just adjust the stereo pan to wtv u want it to be"
        ]
      }
    ],
    "defaultConfig": [
      {
        "type": "switch",
        "id": "enableToasts",
        "name": "Enable Toasts",
        "note": "Allows the plugin to let you know it is working, and also warn you about voice settings",
        "value": true
      },
      {
        "type": "slider",
        "id": "stereoBalance",
        "name": "Stereo Balance",
        "note": "Adjust the balance between left and right stereo channels",
        "min": -1,
        "max": 1,
        "step": 0.1,
        "value": 0.5
      },
      {
        "type": "slider",
        "id": "stereoWidth",
        "name": "Stereo Width",
        "note": "Adjust the width of the stereo image",
        "min": 0,
        "max": 2,
        "step": 0.1,
        "value": 1
      }
    ]
  };

  return !global.ZeresPluginLibrary ? class {
    constructor() {
      this._config = config;
    }

    getName() {
      return config.info.name;
    }

    getAuthor() {
      return config.info.authors.map(a => a.name).join(", ");
    }

    getDescription() {
      return config.info.description;
    }

    getVersion() {
      return config.info.version;
    }

    load() {
      BdApi.showConfirmationModal("Library Missing", `The library plugin needed for ${config.info.name} is missing. Please click Download Now to install it.`, {
        confirmText: "Download Now",
        cancelText: "Cancel",
        onConfirm: () => {
          require("request").get("https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js", async (error, response, body) => {
            if (error) {
              return require("electron").shell.openExternal("https://betterdiscord.net/ghdl?url=https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js");
            }
            await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), body, r));
          });
        }
      });
    }

    start() {}

    stop() {}
  } : (([Plugin, Api]) => {
    const plugin = (Plugin, Library) => {
      const { WebpackModules, Patcher, Toasts } = Library;
      const { getUserMedia } = navigator.mediaDevices;

      let audioSource;

      return class StereoSound extends Plugin {
        onStart() {
          this.settingsWarning();
          const voiceModule = WebpackModules.getByPrototypes("updateVideoQuality");
          Patcher.after(voiceModule.prototype, "updateVideoQuality", this.replacement.bind(this));

          getUserMedia({ audio: true }).then(stream => {
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length > 0) {
              audioSource = new MediaStream();
              audioTracks.forEach(track => {
                audioSource.addTrack(track);
              });

              const audioContext = new AudioContext();
              const sourceNode = audioContext.createMediaStreamSource(audioSource);

              // Stereo Panning
              const stereoPanner = audioContext.createStereoPanner();
              stereoPanner.pan.value = this.settings.stereoBalance; // Adjust the balance between left and right stereo channels

              // Stereo Width
              const stereoWidth = audioContext.createStereoPanner();
              stereoWidth.pan.value = (this.settings.stereoWidth - 1) * 0.5; // Adjust the width of the stereo image

              // Haas Effect
              const delayNode = audioContext.createDelay();
              delayNode.delayTime.value = 0.03; // Adjust the delay time in seconds (e.g., 0.03 seconds)

              // Connect the audio nodes
              sourceNode.connect(stereoPanner);
              stereoPanner.connect(delayNode);
              delayNode.connect(stereoWidth);
              stereoWidth.connect(audioContext.destination);
            }
          }).catch(error => {
            console.error("Failed to obtain microphone audio source:", error);
          });
        }

        settingsWarning() {
          const voiceSettingsStore = WebpackModules.getByProps("getEchoCancellation");
          if (
            voiceSettingsStore.getNoiseSuppression() ||
            voiceSettingsStore.getNoiseCancellation() ||
            voiceSettingsStore.getEchoCancellation()
          ) {
            if (this.settings.enableToasts) {
              Toasts.show(
                "Please disable echo cancellation, noise reduction, and noise suppression for HellchainsStereo",
                { type: "warning", timeout: 5000 }
              );
            }
            return true;
          } else {
            return false;
          }
        }

        replacement(thisObj, _args, ret) {
          const setTransportOptions = thisObj.conn.setTransportOptions;
          thisObj.conn.setTransportOptions = function (obj) {
            if (obj.audioEncoder) {
              obj.audioEncoder.params = {
                stereo: "4",
              };
              obj.audioEncoder.channels = 4;
            }
            if (obj.fec) {
              obj.fec = false;
            }
            if (obj.encodingVoiceBitRate < 4840000) { //128
              obj.encodingVoiceBitRate = 6180000;
            }

            setTransportOptions.call(thisObj, obj);
          };

          if (!this.settingsWarning()) {
            if (this.settings.enableToasts) {
              Toasts.info("hellW");
            }
          }

          return ret;
        }

        onStop() {
          Patcher.unpatchAll();
        }

        getSettingsPanel() {
          const panel = this.buildSettingsPanel();
          return panel.getElement();
        }
      };
    };

    return plugin(Plugin, Api);
  })(global.ZeresPluginLibrary.buildPlugin(config));
})();
