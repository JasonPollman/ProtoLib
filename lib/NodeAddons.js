'use strict';

var exec   = require('child_process').exec,
    os     = require('os'),
    crypto = require('crypto'),
    path   = require('path');

module.exports = function (JLib) {
    /**
     * The user home directory
     * @type {String}
     */
    JLib.USER_HOME = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];

    /**
     * The path to the user's temp directory
     * @type {String}
     */
    JLib.TMPDIR = os.tmpdir();

    /**
     * The process arguments, all pretty like from minimist.
     * @type {Object}
     */
    JLib.ARGS = require('minimist')(process.argv.slice(2), { boolean: ['s', 'd', 'debug'] });

    /**
     * Whether or not we got the debug flag
     * @type {Boolean}
     */
    JLib.DEBUG = !!JLib.ARGS.debug;

    /**
     * The process environment
     * @type {String}
     */
    JLib.ENV = typeof JLib.ARGS.env === 'string' ? JLib.ARGS.env : typeof process.env.NODE_ENV === 'string' ? process.env.NODE_ENV : 'dev';

    /**
     * A reference to the JPCConsole
     * @constructor
     */
    JLib.Console = require('jpc-console');

    /**
     * Generate a hash from a string
     * @param {String} [algorithm='md5'] The algorithm to hash the string with
     * @returns {String} The hashed string
     * @function
     */
    JLib._string.hash = function hash (algorithm) {
        JLib.performWithCurrent(function (s) {
            return crypto.createHash(typeof algorithm === 'string' ? algorithm : 'md5').update(s).digest('hex');
        });
    };

    /**
     * Generate a md5 hash from a string
     * @returns {String} The md5 hashed string
     * @function
     */
    JLib._string.md5 = function md5 () {
        JLib.performWithCurrent(function (s) {
            return s.hash('md5');
        });
    };

    /**
     * Adjusts a string to fit within the confines of process.stdout.columns without breaking words.
     * @param {Number=} [padleft=0] The number of columns to pad the string on the left
     * @param {Number=} [padright=0] The number of columns to pad the string on the right
     * @param {Boolean=} omitFirst If true, the first line will not be padded left
     * @return {String} The string adjusted and padded for the stdout.
     * @function
     */
    JLib._string.wordWrapForTTY = function wordWrapForTTY (padleft, padright, omitFirst) {
        JLib.performWithCurrent(function (s) {
            return s[JLib.PROTO_IDENTIFIER].wordWrapToLength(process.stdout.columns, padleft, padright, omitFirst);
        });
    };

    /**
     * Generate a hash from an object. If the object is non-circular it will be stringified, otherwise an error
     * will be thrown.
     * @returns {String} The md5 hash of the object
     * @function
     */
    JLib._object.hash = function hash (algorithm) {
        JLib.performWithCurrent(function (o) {
            JSON.stringify(o).hash(algorithm || 'md5');
        });
    };

    /**
     * Generate a md5 hash from an object. If the object is non-circular it will be stringified, otherwise an error
     * will be thrown.
     * @returns {String} The md5 hash of the object
     * @function
     */
    JLib._object.md5 = function md5 () {
        JLib.performWithCurrent(function (o) {
            JSON.stringify(o).hash('md5');
        });
    };

    /**
     * Returns the byte size of an object
     * @returns {Number} The byte size of the object
     * @function
     */
    JLib._object.bytes = function bytes () {
        JLib.performWithCurrent(function (o) {
            return Buffer.byteLength(o, 'utf8');
        });
    };

    /**
     * List the process path with the given PID
     * @param {String|Number} pid The pid to get the path for
     * @return {Promise<Error|String>} The stdout of the exec process (the pid's path), or an Error, if one occured.
     * @todo Windows
     */
    JLib.getProcessPathByPID = function getProcessPathByPID (pid, done) {
        done = arguments[JLib.PROTO_IDENTIFIER].last() instanceof Function ? arguments[JLib.PROTO_IDENTIFIER].last() : JLib.NULLF;
        var e;

        return new Promise(function (resolve, reject) {
            if(pid && pid.isNumeric()) {
                switch(os.platform) {
                    default:
                        exec('ps -o comm= ' + pid, function (err, stdout, stderr) {
                            if(err || stderr) {
                                e = err || new Error(stderr);
                                reject(e);
                                done.call(JLib, e);
                            }
                            else if(stdout.trim() && stdout.trim() !== '') {
                                resolve(stdout);
                                done.call(JLib, stdout);
                            }
                            else {
                                e = new Error('Couln\'t find process with pid ' + pid);
                                reject(e);
                                done.call(JLib, e);
                            }
                        });
                }
            }
            else {
                e = new Error('JPCUtils.getProcessPathByPID: Invalid argument for parameter #0 (pid), expected a numeric value, but got: ' + typeof pid);
                reject(e);
                done.call(JLib, e, null);
            }
        });
    };

    /**
     * Parses the special 'jpc' JSON config file
     * @param {String} source The jpc JSON config file path, or an object
     * @param {Object} user User passed options, which can overwrite the jpc config file
     * @return {Object<*>} Options based on the debug flag, the environment, etc. etc.
     */
    JLib.parseJPCConfigFile = function parseJPCConfigFile (source, user) {
        var jpc     = null,
            options = {};

        if(typeof source === 'string') {
            // Try to parse the jpc.json configuration file...
            try {
                jpc = require(path.resolve(source));
                if(typeof jpc !== 'object') throw new Error();
            }
            // Config file didn't exist, just pass back the user object, if we were given one...
            catch (e) {
                return typeof user === 'object' ? user : options;
            }
        }
        else if(typeof source === 'object') {
            jpc = source;
        }

        // Loop through the jpc config file and choose the correct option based on the the debug flag, environment, then default...
        (jpc || {})[JLib.PROTO_IDENTIFIER].each(function (c, k) {
            if(typeof c === 'object' && (c.default !== undefined || c[JLib.ENV] !== undefined  || (c.debug !== undefined && JLib.DEBUG))) {
                options[k] = JLib.DEBUG && c.debug !== undefined ? c.debug : c[JLib.ENV] ? c[JLib.ENV] : c.default;
                if(typeof options[k] === 'string') options[k] = options[k][JLib.PROTO_IDENTIFIER].tildeToHome();
            }
            else {
                options[k] = c;
            }
        });

        // Overwrite config file options, or other options with user specified options
        if(typeof user === 'object') user[JLib.PROTO_IDENTIFIER].each(function (u, k) { options[k] = u; });
        return options;
    };
};
