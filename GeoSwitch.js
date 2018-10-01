/* global imports */

// a.get_meta_window().get_frame_rect().height
// global.get_window_actors().map(w => w.metaWindow.get_title())

var {Pointer} = (()=>{
  const {Gdk} = imports.gi;
  const Me = imports.misc.extensionUtils.getCurrentExtension();
  const {Utils: {DisplayWrapper}} = Me.imports;

  // let display = Gdk.Display.get_default();
  // let deviceManager = display.get_device_manager();
  // let pointer = deviceManager.get_client_pointer();
  // let [screen, pointerX, pointerY] = pointer.get_position();
  // pointer.warp(screen, 10, 10);


  class Pointer {
    static focus() {

      const windows = imports.gi.Meta.get_window_actors(DisplayWrapper.getScreen());
      const [x, y] = global.get_pointer();

      const cws = DisplayWrapper.getWorkspaceManager().get_active_workspace();

      for(let i = windows.length-1; i >= 0; --i) {
        const mw = windows[i].metaWindow;
        if (mw.get_window_type() !== 0 || mw.get_workspace() !== cws) continue;
        const rect = mw.get_frame_rect();
        if (rect.x > x || rect.y > y || rect.x+rect.width < x || rect.y+rect.height < y)
          continue;
        mw.focus(global.get_current_time());
        break;
      }


      // const display = Gdk.Display.get_default();
      // // const seat = display.get_default_seat();
      // // const pointer = seat.get_pointer();
      // // const win = pointer.get_last_event_window();
      // let deviceManager = display.get_device_manager();
      // let pointer = deviceManager.get_client_pointer();
      // const [screen, pointerX, pointerY] = pointer.get_position();
      // pointer.warp(screen, pointerX-10, pointerY-10);
      // // const res = pointer.get_window_at_position();
      // // if (win != null) {
      // //   log(win);
      // //   win.focus(global.get_current_time());
      // //   //       window.activate();
      // // }
    }
  }
  return {Pointer};
})();
