import St from 'gi://St';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Shell from 'gi://Shell';
import Meta from 'gi://Meta';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {ModalDialog} from 'resource:///org/gnome/shell/ui/modalDialog.js';
import {getSettings} from './Utils.js';

const mod$ = Symbol(), name$ = Symbol();

const {ModifierType} = Clutter;

const mapLabel = (map) => map[name$]?.join(' ') ?? '';

const CommandDialog = GObject.registerClass({GTypeName: 'CommandDialog'}, class CommandDialog extends ModalDialog {
  _init(map) {
    super._init({
      shellReactive: true,
      styleClass: 'command-dialog headline',
      shouldFadeIn: false,
      destroyOnClose: false,
    });

    const label = this._label = new St.Label({
      style_class: 'command-dialog-label', text: mapLabel(map),
      x_expand: false,
      x_align: St.TextAlign.LEFT, y_align: St.TextAlign.LEFT});
    this.contentLayout.add_child(label);

    this.setInitialKeyFocus(label);
  }
});

const reduceMod = (raw) => {
  let mod = 0;
  if ((raw & ModifierType.SHIFT_MASK) != 0) mod = 1;
  if ((raw & ModifierType.CONTROL_MASK) != 0) mod += 2;
  if ((raw & ModifierType.MOD1_MASK) != 0) mod += 4;
  if ((raw & ModifierType.SUPER_MASK) + (raw & ModifierType.MOD4_MASK) != 0) mod += 8;

  return mod;
};

const seqToMap = (map, seq, command) => {
  const [_, key, rawMod] = Gtk.accelerator_parse(seq);
  if (rawMod != 0) {
    map = map[mod$] ??= [];
    const mod = reduceMod(rawMod);
    map = map[mod] ??= [];
  }
  if (typeof command === 'function') {
    map[key] = command;
  } else {
    return map[key] ??= command;
  }
};

const lookup = (map, event) => {
  const mod = reduceMod(event.get_state());
  if (mod != 0) {
    let mm = map[mod$];
    if (mm !== undefined) {
      mm = mm[mod];
      if (mm !== undefined) {
        map = mm;
      }
    }
  }

  return map[event.get_key_symbol()];
};

export default class CommandManager {
  constructor() {
    this._settings = getSettings();

    this.keyMap = {};

    Main.wm.addKeybinding(
      'command-menu', this._settings,
      Meta.KeyBindingFlags.NONE,
      Shell.ActionMode.ALL,
      () => this.commandDialog(),
    );
  }

  addCommand(keySeq, name, command) {
    let map = this.keyMap;
    const parts = keySeq.split(' ');
    const last = parts.length - 1;
    for (let i = 0; i < last; ++i) {
      map = seqToMap(map, parts[i], {});
    }

    (map[name$] ??= []).push(name);

    seqToMap(map, parts[last], command);
  }

  commandDialog() {
    let map = this.keyMap;
    if (this._commandDialog == null) {
      this._commandDialog = new CommandDialog(map);
    } else {
      this._commandDialog._label.text = mapLabel(map);
    }

    this._commandDialog.open();

    let capturedEventId;

    const onCapturedEvent = (actor, event) => {
      try {
        const type = event.type();
        const press = type == Clutter.EventType.KEY_PRESS;
        const release = type == Clutter.EventType.KEY_RELEASE;

        if (! press && ! release) return Clutter.EVENT_PROPAGATE;

        const sym = event.get_key_symbol();

        if (press) {
          const func = lookup(map, event);
          if (typeof func === 'function') {
            map = func(this, event) ? this.keyMap : undefined;
          } else {
            map = func;
          }

          if (map === undefined) {
            this._commandDialog.disconnect(capturedEventId);
            this._commandDialog.close();
          } else {
            this._commandDialog._label.text = mapLabel(map);
          }
        }

        return Clutter.EVENT_STOP;
      } catch (err) {
        this._commandDialog.disconnect(capturedEventId);
        this._commandDialog.close();
        throw err;
      }
    };

    capturedEventId = this._commandDialog.connect('captured-event', onCapturedEvent);
  }

  destroy() {
    Main.wm.removeKeybinding('command-menu');
  }
}
