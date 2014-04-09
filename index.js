var fsPath = require('path'),
    fs = require('fs'),
    corredor = require('corredor-js-client');

var DEFAULT_LOCATION = fsPath.join(process.cwd(), 'b2g');

/**
 * Host interface for marionette-js-runner.
 *
 * TODO: I think this API is much more sane then the original
 *       |spawn| interface but we also need to do some refactoring
 *       in the mozilla-profile-builder project to improve the apis.
 *
 * @param {Object} [options] for host see spawn for now.
 */
function Host(options) {
  // TODO: host api should have some concept of a "asset" directory
  //       where we can stuff b2g-desktop without saving it in node_modules or
  //       cwd.
  this.options = options || {};
  this.options.runtime = this.options.runtime || DEFAULT_LOCATION;

  this.runner = new corredor.ExclusivePair();
  this.runner.connect('ipc:///tmp/corredor_worker');
}

/**
 * Immutable metadata describing this host.
 *
 * @type {Object}
 */
Host.metadata = Object.freeze({
  host: 'b2g-desktop'
});

Host.prototype = {
  /**
   * Reference to b2g-desktop process.
   *
   * @type {ChildProcess}
   * @private
   */
  _process: null,

  /**
   * Starts the b2g-desktop process.
   *
   * @param {String} profile path.
   * @param {Object} [options] settings provided by caller.
   * @param {Function} callback [Error err].
   */
  start: function(profile, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = null;
    }

    var userOptions = {};

    for (var key in options) {
      userOptions[key] = options[key];
    }
    userOptions.profile = userOptions.profile || profile;
    userOptions.product = userOptions.product || 'b2g';

    function done(data) {
      callback();
    }

    this.runner.registerAction('ready_start', done);
    this.runner.send({'action': 'start_runner',
                      'argv': userOptions.argv,
                      'profile': userOptions.profile,
                      'product': userOptions.product,
                      'target': this.options.runtime,
                      'url': userOptions.url});
  },

  /**
   * Stop the currently running host.
   *
   * @param {Function} callback [Error err].
   */
  stop: function(callback) {
    function done(data) {
      callback();
    }
    this.runner.registerAction('ready_stop', done);
    this.runner.send({'action': 'stop_runner'});
  },

  /**
   * Shutdown the currently running host.
   *
   * @param {Function} callback [Error err].
   */
  shutdown: function(callback) {
    var self = this;
    function cleanup() {
      self.runner.close();
      callback();
    }

    this.stop(cleanup);
  }
};

module.exports = Host;
