var events   = require('events'),
    util     = require('util'),
    fs       = require('fs'),
    path     = require('path'),
    resemble = require('node-resemble-js'),
    Logger   = require('nightwatch/lib/util/logger');

function Assertion() {
  events.EventEmitter.call(this);
  this.cb = null;
}

util.inherits(Assertion, events.EventEmitter);

Assertion.prototype.command = function(name, viewportOnly) {
  this.expected = null;
  this.viewportOnly = (viewportOnly === true);
  this.compare(name);
  return this;
};

Assertion.prototype.compare = function(name) {
  var self = this,
      screenshotPaths = this.computePaths(name),
      command = this.viewportOnly ? 'viewportScreenshot' : 'saveScreenshot';

  // Take a screenshot
  this.api[command](screenshotPaths.new, function () {
    var msg,
        passed = true;

    // Does a baseline image exist?
    fs.exists(screenshotPaths.baseline, function (exists) {
      if (exists) {
        msg = "Comparing <" + name + "> screenshot against baseline."
        // Compare screenshot against baseline
        resemble(screenshotPaths.new)
          .compareTo(screenshotPaths.baseline)
          .onComplete(function (data) {
            passed = parseFloat(data.misMatchPercentage, 10) < 0.05 &&
              data.isSameDimensions;
            if (passed) {
              msg += " Screenshot matches baseline.";
            } else {
              msg += " Change detected";
              if (!data.isSameDimensions) {
                msg += " (dimensions are different)."
              } else {
                msg += " (" + data.misMatchPercentage + "%).";
              }
              // Write diff image to disk
              data
                .getDiffImage()
                .pack()
                .pipe(fs.createWriteStream(screenshotPaths.diff));
            }
            self.client.assertion(
              passed,
              undefined,
              undefined,
              msg,
              self.abortOnFailure
            );
            self.emit('complete');
          });
      } else {
        msg = String.fromCharCode(10010) + "  No baseline found for <" + name + ">. Saving screenshot as baseline.";
        if (self.client.options.output) {
          console.log(Logger.colors.brown(msg));
        }
        // Save baseline image
        fs.rename(screenshotPaths.new, screenshotPaths.baseline);
        self.emit('complete');
      }
    });
  });
};

Assertion.prototype.computePaths = function (name) {
  var paths = {},
      basename = path.join(
    'screenshots',
    this.api.currentTest.module,
    parameterize([
      this.api.capabilities.platform,
      this.api.capabilities.browserName,
      this.api.capabilities.version
    ].join('_')),
    parameterize(name)
  );

  ['baseline', 'new', 'diff'].forEach(function (type) {
    paths[type] = [basename, type, 'png'].join('.');
  });

  return paths;
}

module.exports = Assertion;

// Helpers

var parameterize = function (str) {
  return str.toLowerCase().replace(/\s+/g, '_');
};
