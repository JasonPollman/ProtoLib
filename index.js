'use strict';
/**
 * A utility library.
 * Modifies the prototype chains for the following objects: Object, String, Number, and Date!
 * @module JPCUtils
 */

/**
 * Determines if the JS engine is Node.js or not
 * @return {Boolean} True if Node.js, false otherwise
 */
function isNode () {
    return typeof module === 'object'         &&
           typeof module.exports === 'object' &&
           typeof process === 'object'        &&
           process.argv instanceof Array;
}

    /**
     * Whether we're using node.js or not
     * @return {Boolean} True if Node.js, false otherwise
     */
var IS_NODE = isNode(),

    /**
     * If false, invokeChainLibrary will be called, and the protoypes will have the utility
     * getter/setters/function added to them. Once invokeChainLibrary has been called this will
     * be set to true, so subsequent calls to invokeChainLibrary will do nothing.
     * @type {Boolean}
     */
    defined = false,
    exec, os, crypto, path;

if(IS_NODE) {
    exec   = require('child_process').exec;
    os     = require('os');
    crypto = require('crypto');
    path   = require('path');

    /**
     * Stores user created tokens
     * @type {Object}
     */
    var customTokens = {};

    /**
     * The user home directory
     * @type {String}
     */
    exports.USER_HOME = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];

    /**
     * The path to the user's temp directory
     * @type {String}
     */
    exports.TMPDIR = os.tmpdir();

    /**
     * A null function, that does nothing.
     * @function
     */
    exports.NULLF = function NullFunction () {};

    /**
     * The process arguments, all pretty like from minimist.
     * @type {Object}
     */
    exports.ARGS = require('minimist')(process.argv.slice(2), { boolean: ['s', 'd', 'debug'] });

    /**
     * Whether or not we got the debug flag
     * @type {Boolean}
     */
    exports.DEBUG = !!exports.ARGS.debug;

    /**
     * The process environment
     * @type {String}
     */
    exports.ENV = typeof exports.ARGS.env === 'string' ? exports.ARGS.env : typeof process.env.NODE_ENV === 'string' ? process.env.NODE_ENV : 'dev';

    /**
     * A reference to the JPCConsole
     * @constructor
     */
    exports.Console = require('jpc-console');

    /**
     * A replacer function for JSON, to replace functions with '[Function (function name|anonymous)]'. A callback for
     * JSON.stringify. @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
     */
    exports.JSONFunctionReplacer = function JSONFunctionReplacer (key, value) {
        if(value instanceof Function) return '[Function: ' + (value.name || 'anonymous') + ']';
        return value;
    };

    /**
     * Returns 'enabled' if the value of 'i' evaluates to true, 'disabled otherwise'
     * @param {*} i The thingy to evaluate
     * @return {String} Either 'enabled' or 'disabled'
     */
    exports.enabledOrDisabled = function enabledOrDisabled (i) {
        return i ? 'enabled' : 'disabled';
    };

    /**
     * Replaces string tokens ([.*]) with token values
     * @param {String} s The string containing tokens to replace
     * @return {String} The token-replaced string
     */
    exports.replaceStringTokens = function replaceStringTokens (s) {
        if(typeof s === 'string') {
            s = s.replace(/\[\$DATE-TIME-24]/g , new Date().toLocaleString('en-US', { hour12: false }))
             .replace(/\[\$DATE-TIME]/g    , new Date().toLocaleString())
             .replace(/\[\$NOW]/g          , Date.now().toString())
             .replace(/\[\$TIME]/g         , new Date().toLocaleTimeString())
             .replace(/\[\$DATE]/g         , new Date().toLocaleDateString())
             .replace(/\[\$(HOME|~)]/g     , exports.USER_HOME.withoutTrailingSlash())
             .replace(/\[\$TMPDIR]/g       , exports.TMPDIR);
        }

        for(var i in customTokens) {
            if(customTokens.hasOwnProperty(i))
                s = s.replace(new RegExp('\\[\\$' + customTokens[i].name + ']', 'g'), customTokens[i].value);
        }
        return s;
    };

    /**
     * Create a user defined string token that will be replace with the specified value when JPCUtils.replaceStringTokens is called.
     * <strong>Note: All token names will be uppercased and prefixed with a dollar sign ($)</strong><br>
     * For example, creating a token named 'example' or 'EXAMPLE' or 'Example' will replace the string [$EXAMPLE] with the given value.<br><br>
     * Tokens can overwrite other tokens, by using the same name, converted to uppercase. So creating a token named 'example'
     * after creating a token named 'ExAmPlE' will overwrite the first.
     * @param {String} named The name of the string token
     * @param {String} withValue The value to replace the string token with
     * @return {JPCUtils} The current JPCUtils instance
     */
    exports.createToken = function createToken (named, withValue) {
        if(typeof named !== 'string')
            throw new Error('JPCUtils.createToken expected argument #0 (named) to be a string, got: ' + typeof named);

        if(typeof value !== 'string')
            throw new Error('JPCUtils.createToken expected argument #1 (withValue) to be a string, got: ' + typeof withValue);

        named = named.toUpperCase();
        customTokens[named] = { name: named, value: withValue };
        return exports;
    };

    /**
     * Creates a single arguments string from an object
     * @param {Object<String>} o The object to convert to an arguments string
     * @param {Boolean=} [produceArray=false] If true, an array of arguments will be returned, otherwise a string
     * (an array joined by ' ') will be returned.
     * @return {String} The arguments string
     */
    exports.generateArgumentsStringFromObject = function generateArgumentsStringFromObject (o, produceArray) {
        if(o === undefined || o === null || o instanceof Function) return [];
        if(typeof o === 'string' || typeof o === 'number') return [o.toString()];

        var args = [];
        if(o instanceof Array) {
            o.each(function (val) { args.push(val.toString()); });
            return args;
        }

        o.each(function (val, key) {
            if(key === '_' && val instanceof Array) {
                args = args.concat(val);
            }
            else {
                if(key.length === 1) args.push('-' + key, val); else args.push('--' + key + '=' + val.toString());
            }
        });
        return produceArray ? args : args.join(' ');
    };

    /**
     * An ArrayCollection object. Useful for iterating over async operations
     * @type {ArrayCollection}
     */
    exports.ArrayCollection = require(path.join(__dirname, 'lib', 'ArrayCollection'));

    /**
     * List the process path with the given PID
     * @param {String|Number} pid The pid to get the path for
     * @return {Promise<Error|String>} The stdout of the exec process (the pid's path), or an Error, if one occured.
     * @todo Windows
     */
    exports.getProcessPathByPID = function getProcessPathByPID (pid, done) {
        done = arguments.last() instanceof Function ? arguments.last() : exports.NULLF;
        var e;

        return new Promise(function (resolve, reject) {
            if(pid && pid.isNumeric()) {
                switch(os.platform) {
                    default:
                        exec('ps -o comm= ' + pid, function (err, stdout, stderr) {
                            if(err || stderr) {
                                e = err || new Error(stderr);
                                reject(e);
                                done.call(exports, e);
                            }
                            else if(stdout.trim() && stdout.trim() !== '') {
                                resolve(stdout);
                                done.call(exports, stdout);
                            }
                            else {
                                e = new Error('Couln\'t find process with pid ' + pid);
                                reject(e);
                                done.call(exports, e);
                            }
                        });
                }
            }
            else {
                e = new Error('JPCUtils.getProcessPathByPID: Invalid argument for parameter #0 (pid), expected a numeric value, but got: ' + typeof pid);
                reject(e);
                done.call(exports, e, null);
            }
        });
    };

    /**
     * Parses the special 'jpc' JSON config file
     * @param {String} source The jpc JSON config file path, or an object
     * @param {Object} user User passed options, which can overwrite the jpc config file
     * @return {Object<*>} Options based on the debug flag, the environment, etc. etc.
     */
    exports.parseJPCConfigFile = function parseJPCConfigFile (source, user) {
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
        (jpc || {}).each(function (c, k) {
            if(typeof c === 'object' && (c.default !== undefined || c[exports.ENV] !== undefined  || (c.debug !== undefined && exports.DEBUG))) {
                options[k] = exports.DEBUG && c.debug !== undefined ? c.debug : c[exports.ENV] ? c[exports.ENV] : c.default;
                if(typeof options[k] === 'string') options[k] = options[k].tildeToHome();
            }
            else {
                options[k] = c;
            }
        });

        // Overwrite config file options, or other options with user specified options
        if(typeof user === 'object') {
            user.each((u, k) => { options[k] = u; });
        }
        return options;
    };
}

