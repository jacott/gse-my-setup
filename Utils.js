import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import Meta from 'gi://Meta';
import Clutter from 'gi://Clutter';

export const pointInRect = (x, y, rect) => rect.x < x && rect.y < y &&
  rect.x + rect.width > x && rect.y + rect.height > y;

export const rectIntersect = (a, b, margin=0) => a.y + margin <= b.y + b.height &&
  a.y + a.height >= b.y + margin &&
  a.x + margin <= b.x + b.width && a.x + a.width >= b.x + margin;

export const rectEnclosed = (a, b, margin=0) => a.y - margin > b.y &&
  a.y + a.height + margin < b.y + b.margin &&
  a.x - margin > b.x &&
  a.x + a.width + margin < b.x + b.margin;

export const copyRect = (r) => ({x: r.x, y: r.y, width: r.width, height: r.height});

export const wsWindows = function *(cws=DisplayWrapper.getWorkspaceManager().get_active_workspace(), monitor) {
  const windows = cws.list_windows();

  for (let i = windows.length - 1; i >= 0; --i) {
    const mw = windows[i];
    if (mw.get_window_type() == 0 && mw.showing_on_its_workspace() &&
      (monitor === undefined || mw.get_monitor() === monitor)) {
        yield mw;
      }
  }
}

export const moveResize = (mw, x, y, w, h) => {
  const m = mw.get_maximized();
  if (m != 0) mw.unmaximize(m);
  mw.move_resize_frame(true, x, y, w, h);
  mw.move_frame(true, x, y);
};

export const moveResizeRect = (mw, rect) => {moveResize(mw, rect.x, rect.y, rect.width, rect.height)};

export const getSettings = () => {
  // const extensionObject = Extension.lookupByUUID('my-setup@geoffjacobsen.gmail.com');
  const extensionObject = Extension.lookupByURL(import.meta.url);

  return extensionObject.getSettings();
};


export const DisplayWrapper = {
  getScreen: () => global.display,

  getWorkspaceManager: () => global.workspace_manager,

  getMonitorManager: () => Meta.MonitorManager.get(),
};

export const color_from_string = (color) => Clutter.Color.from_string(color)[1];
