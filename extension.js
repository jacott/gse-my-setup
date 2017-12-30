/* global imports */

const {Keyboard} = imports.ui.keyboard;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const {Nav} = Me.imports;

// We declare this with var so it can be accessed by other extensions in
// GNOME Shell 3.26+ (mozjs52+).

var navManager;

let _originalLastDeviceIsTouchscreen;

const _modifiedLastDeviceIsTouchscreen = ()=> false;

function init() {
}

function enable() {
  _originalLastDeviceIsTouchscreen = Keyboard.prototype._lastDeviceIsTouchscreen;
  Keyboard.prototype._lastDeviceIsTouchscreen = _modifiedLastDeviceIsTouchscreen;

  navManager = new Nav.Manager();
}

function disable() {
  Keyboard.prototype._lastDeviceIsTouchscreen = _originalLastDeviceIsTouchscreen;
  _originalLastDeviceIsTouchscreen = null;

  navManager.destroy();

  navManager=null;
}
