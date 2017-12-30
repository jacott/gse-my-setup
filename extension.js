/* global imports */

var {init, enable, disable} = (()=>{

  const {Keyboard} = imports.ui.keyboard;

  const Me = imports.misc.extensionUtils.getCurrentExtension();
  const {Nav} = Me.imports;

  let navManager;

  let _originalLastDeviceIsTouchscreen;

  const _modifiedLastDeviceIsTouchscreen = ()=> false;

  const WorkspaceSwitcherPopup = imports.ui.workspaceSwitcherPopup;

  let display;

  return {
    init() {},

    enable() {
      _originalLastDeviceIsTouchscreen = Keyboard.prototype._lastDeviceIsTouchscreen;
      Keyboard.prototype._lastDeviceIsTouchscreen = _modifiedLastDeviceIsTouchscreen;

      display = WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype.display;
      WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype.display = ()=>{};


      navManager = new Nav.Manager();
    },

    disable() {
      Keyboard.prototype._lastDeviceIsTouchscreen = _originalLastDeviceIsTouchscreen;
      _originalLastDeviceIsTouchscreen = null;

      WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype.display = display;
      display = null;

      navManager.destroy();

      navManager=null;
    },
  };

})();
