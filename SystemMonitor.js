/* global imports log */

(()=>{
  const {St, Gio, GLib, Clutter} = imports.gi;
  const {panel} = imports.ui;

  const Me = imports.misc.extensionUtils.getCurrentExtension();
  const {color_from_string} = Me.imports.Utils;

  const DATA_LENGTH = 20;
  const Background = color_from_string("black");
  const Foreground = color_from_string("cyan");

  const getStatStream = (mon)=>{
    if (mon._statStream.is_closed()) {
      mon._statStream = mon._stat.read(null);
    } else {
      mon._statStream.seek(0, GLib.SeekType.SET, null);
    }
    return mon._statStream;
  };


  class SystemMonitor {
    constructor() {
      let ba = new Uint8Array(20);
      this._stat = Gio.File.new_for_path('/proc/stat');
      this._statStream = this._stat.read(null);
      this._cpuTotal = 0;
      this._cpuIdle = 0;
      this.actor = new St.DrawingArea({style_class: 'ms-chart', reactive: false});
      this.actor.set_width(Math.round(panel.PANEL_ICON_SIZE * 12 / 4));
      this.actor.set_height(Math.round(panel.PANEL_ICON_SIZE));
      this.actor.connect('repaint', ()=>{this._draw()});
      this.data = new Uint8Array(DATA_LENGTH);
      this.data_pos = 0;
      this.addIdle();
      this.data_pos = 0;
      GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, ()=> this.poll());
    }

    poll() {
      if (this.actor === void 0) return false;
      this.addIdle();
      this.actor.queue_repaint();
      return true;
    }

    addIdle() {
      const stream = getStatStream(this);
      const parts = Gio.DataInputStream.new(stream).read_line_utf8(null)[0].slice(5).split(' ');
      const idle = +parts[3];
      let total = 0;
      for(let i = parts.length-1; i != -1; --i) total += +parts[i];
      this.data[this.data_pos] = 100 - Math.round(100*(idle - this._cpuIdle)/(total - this._cpuTotal));
      this.data_pos = (this.data_pos + 1) % DATA_LENGTH;
      this._cpuTotal = total;
      this._cpuIdle = idle;
    }

    _draw() {
      const [width, height] = this.actor.get_surface_size();
      const cr = this.actor.get_context();
      Clutter.cairo_set_source_color(cr, Background);
      cr.rectangle(0, 0, width, height);
      cr.fill();

      const mult = width/DATA_LENGTH;
      const {data, data_pos} = this;
      const wmult = width/DATA_LENGTH, hmult = height*0.01;
      cr.moveTo(0, height);
      for(let i = 0; i < DATA_LENGTH; ++i) {
        const y = data[(data_pos+i)%DATA_LENGTH]*hmult;
        const x = i*wmult;
        cr.lineTo(x, height - y);
      }
      cr.lineTo((DATA_LENGTH-1)*wmult, height);
      cr.closePath();
      Clutter.cairo_set_source_color(cr, Foreground);
      cr.fill();

    }

    destroy() {
      this.actor.destroy();
      this.actor = void 0;
      this._statStream.close(null);
    }
  }

  Me.imports.SystemMonitor = SystemMonitor;
})();
