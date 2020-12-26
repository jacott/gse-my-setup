/* global imports log */

(()=>{
  const {St, Gio, GLib, Clutter, Gvc, Shell} = imports.gi;
  const {panel, status: {volume}} = imports.ui;

  const Me = imports.misc.extensionUtils.getCurrentExtension();

  const getDevices = (mixer)=>{
    const devs = [];
    for(let i = 1; i < 40; ++i) {
      const dev = mixer.lookup_output_id(i);
      if (dev != null) {

        log(i+" DEBUG: "+dev.description+", o: "+dev.origin+", pn: "+dev.port_name+", sid: "+dev.get_stream_id()
            +", has ports: "+dev.has_ports()+", XX: "+dev.get_port());
        devs.push(dev);
      }
    }
    return devs;
  };

  const getActiveIndex = (mixer, devs)=>{
    const def = mixer.get_default_sink();
    const stream_port = def.get_port();
    for(let i = 0; i < devs.length; ++i) {
      const dev = devs[i];
      const stream = mixer.get_stream_from_device(dev);
      if (def === stream) {
        const uidevice_port = dev.get_port();

        if ((! stream_port && ! uidevice_port) ||
            (stream_port && stream_port.port === uidevice_port)) {
          return i;
        }
      }
    }
    return -1;
  };

  const nextDevice = (mixer)=>{
    const devs = getDevices(mixer);
    const activeIndex = getActiveIndex(mixer, devs);
    if (activeIndex != -1)
      return devs[(activeIndex+1)%devs.length];
  };

  const init = (self)=>{
    const mixer = self._mixer;
    const devs = getDevices(mixer);
    const activeIndex = getActiveIndex(mixer, devs);
    activeIndex != -1 && self.showActive(devs[activeIndex]);
    self._signals.push(mixer.connect(
      "active-output-update",
      (mixer, id)=>{self.showActive(mixer.lookup_output_id(id))}));
  };

  class SoundControl {
    constructor(commandManager) {
      commandManager.addCommand('o', 'sound-[o]utput', ()=>{this.nextOutput()});
      const mixer = this._mixer = volume.getMixerControl();
      this._signals = [];
      this.icon = new St.Icon({style_class: 'popup-menu-icon sound-icon', icon_name: "audio-card"});

      const button = this.actor = new St.Button({ style_class: 'sound-device' });
      button.add_actor(this.icon);
      button.connect('clicked', ()=>{
        let appSys = Shell.AppSystem.get_default();
        let soundApp = appSys.lookup_app('gnome-sound-panel.desktop');
        soundApp && soundApp.activate();
      });

      if (mixer.get_state() === Gvc.MixerControlState.READY) {
        init(this);
      } else {
        this._signals.push(mixer.connect("state-changed", ()=>{
          this._mixer.disconnect(this._signals.pop());
          init(this);
        }));
      }
    }

    showActive(dev) {
      const name = dev.get_icon_name() || '';
      this.icon.icon_name = (name.trim() || "audio-card") + "-symbolic";
    }

    nextOutput() {
      const dev = nextDevice(this._mixer);
      if (dev !== void 0) {
        // log(i+": "+(dev && dev.description)+", o: "+dev.origin+", pn: "+dev.port_name);
        this._mixer.change_output(dev);
      }
    }

    destroy() {
      for (const id of this._signals) {
        this._mixer.disconnect(id);
      }
      this.icon.destroy();
    }
  }

  Me.imports.SoundControl = SoundControl;
})();
