/* global imports log */

var {init, enable, disable} = (()=>{

  const {St} = imports.gi;

  const {main: Main, keyboard: {Keyboard}} = imports.ui;

  const Me = imports.misc.extensionUtils.getCurrentExtension();
  const {Command, Nav, Tile, Utils: {DisplayWrapper}} = Me.imports;

  let commandManager, navManager, tileManager;

  let _originalLastDeviceIsTouchscreen;

  const _modifiedLastDeviceIsTouchscreen = ()=> false;

  const WorkspaceSwitcherPopup = imports.ui.workspaceSwitcherPopup;
  let globalSignals;

  let display, wsText;

  const workspaceChanged = ()=>{
    const cws = DisplayWrapper.getWorkspaceManager().get_active_workspace();

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

      commandManager = new Command.Manager();

      navManager = new Nav.Manager(commandManager);
      tileManager = new Tile.Manager(commandManager);

      wsText = new St.Label({ text: "", style_class: 'ws-text' });
      workspaceChanged();
      Main.panel._rightBox.insert_child_at_index(wsText, 0);
      globalSignals.push(DisplayWrapper.getWorkspaceManager()
                         .connect('workspace-switched', workspaceChanged));
    },

    disable() {
      Keyboard.prototype._lastDeviceIsTouchscreen = _originalLastDeviceIsTouchscreen;
      _originalLastDeviceIsTouchscreen = null;

      WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype.display = display;
      display = null;

      Main.panel._rightBox.remove_child(wsText);
      wsText.destroy(); wsText = undefined;

      navManager.destroy(); navManager = undefined;
      tileManager.destroy(); tileManager = undefined;
      commandManager.destroy(); commandManager = undefined;

      for (let i = 0; i < globalSignals.length; i++)
        DisplayWrapper.getScreen().disconnect(globalSignals[i]);
      globalSignals = undefined;
    },
  };

})();
