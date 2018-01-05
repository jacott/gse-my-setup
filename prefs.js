/* global imports */

var {init, buildPrefsWidget} = (()=>{
  const {Gtk, Gio} = imports.gi;

  const Me = imports.misc.extensionUtils.getCurrentExtension();
  const {
    Utils: {getSettings}
  } = Me.imports;

  class Settings {
    constructor() {
      this._settings = getSettings();
      this._builder = new Gtk.Builder();

      // this._builder.set_translation_domain(Me.metadata['gettext-domain']);
      this._builder.add_from_file(Me.path + '/my-setup-settings.ui');

      this.widget = this._builder.get_object('settings_keyboard');

      throw new Error('xxx'+(this._settings.bind_writable.toString()));

      this._settings.bind_with_mapping(
        'focus-window',
        this._builder.get_object('focus_window_entry'),
        'text',
        Gio.SettingsBindFlags.DEFAULT, (x)=>{
          log('get'+(typeof x));
        }, (x)=>{
          log('set'+(typeof x));
        });

      log('hello world: '+this._settings.get_value('focus-window'));
    }
  }


  return {
    init() {},

    buildPrefsWidget() {
      let settings = new Settings();
      let widget = settings.widget;
      widget.show_all();
      return widget;
    }
  };
})();
