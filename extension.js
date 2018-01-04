/* global imports */

var {init, enable, disable} = (()=>{

  const {St} = imports.gi;

  const {main: Main, keyboard: {Keyboard}} = imports.ui;

  const Me = imports.misc.extensionUtils.getCurrentExtension();
  const {Nav} = Me.imports;

  let navManager;

  let _originalLastDeviceIsTouchscreen;

  const _modifiedLastDeviceIsTouchscreen = ()=> false;

  const WorkspaceSwitcherPopup = imports.ui.workspaceSwitcherPopup;
  let globalSignals;

  let display, wsText;

  const workspaceChanged = ()=>{
    const cws = global.screen.get_active_workspace();

    wsText.text = ""+(cws.index()+1);
  };


  return {
    init() {},

    enable() {
      globalSignals = [];
      _originalLastDeviceIsTouchscreen = Keyboard.prototype._lastDeviceIsTouchscreen;
      Keyboard.prototype._lastDeviceIsTouchscreen = _modifiedLastDeviceIsTouchscreen;

      display = WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype.display;
      WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype.display = ()=>{};

      navManager = new Nav.Manager();

      wsText = new St.Label({ text: "", style_class: 'ws-text' });
      workspaceChanged();
      Main.panel._rightBox.insert_child_at_index(wsText, 0);
      globalSignals.push(global.screen.connect('workspace-switched', workspaceChanged));
    },

    disable() {
      Keyboard.prototype._lastDeviceIsTouchscreen = _originalLastDeviceIsTouchscreen;
      _originalLastDeviceIsTouchscreen = null;

      WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype.display = display;
      display = null;

      Main.panel._rightBox.remove_child(wsText);
      wsText.destroy(); wsText = undefined;

      navManager.destroy(); navManager = undefined;


      for (let i = 0; i < globalSignals.length; i++)
        global.screen.disconnect(globalSignals[i]);
      globalSignals = undefined;
    },
  };

})();
