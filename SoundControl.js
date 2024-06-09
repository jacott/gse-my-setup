import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import Gvc from 'gi://Gvc';
import Shell from 'gi://Shell';
import * as Volume from 'resource:///org/gnome/shell/ui/status/volume.js';

const getDevices = (mixer) => {
  const devs = [];
  for (let i = 1; i < 40; ++i) {
    const dev = mixer.lookup_output_id(i);
    if (dev != null && dev.get_active_profile() != null) {
      log(i + ' DEBUG: ' + dev.description + ', o: ' + dev.origin + ', pn: ' + dev.port_name + ', sid: ' + dev.get_stream_id() +
        ', has ports: ' + dev.has_ports() + ', XX: ' + dev.get_port() + ', sbh: ' + dev.should_profiles_be_hidden() +
        ', bp: ' + dev.get_active_profile());
      devs.push(dev);
    }
  }
  return devs;
};

const getActiveIndex = (mixer, devs) => {
  const def = mixer.get_default_sink();
  const stream_port = def.get_port();
  for (let i = 0; i < devs.length; ++i) {
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
  return devs.length - 1;
};

const nextDevice = (mixer) => {
  const devs = getDevices(mixer);
  const activeIndex = getActiveIndex(mixer, devs);
  log('activeIndex: ' + activeIndex);
  if (activeIndex != -1) {
    return devs[(activeIndex + 1) % devs.length];
  }
};

const init = (self) => {
  const mixer = self._mixer;
  const devs = getDevices(mixer);
  const activeIndex = getActiveIndex(mixer, devs);
  activeIndex != -1 && self.showActive(devs[activeIndex]);
  self._signals.push(mixer.connect(
    'active-output-update',
    (mixer, id) => {self.showActive(mixer.lookup_output_id(id))}));
};

export default class SoundControl {
  constructor(commandManager) {
    // commandManager.addCommand('o', 'sound-[o]utput', ()=>{this.nextOutput()});
    const mixer = this._mixer = Volume.getMixerControl();
    this._signals = [];
    this.icon = new St.Icon({style_class: 'popup-menu-icon sound-icon', icon_name: 'audio-card'});

    const button = this.actor = new St.Button({style_class: 'sound-device'});
    button.add_child(this.icon);
    button.connect('clicked', () => {
      let appSys = Shell.AppSystem.get_default();
      let soundApp = appSys.lookup_app('gnome-sound-panel.desktop');
      soundApp && soundApp.activate();
    });

    if (mixer.get_state() === Gvc.MixerControlState.READY) {
      init(this);
    } else {
      this._signals.push(mixer.connect('state-changed', () => {
        this._mixer.disconnect(this._signals.pop());
        init(this);
      }));
    }
  }

  showActive(dev) {
    const name = dev.get_icon_name() || '';
    this.icon.icon_name = (name.trim() || 'audio-card') + '-symbolic';
  }

  nextOutput() {
    const dev = nextDevice(this._mixer);
    if (dev !== undefined) {
      const stream = this._mixer.get_stream_from_device(dev);
      log('next active: ' + (dev && dev.description) + ', o: ' + dev.origin + ', pn: ' + dev.port_name + (stream ? 'st' : 'ns'));
      //        this._mixer.set_default_sink(stream);
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
