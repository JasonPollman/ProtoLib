'use strict';
/**
 * A massive prototype standard library, which prevents prototype namespace collisions by "tucking" the library
 * under the namespace 'p' by default.
 *
 * Browser and Node.js compatible. Compatible with both *nix and Windows.
 * Adds a bunch of helper functions to String, Object, Number, Function, and Array prototypes under the object 'stdp'.
 *
 * Prototyping is achieved without using any performance degredating calls to 'bind', and uses a simple object to store the
 * current objects being operated on.
 *
 * This file *avoids* ES6 features wherever possible, for browser compatibility.
 *
 * @author Jason Pollman <jasonjpollman@gmail.com>
 * @module stdp
 */

(function addJLibrary () { // To Prevent window contamination in the browser, we'll wrap this in an AIIF.
    /**
     * Determines if the current JS framework is Node.js or not.
     * @return {Boolean} True if Node.js, false otherwise
     */
    function isNode () {
        return typeof module === 'object'         &&
               typeof module.exports === 'object' &&
               typeof process === 'object'        &&
               process.argv instanceof Array;
    }

    /**
     * Whether or not we're using Node.js
     * @type {Boolean}
     */
    var IS_NODE = isNode();

    /**
     * The JLibrary
     * @param {String} [protoid='p'] A "name" of the namespace to attach to object prototypes. This allows us to re-name
     * the JLibrary, should '.jl' be taken by another libaray.
     */
    var StdPseudoLib = function StdPseudoLib (protoid) {
        protoid = typeof protoid === 'string' ? protoid : 'p';

        /**
         * The stdp library. An object that contains all of the functions/getters which will be namespaced under each
         * instance prototype using the name 'stdp'.
         * @type {Object}
         */
        var stdp = null,

        /**
         * The object stack. When a stdp function is executed the current (or "this") object is pushed onto the stack,
         * then when getThisValueAndInvoke is called, it is popped from the stack. This allows us to use stdp functions
         * within other stdp functions.
         * @type {Array}
         */
        thisPointerStack = [];

        /**
         * Executes the given callback with the current object from the object stack. Then pops the object off the
         * object stack.
         * @param {Function} cb The callback to be performed.
         * @return {*} The value returned from the callback execution
         */
        function getThisValueAndInvoke (callback) {
            var idx   = thisPointerStack.length - 1,
                value = callback(thisPointerStack[idx] !== undefined && thisPointerStack[idx] !== null ?
                    thisPointerStack[idx].valueOf() : thisPointerStack[idx]);

            thisPointerStack.pop();
            return value;
        }

        /**
         * Adds all the 'object' prototype classes to the other prototypes j objects.
         * @return {undefined}
         */
        function attachToAllNonObjectPesudoPrototypes () {
            for(var n = ['_string', '_number', '_array', '_date', '_function'], o = n.shift(); o; o = n.shift()) {
                var keys = Object.keys(stdp._object);
                for(var i = 0; i < keys.length; i++) {
                    if(stdp._object.hasOwnProperty(keys[i]) && !stdp[o][keys[i]])
                        stdp[o][keys[i]] = stdp._object[keys[i]];
                }
            }
        }

        function addStaticMethodToLibrary (staticTarget, protoSource, methodName) {
            stdp[staticTarget][methodName] = function (obj) {
                var args = arguments;
                return stdp.invokeInStaticContext(obj, function () {
                    return stdp[protoSource][methodName].apply(stdp, args);
                });
            };
        }

        /**
         * Invokes a stdp function in the static context.
         * @param {*} obj The object to operate on.
         * @param {Function} callback The callback to invoke using the object.
         * @return {*} The results of the invocation of the callback.
         */
        function invokeInStaticContext (obj, callback) {
            thisPointerStack.push(obj);
            return getThisValueAndInvoke(callback);
        }

        /**
         * Properties and methods that will be added to the String.prototype.j object.
         * @type {Object}
         */
        stdp = {

            /**
             * Whether or not the library is loaded. True is init() has been called, false if unload() has been called.
             * @type {Boolean}
             */
            _loaded: false,

            /**
             * The prototype namespace identifier
             * @type {String}
             */
            PROTO_IDENTIFIER: protoid,

            /**
             * Exposes the private function JLibrary~getThisValueAndInvoke.
             * @type {Function}
             */
            getThisValueAndInvoke: getThisValueAndInvoke,

            /**
             * Initializes the stdp library by attaching the j object to the prototypes.
             * @return {[type]} [description]
             */
            init: function init () {
                if(!stdp._loaded) {
                    // Add all the object functions to each of the other types
                    attachToAllNonObjectPesudoPrototypes();

                    // Append the stdp library to the object prototype
                    Object.defineProperty(Object.prototype, protoid, {
                        configurable : false,
                        enumerable   : false,
                        get          : function () {
                            thisPointerStack.push(this);
                            return stdp._object;
                        }
                    });

                    // Append the stdp library to the string prototype
                    Object.defineProperty(String.prototype, protoid, {
                        configurable : true,
                        enumerable   : false,
                        get          : function () {
                            thisPointerStack.push(this);
                            return stdp._string;
                        }
                    });

                    // Append the stdp library to the number prototype
                    Object.defineProperty(Number.prototype, protoid, {
                        configurable : true,
                        enumerable   : false,
                        get          : function () {
                            thisPointerStack.push(this);
                            return stdp._number;
                        }
                    });

                    // Append the stdp library to the date prototype
                    Object.defineProperty(Date.prototype, protoid, {
                        configurable : true,
                        enumerable   : false,
                        get          : function () {
                            thisPointerStack.push(this);
                            return stdp._date;
                        }
                    });

                    // Append the stdp library to the array prototype
                    Object.defineProperty(Array.prototype, protoid, {
                        configurable : true,
                        enumerable   : false,
                        get          : function () {
                            thisPointerStack.push(this);
                            return stdp._array;
                        }
                    });
                }
                return stdp;
            },

            /**
             * Removes stdp from the prototype chain
             * @return {stdp} The current stdp instance
             */
            unload: function unload () {
                if(stdp._loaded) {
                    delete String.prototype[protoid];
                    delete Array.prototype[protoid];
                    delete Date.prototype[protoid];
                    delete Object.prototype[protoid];
                    delete Number.prototype[protoid];
                    stdp._loaded = false;
                }
                return stdp;
            },

            /**
             * Add to the stdp library
             * @param {String} toPrototype The prototype to add the function to
             * @param {String} name The name of the method
             * @param {Function} func The function to invoke
             * @return {Boolean} True if the extension was successful, false otherwise.
             */
            extend: function extend (pseudoProto, name, func) {
                if(typeof pseudoProto !== 'string' || typeof name !== 'string') return false;
                pseudoProto = pseudoProto.toLowerCase().replace(/^_/, '') + '_';

                if(stdp[pseudoProto]) {
                    stdp[pseudoProto][name] = function () {
                        var args = arguments;
                        return getThisValueAndInvoke(function (c) { func.apply(c, args); });
                    };

                    stdp[pseudoProto][name].name = name;
                    if(pseudoProto === '_object') attachToAllNonObjectPesudoPrototypes();
                    return true;
                }
                return false;
            },

            // --------------------------------------- BEGIN LIBRARY FUCTIONS --------------------------------------- //

            _function: {

            },

            /**
             * Functions available to String.prototype.j
             * @type {Object}
             */
            _string: {

                /**
                 * Returns all the characters found in one string but not the other.
                 * @param {String} other The string to compute the difference against.
                 * @return {String} A difference string.
                 */
                differenceFromString: function differenceFromString (other) {
                    return getThisValueAndInvoke(function (s) {
                        if(typeof other !== 'string') return s;
                        var sarr = s.split(''), oarr = other.split('');
                        return sarr[protoid].differenceFromArray(oarr).join('');
                    });
                },

                /**
                 * Replaces tokens (snippets of text wrapped in brackets) with their values/
                 * @return {String} The token replaced values.
                 */
                replaceTokens: function replaceTokens () {
                    return getThisValueAndInvoke(function (s) {
                        return stdp.replaceStringTokens(s);
                    });
                },

                /**
                 * Returns only the characters common to both strings
                 * @param {String} other The string to compute the intersection against.
                 * @return {String} The intersection between the two strings.
                 */
                intersectString: function intersectString (other) {
                    return getThisValueAndInvoke(function (s) {
                        if(typeof other !== 'string') return s;
                        var sarr = s.split(''), oarr = other.split('');
                        return sarr[protoid].intersectArray(oarr).join('');
                    });
                },

                /**
                 * Repeat a string 'times' times.
                 * @param {Number} times The number of times to repeat the string
                 * @return {String} The repeated string.
                 */
                repeat: function repeat (times) {
                    times = parseInt(times, 10);
                    times = isNaN(times) || !isFinite(times) || times <= 0 ? 1 : times;

                    return getThisValueAndInvoke(function (s) {
                        var os = s;
                        for(var i = 1; i < times; i++) s += os;
                        return s;
                    });
                },

                /**
                 * Right trims a string. Same as String.trim, but only for the end of a string.
                 * @param {String} [what='\\s+'] What to trim.
                 * @return {String} The right trimmed string
                 */
                rtrim: function rtrim (what) {
                    return getThisValueAndInvoke(function (s) {
                        what = typeof what === 'string' ? what : '\\s+';
                        return s.replace(new RegExp(what + '$'), '');
                    });
                },

                /**
                 * Left trims a string. Same as String.trim, but only for the beginning of a string.
                 * @param {String} [what='\\s+'] What to trim.
                 * @return {String} The left trimmed string
                 */
                ltrim: function ltrim (what) {
                    return getThisValueAndInvoke(function (s) {
                        what = typeof what === 'string' ? what : '\\s+';
                        return s.replace(new RegExp('^' + what), '');
                    });
                },

                /**
                 * Escapes HTML special characters
                 * @return {String} The HTML escaped string
                 */
                htmlEncode: function htmlEncode () {
                    return getThisValueAndInvoke(function (s) {
                        var map = {
                            '&'  : '&amp;',
                            '<'  : '&lt;',
                            '>'  : '&gt;',
                            '"'  : '&quot;',
                            '\'' : '&#039;'
                        };
                        return s.replace(/[&<>"']/g, function (m) { return map[m]; });
                    });
                },

                /**
                 * Un-escapes HTML special characters
                 * @return {String} The HTML escaped string
                 */
                htmlDecode: function htmlDecode () {
                    return getThisValueAndInvoke(function (s) {
                        var map = {
                            '&amp;'  : '&',
                            '&lt;'   : '<',
                            '&gt;'   : '>',
                            '&quot;' : '"',
                            '&#039;' : '\''
                        };
                        return s.replace(/(&amp;|&lt;|&gt;|&quot;|&#039;)/g, function (m) { return map[m]; });
                    });
                },

                /**
                 * Created an 'eval' safe string, by adding slashes to ", ', \t, \n, \f, \r, and the NULL byte.
                 * @return {String} A string with slashes
                 */
                addSlashes: function addSlashes () {
                    return getThisValueAndInvoke(function (s) {
                        return s.replace(/[\\"'\t\n\f\r]/g, '\\$&').replace(/\u0000/g, '\\0');
                    });
                },

                /**
                 * Returns a string with the first letter capitalized.
                 * @return {String} The string with the first letter upper cased.
                 * @function
                 */
                ucFirst: function ucFirst () {
                    return getThisValueAndInvoke(function (s) {
                        return s.charAt(0).toUpperCase() + s.slice(1);
                    });
                },

                /**
                 * Returns a string with the first letter lowercased.
                 * @return {String} The string with the first letter lower cased.
                 * @function
                 */
                lcFirst: function lcFirst () {
                    return getThisValueAndInvoke(function (s) {
                        return s.charAt(0).toLowerCase() + s.slice(1);
                    });
                },

                /**
                 * Returns a string in Title Case.
                 * @function
                 * @return {String} The title cased string.
                 */
                titleCase: function titleCase () {
                    return getThisValueAndInvoke(function (s) {
                        var arr = [];
                        s.split(' ')[protoid].each(function (t) {
                            arr.push(t[protoid].ucFirst());
                        });
                        return arr.join(' ');
                    });
                },

                /**
                 * Splices a string, much like an array.
                 * @param {Number} index The index to begin splicing the string at
                 * @param {Number} count The number of characters to delete
                 * @param {String} add The string to append at the spliced section
                 * @return {String} The spliced string.
                 * @function
                 */
                splice: function splice (index, count, add) {
                    return getThisValueAndInvoke(function (s) {
                        return s.slice(0, index) + (add || '') + s.slice(index + count);
                    });
                },

                /**
                 * Return a truncated string with ellipses.
                 * @param {Number=} length The length of the desired string. If ommited, the strings original length will be used.
                 * @param {String=} [place='back'] Possible values are 'front' and 'back'. Specifying 'front' will truncate the
                 * string and add ellipses to the front, 'back' (or any other value) will add the ellipses to the back.
                 * @param {String=} [ellipses='...'] The string value of the ellipses. Use this to add anything other than '...'
                 * @returns {String} A truncated string with ellipses (if its length is greater than 'length')
                 * @function
                 */
                ellipses: function ellipses_ (length, place, ellipses) {
                    return getThisValueAndInvoke(function (s) {
                        if(isNaN(parseInt(length, 10))) length = s.length;
                        if(length < 0 || !isFinite(length)) length = 0;

                        ellipses = typeof ellipses === 'string' ? ellipses : '...';
                        if(s.length <= length) return s;

                        if(length <= ellipses.length) {
                            return ellipses.substring(0, length);
                        }
                        else if(!place || place !== 'front') {
                            return s.substr(0, length - ellipses.length) + ellipses;
                        }
                        else {
                            return ellipses + s.substr(0, length - ellipses.length);
                        }
                    });
                },

                /**
                 * Shuffles a string
                 * @return {String} The mixed up string.
                 */
                shuffle: function shuffle () {
                    return getThisValueAndInvoke(function (s) {
                        var a = s.split(''),
                            n = s.length;

                        for(var i = n - 1; i > 0; i--) {
                            var j   = Math.floor(Math.random() * (i + 1)),
                                tmp = a[i];

                            a[i] = a[j];
                            a[j] = tmp;
                        }

                        return a.join('');
                    });
                },

                /**
                 * Reverses a string.
                 * @return {String} The reversed string.
                 */
                reverse: function reverse () {
                    return getThisValueAndInvoke(function (s) {
                        if(s.length < 64) {
                            var str = '';
                            for(var i = s.length; i >= 0; i--) str += s.charAt(i);
                            return str;
                        }
                        else {
                            return s.split('').reverse().join('');
                        }
                    });
                },

                /**
                 * Strips the trailing slashes from a string
                 * If using Node.js, it will replace the trailing slash based on the value of os.platform
                 * (i.e. if windows, '\\' will be replaced, '/' otherwise).
                 * @returns {String} The string without a trailing slash.
                 * @function
                 */
                withoutTrailingSlash: function withoutTrailingSlash () {
                    return getThisValueAndInvoke(function (s) {
                        if(IS_NODE && require('os').platform === 'win32') return s.replace(/\\+$/, '');
                        return s.replace(/\/+$/, '');
                    });
                },

                /**
                 * Add a trailing slash to a string, if it doesn't already have one
                 * If using Node.js, it will replace the trailing slash based on the value of os.platform
                 * (i.e. if windows, '\\' will be replaced, '/' otherwise).
                 * @returns {String} The string without a trailing slash.
                 * @function
                 */
                withTrailingSlash: function withTrailingSlash () {
                    return getThisValueAndInvoke(function (s) {
                        if(IS_NODE && require('os').platform === 'win32') return s[protoid].withoutTrailingSlash() + '\\';
                        return s[protoid].withoutTrailingSlash() + '/';
                    });
                },

                /**
                 * Escapes regular expression special characters. This is useful is you wish to create a new regular expression
                 * from a stored string value.
                 * @returns {String} The regular expression safe string
                 * @function
                 */
                regexpSafe: function regexpSafe () {
                    return getThisValueAndInvoke(function (s) {
                        return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    });
                },

                /**
                 * Pads a string with 'delim' characters to the specified length. If the length is less than the string length,
                 * the string will be truncated.
                 * @param {Number} length The length to pad the string to. If less that the length of the string, the string will
                 * be returned. If less than the length of the string, the string will be sliced.
                 * @param {String=} [delim=' '] The character to pad the string with.
                 * @param {Boolean=} [pre=false] If true, the padding will be added to the beginning of the string, otherwise the padding
                 * will be added to the end.
                 * @returns {String} The padded string
                 * @function
                 */
                pad: function pad (length, delim, pre) {
                    return getThisValueAndInvoke(function (s) {
                        var i, thisLength = s.length;

                        if(!delim) delim = ' ';
                        if(length === 0) return ''; else if(isNaN(parseInt(length, 10))) return s;

                        length = parseInt(length, 10);
                        if(length < thisLength) return !pre ? s.slice(0, length) : s.slice(-length);

                        if(pre) {
                            for(i = 0; i < length - thisLength; i++) s = delim + s;
                        }
                        else {
                            for(i = 0; i < length - thisLength; i++) s += delim;
                        }
                        return s;
                    });
                },

                /**
                 * Replaces newlines with br tags.
                 * @return {String} The string with newlines converted to br tags.
                 */
                newlineToBreak: function newlineToBreak () {
                    return getThisValueAndInvoke(function (s) {
                        return s.replace(/(\r\n|\n)/g, '<br/>');
                    });
                },

                /**
                 * Replaces tabs with a span element with the class 'tab'
                 * @return {String} The string with tabs converted to spans with the class 'tab'
                 */
                tabsToSpan: function tabsToSpan () {
                    return getThisValueAndInvoke(function (s) {
                        return s.replace(/\t/g, '<span class="tab"></span>');
                    });
                },

                /**
                 * Adjusts a string to fit within the confines of 'width', without breaking words.
                 * @param {Number=} [length=120] The length to word wrap the string to.
                 * @param {Number=} [padleft=0] The number of columns to pad the string on the left
                 * @param {Number=} [padright=0] The number of columns to pad the string on the right
                 * @param {Boolean=} omitFirst If true, the first line will not be padded left
                 * @return {String} The string adjusted and padded for the stdout.
                 * @function
                 */
                wordWrapToLength: function wordWrapToLength (width, padleft, padright, omitFirst) {
                    return getThisValueAndInvoke(function (s) {
                        if(padright === undefined && padleft) padright = padleft;

                        padleft  = !isNaN(parseInt(padleft,  10)) ? parseInt(padleft, 10)  : 0;
                        padright = !isNaN(parseInt(padright, 10)) ? parseInt(padright, 10) : 0;

                        var paddingLeft = '';
                        for(var n = 0; n < padleft;  n++) paddingLeft  += ' ';

                        var cols   = !isNaN(parseInt(width, 10)) ? length : 120,
                            arr    = s.split(' '),
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
                    });
                }
            },

            /**
             * Functions available to Date.prototype.j.
             * @type {Object}
             */
            _date: {
                /**
                 * Moves a date forward 'daysInTheFuture' days.
                 * @param {Number} daysInTheFuture The number of days in the future to advance the date
                 * @param {Boolean=} [adjustForWeekend=false] Whether or not the date should fall on a weekend day
                 * @returns {Date} The date, adjusted the number of specified days.
                 * @function
                 */
                advanceDays: function advanceDays (daysInTheFuture, adjustForWeekend) {
                    return getThisValueAndInvoke(function (d) {
                        daysInTheFuture = daysInTheFuture && daysInTheFuture[protoid].isNumeric() ? daysInTheFuture : 1;
                        d.setTime(d.getTime() + (daysInTheFuture * 86400000));

                        if(adjustForWeekend && (d.getDay() === 0 || d.getDay() === 6)) {
                            while(d.getDay() === 0 || d.getDay() === 6)
                                d.setTime(d.getTime() + 86400000);
                        }
                        return d;
                    });
                },

                /**
                 * Moves a date forward 'monthsInTheFuture' months.
                 * @param {Number} monthsInTheFuture The number of months in the future to advance the date
                 * @param {Boolean=} [adjustForWeekend=false] Whether or not the date should fall on a weekend day
                 * @returns {Date} The date, adjusted the number of specified months.
                 * @function
                 */
                advanceMonths: function advanceMonths (monthsInTheFuture, adjustForWeekend) {
                    return getThisValueAndInvoke(function (d) {
                        monthsInTheFuture = monthsInTheFuture && monthsInTheFuture[protoid].isNumeric() ? monthsInTheFuture : 1;
                        d.setTime(d.getTime() + (monthsInTheFuture * 2629746000));

                        if(adjustForWeekend && (d.getDay() === 0 || d.getDay() === 6)) {
                            while(d.getDay() === 0 || d.getDay() === 6)
                                d.setTime(d.getTime() + 86400000);
                        }
                        return d;
                    });
                },

                /**
                 * Moves a date forward 'yearsInTheFuture' years.
                 * @param {Number} yearsInTheFuture The number of years in the future to advance the date
                 * @param {Boolean=} [adjustForWeekend=false] Whether or not the date should fall on a weekend day
                 * @returns {Date} The date, adjusted the number of specified years.
                 * @function
                 */
                advanceYears: function advanceYears (yearsInTheFuture, adjustForWeekend) {
                    return getThisValueAndInvoke(function (d) {
                        yearsInTheFuture = yearsInTheFuture && yearsInTheFuture[protoid].isNumeric() ? yearsInTheFuture : 1;
                        d.setTime(d.getTime() + (yearsInTheFuture * 31536000000));

                        if(adjustForWeekend && (d.getDay() === 0 || d.getDay() === 6)) {
                            while(d.getDay() === 0 || d.getDay() === 6)
                                d.setTime(d.getTime() + 86400000);
                        }
                        return d;
                    });
                },

                /**
                 * Returns the date in the yyyy-mm-dd format.
                 * @param {String} [delim='-'] The delimiter to used the separate the date components (e.g. '-' or '.')
                 * @returns {String} The date in the yyyy-mm-dd format.
                 * @function
                 */
                yyyymmdd: function yyyymmdd (delim) {
                    return getThisValueAndInvoke(function (d) {
                        delim = typeof delim !== 'string' ? '-' : delim ;

                        var dd   = d.getDate(),
                            mm   = d.getMonth() + 1,
                            yyyy = d.getFullYear();

                        if(dd < 10) dd = '0' + dd;
                        if(mm < 10) mm = '0' + mm;
                        return yyyy + delim + mm + delim + dd;
                    });
                },

                /**
                 * Converts a date to the HH:MM:SS.MSEC time format
                 * @memberof Number.prototype
                 * @param {Boolean=} [omitMS=false] Whether or not to include the MS portion of the returned string
                 * @returns {String} The formatted number, now a string.
                 * @function
                 */
                clockTime: function clockTime (omitMS) {
                    return getThisValueAndInvoke(function (d) {
                        return d.getTime()[protoid].clockTime(!!omitMS);
                    });
                }
            },

            /**
             * Functions available to Number.prototype.j.
             * @type {Object}
             */
            _number: {
                /**
                 * Pads a number with preceeding zeros.
                 * @param {Number} length The final length of the string
                 * @returns {String} The padded number, now a string.
                 * @function
                 */
                pad: function pad (length) {
                    return getThisValueAndInvoke(function (n) {
                        return n.toString()[protoid].pad(length, '0', true);
                    });
                },

                /**
                 * Advances (or reverses) the date the specified number of days.
                 * @param {Date} date The date to change.
                 * @return {Date} The modified date.
                 */
                daysFrom: function daysFrom (date) {
                    return getThisValueAndInvoke(function (n) {
                        if(typeof date === 'number') date = new Date(date);
                        if(!(date instanceof Date))  date = new Date();

                        date.setDate(date.getDate() + n);
                        return date;
                    });
                },

                /**
                 * Advances (or reverses) the current date the specified number of days.
                 * @return {Date} A date object
                 */
                daysFromNow: function daysFromNow () {
                    return getThisValueAndInvoke(function (n) {
                        return n[protoid].daysFrom(new Date());
                    });
                },

                /**
                 * Advances (or reverses) the date the specified number of days.
                 * @param {Date} date The date to change.
                 * @return {Date} The modified date.
                 */
                secondsFrom: function secondsFrom (date) {
                    return getThisValueAndInvoke(function (n) {
                        if(typeof date === 'number') date = new Date(date);
                        if(!(date instanceof Date))  date = new Date();

                        date.setSeconds(date.getSeconds() + n);
                        return date;
                    });
                },

                /**
                 * Advances (or reverses) the current date the specified number of days.
                 * @return {Date} A date object
                 */
                secondsFromNow: function secondsFromNow () {
                    return getThisValueAndInvoke(function (n) {
                        return n[protoid].secondsFrom(new Date());
                    });
                },

                /**
                 * Advances (or reverses) the date the specified number of years.
                 * @param {Date} date The date to change.
                 * @return {Date} The modified date.
                 */
                yearsFrom: function yearsFrom (date) {
                    return getThisValueAndInvoke(function (n) {
                        if(typeof date === 'number') date = new Date(date);
                        if(!(date instanceof Date))  date = new Date();

                        date.setFullYear(date.getFullYear() + n);
                        return date;
                    });
                },

                /**
                 * Advances (or reverses) the current date the specified number of years.
                 * @return {Date} A date object
                 */
                yearsFromNow: function yearsFromNow () {
                    return getThisValueAndInvoke(function (n) {
                        return n[protoid].yearsFrom(new Date());
                    });
                },

                /**
                 * Advances (or reverses) the date the specified number of months.
                 * @param {Date} date The date to change.
                 * @return {Date} The modified date.
                 */
                monthsFrom: function monthsFrom (date) {
                    return getThisValueAndInvoke(function (n) {
                        if(typeof date === 'number') date = new Date(date);
                        if(!(date instanceof Date))  date = new Date();

                        date.setMonth(date.getMonth() + n);
                        return date;
                    });
                },

                /**
                 * Advances (or reverses) the current date the specified number of months.
                 * @return {Date} A date object
                 */
                monthsFromNow: function monthsFromNow () {
                    return getThisValueAndInvoke(function (n) {
                        return n[protoid].monthsFrom(new Date());
                    });
                },

                /**
                 * Advances (or reverses) the date the specified number of hours.
                 * @param {Date} date The date to change.
                 * @return {Date} The modified date.
                 */
                hoursFrom: function hoursFrom (date) {
                    return getThisValueAndInvoke(function (n) {
                        if(typeof date === 'number') date = new Date(date);
                        if(!(date instanceof Date))  date = new Date();

                        date.setHours(date.getHours() + n);
                        return date;
                    });
                },

                /**
                 * Advances (or reverses) the current date the specified number of hours.
                 * @return {Date} A date object
                 */
                hoursFromNow: function hoursFromNow () {
                    return getThisValueAndInvoke(function (n) {
                        return n[protoid].hoursFrom(new Date());
                    });
                },

                /**
                 * Advances (or reverses) the date the specified number of minutes.
                 * @param {Date} date The date to change.
                 * @return {Date} A modified date.
                 */
                minutesFrom: function minutesFrom (date) {
                    return getThisValueAndInvoke(function (n) {
                        if(typeof date === 'number') date = new Date(date);
                        if(!(date instanceof Date))  date = new Date();

                        date.setMinutes(date.getMinutes() + n);
                        return date;
                    });
                },

                /**
                 * Advances (or reverses) the current date the specified number of minutes.
                 * @return {Date} The date object
                 */
                minutesFromNow: function minutesFromNow () {
                    return getThisValueAndInvoke(function (n) {
                        return (-n)[protoid].minutesFrom(new Date());
                    });
                },

                /**
                 * The time, months in the past.
                 * @return {Date} A Date object.
                 */
                monthsAgo: function monthsAgo () {
                    return getThisValueAndInvoke(function (n) {
                        return (-n)[protoid].monthsFromNow();
                    });
                },

                /**
                 * The time, days in the past.
                 * @return {Date} A Date object.
                 */
                daysAgo: function daysAgo () {
                    return getThisValueAndInvoke(function (n) {
                        return (-n)[protoid].daysFromNow();
                    });
                },

                /**
                 * The time, seconds in the past.
                 * @return {Date} A Date object.
                 */
                secondsAgo: function secondsAgo () {
                    return getThisValueAndInvoke(function (n) {
                        return (-n)[protoid].secondsFromNow();
                    });
                },

                /**
                 * The time, minutes in the past.
                 * @return {Date} A Date object.
                 */
                minutesAgo: function minutesAgo () {
                    return getThisValueAndInvoke(function (n) {
                        return (-n)[protoid].minutesFromNow();
                    });
                },

                /**
                 * The time, years in the past.
                 * @return {Date} A Date object.
                 */
                yearsAgo: function yearsAgo () {
                    return getThisValueAndInvoke(function (n) {
                        return (-n)[protoid].yearsFromNow();
                    });
                },

                /**
                 * Converts a number to the HH:MM:SS.MSEC time format
                 * @memberof Number.prototype
                 * @param {Boolean=} [omitMS=false] Whether or not to include the MS portion of the returned string
                 * @returns {String} The formatted number, now a string.
                 * @function
                 */
                clockTime: function clockTime (omitMS) {
                    return getThisValueAndInvoke(function (t) {
                        var ms, secs, mins, hrs;

                        ms = t % 1000;
                        t = (t - ms) / 1000;

                        secs = t % 60;
                        t = (t - secs) / 60;

                        mins = t % 60;
                        hrs = (t - mins) / 60;

                        return hrs.toString().pad(2) + ':' + mins.pad(2) + ':' + secs.pad(2) + ((omitMS === true) ? '' : '.' + ms.pad(3));
                    });
                }
            },

            /**
             * Functions available to Array.prototype.j.
             * @type {Object}
             */
            _array: {

                /**
                 * Shuffles an array
                 * @return {Array<*>} The mixed up array
                 */
                shuffle: function shuffle () {
                    return getThisValueAndInvoke(function (a) {
                        for(var i = a.length - 1; i > 0; i--) {
                            var j = Math.floor(Math.random() * (i + 1)), tmp = a[i];
                            a[i] = a[j];
                            a[j] = tmp;
                        }
                        return a;
                    });
                },

                /**
                 * Computes the union between the current array, and all the array objects passed in. That is,
                 * the set of unique objects present in all of the arrays.
                 * @param {...Array} arr A list of array objects
                 * @return {Array<*>} The union set of the provided arrays.
                 */
                union: function union () {
                    var args = arguments[protoid].makeArray()[protoid].only('array');

                    return getThisValueAndInvoke(function (a) {
                        var union = [];
                        args.unshift(a);
                        args[protoid].each(function (array) {
                            array[protoid].each(function (item) {
                                if(union.indexOf(item) === -1) union.push(item);
                            });
                        });
                        return union;
                    });
                },

                /**
                 * Returns all the items not common to both arrays.
                 * @param {Array} other The array to compute the difference from.
                 * @return {Array} A new array with items unique to each array.
                 */
                differenceFromArray: function differenceFromArray (other) {
                    return getThisValueAndInvoke(function (a) {
                        if(!(other instanceof Array)) return a;

                        var diff = [];
                        a[protoid].each(function (item) {
                            if(other.indexOf(item) === -1) diff.push(item);
                        });

                        other[protoid].each(function (item) {
                            if(a.indexOf(item) === -1) diff.push(item);
                        });

                        return diff;
                    });
                },

                /**
                 * Returns all the items common to both arrays.
                 * @param {Array} other The array to compute the intersection from.
                 * @return {Array} A new array with items common to both arrays.
                 */
                intersectArray: function intersectArray (other) {
                    return getThisValueAndInvoke(function (a) {
                        if(!(other instanceof Array)) return a;

                        var intersection = [];
                        a[protoid].each(function (item) {
                            if(other.indexOf(item) !== -1) intersection.push(item);
                        });

                        return intersection;
                    });
                },

                /**
                 * Creates a new array from the current one, with all occurences of the provided arguments ommited.<br>
                 * For example: <em>[1,2,3,4,5].without(1)</em> will return <em>[2,3,4,5]</em>
                 * and <em>[1, null, 2, null, undefined].without(null, undefined)</em> will return <em>[1, 2]</em>
                 * @returns {Array<*>} A shallow copy of the array with the provided arguments ommited.
                 * @function
                 */
                without: function without () {
                    var args = arguments[protoid].makeArray();
                    return getThisValueAndInvoke(function (a) {
                        var res = [];
                        a[protoid].each(function (v) { if(args.indexOf(v) === -1) res.push(v); });
                        return res;
                    });
                },

                /**
                 * Rotates the array left or right the specified number of times. If the direction is left, it will shift off the
                 * first <em>n</em> elements and push them to the end of the array. If right, it will pop off the last <em>n</em>
                 * items and unshift them onto the front of the array.
                 * @param {String=} [direction='left'] The direction to rotate array members.
                 * @param {Number=} [amount=1] The number of elements to shift
                 * @return {Array<*>} The current array, shifted.
                 * @function
                 */
                rotate: function rotate (direction, amount) {
                    return getThisValueAndInvoke(function (a) {
                        if(direction && direction.isNumeric() && !amount) {
                            amount    = direction;
                            direction = undefined;
                        }

                        if(!amount || (amount && !amount.isNumeric())) amount = 1;
                        for(var i = 0; i < amount; i++) {
                            if(direction !== 'right') a.push(a.shift()); else a.unshift(a.pop());
                        }
                        return a;
                    });
                },

                /**
                 * Rotates the array left the specified number of times.
                 * This is useful if trying to create a circular queue.
                 * @param {Number=} [amount=1] The number of times to rotate the array left.
                 * @return {Array<*>} The current array, rotated left.
                 * @function
                 */
                rotateLeft: function rotateLeft (amount) {
                    return getThisValueAndInvoke(function (a) {
                        return a[protoid].rotate('left', amount);
                    });
                },

                /**
                 * Rotates the array right the specified number of times.
                 * This is useful if trying to create a circular queue.
                 * @param {Number=} [amount=1] The number of times to rotate the array left.
                 * @return {Array<*>} The current array, rotated right.
                 * @function
                 */
                rotateRight: function rotateLeft (amount) {
                    return getThisValueAndInvoke(function (a) {
                        return a[protoid].rotate('right', amount);
                    });
                },

                /**
                 * Removes duplicates from the current array.
                 * This is a destructive action, and will modify the array in place.
                 * @returns {Array<*>} The current array, with duplicates removed.
                 * @function
                 */
                makeUnique: function makeUnique () {
                    return getThisValueAndInvoke(function (a) {
                        var visited = [];
                        for(var i = 0; i < a.length; i++) {
                            if(visited.indexOf(a[i]) === -1) {
                                visited.push(a[i]);
                            }
                            else {
                                a.splice(i, 1);
                                i--; // Splice will affect the internal array pointer, so fix it...
                            }
                        }
                        return a;
                    });
                },

                /**
                 * Gets an array of unique items from the current array.
                 * @returns {Array} A new array with no duplicate values.
                 * @function
                 */
                unique: function unique () {
                    return getThisValueAndInvoke(function (a) {
                        var visited = [],
                            unique  = [];

                        a[protoid].each(function (item) {
                            if(visited.indexOf(item) === -1) {
                                unique.push(item);
                                visited.push(item);
                            }
                        });
                        return unique;
                    });
                },

                /**
                 * Sorts the array in ascending order.
                 * This is a destructive action, and will modify the array in place.
                 * @returns {Array} The array sorted in ascending order.
                 * @function
                 */
                ascending: function ascending () {
                    return getThisValueAndInvoke(function (a) {
                        return a.sort(function (a, b) {
                            return a < b ? -1 : a > b ? 1 : 0;
                        });
                    });
                },

                /**
                 * Sorts the array in descending order.
                 * This is a destructive action, and will modify the array in place.
                 * @returns {Array} The array sorted in descending order.
                 * @function
                 */
                descending: function descending () {
                    return getThisValueAndInvoke(function (a) {
                        return a.sort(function (a, b) {
                            return a > b ? -1 : a < b ? 1 : 0;
                        });
                    });
                }
            },

            /**
             * Functions available to Object.prototype.j.
             * @type {Object}
             */
            _object: {

                /**
                 * Returns the object's keys.
                 * @returns {Array<String|Number>} The object's key set
                 * @function
                 */
                keys : function keys () {
                    return getThisValueAndInvoke(function (o) {
                        return Object.keys(o);
                    });
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
                 * @returns {Number} The number of items within the object.
                 * @function
                 */
                size: function size () {
                    return getThisValueAndInvoke(function (o) {
                        switch(true) {
                            case typeof o === 'function':
                                return 1;

                            case typeof o === 'number':
                                return o.toString().length;

                            case o instanceof Array:
                            case typeof o === 'string':
                                return o.length;

                            case stdp.isArguments(o) && o.indexOf('length') > -1:
                                return o.length - 1;

                            case typeof o === 'object':
                                return Object.keys(o).length;

                            default:
                                return o;
                        }
                    });
                },

                /**
                 * Determines if an object can be converted to a number.
                 * @returns {Boolean} True if the object is numeric, false otherwise.
                 * @function
                 */
                isNumeric: function isNumeric () {
                    return getThisValueAndInvoke(function (o) {
                        return !isNaN(parseFloat(o)) && isFinite(o);
                    });
                },

                /**
                 * Converts an object to a number.
                 * @returns {Number} The object as a number.
                 * @function
                 */
                numeric: function numeric () {
                    return getThisValueAndInvoke(function (o) {
                        return parseFloat(o);
                    });
                },

                /**
                 * Determines if an object has no keys, if an array has no items, or if a string === ''.
                 * @returns {Boolean} True if the object is 'empty', false otherwise.
                 * @function
                 */
                isEmpty: function isEmpty () {
                    return getThisValueAndInvoke(function (o) {
                        return o[protoid].size() === 0;
                    });
                },

                /**
                 * True if the object is an array, false otherwise.
                 * @return {Boolean} True if the object is an array, false otherwise.
                 */
                isArray: function isArray () {
                    return getThisValueAndInvoke(function (o) {
                        return o[protoid] instanceof Array;
                    });
                },

                /**
                 * True if the object is an object and not an array, false otherwise.
                 * @return {Boolean} True if the object is an object and not an array, false otherwise.
                 */
                isPureObject: function isPureObject () {
                    return getThisValueAndInvoke(function (o) {
                        return !(o[protoid] instanceof Array) && typeof o === 'object';
                    });
                },

                /**
                 * True if the object is a string, false otherwise.
                 * @return {Boolean} True if the object is a string, false otherwise.
                 */
                isString: function isString () {
                    return getThisValueAndInvoke(function (o) {
                        return typeof o === 'string';
                    });
                },

                /**
                 * True if the object is a boolean, false otherwise.
                 * @return {Boolean} True if the object is a boolean, false otherwise.
                 */
                isBoolean: function isBoolean () {
                    return getThisValueAndInvoke(function (o) {
                        return typeof o === 'boolean';
                    });
                },

                /**
                 * True if the object is a function, false otherwise.
                 * @return {Boolean} True if the object is a function, false otherwise.
                 */
                isFunction: function isFunction () {
                    return getThisValueAndInvoke(function (o) {
                        return typeof o === 'function';
                    });
                },

                /**
                 * True if the object is an arguments object, false otherwise
                 * @return {Boolean} True if the object is an arguments object, false otherwise
                 */
                isArguments: function isArguments () {
                    return getThisValueAndInvoke(function (o) {
                        return Object.prototype.toString.call(o) === '[object Arguments]';
                    });
                },

                /**
                 * Convers an object to a number, if possible.
                 * @returns {Number} The object as a float or NaN.
                 * @function
                 */
                toNumber: function toNumber () {
                    return getThisValueAndInvoke(function (o) {
                        return o.isNumeric() ? parseFloat(o) : NaN;
                    });
                },

                /**
                 * Convers an object to an integer, if possible.
                 * @returns {Number} The object as an integer or NaN.
                 * @function
                 */
                toInteger: function toInteger () {
                    return getThisValueAndInvoke(function (o) {
                        return o.isNumeric() ? parseInt(o, 10) : NaN;
                    });
                },

                /**
                 * Creates a new array from the object. If it's a string, it will split the string by ''; if a number, it will
                 * split the number into digits and return an array of digits.
                 * @returns {Array} A new array, created from the object.
                 * @function
                 */
                makeArray: function makeArray () {
                    return getThisValueAndInvoke(function (o) {
                        var arr = [];
                        if(o instanceof Array) return o;
                        o[protoid].each(function (obj) { arr.push(obj); });
                        return arr;
                    });
                },

                /**
                 * Returns a random array item, random object property, random character in a string, or random digit in a number.
                 * @returns {*}
                 * @function
                 */
                random: function random () {
                    return getThisValueAndInvoke(function (o) {
                        if(typeof o === 'object') {
                            return o instanceof Array ?
                                o[Math.floor(Math.random() * o.length)] :
                                o[Object.keys(o)[Math.floor(Math.random() * Object.keys(o).length)]];
                        }
                        else if(typeof o === 'string' || typeof o === 'number') {
                            var val = o, negative = false;

                            if(o.length === 0) return '';
                            if(typeof o === 'number' && o < 0) {
                                negative = true;
                                val = Math.abs(val);
                            }

                            val = val.toString()[Math.floor(Math.random() * val.toString().length)];
                            if(typeof o === 'number') val = parseInt(val, 10);
                            return negative ? -val : val;
                        }
                        return o;
                    });
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
                 * @param {Number=} [rangeA=0] The iteration start index
                 * @param {Number=} [rangeB='length of the item'] The iteration end index
                 * @param {Function} f The callback to invoke for each item within the object
                 * @returns {*} The value passed to the exit parameter of the callback...
                 */
                each: function each (rangeA, rangeB, f) {
                    // Can't use last here.. would cause circular ref...
                    f = undefined;
                    for(var k = arguments.length - 1; k >= 0; k--) if(arguments[k] instanceof Function) f = arguments[k];

                    return getThisValueAndInvoke(function (o) {
                        var ret       = null,
                            broken    = false,
                            self      = o,
                            keys, property, value,

                            exit = function () {
                                var args = arguments[protoid].toArray();
                                broken   = true;
                                ret      = args.length > 1 ? args : args[0];
                            };

                        if(typeof self === 'number' || typeof self === 'function' || typeof self === 'boolean') self = o.toString();

                        // Firefox does some funky stuff here...
                        if(typeof o === 'function') self = self.replace(/(?:\r)?\n+/g, '').replace(/"use strict";|'use strict';/g, '');

                        var isArgs = Object.prototype.toString.call(o) === '[object Arguments]', idx = -1;
                        keys = Object.keys(self);
                        idx  = keys.indexOf('length');

                        if(isArgs && idx > -1) keys.splice(idx, 1);

                        rangeA = parseInt(rangeA);
                        rangeA = (isNaN(rangeA) || rangeA < 0 || !isFinite(rangeA)) ? 0 : rangeA;

                        rangeB = parseInt(rangeB);
                        rangeB = (isNaN(rangeB) || rangeB + 1 > keys.length || !isFinite(rangeB)) ? keys.length : rangeB + 1; // End range is inclusive...
                        rangeB = rangeB < 0 ? 0 : rangeB;

                        var i = 0;
                        if(f instanceof Function) {
                            for(var n = rangeA; n < rangeB; n++) {
                                property = keys[n];
                                value    = (typeof o === 'number' && !isNaN(parseFloat(self[property]))) ? parseFloat(self[property]) : self[property];
                                f.call(o, value, property, n, exit, i++);
                                if(broken) break;
                            }
                        }
                        return ret;
                    });
                },

                /**
                 * Invokes the callback 'f' for every property the object contains. If the callback returns false, the
                 * loop is broken and false is returned; otherwise true is returned.
                 * @param {Function} f The callback to invoke for each item within the object
                 * @returns {Boolean} True if none of the callback invocations returned false.
                 * @function
                 */
                every: function every (f) {
                    f = f instanceof Function ? f : undefined;

                    return getThisValueAndInvoke(function (o) {
                        var self = o, keys, property, value;
                        if(typeof self === 'number' || typeof self === 'function' || typeof self === 'boolean') self = o.toString();
                        keys = Object.keys(self);

                        var i = 0;
                        if(f instanceof Function) {
                            for(var n = 0; n < keys.length; n++) {
                                property = keys[n];
                                value    = (typeof o === 'number' && !isNaN(parseFloat(self[property]))) ? parseFloat(self[property]) : self[property];
                                if(f.call(o, value, property, n, i++) === false) return false;
                            }
                        }
                        return true;
                    });
                },

                /**
                 * Converts an object to an array. For strings, numbers, and functions this will
                 * return a char array to their respective .toString() values
                 * @function
                 * @return {Array<*>} The object, converted to an array.
                 */
                toArray: function toArray () {
                    return getThisValueAndInvoke(function (o) {
                        if(o instanceof Array) return o;

                        var arr = [];
                        o[protoid].each(function (val) { arr.push(val); });
                        return arr;
                    });
                },

                /**
                 * Returns the first n elements of an object. If the object is an array, and only one items is retrieved,
                 * that item will be returned, rather than an array.
                 * @param {Number=} [n=1] The number of elements to return
                 * @return {Array<*>} The first n elements of the array.
                 */
                first: function first (n) {
                    return getThisValueAndInvoke(function (o) {
                        n = parseInt(n, 10);
                        n = isNaN(n) || !isFinite(n) ? 1 : n;
                        var v = null;

                        if(typeof o !== 'object') {
                            v = o.toString().slice(0, n);
                        }
                        else if(o instanceof Array) {
                            v = o.slice(0, n);
                        }
                        else {
                            v = {};
                            o[protoid].each(0, n - 1, function (item, key) { v[key] = item; });
                            var keys = Object.keys(v);
                            return keys.length === 1 ? v[keys[0]] : v;
                        }

                        return v.length === 1 ? v[0] : v;
                    });
                },

                /**
                 * Returns the last n elements of an object. If the object is an array, and only one items is retrieved,
                 * that item will be returned, rather than an array.
                 * @param {Number=} [n=1] The number of elements to return
                 * @return {Array<*>} The last n elements of the array.
                 * @function
                 */
                last: function last (n) {
                    return getThisValueAndInvoke(function (o) {
                        n = parseInt(n, 10);
                        n = isNaN(n) || !isFinite(n) ? 1 : n;
                        var v = null, keys, len, idx;

                        if(stdp.isArguments(o)) {
                            keys = Object.keys(o);
                            idx  = keys.indexOf('length');

                            if(idx > -1) keys.splice(idx, 1);
                            v = []; len = keys.length;
                            keys[protoid].each(len - n, len, function (k) { v.push(o[k]); });
                        }
                        else if(typeof o !== 'object') {
                            v = o.toString().slice(-n);
                        }
                        else if(o instanceof Array) {
                            v = o.slice(-n);
                        }
                        else {
                            v   = {};
                            len = o[protoid].size();

                            o[protoid].each(len - n, len, function (item, key) { v[key] = item; });
                            keys = Object.keys(v);
                            return keys.length === 1 ? v[keys[0]] : v;
                        }
                        return v.length === 1 ? v[0] : v.length > 0 ? v : null;
                    });
                },

                /**
                 * Find a child of an object using the given path, split by the given delimiter (or '.' by default)
                 * @param {String} path The path to the child object
                 * @param {String=} [delimiter='.'] The path delimiter
                 * @param {Function=} done A callback for completion
                 * @return {*|Null} The child object at the given string path, or null if it doesn't exist.
                 * @function
                 */
                findChildAtPath: function findChildAtPath (path, delimiter, original, invoked, done) {
                    done = arguments[protoid].last() instanceof Function ? arguments[protoid].last() : stdp.NULLF;

                    return getThisValueAndInvoke(function (o) {
                        var self = o;

                        original = (!(original instanceof Function) && original) ? original : self;
                        invoked  = invoked || false;

                        if(typeof o === 'object' && typeof path === 'string') {
                            delimiter = typeof delimiter === 'string' ? delimiter : '.';
                            path      = path.split(delimiter);

                            var p = path.shift();
                            if(p) {
                                return self[protoid].each(function (o, k, i, exit) {
                                    if(path.length === 0 && k === p) {
                                        done.call(original, o, self, k);
                                        invoked = true;
                                        exit(o);
                                    }
                                    else {
                                        var obj = o[protoid].findChildAtPath(path.join(delimiter), delimiter, original, invoked, done);
                                        if(obj !== null) exit(obj);
                                    }
                                });
                            }
                        }
                        if(!invoked && original === self && done instanceof Function) done.call(original, null, self, null);
                        return null;
                    });
                },

                /**
                 * Produces a shallow clone of the object, that is, if JSON.stringify can handle it.<br>
                 * The object must be non-circular.
                 * @return {*} A shallow clone of the object.
                 * @function
                 */
                clone: function clone () {
                    return getThisValueAndInvoke(function (o) {
                        if(typeof o === 'string' || typeof o === 'number') return o;

                        try {
                            return JSON.parse(JSON.stringify(o));
                        }
                        catch (e) {
                            throw new Error('Unable to clone object: ' + e.message);
                        }
                    });
                },

                /**
                 * Filters an array or object using only the types allowed. That is, if the item in the array is of a type listed
                 * in the arguments, then it will be added to the filtered array. In this case 'array' is a valid type.
                 * @param {...String} types A list of typeof types that are allowed in the array.
                 * @return {Array<*>} An array filtered by only the allowed types.
                 */
                only: function only (types) {
                    types = arguments[protoid].makeArray();

                    return getThisValueAndInvoke(function (o) {
                        // Allows the 'plural' form of the type...
                        types[protoid].each(function (type, key) { this[key] = type.replace(/s$/, ''); });

                        if(typeof o !== 'object') return o;
                        var isArray  = o instanceof Array ? true : false,
                            filtered = isArray ? [] : {};

                        o[protoid].each(function (item, key) {
                            if(types.indexOf(typeof item) !== -1 || (item instanceof Array && types.indexOf('array') !== -1)) {
                                if(isArray) filtered.push(item); else filtered[key] = item;
                            }
                        });
                        return filtered;
                    });
                },

                /**
                 * Filters an object using the given predicate function. For objects, a new object will be returned, with
                 * the values that passed the predicate function. For strings, a new string will be returned with the characters
                 * that passed the predicate function. For numbers, a new number will be returned with the digits that passed
                 * the predicate function. Functions will be operated on as strings.
                 * @param {Function} predicate The function used to filter the object.
                 * @return {*} The filtered object
                 */
                where: function where (predicate) {
                    return getThisValueAndInvoke(function (o) {
                        if(!(predicate instanceof Function)) return o;

                        var isObject = typeof o === 'object' && !(o instanceof Array) ? true : false,
                            filtered = !isObject ? [] : {};

                        o[protoid].each(function (item, key) {
                            if(predicate.call(item, item)) {
                                if(isObject) filtered[key] = item; else filtered.push(item);
                            }
                        });

                        if(typeof o !== 'object') filtered = filtered.join('');
                        return filtered;
                    });
                },

                /**
                 * Filters an object by keys using the given predicate function.
                 * @param {Function} predicate The function used to filter the object.
                 * @return {*} The filtered object
                 */
                whereKeys: function whereKeys (predicate) {
                    return getThisValueAndInvoke(function (o) {
                        if(!(predicate instanceof Function)) return o;

                        var isObject = typeof o === 'object' && !(o instanceof Array) ? true : false,
                            filtered = !isObject ? [] : {};

                        o[protoid].each(function (item, key) {
                            if(predicate.call(key, key)) {
                                if(isObject) filtered[key] = item; else filtered.push(item);
                            }
                        });

                        if(typeof o !== 'object') filtered = filtered.join('');
                        return filtered;
                    });
                },

                /**
                 * For objects, inverts the objects keys/values. If the value isn't a number or array, it will be omitted.
                 * For strings, it will reverse the string.
                 * For number, it will compute the number's inverse (i.e. 1 / x).
                 * @return {*} The inverse, as described above.
                 */
                invert: function invert () {
                    return getThisValueAndInvoke(function (o) {
                        if(typeof o === 'string') return o[protoid].reverse();
                        if(typeof o === 'number') return 1 / o;

                        var obj = {};
                        o[protoid].each(function (item, key) {
                            if(typeof item === 'string' || typeof item === 'number') obj[item] = key;
                        });

                        return obj;
                    });
                },

                /**
                 * Returns the maximum item in the object.
                 * @param {Function=} func If passed, the function will be invoked for each item in the object collection.
                 * @return {*} The maximum item in the object collection.
                 */
                max: function max (func) {
                    if(!(func instanceof Function)) func = undefined;

                    return getThisValueAndInvoke(function (o) {
                        if(typeof o !== 'object') return o;
                        var max, maxValue;

                        if(!func) {
                            max = o[protoid].first();
                            o[protoid].each(1, function (item) {
                                if(item >= max) max = item;
                            });
                        }
                        else {
                            max = o[protoid].first();
                            maxValue = func.call(max, max);

                            o[protoid].each(1, function (item) {
                                if(func.call(item, item) >= maxValue) max = item;
                            });
                        }
                        return max;
                    });
                },

                /**
                 * Returns the minimum item in the object.
                 * @param {Function=} func If passed, the function will be invoked for each item in the object collection.
                 * @return {*} The minimum item in the object collection.
                 */
                min: function min (func) {
                    if(!(func instanceof Function)) func = undefined;

                    return getThisValueAndInvoke(function (o) {
                        if(typeof o !== 'object') return o;
                        var min, minValue;

                        if(!func) {
                            min = o[protoid].first();
                            o[protoid].each(1, function (item) {
                                if(item <= min) min = item;
                            });
                        }
                        else {
                            min = o[protoid].first();
                            minValue = func.call(min, min);

                            o[protoid].each(1, function (item) {
                                if(func.call(item, item) <= minValue) min = item;
                            });
                        }
                        return min;
                    });
                },

                /**
                 * Tests whether or not the object has a method called 'method'.
                 * @param {String} method The name of the method to test existence for.
                 * @return {Boolean} True if the object has a function called 'method', false otherwise.
                 */
                implements: function _implements (method) {
                    return getThisValueAndInvoke(function (o) {
                        return o && o[method] instanceof Function;
                    });
                },

                /**
                 * Same as Object.j.implements, excepct with a hasOwnProperty check.
                 * @param {String} method The name of the method to test existence for.
                 * @return {Boolean} True if the object has its own function called 'method', false otherwise.
                 */
                implementsOwn: function implementsOwn (method) {
                    return getThisValueAndInvoke(function (o) {
                        return o && o[method] instanceof Function && o.hasOwnProperty(method);
                    });
                }
            }

            // ---------------------------------------- END LIBRARY FUCTIONS ---------------------------------------- //

        };

        // ----------------------------------------- OTHER HELPER FUNCTIONS ----------------------------------------- //
        // These will be attached to the exports object in Node.js, or the window object in the browser.

        /**
         * A generic, do nothing function that can be used over and over again to assign empty callback arguments to. It's better
         * to re-use this function than continuously create empty functions all over the place.
         * @type {Function}
         */
        stdp.NULLF = function NullFunction () {};

        /**
         * Returns 'enabled' if the value of 'i' evaluates to true, 'disabled otherwise'
         * @param {*} i The thingy to evaluate
         * @return {String} Either 'enabled' or 'disabled'
         */
        stdp.enabledOrDisabled = function enabledOrDisabled (i) {
            return i ? 'enabled' : 'disabled';
        };

        /**
         * A replacer function for JSON, to replace functions with '[Function (function name|anonymous)]'. A callback for
         * JSON.stringify. @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
         */
        stdp.JSONFunctionReplacer = function JSONFunctionReplacer (key, value) {
            if(value instanceof Function) return '[Function: ' + (value.name || 'anonymous') + ']';
            return value;
        };

        /**
         * Get's a callback from an array like object.
         * @return {Function} The supplied callback, or a fake one.
         */
        stdp.getCallback = function getCallback (argumentsObject) {
            return invokeInStaticContext(argumentsObject, function () {
                var last = stdp._object.last();
                return last instanceof Function ? last : stdp.NULLF;
            });
        };

        /**
         * Stores user created tokens
         * @type {Object}
         */
        var customTokens = {};

        /**
         * Replaces string tokens ([.*]) with token values
         * @param {String} s The string containing tokens to replace
         * @return {String} The token-replaced string
         */
        stdp.replaceStringTokens = function replaceStringTokens (s) {
            if(typeof s === 'string') {
                s = s.replace(/\[\$DATE-TIME-24]/g , new Date().toLocaleString('en-US', { hour12: false }))
                 .replace(/\[\$DATE-TIME]/g    , new Date().toLocaleString())
                 .replace(/\[\$NOW]/g          , Date.now().toString())
                 .replace(/\[\$TIME]/g         , new Date().toLocaleTimeString())
                 .replace(/\[\$DATE]/g         , new Date().toLocaleDateString())
                 .replace(/\[\$(HOME|~)]/g     , exports.USER_HOME.withoutTrailingSlash())
                 .replace(/\[\$TMPDIR]/g       , exports.TMPDIR);

                for(var i in customTokens) {
                    if(customTokens.hasOwnProperty(i))
                        s = s.replace(new RegExp('\\[\\$' + customTokens[i].name + ']', 'g'), customTokens[i].value);
                }
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
        stdp.createToken = function createToken (named, withValue) {
            if(typeof named !== 'string')
                throw new Error('stdp.createToken expected argument #0 (named) to be a string, got: ' + typeof named);

            if(typeof value !== 'string')
                throw new Error('stdp.createToken expected argument #1 (withValue) to be a string, got: ' + typeof withValue);

            named = named.toUpperCase();
            customTokens[named] = { name: named, value: withValue };
            return stdp;
        };

        /**
         * Creates a single arguments string from an object
         * @param {Object<String>} o The object to convert to an arguments string
         * @param {Boolean=} [produceArray=false] If true, an array of arguments will be returned, otherwise a string
         * (an array joined by ' ') will be returned.
         * @return {String} The arguments string
         */
        stdp.generateArgumentsStringFromObject = function generateArgumentsStringFromObject (o, produceArray) {
            if(o === undefined || o === null || o instanceof Function) return [];
            if(typeof o === 'string' || typeof o === 'number') return [o.toString()];

            var args = [];
            if(o instanceof Array) {
                o[protoid].each(function (val) { args.push(val.toString()); });
                return args;
            }

            invokeInStaticContext(o, function () {
                stdp._object.each(function (val, key) {
                    if(key === '_' && val instanceof Array) {
                        args = args.concat(val);
                    }
                    else if(key.length === 1) {
                        args.push('-' + key, val);
                    }
                    else {
                        args.push('--' + key + '=' + val.toString());
                    }
                });
            });
            return produceArray ? args : args.join(' ');
        };

        /**
         * Generate a random string of alphanumeric characters
         * @memberof String
         * @param {Number=} length The maximum length of the string. If omitted, a random number between 1 - 100 will be used.
         * @param {String=} [possible='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'] A string of possible
         * characters that will be used by the function to generate the random string.
         * @returns {String} A random string
         * @function
         */
        stdp.randomString = function randomString (length, possible) {
            var text = '';
            possible = typeof possible === 'string' ? possible : 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            length   = length || Math.floor(Math.random() * 101);

            for(var i = 0; i < length; i++)
                text += possible.charAt(Math.floor(Math.random() * possible.length));

            return text;
        };

        /**
         * True if and only if all objects provided are null.
         * @param {...*} o The objects to evaluate
         * @return {Boolean}
         */
        stdp.allNull = function () {
            return invokeInStaticContext(arguments, function () {
                return stdp._object.every(function (o) {
                    if(o !== null) return false;
                });
            });
        };

        /**
         * True if and only if all objects provided are undefined.
         * @param {...*} o The objects to evaluate
         * @return {Boolean}
         */
        stdp.allUndefined = function () {
            return invokeInStaticContext(arguments, function () {
                return stdp._object.every(function (o) {
                    if(o !== undefined) return false;
                });
            });
        };

        /**
         * True if and only if all objects provided are booleans.
         * @param {...*} o The objects to evaluate
         * @return {Boolean}
         */
        stdp.allBooleans = function () {
            return invokeInStaticContext(arguments, function () {
                return stdp._object.every(function (o) {
                    if(typeof o !== 'boolean') return false;
                });
            });
        };

        /**
         * True if and only if all objects provided are strings.
         * @param {...*} o The objects to evaluate
         * @return {Boolean}
         */
        stdp.allString = function () {
            return invokeInStaticContext(arguments, function () {
                return stdp._object.every(function (o) {
                    if(typeof o !== 'string') return false;
                });
            });
        };

        /**
         * True if and only if all objects provided are "empty" (either null or undefined).
         * Zero (0) is not empty!
         * @param {...*} o The objects to evaluate
         * @return {Boolean}
         */
        stdp.allEmpty = function () {
            return invokeInStaticContext(arguments, function () {
                return stdp._object.every(function (o) {
                    if(o !== undefined && o !== null) return false;
                });
            });
        };

        /**
         * True if and only if all objects provided are "not empty" (non-null and defined).
         * @param {...*} o The objects to evaluate
         * @return {Boolean}
         */
        stdp.allDefined = function () {
            return invokeInStaticContext(arguments, function () {
                return stdp._object.every(function (o) {
                    if(o === undefined || o === null) return false;
                });
            });
        };

        /**
         * True if and only if all objects provided are arrays.
         * @param {...*} o The objects to evaluate
         * @return {Boolean}
         */
        stdp.allArrays = function () {
            if(arguments.length === 0) return false;
            return invokeInStaticContext(arguments, function () {
                return stdp._object.every(function (o) {
                    if(!(o instanceof Array)) return false;
                });
            });
        };

        /**
         * True if and only if all objects provided are objects.
         * @param {...*} o The objects to evaluate
         * @return {Boolean}
         */
        stdp.allObjects = function () {
            return invokeInStaticContext(arguments, function () {
                return stdp._object.every(function (o) {
                    if(typeof o !== 'object') return false;
                });
            });
        };

        /**
         * True if and only if all objects provided are objects (excluding arrays).
         * @param {...*} o The objects to evaluate
         * @return {Boolean}
         */
        stdp.allStrictlyObjects = function () {
            return invokeInStaticContext(arguments, function () {
                return stdp._object.every(function (o) {
                    if(typeof o !== 'object' || (o instanceof Array)) return false;
                });
            });
        };

        /**
         * True if and only if all objects provided are objects (excluding arrays).
         * @param {...*} o The objects to evaluate
         * @return {Boolean}
         */
        stdp.allArguments = function () {
            return invokeInStaticContext(arguments, function () {
                return stdp._object.every(function (o) {
                    return stdp.isArguments(o);
                });
            });
        };

        /**
         * True if the object is an arguments object, false otherwise.
         * @param {*} o The object to evaluate
         * @return {Boolean} True if the object is an arguments object, false otherwise.
         */
        stdp.isArguments = function (o) {
            return Object.prototype.toString.call(o) === '[object Arguments]';
        };

        if(IS_NODE) require(require('path').join(__dirname, 'lib', 'NodeAddons'))(stdp);
        return stdp.init();
    };

    // ------------------------------------------------ EXPORT stdp ------------------------------------------------- //
    // stdp will be exported as a function, so the user can define custom a custom prototype namespace identifier.
    // It's possible to call the function multiple times, adding the library to each prototype under different names,
    // but this is highly discouraged.

    var stdlibs  = {},
        stdpInit = function (protoid) {
            if(typeof protoid !== 'string') protoid = 'p';
            if(stdlibs[protoid]) return stdlibs[protoid];
            return StdPseudoLib(protoid);
        };

    return IS_NODE ?
        module.exports = stdpInit :
        window.stdp    = stdpInit ;
}());
