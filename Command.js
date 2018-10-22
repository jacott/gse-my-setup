/* global imports log */

var Manager = (()=>{
  const mod$ = Symbol(), name$ = Symbol();

  const {
    gi: {St, Gio, Gtk, Shell, Meta, Clutter},
    ui: {main: Main, modalDialog: {ModalDialog}},
    lang: Lang,
  } = imports;

  const {ModifierType} = Clutter;

  const Me = imports.misc.extensionUtils.getCurrentExtension();
  const {
    Utils: {getSettings}
  } = Me.imports;

  const CommandDialog = new Lang.Class({
    Name: 'CommandDialog',
    Extends: ModalDialog,

    _init() {
      this.parent({
        shellReactive: true,
        styleClass: 'command-dialog headline',
        shouldFadeIn: false,
        destroyOnClose: false,
      });

      const label = this._label = new St.Label({style_class: 'command-dialog-label', text: ("")});
      this.contentLayout.add(label, {x_fill: false, x_align: St.Align.START, y_align: St.Align.START});

      this.setInitialKeyFocus(label);
    },
  });

  const reduceMod = (raw)=>{
    let mod = 0;
    if ((raw & ModifierType.SHIFT_MASK) != 0) mod = 1;
    if ((raw & ModifierType.CONTROL_MASK) != 0) mod += 2;
    if ((raw & ModifierType.MOD1_MASK) != 0) mod += 4;
    if ((raw & ModifierType.SUPER_MASK)+(raw & ModifierType.MOD4_MASK) != 0) mod += 8;

    return mod;
  };

  const seqToMap = (map, seq, command)=>{
    const [key, rawMod] = Gtk.accelerator_parse(seq);
    if (rawMod != 0) {
      map = map[mod$] || (map[mod$] = {});
      const mod = reduceMod(rawMod);
      map = map[mod] || (map[mod] = {});
    }
    if (typeof command === 'function')
      map[key] = command;
    else
      return map[key] || (map[key] = command);
  };

  const lookup = (map, event)=>{
    const mod = reduceMod(event.get_state());
    if (mod != 0) {
      let mm = map[mod$];
      if (mm !== undefined) {
        mm = mm[mod];
        if (mm !== undefined)
          map = mm;
      }
    }

    return map[event.get_key_symbol()];
  };


  class Manager {
    constructor() {
      this._settings = getSettings();

      this.keyMap = {};

      Main.wm.addKeybinding(
        'command-menu', this._settings,
        Meta.KeyBindingFlags.NONE,
        Shell.ActionMode.NORMAL,
        ()=>this.commandDialog()
      );
    }

    setName(map) {
      const label = this._commandDialog._label;
      label.text = (map[name$] || []).join(' ');
    }

    addCommand(keySeq, name, command) {
      let map = this.keyMap;
      const parts = keySeq.split(' ');
      const last = parts.length - 1;
      for(let i = 0; i < last; ++i)
        map = seqToMap(map, parts[i], {});

      (map[name$] || (map[name$] = [])).push(name);

      seqToMap(map, parts[last], command);
    }

    commandDialog() {
      if (this._commandDialog == null)
        this._commandDialog = new CommandDialog();
      this._commandDialog.open();

      let capturedEventId;
      let map = this.keyMap;

      this.setName(map);

      const onCapturedEvent = (actor, event)=>{
        const type = event.type();
        const press = (type == Clutter.EventType.KEY_PRESS);
        const release = (type == Clutter.EventType.KEY_RELEASE);

        if (! press && ! release) return Clutter.EVENT_PROPAGATE;

        const sym = event.get_key_symbol();

        if (press && sym >=20 && sym < 128) {
          const func = lookup(map, event);
          if (typeof func === 'function') {
            map = func(this, event) ? this.keyMap : undefined;
          } else {
            map = func;
          }

          if (map === undefined) {
            global.stage.disconnect(capturedEventId);
            this._commandDialog.close();
          } else
            this.setName(map);
        }

        return Clutter.EVENT_STOP;
      };

      capturedEventId = global.stage.connect('captured-event', onCapturedEvent);
    }

    destroy() {
      Main.wm.removeKeybinding('command-menu');
    }
  }

  return Manager;
})();
