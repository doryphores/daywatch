var events = require('events'),
    util   = require('util'),
    mkdirp = require('mkdirp'),
    gm     = require('gm');

function ViewportScreenshotCommand () {
  events.EventEmitter.call(this);
}

util.inherits(ViewportScreenshotCommand, events.EventEmitter);

ViewportScreenshotCommand.prototype.command = function(screenshotPath, callback) {
  var self = this,
      dirPath = screenshotPath.replace(/\/[^\/]+\.png$/, '/');

  // Get viewport dimensions
  self.api.execute(getViewportDimensions, function (res) {
    var viewport = res.value;

    // Take a screenshot of the page
    self.api.screenshot(false, function (res) {
      // Ensure the path exists
      mkdirp(dirPath, function () {
        var image = gm(new Buffer(res.value, 'base64'));

        image.size(function (err, size) {
          // Crop the image if needed
          // TODO: this does not work for high DPI screens
          if (size.height != viewport.height) {
            image = this.crop(
              viewport.width,
              viewport.height,
              viewport.left,
              viewport.top
            );
          }

          // Save the image
          image.write(screenshotPath, function () {
            if (callback) {
              callback.call(self, screenshotPath);
            }

            self.emit('complete');
          });
        });
      });
    });
  });

  return this;
};

module.exports = ViewportScreenshotCommand;

// Helper methods

var getViewportDimensions = function() {
  var result = {
    top   : 0,
    left  : 0,
    width : Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
    height: Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
  };

  if (typeof window.pageYOffset != 'undefined') {
    result.left = window.pageXOffset;
    result.top  = window.pageYOffset;
  } else if (typeof document.documentElement.scrollTop != 'undefined' && document.documentElement.scrollTop > 0) {
    result.left = document.documentElement.scrollLeft,
    result.top  = document.documentElement.scrollTop
  } else if (typeof document.body.scrollTop != 'undefined') {
    result.left = document.body.scrollLeft,
    result.top  = document.body.scrollTop
  }
  return result;
};
