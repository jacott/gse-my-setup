/* global imports */
const {Meta, Clutter} = imports.gi;

var pointInRect = (x, y, rect)=> rect.x < x && rect.y < y &&
    rect.x+rect.width > x && rect.y+rect.height > y;

var rectIntersect = (a, b, margin=0)=> a.y+margin <= b.y+b.height &&
    a.y+a.height >= b.y+margin &&
    a.x+margin <= b.x+b.width && a.x+a.width >= b.x+margin;

var rectEnclosed = (a, b, margin=0)=> a.y-margin > b.y &&
    a.y+a.height+margin < b.y+b.margin &&
    a.x-margin > b.x &&
    a.x+a.width+margin < b.x+b.margin;

var wsWindows = function *(cws=DisplayWrapper.getWorkspaceManager().get_active_workspace()) {
  const windows = cws.list_windows();

  for(let i = windows.length-1; i >= 0; --i) {
    const mw = windows[i];
    if (mw.get_window_type() == 0 && mw.showing_on_its_workspace())
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
  getScreen: ()=> global.display,

  getWorkspaceManager: ()=>  global.workspace_manager,

  getMonitorManager: ()=> Meta.MonitorManager.get(),
};

var color_from_string = color => Clutter.Color.from_string(color)[1];
