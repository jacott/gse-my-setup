/* global imports log */

var {init, enable, disable} = (()=>{

  const {St} = imports.gi;

  const {main: Main, keyboard: {Keyboard}} = imports.ui;

  const Me = imports.misc.extensionUtils.getCurrentExtension();
  const {SystemMonitor, SoundControl, CommandManager, NavManager, TileManager, Utils: {DisplayWrapper}} = Me.imports;

  let commandManager, navManager, tileManager;

  // let _originalLastDeviceIsTouchscreen;

  const _modifiedLastDeviceIsTouchscreen = ()=> false;

  const WorkspaceSwitcherPopup = imports.ui.workspaceSwitcherPopup;
  let globalSignals;

  let display, wsText, sysMon, soundCtrl;

  const workspaceChanged = ()=>{
    const cws = DisplayWrapper.getWorkspaceManager().get_active_workspace();

    wsText.text = ""+(cws.index()+1);
  };


  return {
    init() {},

    enable() {
      globalSignals = [];
      // _originalLastDeviceIsTouchscreen = Keyboard.prototype._lastDeviceIsTouchscreen;
      // Keyboard.prototype._lastDeviceIsTouchscreen = _modifiedLastDeviceIsTouchscreen;

      display = WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype.display;
      WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype.display = ()=>{};

      commandManager = new CommandManager();

      navManager = new NavManager(commandManager);
      tileManager = new TileManager(commandManager);
      soundCtrl = new SoundControl(commandManager);

      wsText = new St.Label({ text: "", style_class: 'ws-text' });
      workspaceChanged();
      Main.panel._rightBox.insert_child_at_index(wsText, 0);
      globalSignals.push(DisplayWrapper.getWorkspaceManager()
                         .connect('workspace-switched', workspaceChanged));
      sysMon = new SystemMonitor;
      Main.panel._rightBox.insert_child_at_index(sysMon.actor, 0);
      Main.panel._rightBox.insert_child_at_index(soundCtrl.actor, 0);
    },

    disable() {
      // Keyboard.prototype._lastDeviceIsTouchscreen = _originalLastDeviceIsTouchscreen;
      // _originalLastDeviceIsTouchscreen = null;

      WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype.display = display;
      display = null;

      Main.panel._rightBox.remove_child(wsText);
      wsText.destroy(); wsText = void 0;
      sysMon.destroy(); sysMon = void 0;
      soundCtrl.destroy(); soundCtrl = void 0;

      navManager.destroy(); navManager = void 0;
      tileManager.destroy(); tileManager = void 0;
      commandManager.destroy(); commandManager = void 0;

      for (let i = 0; i < globalSignals.length; i++)
        DisplayWrapper.getScreen().disconnect(globalSignals[i]);
      globalSignals = void 0;
    },
  };

})();