/**
 * Sets prototype properties on various prototype objects.
 * @return {undefined}
 */
function invokeChainLibrary () {

    /**
     * @class String
     * @global
     */

    /**
     * @class Object
     * @global
     */

    /**
     * @class Array
     * @global
     */

    /**
     * @class Date
     * @global
     */

    /**
     * @class Number
     * @global
     */

    Object.defineProperties(String.prototype, {
        /**
         * Pads a string with 'delim' characters to the specified length. If the length is less than the string length,
         * the string will be truncated.
         * @function
         * @memberof String.prototype
         * @param {Number} length The length to pad the string to. If less that the length of the string, the string will
         * be returned. If less than the length of the string, the string will be sliced.
         * @param {String=} [delim=' '] The character to pad the string with.
         * @param {Boolean=} [pre=false] If true, the padding will be added to the beginning of the string, otherwise the padding
         * will be added to the end.
         * @returns {String} The padded string
         */
        pad: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function pad (length, delim, pre) {
                var s = this, i, thisLength = s.length;

                if(!delim)  delim = ' ';

                if(length === 0) {
                    return '';
                }
                else if(isNaN(parseInt(length, 10))) {
                    return s;
                }

                length = parseInt(length, 10);
                if(length < thisLength) return !pre ? s.slice(0, length) : s.slice(-length);

                if(pre) {
                    for(i = 0; i < length - thisLength; i++) s = delim + s;
                }
                else {
                    for(i = 0; i < length - thisLength; i++) s += delim;
                }

                return s;
            }
        },

        /**
         * Converts the tilde (~) at the beginning of a string to the user's home directory
         * @function
         * @memberof String.prototype
         * @returns {String} The string with the tilde expanded to the user's home folder
         */
        tildeToHome: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function regexpSafe () {
                return this.replace(/^(~|%HOME%)/, exports.USER_HOME);
            }
        },

        /**
         * Escapes RegExp special characters
         * @memberof String.prototype
         * @function
         * @returns {String} The regular expression safe string
         */
        regexpSafe: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function regexpSafe () {
                return this.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            }
        },

        /**
         * Generate a hash from a string
         * @memberof String.prototype
         * @function
         * @param {String} [algorithm='md5'] The algorithm to hash the string with
         * @returns {String} The hashed string
         */
        hash: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function hash (algorithm) {
                if(IS_NODE)
                    return crypto.createHash(typeof algorithm === 'string' ? algorithm : 'md5').update(this).digest('hex');
            }
        },

        /**
         * Generate a md5 hash from a string
         * @memberof String.prototype
         * @function
         * @returns {String} The md5 hashed string
         */
        md5: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function md5 () {
                if(IS_NODE) return this.hash('md5');
            }
        },

        /**
         * Strips the trailing slashes from a string
         * @memberof String.prototype
         * @function
         * @returns {String} The string without a trailing slash.
         */
        withoutTrailingSlash: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function withoutTrailingSlash () {
                if(IS_NODE) {
                    if(os.platform === 'win32') return this.replace(/\\+$/, '');
                    return this.replace(/\/+$/, '');
                }
            }
        },

        /**
         * Add a trailing slash to a string, if it doesn't already have one
         * @memberof String.prototype
         * @returns {String} The string without a trailing slash.
         * @function
         */
        withTrailingSlash: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function withTrailingSlash () {
                if(IS_NODE) return this.withoutTrailingSlash() + (os.platform === 'win32' ? '\\' : '/');
            }
        },

        /**
         * Capitalizes the first letter of a string.
         * @function
         * @memberof String.prototype
         * @return {String} The string with the first letter upper cased.
         */
        ucFirst: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function ucFirst () {
                return this.charAt(0).toUpperCase() + this.slice(1);
            }
        },

        /**
         * Converts a string to Title Case.
         * @function
         * @memberof String.prototype
         * @return {String} The title cased string.
         */
        titleCase: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function titleCase () {
                var s = [];
                this.split(' ').each((t, k, i) => { s.push((t.length > 3 || i === 0) ? t.ucFirst() : t); });
                return s.join(' ');
            }
        },

        /**
         * Splices a string, much like an array.
         * @function
         * @memberof String#splice
         * @return {String} The spliced string.
         */
        splice: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function splice (index, count, add) {
                return this.slice(0, index) + (add || '') + this.slice(index + count);
            }
        },

        /**
         * Adjusts a string to fit within the confines of process.stdout.columns without breaking words.
         * @function
         * @memberof String.prototype
         * @param {Number=} [padleft=0] The number of columns to pad the string on the left
         * @param {Number=} [padright=0] The number of columns to pad the string on the right
         * @param {Boolean=} omitFirst If true, the first line will not be padded left
         * @return {String} The string adjusted and padded for the stdout.
         */
        wordWrapForTTY: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function wordWrapForTTY (padleft, padright, omitFirst) {
                if(IS_NODE) {
                    if(padright === undefined && padleft) padright = padleft;

                    padleft  = !isNaN(parseInt(padleft,  10)) ? parseInt(padleft, 10)  : 0;
                    padright = !isNaN(parseInt(padright, 10)) ? parseInt(padright, 10) : 0;

                    var paddingLeft = '';
                    for(var n = 0; n < padleft;  n++) paddingLeft  += ' ';

                    var cols   = process.stdout.columns || 120,
                        arr    = this.split(' '),
                        item   = null,
                        len    = !omitFirst ? cols - padright - padleft : cols - padright,
                        str    = !omitFirst ? paddingLeft : '',
                        olen   = cols - padright - padleft;

                    while((item = arr.shift()) !== undefined) {
                        if(item.length < len) {
                            str += item + ' ';
                            len -= item.length + 1;
                        }
                        else if(item.length > olen) {
                            str += item.substring(0, len - 1) + '-\n' + paddingLeft;
                            arr.unshift(item.substring(len, item.length - 1));
                            len = cols - padright - padleft;
                        }
                        else {
                            str += '\n' + paddingLeft + item + ' ';
                            len = cols - padright - 1 - padleft - item.length;
                        }
                    }
                    return str;
                }
            }
        },

        /**
         * Return a truncated string with ellipses.
         * @function
         * @memberof String.prototype
         * @param {Number=} length The length of the desired string. If ommited, the strings original length will be used.
         * @param {String=} [place='back'] Possible values are 'front' and 'back'. Specifying 'front' will truncate the
         * string and add ellipses to the front, 'back' (or any other value) will add the ellipses to the back.
         * @param {String=} [ellipses='...'] The string value of the ellipses. Use this to add anything other than '...'
         * @returns {String} A truncated string with ellipses (if its length is greater than 'length')
         */
        ellipses: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function ellipses (length, place, ellipses) {
                if(isNaN(parseInt(length, 10))) length = this.length;
                if(length < 0) length = 0;

                ellipses = typeof ellipses === 'string' ? ellipses : '...';
                if(this.length <= length) return this;

                if(length <= ellipses.length) {
                    return ellipses.substring(0, length);
                }
                else if(!place || place !== 'front') {
                    return this.substr(0, length - ellipses.length) + ellipses;
                }
                else {
                    return ellipses + this.substr(0, length - ellipses.length);
                }
            }
        },

        /**
         * Uses OS X's say command to say the string.
         * @function
         * @memberof String.prototype
         * @param {Function=} done A callback for completion
         * @returns {String} The current string instance.
         */
        say: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function say (done) {
                if(IS_NODE && os.type().toLowerCase() === 'darwin') exec('say ' + this, done);
                return this;
            }
        },
    });

    Object.defineProperties(Date.prototype, {
        /**
         * Moves a date forward 'daysInTheFuture' days.
         * @function
         * @memberof Date.prototype
         * @param {Number} daysInTheFuture The number of days in the future to advance the date
         * @param {Boolean=} [adjustForWeekend=false] Whether or not the date should fall on a weekend day
         * @returns {Date} The date, adjusted the number of specified days.
         */
        advanceDays: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function advanceDays (daysInTheFuture, adjustForWeekend) {
                daysInTheFuture = daysInTheFuture && daysInTheFuture.isNumeric() ? daysInTheFuture : 1;
                this.setTime(this.getTime() + (daysInTheFuture * 86400000));

                if(adjustForWeekend && (this.getDay() === 0 || this.getDay() === 6)) {
                    while(this.getDay() === 0 || this.getDay() === 6)
                        this.setTime(this.getTime() + 86400000);
                }
                return this;
            }
        },

        /**
         * Moves a date forward 'monthsInTheFuture' days.
         * @function
         * @memberof Date.prototype
         * @param {Number} monthsInTheFuture The number of months in the future to advance the date
         * @param {Boolean=} [adjustForWeekend=false] Whether or not the date should fall on a weekend day
         * @returns {Date} The date, adjusted the number of specified months.
         */
        advanceMonths: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function advanceMonths (monthsInTheFuture, adjustForWeekend) {
                monthsInTheFuture = monthsInTheFuture && monthsInTheFuture.isNumeric() ? monthsInTheFuture : 1;
                this.setTime(this.getTime() + (monthsInTheFuture * 2629746000));

                if(adjustForWeekend && (this.getDay() === 0 || this.getDay() === 6)) {
                    while(this.getDay() === 0 || this.getDay() === 6)
                        this.setTime(this.getTime() + 86400000);
                }
                return this;
            }
        },

        /**
         * Moves a date forward 'yearsInTheFuture' days.
         * @function
         * @memberof Date.prototype
         * @param {Number} yearsInTheFuture The number of years in the future to advance the date
         * @param {Boolean=} [adjustForWeekend=false] Whether or not the date should fall on a weekend day
         * @returns {Date} The date, adjusted the number of specified years.
         */
        advanceYears: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function advanceYears (yearsInTheFuture, adjustForWeekend) {
                yearsInTheFuture = yearsInTheFuture && yearsInTheFuture.isNumeric() ? yearsInTheFuture : 1;
                this.setTime(this.getTime() + (yearsInTheFuture * 31536000000));

                if(adjustForWeekend && (this.getDay() === 0 || this.getDay() === 6)) {
                    while(this.getDay() === 0 || this.getDay() === 6)
                        this.setTime(this.getTime() + 86400000);
                }
                return this;
            }
        },

        /**
         * Returns the date in the yyyy-mm-dd format.
         * @function
         * @memberof Date.prototype
         * @param {String} [delim='-'] The delimiter to used the separate the date components (e.g. '-' or '.')
         * @returns {String} The date in the yyyy-mm-dd format.
         */
        yyyymmdd: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function yyyymmdd (delim) {
                delim = !delim ? '-' : delim === 'string' ? delim : '-';

                var dd   = this.getDate(),
                    mm   = this.getMonth() + 1,
                    yyyy = this.getFullYear();

                if(dd < 10) dd = '0' + dd;
                if(mm < 10) mm = '0' + mm;

                return yyyy + delim + mm + delim + dd;
            }
        }
    });

    Object.defineProperties(Object.prototype, {

        /**
         * Returns the object's key set.
         * @memberof Object.prototype
         * @function
         * @returns {Array<String|Number>} The object's key set
         */
        keyset : {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function keys () {
                return Object.keys(this);
            }
        },

        /**
         * Generate a md5 hash from an object. If the object is non-circular it will be stringified, otherwise an error
         * will be thrown.
         * @memberof Object.prototype
         * @function
         * @returns {String} The md5 hash of the object
         */
        md5: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function md5 () {
                if(IS_NODE) return JSON.stringify(this).hash('md5');
            }
        },

        /**
         * Returns the byte size of an object
         * @memberof Object.prototype
         * @function
         * @returns {Number} The byte size of the object
         */
        bytes : {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function bytes () {
                if(IS_NODE) return Buffer.byteLength(this, 'utf8');
            }
        },

        /**
         * Returns the 'size' or 'length' of an object.
         * <ul>
         *      <li> String   -> The string's length  </li>
         *      <li> Number   -> The number of digits </li>
         *      <li> Object   -> The number of keys   </li>
         *      <li> Array    -> The number of items  </li>
         *      <li> Function -> 1                    </li>
         * </ul>
         *
         * @function
         * @memberof Object.prototype
         * @returns {Number} The number of items within the object.
         */
        members: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function members () {
                switch(true) {
                    case this instanceof Array:
                    case typeof this === 'string':
                        return this.length;

                    case typeof this === 'object':
                        return Object.keys(this).length;

                    case typeof this === 'function':
                        return 1;

                    case typeof this === 'number':
                        return this.toString().length;

                    default:
                        return this;
                }
            }
        },

        /**
         * Determines if an object can be converted to a number.
         * @memberof Object.prototype
         * @function
         * @returns {Boolean} True if the object is numeric, false otherwise.
         */
        isNumeric: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function isNumeric () {
                return !isNaN(parseFloat(this)) && isFinite(this);
            }
        },

        /**
         * Determines if an object has no keys, if an array has no items, or if a string === ''.
         * @memberof Object.prototype
         * @function
         * @returns {Boolean} True if the object is 'empty', false otherwise.
         */
        isEmpty: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function isEmpty () {
                return this.members() === 0;
            }
        },

        /**
         * Convers an object to a number, if possible.
         * @memberof Object.prototype
         * @function
         * @returns {Number} The object as a float or NaN.
         */
        toNumber: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function toNumber () {
                return this.isNumeric ? parseFloat(this) : NaN;
            }
        },

        /**
         * Convers an object to an integer, if possible.
         * @memberof Object.prototype
         * @function
         * @returns {Number} The object as an integer or NaN.
         */
        toInteger: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function toInteger () {
                return this.isNumeric ? parseInt(this, 10) : NaN;
            }
        },

        /**
         * Creates a new array from the object
         * @returns {Array}
         * @memberof Object.prototype
         * @function
         */
        makeArray: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function makeArray () {
                var self = this, arr = [];

                if(self instanceof Array) return self;
                this.each(o => { arr.push(o); });
                return arr;
            }
        },

        /**
         * Returns a random array item, random object property, random character in a string, or random digit in a number.
         * @returns {*}
         * @memberof Object.prototype
         * @function
         */
        random: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function random () {
                if(typeof this === 'object') {
                    return this instanceof Array ?
                        this[Math.floor(Math.random() * this.length)] :
                        this[Object.keys(this)[Math.floor(Math.random() * Object.keys(this).length)]];
                }
                else if(typeof this === 'string' || typeof this === 'number') {
                    var val = this, negative = false;

                    if(this.length === 0) return '';
                    if(typeof this === 'number' && this < 0) {
                        negative = true;
                        val = Math.abs(val);
                    }

                    val = val.toString()[Math.floor(Math.random() * val.toString().length)];

                    if(typeof this === 'number') val = parseInt(val, 10);
                    return negative ? -val : val;
                }
                return this;
            }
        },

        /**
         * Invokes the callback 'f' for each property the object contains. If this is called
         * on a number or function, the object will be cast to a string.<br><br>
         * The callback `f` will be invoked with the following arguments:
         * <ul>
         * 	<li>value     - The value of the current object being iterated over</li>
         * 	<li>key       - The key of the current object (if an object, the index if an array)</li>
         * 	<li>iteration - The current iteration (same as key if a string or array)</li>
         * 	<li>exit      - A function which will break the loop and return the values passed to it,
         * 					or a single value if only a single value is passed.</li>
         * </ul>
         * @function
         * @memberof Object.prototype
         * @param {Function} f The callback to invoke for each item within the object
         * @returns {*} The value passed to the exit parameter of the callback...
         */
        each: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function each (f) {
                var i      = 0,
                    ret    = null,
                    broken = false,

                    exit = function () {
                        var args = arguments.toArray();
                        broken   = true;
                        ret      = args.length > 1 ? args : args[0];
                    };

                var self      = this,
                    gotNumber = false;

                if(typeof self === 'number') {
                    self      = this.toString();
                    gotNumber = true;
                }
                else if(typeof self === 'function' || typeof self === 'boolean') {
                    self = this.toString();
                }

                if(f instanceof Function) {
                    for(var property in self) {
                        if(self.hasOwnProperty(property) && !broken) {
                            if(gotNumber) {
                                f.call(parseFloat(self), self[property], property, i, exit);
                            }
                            else {
                                f.call(this, self[property], property, i, exit);
                            }
                            i++;
                        }
                    }
                }
                return ret;
            }
        },

        /**
         * Converts an object to an array. For strings, numbers, and functions this will
         * return a char array to their respective .toString() values
         * @function
         * @memberof Object.prototype
         */
        toArray: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function toArray () {
                if(this instanceof Array) return this;

                var arr = [];
                this.each((val) => { arr.push(val); });
                return arr;
            }
        },

        /**
         * Returns the last member of an object (or array). If passed a string, number, or function
         * to last character of the .toString() value will be returned.
         * @function
         * @memberof Object.prototype
         */
        last: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function last () {
                if(typeof this !== 'object') {
                    var s = this.toString();
                    return s[s.length - 1];
                }
                else {
                    if(this instanceof Array) {
                        return this[this.length - 1];
                    }
                    else {
                        var arr = this.toArray();
                        return arr[arr.length - 1];
                    }
                }
            }
        },

        /**
         * Find a child of an object using the given path, split by the given delimiter (or '.' by default)
         * @memberof Object.prototype
         * @function
         * @param {String} path The path to the child object
         * @param {String=} [delimiter='.'] The path delimiter
         * @return {*|Null} The child object at the given string path, or null if it doesn't exist.
         */
        findChildAtPath: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function findChildAtPath (path, delimiter, original, invoked) {
                var self = this,
                    done = arguments.last();

                original = (!(original instanceof Function) && original) ? original : this;
                invoked  = invoked || false;

                if(typeof this === 'object' && typeof path === 'string') {
                    delimiter = typeof delimiter === 'string' ? delimiter : '.';
                    path      = path.split(delimiter);

                    var p = path.shift();
                    if(p) {
                        return self.each((o, k, i, exit) => {
                            if(path.length === 0 && k === p) {
                                if(done instanceof Function) done.call(original, o, this, k);
                                invoked = true;
                                exit(o);
                            }
                            else {
                                var obj = o.findChildAtPath(path.join(delimiter), delimiter, original, invoked, done);
                                if(obj !== null) exit(obj);
                            }
                        });
                    }
                }
                if(!invoked && original === this && done instanceof Function) done.call(original, null, this, null);
                return null;
            }
        },

        /**
         * Produces a shallow clone of the object, that is, if JSON.stringify can handle it.<br>
         * The object must be non-circular.
         * @function
         * @memberof Object.prototype
         */
        clone: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function clone () {
                try {
                    return JSON.parse(JSON.stringify(this));
                }
                catch (e) {
                    throw new Error('Unable to clone object: ' + e.message);
                }
            }
        }
    });

    Object.defineProperties(Number.prototype, {
        /**
         * Pads a number with preceeding zeros.
         * @function
         * @memberof Number.prototype
         * @param {Number} length The final length of the string
         * @returns {String} The padded number, now a string.
         */
        pad: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function (length) {
                return this.toString().pad(length, '0', true);
            }
        },

        /**
         * Generate a hash from a number
         * @function
         * @memberof Number.prototype
         * @param {String} [algorithm='md5'] The algorithm to hash the number with
         * @returns {String} The hashed number, now a string
         */
        hash: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function hash (algorithm) {
                if(IS_NODE) return this.toString().hash(algorithm);
            }
        },

        /**
         * Generate a md5 hash from a string
         * @memberof Number.prototype
         * @function
         * @returns {String} The md5 string
         */
        md5: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function md5 () {
                if(IS_NODE) return this.hash('md5');
            }
        },

        /**
         * Converts a number to the HH:MM:SS.MSEC time format
         * @memberof Number.prototype
         * @function
         * @param {Boolean=} [omitMS=false] Whether or not to include the MS portion of the returned string
         * @returns {String} The formatted number, now a string.
         */
        clockTime: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function clockTime (omitMS) {
                var t = this, ms, secs, mins, hrs;

                ms = t % 1000;
                t = (t - ms) / 1000;

                secs = t % 60;
                t = (t - secs) / 60;

                mins = t % 60;
                hrs = (t - mins) / 60;

                return hrs.toString().pad(2) + ':' + mins.pad(2) + ':' + secs.pad(2) + ((omitMS === true) ? '' : '.' + ms.pad(3));
            }
        }

    });

    Object.defineProperties(Array.prototype, {
        /**
         * Creates a new array from the current one, with all occurences of the provided arguments ommited.<br>
         * For example: <em>[1,2,3,4,5].without(1)</em> will return <em>[2,3,4,5]</em>
         * and <em>[1, null, 2, null, undefined].without(null, undefined)</em> will return <em>[1, 2]</em>
         * @function
         * @memberof Array.prototype
         * @returns {Array<*>} A shallow copy of the array with the provided arguments ommited.
         */
        without: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function remove () {
                var res  = [],
                    args = arguments.makeArray();

                this.each(v => {
                    if(args.indexOf(v) === -1) res.push(v);
                });
                return res;
            }
        },

        /**
         * Rotates the array left or right the specified number of times. If the direction is left, it will shift off the
         * first <em>n</em> elements and push them to the end of the array. If right, it will pop off the last <em>n</em>
         * items and unshift them onto the front of the array.
         * @function
         * @memberof Array.prototype
         * @param {String=} [direction='left'] The direction to rotate array members.
         * @param {Number=} [amount=1] The number of elements to shift
         * @return {Array<*>} The current array, shifted.
         */
        rotate: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function remove (direction, amount) {
                if(direction && direction.isNumeric() && !amount) {
                    amount    = direction;
                    direction = undefined;
                }

                if(!amount || (amount && !amount.isNumeric())) amount = 1;
                for(var i = 0; i < amount; i++) {
                    if(direction !== 'right') {
                        this.push(this.shift());
                    }
                    else {
                        this.unshift(this.pop());
                    }
                }
                return this;
            }
        },

        /**
         * Removes duplicates from the current array.
         * @function
         * @memberof Array.prototype
         * @returns {Array<*>} The current array, with duplicates removed
         */
        makeUnique: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function makeUnique () {
                var visited = [];
                this.each((item, key, i) => {
                    return visited.indexOf(item) === -1 ? visited.push(item) : this.splice(i, 1);
                });
                return this;
            }
        },

        /**
         * Gets an array of unique items from the current array
         * @function
         * @memberof Array.prototype
         * @returns {Array} A new array with no duplicates
         */
        unique: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function unique () {
                var visited = [],
                    unique  = [];

                this.each((item) => {
                    if(visited.indexOf(item) === -1) {
                        unique.push(item);
                        visited.push(item);
                    }
                });
                return unique;
            }
        },

        /**
         * Sorts the array in ascending order
         * @function
         * @memberof Array.prototype
         * @returns {Array} The array sorted in ascending order
         */
        ascending: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function ascending () {
                return this.sort((a, b) => {
                    return a < b ? -1 : a > b ? 1 : 0;
                });
            }
        },

        /**
         * Sorts the array in descending order
         * @function
         * @memberof Array.prototype
         * @returns {Array} The array sorted in descending order
         */
        descending: {
            configurable : false,
            enumerable   : false,
            writable     : true,
            value        : function descending () {
                return this.sort((a, b) => {
                    return a > b ? -1 : a < b ? 1 : 0;
                });
            }
        }
    });

    /**
     * Generate a random string of alphanumeric characters
     * @function
     * @memberof String
     * @param {Number=} length The maximum length of the string. If omitted, a random
     * number between 1 - 100 will be used.
     * @returns {String} A random string
     */
    String.randomString = function randomString (length) {
        var text     = '',
            possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        length = length || Math.floor(Math.random() * 101);
        for(var i = 0; i < length; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    };

    defined = true;
}

// Only add the library functions to objects if they haven't already been added...
if(!defined) invokeChainLibrary();

// The following *must* be required after all of the above, as it relies heavily on the methods defined in this file.
if(IS_NODE) {
    /**
     * A JPCConsole instance, for general purpose use.
     * @type {JPCConsole}
     */
    exports.console = new exports.Console(exports.ARGS);

    /**
     * A JPDebugger instance, for general purpose use.
     * @type {JPDebugger}
     */
    exports.Debug = require('jpc-debugger');

    /**
     * A shortcut for the debugger client
     * @type {JPDebuggerClient}
     */
    exports.DebugClient = exports.debug = exports.Debug.Client;

    // If the --debug argument is passed in via command line, start up an all-purpose client debugger instance...
    if(exports.DEBUG) exports.debugger = new exports.DebugClient(); else exports.debugger = exports.Debug.FakeClient;
}
