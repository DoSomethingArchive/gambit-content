'use strict';

const v8Profiler = require('v8-profiler');
const EventEmitter = require('events');

/**
 * The Profiler
 */
class Profiler extends EventEmitter {

  /**
   * Create a new Profiler.
   *
   * @params {Object} options - Object with the profiler configuration options
   *                  interval: The amount in milliseconds to wait before taking snapshots
   *                  tag: custom identifier
   *                  extension: The extension of the file. It must be of the type:
   *                             .cpuprofile, .heapsnapshot, .heapprofile, or .heaptimeline
   */
  constructor(options) {
    super();
    this.extension = this.sanitize(options.extension || '');
    this.tag = this.sanitize(options.tag || '');
    this.interval = parseInt(options.interval, 10);
    this.namePrefix = this.sanitize(options.namePrefix || '');
    this.intervalId = null;
    this.on('takeSnapshot', this.takeSnapshot);
  }

  /**
   * Emits the intervalStarted event and calls the startInterval func
   */
  start() {
    this.startInterval();
    this.emit('intervalStarted');
  }

  /**
   * Emits the intervalStopped event and calls the stopInterval func
   */
  stop() {
    this.stopInterval();
    this.emit('intervalStopped');
  }

  /**
   * Stores the value of the intervalId for later recycling
   *
   * @return {Number} - interval id
   */
  startInterval() {
    this.intervalId = setInterval(() => {
      this.emit('takeSnapshot');
    }, this.interval);
    return this.intervalId;
  }

  /**
   * clears the Interval
   */
  stopInterval() {
    clearInterval(this.intervalId);
  }

  /**
   * Emits the snapshotCreated event and sends the captured snapshot as an argument
   */
  takeSnapshot() {
    const name = this.getName();
    this.emit('snapshotCreated', v8Profiler.takeSnapshot(name));
  }

  /**
   * Utility Functions
   */

  /**
   * Gets the epoch timestamp
   *
   * @return {Number} - the number of milliseconds since 1970/01/01
   */
  getTimestamp() {
    const date = new Date();
    return date.getTime();
  }

  /**
  * It generates the name of the snapshot.
  * The snapshot's name follows the next pattern:
  *    <PREFIX>_<TAG>_<EPOCH TIMESTAMP>
  *    Example: v8.heap.snapshot_iamatag_1491242331638
  *
  * @param {Number} - optional timestamp
  *
  * @returns {String}
  */
  getName(timestamp) {
    const _timestamp = timestamp || this.getTimestamp();
    return `${this.namePrefix}_${this.tag}_${_timestamp}.${this.extension}`;
  }

  /**
   *  Removes characters considered unsafe
   *  http://stackoverflow.com/questions/7116450/what-are-valid-s3-key-names-that-can-be-accessed-via-the-s3-rest-api
   *
   * @param  {String} string - String to be sanitized
   * @return {String} - Sanitized string
   */
  sanitize(string) {
    return string.replace(/[&@:,$=+?;\s^`><{}[\]#%~|\\"]/ig, '');
  }
}

module.exports = Profiler;
