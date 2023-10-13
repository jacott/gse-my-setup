import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk?version=3.0';
import {getSettings} from './Utils.js';

class Settings {
  constructor() {
    this._settings = getSettings();
    this._builder = new Gtk.Builder();

    // this._builder.set_translation_domain(Me.metadata['gettext-domain']);
    this._builder.add_from_file(Me.path + '/my-setup-settings.ui');

    this.widget = this._builder.get_object('settings_keyboard');

    throw new Error('xxx' + (this._settings.bind_writable.toString()));

    this._settings.bind_with_mapping(
      'focus-window',
      this._builder.get_object('focus_window_entry'),
      'text',
      Gio.SettingsBindFlags.DEFAULT, (x) => {
        log('get' + (typeof x));
      }, (x) => {
        log('set' + (typeof x));
      });

    log('hello world: ' + this._settings.get_value('focus-window'));
  }
}

export function init() {}
export function buildPrefsWidget() {
  let settings = new Settings();
  let widget = settings.widget;
  widget.show_all();
  return widget;
}
