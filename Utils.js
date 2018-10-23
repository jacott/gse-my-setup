/* global imports */
const {Meta} = imports.gi;

var pointInRect = (x, y, rect)=> rect.x < x && rect.y < y &&
    rect.x+rect.width > x && rect.y+rect.height > y;

var rectIntersect = (r1, r2, margin=0)=> r1.y+margin <= r2.y+r2.height &&
    r1.y+r1.height >= r2.y+margin &&
    r1.x+margin <= r2.x+r2.width && r1.x+r1.width >= r2.x+margin;

var wsWindows = function *(
  cws=DisplayWrapper.getWorkspaceManager().get_active_workspace(), hidden=false
) {
  const windows = cws.list_windows();

  for(let i = windows.length-1; i >= 0; --i) {
    const mw = windows[i];
    if (mw.get_window_type() == 0 && (hidden || ! mw.is_hidden()))
      yield mw;
  }
};

var moveResize = (mw, x, y, w, h)=>{
  const m = mw.get_maximized();
  if (m != 0) mw.unmaximize(m);
  mw.move_resize_frame(true, x, y, w, h);
};

var moveResizeRect = (mw, rect)=>{
  const m = mw.get_maximized();
  if (m != 0) mw.unmaximize(m);
  mw.move_resize_frame(true, rect.x, rect.y, rect.width, rect.height);
};

var {getSettings} = (()=>{
  const {Gio} = imports.gi;

  const Config = imports.misc.config;
  const Extension = imports.misc.extensionUtils.getCurrentExtension();

  let _settings;

  const getSettings = () =>{
    if (_settings !== undefined) return _settings;

    const settings_schema = Gio.SettingsSchemaSource.new_from_directory(
      Extension.dir.get_child('schemas').get_path(),
      Gio.SettingsSchemaSource.get_default(),
      false
    ).lookup('org.gnome.shell.extensions.my-setup', false);

    if (settings_schema == null) throw new Error('Schema missing.');

    return _settings = new Gio.Settings({settings_schema});
  };

  return {
    getSettings,
  };
})();

var DisplayWrapper = {
  getScreen() {
    return global.screen || global.display;
  },

  getWorkspaceManager() {
    return global.screen || global.workspace_manager;
  },

  getMonitorManager() {
    return global.screen || Meta.MonitorManager.get();
  },
};
