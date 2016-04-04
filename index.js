'use strict';
/**
 * A massive prototype standard library, which prevents prototype namespace collisions by "tucking" the library
 * under the namespace 'jlib'.
 *
 * Browser and Node.js compatible. Compatible with both *nix and Windows.
 * Adds a bunch of helper functions to String, Object, Number, Function, and Array prototypes under the object 'jlib'.
 *
 * Prototyping is achieved without using any performance degredating calls to 'bind', and uses a simple object to store the
 * current objects being operated on.
 *
 * This file *avoids* ES6 features wherever possible, for browser compatibility.
 *
 * @author Jason Pollman <jasonjpollman@gmail.com>
 * @module jLib
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
     * @param {String} [protoIdentifier='jl'] A "name" of the namespace to attach to object prototypes. This allows us to re-name
     * the JLibrary, should '.jl' be taken by another libaray.
     */
    var JLibrary = function JLibrary (protoIdentifier) {
        protoIdentifier = typeof protoIdentifier === 'string' ? protoIdentifier : 'j';

        /**
         * The JLib library. An object that contains all of the functions/getters which will be namespaced under each
         * instance prototype using the name 'jlib'.
         * @type {Object}
         */
        var JLib = null,

            /**
             * The object stack. When a JLib function is executed the current (or "this") object is pushed onto the stack,
             * then when performWithCurrent is called, it is popped from the stack. This allows us to use jlib functions
             * within other jlib functions.
             * @type {Array}
             */
            ostack = [];

        /**
         * Executes the given callback with the current object from the object stack. Then pops the object off the
         * object stack.
         * @param {Function} cb The callback to be performed.
         * @return {*} The value returned from the callback execution
         */
        function performWithCurrent (callback) {
            var value = callback(ostack[ostack.length - 1]);
            ostack.pop();
            return value;
        }

        /**
         * Adds all the 'object' prototype classes to the other prototypes j objects.
         */
        function addToOtherPrototypes () {
            for(var n = ['string', 'number', 'array', 'date'], o = n.shift(); o; o = n.shift()) {
                var keys = Object.keys(JLib.object);
                for(var i = 0; i < keys.length; i++) {
                    if(JLib.object.hasOwnProperty(keys[i]) && !JLib[o][keys[i]])
                        JLib[o][keys[i]] = JLib.object[keys[i]];
                }
            }
        }

        /**
         * Properties and methods that will be added to the String.prototype.j object.
         * @type {Object}
         */
        JLib = {

            /**
             * The prototype namespace identifier
             * @type {String}
             */
            PROTO_IDENTIFIER: protoIdentifier,

            /**
             * Exposes the private function JLibrary~performWithCurrent.
             * @type {[type]}
             */
            performWithCurrent: performWithCurrent,

            /**
             * Add to the JLib library
             * @param {String} toPrototype The prototype to add the function to
             * @param {String} name The name of the method
             * @param {Function} func The function to invoke
             * @return {Obejct} The current JLib object
             */
            extend: function (toPrototype, name, func) {
                if(typeof toPrototype !== 'string') return false;
                if(typeof name !== 'string') return false;

                toPrototype = toPrototype.toLowerCase();
                JLib[toPrototype][name] = function () {
                    var args = arguments[protoIdentifier].toArray();

                    return performWithCurrent(function (c) {
                        func.apply(c, args);
                    });
                };

                if(toPrototype === 'object') addToOtherPrototypes();
                return true;
            },

            /**
             * Functions available to String.prototype.j
             * @type {Object}
             */
            string: {

                /**
                 * Returns all the characters found in one string but not the other.
                 * @param {String} other The string to compute the difference against.
                 * @return {String} A difference string.
                 */
                differenceFromString: function differenceFromString (other) {
                    return performWithCurrent(function (s) {
                        if(typeof other !== 'string') return s;
                        var sarr = s.split(''), oarr = other.split('');
                        return sarr[protoIdentifier].differenceFromArray(oarr).join('');
                    });
                },

                /**
                 * Returns only the characters common to both strings
                 * @param {String} other The string to compute the intersection against.
                 * @return {String} The intersection between the two strings.
                 */
                intersectString: function intersectString (other) {
                    return performWithCurrent(function (s) {
                        if(typeof other !== 'string') return s;
                        var sarr = s.split(''), oarr = other.split('');
                        return sarr[protoIdentifier].intersectArray(oarr).join('');
                    });
                },

                /**
                 * Repeat a string 'times' times.
                 * @param {Number} times The number of times to repeat the string
                 * @return {String} The repeated string.
                 */
                repeat: function repeat (times) {
                    times = parseInt(times, 10);
                    times = isNaN(times) || times <= 0 ? 1 : times;

                    return performWithCurrent(function (s) {
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
                    return performWithCurrent(function (s) {
                        what = typeof what === 'string' ? what : '\\s+';
                        return s.replace(new RegExp(what + '$', 'g'), '');
                    });
                },

                /**
                 * Left trims a string. Same as String.trim, but only for the beginning of a string.
                 * @param {String} [what='\\s+'] What to trim.
                 * @return {String} The left trimmed string
                 */
                ltrim: function ltrim (what) {
                    return performWithCurrent(function (s) {
                        what = typeof what === 'string' ? what : '\\s+';
                        return s.replace(new RegExp('^' + what, 'g'), '');
                    });
                },

                /**
                 * Escapes HTML special characters
                 * @return {String} The HTML escaped string
                 */
                htmlEncodeSpecialCharacters: function htmlEncodeSpecialCharacters () {
                    return performWithCurrent(function (s) {
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
                htmlDecodeSpecialCharacters: function htmlDecodeSpecialCharacters () {
                    return performWithCurrent(function (s) {
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
                 * Adds slashes.
                 */
                addSlashes: function addSlashes () {
                    return performWithCurrent(function (s) {
                        return s.replace(/[\\"'\t\n\f\r]/g, '\\$&').replace(/\u0000/g, '\\0');
                    });
                },

                /**
                 * Returns a string with the first letter capitalized
                 * @return {String} The string with the first letter upper cased.
                 * @function
                 */
                ucFirst: function ucFirst () {
                    return performWithCurrent(function (s) {
                        return s.charAt(0).toUpperCase() + s.slice(1);
                    });
                },

                /**
                 * Returns a string with the first letter lowercased
                 * @return {String} The string with the first letter lower cased.
                 * @function
                 */
                lcFirst: function lcFirst () {
                    return performWithCurrent(function (s) {
                        return s.charAt(0).toLowerCase() + s.slice(1);
                    });
                },

                /**
                 * Returns a string in Title Case.
                 * @function
                 * @return {String} The title cased string.
                 */
                titleCase: function titleCase () {
                    return performWithCurrent(function (s) {
                        var arr = [];
                        s.split(' ')[protoIdentifier].each(function (t) {
                            arr.push(t[protoIdentifier].ucFirst());
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
                    return performWithCurrent(function (s) {
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
                ellipses: function ellipses (length, place, ellipses) {
                    return performWithCurrent(function (s) {
                        if(isNaN(parseInt(length, 10))) length = s.length;
                        if(length < 0) length = 0;

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
                    return performWithCurrent(function (s) {
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
                    return performWithCurrent(function (s) {
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
                    return performWithCurrent(function (s) {
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
                    return performWithCurrent(function (s) {
                        if(IS_NODE && require('os').platform === 'win32') return s[protoIdentifier].withoutTrailingSlash() + '\\';
                        return s[protoIdentifier].withoutTrailingSlash() + '/';
                    });
                },

                /**
                 * Escapes regular expression special characters. This is useful is you wish to create a new regular expression
                 * from a stored string value.
                 * @returns {String} The regular expression safe string
                 * @function
                 */
                regexpSafe: function regexpSafe () {
                    return performWithCurrent(function (s) {
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
                    return performWithCurrent(function (s) {
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
                    return performWithCurrent(function (s) {
                        return s.replace(/(\r\n|\n)/g, '<br/>');
                    });
                },

                /**
                 * Replaces tabs with a span element with the class 'tab'
                 * @return {String} The string with tabs converted to spans with the class 'tab'
                 */
                tabsToSpan: function tabsToSpan () {
                    return performWithCurrent(function (s) {
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
                    return performWithCurrent(function (s) {
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
            date: {
                /**
                 * Moves a date forward 'daysInTheFuture' days.
                 * @param {Number} daysInTheFuture The number of days in the future to advance the date
                 * @param {Boolean=} [adjustForWeekend=false] Whether or not the date should fall on a weekend day
                 * @returns {Date} The date, adjusted the number of specified days.
                 * @function
                 */
                advanceDays: function advanceDays (daysInTheFuture, adjustForWeekend) {
                    return performWithCurrent(function (d) {
                        daysInTheFuture = daysInTheFuture && daysInTheFuture[protoIdentifier].isNumeric() ? daysInTheFuture : 1;
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
                    return performWithCurrent(function (d) {
                        monthsInTheFuture = monthsInTheFuture && monthsInTheFuture[protoIdentifier].isNumeric() ? monthsInTheFuture : 1;
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
                    return performWithCurrent(function (d) {
                        yearsInTheFuture = yearsInTheFuture && yearsInTheFuture[protoIdentifier].isNumeric() ? yearsInTheFuture : 1;
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
                    return performWithCurrent(function (d) {
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
                    return performWithCurrent(function (d) {
                        return d.getTime()[protoIdentifier].clockTime(!!omitMS);
                    });
                }
            },

            /**
             * Functions available to Number.prototype.j.
             * @type {Object}
             */
            number: {
                /**
                 * Pads a number with preceeding zeros.
                 * @param {Number} length The final length of the string
                 * @returns {String} The padded number, now a string.
                 * @function
                 */
                pad: function pad (length) {
                    return performWithCurrent(function (n) {
                        return n.toString()[protoIdentifier].pad(length, '0', true);
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
                    return performWithCurrent(function (t) {
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
            array: {

                /**
                 * Shuffles an array
                 * @return {Array<*>} The mixed up array
                 */
                shuffle: function shuffle () {
                    return performWithCurrent(function (a) {
                        for(var i = a.length - 1; i > 0; i--) {
                            var j   = Math.floor(Math.random() * (i + 1)), tmp = a[i];
                            a[i] = a[j];
                            a[j] = tmp;
                        }
                        return a;
                    });
                },

                /**
                 * Computes the union between the current array, and all the array objects passed in. That is,
                 * the set of unique objects present in any of the arrays.
                 * @param {...Array} arr A list of array objects
                 * @return {Array<*>} The union set of the provided arrays.
                 */
                union: function union () {
                    var args = arguments[protoIdentifier].makeArray()[protoIdentifier].only('array');

                    return performWithCurrent(function (a) {
                        var union = [];
                        args.unshift(a);
                        args[protoIdentifier].each(function (array) {
                            array[protoIdentifier].each(function (item) {
                                if(union.indexOf(item) === -1) union.push(item);
                            });
                        });
                        return union;
                    });
                },

                /**
                 * Returns all the items not common to both arrays
                 * @param {...Array} other The array to compute the difference from
                 * @return {Array} A new array with items unique to each array
                 */
                differenceFromArray: function differenceFromArray (other) {
                    return performWithCurrent(function (a) {
                        if(!(other instanceof Array)) return a;

                        var diff = [];
                        a[protoIdentifier].each(function (item) {
                            if(other.indexOf(item) === -1) diff.push(item);
                        });

                        other[protoIdentifier].each(function (item) {
                            if(a.indexOf(item) === -1) diff.push(item);
                        });

                        return diff;
                    });
                },

                /**
                 * Returns all the items common to both arrays
                 * @param {Array} other The array to compute the intersection from
                 * @return {Array} A new array with items common to both arrays
                 */
                intersectArray: function intersectArray (other) {
                    return performWithCurrent(function (a) {
                        if(!(other instanceof Array)) return a;

                        var intersection = [];
                        a[protoIdentifier].each(function (item) {
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
                    var args = arguments[protoIdentifier].makeArray();
                    return performWithCurrent(function (a) {
                        var res  = [];

                        a[protoIdentifier].each(function (v) { if(args.indexOf(v) === -1) res.push(v); });
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
                    return performWithCurrent(function (a) {
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
                 * @param {Number=} [amount=1] The number of times to rotate the array left.
                 * @return {Array<*>} The current array, rotated.
                 * @function
                 */
                rotateLeft: function rotateLeft (amount) {
                    return performWithCurrent(function (a) {
                        return a[protoIdentifier].rotate('left', amount);
                    });
                },

                /**
                 * Rotates the array right the specified number of times.
                 * @param {Number=} [amount=1] The number of times to rotate the array left.
                 * @return {Array<*>} The current array, rotated.
                 * @function
                 */
                rotateRight: function rotateLeft (amount) {
                    return performWithCurrent(function (a) {
                        return a[protoIdentifier].rotate('right', amount);
                    });
                },

                /**
                 * Removes duplicates from the current array.
                 * This is a destructive action, and will modify the array in place.
                 * @returns {Array<*>} The current array, with duplicates removed
                 * @function
                 */
                makeUnique: function makeUnique () {
                    return performWithCurrent(function (a) {
                        var visited = [];
                        for(var i = 0; i < a.length; i++) {
                            if(visited.indexOf(a[i]) === -1) {
                                visited.push(a[i]);
                            }
                            else {
                                a.splice(i, 1);
                                i--;
                            }
                        }
                        return a;
                    });
                },

                /**
                 * Gets an array of unique items from the current array
                 * @returns {Array} A new array with no duplicates
                 * @function
                 */
                unique: function unique () {
                    return performWithCurrent(function (a) {
                        var visited = [],
                            unique  = [];

                        a[protoIdentifier].each(function (item) {
                            if(visited.indexOf(item) === -1) {
                                unique.push(item);
                                visited.push(item);
                            }
                        });
                        return unique;
                    });
                },

                /**
                 * Sorts the array in ascending order
                 * This is a destructive action, and will modify the array in place.
                 * @returns {Array} The array sorted in ascending order
                 * @function
                 */
                ascending: function ascending () {
                    return performWithCurrent(function (a) {
                        return a.sort(function (a, b) {
                            return a < b ? -1 : a > b ? 1 : 0;
                        });
                    });
                },

                /**
                 * Sorts the array in descending order
                 * This is a destructive action, and will modify the array in place.
                 * @returns {Array} The array sorted in descending order
                 * @function
                 */
                descending: function descending () {
                    return performWithCurrent(function (a) {
                        return a.sort((a, b) => {
                            return a > b ? -1 : a < b ? 1 : 0;
                        });
                    });
                }
            },

            /**
             * Functions available to Object.prototype.j.
             * @type {Object}
             */
            object: {

                /**
                 * Returns the object's key set.
                 * @returns {Array<String|Number>} The object's key set
                 * @function
                 */
                keyset : function keyset () {
                    return performWithCurrent(function (o) {
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
                members: function members () {
                    return performWithCurrent(function (o) {
                        switch(true) {
                            case o instanceof Array:
                            case typeof o === 'string':
                                return o.length;

                            case typeof o === 'object':
                                return Object.keys(o).length;

                            case typeof o === 'function':
                                return 1;

                            case typeof o === 'number':
                                return o.toString().length;

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
                    return performWithCurrent(function (o) {
                        return !isNaN(parseFloat(o)) && isFinite(o);
                    });
                },

                /**
                 * Converts an object to a number.
                 * @returns {Number} The object as a number.
                 * @function
                 */
                numeric: function numeric () {
                    return performWithCurrent(function (o) {
                        return parseFloat(o);
                    });
                },

                /**
                 * Determines if an object has no keys, if an array has no items, or if a string === ''.
                 * @returns {Boolean} True if the object is 'empty', false otherwise.
                 * @function
                 */
                isEmpty: function isEmpty () {
                    return performWithCurrent(function (o) {
                        return o[protoIdentifier].members() === 0;
                    });
                },

                /**
                 * True if the object is an array, false otherwise.
                 * @return {Boolean} True if the object is an array, false otherwise.
                 */
                isArray: function isArray () {
                    return performWithCurrent(function (o) {
                        return o[protoIdentifier] instanceof Array;
                    });
                },

                /**
                 * True if the object is an object and not an array, false otherwise.
                 * @return {Boolean} True if the object is an object and not an array, false otherwise.
                 */
                isPureObject: function isPureObject () {
                    return performWithCurrent(function (o) {
                        return !(o[protoIdentifier] instanceof Array) && typeof o === 'object';
                    });
                },

                /**
                 * True if the object is an arguments object, false otherwise
                 * @return {Boolean} True if the object is an arguments object, false otherwise
                 */
                isArguments: function isArguments () {
                    return performWithCurrent(function (o) {
                        return Object.prototype.toString.call(o) === '[object Arguments]';
                    });
                },

                /**
                 * Convers an object to a number, if possible.
                 * @returns {Number} The object as a float or NaN.
                 * @function
                 */
                toNumber: function toNumber () {
                    return performWithCurrent(function (o) {
                        return o.isNumeric() ? parseFloat(o) : NaN;
                    });
                },

                /**
                 * Convers an object to an integer, if possible.
                 * @returns {Number} The object as an integer or NaN.
                 * @function
                 */
                toInteger: function toInteger () {
                    return performWithCurrent(function (o) {
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
                    return performWithCurrent(function (o) {
                        var arr = [];

                        if(o instanceof Array) return o;
                        o[protoIdentifier].each(function (obj) { arr.push(obj); });
                        return arr;
                    });
                },

                /**
                 * Returns a random array item, random object property, random character in a string, or random digit in a number.
                 * @returns {*}
                 * @function
                 */
                random: function random () {
                    return performWithCurrent(function (o) {
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
                    var kf = Object.keys(arguments);
                    f = arguments[kf[kf.length - 1]];
                    f = f instanceof Function ? f : undefined;

                    return performWithCurrent(function (o) {
                        var ret       = null,
                            broken    = false,
                            self      = o,
                            keys, property, value,

                            exit = function () {
                                var args = arguments[protoIdentifier].toArray();
                                broken   = true;
                                ret      = args.length > 1 ? args : args[0];
                            };

                        if(typeof self === 'number' || typeof self === 'function' || typeof self === 'boolean') self = o.toString();
                        keys = Object.keys(self);

                        rangeA = parseInt(rangeA);
                        rangeA = (isNaN(rangeA) || rangeA < 0) ? 0 : rangeA;

                        rangeB = parseInt(rangeB);
                        rangeB = (isNaN(rangeB) || rangeB + 1 > keys.length) ? keys.length : rangeB + 1; // End range is inclusive...
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
                 * Converts an object to an array. For strings, numbers, and functions this will
                 * return a char array to their respective .toString() values
                 * @function
                 * @return {Array<*>} The object, converted to an array.
                 */
                toArray: function toArray () {
                    return performWithCurrent(function (o) {
                        if(o instanceof Array) return o;

                        var arr = [];
                        o[protoIdentifier].each(function (val) { arr.push(val); });
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
                    return performWithCurrent(function (o) {
                        n = parseInt(n, 10);
                        n = isNaN(n) ? 1 : n;
                        var v = null;

                        if(typeof o !== 'object') {
                            v = o.toString().slice(0, n);
                        }
                        else if(o instanceof Array) {
                            v = o.slice(0, n);
                        }
                        else {
                            v = {};
                            o[protoIdentifier].each(0, n - 1, function (item, key) { v[key] = item; });
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
                    return performWithCurrent(function (o) {
                        n = parseInt(n, 10);
                        n = isNaN(n) ? 1 : n;
                        var v = null;

                        if(typeof o !== 'object') {
                            v = o.toString().slice(-n);
                        }
                        else if(o instanceof Array) {
                            v = o.slice(-n);
                        }
                        else {
                            v = {};
                            var len = o[protoIdentifier].members();

                            o[protoIdentifier].each(len - n, len, function (item, key) { v[key] = item; });
                            var keys = Object.keys(v);
                            return keys.length === 1 ? v[keys[0]] : v;
                        }

                        return v.length === 1 ? v[0] : v;
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
                    done = arguments[protoIdentifier].last() instanceof Function ? arguments[protoIdentifier].last() : JLib.NULLF;

                    return performWithCurrent(function (o) {
                        var self = o;

                        original = (!(original instanceof Function) && original) ? original : self;
                        invoked  = invoked || false;

                        if(typeof o === 'object' && typeof path === 'string') {
                            delimiter = typeof delimiter === 'string' ? delimiter : '.';
                            path      = path.split(delimiter);

                            var p = path.shift();
                            if(p) {
                                return self[protoIdentifier].each(function (o, k, i, exit) {
                                    if(path.length === 0 && k === p) {
                                        done.call(original, o, self, k);
                                        invoked = true;
                                        exit(o);
                                    }
                                    else {
                                        var obj = o[protoIdentifier].findChildAtPath(path.join(delimiter), delimiter, original, invoked, done);
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
                    return performWithCurrent(function (o) {
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
                    types = arguments[protoIdentifier].makeArray();

                    return performWithCurrent(function (o) {
                        // Allows the 'plural' form of the type...
                        types[protoIdentifier].each(function (type, key) { this[key] = type.replace(/s$/, ''); });

                        if(typeof o !== 'object') return o;
                        var isArray  = o instanceof Array ? true : false,
                            filtered = isArray ? [] : {};

                        o[protoIdentifier].each(function (item, key) {
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
                    return performWithCurrent(function (o) {
                        if(!(predicate instanceof Function)) return o;

                        var isObject = typeof o === 'object' && !(o instanceof Array) ? true : false,
                            filtered = !isObject ? [] : {};

                        o[protoIdentifier].each(function (item, key) {
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
                    return performWithCurrent(function (o) {
                        if(!(predicate instanceof Function)) return o;

                        var isObject = typeof o === 'object' && !(o instanceof Array) ? true : false,
                            filtered = !isObject ? [] : {};

                        o[protoIdentifier].each(function (item, key) {
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
                    return performWithCurrent(function (o) {
                        if(typeof o === 'string') return o[protoIdentifier].reverse();
                        if(typeof o === 'number') return 1 / o;

                        var obj = {};
                        o[protoIdentifier].each(function (item, key) {
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

                    return performWithCurrent(function (o) {
                        if(typeof o !== 'object') return o;
                        var max, maxValue;

                        if(!func) {
                            max = o[protoIdentifier].first();
                            o[protoIdentifier].each(1, function (item) {
                                if(item >= max) max = item;
                            });
                        }
                        else {
                            max = o[protoIdentifier].first();
                            maxValue = func.call(max, max);

                            o[protoIdentifier].each(1, function (item) {
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

                    return performWithCurrent(function (o) {
                        if(typeof o !== 'object') return o;
                        var min, minValue;

                        if(!func) {
                            min = o[protoIdentifier].first();
                            o[protoIdentifier].each(1, function (item) {
                                if(item <= min) min = item;
                            });
                        }
                        else {
                            min = o[protoIdentifier].first();
                            minValue = func.call(min, min);

                            o[protoIdentifier].each(1, function (item) {
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
                    return performWithCurrent(function (o) {
                        return o && o[method] instanceof Function;
                    });
                },

                /**
                 * Same as Object.j.implements, excepct with a hasOwnProperty check.
                 * @param {String} method The name of the method to test existence for.
                 * @return {Boolean} True if the object has its own function called 'method', false otherwise.
                 */
                implementsOwn: function implementsOwn (method) {
                    return performWithCurrent(function (o) {
                        return o && o[method] instanceof Function && o.hasOwnProperty(method);
                    });
                }
            }
        };

        // Add all the object functions to each of the other types
        addToOtherPrototypes();

        // Append the JLib library to the object prototype
        Object.defineProperty(Object.prototype, protoIdentifier, {
            configurable : false,
            enumerable   : false,
            get          : function () {
                ostack.push(this);
                return JLib.object;
            }
        });

        // Append the JLib library to the string prototype
        Object.defineProperty(String.prototype, protoIdentifier, {
            configurable : false,
            enumerable   : false,
            get          : function () {
                ostack.push(this);
                return JLib.string;
            }
        });

        // Append the JLib library to the number prototype
        Object.defineProperty(Number.prototype, protoIdentifier, {
            configurable : false,
            enumerable   : false,
            get          : function () {
                ostack.push(this);
                return JLib.number;
            }
        });

        // Append the JLib library to the date prototype
        Object.defineProperty(Date.prototype, protoIdentifier, {
            configurable : false,
            enumerable   : false,
            get          : function () {
                ostack.push(this);
                return JLib.date;
            }
        });

        // Append the JLib library to the array prototype
        Object.defineProperty(Array.prototype, protoIdentifier, {
            configurable : false,
            enumerable   : false,
            get          : function () {
                ostack.push(this);
                return JLib.array;
            }
        });

        // ------------------------------------------- OTHER HELPER FUNCTIONS ------------------------------------------- //
        // These will be attached to the exports object in Node.js, or the window object in the browser.

        /**
         * A generic, do nothing function that can be used over and over again to assign empty callback arguments to. It's better
         * to re-use this function than continuously create empty functions all over the place.
         * @type {Function}
         */
        JLib.NULLF = function NullFunction () {};

        /**
         * Returns 'enabled' if the value of 'i' evaluates to true, 'disabled otherwise'
         * @param {*} i The thingy to evaluate
         * @return {String} Either 'enabled' or 'disabled'
         */
        JLib.enabledOrDisabled = function enabledOrDisabled (i) {
            return i ? 'enabled' : 'disabled';
        };

        /**
         * A replacer function for JSON, to replace functions with '[Function (function name|anonymous)]'. A callback for
         * JSON.stringify. @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
         */
        JLib.JSONFunctionReplacer = function JSONFunctionReplacer (key, value) {
            if(value instanceof Function) return '[Function: ' + (value.name || 'anonymous') + ']';
            return value;
        };

        /**
         * Get's a callback from an array like object.
         * @return {Function} The supplied callback, or a fake one.
         */
        JLib.getCallback = function getCallback (argumentsObject) {
            var last = argumentsObject[protoIdentifier].last();
            return last instanceof Function ? last : JLib.NULLF;
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
        JLib.replaceStringTokens = function replaceStringTokens (s) {
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
        JLib.createToken = function createToken (named, withValue) {
            if(typeof named !== 'string')
                throw new Error('JPLib.exportable.createToken expected argument #0 (named) to be a string, got: ' + typeof named);

            if(typeof value !== 'string')
                throw new Error('JPLib.exportable.createToken expected argument #1 (withValue) to be a string, got: ' + typeof withValue);

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
        JLib.generateArgumentsStringFromObject = function generateArgumentsStringFromObject (o, produceArray) {
            if(o === undefined || o === null || o instanceof Function) return [];
            if(typeof o === 'string' || typeof o === 'number') return [o.toString()];

            var args = [];
            if(o instanceof Array) {
                o[protoIdentifier].each(function (val) { args.push(val.toString()); });
                return args;
            }

            o[protoIdentifier].each(function (val, key) {
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
         * Generate a random string of alphanumeric characters
         * @memberof String
         * @param {Number=} length The maximum length of the string. If omitted, a random number between 1 - 100 will be used.
         * @param {String=} [possible='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'] A string of possible
         * characters that will be used by the function to generate the random string.
         * @returns {String} A random string
         * @function
         */
        JLib.randomString = function randomString (length, possible) {
            var text = '';
            possible = typeof possible === 'string' ? possible : 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

            length = length || Math.floor(Math.random() * 101);
            for(var i = 0; i < length; i++)
                text += possible.charAt(Math.floor(Math.random() * possible.length));

            return text;
        };

        if(IS_NODE) require(require('path').join(__dirname, 'lib', 'NodeAddons'))(JLib);
        return JLib;
    };

    // ------------------------------------------------ EXPORT JLIB ------------------------------------------------- //
    // JLib will be exported as a function, so the user can define custom a custom prototype namespace identifier.
    // It's possible to call the function multiple times, adding the library to each prototype under different names,
    // but this is highly discouraged.

    var jlibs = {},
        jInit = function (protoIdentifier) {
            if(typeof protoIdentifier !== 'string') protoIdentifier = 'jl';
            if(jlibs[protoIdentifier]) return jlibs[protoIdentifier];
            return JLibrary(protoIdentifier);
        };

    return IS_NODE ?
        module.exports = jInit :
        window.JLib    = jInit ;
}());

var j = module.exports('j');

var x = [1,2,3,4],
    y = { a: 4, b: 5, c: 6, d: 7 },
    z = -0.123242526272829,
    q = 'jasonpollman';

console.log(x.j.whereKeys(function (k) { console.log(k); return k < 2; }));
console.log(y.j.whereKeys(function (k) { console.log(k); return k === 'a'; }));
