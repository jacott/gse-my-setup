/* global imports */

const Me = imports.misc.extensionUtils.getCurrentExtension();
const {Nav} = Me.imports;

// We declare this with var so it can be accessed by other extensions in
// GNOME Shell 3.26+ (mozjs52+).

var navManager;

function init() {
}

function enable() {
  navManager = new Nav.Manager();
}

function disable() {
  navManager.destroy();

  navManager=null;
}
