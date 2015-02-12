exports.command = function (breakpoint) {
  var dimensions = {
    "desktop": [1024, 768],
    "tablet" : [768, 1024],
    "mobile" : [360, 640]
  }[breakpoint];

  this.resizeWindow.apply(this, dimensions);

  return this;
};
