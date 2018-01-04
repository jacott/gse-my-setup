/* global imports */

var pointInRect = (x, y, rect)=> rect.x < x && rect.y < y &&
    rect.x+rect.width > x && rect.y+rect.height > y;

var rectIntersect = (r1, r2)=> r1.y <= r2.y+r2.height && r1.y+r1.height >= r2.y &&
    r1.x <= r2.x+r2.width && r1.x+r1.width >= r2.x;

var {getSettings} = (()=>{
  const {Gio} = imports.gi;

  const Config = imports.misc.config;
  const Extension = imports.misc.extensionUtils.getCurrentExtension();

  const getSettings = () =>{
    const settings_schema = Gio.SettingsSchemaSource.new_from_directory(
      Extension.dir.get_child('schemas').get_path(),
      Gio.SettingsSchemaSource.get_default(),
      false
    ).lookup('org.gnome.shell.extensions.my-setup', false);

    if (settings_schema == null) throw new Error('Schema missing.');

    return new Gio.Settings({settings_schema});
  };

  return {getSettings};
})();
