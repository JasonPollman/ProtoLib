(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function () {
    'use strict';

    /**
     * Function Identifier.
     * @type {Number}
     */
    var oid = -1,

     /**
      * True if the Node.js environment is loaded, false otherwise.
      * @type {Boolean}
      */
    IS_BROWSER = typeof window !== 'undefined',

    /**
     * Stores ProtoLib instances for Protolib.get
     * @type {Object}
     */
    Protolibs = {};

    // This provides a way to determine the "id" of a function constructor in an environment agnostic way...
    // It also allows us to give objects a unique id...
    Object.defineProperty(Object.prototype, '__get_protolib_id__', {
        configurable : true,
        enumerable   : false,
        get          : function () {
            if(!(typeof this === 'object' || typeof this === 'function'))
                throw new Error('Cannot get unique id of literal type');

            if(!this.__protolib_id__) {
                Object.defineProperty(this, '__protolib_id__', {
                    configurable : false,
                    enumberable  : false,
                    writable     : false,
                    value        : '0x' + (++oid).toString(16)
                });
            }
            return this.__protolib_id__;
        }
    });

    var _objectUid   = Object.__get_protolib_id__,
        _numberUid   = Number.__get_protolib_id__,
        _stringUid   = String.__get_protolib_id__,
        _arrayUid    = Array.__get_protolib_id__,
        _functionUid = Function.__get_protolib_id__,
        _dateUid     = Date.__get_protolib_id__,
        _errorUid    = Error.__get_protolib_id__,
        _booleanUid  = Boolean.__get_protolib_id__,
        _mathUid     = Math.__get_protolib_id__,
        _regexpUid   = RegExp.__get_protolib_id__;

    var ProtoLib = function ProtoLib (handle) {
        // Prevent Function.call or binding...
        if(!(this instanceof ProtoLib)) return new ProtoLib(handle);

        // Set either the user the default "handle" (library accessor)
        handle = typeof handle === 'string' ? handle : '_';

        /**
         * A self reference.
         * @type {ProtoLib}
         */
        var self = this,

        /**
         * Whether or not the library functions have been attached to the prototypes.
         * @type {Boolean}
         */
        attached = false,

        /**
         * Points to the current this item.
         * @type {*}
         */
        currentThis = null,

        /**
         * Stores cached library proto reference objects
         * @type {Object}
         */
        cached = {},

        /**
         * Stores the constructor chain for each prototype as an array.
         * For example: { string: ['object', 'string'] }.
         * Another example: { myCustomClassThatExtendsString: ['object', 'string', 'myCustomClassThatExtendsString'] }
         * @type {Object}
         */
        inheritanceChain = {},

        /**
         * The static library
         */
        libs = require('./lib/libs')(ProtoLib),

        /**
         * The protolibrary
         */
        libp = require('./lib/libp')(libs, getThisValueAndInvoke);

        // Map the object ids to the library names...
        libp[_objectUid]   = libp.object   || {};
        libp[_stringUid]   = libp.string   || {};
        libp[_numberUid]   = libp.number   || {};
        libp[_arrayUid]    = libp.array    || {};
        libp[_functionUid] = libp.function || {};
        libp[_dateUid]     = libp.date     || {};
        libp[_booleanUid]  = libp.boolean  || {};
        libp[_errorUid]    = libp.error    || {};
        libp[_mathUid]     = libp.math     || {};
        libp[_regexpUid]   = libp.regexp   || {};

        // Tuck unnamed static extensions here...
        libs.my = {};

        /**
         * Deletes the cache for the given constructor, and all others that inherits from its prototype.
         * Which means if constr === Object, all cache will be deleted.
         * @param {Function} constr The constructor to delete the cache for.
         * @return {ProtoLib} The current ProtoLib instance
         */
        function deleteCacheForConstructor (constr) {
            for(var i in inheritanceChain) {
                if(inheritanceChain.hasOwnProperty(i)) {
                    if(inheritanceChain[i].indexOf(constr.__get_protolib_id__) > -1) {
                        cached[i] = undefined;
                        delete cached[i];

                        inheritanceChain[i] = undefined;
                        delete inheritanceChain[i];
                    }
                }
            }
            return self;
        }

        /**
         * Appends all the library functions to this instance for static use.
         * @return {ProtoLib} The current ProtoLib instance
         */
        function attachLibraryToSelf () {
            for(var i in libs)
                if(libs.hasOwnProperty(i) && !self[i]) self[i] = libs[i];
            return self;
        }

        function getProto (o) {
            try {
                return Object.getPrototypeOf(o);
            }
            catch (e) {
                // IE throw when calling Object.getPrototypeOf on primitive values...
                // But not with deprecated __proto__ ???
                return o.__proto__ || o.constructor.prototype; // jshint ignore:line
            }
        }

        /**
         * Adds the library methods from the primitive object prototypes.
         * @return {ProtoLib} The current ProtoLib instance
         */
        function applyLibraryToPrototypes () {
            if(!attached) {
                Object.defineProperty(Object.prototype, handle, {
                    configurable : true,
                    enumerable   : false,
                    // Allow users to overwrite the handle on a per instance basis...
                    set: function (v) {
                        if(this[handle] !== v) {
                            Object.defineProperty(this, handle, {
                                configurable : true,
                                enumerable   : true,
                                writable     : true,
                                value        : v
                            });
                        }
                    },
                    // Returns the libp library...
                    get: function () {
                        var ccId,
                            proto = getProto(this),
                            cId   = proto.constructor.__get_protolib_id__,
                            lib   = {},
                            i     = 0,
                            last  = null,
                            m;

                        currentThis = this;

                        do {
                            ccId = proto.constructor.__get_protolib_id__;
                            if(cached[ccId] && i === 0) {
                                return cached[ccId];
                            }
                            else if(cached[ccId]) {
                                for(m in cached[ccId])
                                    if(cached[ccId].hasOwnProperty(m)) lib[m] = cached[ccId][m];

                                if(!inheritanceChain[cId]) inheritanceChain[cId] = [];
                                inheritanceChain[cId] = inheritanceChain[ccId].concat(inheritanceChain[cId]);
                                cached[cId] = lib;
                                return lib;
                            }
                            else {
                                if(!libp[ccId]) libp[ccId] = {};
                                for(m in libp[ccId])
                                    if(libp[ccId].hasOwnProperty(m)) lib[m] = libp[ccId][m];

                                    if(!inheritanceChain[ccId]) inheritanceChain[ccId] = [];
                                    inheritanceChain[cId].unshift(ccId);

                                cached[cId] = lib;
                                last = ccId;
                            }

                            ++i;
                        }
                        while (proto = getProto(proto)); // jshint ignore:line

                        lib.__protolib_cId__ = cId;
                        return lib;
                    }
                });
                attached = true;
            }
            return self;
        }

        /**
         * Removes the library methods from the primitive object prototypes.
         * @return {ProtoLib} The current ProtoLib instance
         */
        function removeLibraryFromPrototypes () {
            Object.defineProperty(Object.prototype, handle, { value: undefined });
            delete Object.prototype[handle];
            attached = false;
            return self;
        }

        /**
         * Retrieves the last item from the 'thisPointerStack' and invokes the provided callback with it.
         * @param {Function} callback The callback to be invoked with the current 'this' value.
         * @return The result of the invocation of the callback.
         */
        function getThisValueAndInvoke (callback) {
            return callback(currentThis !== undefined && currentThis !== null ?
                (typeof currentThis === 'object' ? currentThis : currentThis.valueOf()) : currentThis
            );
        }

        /**
         * Sets the handle
         * @param {String} h The new handle
         * @return {ProtoLib} The current ProtoLib instance
         */
        this.setHandle = function (h) {
            self.unload();
            if(typeof h === 'string') handle = h;
            self.load();
            return self;
        };

        /**
         * Adds a library method to a prototype.
         * @param {Function=} [constr=Object] The constructor of the object to extend.
         * @param {String} name The name of the library method to add.
         * @param {Function} callback The method to add.
         * @return {Boolean} True if the method was added, false otherwise.
         */
        this.extend = function (constr, name, staticNamespace, callback) {
            callback = libs.object.getCallback(arguments);

            if(typeof constr === 'string') {
                name = constr;
                constr = undefined;
            }

            if(typeof name !== 'string'     || !(callback instanceof Function)) return false;
            if(typeof constr !== 'function' || constr === callback) constr = Object;

            var constructorId   = constr.__get_protolib_id__,
                constructorName = typeof staticNamespace === 'string' ?
                    staticNamespace : typeof constr.name === 'string' ? constr.name : null;

            switch(true) {
                case constr === Object:
                    constructorName = 'object';
                    break;

                case constr === Array:
                    constructorName = 'array';
                    break;

                case constr === String:
                    constructorName = 'string';
                    break;

                case constr === Number:
                    constructorName = 'number';
                    break;

                case constr === Function:
                    constructorName = 'function';
                    break;

                case constr === Date:
                    constructorName = 'date';
                    break;

                case constr === Boolean:
                    constructorName = 'boolean';
                    break;

                case constr === Error:
                    constructorName = 'date';
                    break;

                case constr === RegExp:
                    constructorName = 'regexp';
                    break;
            }

            if(!libp[constructorId])   libp[constructorId]   = {};
            if(!libs[constructorName]) libs[constructorName] = {};

            // Add static version..
            var staticVersion = function (o) { return callback.apply(o, arguments); };
            if(constructorName) {

                // Set this property so we can remove it later if ProtoLib.remove is called on it...
                Object.defineProperty(constr, '__protolib_static_namespace__', {
                    configurable : true,
                    writable     : true,
                    enumerable   : false,
                    value        : constructorName
                });

                libs[constructorName][name] = staticVersion;
            }

            // We always add extended functions to libs.my
            libs.my[name] = staticVersion;

            // Add instance version...
            libp[constructorId][name]   = function () {
                var args = libs.object.toArray(arguments);
                return getThisValueAndInvoke(function (c) {
                    args.unshift(c);
                    return callback.apply(c, args);
                });
            };

            deleteCacheForConstructor(constr);
            return true;
        };

        /**
         * Removes a library method from a constructor's prototype.
         * @param {Function} constr The constructor to remove the method from.
         * @param {String} name The name of the library method to remove.
         * @return {Boolean} True if the method was removed, false otherwise.
         */
        this.remove = function (constr, name) {
            if(typeof name !== 'string' || typeof constr !== 'function') return false;

            var uid = constr.__get_protolib_id__;
            if(libp[uid] && libp[uid][name]) {
                libp[uid][name] = undefined;
                delete libp[uid][name];

                // Remove from static namespace, if added there...
                if(libs[constr.__protolib_static_namespace__] && libs[constr.__protolib_static_namespace__][name]) {
                    libs[constr.__protolib_static_namespace__][name] = undefined;
                    delete libs[constr.__protolib_static_namespace__][name];
                }

                // Remove from libs.my
                if(libs.my[name]) {
                    libs.my[name] = undefined;
                    delete libs.my[name];
                }

                deleteCacheForConstructor(constr);
                return true;
            }
            return false;
        };

        /**
         * Removes the prototype library reference from the object prototype.
         * @return {ProtoLib} The current ProtoLib instance
         */
        this.unload = function () {
            removeLibraryFromPrototypes();
            ProtoLib[handle] = undefined;
            delete ProtoLib[handle];
            return self;
        };

        /**
         * Applies the library to the object prototype and all static functions
         * to the current ProtoLib instance.
         * @return {ProtoLib} The current ProtoLib instance
         */
        this.load = function () {
            applyLibraryToPrototypes();
            attachLibraryToSelf();
            return self;
        };

        /**
         * Delets the library cache
         * @param {Function=} constr The constructor function to kill the cache for.
         * @return {ProtoLib} The current ProtoLib instance.
         */
        this.killCache = function (constr) {
            if(constr) {
                if(typeof constr === 'function') {
                    cached[constr.__get_protolib_id__] = undefined;
                    delete cached[constr.__get_protolib_id__];

                    inheritanceChain[constr.__get_protolib_id__] = undefined;
                    delete inheritanceChain[constr.__get_protolib_id__];
                }
            }
            else {
                cached = {};
                inheritanceChain = {};
            }
            return self;
        };

        // Apply the library to the object prototype, and attach all the static functions
        // to the current ProtoLib instance...
        self.load();

        // Add this instance to the Protolib "container"
        Protolibs[handle] = self;
    };

    /**
     * Gets a ProtoLib library by handle, or, an instance with the given handle doesn't exist, creates one.
     * @param {String=} [handle='_'] The handle for the instance to get or create.
     * @return {ProtoLib} The new (or retrieved) ProtoLib instance.
     */
    ProtoLib.get = function get (handle) {
        handle = typeof handle === 'string' ? handle : '_';
        return Protolibs[handle] || new ProtoLib(handle);
    };

    /**
     * Deletes the cache for the Protolib instance with the given handle. If no handle is specified,
     * the cache for all instances will be deleted.
     * @param {String=} handle The handle of the instance to delete
     * @return {Function} The ProtoLib constructor
     */
    ProtoLib.killCache = function killCache (handle) {
        if(Protolibs[handle] instanceof ProtoLib) {
            Protolibs[handle].killCache();
        }
        else if(!handle) {
            for(var n in Protolibs) {
                if(Protolibs.hasOwnProperty(n)) Protolibs[n].killCache();
            }
        }
        return ProtoLib;
    };

    /**
     * Deletes the cache for the given constructor for all ProtoLib instances.
     * @param {String=} constr The constructor cache to delete
     * @return {Function} The ProtoLib constructor
     */
    ProtoLib.killCacheForConstructor = function killCacheForConstructor (constr) {
        for(var n in Protolibs) {
            if(Protolibs.hasOwnProperty(n)) Protolibs[n].killCache(constr);
        }
        return ProtoLib;
    };

    /**
     * Removes the library methods from Object[handle] and releases the ProtoLib instance for garbage collection (if
     * it's not references elsewhere).
     * @param {String=} [handle='_'] The handle of the ProtoLib instance to
     * @return {Function} The ProtoLib constructor
     */
    ProtoLib.destroy = function destroy (handle) {
        handle = typeof handle === 'string' ? handle : '_';
        if(typeof Protolibs[handle] === 'object') {
            Protolibs[handle].unload();
            Protolibs[handle] = undefined;
            delete Protolibs[handle];
        }
        return ProtoLib;
    };

    return !IS_BROWSER ?
        module.exports  = ProtoLib :
        window.ProtoLib = ProtoLib ;
}());

},{"./lib/libp":2,"./lib/libs":3}],2:[function(require,module,exports){
(function () {
    'use strict';
    function libp (libs, getThisValueAndInvoke) {
        var libp = {
            string: {
                toJSValue: function toJSValue () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.toJSValue(s);
                    });
                },

                camelize: function camelize () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.camelize(s);
                    });
                },

                decamelize: function decamelize () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.decamelize(s);
                    });
                },

                differenceFromString: function differenceFromString (other) {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.differenceFromString(s, other);
                    });
                },

                replaceTokens: function replaceTokens () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.replaceStringTokens(s);
                    });
                },

                intersectString: function intersectString (other) {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.intersectString(s, other);
                    });
                },

                repeat: function repeat (times) {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.repeat(s, times);
                    });
                },

                rtrim: function rtrim (what) {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.rtrim(s, what);
                    });
                },

                ltrim: function ltrim (what) {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.ltrim(s, what);
                    });
                },

                htmlEncode: function htmlEncode () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.htmlEncode(s);
                    });
                },

                htmlDecode: function htmlDecode () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.htmlDecode(s);
                    });
                },

                addSlashes: function addSlashes () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.addSlashes(s);
                    });
                },

                ucFirst: function ucFirst () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.ucFirst(s);
                    });
                },

                lcFirst: function lcFirst () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.lcFirst(s);
                    });
                },

                titleCase: function titleCase () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.titleCase(s);
                    });
                },

                splice: function splice (index, count, add) {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.splice(s, index, count, add);
                    });
                },

                ellipses: function ellipses_ (length, place, ellipses) {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.ellipses(s, length, place, ellipses);
                    });
                },

                shuffle: function shuffle (splitter) {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.shuffle(s, splitter);
                    });
                },

                reverse: function reverse () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.reverse(s);
                    });
                },

                withoutTrailingSlash: function withoutTrailingSlash () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.withoutTrailingSlash(s);
                    });
                },

                withTrailingSlash: function withTrailingSlash () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.withTrailingSlash(s);
                    });
                },

                regexpSafe: function regexpSafe () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.regexpSafe(s);
                    });
                },

                pad: function pad (length, delim, pre) {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.pad(s, length, delim, pre);
                    });
                },

                newlineToBreak: function newlineToBreak () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.newlineToBreak(s);
                    });
                },

                tabsToSpan: function tabsToSpan () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.tabsToSpan(s);
                    });
                },

                wordWrapToLength: function wordWrapToLength (width, padleft, padright, omitFirst) {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.wordWrapToLength(s, width, padleft, padright, omitFirst);
                    });
                },
            },

            array: {
                shuffle: function shuffle () {
                    return getThisValueAndInvoke(function (a) {
                        return libs.array.shuffle(a);
                    });
                },

                union: function union () {
                    var args = libs.object.toArray(arguments);
                    return getThisValueAndInvoke(function (a) {
                        args.unshift(a);
                        return libs.array.union.apply(a, args);
                    });
                },

                difference: function difference () {
                    var args = libs.object.toArray(arguments);
                    return getThisValueAndInvoke(function (a) {
                        args.unshift(a);
                        return libs.array.difference.apply(a, args);
                    });
                },

                intersect: function intersect () {
                    var args = libs.object.toArray(arguments);
                    return getThisValueAndInvoke(function (a) {
                        args.unshift(a);
                        return libs.array.intersect.apply(a, args);
                    });
                },

                without: function without () {
                    var args = libs.object.toArray(arguments);
                    return getThisValueAndInvoke(function (a) {
                        args.unshift(a);
                        return libs.array.without.apply(a, args);
                    });
                },

                rotate: function rotate (direction, amount) {
                    return getThisValueAndInvoke(function (a) {
                        return libs.array.rotate(a, direction, amount);
                    });
                },

                rotateLeft: function rotateLeft (amount) {
                    return getThisValueAndInvoke(function (a) {
                        return libs.array.rotateLeft(a, amount);
                    });
                },

                rotateRight: function rotateRight (amount) {
                    return getThisValueAndInvoke(function (a) {
                        return libs.array.rotateRight(a, amount);
                    });
                },

                makeUnique: function makeUnique () {
                    return getThisValueAndInvoke(function (a) {
                        return libs.array.makeUnique(a);
                    });
                },

                unique: function unique () {
                    return getThisValueAndInvoke(function (a) {
                        return libs.array.unique(a);
                    });
                },

                ascending: function ascending () {
                    return getThisValueAndInvoke(function (a) {
                        return libs.array.ascending(a);
                    });
                },

                descending: function descending () {
                    return getThisValueAndInvoke(function (a) {
                        return libs.array.descending(a);
                    });
                }
            },

            number: {

                withPlaceholders: function () {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.withPlaceholders(n);
                    });
                },

                formatMoney: function (symbol) {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.formatMoney(n, symbol);
                    });
                },

                to: function to_ (k) {
                    return getThisValueAndInvoke(function (n) {
                        var isInt = false;
                        if(n % 1 === 0 && n.toString().indexOf('.') === -1) isInt = true;
                        return isInt ? libs.number.randomIntInRange(n, k) : libs.number.randomNumberInRange(n, k);
                    });
                },

                isInt: function isInt () {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.isInt(n);
                    });
                },

                factorial: function factorial () {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.factorial(n);
                    });
                },

                choose: function choose (k) {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.choose(n, k);
                    });
                },

                pad: function pad (length) {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.pad(n, length);
                    });
                },

                daysFrom: function daysFrom (date) {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.daysFrom(n, date);
                    });
                },

                daysFromNow: function daysFromNow () {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.daysFromNow(n);
                    });
                },

                secondsFrom: function secondsFrom (date) {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.secondsFrom(n, date);
                    });
                },

                secondsFromNow: function secondsFromNow () {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.secondsFromNow(n);
                    });
                },

                yearsFrom: function yearsFrom (date) {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.yearsFrom(n, date);
                    });
                },

                yearsFromNow: function yearsFromNow () {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.yearsFromNow(n);
                    });
                },

                monthsFrom: function monthsFrom (date) {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.monthsFrom(n, date);
                    });
                },

                monthsFromNow: function monthsFromNow () {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.monthsFromNow(n);
                    });
                },

                hoursFrom: function hoursFrom (date) {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.hoursFrom(n, date);
                    });
                },

                hoursFromNow: function hoursFromNow () {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.hoursFromNow(n);
                    });
                },

                minutesFrom: function minutesFrom (date) {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.minutesFrom(n, date);
                    });
                },

                minutesFromNow: function minutesFromNow () {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.minutesFromNow(n);
                    });
                },

                monthsAgo: function monthsAgo () {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.monthsAgo(n);
                    });
                },

                daysAgo: function daysAgo () {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.daysAgo(n);
                    });
                },

                secondsAgo: function secondsAgo () {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.secondsAgo(n);
                    });
                },

                minutesAgo: function minutesAgo () {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.minutesAgo(n);
                    });
                },

                yearsAgo: function yearsAgo () {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.yearsAgo(n);
                    });
                },

                clockTime: function clockTime (omitMS) {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.clockTime(n, omitMS);
                    });
                }
            },

            function: {
                inherits: function inherits (s) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.function.inherits(o, s);
                    });
                }
            },

            object: {
                uniqueId: function uniqueId () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.uniqueId(o);
                    });
                },

                histogram: function histogram () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.histogram(o);
                    });
                },

                copy: function copy () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.copy(o);
                    });
                },

                each: function each (start, end, callback) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.each(o, start, end, callback);
                    });
                },

                occurrencesOf: function occurrencesOf (what) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.occurrencesOf(o, what);
                    });
                },

                keys: function keys () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.keys(o);
                    });
                },

                size: function size () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.size(o);
                    });
                },

                isNumeric: function isNumeric () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.isNumeric(o);
                    });
                },

                getNumeric: function getNumeric () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.getNumeric(o);
                    });
                },

                isEmpty: function isEmpty () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.isEmpty(o);
                    });
                },

                isArray: function isArray () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.isArray(o);
                    });
                },

                isPureObject: function isPureObject () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.isPureObject(o);
                    });
                },

                isString: function isString () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.isString(o);
                    });
                },

                isUndefined: function isUndefined () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.isUndefined(o);
                    });
                },

                isNull: function isNull () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.isNull(o);
                    });
                },

                isBoolean: function isBoolean () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.isBoolean(o);
                    });
                },

                isFunction: function isFunction () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.isFunction(o);
                    });
                },

                isArguments: function isArguments () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.isArguments(o);
                    });
                },

                toNumber: function toNumber () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.toNumber(o);
                    });
                },

                toInt: function toInt () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.toInt(o);
                    });
                },

                toArray: function toArray () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.toArray(o);
                    });
                },

                getCallback: function getCallback () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.getCallback(o);
                    });
                },

                random: function random () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.random(o);
                    });
                },

                every: function every (f) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.every(o, f);
                    });
                },

                any: function any (f) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.any(o, f);
                    });
                },

                first: function first (n) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.first(o, n);
                    });
                },

                last: function last (n) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.last(o, n);
                    });
                },

                findChildAtPath: function findChildAtPath (path, delimiter, done) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.findChildAtPath(o, path, delimiter, done);
                    });
                },

                clone: function clone (replacer) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.clone(o, replacer);
                    });
                },

                only: function only () {
                    var args = libs.object.toArray(arguments);
                    return getThisValueAndInvoke(function (o) {
                        args.unshift(o);
                        return libs.object.only.apply(o, args);
                    });
                },

                where: function where (predicateFunction) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.where(o, predicateFunction);
                    });
                },

                whereKeys: function whereKeys (predicateFunction) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.whereKeys(o, predicateFunction);
                    });
                },

                invert: function invert () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.invert(o);
                    });
                },

                max: function max (f) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.max(o, f);
                    });
                },

                keyOfMax: function keyOfMax (f) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.keyOfMax(o, f);
                    });
                },

                min: function min (f) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.min(o, f);
                    });
                },

                keyOfMin: function keyOfMin (f) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.keyOfMin(o, f);
                    });
                },

                implements: function _implements (method) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.implements(o, method);
                    });
                },

                implementsOwn: function implementsOwn (method) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.implementsOwn(o, method);
                    });
                },
            },

            date: {
                advanceDays: function advanceDays (n, adjustForWeeked) {
                    return getThisValueAndInvoke(function (d) {
                        return libs.date.advanceDays(d, n, adjustForWeeked);
                    });
                },

                advanceMonths: function advanceMonths (n, adjustForWeeked) {
                    return getThisValueAndInvoke(function (d) {
                        return libs.date.advanceMonths(d, n, adjustForWeeked);
                    });
                },

                advanceYears: function advanceYears (n, adjustForWeeked) {
                    return getThisValueAndInvoke(function (d) {
                        return libs.date.advanceYears(d, n, adjustForWeeked);
                    });
                },

                yyyymmdd: function yyyymmdd (delim) {
                    return getThisValueAndInvoke(function (d) {
                        return libs.date.yyyymmdd(d, delim);
                    });
                },

                clockTime: function clockTime (omitMS) {
                    return getThisValueAndInvoke(function (d) {
                        return libs.date.clockTime(d, !!omitMS);
                    });
                },
            },

            error: {
                /** @todo: Add some Error utility functions... */
            },

            boolean: {
                /** @todo: Add some Boolean utility functions... */
            },

            math: {
                /** @todo: Add some Math utility functions... */
            },

            regexp: {
                /** @todo: Add some RegExp utility functions... */
            }
        };

        return libp;
    }
    module.exports = libp;
}());

},{}],3:[function(require,module,exports){
(function () {
    'use strict';

    function libs (ProtoLib) {
        var IS_BROWSER = typeof window !== 'undefined',
            HAS_OS     = IS_BROWSER ? false : typeof require('os') === 'object';

        // Used in Object.setPrototypeOf polyfill only
        var exclude = ['length', 'name', 'arguments', 'caller', 'prototype'];

        // Used in Object.setPrototypeOf polyfill only
        function bindFunction(o, fn) {
            return function() { return fn.apply(o, arguments); };
        }

        // Used in Object.setPrototypeOf polyfill only
        function bindProperty(o, parent, prop) {
            Object.defineProperty(o, prop, {
                get: function () {
                    try { return parent[prop]; } catch (e) {}
                },
                set: function (val) {
                    try { parent[prop] = val; } catch(e) {}
                },
                configurable: true
            });
        }

        /**
         * Sets the properties on an obj from the given prototype.
         * Used in the case that Object.setPrototypeOf and Object.__proto__ is unavailable, e.g. only IE < 11
         */
        function iterateProperties (_sub, _super) {
            var props = Object.getOwnPropertyNames(_super),
                proto;

            _sub.__proto__ = _super; // jshint ignore:line
            for(var i = 0, len = props.length; i < len; i++) {
                var prop = props[i];

                if (prop === '__proto__') {
                    proto = _super.__proto__; // jshint ignore:line
                }
                else if(exclude.indexOf(i) === -1) {
                    var descriptor = Object.getOwnPropertyDescriptor(_sub, prop);
                    if(!descriptor) {
                        var superDescriptor = Object.getOwnPropertyDescriptor(_super, prop);
                        if(typeof superDescriptor.get !== 'function' && typeof _super[prop] === 'function') {
                            _sub[prop] = bindFunction(_sub, _super[prop]);
                        }
                        else {
                            bindProperty(_sub, _super, prop);
                        }
                    }
                }
            }

            if(proto) iterateProperties(_sub, proto);
            return _sub;
        }

        // Polyfill Object.setPrototypeOf
        Object.setPrototypeOf = Object.setPrototypeOf || function setPrototypeOfPolyfill (_sub, _super) {
            if(_sub.__proto__) {          // jshint ignore:line
                _sub.__proto__ = _super;  // jshint ignore:line
            }
            else {
                iterateProperties(_sub, _super);
            }
            return _sub;
        };

        /**
         * Alters Firefox's Function.toString() results to match Chrome/Safari.
         * @param {String} s The string representation of the function.
         * @return {String} The altered string, with newlines replaced and 'use strict' removed.
         */
        function fixFirefoxFunctionString (s) {
            return s.replace(/(?:\r)?\n+/g, '').replace(/"use strict";|'use strict';/g, '');
        }

        /**
         * IE doesn't allow Object.keys on primitive types...
         * @return {Array<String|Number>}
         */
        function getKeys (o) {
            switch(typeof o) {
                case 'object':
                    return o ? Object.keys(o) : [];

                case 'string':
                    var keys = [];
                    for(var i = 0; i < o.length; i++) keys.push(i.toString());
                    return keys;

                default:
                    return [];
            }
        }

        var NULL_FUNCTION = function EMPTY_CALLBACK_REPLACEMENT () {};

        var libs = {

            /**
             * String library functions
             * @type {Object}
             */
            string: {

                toJSValue: function toJSValue (s) {
                    var original = s;
                    s = s.trim();

                    switch(true) {
                        case s === 'false'     : return false;
                        case s === 'true'      : return true;
                        case s === 'null'      : return null;
                        case s === 'undefined' : return undefined;

                        case libs.object.isNumeric(s):
                            return libs.object.getNumeric(s);

                        default: return original;
                    }
                },

                randomString: function randomString (length, possible) {
                    possible = typeof possible === 'string' ? possible : '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSUVWXYZ_ `~!@#$%^&*()_+\\|][\';/.,|}{":?><';
                    length   = libs.object.isNumeric(length) ? length : 10;

                    var res = '';
                    for(var i = 0; i < length; i++)
                        res += possible.charAt(Math.floor(Math.random() * possible.length));
                    return res;
                },

                /**
                 * Camelizes all of the provided string arguments.
                 * @param {...String} string A list of strings to camelize.
                 * @return {Array<String>} An array of the provided arguments, with all strings camelized.
                 */
                camelize: function camelize () {
                    var ret = [];
                    libs.object.every(arguments, function (s) {
                        if(s) {
                            if(typeof s === 'function') s = fixFirefoxFunctionString(s.toString());
                            s = s.toString().replace(/[^a-z0-9$]/gi, '_').replace(/\$(\w)/g, '$_$1').split(/[\s_]+/g);
                            libs.object.each(s, 1, s.length, function (i, k) {
                                this[k] = libs.string.ucFirst(i);
                            });
                            s = libs.string.lcFirst(s.join(''));
                        }
                        ret.push(s);
                    });
                    return ret.length === 1 ? ret[0] : ret;
                },

                /**
                 * Decamelizes all of the provided string arguments.
                 * @param {...String} string A list of strings to decamelize.
                 * @return {Array<String>} An array of the provided arguments, with all strings decamelized.
                 */
                decamelize: function decamelize () {
                    var ret = [];
                    libs.object.every(arguments, function (s) {
                        if(s) {
                            if(typeof s === 'function') s = fixFirefoxFunctionString(s.toString());
                            s = s.toString().replace(/([A-Z$])/g, function ($) {
                                return ' ' + (typeof $ === 'string' ? $.toLowerCase() : '');
                            }).replace(/function \(\)/g, 'function()');
                        }
                        ret.push(typeof s === 'string' ? s.trim() : s);
                    });
                    return ret.length === 1 ? ret[0] : ret;
                },

                /**
                 * Returns all the characters found in one string but not the other.
                 * @param {String} s The string to operate on.
                 * @param {String} other The string to compute the difference against.
                 * @return {String} A difference string.
                 */
                differenceFromString: function differenceFromString (s, other) {
                    if(typeof other !== 'string' || typeof s !== 'string') return s;
                    var sarr = s.split(''), oarr = other.split('');
                    return libs.array.difference(sarr, oarr).join('');
                },

                /**
                 * Returns only the characters common to both strings
                 * @param {String} s The string to operate on.
                 * @param {String} other The string to compute the intersection against.
                 * @return {String} The intersection between the two strings.
                 */
                intersectString: function intersectString (s, other) {
                    if(typeof other !== 'string' || typeof s !== 'string') return s;
                    var sarr = s.split(''), oarr = other.split('');
                    return libs.array.intersect(sarr, oarr).join('');
                },

                /**
                 * Repeat a string 'times' times.
                 * @param {String} s The string to operate on.
                 * @param {Number} times The number of times to repeat the string
                 * @return {String} The repeated string.
                 */
                repeat: function repeat (s, times) {
                    times = parseInt(times, 10);
                    times = isNaN(times) || !isFinite(times) || times <= 0 ? 1 : times;

                    var os = s;
                    for(var i = 1; i < times; i++) s += os;
                    return s;
                },

                /**
                 * Right trims a string. Same as String.trim, but only for the end of a string.
                 * @param {String} s The string to operate on.
                 * @param {String} [what='\\s+'] What to trim.
                 * @return {String} The right trimmed string
                 */
                rtrim: function rtrim (s, what) {
                    what = typeof what === 'string' ? what : '\\s+';
                    return s.replace(new RegExp(what + '$'), '');
                },

                /**
                 * Left trims a string. Same as String.trim, but only for the beginning of a string.
                 * @param {String} s The string to operate on.
                 * @param {String} [what='\\s+'] What to trim.
                 * @return {String} The left trimmed string
                 */
                ltrim: function ltrim (s, what) {
                    what = typeof what === 'string' ? what : '\\s+';
                    return s.replace(new RegExp('^' + what), '');
                },

                /**
                 * Escapes HTML special characters
                 * @param {String} s The string to operate on.
                 * @return {String} The HTML escaped string
                 */
                htmlEncode: function htmlEncode (s) {
                    var map = {
                        '&'  : '&amp;',
                        '<'  : '&lt;',
                        '>'  : '&gt;',
                        '"'  : '&quot;',
                        '\'' : '&#039;'
                    };
                    return s.replace(/[&<>"']/g, function (m) { return map[m]; });
                },

                /**
                 * Un-escapes HTML special characters
                 * @param {String} s The string to operate on.
                 * @return {String} The HTML escaped string
                 */
                htmlDecode: function htmlDecode (s) {
                    var map = {
                        '&amp;'  : '&',
                        '&lt;'   : '<',
                        '&gt;'   : '>',
                        '&quot;' : '"',
                        '&#039;' : '\''
                    };
                    return s.replace(/(&amp;|&lt;|&gt;|&quot;|&#039;)/g, function (m) { return map[m]; });
                },

                /**
                 * Creates an 'eval' safe string, by adding slashes to ", ', \t, \n, \f, \r, and the NULL byte.
                 * @param {String} s The string to operate on.
                 * @return {String} A string with slashes
                 */
                addSlashes: function addSlashes (s) {
                    return s.replace(/[\\"'\t\n\f\r]/g, '\\$&').replace(/\u0000/g, '\\0');
                },

                /**
                 * Returns a string with the first letter capitalized.
                 * @param {String} s The string to operate on.
                 * @return {String} The string with the first letter upper cased.
                 * @function
                 */
                ucFirst: function ucFirst (s) {
                    return s.charAt(0).toUpperCase() + s.slice(1);
                },

                /**
                 * Returns a string with the first letter lowercased.
                 * @param {String} s The string to operate on.
                 * @return {String} The string with the first letter lower cased.
                 * @function
                 */
                lcFirst: function lcFirst (s) {
                    return s.charAt(0).toLowerCase() + s.slice(1);
                },

                /**
                 * Returns a string in Title Case.
                 * @param {String} s The string to operate on.
                 * @return {String} The title cased string.
                 * @function
                 */
                titleCase: function titleCase (s) {
                    var arr = [];
                    libs.object.each(s.split(' '), function (t) { arr.push(libs.string.ucFirst(t)); });
                    return arr.join(' ');
                },

                /**
                 * Splices a string, much like an array.
                 * @param {String} s The string to operate on.
                 * @param {Number} index The index to begin splicing the string at
                 * @param {Number} count The number of characters to delete
                 * @param {String} add The string to append at the spliced section
                 * @return {String} The spliced string.
                 * @function
                 */
                splice: function splice (s, index, count, add) {
                    return s.slice(0, index) + (add || '') + s.slice(index + count);
                },

                /**
                 * Return a truncated string with ellipses.
                 * @param {String} s The string to operate on.
                 * @param {Number=} length The length of the desired string. If ommited, the strings original length will be used.
                 * @param {String=} [place='back'] Possible values are 'front' and 'back'. Specifying 'front' will truncate the
                 * string and add ellipses to the front, 'back' (or any other value) will add the ellipses to the back.
                 * @param {String=} [ellipses='...'] The string value of the ellipses. Use this to add anything other than '...'
                 * @returns {String} A truncated string with ellipses (if its length is greater than 'length')
                 * @function
                 */
                ellipses: function ellipses_ (s, length, place, ellipses) {
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
                },

                /**
                 * Shuffles a string
                 * @param {String} s The string to operate on.
                 * @param {String} splitter A string used to split the string, to tokenize it before shuffling.
                 * @return {String} The mixed up string.
                 */
                shuffle: function shuffle (s, splitter) {
                    var a = s.split(typeof splitter === 'string' ? splitter : ''), n = a.length,
                    replaceSplits = n - 1;

                    for(var i = n - 1; i > 0; i--) {
                        var j = Math.floor(Math.random() * (i + 1)),
                            tmp = a[i];

                        a[i] = a[j];
                        a[j] = tmp;
                    }

                    for(var k = 0; k < replaceSplits; k++) a.splice(libs.number.randomIntInRange(0, a.length), 0, splitter);
                    return a.join('');
                },

                /**
                 * Reverses a string.
                 * @param {String} s The string to operate on.
                 * @return {String} The reversed string.
                 */
                reverse: function reverse (s) {
                    if(s.length < 64) {
                        var str = '';
                        for(var i = s.length; i >= 0; i--) str += s.charAt(i);
                        return str;
                    }
                    else {
                        return s.split('').reverse().join('');
                    }
                },

                /**
                 * Strips the trailing slashes from a string.
                 * @param {String} s The string to operate on.
                 * If using Node.js, it will replace the trailing slash based on the value of os.platform
                 * (i.e. if windows, '\\' will be replaced, '/' otherwise).
                 * @returns {String} The string without a trailing slash.
                 * @function
                 */
                withoutTrailingSlash: function withoutTrailingSlash (s) {
                    if(!IS_BROWSER && HAS_OS && require('os').platform === 'win32') return s.replace(/\\+$/, '');
                    return s.replace(/\/+$/, '');
                },

                /**
                 * Add a trailing slash to a string, if it doesn't already have one.
                 * If using Node.js, it will replace the trailing slash based on the value of os.platform
                 * (i.e. if windows, '\\' will be replaced, '/' otherwise).
                 * @param {String} s The string to operate on.
                 * @returns {String} The string without a trailing slash.
                 * @function
                 */
                withTrailingSlash: function withTrailingSlash (s) {
                    if(!IS_BROWSER && HAS_OS && require('os').platform === 'win32') return libs.string.withoutTrailingSlash(s) + '\\';
                    return libs.string.withoutTrailingSlash(s) + '/';
                },

                /**
                 * Escapes regular expression special characters. This is useful is you wish to create a new regular expression
                 * from a stored string value.
                 * @param {String} s The string to operate on.
                 * @returns {String} The regular expression safe string
                 * @function
                 */
                regexpSafe: function regexpSafe (s) {
                    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                },

                /**
                 * Pads a string with 'delim' characters to the specified length. If the length is less than the string length,
                 * the string will be truncated.
                 * @param {String} s The string to operate on.
                 * @param {Number} length The length to pad the string to. If less that the length of the string, the string will
                 * be returned. If less than the length of the string, the string will be sliced.
                 * @param {String=} [delim=' '] The character to pad the string with.
                 * @param {Boolean=} [pre=false] If true, the padding will be added to the beginning of the string, otherwise the padding
                 * will be added to the end.
                 * @returns {String} The padded string
                 * @function
                 */
                pad: function pad (s, length, delim, pre) {
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
                },

                /**
                 * Replaces newlines with br tags.
                 * @param {String} s The string to operate on.
                 * @return {String} The string with newlines converted to br tags.
                 */
                newlineToBreak: function newlineToBreak (s) {
                    return s.replace(/(\r\n|\n)/g, '<br>');
                },

                /**
                 * Replaces tabs with a span element with the class 'tab'
                 * @param {String} s The string to operate on.
                 * @return {String} The string with tabs converted to spans with the class 'tab'
                 */
                tabsToSpan: function tabsToSpan (s) {
                    return s.replace(/\t/g, '<span class="tab"></span>');
                },

                /**
                 * Adjusts a string to fit within the confines of 'width', without breaking words.
                 * @param {String} s The string to operate on.
                 * @param {Number=} [length=120] The length to word wrap the string to.
                 * @param {Number=} [padleft=0] The number of columns to pad the string on the left
                 * @param {Number=} [padright=0] The number of columns to pad the string on the right
                 * @param {Boolean=} omitFirst If true, the first line will not be padded left
                 * @return {String} The string adjusted and padded for the stdout.
                 * @function
                 */
                wordWrapToLength: function wordWrapToLength (s, width, padleft, padright, omitFirst) {
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
                }
            },

            /**
             * Date library functions
             * @type {Object}
             */
            date: {
                /**
                 * Moves a date forward 'daysInTheFuture' days.
                 * @param {Date} The date object to operate on.
                 * @param {Number} daysInTheFuture The number of days in the future to advance the date
                 * @param {Boolean=} [adjustForWeekend=false] Whether or not the date should fall on a weekend day
                 * @returns {Date} The date, adjusted the number of specified days.
                 * @function
                 */
                advanceDays: function advanceDays (d, daysInTheFuture, adjustForWeekend) {
                    if(!(d instanceof Date)) return d;
                    daysInTheFuture = daysInTheFuture && libs.generic.isNumeric(daysInTheFuture) ? daysInTheFuture : 1;
                    d.setTime(d.getTime() + (daysInTheFuture * 86400000));

                    if(adjustForWeekend && (d.getDay() === 0 || d.getDay() === 6)) {
                        while(d.getDay() === 0 || d.getDay() === 6) d.setTime(d.getTime() + 86400000);
                    }
                    return d;
                },

                /**
                 * Moves a date forward 'monthsInTheFuture' months.
                 * @param {Date} The date object to operate on.
                 * @param {Number} monthsInTheFuture The number of months in the future to advance the date
                 * @param {Boolean=} [adjustForWeekend=false] Whether or not the date should fall on a weekend day
                 * @returns {Date} The date, adjusted the number of specified months.
                 * @function
                 */
                advanceMonths: function advanceMonths (d, monthsInTheFuture, adjustForWeekend) {
                    if(!(d instanceof Date)) return d;
                    monthsInTheFuture = monthsInTheFuture && libs.generic.isNumeric(monthsInTheFuture) ? monthsInTheFuture : 1;
                    d.setTime(d.getTime() + (monthsInTheFuture * 2629746000));

                    if(adjustForWeekend && (d.getDay() === 0 || d.getDay() === 6)) {
                        while(d.getDay() === 0 || d.getDay() === 6) d.setTime(d.getTime() + 86400000);
                    }
                    return d;
                },

                /**
                 * Moves a date forward 'yearsInTheFuture' years.
                 * @param {Date} The date object to operate on.
                 * @param {Number} yearsInTheFuture The number of years in the future to advance the date
                 * @param {Boolean=} [adjustForWeekend=false] Whether or not the date should fall on a weekend day
                 * @returns {Date} The date, adjusted the number of specified years.
                 * @function
                 */
                advanceYears: function advanceYears (d, yearsInTheFuture, adjustForWeekend) {
                    if(!(d instanceof Date)) return d;
                    yearsInTheFuture = yearsInTheFuture && libs.generic.isNumeric(yearsInTheFuture) ? yearsInTheFuture : 1;
                    d.setTime(d.getTime() + (yearsInTheFuture * 31536000000));

                    if(adjustForWeekend && (d.getDay() === 0 || d.getDay() === 6)) {
                        while(d.getDay() === 0 || d.getDay() === 6) d.setTime(d.getTime() + 86400000);
                    }
                    return d;
                },

                /**
                 * Returns the date in the yyyy-mm-dd format.
                 * @param {Date} The date object to operate on.
                 * @param {String} [delim='-'] The delimiter to used the separate the date components (e.g. '-' or '.')
                 * @returns {String} The date in the yyyy-mm-dd format.
                 * @function
                 */
                yyyymmdd: function yyyymmdd (d, delim) {
                    if(!(d instanceof Date)) return d;
                    delim = typeof delim !== 'string' ? '-' : delim ;

                    var dd   = d.getDate(),
                        mm   = d.getMonth() + 1,
                        yyyy = d.getFullYear();

                    if(dd < 10) dd = '0' + dd;
                    if(mm < 10) mm = '0' + mm;
                    return yyyy + delim + mm + delim + dd;
                },

                /**
                 * Converts a date to the HH:MM:SS.MSEC time format
                 * @param {Date} The date object to operate on.
                 * @param {Boolean=} [omitMS=false] Whether or not to include the MS portion of the returned string
                 * @returns {String} The formatted number, now a string.
                 * @function
                 */
                clockTime: function clockTime (d, omitMS) {
                    if(!(d instanceof Date)) return d;
                    return libs.number.clockTime(d.getTime(), !!omitMS);
                }
            },

            /**
             * Number library functions
             * @type {Object}
             */
            number: {

                /**
                 * Returns the string representation of a number, with placeholders added.
                 * @param {Number} n The number to add the placeholders to.
                 * @param {String=} [placeholder=','] Typically the comma (,). The string that seperates the thousanths place.
                 * @return {String} The number formatted with placeholders.
                 */
                withPlaceholders: function (n, placeholder) {
                    if(n === undefined || n === null || !libs.object.isNumeric(n)) return n;
                    placeholder = typeof placeholder === 'string' ? placeholder : '.';
                    var rest, idx, int, ns = n.toString(), neg = n < 0;

                    idx  = ns.indexOf('.');
                    int  = parseInt(Math.abs(n), 10).toString();

                    if(idx > -1) rest = '.' + ns.substring(idx + 1, ns.length);
                    return (neg ? '-' : '') + libs.string.reverse(libs.string.reverse(int).replace(/(\d{3})(?!$)/g, '$1,')) + (rest || '');
                },

                /**
                 * Formats a number in money notation.
                 * @param {Number} n The number to format.
                 * @param {String=} [symbol='$'] The currency type symbol.
                 * @return {String} The number in USD format.
                 */
                formatMoney: function (n, symbol) {
                    if(n === undefined || n === null || !libs.object.isNumeric(n)) return n;
                    n = libs.object.getNumeric(n).toFixed(2);
                    symbol = typeof symbol === 'string' ? symbol : '$';

                    return n.replace(/^(-)?(\d+)\.(\d+)$/, function ($0, $1, $2, $3) {
                        $1 = $2 === '0' && $3 === '00' ? null : $1;
                        return ($1 || '') + symbol + libs.number.withPlaceholders($2) + '.' + $3;
                    });
                },

                /**
                 * Returns a random integer in range [min, max] (inclusive)
                 * @param {Number} min The minimum possible value (inclusive)
                 * @param {Number} max The maximum possible value (inclusive)
                 * @return {Number} A random number between min and max
                 */
                randomIntInRange: function (min, max) {
                    min = parseInt(min, 10);
                    max = parseInt(max, 10);

                    if(isNaN(min) && !isFinite(min)) min = 0;
                    if(isNaN(max) && !isFinite(max)) max = Number.MAX_VALUE;
                    return Math.floor(Math.random() * (max - min + 1)) + min;
                },

                /**
                 * Returns a random float in range [min, max] (inclusive)
                 * @param {Number} min The minimum possible value (inclusive)
                 * @param {Number} max The maximum possible value (inclusive)
                 * @return {Number} A random number between min and max
                 */
                randomNumberInRange: function (min, max) {
                    min = parseFloat(min);
                    max = parseFloat(max);

                    if(isNaN(min) && !isFinite(min)) min = 0;
                    if(isNaN(max) && !isFinite(max)) max = Number.MAX_VALUE;
                    return Math.random() * (max - min) + min;
                },

                /**
                 * Recursively computes the factorial of the number n.
                 * @param {Number} n A number.
                 * @return {Number|Infinity} n!
                 */
                factorial: function factorial (n) {
                    if(typeof n !== 'number' || n < 0) return NaN;
                    if(n > 170) return Infinity;
                    if(n === 0 || n === 1) return 1;
                    return n * factorial(n - 1);
                },

                /**
                 * Determines is the given numbers are integers
                 * @param {...Number} n Numbers.
                 * @return {Boolean} True if all arguments are integers, false otherwise.
                 */
                isInt: function isInt () {
                    return libs.object.every(arguments, function (n) {
                        return typeof n === 'number' && n % 1 === 0 && n.toString().indexOf('.') === -1;
                    });
                },

                /**
                 * Recursively computes n choose k.
                 * @param {Number} n A number.
                 * @param {Number} k A number.
                 * @return {Number|Infinity} n choose k.
                 */
                choose: function choose (n, k) {
                    if(typeof n !== 'number' || typeof k !== 'number') return NaN;
                    if(k === 0) return 1;
                    return (n * choose(n - 1, k - 1)) / k;
                },

                /**
                 * Pads a number with preceeding zeros.
                 * @param {Number} n The number object to operate on.
                 * @param {Number} length The final length of the string
                 * @returns {String} The padded number, now a string.
                 * @function
                 */
                pad: function pad (n, length) {
                    return libs.string.pad(n.toString(), length, '0', true);
                },

                /**
                 * Advances (or reverses) the date the specified number of days.
                 * @param {Number} n The number object to operate on.
                 * @param {Date} date The date to change.
                 * @return {Date} The modified date.
                 */
                daysFrom: function daysFrom (n, date) {
                    if(typeof date === 'number') date = new Date(date);
                    if(!(date instanceof Date))  date = new Date();

                    date.setDate(date.getDate() + n);
                    return date;
                },

                /**
                 * Advances (or reverses) the current date the specified number of days.
                 * @param {Number} n The number object to operate on.
                 * @return {Date} A date object
                 */
                daysFromNow: function daysFromNow (n) {
                    return libs.number.daysFrom(n, new Date());
                },

                /**
                 * Advances (or reverses) the date the specified number of days.
                 * @param {Number} n The number object to operate on.
                 * @param {Date} date The date to change.
                 * @return {Date} The modified date.
                 */
                secondsFrom: function secondsFrom (n, date) {
                    if(typeof date === 'number') date = new Date(date);
                    if(!(date instanceof Date))  date = new Date();

                    date.setSeconds(date.getSeconds() + n);
                    return date;
                },

                /**
                 * Advances (or reverses) the current date the specified number of days.
                 * @param {Number} n The number object to operate on.
                 * @return {Date} A date object
                 */
                secondsFromNow: function secondsFromNow (n) {
                    return libs.number.secondsFrom(n, new Date());
                },

                /**
                 * Advances (or reverses) the date the specified number of years.
                 * @param {Number} n The number object to operate on.
                 * @param {Date} date The date to change.
                 * @return {Date} The modified date.
                 */
                yearsFrom: function yearsFrom (n, date) {
                    if(typeof date === 'number') date = new Date(date);
                    if(!(date instanceof Date))  date = new Date();

                    date.setFullYear(date.getFullYear() + n);
                    return date;
                },

                /**
                 * Advances (or reverses) the current date the specified number of years.
                 * @return {Date} A date object
                 */
                yearsFromNow: function yearsFromNow (n) {
                    return libs.number.yearsFrom(n, new Date());
                },

                /**
                 * Advances (or reverses) the date the specified number of months.
                 * @param {Number} n The number object to operate on.
                 * @param {Date} date The date to change.
                 * @return {Date} The modified date.
                 */
                monthsFrom: function monthsFrom (n, date) {
                    if(typeof date === 'number') date = new Date(date);
                    if(!(date instanceof Date))  date = new Date();

                    date.setMonth(date.getMonth() + n);
                    return date;
                },

                /**
                 * Advances (or reverses) the current date the specified number of months.
                 * @param {Number} n The number object to operate on.
                 * @return {Date} A date object
                 */
                monthsFromNow: function monthsFromNow (n) {
                    return libs.number.monthsFrom(n, new Date());
                },

                /**
                 * Advances (or reverses) the date the specified number of hours.
                 * @param {Number} n The number object to operate on.
                 * @param {Date} date The date to change.
                 * @return {Date} The modified date.
                 */
                hoursFrom: function hoursFrom (n, date) {
                    if(typeof date === 'number') date = new Date(date);
                    if(!(date instanceof Date))  date = new Date();

                    date.setHours(date.getHours() + n);
                    return date;
                },

                /**
                 * Advances (or reverses) the current date the specified number of hours.
                 * @param {Number} n The number object to operate on.
                 * @return {Date} A date object
                 */
                hoursFromNow: function hoursFromNow (n) {
                    return libs.number.hoursFrom(n, new Date());
                },

                /**
                 * Advances (or reverses) the date the specified number of minutes.
                 * @param {Number} n The number object to operate on.
                 * @param {Date} date The date to change.
                 * @return {Date} A modified date.
                 */
                minutesFrom: function minutesFrom (n, date) {
                    if(typeof date === 'number') date = new Date(date);
                    if(!(date instanceof Date))  date = new Date();

                    date.setMinutes(date.getMinutes() + n);
                    return date;
                },

                /**
                 * Advances (or reverses) the current date the specified number of minutes.
                 * @param {Number} n The number object to operate on.
                 * @return {Date} The date object
                 */
                minutesFromNow: function minutesFromNow (n) {
                    return libs.number.minutesFrom(n, new Date());
                },

                /**
                 * The time, months in the past.
                 * @param {Number} n The number object to operate on.
                 * @return {Date} A Date object.
                 */
                monthsAgo: function monthsAgo (n) {
                    return libs.number.minutesFromNow(-n, new Date());
                },

                /**
                 * The time, days in the past.
                 * @param {Number} n The number object to operate on.
                 * @return {Date} A Date object.
                 */
                daysAgo: function daysAgo (n) {
                    return libs.number.daysFromNow(-n, new Date());
                },

                /**
                 * The time, seconds in the past.
                 * @param {Number} n The number object to operate on.
                 * @return {Date} A Date object.
                 */
                secondsAgo: function secondsAgo (n) {
                    return libs.number.secondsFromNow(-n, new Date());
                },

                /**
                 * The time, minutes in the past.
                 * @param {Number} n The number object to operate on.
                 * @return {Date} A Date object.
                 */
                minutesAgo: function minutesAgo (n) {
                    return libs.number.minutesFromNow(-n, new Date());
                },

                /**
                 * The time, years in the past.
                 * @param {Number} n The number object to operate on.
                 * @return {Date} A Date object.
                 */
                yearsAgo: function yearsAgo (n) {
                    return libs.number.yearsFromNow(-n, new Date());
                },

                /**
                 * Converts a number to the HH:MM:SS.MSEC time format
                 * @param {Number} t The number object to operate on.
                 * @memberof Number.prototype
                 * @param {Boolean=} [omitMS=false] Whether or not to include the MS portion of the returned string
                 * @returns {String} The formatted number, now a string.
                 * @function
                 */
                clockTime: function clockTime (t, omitMS) {
                    var ms, secs, mins, hrs;

                    ms = t % 1000;
                    t = (t - ms) / 1000;

                    secs = t % 60;
                    t = (t - secs) / 60;

                    mins = t % 60;
                    hrs = (t - mins) / 60;

                    return libs.number.pad(hrs.toString(), 2)  + ':' + libs.number.pad(mins.toString(), 2) + ':' +
                           libs.number.pad(secs.toString(), 2) + ((omitMS === true) ? '' : '.' + libs.number.pad(ms.toString(), 3));
                }
            },

            /**
             * Function library functions
             * @type {Object}
             */
            function: {

                /**
                 * Inherit the prototype methods from one constructor into another.
                 * Mostly borrowed directly from Node.js
                 * @param {Function} constructor The inheriting constructor
                 * @param {Function} superConstructor The parent constructor
                 * @return {Function} The inheriting constructor
                 */
                inherits: function inherits (constructor, superConstructor) {
                    if (constructor === undefined || constructor === null)
                        throw new TypeError('The constructor to "inherits" must not be ' + 'null or undefined');

                    if (superConstructor === undefined || superConstructor === null)
                        throw new TypeError('The super constructor to "inherits" must not ' + 'be null or undefined');

                    if (superConstructor.prototype === undefined)
                        throw new TypeError('The super constructor to "inherits" must ' + 'have a prototype');

                    constructor.super_ = superConstructor;
                    Object.setPrototypeOf(constructor.prototype, superConstructor.prototype);

                    // Kill al the ProtoLib cache, for all instances...
                    ProtoLib.killCacheForConstructor(constructor);
                    return constructor;
                },
            },

            /**
             * Array library functions
             * @type {Object}
             */
            array: {

                /**
                 * Shuffles an array
                 * @param {Array} a The Array object to operate on.
                 * @return {Array<*>} The mixed up array
                 */
                shuffle: function shuffle (a) {
                    for(var i = a.length - 1; i > 0; i--) {
                        var j = Math.floor(Math.random() * (i + 1)), tmp = a[i];
                        a[i] = a[j];
                        a[j] = tmp;
                    }
                    return a;
                },

                /**
                 * Computes the union between the current array, and all the array objects passed in. That is,
                 * the set of unique objects present in all of the arrays.
                 * @param {Array} a The Array object to operate on.
                 * @param {...Array} arr A list of array objects
                 * @return {Array<*>} The union set of the provided arrays.
                 */
                union: function union (a) {
                    var args = libs.object.only(libs.object.toArray(arguments), 'array');

                    var union = [];
                    args.unshift(a);
                    libs.object.each(args, function (array) {
                        libs.object.each(array, function (item) {
                            if(union.indexOf(item) === -1) union.push(item);
                        });
                    });
                    return union;
                },

                /**
                 * Returns all the items unique to a single array (the set difference).
                 * @param {...Array} arrays The Array objects to operate on.
                 * @param {Array} other The array to compute the difference from.
                 * @return {Array} A new array with items unique to each array.
                 */
                difference: function difference () {
                    var arrays   = libs.object.only(libs.object.toArray(arguments), 'array'),
                        diff     = [],
                        allItems = [],
                        i;

                    for(i = 0; i < arrays.length; i++) allItems = allItems.concat(arrays[i]);

                    for(i = 0; i < allItems.length; i++) {
                        var inArray = -1, unique = false;

                        for(var n = 0; n < arrays.length; n++) {
                            if(inArray === -1 && arrays[n].indexOf(allItems[i]) > -1) {
                                inArray = n;
                                unique  = true;
                            }
                            else if(inArray !== -1 && arrays[n].indexOf(allItems[i]) > -1) {
                                inArray = n;
                                unique  = false;
                            }
                        }
                        if(inArray !== -1 && unique) diff.push(allItems[i]);
                    }

                    return diff;
                },

                /**
                 * Returns the items common to all arrays.
                 * @param {...Array} items The arrays from which to compute the intersection.
                 * @return {Array} A new array with items common to both arrays.
                 */
                intersect: function intersect () {
                    var arrays = libs.object.only(libs.object.toArray(arguments), 'array');

                    if(arrays.length === 0) return [];
                    if(arrays.length === 1) return libs.object.copy(arrays[0]);

                    var intersection = arrays[0], intermediate = [];
                    for(var i = 1; i < arrays.length; i++) {
                        var arr = libs.object.copy(arrays[i]); // Don't want to modify the original array!
                        for(var n = 0; n < intersection.length; n++) {
                            if(arr.indexOf(intersection[n]) > -1) {
                                intermediate.push(intersection[n]);
                                var idx = arr.indexOf(intersection[n]);
                                arr.splice(idx, 1);
                            }
                        }
                        intersection = intermediate;
                        intermediate = [];
                    }

                    return intersection;
                },

                /**
                 * Creates a new array from the current one, with all occurences of the provided arguments ommited.<br>
                 * For example: <em>[1,2,3,4,5].without(1)</em> will return <em>[2,3,4,5]</em>
                 * and <em>[1, null, 2, null, undefined].without(null, undefined)</em> will return <em>[1, 2]</em>
                 * @param {Array} a The Array object to operate on.
                 * @returns {Array<*>} A shallow copy of the array with the provided arguments ommited.
                 * @function
                 */
                without: function without () {
                    var args = libs.object.toArray(arguments),
                        a    = args.shift(),
                        res  = [];

                    if(!(a instanceof Array)) return a;
                    libs.object.each(a, function (v) { if(args.indexOf(v) === -1) res.push(v); });
                    return res;
                },

                /**
                 * Rotates the array left or right the specified number of times. If the direction is left, it will shift off the
                 * first <em>n</em> elements and push them to the end of the array. If right, it will pop off the last <em>n</em>
                 * items and unshift them onto the front of the array.
                 * @param {Array} a The Array object to operate on.
                 * @param {String=} [direction='left'] The direction to rotate array members.
                 * @param {Number=} [amount=1] The number of elements to shift
                 * @return {Array<*>} The current array, shifted.
                 * @function
                 */
                rotate: function rotate (a, direction, amount) {
                    if(!(a instanceof Array)) return a;
                    if(direction && libs.object.isNumeric(direction) && !amount) {
                        amount    = direction;
                        direction = undefined;
                    }

                    if(!amount || (amount && !libs.object.isNumeric(amount))) amount = 1;
                    for(var i = 0; i < amount; i++) {
                        if(direction !== 'right') a.push(a.shift()); else a.unshift(a.pop());
                    }
                    return a;
                },

                /**
                 * Rotates the array left the specified number of times.
                 * This is useful if trying to create a circular queue.
                 * @param {Array} a The Array object to operate on.
                 * @param {Number=} [amount=1] The number of times to rotate the array left.
                 * @return {Array<*>} The current array, rotated left.
                 * @function
                 */
                rotateLeft: function rotateLeft (a, amount) {
                    if(!(a instanceof Array)) return a;
                    return libs.array.rotate(a, 'left', amount);
                },

                /**
                 * Rotates the array right the specified number of times.
                 * This is useful if trying to create a circular queue.
                 * @param {Array} a The Array object to operate on.
                 * @param {Number=} [amount=1] The number of times to rotate the array left.
                 * @return {Array<*>} The current array, rotated right.
                 * @function
                 */
                rotateRight: function rotateLeft (a, amount) {
                    if(!(a instanceof Array)) return a;
                    return libs.array.rotate(a, 'right', amount);
                },

                /**
                 * Removes duplicates from the current array.
                 * This is a destructive action, and will modify the array in place.
                 * @param {Array} a The Array object to operate on.
                 * @returns {Array<*>} The current array, with duplicates removed.
                 * @function
                 */
                makeUnique: function makeUnique (a) {
                    if(!(a instanceof Array)) return a;

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
                },

                /**
                 * Gets an array of unique items from the current array.
                 * @param {Array} a The Array object to operate on.
                 * @returns {Array} A new array with no duplicate values.
                 * @function
                 */
                unique: function unique (a) {
                    if(!(a instanceof Array)) return a;

                    var visited = [],
                        unique  = [];

                    libs.object.each(a, function (item) {
                        if(visited.indexOf(item) === -1) {
                            unique.push(item);
                            visited.push(item);
                        }
                    });
                    return unique;
                },

                /**
                 * Sorts the array in ascending order.
                 * This is a destructive action, and will modify the array in place.
                 * @param {Array} a The Array object to operate on.
                 * @returns {Array} The array sorted in ascending order.
                 * @function
                 */
                ascending: function ascending (a) {
                    if(!(a instanceof Array)) return a;
                    return a.sort(function (a, b) {
                        if(a !== undefined && a !== null) a = a.toString();
                        if(b !== undefined && b !== null) b = b.toString();
                        return a < b ? -1 : a > b ? 1 : 0;
                    });
                },

                /**
                 * Sorts the array in descending order.
                 * This is a destructive action, and will modify the array in place.
                 * @param {Array} a The Array object to operate on.
                 * @returns {Array} The array sorted in descending order.
                 * @function
                 */
                descending: function descending (a) {
                    if(!(a instanceof Array)) return a;
                    return a.sort(function (a, b) {
                        if(a !== undefined && a !== null) a = a.toString();
                        if(b !== undefined && b !== null) b = b.toString();
                        return a > b ? -1 : a < b ? 1 : 0;
                    });
                }
            },

            /**
             * Array library functions
             * @type {Object}
             */
            object: {

                /**
                 * Gets the unique id of an object.
                 * Only works for non-literals, otherise Object.__get_protolib_id__ will throw.
                 * @param {Object|Function} o The object to get the unique id for.
                 * @return {String} A unique object id
                 */
                uniqueId: function uniqueId (o) {
                    return o.__get_protolib_id__;
                },

                /**
                 * Computes the frequencies for each item in all of arguments.
                 * @param {...*} objs The objects to compute the histogram from.
                 * @return {Object<Number>} An object that has the items from all of the arguments as its keys and their frequencies as it's values.
                 */
                histogram: function histogram () {
                    var histogram = {};
                    libs.object.every(arguments, function (o) {
                        if(typeof o === 'boolean') {
                            if(!histogram[o]) histogram[o] = 1; else histogram[o]++;
                        }
                        else if(typeof o === 'function') {
                            if(!histogram['function']) histogram['function'] = 1; else histogram[o]++;
                        }
                        else {
                            libs.object.every(o, function (val) {
                                switch(true) {
                                    case typeof val === 'function':
                                    case typeof val === 'undefined':
                                        val = typeof val;
                                        break;
                                    case typeof val === 'object' && val === null:
                                        val = 'null';
                                        break;
                                    case typeof val === 'object' && val instanceof Array:
                                        val = 'array';
                                        break;
                                    case typeof val === 'object':
                                        val = 'object';
                                        break;
                                    default:
                                        val = val.toString();
                                }

                                if(typeof histogram[val] !== 'number') histogram[val] = 0;
                                histogram[val]++;
                            });
                        }
                    });
                    return histogram;
                },

                /**
                 * Creates a shallow copy of 'item'.
                 * @param {*} item The item to shallow "copy".
                 * @return {*} A shallow copy of the item.
                 */
                copy: function copy (item) {
                    var copy;
                    if(!item) return item;

                    switch (typeof item) {
                        case 'string':
                        case 'number':
                        case 'function':
                        case 'boolean':
                            return item;

                        default:
                            if(item instanceof Array) {
                                return item.slice(0);
                            }
                            else {
                                copy = {};
                            }
                    }

                    libs.object.every(item, function (o, k) { copy[k] = o; });
                    return copy;
                },

                /**
                 * Returns the number of occurences of "what"
                 * @param {*} obj The item to count the occurences of "what" in.
                 * @param {*} what The item to count the occurences of the item in the array.
                 * @return {[type]} [description]
                 */
                occurrencesOf: function occurrencesOf (obj, what) {
                    if(arguments.length < 2) return 0;

                    if(typeof obj === 'boolean') {
                        return 0;
                    }
                    if(typeof obj === 'number') {
                        return occurrencesOf(obj.toString(), what);
                    }
                    else if(typeof obj === 'function') {
                        return occurrencesOf(fixFirefoxFunctionString(obj.toString()), what);
                    }

                    var count = 0;
                    if(typeof obj === 'string') {
                        if(typeof what === 'string' || typeof what === 'number') {
                            var regexp = new RegExp(what.toString(), 'g'), m;
                            while(m = regexp.exec(obj)) count++; // jshint ignore:line
                        }
                    }
                    else if(typeof obj !== 'string') {
                        libs.object.every(obj, function (item) {
                            if(item === what) count++;
                        });
                    }
                    return count;
                },

                /**
                 * Returns the object's keys.
                 * @param {Object} o The object to operate on.
                 * @returns {Array<String|Number>} The object's key set
                 * @function
                 */
                keys : function keys (o) {
                    if(o === undefined || o === null) return [];

                    var keys = getKeys(o), idx;
                    if(libs.object.isArguments(o)) {
                        idx = keys.indexOf('length');
                        if(idx > -1) keys.splice(idx, 1);
                    }
                    return keys;
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
                 * @param {Object} o The object to operate on.
                 * @returns {Number} The number of items within the object.
                 * @function
                 */
                size: function size (o) {
                    switch(true) {
                        case typeof o === 'function':
                            return 1;

                        case typeof o === 'number':
                            return o.toString().length;

                        case o instanceof Array:
                        case typeof o === 'string':
                            return o.length;

                        case libs.object.isArguments(o) && typeof o.length !== 'undefined':
                            return o.length - 1;

                        case o && typeof o === 'object':
                            return Object.keys(o).length;

                        default:
                            return 0;
                    }
                },

                /**
                 * Determines if an object can be converted to a number.
                 * @param {...Object} o The object to operate on.
                 * @returns {Boolean} True if the object is numeric, false otherwise.
                 * @function
                 */
                isNumeric: function isNumeric () {
                    return libs.object.every(arguments, function (item) {
                        return !isNaN(parseFloat(item)) && isFinite(item);
                    });
                },

                /**
                 * Converts an object to a number.
                 * @param {...Object} o The object to operate on.
                 * @returns {Number} The object as a number.
                 * @function
                 */
                getNumeric: function getNumeric () {
                    var vals = [];
                    libs.object.every(arguments, function (o) {
                        vals.push(libs.object.isNumeric(o) ? parseFloat(o) : NaN);
                    });
                    return vals.length === 1 ? vals[0] : vals;
                },

                /**
                 * Determines if an object has no keys, if an array has no items, or if a string === ''.
                 * @param {...Object} o The object to operate on.
                 * @returns {Boolean} True if the object is 'empty', false otherwise.
                 * @function
                 */
                isEmpty: function isEmpty () {
                    return libs.object.every(arguments, function (item) {
                        return libs.object.size(item) === 0 && item !== false && item !== '' && item !== true;
                    });
                },

                /**
                 * True if the objects passed in are all arrays, false otherwise.
                 * @param {...Object} o The object to operate on.
                 * @return {Boolean} True if the object is an array, false otherwise.
                 */
                isArray: function isArray () {
                    return libs.object.every(arguments, function (item) {
                        return item instanceof Array;
                    });
                },

                /**
                 * True if the objects passed in are all objects and not arrays, false otherwise.
                 * @param {...Object} o The object to operate on.
                 * @return {Boolean} True if the object is an object and not an array, false otherwise.
                 */
                isPureObject: function isPureObject () {
                    return libs.object.every(arguments, function (item) {
                        return !(item instanceof Array) && typeof item === 'object';
                    });
                },

                /**
                 * True if the objects passed in are all strings, false otherwise.
                 * @param {...Object} o The object to operate on.
                 * @return {Boolean} True if the object is a string, false otherwise.
                 */
                isString: function isString () {
                    return libs.object.every(arguments, function (item) {
                        return typeof item === 'string';
                    });
                },

                /**
                 * True if the objects passed in are all booleans, false otherwise.
                 * @param {...Object} o The object to operate on.
                 * @return {Boolean} True if the object is a boolean, false otherwise.
                 */
                isBoolean: function isBoolean () {
                    return libs.object.every(arguments, function (item) {
                        return typeof item === 'boolean';
                    });
                },

                /**
                 * True if the objects passed in are allfunction, false otherwise.
                 * @param {...Object} o The object to operate on.
                 * @return {Boolean} True if the object is a function, false otherwise.
                 */
                isFunction: function isFunction () {
                    return libs.object.every(arguments, function (item) {
                        return typeof item === 'function';
                    });
                },

                /**
                 * True if the objects passed in are allll, false otherwise.
                 * @param {...Object} o The object to operate on.
                 * @return {Boolean} True if the object is a function, false otherwise.
                 */
                isNull: function isNull () {
                    return libs.object.every(arguments, function (item) {
                        return item === null;
                    });
                },

                /**
                 * True if the objects passed in are all undefined, false otherwise.
                 * @param {...Object} o The object to operate on.
                 * @return {Boolean} True if the object is a function, false otherwise.
                 */
                isUndefined: function isUndefined () {
                    return libs.object.every(arguments, function (item) {
                        return item === undefined;
                    });
                },

                /**
                 * True if the objects passed in are all arguments objects, false otherwise.
                 * @param {Object} o The object to operate on.
                 * @return {Boolean} True if the object is an arguments object, false otherwise
                 */
                isArguments: function isArguments () {
                    return libs.object.every(arguments, function (item) {
                        return Object.prototype.toString.call(item) === '[object Arguments]';
                    });
                },

                /**
                 * Convers an object to a number, if possible.
                 * @param {...Object} o The object to operate on.
                 * @returns {Number} The object as a float or NaN.
                 * @function
                 */
                toNumber: function toNumber () {
                    var vals = [];
                    libs.object.every(arguments, function (o) {
                        vals.push(libs.object.isNumeric(o) ? parseFloat(o) : NaN);
                    });
                    return vals.length === 1 ? vals[0] : vals;
                },

                /**
                 * Convers an object to an integer, if possible.
                 * @param {Object} o The object to operate on.
                 * @returns {Number} The object as an integer or NaN.
                 * @function
                 */
                toInt: function toInt () {
                    var vals = [];
                    libs.object.every(arguments, function (o) {
                        var radix = /^0x/.test(o) ? 16 : 10; // Check for hex string
                        vals.push(libs.object.isNumeric(o) ? parseInt(o, radix) : NaN);
                    });
                    return vals.length === 1 ? vals[0] : vals;
                },

                /**
                 * Returns a random array item, random object property, random character in a string, or random digit in a number.
                 * @param {Object} o The object to operate on.
                 * @returns {*}
                 * @function
                 */
                random: function random (o) {
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
                 * @param {Object} o The object to operate on.
                 * @param {Number=} [rangeA=0] The iteration start index
                 * @param {Number=} [rangeB='length of the item'] The iteration end index
                 * @param {Function} f The callback to invoke for each item within the object
                 * @returns {*} The value passed to the exit parameter of the callback...
                 */
                each: function each (o, rangeA, rangeB, f) {

                    // Can't use last here.. would cause circular ref...
                    f = undefined;
                    for(var k = arguments.length - 1; k >= 0; k--) {
                        if(arguments[k] instanceof Function) {
                            f = arguments[k];
                            break;
                        }
                    }

                    var ret    = null,
                        broken = false,
                        self   = o,
                        keys, property, value,

                        exit = function () {
                            broken   = true;
                            ret      = arguments.length > 1 ? libs.object.toArray(arguments) : arguments[0];
                        };

                    if(f instanceof Function) {
                        if(typeof self === 'number' || typeof self === 'function' || typeof self === 'boolean') self = o.toString();

                        // Firefox does some funky stuff here...
                        if(typeof o === 'function') self = fixFirefoxFunctionString(self);

                        // For Safari
                        var isArgs = Object.prototype.toString.call(o) === '[object Arguments]', idx = -1;
                        keys = getKeys(self);
                        idx  = keys.indexOf('length');

                        if(isArgs && idx > -1) keys.splice(idx, 1);

                        rangeA = parseInt(rangeA);
                        rangeA = (isNaN(rangeA) || !isFinite(rangeA)) ? 0 : rangeA;

                        rangeB = parseInt(rangeB);
                        rangeB = (isNaN(rangeB) || !isFinite(rangeB)) ? keys.length : rangeB;

                        var i = 0, n;
                        if(Math.abs(rangeA) > Math.abs(rangeB)) {
                            if(rangeB < 0) rangeB = 0;
                            if(rangeA < 0) rangeA = 0;
                            if(rangeA > keys.length - 1) rangeA = keys.length - 1;

                            for(n = rangeA; n >= rangeB; n--) {
                                property = keys[n];
                                value    = (typeof o === 'number' && !isNaN(parseFloat(self[property]))) ? parseFloat(self[property]) : self[property];
                                f.call(o, value, property, n, exit, i++, o);
                                if(broken) break;
                            }
                        }
                        else {
                            rangeB = rangeB + 1 > keys.length ? keys.length : rangeB + 1;
                            if(rangeB < 0) rangeB = 0;
                            if(rangeA < 0) rangeA = 0;

                            for(n = rangeA; n < rangeB; n++) {
                                property = keys[n];
                                value    = (typeof o === 'number' && !isNaN(parseFloat(self[property]))) ? parseFloat(self[property]) : self[property];
                                f.call(o, value, property, n, exit, i++, o);
                                if(broken) break;
                            }
                        }
                    }
                    return ret;
                },

                /**
                 * Invokes the callback 'f' for every property the object contains. If the callback returns false, the
                 * loop is broken and false is returned; otherwise true is returned.
                 * @param {Object} o The object to operate on.
                 * @param {Function} f The callback to invoke for each item within the object
                 * @returns {Boolean} True if none of the callback invocations returned false.
                 * @function
                 */
                every: function every (o, f) {
                    f = f instanceof Function ? f : undefined;

                    if(f instanceof Function) {
                        var self = o, keys, property, value;
                        if(typeof self === 'number' || typeof self === 'function' || typeof self === 'boolean') self = o.toString();

                        // Firefox does some funky stuff here...
                        if(typeof o === 'function') self = fixFirefoxFunctionString(self);

                        // For Safari...
                        var isArgs = Object.prototype.toString.call(o) === '[object Arguments]', idx = -1;
                        keys = getKeys(self);
                        idx  = keys.indexOf('length');

                        if(isArgs && idx > -1) keys.splice(idx, 1);

                        var i = 0;
                        for(var n = 0; n < keys.length; n++) {
                            property = keys[n];
                            value    = (typeof o === 'number' && !isNaN(parseFloat(self[property]))) ? parseFloat(self[property]) : self[property];
                            if(f.call(o, value, property, n, i++, o) === false) return false;
                        }
                    }
                    return true;
                },

                /**
                 * Invokes the callback 'f' for every property the object contains. If the callback returns true, the
                 * loop is broken and false is returned; otherwise true is returned.
                 * @param {Object} o The object to operate on.
                 * @param {Function} f The callback to invoke for each item within the object
                 * @returns {Boolean} True if none of the callback invocations returned false.
                 * @function
                 */
                any: function any (o, f) {
                    f = f instanceof Function ? f : undefined;

                    if(f instanceof Function) {
                        var self = o, keys, property, value;
                        if(typeof self === 'number' || typeof self === 'function' || typeof self === 'boolean') self = o.toString();

                        // Firefox does some funky stuff here...
                        if(typeof o === 'function') self = fixFirefoxFunctionString(self);

                        // For Safari...
                        var isArgs = Object.prototype.toString.call(o) === '[object Arguments]', idx = -1;
                        keys = getKeys(self);
                        idx  = keys.indexOf('length');

                        if(isArgs && idx > -1) keys.splice(idx, 1);

                        var i = 0;
                        for(var n = 0; n < keys.length; n++) {
                            property = keys[n];
                            value    = (typeof o === 'number' && !isNaN(parseFloat(self[property]))) ? parseFloat(self[property]) : self[property];
                            var ret = f.call(o, value, property, n, i++, o);
                            if(ret !== undefined) return ret;
                        }
                    }
                    return undefined;
                },

                /**
                 * Converts an object to an array. For strings, numbers, and functions this will
                 * return a char array to their respective .toString() values
                 * @param {Object} o The object to operate on.
                 * @function
                 * @return {Array<*>} The object, converted to an array.
                 */
                toArray: function toArray (o) {
                    if(o instanceof Array) return libs.object.copy(o);
                    var arr = [];
                    libs.object.each(o, function (val) { arr.push(val); });
                    return arr;
                },

                /**
                 * Returns the first n elements of an object. If the object is an array, and only one items is retrieved,
                 * that item will be returned, rather than an array.
                 * @param {Object} o The object to operate on.
                 * @param {Number=} [n=1] The number of elements to return
                 * @return {Array<*>} The first n elements of the array.
                 */
                first: function first (o, n) {
                    var gotN = (n === 0 ? true : !!n),
                        v;

                    n = parseInt(n, 10);
                    n = isNaN(n) || !isFinite(n) ? 1 : n;

                    if(typeof o === 'boolean') {
                        return o;
                    }
                    else if(typeof o !== 'object') {
                        if(n !== 0) v = o.toString().slice(0, n); else return undefined;
                    }
                    else if(o instanceof Array) {
                        if(n === 1 && !gotN) return o[0];
                        if(n === 0 && !gotN) return undefined;

                        return n !== 0 ? o.slice(0, n) :  [];
                    }
                    else {
                        v = {};
                        libs.object.each(o, 0, n - 1, function (item, key) { v[key] = item; });
                        var keys = getKeys(v);
                        if(n === 1 && !gotN && keys.length === 0) return undefined;

                        return keys.length === 1 && !gotN ? v[keys[0]] : v;
                    }
                    return v.length === 1 && !gotN ? v[0] : v;
                },

                /**
                 * Returns the last n elements of an object. If the object is an array, and only one items is retrieved,
                 * that item will be returned rather than an array.
                 * @param {Object} o The object to operate on.
                 * @param {Number=} [n=1] The number of elements to return
                 * @return {Array<*>} The last n elements of the array.
                 * @function
                 */
                last: function last (o, n) {
                    if(typeof o === 'boolean') return o;
                    var gotN = (!!n || n === 0);

                    n = parseInt(n, 10);
                    n = isNaN(n) || !isFinite(n) ? 1 : n;
                    var v = null, keys, len = libs.object.size(o), idx;

                    if(typeof o === 'boolean') {
                        return o;
                    }
                    else if(libs.object.isArguments(o)) {
                        keys = getKeys(o);
                        idx  = keys.indexOf('length');

                        if(idx > -1) keys.splice(idx, 1);
                        v = []; len = keys.length;
                        // Arguments object should ignore undefined members...
                        libs.object.each(keys, 0, len, function (k) { if(o[k] !== undefined) v.unshift(o[k]); });
                        v = v.slice(0, n);
                    }
                    else if(typeof o !== 'object') {
                        if(n !== 0) v = o.toString().slice(-n); else return null;
                    }
                    else if(o instanceof Array) {
                        if(n === 1 && !gotN) return o[o.length -1];
                        if(n === 0 && !gotN) return undefined;

                        return n !== 0 ? o.slice(-n) : [];
                    }
                    else {
                        v = {};
                        if(n < 0) n = 0;
                        libs.object.each(o, len - n, len, function (item, key) { v[key] = item; });
                        keys = getKeys(v);

                        if(n === 1 && !gotN && keys.length === 0) return undefined;
                        return keys.length === 1 && !gotN ? v[keys[0]] : v;
                    }
                    return v.length === 1 && !gotN ? v[0] : v;
                },

                /**
                 * If the last item in the object is a function, it will be returned. Otherwise, an "empty" function will be returned.
                 * Useful for ensuring that a callback can always be invoked, without checking if the argument is a function
                 * over and over.
                 * @param {Object} o The object to get the callback for.
                 * @return {Function} If the last item in the object is a function, it will be returned. Otherwise, an "empty" function will be returned.
                 */
                getCallback: function getCallback (o) {
                    var last = libs.object.last(o);
                    return last instanceof Function ? last : NULL_FUNCTION;
                },

                /**
                 * Find a child of an object using the given path, split by the given delimiter (or '.' by default)
                 * @param {Object} o The object to operate on.
                 * @param {String} path The path to the child object
                 * @param {String=} [delimiter='.'] The path delimiter
                 * @param {Function=} done A callback for completion
                 * @return {*|Null} The child object at the given string path, or null if it doesn't exist.
                 * @function
                 */
                findChildAtPath: function findChildAtPath (o, path, delimiter, original, invoked, done) {
                    done = libs.object.getCallback(arguments);
                    var self = o;

                    original = (!(original instanceof Function) && original) ? original : self;
                    invoked  = invoked || false;

                    if(typeof o === 'object' && typeof path === 'string') {
                        delimiter = typeof delimiter === 'string' ? delimiter : '.';
                        path      = path.split(delimiter);

                        var p = path.shift();
                        if(p) {
                            return libs.object.each(o, function (o, k, i, exit) {
                                if(path.length === 0 && k === p) {
                                    done.call(original, o, self, k);
                                    invoked = true;
                                    exit(o);
                                }
                                else {
                                    var obj = libs.object.findChildAtPath(o, path.join(delimiter), delimiter, original, invoked, done);
                                    if(obj !== null) exit(obj);
                                }
                            });
                        }
                    }
                    if(!invoked && original === self && done instanceof Function) done.call(original, null, self, null);
                    return null;
                },

                /**
                 * Produces a shallow clone of the object, that is, if JSON.stringify can handle it.<br>
                 * The object must be non-circular.
                 * @param {Object} o The object to operate on.
                 * @param {Function=} replacer The JSON.stringify replacer parameter.
                 * @return {*} A shallow clone of the object.
                 * @function
                 */
                clone: function clone (o, replacer) {
                    if(typeof o === 'string' || typeof o === 'number') return o;

                    try {
                        return JSON.parse(JSON.stringify(o, replacer));
                    }
                    catch (e) {
                        throw new Error('Unable to clone object: ' + e.message);
                    }
                },

                /**
                 * Filters an array or object using only the types allowed. That is, if the item in the array is of a type listed
                 * in the arguments, then it will be added to the filtered array. In this case 'array' is a valid type.
                 * @param {Object} o The object to operate on.
                 * @param {...String} types A list of typeof types that are allowed in the array.
                 * @return {Array<*>} An array filtered by only the allowed types.
                 */
                only: function only (o, types) {
                    types = libs.object.toArray(arguments);
                    types.shift();

                    // Allows the 'plural' form of the type...
                    libs.object.each(types, function (type, key) { this[key] = type.replace(/s$/, ''); });

                    if(typeof o !== 'object' || !o) return o;
                    var isArray  = o instanceof Array ? true : false,
                        filtered = isArray ? [] : {},
                        typeArr  = types.indexOf('array'),
                        typeObj  = types.indexOf('object object');

                    libs.object.each(o, function (item, key) {
                        var typeItem = types.indexOf(typeof item);

                        if(typeObj !== -1 && typeArr === -1) {
                            if((typeof item === 'object' && !(item instanceof Array)) || (typeof item !== 'object' && typeItem !== -1)) {
                                if(isArray) filtered.push(item); else filtered[key] = item;
                            }
                        }
                        else if(typeObj !== -1 && typeArr !== -1) {
                            types.push('object');
                            if(typeItem !== -1) {
                                if(isArray) filtered.push(item); else filtered[key] = item;
                            }
                        }
                        else if(typeItem !== -1 || (item instanceof Array && typeArr !== -1)) {
                            if(isArray) filtered.push(item); else filtered[key] = item;
                        }
                    });
                    return filtered;
                },

                /**
                 * Filters an object using the given predicate function. For objects, a new object will be returned, with
                 * the values that passed the predicate function. For strings, a new string will be returned with the characters
                 * that passed the predicate function. For numbers, a new number will be returned with the digits that passed
                 * the predicate function. Functions will be operated on as strings.
                 * @param {Object} o The object to operate on.
                 * @param {Function} predicate The function used to filter the object.
                 * @return {*} The filtered object
                 */
                where: function where (o, predicate) {
                    if(!(predicate instanceof Function)) {
                        var temp = predicate;
                        predicate = function (i) { return i == temp; }; // jshint ignore:line
                    }

                    if(o === null || o === undefined) return o;
                    if(typeof 0 === 'boolean') return predicate.call(o, o, 0);

                    var isObject = typeof o === 'object' && !(o instanceof Array) ? true : false,
                        filtered = !isObject ? [] : {};

                    libs.object.each(o, function (item, key) {
                        if(predicate.call(item, item, key)) {
                            if(isObject) filtered[key] = item; else filtered.push(item);
                        }
                    });

                    if(typeof o !== 'object') filtered = filtered.join('');
                    return filtered;
                },

                /**
                 * Filters an object by keys using the given predicate function.
                 * @param {Object} o The object to operate on.
                 * @param {Function} predicate The function used to filter the object.
                 * @return {*} The filtered object
                 */
                whereKeys: function whereKeys (o, predicate) {
                    if(!(predicate instanceof Function)) {
                        var temp = predicate;
                        predicate = function (k) { return k == temp; }; // jshint ignore:line
                    }

                    if(o === null || o === undefined) return o;
                    if(typeof 0 === 'boolean') return predicate.call(o, o, 0);

                    var isObject = typeof o === 'object' && !(o instanceof Array) ? true : false,
                        filtered = !isObject ? [] : {};

                    libs.object.each(o, function (item, key) {
                        if(predicate.call(key, key, item)) {
                            if(isObject) filtered[key] = item; else filtered.push(item);
                        }
                    });

                    if(typeof o !== 'object') filtered = filtered.join('');
                    return filtered;
                },

                /**
                 * For objects, inverts the objects keys/values. If the value isn't a number or array, it will be omitted.
                 * For strings, it will reverse the string.
                 * For number, it will compute the number's inverse (i.e. 1 / x).
                 * For functions, invert returns a new function that wraps the given function and inverts it's result.
                 * @param {Object} o The object to operate on.
                 * @return {*} The inverse, as described above.
                 */
                invert: function invert (o) {
                    if(o === null || o === undefined) return o;
                    if(typeof o === 'string')   return libs.string.reverse(o);
                    if(typeof o === 'number')   return 1 / o;
                    if(typeof o === 'boolean')  return !o;

                    if(typeof o === 'function') {
                        return function () { return libs.object.invert(o.apply(o, arguments)); };
                    }

                    var obj = {};
                    libs.object.each(o, function (item, key) {
                        if(typeof item === 'string' || typeof item === 'number') {
                            if(!obj[item]) {
                                obj[item] = key;
                            }
                            else {
                                var tmp = obj[item];
                                obj[item] = [];
                                obj[item].push(tmp, key);
                            }
                        }
                    });

                    return obj;
                },

                /**
                 * Returns the maximum item in the object.
                 * @param {Object} o The object to operate on.
                 * @param {Function=} func If passed, the function will be invoked for each item in the object collection.
                 * @return {*} The maximum item in the object collection.
                 */
                max: function max (o, func) {
                    if(!o || typeof o !== 'object') return o;
                    if(libs.object.size(o) === 0) return;

                    if(!(func instanceof Function)) func = undefined;
                    var max, maxValue;

                    if(!func) {
                        max = libs.object.first(o);
                        libs.object.each(o, 1, function (item) {
                            if(item >= max) max = item;
                        });
                    }
                    else {
                        max      = libs.object.first(o);
                        maxValue = func.call(max, max);

                        libs.object.each(o, 1, function (item) {
                            var value = func.call(item, item);
                            if(value >= maxValue) {
                                max      = item;
                                maxValue = value;
                            }
                        });
                    }
                    return max;
                },

                /**
                 * Returns the key of the item with the highest value in the object.
                 * @param {Object} o The object to operate on.
                 * @param {Function=} func If passed, the function will be invoked for each item in the object collection.
                 * @return {*} The maximum item in the object collection.
                 */
                keyOfMax: function keyOfMax (o, func) {
                    if(!o || typeof o !== 'object') return o;
                    if(libs.object.size(o) === 0) return;

                    if(!(func instanceof Function)) func = undefined;
                    var max, maxValue, maxKey;

                    if(!func) {
                        max    = libs.object.first(o);
                        maxKey = libs.object.keys(o)[0];
                        libs.object.each(o, 1, function (item, key) {
                            if(item >= max) {
                                max    = item;
                                maxKey = key;
                            }
                        });
                    }
                    else {
                        max      = libs.object.first(o);
                        maxKey   = libs.object.keys(o)[0];
                        maxValue = func.call(max, max);

                        libs.object.each(o, 1, function (item, key) {
                            var value = func.call(item, item);
                            if(value >= maxValue) {
                                if(value >= maxValue) {
                                    max      = item;
                                    maxValue = value;
                                    maxKey   = key;
                                }
                            }
                        });
                    }
                    return maxKey;
                },

                /**
                 * Returns the minimum item in the object.
                 * @param {Object} o The object to operate on.
                 * @param {Function=} func If passed, the function will be invoked for each item in the object collection.
                 * @return {*} The minimum item in the object collection.
                 */
                min: function min (o, func) {
                    if(!o || typeof o !== 'object') return o;
                    if(libs.object.size(o) === 0) return;

                    if(!(func instanceof Function)) func = undefined;

                    if(typeof o !== 'object') return o;
                    var min, minValue;

                    if(!func) {
                        min = libs.object.first(o);
                        libs.object.each(o, 1, function (item) {
                            if(item <= min) min = item;
                        });
                    }
                    else {
                        min      = libs.object.first(o);
                        minValue = func.call(min, min);

                        libs.object.each(o, 1, function (item) {
                            var value = func.call(item, item);
                            if(value <= minValue) {
                                min      = item;
                                minValue = value;
                            }
                        });
                    }
                    return min;
                },

                /**
                 * Returns the key of the item with the lowest value in the object.
                 * @param {Object} o The object to operate on.
                 * @param {Function=} func If passed, the function will be invoked for each item in the object collection.
                 * @return {*} The minimum item in the object collection.
                 */
                keyOfMin: function keyOfMin (o, func) {
                    if(!o || typeof o !== 'object') return o;
                    if(libs.object.size(o) === 0) return;

                    if(!(func instanceof Function)) func = undefined;

                    if(typeof o !== 'object') return o;
                    var min, minValue, minKey;

                    if(!func) {
                        min    = libs.object.first(o);
                        minKey = libs.object.keys(o)[0];
                        libs.object.each(o, 1, function (item, key) {
                            if(item <= min) {
                                min    = item;
                                minKey = key;
                            }
                        });
                    }
                    else {
                        min      = libs.object.first(o);
                        minValue = func.call(min, min);
                        minKey   = libs.object.keys(o)[0];

                        libs.object.each(o, 1, function (item, key) {
                            var value = func.call(item, item);
                            if(value <= minValue) {
                                min      = item;
                                minValue = value;
                                minKey   = key;
                            }
                        });
                    }
                    return minKey;
                },

                /**
                 * Tests whether or not the object has a method called 'method'.
                 * @param {Object} o The object to operate on.
                 * @param {String} method The name of the method to test existence for.
                 * @return {Boolean} True if the object has a function called 'method', false otherwise.
                 */
                implements: function _implements () {
                    var args = libs.object.toArray(arguments),
                        a    = args.shift();

                    if(!a) return false;
                    return libs.object.every(args, function (m) {
                        if(!(a[m] instanceof Function)) return false;
                    });
                },

                /**
                 * Same as Object.j.implements, excepct with a hasOwnProperty check.
                 * @param {Object} o The object to operate on.
                 * @param {String} method The name of the method to test existence for.
                 * @return {Boolean} True if the object has its own function called 'method', false otherwise.
                 */
                implementsOwn: function implementsOwn (o, method) {
                    var args = libs.object.toArray(arguments),
                        a    = args.shift();

                    if(!a) return false;
                    return libs.object.every(args, function (m) {
                        if(!(a[m] instanceof Function) || !o.hasOwnProperty(method)) return false;
                    });
                }
            },

            error: {
                /** @todo: Add some Error utility functions... */
            },

            boolean: {
                /** @todo: Add some Boolean utility functions... */
            },

            regexp: {
                /** @todo: Add some RegExp utility functions... */
            }
        };
        return libs;
    }
    module.exports = libs;
}());

},{"os":4}],4:[function(require,module,exports){
exports.endianness = function () { return 'LE' };

exports.hostname = function () {
    if (typeof location !== 'undefined') {
        return location.hostname
    }
    else return '';
};

exports.loadavg = function () { return [] };

exports.uptime = function () { return 0 };

exports.freemem = function () {
    return Number.MAX_VALUE;
};

exports.totalmem = function () {
    return Number.MAX_VALUE;
};

exports.cpus = function () { return [] };

exports.type = function () { return 'Browser' };

exports.release = function () {
    if (typeof navigator !== 'undefined') {
        return navigator.appVersion;
    }
    return '';
};

exports.networkInterfaces
= exports.getNetworkInterfaces
= function () { return {} };

exports.arch = function () { return 'javascript' };

exports.platform = function () { return 'browser' };

exports.tmpdir = exports.tmpDir = function () {
    return '/tmp';
};

exports.EOL = '\n';

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleCIsImxpYi9saWJwLmpzIiwibGliL2xpYnMuanMiLCJub2RlX21vZHVsZXMvb3MtYnJvd3NlcmlmeS9icm93c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0ZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDanNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8qKlxuICAgICAqIEZ1bmN0aW9uIElkZW50aWZpZXIuXG4gICAgICogQHR5cGUge051bWJlcn1cbiAgICAgKi9cbiAgICB2YXIgb2lkID0gLTEsXG5cbiAgICAgLyoqXG4gICAgICAqIFRydWUgaWYgdGhlIE5vZGUuanMgZW52aXJvbm1lbnQgaXMgbG9hZGVkLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAqIEB0eXBlIHtCb29sZWFufVxuICAgICAgKi9cbiAgICBJU19CUk9XU0VSID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcsXG5cbiAgICAvKipcbiAgICAgKiBTdG9yZXMgUHJvdG9MaWIgaW5zdGFuY2VzIGZvciBQcm90b2xpYi5nZXRcbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIFByb3RvbGlicyA9IHt9O1xuXG4gICAgLy8gVGhpcyBwcm92aWRlcyBhIHdheSB0byBkZXRlcm1pbmUgdGhlIFwiaWRcIiBvZiBhIGZ1bmN0aW9uIGNvbnN0cnVjdG9yIGluIGFuIGVudmlyb25tZW50IGFnbm9zdGljIHdheS4uLlxuICAgIC8vIEl0IGFsc28gYWxsb3dzIHVzIHRvIGdpdmUgb2JqZWN0cyBhIHVuaXF1ZSBpZC4uLlxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShPYmplY3QucHJvdG90eXBlLCAnX19nZXRfcHJvdG9saWJfaWRfXycsIHtcbiAgICAgICAgY29uZmlndXJhYmxlIDogdHJ1ZSxcbiAgICAgICAgZW51bWVyYWJsZSAgIDogZmFsc2UsXG4gICAgICAgIGdldCAgICAgICAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmKCEodHlwZW9mIHRoaXMgPT09ICdvYmplY3QnIHx8IHR5cGVvZiB0aGlzID09PSAnZnVuY3Rpb24nKSlcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBnZXQgdW5pcXVlIGlkIG9mIGxpdGVyYWwgdHlwZScpO1xuXG4gICAgICAgICAgICBpZighdGhpcy5fX3Byb3RvbGliX2lkX18pIHtcbiAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ19fcHJvdG9saWJfaWRfXycsIHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlndXJhYmxlIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVudW1iZXJhYmxlICA6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB3cml0YWJsZSAgICAgOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgICAgICAgIDogJzB4JyArICgrK29pZCkudG9TdHJpbmcoMTYpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fX3Byb3RvbGliX2lkX187XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHZhciBfb2JqZWN0VWlkICAgPSBPYmplY3QuX19nZXRfcHJvdG9saWJfaWRfXyxcbiAgICAgICAgX251bWJlclVpZCAgID0gTnVtYmVyLl9fZ2V0X3Byb3RvbGliX2lkX18sXG4gICAgICAgIF9zdHJpbmdVaWQgICA9IFN0cmluZy5fX2dldF9wcm90b2xpYl9pZF9fLFxuICAgICAgICBfYXJyYXlVaWQgICAgPSBBcnJheS5fX2dldF9wcm90b2xpYl9pZF9fLFxuICAgICAgICBfZnVuY3Rpb25VaWQgPSBGdW5jdGlvbi5fX2dldF9wcm90b2xpYl9pZF9fLFxuICAgICAgICBfZGF0ZVVpZCAgICAgPSBEYXRlLl9fZ2V0X3Byb3RvbGliX2lkX18sXG4gICAgICAgIF9lcnJvclVpZCAgICA9IEVycm9yLl9fZ2V0X3Byb3RvbGliX2lkX18sXG4gICAgICAgIF9ib29sZWFuVWlkICA9IEJvb2xlYW4uX19nZXRfcHJvdG9saWJfaWRfXyxcbiAgICAgICAgX21hdGhVaWQgICAgID0gTWF0aC5fX2dldF9wcm90b2xpYl9pZF9fLFxuICAgICAgICBfcmVnZXhwVWlkICAgPSBSZWdFeHAuX19nZXRfcHJvdG9saWJfaWRfXztcblxuICAgIHZhciBQcm90b0xpYiA9IGZ1bmN0aW9uIFByb3RvTGliIChoYW5kbGUpIHtcbiAgICAgICAgLy8gUHJldmVudCBGdW5jdGlvbi5jYWxsIG9yIGJpbmRpbmcuLi5cbiAgICAgICAgaWYoISh0aGlzIGluc3RhbmNlb2YgUHJvdG9MaWIpKSByZXR1cm4gbmV3IFByb3RvTGliKGhhbmRsZSk7XG5cbiAgICAgICAgLy8gU2V0IGVpdGhlciB0aGUgdXNlciB0aGUgZGVmYXVsdCBcImhhbmRsZVwiIChsaWJyYXJ5IGFjY2Vzc29yKVxuICAgICAgICBoYW5kbGUgPSB0eXBlb2YgaGFuZGxlID09PSAnc3RyaW5nJyA/IGhhbmRsZSA6ICdfJztcblxuICAgICAgICAvKipcbiAgICAgICAgICogQSBzZWxmIHJlZmVyZW5jZS5cbiAgICAgICAgICogQHR5cGUge1Byb3RvTGlifVxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaGV0aGVyIG9yIG5vdCB0aGUgbGlicmFyeSBmdW5jdGlvbnMgaGF2ZSBiZWVuIGF0dGFjaGVkIHRvIHRoZSBwcm90b3R5cGVzLlxuICAgICAgICAgKiBAdHlwZSB7Qm9vbGVhbn1cbiAgICAgICAgICovXG4gICAgICAgIGF0dGFjaGVkID0gZmFsc2UsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFBvaW50cyB0byB0aGUgY3VycmVudCB0aGlzIGl0ZW0uXG4gICAgICAgICAqIEB0eXBlIHsqfVxuICAgICAgICAgKi9cbiAgICAgICAgY3VycmVudFRoaXMgPSBudWxsLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTdG9yZXMgY2FjaGVkIGxpYnJhcnkgcHJvdG8gcmVmZXJlbmNlIG9iamVjdHNcbiAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICovXG4gICAgICAgIGNhY2hlZCA9IHt9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTdG9yZXMgdGhlIGNvbnN0cnVjdG9yIGNoYWluIGZvciBlYWNoIHByb3RvdHlwZSBhcyBhbiBhcnJheS5cbiAgICAgICAgICogRm9yIGV4YW1wbGU6IHsgc3RyaW5nOiBbJ29iamVjdCcsICdzdHJpbmcnXSB9LlxuICAgICAgICAgKiBBbm90aGVyIGV4YW1wbGU6IHsgbXlDdXN0b21DbGFzc1RoYXRFeHRlbmRzU3RyaW5nOiBbJ29iamVjdCcsICdzdHJpbmcnLCAnbXlDdXN0b21DbGFzc1RoYXRFeHRlbmRzU3RyaW5nJ10gfVxuICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgKi9cbiAgICAgICAgaW5oZXJpdGFuY2VDaGFpbiA9IHt9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGUgc3RhdGljIGxpYnJhcnlcbiAgICAgICAgICovXG4gICAgICAgIGxpYnMgPSByZXF1aXJlKCcuL2xpYi9saWJzJykoUHJvdG9MaWIpLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGUgcHJvdG9saWJyYXJ5XG4gICAgICAgICAqL1xuICAgICAgICBsaWJwID0gcmVxdWlyZSgnLi9saWIvbGlicCcpKGxpYnMsIGdldFRoaXNWYWx1ZUFuZEludm9rZSk7XG5cbiAgICAgICAgLy8gTWFwIHRoZSBvYmplY3QgaWRzIHRvIHRoZSBsaWJyYXJ5IG5hbWVzLi4uXG4gICAgICAgIGxpYnBbX29iamVjdFVpZF0gICA9IGxpYnAub2JqZWN0ICAgfHwge307XG4gICAgICAgIGxpYnBbX3N0cmluZ1VpZF0gICA9IGxpYnAuc3RyaW5nICAgfHwge307XG4gICAgICAgIGxpYnBbX251bWJlclVpZF0gICA9IGxpYnAubnVtYmVyICAgfHwge307XG4gICAgICAgIGxpYnBbX2FycmF5VWlkXSAgICA9IGxpYnAuYXJyYXkgICAgfHwge307XG4gICAgICAgIGxpYnBbX2Z1bmN0aW9uVWlkXSA9IGxpYnAuZnVuY3Rpb24gfHwge307XG4gICAgICAgIGxpYnBbX2RhdGVVaWRdICAgICA9IGxpYnAuZGF0ZSAgICAgfHwge307XG4gICAgICAgIGxpYnBbX2Jvb2xlYW5VaWRdICA9IGxpYnAuYm9vbGVhbiAgfHwge307XG4gICAgICAgIGxpYnBbX2Vycm9yVWlkXSAgICA9IGxpYnAuZXJyb3IgICAgfHwge307XG4gICAgICAgIGxpYnBbX21hdGhVaWRdICAgICA9IGxpYnAubWF0aCAgICAgfHwge307XG4gICAgICAgIGxpYnBbX3JlZ2V4cFVpZF0gICA9IGxpYnAucmVnZXhwICAgfHwge307XG5cbiAgICAgICAgLy8gVHVjayB1bm5hbWVkIHN0YXRpYyBleHRlbnNpb25zIGhlcmUuLi5cbiAgICAgICAgbGlicy5teSA9IHt9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZWxldGVzIHRoZSBjYWNoZSBmb3IgdGhlIGdpdmVuIGNvbnN0cnVjdG9yLCBhbmQgYWxsIG90aGVycyB0aGF0IGluaGVyaXRzIGZyb20gaXRzIHByb3RvdHlwZS5cbiAgICAgICAgICogV2hpY2ggbWVhbnMgaWYgY29uc3RyID09PSBPYmplY3QsIGFsbCBjYWNoZSB3aWxsIGJlIGRlbGV0ZWQuXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNvbnN0ciBUaGUgY29uc3RydWN0b3IgdG8gZGVsZXRlIHRoZSBjYWNoZSBmb3IuXG4gICAgICAgICAqIEByZXR1cm4ge1Byb3RvTGlifSBUaGUgY3VycmVudCBQcm90b0xpYiBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gZGVsZXRlQ2FjaGVGb3JDb25zdHJ1Y3RvciAoY29uc3RyKSB7XG4gICAgICAgICAgICBmb3IodmFyIGkgaW4gaW5oZXJpdGFuY2VDaGFpbikge1xuICAgICAgICAgICAgICAgIGlmKGluaGVyaXRhbmNlQ2hhaW4uaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoaW5oZXJpdGFuY2VDaGFpbltpXS5pbmRleE9mKGNvbnN0ci5fX2dldF9wcm90b2xpYl9pZF9fKSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWNoZWRbaV0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgY2FjaGVkW2ldO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmhlcml0YW5jZUNoYWluW2ldID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGluaGVyaXRhbmNlQ2hhaW5baV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBcHBlbmRzIGFsbCB0aGUgbGlicmFyeSBmdW5jdGlvbnMgdG8gdGhpcyBpbnN0YW5jZSBmb3Igc3RhdGljIHVzZS5cbiAgICAgICAgICogQHJldHVybiB7UHJvdG9MaWJ9IFRoZSBjdXJyZW50IFByb3RvTGliIGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBhdHRhY2hMaWJyYXJ5VG9TZWxmICgpIHtcbiAgICAgICAgICAgIGZvcih2YXIgaSBpbiBsaWJzKVxuICAgICAgICAgICAgICAgIGlmKGxpYnMuaGFzT3duUHJvcGVydHkoaSkgJiYgIXNlbGZbaV0pIHNlbGZbaV0gPSBsaWJzW2ldO1xuICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBnZXRQcm90byAobykge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gT2JqZWN0LmdldFByb3RvdHlwZU9mKG8pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAvLyBJRSB0aHJvdyB3aGVuIGNhbGxpbmcgT2JqZWN0LmdldFByb3RvdHlwZU9mIG9uIHByaW1pdGl2ZSB2YWx1ZXMuLi5cbiAgICAgICAgICAgICAgICAvLyBCdXQgbm90IHdpdGggZGVwcmVjYXRlZCBfX3Byb3RvX18gPz8/XG4gICAgICAgICAgICAgICAgcmV0dXJuIG8uX19wcm90b19fIHx8IG8uY29uc3RydWN0b3IucHJvdG90eXBlOyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBZGRzIHRoZSBsaWJyYXJ5IG1ldGhvZHMgZnJvbSB0aGUgcHJpbWl0aXZlIG9iamVjdCBwcm90b3R5cGVzLlxuICAgICAgICAgKiBAcmV0dXJuIHtQcm90b0xpYn0gVGhlIGN1cnJlbnQgUHJvdG9MaWIgaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIGFwcGx5TGlicmFyeVRvUHJvdG90eXBlcyAoKSB7XG4gICAgICAgICAgICBpZighYXR0YWNoZWQpIHtcbiAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoT2JqZWN0LnByb3RvdHlwZSwgaGFuZGxlLCB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZSA6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGVudW1lcmFibGUgICA6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAvLyBBbGxvdyB1c2VycyB0byBvdmVyd3JpdGUgdGhlIGhhbmRsZSBvbiBhIHBlciBpbnN0YW5jZSBiYXNpcy4uLlxuICAgICAgICAgICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZih0aGlzW2hhbmRsZV0gIT09IHYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgaGFuZGxlLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZSA6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW1lcmFibGUgICA6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRhYmxlICAgICA6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlICAgICAgICA6IHZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgLy8gUmV0dXJucyB0aGUgbGlicCBsaWJyYXJ5Li4uXG4gICAgICAgICAgICAgICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNjSWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvdG8gPSBnZXRQcm90byh0aGlzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjSWQgICA9IHByb3RvLmNvbnN0cnVjdG9yLl9fZ2V0X3Byb3RvbGliX2lkX18sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGliICAgPSB7fSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpICAgICA9IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFzdCAgPSBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRUaGlzID0gdGhpcztcblxuICAgICAgICAgICAgICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNjSWQgPSBwcm90by5jb25zdHJ1Y3Rvci5fX2dldF9wcm90b2xpYl9pZF9fO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNhY2hlZFtjY0lkXSAmJiBpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWNoZWRbY2NJZF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYoY2FjaGVkW2NjSWRdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcihtIGluIGNhY2hlZFtjY0lkXSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNhY2hlZFtjY0lkXS5oYXNPd25Qcm9wZXJ0eShtKSkgbGliW21dID0gY2FjaGVkW2NjSWRdW21dO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKCFpbmhlcml0YW5jZUNoYWluW2NJZF0pIGluaGVyaXRhbmNlQ2hhaW5bY0lkXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmhlcml0YW5jZUNoYWluW2NJZF0gPSBpbmhlcml0YW5jZUNoYWluW2NjSWRdLmNvbmNhdChpbmhlcml0YW5jZUNoYWluW2NJZF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWNoZWRbY0lkXSA9IGxpYjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKCFsaWJwW2NjSWRdKSBsaWJwW2NjSWRdID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcihtIGluIGxpYnBbY2NJZF0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihsaWJwW2NjSWRdLmhhc093blByb3BlcnR5KG0pKSBsaWJbbV0gPSBsaWJwW2NjSWRdW21dO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZighaW5oZXJpdGFuY2VDaGFpbltjY0lkXSkgaW5oZXJpdGFuY2VDaGFpbltjY0lkXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5oZXJpdGFuY2VDaGFpbltjSWRdLnVuc2hpZnQoY2NJZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FjaGVkW2NJZF0gPSBsaWI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhc3QgPSBjY0lkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICsraTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChwcm90byA9IGdldFByb3RvKHByb3RvKSk7IC8vIGpzaGludCBpZ25vcmU6bGluZVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBsaWIuX19wcm90b2xpYl9jSWRfXyA9IGNJZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWI7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBhdHRhY2hlZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZW1vdmVzIHRoZSBsaWJyYXJ5IG1ldGhvZHMgZnJvbSB0aGUgcHJpbWl0aXZlIG9iamVjdCBwcm90b3R5cGVzLlxuICAgICAgICAgKiBAcmV0dXJuIHtQcm90b0xpYn0gVGhlIGN1cnJlbnQgUHJvdG9MaWIgaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIHJlbW92ZUxpYnJhcnlGcm9tUHJvdG90eXBlcyAoKSB7XG4gICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoT2JqZWN0LnByb3RvdHlwZSwgaGFuZGxlLCB7IHZhbHVlOiB1bmRlZmluZWQgfSk7XG4gICAgICAgICAgICBkZWxldGUgT2JqZWN0LnByb3RvdHlwZVtoYW5kbGVdO1xuICAgICAgICAgICAgYXR0YWNoZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHJpZXZlcyB0aGUgbGFzdCBpdGVtIGZyb20gdGhlICd0aGlzUG9pbnRlclN0YWNrJyBhbmQgaW52b2tlcyB0aGUgcHJvdmlkZWQgY2FsbGJhY2sgd2l0aCBpdC5cbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIHRvIGJlIGludm9rZWQgd2l0aCB0aGUgY3VycmVudCAndGhpcycgdmFsdWUuXG4gICAgICAgICAqIEByZXR1cm4gVGhlIHJlc3VsdCBvZiB0aGUgaW52b2NhdGlvbiBvZiB0aGUgY2FsbGJhY2suXG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBnZXRUaGlzVmFsdWVBbmRJbnZva2UgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soY3VycmVudFRoaXMgIT09IHVuZGVmaW5lZCAmJiBjdXJyZW50VGhpcyAhPT0gbnVsbCA/XG4gICAgICAgICAgICAgICAgKHR5cGVvZiBjdXJyZW50VGhpcyA9PT0gJ29iamVjdCcgPyBjdXJyZW50VGhpcyA6IGN1cnJlbnRUaGlzLnZhbHVlT2YoKSkgOiBjdXJyZW50VGhpc1xuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZXRzIHRoZSBoYW5kbGVcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGggVGhlIG5ldyBoYW5kbGVcbiAgICAgICAgICogQHJldHVybiB7UHJvdG9MaWJ9IFRoZSBjdXJyZW50IFByb3RvTGliIGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnNldEhhbmRsZSA9IGZ1bmN0aW9uIChoKSB7XG4gICAgICAgICAgICBzZWxmLnVubG9hZCgpO1xuICAgICAgICAgICAgaWYodHlwZW9mIGggPT09ICdzdHJpbmcnKSBoYW5kbGUgPSBoO1xuICAgICAgICAgICAgc2VsZi5sb2FkKCk7XG4gICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQWRkcyBhIGxpYnJhcnkgbWV0aG9kIHRvIGEgcHJvdG90eXBlLlxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9uPX0gW2NvbnN0cj1PYmplY3RdIFRoZSBjb25zdHJ1Y3RvciBvZiB0aGUgb2JqZWN0IHRvIGV4dGVuZC5cbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgVGhlIG5hbWUgb2YgdGhlIGxpYnJhcnkgbWV0aG9kIHRvIGFkZC5cbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIG1ldGhvZCB0byBhZGQuXG4gICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgdGhlIG1ldGhvZCB3YXMgYWRkZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZXh0ZW5kID0gZnVuY3Rpb24gKGNvbnN0ciwgbmFtZSwgc3RhdGljTmFtZXNwYWNlLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBsaWJzLm9iamVjdC5nZXRDYWxsYmFjayhhcmd1bWVudHMpO1xuXG4gICAgICAgICAgICBpZih0eXBlb2YgY29uc3RyID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIG5hbWUgPSBjb25zdHI7XG4gICAgICAgICAgICAgICAgY29uc3RyID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZih0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycgICAgIHx8ICEoY2FsbGJhY2sgaW5zdGFuY2VvZiBGdW5jdGlvbikpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIGlmKHR5cGVvZiBjb25zdHIgIT09ICdmdW5jdGlvbicgfHwgY29uc3RyID09PSBjYWxsYmFjaykgY29uc3RyID0gT2JqZWN0O1xuXG4gICAgICAgICAgICB2YXIgY29uc3RydWN0b3JJZCAgID0gY29uc3RyLl9fZ2V0X3Byb3RvbGliX2lkX18sXG4gICAgICAgICAgICAgICAgY29uc3RydWN0b3JOYW1lID0gdHlwZW9mIHN0YXRpY05hbWVzcGFjZSA9PT0gJ3N0cmluZycgP1xuICAgICAgICAgICAgICAgICAgICBzdGF0aWNOYW1lc3BhY2UgOiB0eXBlb2YgY29uc3RyLm5hbWUgPT09ICdzdHJpbmcnID8gY29uc3RyLm5hbWUgOiBudWxsO1xuXG4gICAgICAgICAgICBzd2l0Y2godHJ1ZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RyID09PSBPYmplY3Q6XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0cnVjdG9yTmFtZSA9ICdvYmplY3QnO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RyID09PSBBcnJheTpcbiAgICAgICAgICAgICAgICAgICAgY29uc3RydWN0b3JOYW1lID0gJ2FycmF5JztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0ciA9PT0gU3RyaW5nOlxuICAgICAgICAgICAgICAgICAgICBjb25zdHJ1Y3Rvck5hbWUgPSAnc3RyaW5nJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0ciA9PT0gTnVtYmVyOlxuICAgICAgICAgICAgICAgICAgICBjb25zdHJ1Y3Rvck5hbWUgPSAnbnVtYmVyJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0ciA9PT0gRnVuY3Rpb246XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0cnVjdG9yTmFtZSA9ICdmdW5jdGlvbic7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdHIgPT09IERhdGU6XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0cnVjdG9yTmFtZSA9ICdkYXRlJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0ciA9PT0gQm9vbGVhbjpcbiAgICAgICAgICAgICAgICAgICAgY29uc3RydWN0b3JOYW1lID0gJ2Jvb2xlYW4nO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RyID09PSBFcnJvcjpcbiAgICAgICAgICAgICAgICAgICAgY29uc3RydWN0b3JOYW1lID0gJ2RhdGUnO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RyID09PSBSZWdFeHA6XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0cnVjdG9yTmFtZSA9ICdyZWdleHAnO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYoIWxpYnBbY29uc3RydWN0b3JJZF0pICAgbGlicFtjb25zdHJ1Y3RvcklkXSAgID0ge307XG4gICAgICAgICAgICBpZighbGlic1tjb25zdHJ1Y3Rvck5hbWVdKSBsaWJzW2NvbnN0cnVjdG9yTmFtZV0gPSB7fTtcblxuICAgICAgICAgICAgLy8gQWRkIHN0YXRpYyB2ZXJzaW9uLi5cbiAgICAgICAgICAgIHZhciBzdGF0aWNWZXJzaW9uID0gZnVuY3Rpb24gKG8pIHsgcmV0dXJuIGNhbGxiYWNrLmFwcGx5KG8sIGFyZ3VtZW50cyk7IH07XG4gICAgICAgICAgICBpZihjb25zdHJ1Y3Rvck5hbWUpIHtcblxuICAgICAgICAgICAgICAgIC8vIFNldCB0aGlzIHByb3BlcnR5IHNvIHdlIGNhbiByZW1vdmUgaXQgbGF0ZXIgaWYgUHJvdG9MaWIucmVtb3ZlIGlzIGNhbGxlZCBvbiBpdC4uLlxuICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShjb25zdHIsICdfX3Byb3RvbGliX3N0YXRpY19uYW1lc3BhY2VfXycsIHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlndXJhYmxlIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgd3JpdGFibGUgICAgIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZW51bWVyYWJsZSAgIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlICAgICAgICA6IGNvbnN0cnVjdG9yTmFtZVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgbGlic1tjb25zdHJ1Y3Rvck5hbWVdW25hbWVdID0gc3RhdGljVmVyc2lvbjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gV2UgYWx3YXlzIGFkZCBleHRlbmRlZCBmdW5jdGlvbnMgdG8gbGlicy5teVxuICAgICAgICAgICAgbGlicy5teVtuYW1lXSA9IHN0YXRpY1ZlcnNpb247XG5cbiAgICAgICAgICAgIC8vIEFkZCBpbnN0YW5jZSB2ZXJzaW9uLi4uXG4gICAgICAgICAgICBsaWJwW2NvbnN0cnVjdG9ySWRdW25hbWVdICAgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBsaWJzLm9iamVjdC50b0FycmF5KGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoYykge1xuICAgICAgICAgICAgICAgICAgICBhcmdzLnVuc2hpZnQoYyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjay5hcHBseShjLCBhcmdzKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGRlbGV0ZUNhY2hlRm9yQ29uc3RydWN0b3IoY29uc3RyKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZW1vdmVzIGEgbGlicmFyeSBtZXRob2QgZnJvbSBhIGNvbnN0cnVjdG9yJ3MgcHJvdG90eXBlLlxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjb25zdHIgVGhlIGNvbnN0cnVjdG9yIHRvIHJlbW92ZSB0aGUgbWV0aG9kIGZyb20uXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIFRoZSBuYW1lIG9mIHRoZSBsaWJyYXJ5IG1ldGhvZCB0byByZW1vdmUuXG4gICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgdGhlIG1ldGhvZCB3YXMgcmVtb3ZlZCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5yZW1vdmUgPSBmdW5jdGlvbiAoY29uc3RyLCBuYW1lKSB7XG4gICAgICAgICAgICBpZih0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycgfHwgdHlwZW9mIGNvbnN0ciAhPT0gJ2Z1bmN0aW9uJykgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAgICAgICB2YXIgdWlkID0gY29uc3RyLl9fZ2V0X3Byb3RvbGliX2lkX187XG4gICAgICAgICAgICBpZihsaWJwW3VpZF0gJiYgbGlicFt1aWRdW25hbWVdKSB7XG4gICAgICAgICAgICAgICAgbGlicFt1aWRdW25hbWVdID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBsaWJwW3VpZF1bbmFtZV07XG5cbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgZnJvbSBzdGF0aWMgbmFtZXNwYWNlLCBpZiBhZGRlZCB0aGVyZS4uLlxuICAgICAgICAgICAgICAgIGlmKGxpYnNbY29uc3RyLl9fcHJvdG9saWJfc3RhdGljX25hbWVzcGFjZV9fXSAmJiBsaWJzW2NvbnN0ci5fX3Byb3RvbGliX3N0YXRpY19uYW1lc3BhY2VfX11bbmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgbGlic1tjb25zdHIuX19wcm90b2xpYl9zdGF0aWNfbmFtZXNwYWNlX19dW25hbWVdID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgbGlic1tjb25zdHIuX19wcm90b2xpYl9zdGF0aWNfbmFtZXNwYWNlX19dW25hbWVdO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBmcm9tIGxpYnMubXlcbiAgICAgICAgICAgICAgICBpZihsaWJzLm15W25hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpYnMubXlbbmFtZV0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBsaWJzLm15W25hbWVdO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGRlbGV0ZUNhY2hlRm9yQ29uc3RydWN0b3IoY29uc3RyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVtb3ZlcyB0aGUgcHJvdG90eXBlIGxpYnJhcnkgcmVmZXJlbmNlIGZyb20gdGhlIG9iamVjdCBwcm90b3R5cGUuXG4gICAgICAgICAqIEByZXR1cm4ge1Byb3RvTGlifSBUaGUgY3VycmVudCBQcm90b0xpYiBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy51bmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZW1vdmVMaWJyYXJ5RnJvbVByb3RvdHlwZXMoKTtcbiAgICAgICAgICAgIFByb3RvTGliW2hhbmRsZV0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBkZWxldGUgUHJvdG9MaWJbaGFuZGxlXTtcbiAgICAgICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBcHBsaWVzIHRoZSBsaWJyYXJ5IHRvIHRoZSBvYmplY3QgcHJvdG90eXBlIGFuZCBhbGwgc3RhdGljIGZ1bmN0aW9uc1xuICAgICAgICAgKiB0byB0aGUgY3VycmVudCBQcm90b0xpYiBpbnN0YW5jZS5cbiAgICAgICAgICogQHJldHVybiB7UHJvdG9MaWJ9IFRoZSBjdXJyZW50IFByb3RvTGliIGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhcHBseUxpYnJhcnlUb1Byb3RvdHlwZXMoKTtcbiAgICAgICAgICAgIGF0dGFjaExpYnJhcnlUb1NlbGYoKTtcbiAgICAgICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZWxldHMgdGhlIGxpYnJhcnkgY2FjaGVcbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbj19IGNvbnN0ciBUaGUgY29uc3RydWN0b3IgZnVuY3Rpb24gdG8ga2lsbCB0aGUgY2FjaGUgZm9yLlxuICAgICAgICAgKiBAcmV0dXJuIHtQcm90b0xpYn0gVGhlIGN1cnJlbnQgUHJvdG9MaWIgaW5zdGFuY2UuXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmtpbGxDYWNoZSA9IGZ1bmN0aW9uIChjb25zdHIpIHtcbiAgICAgICAgICAgIGlmKGNvbnN0cikge1xuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBjb25zdHIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FjaGVkW2NvbnN0ci5fX2dldF9wcm90b2xpYl9pZF9fXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGNhY2hlZFtjb25zdHIuX19nZXRfcHJvdG9saWJfaWRfX107XG5cbiAgICAgICAgICAgICAgICAgICAgaW5oZXJpdGFuY2VDaGFpbltjb25zdHIuX19nZXRfcHJvdG9saWJfaWRfX10gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBpbmhlcml0YW5jZUNoYWluW2NvbnN0ci5fX2dldF9wcm90b2xpYl9pZF9fXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWNoZWQgPSB7fTtcbiAgICAgICAgICAgICAgICBpbmhlcml0YW5jZUNoYWluID0ge307XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBcHBseSB0aGUgbGlicmFyeSB0byB0aGUgb2JqZWN0IHByb3RvdHlwZSwgYW5kIGF0dGFjaCBhbGwgdGhlIHN0YXRpYyBmdW5jdGlvbnNcbiAgICAgICAgLy8gdG8gdGhlIGN1cnJlbnQgUHJvdG9MaWIgaW5zdGFuY2UuLi5cbiAgICAgICAgc2VsZi5sb2FkKCk7XG5cbiAgICAgICAgLy8gQWRkIHRoaXMgaW5zdGFuY2UgdG8gdGhlIFByb3RvbGliIFwiY29udGFpbmVyXCJcbiAgICAgICAgUHJvdG9saWJzW2hhbmRsZV0gPSBzZWxmO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBHZXRzIGEgUHJvdG9MaWIgbGlicmFyeSBieSBoYW5kbGUsIG9yLCBhbiBpbnN0YW5jZSB3aXRoIHRoZSBnaXZlbiBoYW5kbGUgZG9lc24ndCBleGlzdCwgY3JlYXRlcyBvbmUuXG4gICAgICogQHBhcmFtIHtTdHJpbmc9fSBbaGFuZGxlPSdfJ10gVGhlIGhhbmRsZSBmb3IgdGhlIGluc3RhbmNlIHRvIGdldCBvciBjcmVhdGUuXG4gICAgICogQHJldHVybiB7UHJvdG9MaWJ9IFRoZSBuZXcgKG9yIHJldHJpZXZlZCkgUHJvdG9MaWIgaW5zdGFuY2UuXG4gICAgICovXG4gICAgUHJvdG9MaWIuZ2V0ID0gZnVuY3Rpb24gZ2V0IChoYW5kbGUpIHtcbiAgICAgICAgaGFuZGxlID0gdHlwZW9mIGhhbmRsZSA9PT0gJ3N0cmluZycgPyBoYW5kbGUgOiAnXyc7XG4gICAgICAgIHJldHVybiBQcm90b2xpYnNbaGFuZGxlXSB8fCBuZXcgUHJvdG9MaWIoaGFuZGxlKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRGVsZXRlcyB0aGUgY2FjaGUgZm9yIHRoZSBQcm90b2xpYiBpbnN0YW5jZSB3aXRoIHRoZSBnaXZlbiBoYW5kbGUuIElmIG5vIGhhbmRsZSBpcyBzcGVjaWZpZWQsXG4gICAgICogdGhlIGNhY2hlIGZvciBhbGwgaW5zdGFuY2VzIHdpbGwgYmUgZGVsZXRlZC5cbiAgICAgKiBAcGFyYW0ge1N0cmluZz19IGhhbmRsZSBUaGUgaGFuZGxlIG9mIHRoZSBpbnN0YW5jZSB0byBkZWxldGVcbiAgICAgKiBAcmV0dXJuIHtGdW5jdGlvbn0gVGhlIFByb3RvTGliIGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgUHJvdG9MaWIua2lsbENhY2hlID0gZnVuY3Rpb24ga2lsbENhY2hlIChoYW5kbGUpIHtcbiAgICAgICAgaWYoUHJvdG9saWJzW2hhbmRsZV0gaW5zdGFuY2VvZiBQcm90b0xpYikge1xuICAgICAgICAgICAgUHJvdG9saWJzW2hhbmRsZV0ua2lsbENhY2hlKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZighaGFuZGxlKSB7XG4gICAgICAgICAgICBmb3IodmFyIG4gaW4gUHJvdG9saWJzKSB7XG4gICAgICAgICAgICAgICAgaWYoUHJvdG9saWJzLmhhc093blByb3BlcnR5KG4pKSBQcm90b2xpYnNbbl0ua2lsbENhY2hlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFByb3RvTGliO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBEZWxldGVzIHRoZSBjYWNoZSBmb3IgdGhlIGdpdmVuIGNvbnN0cnVjdG9yIGZvciBhbGwgUHJvdG9MaWIgaW5zdGFuY2VzLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nPX0gY29uc3RyIFRoZSBjb25zdHJ1Y3RvciBjYWNoZSB0byBkZWxldGVcbiAgICAgKiBAcmV0dXJuIHtGdW5jdGlvbn0gVGhlIFByb3RvTGliIGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgUHJvdG9MaWIua2lsbENhY2hlRm9yQ29uc3RydWN0b3IgPSBmdW5jdGlvbiBraWxsQ2FjaGVGb3JDb25zdHJ1Y3RvciAoY29uc3RyKSB7XG4gICAgICAgIGZvcih2YXIgbiBpbiBQcm90b2xpYnMpIHtcbiAgICAgICAgICAgIGlmKFByb3RvbGlicy5oYXNPd25Qcm9wZXJ0eShuKSkgUHJvdG9saWJzW25dLmtpbGxDYWNoZShjb25zdHIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBQcm90b0xpYjtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyB0aGUgbGlicmFyeSBtZXRob2RzIGZyb20gT2JqZWN0W2hhbmRsZV0gYW5kIHJlbGVhc2VzIHRoZSBQcm90b0xpYiBpbnN0YW5jZSBmb3IgZ2FyYmFnZSBjb2xsZWN0aW9uIChpZlxuICAgICAqIGl0J3Mgbm90IHJlZmVyZW5jZXMgZWxzZXdoZXJlKS5cbiAgICAgKiBAcGFyYW0ge1N0cmluZz19IFtoYW5kbGU9J18nXSBUaGUgaGFuZGxlIG9mIHRoZSBQcm90b0xpYiBpbnN0YW5jZSB0b1xuICAgICAqIEByZXR1cm4ge0Z1bmN0aW9ufSBUaGUgUHJvdG9MaWIgY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBQcm90b0xpYi5kZXN0cm95ID0gZnVuY3Rpb24gZGVzdHJveSAoaGFuZGxlKSB7XG4gICAgICAgIGhhbmRsZSA9IHR5cGVvZiBoYW5kbGUgPT09ICdzdHJpbmcnID8gaGFuZGxlIDogJ18nO1xuICAgICAgICBpZih0eXBlb2YgUHJvdG9saWJzW2hhbmRsZV0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBQcm90b2xpYnNbaGFuZGxlXS51bmxvYWQoKTtcbiAgICAgICAgICAgIFByb3RvbGlic1toYW5kbGVdID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgZGVsZXRlIFByb3RvbGlic1toYW5kbGVdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBQcm90b0xpYjtcbiAgICB9O1xuXG4gICAgcmV0dXJuICFJU19CUk9XU0VSID9cbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgID0gUHJvdG9MaWIgOlxuICAgICAgICB3aW5kb3cuUHJvdG9MaWIgPSBQcm90b0xpYiA7XG59KCkpO1xuIiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgZnVuY3Rpb24gbGlicCAobGlicywgZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKSB7XG4gICAgICAgIHZhciBsaWJwID0ge1xuICAgICAgICAgICAgc3RyaW5nOiB7XG4gICAgICAgICAgICAgICAgdG9KU1ZhbHVlOiBmdW5jdGlvbiB0b0pTVmFsdWUgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcudG9KU1ZhbHVlKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgY2FtZWxpemU6IGZ1bmN0aW9uIGNhbWVsaXplICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLmNhbWVsaXplKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZGVjYW1lbGl6ZTogZnVuY3Rpb24gZGVjYW1lbGl6ZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5kZWNhbWVsaXplKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZGlmZmVyZW5jZUZyb21TdHJpbmc6IGZ1bmN0aW9uIGRpZmZlcmVuY2VGcm9tU3RyaW5nIChvdGhlcikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcuZGlmZmVyZW5jZUZyb21TdHJpbmcocywgb3RoZXIpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcmVwbGFjZVRva2VuczogZnVuY3Rpb24gcmVwbGFjZVRva2VucyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5yZXBsYWNlU3RyaW5nVG9rZW5zKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaW50ZXJzZWN0U3RyaW5nOiBmdW5jdGlvbiBpbnRlcnNlY3RTdHJpbmcgKG90aGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5pbnRlcnNlY3RTdHJpbmcocywgb3RoZXIpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcmVwZWF0OiBmdW5jdGlvbiByZXBlYXQgKHRpbWVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5yZXBlYXQocywgdGltZXMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcnRyaW06IGZ1bmN0aW9uIHJ0cmltICh3aGF0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5ydHJpbShzLCB3aGF0KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGx0cmltOiBmdW5jdGlvbiBsdHJpbSAod2hhdCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcubHRyaW0ocywgd2hhdCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBodG1sRW5jb2RlOiBmdW5jdGlvbiBodG1sRW5jb2RlICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLmh0bWxFbmNvZGUocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBodG1sRGVjb2RlOiBmdW5jdGlvbiBodG1sRGVjb2RlICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLmh0bWxEZWNvZGUocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBhZGRTbGFzaGVzOiBmdW5jdGlvbiBhZGRTbGFzaGVzICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLmFkZFNsYXNoZXMocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB1Y0ZpcnN0OiBmdW5jdGlvbiB1Y0ZpcnN0ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLnVjRmlyc3Qocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBsY0ZpcnN0OiBmdW5jdGlvbiBsY0ZpcnN0ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLmxjRmlyc3Qocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB0aXRsZUNhc2U6IGZ1bmN0aW9uIHRpdGxlQ2FzZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy50aXRsZUNhc2Uocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBzcGxpY2U6IGZ1bmN0aW9uIHNwbGljZSAoaW5kZXgsIGNvdW50LCBhZGQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLnNwbGljZShzLCBpbmRleCwgY291bnQsIGFkZCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBlbGxpcHNlczogZnVuY3Rpb24gZWxsaXBzZXNfIChsZW5ndGgsIHBsYWNlLCBlbGxpcHNlcykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcuZWxsaXBzZXMocywgbGVuZ3RoLCBwbGFjZSwgZWxsaXBzZXMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgc2h1ZmZsZTogZnVuY3Rpb24gc2h1ZmZsZSAoc3BsaXR0ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLnNodWZmbGUocywgc3BsaXR0ZXIpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcmV2ZXJzZTogZnVuY3Rpb24gcmV2ZXJzZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5yZXZlcnNlKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgd2l0aG91dFRyYWlsaW5nU2xhc2g6IGZ1bmN0aW9uIHdpdGhvdXRUcmFpbGluZ1NsYXNoICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLndpdGhvdXRUcmFpbGluZ1NsYXNoKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgd2l0aFRyYWlsaW5nU2xhc2g6IGZ1bmN0aW9uIHdpdGhUcmFpbGluZ1NsYXNoICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLndpdGhUcmFpbGluZ1NsYXNoKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcmVnZXhwU2FmZTogZnVuY3Rpb24gcmVnZXhwU2FmZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5yZWdleHBTYWZlKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcGFkOiBmdW5jdGlvbiBwYWQgKGxlbmd0aCwgZGVsaW0sIHByZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcucGFkKHMsIGxlbmd0aCwgZGVsaW0sIHByZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBuZXdsaW5lVG9CcmVhazogZnVuY3Rpb24gbmV3bGluZVRvQnJlYWsgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcubmV3bGluZVRvQnJlYWsocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB0YWJzVG9TcGFuOiBmdW5jdGlvbiB0YWJzVG9TcGFuICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLnRhYnNUb1NwYW4ocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB3b3JkV3JhcFRvTGVuZ3RoOiBmdW5jdGlvbiB3b3JkV3JhcFRvTGVuZ3RoICh3aWR0aCwgcGFkbGVmdCwgcGFkcmlnaHQsIG9taXRGaXJzdCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcud29yZFdyYXBUb0xlbmd0aChzLCB3aWR0aCwgcGFkbGVmdCwgcGFkcmlnaHQsIG9taXRGaXJzdCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBhcnJheToge1xuICAgICAgICAgICAgICAgIHNodWZmbGU6IGZ1bmN0aW9uIHNodWZmbGUgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS5zaHVmZmxlKGEpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgdW5pb246IGZ1bmN0aW9uIHVuaW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBsaWJzLm9iamVjdC50b0FycmF5KGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MudW5zaGlmdChhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmFycmF5LnVuaW9uLmFwcGx5KGEsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZGlmZmVyZW5jZTogZnVuY3Rpb24gZGlmZmVyZW5jZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gbGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzLnVuc2hpZnQoYSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS5kaWZmZXJlbmNlLmFwcGx5KGEsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaW50ZXJzZWN0OiBmdW5jdGlvbiBpbnRlcnNlY3QgKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IGxpYnMub2JqZWN0LnRvQXJyYXkoYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJncy51bnNoaWZ0KGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkuaW50ZXJzZWN0LmFwcGx5KGEsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgd2l0aG91dDogZnVuY3Rpb24gd2l0aG91dCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gbGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzLnVuc2hpZnQoYSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS53aXRob3V0LmFwcGx5KGEsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcm90YXRlOiBmdW5jdGlvbiByb3RhdGUgKGRpcmVjdGlvbiwgYW1vdW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmFycmF5LnJvdGF0ZShhLCBkaXJlY3Rpb24sIGFtb3VudCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICByb3RhdGVMZWZ0OiBmdW5jdGlvbiByb3RhdGVMZWZ0IChhbW91bnQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkucm90YXRlTGVmdChhLCBhbW91bnQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcm90YXRlUmlnaHQ6IGZ1bmN0aW9uIHJvdGF0ZVJpZ2h0IChhbW91bnQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkucm90YXRlUmlnaHQoYSwgYW1vdW50KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIG1ha2VVbmlxdWU6IGZ1bmN0aW9uIG1ha2VVbmlxdWUgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS5tYWtlVW5pcXVlKGEpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgdW5pcXVlOiBmdW5jdGlvbiB1bmlxdWUgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS51bmlxdWUoYSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBhc2NlbmRpbmc6IGZ1bmN0aW9uIGFzY2VuZGluZyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmFycmF5LmFzY2VuZGluZyhhKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGRlc2NlbmRpbmc6IGZ1bmN0aW9uIGRlc2NlbmRpbmcgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS5kZXNjZW5kaW5nKGEpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBudW1iZXI6IHtcblxuICAgICAgICAgICAgICAgIHdpdGhQbGFjZWhvbGRlcnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLndpdGhQbGFjZWhvbGRlcnMobik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBmb3JtYXRNb25leTogZnVuY3Rpb24gKHN5bWJvbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuZm9ybWF0TW9uZXkobiwgc3ltYm9sKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHRvOiBmdW5jdGlvbiB0b18gKGspIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlzSW50ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihuICUgMSA9PT0gMCAmJiBuLnRvU3RyaW5nKCkuaW5kZXhPZignLicpID09PSAtMSkgaXNJbnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGlzSW50ID8gbGlicy5udW1iZXIucmFuZG9tSW50SW5SYW5nZShuLCBrKSA6IGxpYnMubnVtYmVyLnJhbmRvbU51bWJlckluUmFuZ2Uobiwgayk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc0ludDogZnVuY3Rpb24gaXNJbnQgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuaXNJbnQobik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBmYWN0b3JpYWw6IGZ1bmN0aW9uIGZhY3RvcmlhbCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5mYWN0b3JpYWwobik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBjaG9vc2U6IGZ1bmN0aW9uIGNob29zZSAoaykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuY2hvb3NlKG4sIGspO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcGFkOiBmdW5jdGlvbiBwYWQgKGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIucGFkKG4sIGxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBkYXlzRnJvbTogZnVuY3Rpb24gZGF5c0Zyb20gKGRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLmRheXNGcm9tKG4sIGRhdGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZGF5c0Zyb21Ob3c6IGZ1bmN0aW9uIGRheXNGcm9tTm93ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLmRheXNGcm9tTm93KG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgc2Vjb25kc0Zyb206IGZ1bmN0aW9uIHNlY29uZHNGcm9tIChkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5zZWNvbmRzRnJvbShuLCBkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHNlY29uZHNGcm9tTm93OiBmdW5jdGlvbiBzZWNvbmRzRnJvbU5vdyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5zZWNvbmRzRnJvbU5vdyhuKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHllYXJzRnJvbTogZnVuY3Rpb24geWVhcnNGcm9tIChkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci55ZWFyc0Zyb20obiwgZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB5ZWFyc0Zyb21Ob3c6IGZ1bmN0aW9uIHllYXJzRnJvbU5vdyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci55ZWFyc0Zyb21Ob3cobik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBtb250aHNGcm9tOiBmdW5jdGlvbiBtb250aHNGcm9tIChkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5tb250aHNGcm9tKG4sIGRhdGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgbW9udGhzRnJvbU5vdzogZnVuY3Rpb24gbW9udGhzRnJvbU5vdyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5tb250aHNGcm9tTm93KG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaG91cnNGcm9tOiBmdW5jdGlvbiBob3Vyc0Zyb20gKGRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLmhvdXJzRnJvbShuLCBkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGhvdXJzRnJvbU5vdzogZnVuY3Rpb24gaG91cnNGcm9tTm93ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLmhvdXJzRnJvbU5vdyhuKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIG1pbnV0ZXNGcm9tOiBmdW5jdGlvbiBtaW51dGVzRnJvbSAoZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIubWludXRlc0Zyb20obiwgZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBtaW51dGVzRnJvbU5vdzogZnVuY3Rpb24gbWludXRlc0Zyb21Ob3cgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIubWludXRlc0Zyb21Ob3cobik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBtb250aHNBZ286IGZ1bmN0aW9uIG1vbnRoc0FnbyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5tb250aHNBZ28obik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBkYXlzQWdvOiBmdW5jdGlvbiBkYXlzQWdvICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLmRheXNBZ28obik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBzZWNvbmRzQWdvOiBmdW5jdGlvbiBzZWNvbmRzQWdvICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLnNlY29uZHNBZ28obik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBtaW51dGVzQWdvOiBmdW5jdGlvbiBtaW51dGVzQWdvICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLm1pbnV0ZXNBZ28obik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB5ZWFyc0FnbzogZnVuY3Rpb24geWVhcnNBZ28gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIueWVhcnNBZ28obik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBjbG9ja1RpbWU6IGZ1bmN0aW9uIGNsb2NrVGltZSAob21pdE1TKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5jbG9ja1RpbWUobiwgb21pdE1TKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgZnVuY3Rpb246IHtcbiAgICAgICAgICAgICAgICBpbmhlcml0czogZnVuY3Rpb24gaW5oZXJpdHMgKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuZnVuY3Rpb24uaW5oZXJpdHMobywgcyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG9iamVjdDoge1xuICAgICAgICAgICAgICAgIHVuaXF1ZUlkOiBmdW5jdGlvbiB1bmlxdWVJZCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC51bmlxdWVJZChvKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGhpc3RvZ3JhbTogZnVuY3Rpb24gaGlzdG9ncmFtICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0Lmhpc3RvZ3JhbShvKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGNvcHk6IGZ1bmN0aW9uIGNvcHkgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuY29weShvKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGVhY2g6IGZ1bmN0aW9uIGVhY2ggKHN0YXJ0LCBlbmQsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5lYWNoKG8sIHN0YXJ0LCBlbmQsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIG9jY3VycmVuY2VzT2Y6IGZ1bmN0aW9uIG9jY3VycmVuY2VzT2YgKHdoYXQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0Lm9jY3VycmVuY2VzT2Yobywgd2hhdCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBrZXlzOiBmdW5jdGlvbiBrZXlzICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmtleXMobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBzaXplOiBmdW5jdGlvbiBzaXplICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LnNpemUobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc051bWVyaWM6IGZ1bmN0aW9uIGlzTnVtZXJpYyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5pc051bWVyaWMobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBnZXROdW1lcmljOiBmdW5jdGlvbiBnZXROdW1lcmljICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmdldE51bWVyaWMobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc0VtcHR5OiBmdW5jdGlvbiBpc0VtcHR5ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmlzRW1wdHkobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc0FycmF5OiBmdW5jdGlvbiBpc0FycmF5ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmlzQXJyYXkobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc1B1cmVPYmplY3Q6IGZ1bmN0aW9uIGlzUHVyZU9iamVjdCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5pc1B1cmVPYmplY3Qobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc1N0cmluZzogZnVuY3Rpb24gaXNTdHJpbmcgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuaXNTdHJpbmcobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc1VuZGVmaW5lZDogZnVuY3Rpb24gaXNVbmRlZmluZWQgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuaXNVbmRlZmluZWQobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc051bGw6IGZ1bmN0aW9uIGlzTnVsbCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5pc051bGwobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc0Jvb2xlYW46IGZ1bmN0aW9uIGlzQm9vbGVhbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5pc0Jvb2xlYW4obyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc0Z1bmN0aW9uOiBmdW5jdGlvbiBpc0Z1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmlzRnVuY3Rpb24obyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc0FyZ3VtZW50czogZnVuY3Rpb24gaXNBcmd1bWVudHMgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuaXNBcmd1bWVudHMobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB0b051bWJlcjogZnVuY3Rpb24gdG9OdW1iZXIgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QudG9OdW1iZXIobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB0b0ludDogZnVuY3Rpb24gdG9JbnQgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QudG9JbnQobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB0b0FycmF5OiBmdW5jdGlvbiB0b0FycmF5ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LnRvQXJyYXkobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBnZXRDYWxsYmFjazogZnVuY3Rpb24gZ2V0Q2FsbGJhY2sgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZ2V0Q2FsbGJhY2sobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICByYW5kb206IGZ1bmN0aW9uIHJhbmRvbSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5yYW5kb20obyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBldmVyeTogZnVuY3Rpb24gZXZlcnkgKGYpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmV2ZXJ5KG8sIGYpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgYW55OiBmdW5jdGlvbiBhbnkgKGYpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmFueShvLCBmKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGZpcnN0OiBmdW5jdGlvbiBmaXJzdCAobikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZmlyc3Qobywgbik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBsYXN0OiBmdW5jdGlvbiBsYXN0IChuKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5sYXN0KG8sIG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZmluZENoaWxkQXRQYXRoOiBmdW5jdGlvbiBmaW5kQ2hpbGRBdFBhdGggKHBhdGgsIGRlbGltaXRlciwgZG9uZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZmluZENoaWxkQXRQYXRoKG8sIHBhdGgsIGRlbGltaXRlciwgZG9uZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBjbG9uZTogZnVuY3Rpb24gY2xvbmUgKHJlcGxhY2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5jbG9uZShvLCByZXBsYWNlcik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBvbmx5OiBmdW5jdGlvbiBvbmx5ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBsaWJzLm9iamVjdC50b0FycmF5KGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MudW5zaGlmdChvKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5vbmx5LmFwcGx5KG8sIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgd2hlcmU6IGZ1bmN0aW9uIHdoZXJlIChwcmVkaWNhdGVGdW5jdGlvbikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3Qud2hlcmUobywgcHJlZGljYXRlRnVuY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgd2hlcmVLZXlzOiBmdW5jdGlvbiB3aGVyZUtleXMgKHByZWRpY2F0ZUZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC53aGVyZUtleXMobywgcHJlZGljYXRlRnVuY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaW52ZXJ0OiBmdW5jdGlvbiBpbnZlcnQgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuaW52ZXJ0KG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgbWF4OiBmdW5jdGlvbiBtYXggKGYpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0Lm1heChvLCBmKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGtleU9mTWF4OiBmdW5jdGlvbiBrZXlPZk1heCAoZikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3Qua2V5T2ZNYXgobywgZik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBtaW46IGZ1bmN0aW9uIG1pbiAoZikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QubWluKG8sIGYpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAga2V5T2ZNaW46IGZ1bmN0aW9uIGtleU9mTWluIChmKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5rZXlPZk1pbihvLCBmKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGltcGxlbWVudHM6IGZ1bmN0aW9uIF9pbXBsZW1lbnRzIChtZXRob2QpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmltcGxlbWVudHMobywgbWV0aG9kKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGltcGxlbWVudHNPd246IGZ1bmN0aW9uIGltcGxlbWVudHNPd24gKG1ldGhvZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuaW1wbGVtZW50c093bihvLCBtZXRob2QpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgZGF0ZToge1xuICAgICAgICAgICAgICAgIGFkdmFuY2VEYXlzOiBmdW5jdGlvbiBhZHZhbmNlRGF5cyAobiwgYWRqdXN0Rm9yV2Vla2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmRhdGUuYWR2YW5jZURheXMoZCwgbiwgYWRqdXN0Rm9yV2Vla2VkKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGFkdmFuY2VNb250aHM6IGZ1bmN0aW9uIGFkdmFuY2VNb250aHMgKG4sIGFkanVzdEZvcldlZWtlZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5kYXRlLmFkdmFuY2VNb250aHMoZCwgbiwgYWRqdXN0Rm9yV2Vla2VkKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGFkdmFuY2VZZWFyczogZnVuY3Rpb24gYWR2YW5jZVllYXJzIChuLCBhZGp1c3RGb3JXZWVrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuZGF0ZS5hZHZhbmNlWWVhcnMoZCwgbiwgYWRqdXN0Rm9yV2Vla2VkKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHl5eXltbWRkOiBmdW5jdGlvbiB5eXl5bW1kZCAoZGVsaW0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuZGF0ZS55eXl5bW1kZChkLCBkZWxpbSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBjbG9ja1RpbWU6IGZ1bmN0aW9uIGNsb2NrVGltZSAob21pdE1TKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmRhdGUuY2xvY2tUaW1lKGQsICEhb21pdE1TKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgLyoqIEB0b2RvOiBBZGQgc29tZSBFcnJvciB1dGlsaXR5IGZ1bmN0aW9ucy4uLiAqL1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgYm9vbGVhbjoge1xuICAgICAgICAgICAgICAgIC8qKiBAdG9kbzogQWRkIHNvbWUgQm9vbGVhbiB1dGlsaXR5IGZ1bmN0aW9ucy4uLiAqL1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgbWF0aDoge1xuICAgICAgICAgICAgICAgIC8qKiBAdG9kbzogQWRkIHNvbWUgTWF0aCB1dGlsaXR5IGZ1bmN0aW9ucy4uLiAqL1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgcmVnZXhwOiB7XG4gICAgICAgICAgICAgICAgLyoqIEB0b2RvOiBBZGQgc29tZSBSZWdFeHAgdXRpbGl0eSBmdW5jdGlvbnMuLi4gKi9cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gbGlicDtcbiAgICB9XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBsaWJwO1xufSgpKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgZnVuY3Rpb24gbGlicyAoUHJvdG9MaWIpIHtcbiAgICAgICAgdmFyIElTX0JST1dTRVIgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyxcbiAgICAgICAgICAgIEhBU19PUyAgICAgPSBJU19CUk9XU0VSID8gZmFsc2UgOiB0eXBlb2YgcmVxdWlyZSgnb3MnKSA9PT0gJ29iamVjdCc7XG5cbiAgICAgICAgLy8gVXNlZCBpbiBPYmplY3Quc2V0UHJvdG90eXBlT2YgcG9seWZpbGwgb25seVxuICAgICAgICB2YXIgZXhjbHVkZSA9IFsnbGVuZ3RoJywgJ25hbWUnLCAnYXJndW1lbnRzJywgJ2NhbGxlcicsICdwcm90b3R5cGUnXTtcblxuICAgICAgICAvLyBVc2VkIGluIE9iamVjdC5zZXRQcm90b3R5cGVPZiBwb2x5ZmlsbCBvbmx5XG4gICAgICAgIGZ1bmN0aW9uIGJpbmRGdW5jdGlvbihvLCBmbikge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkgeyByZXR1cm4gZm4uYXBwbHkobywgYXJndW1lbnRzKTsgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZWQgaW4gT2JqZWN0LnNldFByb3RvdHlwZU9mIHBvbHlmaWxsIG9ubHlcbiAgICAgICAgZnVuY3Rpb24gYmluZFByb3BlcnR5KG8sIHBhcmVudCwgcHJvcCkge1xuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIHByb3AsIHtcbiAgICAgICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHsgcmV0dXJuIHBhcmVudFtwcm9wXTsgfSBjYXRjaCAoZSkge31cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNldDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgICAgICAgICB0cnkgeyBwYXJlbnRbcHJvcF0gPSB2YWw7IH0gY2F0Y2goZSkge31cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogU2V0cyB0aGUgcHJvcGVydGllcyBvbiBhbiBvYmogZnJvbSB0aGUgZ2l2ZW4gcHJvdG90eXBlLlxuICAgICAgICAgKiBVc2VkIGluIHRoZSBjYXNlIHRoYXQgT2JqZWN0LnNldFByb3RvdHlwZU9mIGFuZCBPYmplY3QuX19wcm90b19fIGlzIHVuYXZhaWxhYmxlLCBlLmcuIG9ubHkgSUUgPCAxMVxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gaXRlcmF0ZVByb3BlcnRpZXMgKF9zdWIsIF9zdXBlcikge1xuICAgICAgICAgICAgdmFyIHByb3BzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoX3N1cGVyKSxcbiAgICAgICAgICAgICAgICBwcm90bztcblxuICAgICAgICAgICAgX3N1Yi5fX3Byb3RvX18gPSBfc3VwZXI7IC8vIGpzaGludCBpZ25vcmU6bGluZVxuICAgICAgICAgICAgZm9yKHZhciBpID0gMCwgbGVuID0gcHJvcHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgcHJvcCA9IHByb3BzW2ldO1xuXG4gICAgICAgICAgICAgICAgaWYgKHByb3AgPT09ICdfX3Byb3RvX18nKSB7XG4gICAgICAgICAgICAgICAgICAgIHByb3RvID0gX3N1cGVyLl9fcHJvdG9fXzsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYoZXhjbHVkZS5pbmRleE9mKGkpID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoX3N1YiwgcHJvcCk7XG4gICAgICAgICAgICAgICAgICAgIGlmKCFkZXNjcmlwdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc3VwZXJEZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihfc3VwZXIsIHByb3ApO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIHN1cGVyRGVzY3JpcHRvci5nZXQgIT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIF9zdXBlcltwcm9wXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9zdWJbcHJvcF0gPSBiaW5kRnVuY3Rpb24oX3N1YiwgX3N1cGVyW3Byb3BdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJpbmRQcm9wZXJ0eShfc3ViLCBfc3VwZXIsIHByb3ApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZihwcm90bykgaXRlcmF0ZVByb3BlcnRpZXMoX3N1YiwgcHJvdG8pO1xuICAgICAgICAgICAgcmV0dXJuIF9zdWI7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQb2x5ZmlsbCBPYmplY3Quc2V0UHJvdG90eXBlT2ZcbiAgICAgICAgT2JqZWN0LnNldFByb3RvdHlwZU9mID0gT2JqZWN0LnNldFByb3RvdHlwZU9mIHx8IGZ1bmN0aW9uIHNldFByb3RvdHlwZU9mUG9seWZpbGwgKF9zdWIsIF9zdXBlcikge1xuICAgICAgICAgICAgaWYoX3N1Yi5fX3Byb3RvX18pIHsgICAgICAgICAgLy8ganNoaW50IGlnbm9yZTpsaW5lXG4gICAgICAgICAgICAgICAgX3N1Yi5fX3Byb3RvX18gPSBfc3VwZXI7ICAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGl0ZXJhdGVQcm9wZXJ0aWVzKF9zdWIsIF9zdXBlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gX3N1YjtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQWx0ZXJzIEZpcmVmb3gncyBGdW5jdGlvbi50b1N0cmluZygpIHJlc3VsdHMgdG8gbWF0Y2ggQ2hyb21lL1NhZmFyaS5cbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGUgZnVuY3Rpb24uXG4gICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIGFsdGVyZWQgc3RyaW5nLCB3aXRoIG5ld2xpbmVzIHJlcGxhY2VkIGFuZCAndXNlIHN0cmljdCcgcmVtb3ZlZC5cbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIGZpeEZpcmVmb3hGdW5jdGlvblN0cmluZyAocykge1xuICAgICAgICAgICAgcmV0dXJuIHMucmVwbGFjZSgvKD86XFxyKT9cXG4rL2csICcnKS5yZXBsYWNlKC9cInVzZSBzdHJpY3RcIjt8J3VzZSBzdHJpY3QnOy9nLCAnJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogSUUgZG9lc24ndCBhbGxvdyBPYmplY3Qua2V5cyBvbiBwcmltaXRpdmUgdHlwZXMuLi5cbiAgICAgICAgICogQHJldHVybiB7QXJyYXk8U3RyaW5nfE51bWJlcj59XG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBnZXRLZXlzIChvKSB7XG4gICAgICAgICAgICBzd2l0Y2godHlwZW9mIG8pIHtcbiAgICAgICAgICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbyA/IE9iamVjdC5rZXlzKG8pIDogW107XG5cbiAgICAgICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICAgICAgICB2YXIga2V5cyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgby5sZW5ndGg7IGkrKykga2V5cy5wdXNoKGkudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBrZXlzO1xuXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIE5VTExfRlVOQ1RJT04gPSBmdW5jdGlvbiBFTVBUWV9DQUxMQkFDS19SRVBMQUNFTUVOVCAoKSB7fTtcblxuICAgICAgICB2YXIgbGlicyA9IHtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTdHJpbmcgbGlicmFyeSBmdW5jdGlvbnNcbiAgICAgICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHN0cmluZzoge1xuXG4gICAgICAgICAgICAgICAgdG9KU1ZhbHVlOiBmdW5jdGlvbiB0b0pTVmFsdWUgKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9yaWdpbmFsID0gcztcbiAgICAgICAgICAgICAgICAgICAgcyA9IHMudHJpbSgpO1xuXG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCh0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIHMgPT09ICdmYWxzZScgICAgIDogcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBzID09PSAndHJ1ZScgICAgICA6IHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBzID09PSAnbnVsbCcgICAgICA6IHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBzID09PSAndW5kZWZpbmVkJyA6IHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgbGlicy5vYmplY3QuaXNOdW1lcmljKHMpOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5nZXROdW1lcmljKHMpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiByZXR1cm4gb3JpZ2luYWw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcmFuZG9tU3RyaW5nOiBmdW5jdGlvbiByYW5kb21TdHJpbmcgKGxlbmd0aCwgcG9zc2libGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcG9zc2libGUgPSB0eXBlb2YgcG9zc2libGUgPT09ICdzdHJpbmcnID8gcG9zc2libGUgOiAnMDEyMzQ1Njc4OWFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6QUJDREVGR0hJSktMTU5PUFFSU1VWV1hZWl8gYH4hQCMkJV4mKigpXytcXFxcfF1bXFwnOy8uLHx9e1wiOj8+PCc7XG4gICAgICAgICAgICAgICAgICAgIGxlbmd0aCAgID0gbGlicy5vYmplY3QuaXNOdW1lcmljKGxlbmd0aCkgPyBsZW5ndGggOiAxMDtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgcmVzID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKylcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcyArPSBwb3NzaWJsZS5jaGFyQXQoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogcG9zc2libGUubGVuZ3RoKSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIENhbWVsaXplcyBhbGwgb2YgdGhlIHByb3ZpZGVkIHN0cmluZyBhcmd1bWVudHMuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHsuLi5TdHJpbmd9IHN0cmluZyBBIGxpc3Qgb2Ygc3RyaW5ncyB0byBjYW1lbGl6ZS5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtBcnJheTxTdHJpbmc+fSBBbiBhcnJheSBvZiB0aGUgcHJvdmlkZWQgYXJndW1lbnRzLCB3aXRoIGFsbCBzdHJpbmdzIGNhbWVsaXplZC5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBjYW1lbGl6ZTogZnVuY3Rpb24gY2FtZWxpemUgKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgcyA9PT0gJ2Z1bmN0aW9uJykgcyA9IGZpeEZpcmVmb3hGdW5jdGlvblN0cmluZyhzLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMgPSBzLnRvU3RyaW5nKCkucmVwbGFjZSgvW15hLXowLTkkXS9naSwgJ18nKS5yZXBsYWNlKC9cXCQoXFx3KS9nLCAnJF8kMScpLnNwbGl0KC9bXFxzX10rL2cpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2gocywgMSwgcy5sZW5ndGgsIGZ1bmN0aW9uIChpLCBrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNba10gPSBsaWJzLnN0cmluZy51Y0ZpcnN0KGkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMgPSBsaWJzLnN0cmluZy5sY0ZpcnN0KHMuam9pbignJykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2gocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0Lmxlbmd0aCA9PT0gMSA/IHJldFswXSA6IHJldDtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogRGVjYW1lbGl6ZXMgYWxsIG9mIHRoZSBwcm92aWRlZCBzdHJpbmcgYXJndW1lbnRzLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uU3RyaW5nfSBzdHJpbmcgQSBsaXN0IG9mIHN0cmluZ3MgdG8gZGVjYW1lbGl6ZS5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtBcnJheTxTdHJpbmc+fSBBbiBhcnJheSBvZiB0aGUgcHJvdmlkZWQgYXJndW1lbnRzLCB3aXRoIGFsbCBzdHJpbmdzIGRlY2FtZWxpemVkLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGRlY2FtZWxpemU6IGZ1bmN0aW9uIGRlY2FtZWxpemUgKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgcyA9PT0gJ2Z1bmN0aW9uJykgcyA9IGZpeEZpcmVmb3hGdW5jdGlvblN0cmluZyhzLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMgPSBzLnRvU3RyaW5nKCkucmVwbGFjZSgvKFtBLVokXSkvZywgZnVuY3Rpb24gKCQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICcgJyArICh0eXBlb2YgJCA9PT0gJ3N0cmluZycgPyAkLnRvTG93ZXJDYXNlKCkgOiAnJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkucmVwbGFjZSgvZnVuY3Rpb24gXFwoXFwpL2csICdmdW5jdGlvbigpJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXQucHVzaCh0eXBlb2YgcyA9PT0gJ3N0cmluZycgPyBzLnRyaW0oKSA6IHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldC5sZW5ndGggPT09IDEgPyByZXRbMF0gOiByZXQ7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJldHVybnMgYWxsIHRoZSBjaGFyYWN0ZXJzIGZvdW5kIGluIG9uZSBzdHJpbmcgYnV0IG5vdCB0aGUgb3RoZXIuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvdGhlciBUaGUgc3RyaW5nIHRvIGNvbXB1dGUgdGhlIGRpZmZlcmVuY2UgYWdhaW5zdC5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IEEgZGlmZmVyZW5jZSBzdHJpbmcuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgZGlmZmVyZW5jZUZyb21TdHJpbmc6IGZ1bmN0aW9uIGRpZmZlcmVuY2VGcm9tU3RyaW5nIChzLCBvdGhlcikge1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2Ygb3RoZXIgIT09ICdzdHJpbmcnIHx8IHR5cGVvZiBzICE9PSAnc3RyaW5nJykgcmV0dXJuIHM7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzYXJyID0gcy5zcGxpdCgnJyksIG9hcnIgPSBvdGhlci5zcGxpdCgnJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmFycmF5LmRpZmZlcmVuY2Uoc2Fyciwgb2Fycikuam9pbignJyk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJldHVybnMgb25seSB0aGUgY2hhcmFjdGVycyBjb21tb24gdG8gYm90aCBzdHJpbmdzXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvdGhlciBUaGUgc3RyaW5nIHRvIGNvbXB1dGUgdGhlIGludGVyc2VjdGlvbiBhZ2FpbnN0LlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIGludGVyc2VjdGlvbiBiZXR3ZWVuIHRoZSB0d28gc3RyaW5ncy5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBpbnRlcnNlY3RTdHJpbmc6IGZ1bmN0aW9uIGludGVyc2VjdFN0cmluZyAocywgb3RoZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG90aGVyICE9PSAnc3RyaW5nJyB8fCB0eXBlb2YgcyAhPT0gJ3N0cmluZycpIHJldHVybiBzO1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2FyciA9IHMuc3BsaXQoJycpLCBvYXJyID0gb3RoZXIuc3BsaXQoJycpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS5pbnRlcnNlY3Qoc2Fyciwgb2Fycikuam9pbignJyk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJlcGVhdCBhIHN0cmluZyAndGltZXMnIHRpbWVzLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gdGltZXMgVGhlIG51bWJlciBvZiB0aW1lcyB0byByZXBlYXQgdGhlIHN0cmluZ1xuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIHJlcGVhdGVkIHN0cmluZy5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICByZXBlYXQ6IGZ1bmN0aW9uIHJlcGVhdCAocywgdGltZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgdGltZXMgPSBwYXJzZUludCh0aW1lcywgMTApO1xuICAgICAgICAgICAgICAgICAgICB0aW1lcyA9IGlzTmFOKHRpbWVzKSB8fCAhaXNGaW5pdGUodGltZXMpIHx8IHRpbWVzIDw9IDAgPyAxIDogdGltZXM7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIG9zID0gcztcbiAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBpID0gMTsgaSA8IHRpbWVzOyBpKyspIHMgKz0gb3M7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSaWdodCB0cmltcyBhIHN0cmluZy4gU2FtZSBhcyBTdHJpbmcudHJpbSwgYnV0IG9ubHkgZm9yIHRoZSBlbmQgb2YgYSBzdHJpbmcuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBbd2hhdD0nXFxcXHMrJ10gV2hhdCB0byB0cmltLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIHJpZ2h0IHRyaW1tZWQgc3RyaW5nXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgcnRyaW06IGZ1bmN0aW9uIHJ0cmltIChzLCB3aGF0KSB7XG4gICAgICAgICAgICAgICAgICAgIHdoYXQgPSB0eXBlb2Ygd2hhdCA9PT0gJ3N0cmluZycgPyB3aGF0IDogJ1xcXFxzKyc7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzLnJlcGxhY2UobmV3IFJlZ0V4cCh3aGF0ICsgJyQnKSwgJycpO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBMZWZ0IHRyaW1zIGEgc3RyaW5nLiBTYW1lIGFzIFN0cmluZy50cmltLCBidXQgb25seSBmb3IgdGhlIGJlZ2lubmluZyBvZiBhIHN0cmluZy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IFt3aGF0PSdcXFxccysnXSBXaGF0IHRvIHRyaW0uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgbGVmdCB0cmltbWVkIHN0cmluZ1xuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGx0cmltOiBmdW5jdGlvbiBsdHJpbSAocywgd2hhdCkge1xuICAgICAgICAgICAgICAgICAgICB3aGF0ID0gdHlwZW9mIHdoYXQgPT09ICdzdHJpbmcnID8gd2hhdCA6ICdcXFxccysnO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcy5yZXBsYWNlKG5ldyBSZWdFeHAoJ14nICsgd2hhdCksICcnKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogRXNjYXBlcyBIVE1MIHNwZWNpYWwgY2hhcmFjdGVyc1xuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBIVE1MIGVzY2FwZWQgc3RyaW5nXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgaHRtbEVuY29kZTogZnVuY3Rpb24gaHRtbEVuY29kZSAocykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbWFwID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgJyYnICA6ICcmYW1wOycsXG4gICAgICAgICAgICAgICAgICAgICAgICAnPCcgIDogJyZsdDsnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJz4nICA6ICcmZ3Q7JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdcIicgIDogJyZxdW90OycsXG4gICAgICAgICAgICAgICAgICAgICAgICAnXFwnJyA6ICcmIzAzOTsnXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzLnJlcGxhY2UoL1smPD5cIiddL2csIGZ1bmN0aW9uIChtKSB7IHJldHVybiBtYXBbbV07IH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBVbi1lc2NhcGVzIEhUTUwgc3BlY2lhbCBjaGFyYWN0ZXJzXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIEhUTUwgZXNjYXBlZCBzdHJpbmdcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBodG1sRGVjb2RlOiBmdW5jdGlvbiBodG1sRGVjb2RlIChzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBtYXAgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnJmFtcDsnICA6ICcmJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICcmbHQ7JyAgIDogJzwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJyZndDsnICAgOiAnPicsXG4gICAgICAgICAgICAgICAgICAgICAgICAnJnF1b3Q7JyA6ICdcIicsXG4gICAgICAgICAgICAgICAgICAgICAgICAnJiMwMzk7JyA6ICdcXCcnXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzLnJlcGxhY2UoLygmYW1wO3wmbHQ7fCZndDt8JnF1b3Q7fCYjMDM5OykvZywgZnVuY3Rpb24gKG0pIHsgcmV0dXJuIG1hcFttXTsgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIENyZWF0ZXMgYW4gJ2V2YWwnIHNhZmUgc3RyaW5nLCBieSBhZGRpbmcgc2xhc2hlcyB0byBcIiwgJywgXFx0LCBcXG4sIFxcZiwgXFxyLCBhbmQgdGhlIE5VTEwgYnl0ZS5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBBIHN0cmluZyB3aXRoIHNsYXNoZXNcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBhZGRTbGFzaGVzOiBmdW5jdGlvbiBhZGRTbGFzaGVzIChzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzLnJlcGxhY2UoL1tcXFxcXCInXFx0XFxuXFxmXFxyXS9nLCAnXFxcXCQmJykucmVwbGFjZSgvXFx1MDAwMC9nLCAnXFxcXDAnKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUmV0dXJucyBhIHN0cmluZyB3aXRoIHRoZSBmaXJzdCBsZXR0ZXIgY2FwaXRhbGl6ZWQuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIHN0cmluZyB3aXRoIHRoZSBmaXJzdCBsZXR0ZXIgdXBwZXIgY2FzZWQuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgdWNGaXJzdDogZnVuY3Rpb24gdWNGaXJzdCAocykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHMuc2xpY2UoMSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJldHVybnMgYSBzdHJpbmcgd2l0aCB0aGUgZmlyc3QgbGV0dGVyIGxvd2VyY2FzZWQuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIHN0cmluZyB3aXRoIHRoZSBmaXJzdCBsZXR0ZXIgbG93ZXIgY2FzZWQuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgbGNGaXJzdDogZnVuY3Rpb24gbGNGaXJzdCAocykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcy5jaGFyQXQoMCkudG9Mb3dlckNhc2UoKSArIHMuc2xpY2UoMSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJldHVybnMgYSBzdHJpbmcgaW4gVGl0bGUgQ2FzZS5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgdGl0bGUgY2FzZWQgc3RyaW5nLlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHRpdGxlQ2FzZTogZnVuY3Rpb24gdGl0bGVDYXNlIChzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcnIgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChzLnNwbGl0KCcgJyksIGZ1bmN0aW9uICh0KSB7IGFyci5wdXNoKGxpYnMuc3RyaW5nLnVjRmlyc3QodCkpOyB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFyci5qb2luKCcgJyk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFNwbGljZXMgYSBzdHJpbmcsIG11Y2ggbGlrZSBhbiBhcnJheS5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IGluZGV4IFRoZSBpbmRleCB0byBiZWdpbiBzcGxpY2luZyB0aGUgc3RyaW5nIGF0XG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IGNvdW50IFRoZSBudW1iZXIgb2YgY2hhcmFjdGVycyB0byBkZWxldGVcbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gYWRkIFRoZSBzdHJpbmcgdG8gYXBwZW5kIGF0IHRoZSBzcGxpY2VkIHNlY3Rpb25cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBzcGxpY2VkIHN0cmluZy5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBzcGxpY2U6IGZ1bmN0aW9uIHNwbGljZSAocywgaW5kZXgsIGNvdW50LCBhZGQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHMuc2xpY2UoMCwgaW5kZXgpICsgKGFkZCB8fCAnJykgKyBzLnNsaWNlKGluZGV4ICsgY291bnQpO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSZXR1cm4gYSB0cnVuY2F0ZWQgc3RyaW5nIHdpdGggZWxsaXBzZXMuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyPX0gbGVuZ3RoIFRoZSBsZW5ndGggb2YgdGhlIGRlc2lyZWQgc3RyaW5nLiBJZiBvbW1pdGVkLCB0aGUgc3RyaW5ncyBvcmlnaW5hbCBsZW5ndGggd2lsbCBiZSB1c2VkLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nPX0gW3BsYWNlPSdiYWNrJ10gUG9zc2libGUgdmFsdWVzIGFyZSAnZnJvbnQnIGFuZCAnYmFjaycuIFNwZWNpZnlpbmcgJ2Zyb250JyB3aWxsIHRydW5jYXRlIHRoZVxuICAgICAgICAgICAgICAgICAqIHN0cmluZyBhbmQgYWRkIGVsbGlwc2VzIHRvIHRoZSBmcm9udCwgJ2JhY2snIChvciBhbnkgb3RoZXIgdmFsdWUpIHdpbGwgYWRkIHRoZSBlbGxpcHNlcyB0byB0aGUgYmFjay5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZz19IFtlbGxpcHNlcz0nLi4uJ10gVGhlIHN0cmluZyB2YWx1ZSBvZiB0aGUgZWxsaXBzZXMuIFVzZSB0aGlzIHRvIGFkZCBhbnl0aGluZyBvdGhlciB0aGFuICcuLi4nXG4gICAgICAgICAgICAgICAgICogQHJldHVybnMge1N0cmluZ30gQSB0cnVuY2F0ZWQgc3RyaW5nIHdpdGggZWxsaXBzZXMgKGlmIGl0cyBsZW5ndGggaXMgZ3JlYXRlciB0aGFuICdsZW5ndGgnKVxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGVsbGlwc2VzOiBmdW5jdGlvbiBlbGxpcHNlc18gKHMsIGxlbmd0aCwgcGxhY2UsIGVsbGlwc2VzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKGlzTmFOKHBhcnNlSW50KGxlbmd0aCwgMTApKSkgbGVuZ3RoID0gcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIGlmKGxlbmd0aCA8IDAgfHwgIWlzRmluaXRlKGxlbmd0aCkpIGxlbmd0aCA9IDA7XG5cbiAgICAgICAgICAgICAgICAgICAgZWxsaXBzZXMgPSB0eXBlb2YgZWxsaXBzZXMgPT09ICdzdHJpbmcnID8gZWxsaXBzZXMgOiAnLi4uJztcbiAgICAgICAgICAgICAgICAgICAgaWYocy5sZW5ndGggPD0gbGVuZ3RoKSByZXR1cm4gcztcblxuICAgICAgICAgICAgICAgICAgICBpZihsZW5ndGggPD0gZWxsaXBzZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWxsaXBzZXMuc3Vic3RyaW5nKDAsIGxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZighcGxhY2UgfHwgcGxhY2UgIT09ICdmcm9udCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzLnN1YnN0cigwLCBsZW5ndGggLSBlbGxpcHNlcy5sZW5ndGgpICsgZWxsaXBzZXM7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWxsaXBzZXMgKyBzLnN1YnN0cigwLCBsZW5ndGggLSBlbGxpcHNlcy5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFNodWZmbGVzIGEgc3RyaW5nXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzcGxpdHRlciBBIHN0cmluZyB1c2VkIHRvIHNwbGl0IHRoZSBzdHJpbmcsIHRvIHRva2VuaXplIGl0IGJlZm9yZSBzaHVmZmxpbmcuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgbWl4ZWQgdXAgc3RyaW5nLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHNodWZmbGU6IGZ1bmN0aW9uIHNodWZmbGUgKHMsIHNwbGl0dGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhID0gcy5zcGxpdCh0eXBlb2Ygc3BsaXR0ZXIgPT09ICdzdHJpbmcnID8gc3BsaXR0ZXIgOiAnJyksIG4gPSBhLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgcmVwbGFjZVNwbGl0cyA9IG4gLSAxO1xuXG4gICAgICAgICAgICAgICAgICAgIGZvcih2YXIgaSA9IG4gLSAxOyBpID4gMDsgaS0tKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChpICsgMSkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRtcCA9IGFbaV07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGFbaV0gPSBhW2pdO1xuICAgICAgICAgICAgICAgICAgICAgICAgYVtqXSA9IHRtcDtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGZvcih2YXIgayA9IDA7IGsgPCByZXBsYWNlU3BsaXRzOyBrKyspIGEuc3BsaWNlKGxpYnMubnVtYmVyLnJhbmRvbUludEluUmFuZ2UoMCwgYS5sZW5ndGgpLCAwLCBzcGxpdHRlcik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhLmpvaW4oJycpO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSZXZlcnNlcyBhIHN0cmluZy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgcmV2ZXJzZWQgc3RyaW5nLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHJldmVyc2U6IGZ1bmN0aW9uIHJldmVyc2UgKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYocy5sZW5ndGggPCA2NCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHN0ciA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBpID0gcy5sZW5ndGg7IGkgPj0gMDsgaS0tKSBzdHIgKz0gcy5jaGFyQXQoaSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3RyO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHMuc3BsaXQoJycpLnJldmVyc2UoKS5qb2luKCcnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBTdHJpcHMgdGhlIHRyYWlsaW5nIHNsYXNoZXMgZnJvbSBhIHN0cmluZy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogSWYgdXNpbmcgTm9kZS5qcywgaXQgd2lsbCByZXBsYWNlIHRoZSB0cmFpbGluZyBzbGFzaCBiYXNlZCBvbiB0aGUgdmFsdWUgb2Ygb3MucGxhdGZvcm1cbiAgICAgICAgICAgICAgICAgKiAoaS5lLiBpZiB3aW5kb3dzLCAnXFxcXCcgd2lsbCBiZSByZXBsYWNlZCwgJy8nIG90aGVyd2lzZSkuXG4gICAgICAgICAgICAgICAgICogQHJldHVybnMge1N0cmluZ30gVGhlIHN0cmluZyB3aXRob3V0IGEgdHJhaWxpbmcgc2xhc2guXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgd2l0aG91dFRyYWlsaW5nU2xhc2g6IGZ1bmN0aW9uIHdpdGhvdXRUcmFpbGluZ1NsYXNoIChzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKCFJU19CUk9XU0VSICYmIEhBU19PUyAmJiByZXF1aXJlKCdvcycpLnBsYXRmb3JtID09PSAnd2luMzInKSByZXR1cm4gcy5yZXBsYWNlKC9cXFxcKyQvLCAnJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzLnJlcGxhY2UoL1xcLyskLywgJycpO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBBZGQgYSB0cmFpbGluZyBzbGFzaCB0byBhIHN0cmluZywgaWYgaXQgZG9lc24ndCBhbHJlYWR5IGhhdmUgb25lLlxuICAgICAgICAgICAgICAgICAqIElmIHVzaW5nIE5vZGUuanMsIGl0IHdpbGwgcmVwbGFjZSB0aGUgdHJhaWxpbmcgc2xhc2ggYmFzZWQgb24gdGhlIHZhbHVlIG9mIG9zLnBsYXRmb3JtXG4gICAgICAgICAgICAgICAgICogKGkuZS4gaWYgd2luZG93cywgJ1xcXFwnIHdpbGwgYmUgcmVwbGFjZWQsICcvJyBvdGhlcndpc2UpLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgc3RyaW5nIHdpdGhvdXQgYSB0cmFpbGluZyBzbGFzaC5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB3aXRoVHJhaWxpbmdTbGFzaDogZnVuY3Rpb24gd2l0aFRyYWlsaW5nU2xhc2ggKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoIUlTX0JST1dTRVIgJiYgSEFTX09TICYmIHJlcXVpcmUoJ29zJykucGxhdGZvcm0gPT09ICd3aW4zMicpIHJldHVybiBsaWJzLnN0cmluZy53aXRob3V0VHJhaWxpbmdTbGFzaChzKSArICdcXFxcJztcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLndpdGhvdXRUcmFpbGluZ1NsYXNoKHMpICsgJy8nO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBFc2NhcGVzIHJlZ3VsYXIgZXhwcmVzc2lvbiBzcGVjaWFsIGNoYXJhY3RlcnMuIFRoaXMgaXMgdXNlZnVsIGlzIHlvdSB3aXNoIHRvIGNyZWF0ZSBhIG5ldyByZWd1bGFyIGV4cHJlc3Npb25cbiAgICAgICAgICAgICAgICAgKiBmcm9tIGEgc3RvcmVkIHN0cmluZyB2YWx1ZS5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybnMge1N0cmluZ30gVGhlIHJlZ3VsYXIgZXhwcmVzc2lvbiBzYWZlIHN0cmluZ1xuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHJlZ2V4cFNhZmU6IGZ1bmN0aW9uIHJlZ2V4cFNhZmUgKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHMucmVwbGFjZSgvWy1cXC9cXFxcXiQqKz8uKCl8W1xcXXt9XS9nLCAnXFxcXCQmJyk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFBhZHMgYSBzdHJpbmcgd2l0aCAnZGVsaW0nIGNoYXJhY3RlcnMgdG8gdGhlIHNwZWNpZmllZCBsZW5ndGguIElmIHRoZSBsZW5ndGggaXMgbGVzcyB0aGFuIHRoZSBzdHJpbmcgbGVuZ3RoLFxuICAgICAgICAgICAgICAgICAqIHRoZSBzdHJpbmcgd2lsbCBiZSB0cnVuY2F0ZWQuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBsZW5ndGggVGhlIGxlbmd0aCB0byBwYWQgdGhlIHN0cmluZyB0by4gSWYgbGVzcyB0aGF0IHRoZSBsZW5ndGggb2YgdGhlIHN0cmluZywgdGhlIHN0cmluZyB3aWxsXG4gICAgICAgICAgICAgICAgICogYmUgcmV0dXJuZWQuIElmIGxlc3MgdGhhbiB0aGUgbGVuZ3RoIG9mIHRoZSBzdHJpbmcsIHRoZSBzdHJpbmcgd2lsbCBiZSBzbGljZWQuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmc9fSBbZGVsaW09JyAnXSBUaGUgY2hhcmFjdGVyIHRvIHBhZCB0aGUgc3RyaW5nIHdpdGguXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtCb29sZWFuPX0gW3ByZT1mYWxzZV0gSWYgdHJ1ZSwgdGhlIHBhZGRpbmcgd2lsbCBiZSBhZGRlZCB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJpbmcsIG90aGVyd2lzZSB0aGUgcGFkZGluZ1xuICAgICAgICAgICAgICAgICAqIHdpbGwgYmUgYWRkZWQgdG8gdGhlIGVuZC5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgcGFkZGVkIHN0cmluZ1xuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHBhZDogZnVuY3Rpb24gcGFkIChzLCBsZW5ndGgsIGRlbGltLCBwcmUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGksIHRoaXNMZW5ndGggPSBzLmxlbmd0aDtcblxuICAgICAgICAgICAgICAgICAgICBpZighZGVsaW0pIGRlbGltID0gJyAnO1xuICAgICAgICAgICAgICAgICAgICBpZihsZW5ndGggPT09IDApIHJldHVybiAnJzsgZWxzZSBpZihpc05hTihwYXJzZUludChsZW5ndGgsIDEwKSkpIHJldHVybiBzO1xuXG4gICAgICAgICAgICAgICAgICAgIGxlbmd0aCA9IHBhcnNlSW50KGxlbmd0aCwgMTApO1xuICAgICAgICAgICAgICAgICAgICBpZihsZW5ndGggPCB0aGlzTGVuZ3RoKSByZXR1cm4gIXByZSA/IHMuc2xpY2UoMCwgbGVuZ3RoKSA6IHMuc2xpY2UoLWxlbmd0aCk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYocHJlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IoaSA9IDA7IGkgPCBsZW5ndGggLSB0aGlzTGVuZ3RoOyBpKyspIHMgPSBkZWxpbSArIHM7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IoaSA9IDA7IGkgPCBsZW5ndGggLSB0aGlzTGVuZ3RoOyBpKyspIHMgKz0gZGVsaW07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHM7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJlcGxhY2VzIG5ld2xpbmVzIHdpdGggYnIgdGFncy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgc3RyaW5nIHdpdGggbmV3bGluZXMgY29udmVydGVkIHRvIGJyIHRhZ3MuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgbmV3bGluZVRvQnJlYWs6IGZ1bmN0aW9uIG5ld2xpbmVUb0JyZWFrIChzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzLnJlcGxhY2UoLyhcXHJcXG58XFxuKS9nLCAnPGJyPicpO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSZXBsYWNlcyB0YWJzIHdpdGggYSBzcGFuIGVsZW1lbnQgd2l0aCB0aGUgY2xhc3MgJ3RhYidcbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgc3RyaW5nIHdpdGggdGFicyBjb252ZXJ0ZWQgdG8gc3BhbnMgd2l0aCB0aGUgY2xhc3MgJ3RhYidcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB0YWJzVG9TcGFuOiBmdW5jdGlvbiB0YWJzVG9TcGFuIChzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzLnJlcGxhY2UoL1xcdC9nLCAnPHNwYW4gY2xhc3M9XCJ0YWJcIj48L3NwYW4+Jyk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEFkanVzdHMgYSBzdHJpbmcgdG8gZml0IHdpdGhpbiB0aGUgY29uZmluZXMgb2YgJ3dpZHRoJywgd2l0aG91dCBicmVha2luZyB3b3Jkcy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXI9fSBbbGVuZ3RoPTEyMF0gVGhlIGxlbmd0aCB0byB3b3JkIHdyYXAgdGhlIHN0cmluZyB0by5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcj19IFtwYWRsZWZ0PTBdIFRoZSBudW1iZXIgb2YgY29sdW1ucyB0byBwYWQgdGhlIHN0cmluZyBvbiB0aGUgbGVmdFxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyPX0gW3BhZHJpZ2h0PTBdIFRoZSBudW1iZXIgb2YgY29sdW1ucyB0byBwYWQgdGhlIHN0cmluZyBvbiB0aGUgcmlnaHRcbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW49fSBvbWl0Rmlyc3QgSWYgdHJ1ZSwgdGhlIGZpcnN0IGxpbmUgd2lsbCBub3QgYmUgcGFkZGVkIGxlZnRcbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBzdHJpbmcgYWRqdXN0ZWQgYW5kIHBhZGRlZCBmb3IgdGhlIHN0ZG91dC5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB3b3JkV3JhcFRvTGVuZ3RoOiBmdW5jdGlvbiB3b3JkV3JhcFRvTGVuZ3RoIChzLCB3aWR0aCwgcGFkbGVmdCwgcGFkcmlnaHQsIG9taXRGaXJzdCkge1xuICAgICAgICAgICAgICAgICAgICBpZihwYWRyaWdodCA9PT0gdW5kZWZpbmVkICYmIHBhZGxlZnQpIHBhZHJpZ2h0ID0gcGFkbGVmdDtcblxuICAgICAgICAgICAgICAgICAgICBwYWRsZWZ0ICA9ICFpc05hTihwYXJzZUludChwYWRsZWZ0LCAgMTApKSA/IHBhcnNlSW50KHBhZGxlZnQsIDEwKSAgOiAwO1xuICAgICAgICAgICAgICAgICAgICBwYWRyaWdodCA9ICFpc05hTihwYXJzZUludChwYWRyaWdodCwgMTApKSA/IHBhcnNlSW50KHBhZHJpZ2h0LCAxMCkgOiAwO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBwYWRkaW5nTGVmdCA9ICcnO1xuICAgICAgICAgICAgICAgICAgICBmb3IodmFyIG4gPSAwOyBuIDwgcGFkbGVmdDsgIG4rKykgcGFkZGluZ0xlZnQgICs9ICcgJztcblxuICAgICAgICAgICAgICAgICAgICB2YXIgY29scyAgID0gIWlzTmFOKHBhcnNlSW50KHdpZHRoLCAxMCkpID8gbGVuZ3RoIDogMTIwLFxuICAgICAgICAgICAgICAgICAgICAgICAgYXJyICAgID0gcy5zcGxpdCgnICcpLFxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbSAgID0gbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlbiAgICA9ICFvbWl0Rmlyc3QgPyBjb2xzIC0gcGFkcmlnaHQgLSBwYWRsZWZ0IDogY29scyAtIHBhZHJpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgc3RyICAgID0gIW9taXRGaXJzdCA/IHBhZGRpbmdMZWZ0IDogJycsXG4gICAgICAgICAgICAgICAgICAgICAgICBvbGVuICAgPSBjb2xzIC0gcGFkcmlnaHQgLSBwYWRsZWZ0O1xuXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlKChpdGVtID0gYXJyLnNoaWZ0KCkpICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGl0ZW0ubGVuZ3RoIDwgbGVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9IGl0ZW0gKyAnICc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGVuIC09IGl0ZW0ubGVuZ3RoICsgMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYoaXRlbS5sZW5ndGggPiBvbGVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9IGl0ZW0uc3Vic3RyaW5nKDAsIGxlbiAtIDEpICsgJy1cXG4nICsgcGFkZGluZ0xlZnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJyLnVuc2hpZnQoaXRlbS5zdWJzdHJpbmcobGVuLCBpdGVtLmxlbmd0aCAtIDEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZW4gPSBjb2xzIC0gcGFkcmlnaHQgLSBwYWRsZWZ0O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9ICdcXG4nICsgcGFkZGluZ0xlZnQgKyBpdGVtICsgJyAnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxlbiA9IGNvbHMgLSBwYWRyaWdodCAtIDEgLSBwYWRsZWZ0IC0gaXRlbS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN0cjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERhdGUgbGlicmFyeSBmdW5jdGlvbnNcbiAgICAgICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGRhdGU6IHtcbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBNb3ZlcyBhIGRhdGUgZm9yd2FyZCAnZGF5c0luVGhlRnV0dXJlJyBkYXlzLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7RGF0ZX0gVGhlIGRhdGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IGRheXNJblRoZUZ1dHVyZSBUaGUgbnVtYmVyIG9mIGRheXMgaW4gdGhlIGZ1dHVyZSB0byBhZHZhbmNlIHRoZSBkYXRlXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtCb29sZWFuPX0gW2FkanVzdEZvcldlZWtlbmQ9ZmFsc2VdIFdoZXRoZXIgb3Igbm90IHRoZSBkYXRlIHNob3VsZCBmYWxsIG9uIGEgd2Vla2VuZCBkYXlcbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJucyB7RGF0ZX0gVGhlIGRhdGUsIGFkanVzdGVkIHRoZSBudW1iZXIgb2Ygc3BlY2lmaWVkIGRheXMuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgYWR2YW5jZURheXM6IGZ1bmN0aW9uIGFkdmFuY2VEYXlzIChkLCBkYXlzSW5UaGVGdXR1cmUsIGFkanVzdEZvcldlZWtlbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoIShkIGluc3RhbmNlb2YgRGF0ZSkpIHJldHVybiBkO1xuICAgICAgICAgICAgICAgICAgICBkYXlzSW5UaGVGdXR1cmUgPSBkYXlzSW5UaGVGdXR1cmUgJiYgbGlicy5nZW5lcmljLmlzTnVtZXJpYyhkYXlzSW5UaGVGdXR1cmUpID8gZGF5c0luVGhlRnV0dXJlIDogMTtcbiAgICAgICAgICAgICAgICAgICAgZC5zZXRUaW1lKGQuZ2V0VGltZSgpICsgKGRheXNJblRoZUZ1dHVyZSAqIDg2NDAwMDAwKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoYWRqdXN0Rm9yV2Vla2VuZCAmJiAoZC5nZXREYXkoKSA9PT0gMCB8fCBkLmdldERheSgpID09PSA2KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUoZC5nZXREYXkoKSA9PT0gMCB8fCBkLmdldERheSgpID09PSA2KSBkLnNldFRpbWUoZC5nZXRUaW1lKCkgKyA4NjQwMDAwMCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQ7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIE1vdmVzIGEgZGF0ZSBmb3J3YXJkICdtb250aHNJblRoZUZ1dHVyZScgbW9udGhzLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7RGF0ZX0gVGhlIGRhdGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG1vbnRoc0luVGhlRnV0dXJlIFRoZSBudW1iZXIgb2YgbW9udGhzIGluIHRoZSBmdXR1cmUgdG8gYWR2YW5jZSB0aGUgZGF0ZVxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Qm9vbGVhbj19IFthZGp1c3RGb3JXZWVrZW5kPWZhbHNlXSBXaGV0aGVyIG9yIG5vdCB0aGUgZGF0ZSBzaG91bGQgZmFsbCBvbiBhIHdlZWtlbmQgZGF5XG4gICAgICAgICAgICAgICAgICogQHJldHVybnMge0RhdGV9IFRoZSBkYXRlLCBhZGp1c3RlZCB0aGUgbnVtYmVyIG9mIHNwZWNpZmllZCBtb250aHMuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgYWR2YW5jZU1vbnRoczogZnVuY3Rpb24gYWR2YW5jZU1vbnRocyAoZCwgbW9udGhzSW5UaGVGdXR1cmUsIGFkanVzdEZvcldlZWtlbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoIShkIGluc3RhbmNlb2YgRGF0ZSkpIHJldHVybiBkO1xuICAgICAgICAgICAgICAgICAgICBtb250aHNJblRoZUZ1dHVyZSA9IG1vbnRoc0luVGhlRnV0dXJlICYmIGxpYnMuZ2VuZXJpYy5pc051bWVyaWMobW9udGhzSW5UaGVGdXR1cmUpID8gbW9udGhzSW5UaGVGdXR1cmUgOiAxO1xuICAgICAgICAgICAgICAgICAgICBkLnNldFRpbWUoZC5nZXRUaW1lKCkgKyAobW9udGhzSW5UaGVGdXR1cmUgKiAyNjI5NzQ2MDAwKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoYWRqdXN0Rm9yV2Vla2VuZCAmJiAoZC5nZXREYXkoKSA9PT0gMCB8fCBkLmdldERheSgpID09PSA2KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUoZC5nZXREYXkoKSA9PT0gMCB8fCBkLmdldERheSgpID09PSA2KSBkLnNldFRpbWUoZC5nZXRUaW1lKCkgKyA4NjQwMDAwMCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQ7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIE1vdmVzIGEgZGF0ZSBmb3J3YXJkICd5ZWFyc0luVGhlRnV0dXJlJyB5ZWFycy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0RhdGV9IFRoZSBkYXRlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSB5ZWFyc0luVGhlRnV0dXJlIFRoZSBudW1iZXIgb2YgeWVhcnMgaW4gdGhlIGZ1dHVyZSB0byBhZHZhbmNlIHRoZSBkYXRlXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtCb29sZWFuPX0gW2FkanVzdEZvcldlZWtlbmQ9ZmFsc2VdIFdoZXRoZXIgb3Igbm90IHRoZSBkYXRlIHNob3VsZCBmYWxsIG9uIGEgd2Vla2VuZCBkYXlcbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJucyB7RGF0ZX0gVGhlIGRhdGUsIGFkanVzdGVkIHRoZSBudW1iZXIgb2Ygc3BlY2lmaWVkIHllYXJzLlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGFkdmFuY2VZZWFyczogZnVuY3Rpb24gYWR2YW5jZVllYXJzIChkLCB5ZWFyc0luVGhlRnV0dXJlLCBhZGp1c3RGb3JXZWVrZW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKCEoZCBpbnN0YW5jZW9mIERhdGUpKSByZXR1cm4gZDtcbiAgICAgICAgICAgICAgICAgICAgeWVhcnNJblRoZUZ1dHVyZSA9IHllYXJzSW5UaGVGdXR1cmUgJiYgbGlicy5nZW5lcmljLmlzTnVtZXJpYyh5ZWFyc0luVGhlRnV0dXJlKSA/IHllYXJzSW5UaGVGdXR1cmUgOiAxO1xuICAgICAgICAgICAgICAgICAgICBkLnNldFRpbWUoZC5nZXRUaW1lKCkgKyAoeWVhcnNJblRoZUZ1dHVyZSAqIDMxNTM2MDAwMDAwKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoYWRqdXN0Rm9yV2Vla2VuZCAmJiAoZC5nZXREYXkoKSA9PT0gMCB8fCBkLmdldERheSgpID09PSA2KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUoZC5nZXREYXkoKSA9PT0gMCB8fCBkLmdldERheSgpID09PSA2KSBkLnNldFRpbWUoZC5nZXRUaW1lKCkgKyA4NjQwMDAwMCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQ7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJldHVybnMgdGhlIGRhdGUgaW4gdGhlIHl5eXktbW0tZGQgZm9ybWF0LlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7RGF0ZX0gVGhlIGRhdGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IFtkZWxpbT0nLSddIFRoZSBkZWxpbWl0ZXIgdG8gdXNlZCB0aGUgc2VwYXJhdGUgdGhlIGRhdGUgY29tcG9uZW50cyAoZS5nLiAnLScgb3IgJy4nKVxuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBkYXRlIGluIHRoZSB5eXl5LW1tLWRkIGZvcm1hdC5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB5eXl5bW1kZDogZnVuY3Rpb24geXl5eW1tZGQgKGQsIGRlbGltKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKCEoZCBpbnN0YW5jZW9mIERhdGUpKSByZXR1cm4gZDtcbiAgICAgICAgICAgICAgICAgICAgZGVsaW0gPSB0eXBlb2YgZGVsaW0gIT09ICdzdHJpbmcnID8gJy0nIDogZGVsaW0gO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBkZCAgID0gZC5nZXREYXRlKCksXG4gICAgICAgICAgICAgICAgICAgICAgICBtbSAgID0gZC5nZXRNb250aCgpICsgMSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHl5eXkgPSBkLmdldEZ1bGxZZWFyKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoZGQgPCAxMCkgZGQgPSAnMCcgKyBkZDtcbiAgICAgICAgICAgICAgICAgICAgaWYobW0gPCAxMCkgbW0gPSAnMCcgKyBtbTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHl5eXkgKyBkZWxpbSArIG1tICsgZGVsaW0gKyBkZDtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogQ29udmVydHMgYSBkYXRlIHRvIHRoZSBISDpNTTpTUy5NU0VDIHRpbWUgZm9ybWF0XG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtEYXRlfSBUaGUgZGF0ZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW49fSBbb21pdE1TPWZhbHNlXSBXaGV0aGVyIG9yIG5vdCB0byBpbmNsdWRlIHRoZSBNUyBwb3J0aW9uIG9mIHRoZSByZXR1cm5lZCBzdHJpbmdcbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgZm9ybWF0dGVkIG51bWJlciwgbm93IGEgc3RyaW5nLlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGNsb2NrVGltZTogZnVuY3Rpb24gY2xvY2tUaW1lIChkLCBvbWl0TVMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoIShkIGluc3RhbmNlb2YgRGF0ZSkpIHJldHVybiBkO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuY2xvY2tUaW1lKGQuZ2V0VGltZSgpLCAhIW9taXRNUyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBOdW1iZXIgbGlicmFyeSBmdW5jdGlvbnNcbiAgICAgICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG51bWJlcjoge1xuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUmV0dXJucyB0aGUgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIGEgbnVtYmVyLCB3aXRoIHBsYWNlaG9sZGVycyBhZGRlZC5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIHRvIGFkZCB0aGUgcGxhY2Vob2xkZXJzIHRvLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nPX0gW3BsYWNlaG9sZGVyPScsJ10gVHlwaWNhbGx5IHRoZSBjb21tYSAoLCkuIFRoZSBzdHJpbmcgdGhhdCBzZXBlcmF0ZXMgdGhlIHRob3VzYW50aHMgcGxhY2UuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgbnVtYmVyIGZvcm1hdHRlZCB3aXRoIHBsYWNlaG9sZGVycy5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB3aXRoUGxhY2Vob2xkZXJzOiBmdW5jdGlvbiAobiwgcGxhY2Vob2xkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYobiA9PT0gdW5kZWZpbmVkIHx8IG4gPT09IG51bGwgfHwgIWxpYnMub2JqZWN0LmlzTnVtZXJpYyhuKSkgcmV0dXJuIG47XG4gICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyID0gdHlwZW9mIHBsYWNlaG9sZGVyID09PSAnc3RyaW5nJyA/IHBsYWNlaG9sZGVyIDogJy4nO1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdCwgaWR4LCBpbnQsIG5zID0gbi50b1N0cmluZygpLCBuZWcgPSBuIDwgMDtcblxuICAgICAgICAgICAgICAgICAgICBpZHggID0gbnMuaW5kZXhPZignLicpO1xuICAgICAgICAgICAgICAgICAgICBpbnQgID0gcGFyc2VJbnQoTWF0aC5hYnMobiksIDEwKS50b1N0cmluZygpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKGlkeCA+IC0xKSByZXN0ID0gJy4nICsgbnMuc3Vic3RyaW5nKGlkeCArIDEsIG5zLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAobmVnID8gJy0nIDogJycpICsgbGlicy5zdHJpbmcucmV2ZXJzZShsaWJzLnN0cmluZy5yZXZlcnNlKGludCkucmVwbGFjZSgvKFxcZHszfSkoPyEkKS9nLCAnJDEsJykpICsgKHJlc3QgfHwgJycpO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBGb3JtYXRzIGEgbnVtYmVyIGluIG1vbmV5IG5vdGF0aW9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgdG8gZm9ybWF0LlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nPX0gW3N5bWJvbD0nJCddIFRoZSBjdXJyZW5jeSB0eXBlIHN5bWJvbC5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBudW1iZXIgaW4gVVNEIGZvcm1hdC5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBmb3JtYXRNb25leTogZnVuY3Rpb24gKG4sIHN5bWJvbCkge1xuICAgICAgICAgICAgICAgICAgICBpZihuID09PSB1bmRlZmluZWQgfHwgbiA9PT0gbnVsbCB8fCAhbGlicy5vYmplY3QuaXNOdW1lcmljKG4pKSByZXR1cm4gbjtcbiAgICAgICAgICAgICAgICAgICAgbiA9IGxpYnMub2JqZWN0LmdldE51bWVyaWMobikudG9GaXhlZCgyKTtcbiAgICAgICAgICAgICAgICAgICAgc3ltYm9sID0gdHlwZW9mIHN5bWJvbCA9PT0gJ3N0cmluZycgPyBzeW1ib2wgOiAnJCc7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG4ucmVwbGFjZSgvXigtKT8oXFxkKylcXC4oXFxkKykkLywgZnVuY3Rpb24gKCQwLCAkMSwgJDIsICQzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkMSA9ICQyID09PSAnMCcgJiYgJDMgPT09ICcwMCcgPyBudWxsIDogJDE7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKCQxIHx8ICcnKSArIHN5bWJvbCArIGxpYnMubnVtYmVyLndpdGhQbGFjZWhvbGRlcnMoJDIpICsgJy4nICsgJDM7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSZXR1cm5zIGEgcmFuZG9tIGludGVnZXIgaW4gcmFuZ2UgW21pbiwgbWF4XSAoaW5jbHVzaXZlKVxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBtaW4gVGhlIG1pbmltdW0gcG9zc2libGUgdmFsdWUgKGluY2x1c2l2ZSlcbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbWF4IFRoZSBtYXhpbXVtIHBvc3NpYmxlIHZhbHVlIChpbmNsdXNpdmUpXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7TnVtYmVyfSBBIHJhbmRvbSBudW1iZXIgYmV0d2VlbiBtaW4gYW5kIG1heFxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHJhbmRvbUludEluUmFuZ2U6IGZ1bmN0aW9uIChtaW4sIG1heCkge1xuICAgICAgICAgICAgICAgICAgICBtaW4gPSBwYXJzZUludChtaW4sIDEwKTtcbiAgICAgICAgICAgICAgICAgICAgbWF4ID0gcGFyc2VJbnQobWF4LCAxMCk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoaXNOYU4obWluKSAmJiAhaXNGaW5pdGUobWluKSkgbWluID0gMDtcbiAgICAgICAgICAgICAgICAgICAgaWYoaXNOYU4obWF4KSAmJiAhaXNGaW5pdGUobWF4KSkgbWF4ID0gTnVtYmVyLk1BWF9WQUxVRTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4gKyAxKSkgKyBtaW47XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJldHVybnMgYSByYW5kb20gZmxvYXQgaW4gcmFuZ2UgW21pbiwgbWF4XSAoaW5jbHVzaXZlKVxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBtaW4gVGhlIG1pbmltdW0gcG9zc2libGUgdmFsdWUgKGluY2x1c2l2ZSlcbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbWF4IFRoZSBtYXhpbXVtIHBvc3NpYmxlIHZhbHVlIChpbmNsdXNpdmUpXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7TnVtYmVyfSBBIHJhbmRvbSBudW1iZXIgYmV0d2VlbiBtaW4gYW5kIG1heFxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHJhbmRvbU51bWJlckluUmFuZ2U6IGZ1bmN0aW9uIChtaW4sIG1heCkge1xuICAgICAgICAgICAgICAgICAgICBtaW4gPSBwYXJzZUZsb2F0KG1pbik7XG4gICAgICAgICAgICAgICAgICAgIG1heCA9IHBhcnNlRmxvYXQobWF4KTtcblxuICAgICAgICAgICAgICAgICAgICBpZihpc05hTihtaW4pICYmICFpc0Zpbml0ZShtaW4pKSBtaW4gPSAwO1xuICAgICAgICAgICAgICAgICAgICBpZihpc05hTihtYXgpICYmICFpc0Zpbml0ZShtYXgpKSBtYXggPSBOdW1iZXIuTUFYX1ZBTFVFO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pICsgbWluO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSZWN1cnNpdmVseSBjb21wdXRlcyB0aGUgZmFjdG9yaWFsIG9mIHRoZSBudW1iZXIgbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBBIG51bWJlci5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtOdW1iZXJ8SW5maW5pdHl9IG4hXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgZmFjdG9yaWFsOiBmdW5jdGlvbiBmYWN0b3JpYWwgKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG4gIT09ICdudW1iZXInIHx8IG4gPCAwKSByZXR1cm4gTmFOO1xuICAgICAgICAgICAgICAgICAgICBpZihuID4gMTcwKSByZXR1cm4gSW5maW5pdHk7XG4gICAgICAgICAgICAgICAgICAgIGlmKG4gPT09IDAgfHwgbiA9PT0gMSkgcmV0dXJuIDE7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuICogZmFjdG9yaWFsKG4gLSAxKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogRGV0ZXJtaW5lcyBpcyB0aGUgZ2l2ZW4gbnVtYmVycyBhcmUgaW50ZWdlcnNcbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0gey4uLk51bWJlcn0gbiBOdW1iZXJzLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgYWxsIGFyZ3VtZW50cyBhcmUgaW50ZWdlcnMsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBpc0ludDogZnVuY3Rpb24gaXNJbnQgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiBuID09PSAnbnVtYmVyJyAmJiBuICUgMSA9PT0gMCAmJiBuLnRvU3RyaW5nKCkuaW5kZXhPZignLicpID09PSAtMTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJlY3Vyc2l2ZWx5IGNvbXB1dGVzIG4gY2hvb3NlIGsuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gQSBudW1iZXIuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IGsgQSBudW1iZXIuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7TnVtYmVyfEluZmluaXR5fSBuIGNob29zZSBrLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGNob29zZTogZnVuY3Rpb24gY2hvb3NlIChuLCBrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBuICE9PSAnbnVtYmVyJyB8fCB0eXBlb2YgayAhPT0gJ251bWJlcicpIHJldHVybiBOYU47XG4gICAgICAgICAgICAgICAgICAgIGlmKGsgPT09IDApIHJldHVybiAxO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gKG4gKiBjaG9vc2UobiAtIDEsIGsgLSAxKSkgLyBrO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBQYWRzIGEgbnVtYmVyIHdpdGggcHJlY2VlZGluZyB6ZXJvcy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBsZW5ndGggVGhlIGZpbmFsIGxlbmd0aCBvZiB0aGUgc3RyaW5nXG4gICAgICAgICAgICAgICAgICogQHJldHVybnMge1N0cmluZ30gVGhlIHBhZGRlZCBudW1iZXIsIG5vdyBhIHN0cmluZy5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBwYWQ6IGZ1bmN0aW9uIHBhZCAobiwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5wYWQobi50b1N0cmluZygpLCBsZW5ndGgsICcwJywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEFkdmFuY2VzIChvciByZXZlcnNlcykgdGhlIGRhdGUgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgZGF5cy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7RGF0ZX0gZGF0ZSBUaGUgZGF0ZSB0byBjaGFuZ2UuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gVGhlIG1vZGlmaWVkIGRhdGUuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgZGF5c0Zyb206IGZ1bmN0aW9uIGRheXNGcm9tIChuLCBkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBkYXRlID09PSAnbnVtYmVyJykgZGF0ZSA9IG5ldyBEYXRlKGRhdGUpO1xuICAgICAgICAgICAgICAgICAgICBpZighKGRhdGUgaW5zdGFuY2VvZiBEYXRlKSkgIGRhdGUgPSBuZXcgRGF0ZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgIGRhdGUuc2V0RGF0ZShkYXRlLmdldERhdGUoKSArIG4pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogQWR2YW5jZXMgKG9yIHJldmVyc2VzKSB0aGUgY3VycmVudCBkYXRlIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIGRheXMuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBBIGRhdGUgb2JqZWN0XG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgZGF5c0Zyb21Ob3c6IGZ1bmN0aW9uIGRheXNGcm9tTm93IChuKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5kYXlzRnJvbShuLCBuZXcgRGF0ZSgpKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogQWR2YW5jZXMgKG9yIHJldmVyc2VzKSB0aGUgZGF0ZSB0aGUgc3BlY2lmaWVkIG51bWJlciBvZiBkYXlzLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtEYXRlfSBkYXRlIFRoZSBkYXRlIHRvIGNoYW5nZS5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBUaGUgbW9kaWZpZWQgZGF0ZS5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBzZWNvbmRzRnJvbTogZnVuY3Rpb24gc2Vjb25kc0Zyb20gKG4sIGRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIGRhdGUgPT09ICdudW1iZXInKSBkYXRlID0gbmV3IERhdGUoZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmKCEoZGF0ZSBpbnN0YW5jZW9mIERhdGUpKSAgZGF0ZSA9IG5ldyBEYXRlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgZGF0ZS5zZXRTZWNvbmRzKGRhdGUuZ2V0U2Vjb25kcygpICsgbik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkYXRlO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBBZHZhbmNlcyAob3IgcmV2ZXJzZXMpIHRoZSBjdXJyZW50IGRhdGUgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgZGF5cy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IEEgZGF0ZSBvYmplY3RcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBzZWNvbmRzRnJvbU5vdzogZnVuY3Rpb24gc2Vjb25kc0Zyb21Ob3cgKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLnNlY29uZHNGcm9tKG4sIG5ldyBEYXRlKCkpO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBBZHZhbmNlcyAob3IgcmV2ZXJzZXMpIHRoZSBkYXRlIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIHllYXJzLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtEYXRlfSBkYXRlIFRoZSBkYXRlIHRvIGNoYW5nZS5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBUaGUgbW9kaWZpZWQgZGF0ZS5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB5ZWFyc0Zyb206IGZ1bmN0aW9uIHllYXJzRnJvbSAobiwgZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgZGF0ZSA9PT0gJ251bWJlcicpIGRhdGUgPSBuZXcgRGF0ZShkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYoIShkYXRlIGluc3RhbmNlb2YgRGF0ZSkpICBkYXRlID0gbmV3IERhdGUoKTtcblxuICAgICAgICAgICAgICAgICAgICBkYXRlLnNldEZ1bGxZZWFyKGRhdGUuZ2V0RnVsbFllYXIoKSArIG4pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogQWR2YW5jZXMgKG9yIHJldmVyc2VzKSB0aGUgY3VycmVudCBkYXRlIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIHllYXJzLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IEEgZGF0ZSBvYmplY3RcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB5ZWFyc0Zyb21Ob3c6IGZ1bmN0aW9uIHllYXJzRnJvbU5vdyAobikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIueWVhcnNGcm9tKG4sIG5ldyBEYXRlKCkpO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBBZHZhbmNlcyAob3IgcmV2ZXJzZXMpIHRoZSBkYXRlIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIG1vbnRocy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7RGF0ZX0gZGF0ZSBUaGUgZGF0ZSB0byBjaGFuZ2UuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gVGhlIG1vZGlmaWVkIGRhdGUuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgbW9udGhzRnJvbTogZnVuY3Rpb24gbW9udGhzRnJvbSAobiwgZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgZGF0ZSA9PT0gJ251bWJlcicpIGRhdGUgPSBuZXcgRGF0ZShkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYoIShkYXRlIGluc3RhbmNlb2YgRGF0ZSkpICBkYXRlID0gbmV3IERhdGUoKTtcblxuICAgICAgICAgICAgICAgICAgICBkYXRlLnNldE1vbnRoKGRhdGUuZ2V0TW9udGgoKSArIG4pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogQWR2YW5jZXMgKG9yIHJldmVyc2VzKSB0aGUgY3VycmVudCBkYXRlIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIG1vbnRocy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IEEgZGF0ZSBvYmplY3RcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBtb250aHNGcm9tTm93OiBmdW5jdGlvbiBtb250aHNGcm9tTm93IChuKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5tb250aHNGcm9tKG4sIG5ldyBEYXRlKCkpO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBBZHZhbmNlcyAob3IgcmV2ZXJzZXMpIHRoZSBkYXRlIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIGhvdXJzLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtEYXRlfSBkYXRlIFRoZSBkYXRlIHRvIGNoYW5nZS5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBUaGUgbW9kaWZpZWQgZGF0ZS5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBob3Vyc0Zyb206IGZ1bmN0aW9uIGhvdXJzRnJvbSAobiwgZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgZGF0ZSA9PT0gJ251bWJlcicpIGRhdGUgPSBuZXcgRGF0ZShkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYoIShkYXRlIGluc3RhbmNlb2YgRGF0ZSkpICBkYXRlID0gbmV3IERhdGUoKTtcblxuICAgICAgICAgICAgICAgICAgICBkYXRlLnNldEhvdXJzKGRhdGUuZ2V0SG91cnMoKSArIG4pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogQWR2YW5jZXMgKG9yIHJldmVyc2VzKSB0aGUgY3VycmVudCBkYXRlIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIGhvdXJzLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gQSBkYXRlIG9iamVjdFxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGhvdXJzRnJvbU5vdzogZnVuY3Rpb24gaG91cnNGcm9tTm93IChuKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5ob3Vyc0Zyb20obiwgbmV3IERhdGUoKSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEFkdmFuY2VzIChvciByZXZlcnNlcykgdGhlIGRhdGUgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgbWludXRlcy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7RGF0ZX0gZGF0ZSBUaGUgZGF0ZSB0byBjaGFuZ2UuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gQSBtb2RpZmllZCBkYXRlLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIG1pbnV0ZXNGcm9tOiBmdW5jdGlvbiBtaW51dGVzRnJvbSAobiwgZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgZGF0ZSA9PT0gJ251bWJlcicpIGRhdGUgPSBuZXcgRGF0ZShkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYoIShkYXRlIGluc3RhbmNlb2YgRGF0ZSkpICBkYXRlID0gbmV3IERhdGUoKTtcblxuICAgICAgICAgICAgICAgICAgICBkYXRlLnNldE1pbnV0ZXMoZGF0ZS5nZXRNaW51dGVzKCkgKyBuKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEFkdmFuY2VzIChvciByZXZlcnNlcykgdGhlIGN1cnJlbnQgZGF0ZSB0aGUgc3BlY2lmaWVkIG51bWJlciBvZiBtaW51dGVzLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gVGhlIGRhdGUgb2JqZWN0XG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgbWludXRlc0Zyb21Ob3c6IGZ1bmN0aW9uIG1pbnV0ZXNGcm9tTm93IChuKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5taW51dGVzRnJvbShuLCBuZXcgRGF0ZSgpKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogVGhlIHRpbWUsIG1vbnRocyBpbiB0aGUgcGFzdC5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IEEgRGF0ZSBvYmplY3QuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgbW9udGhzQWdvOiBmdW5jdGlvbiBtb250aHNBZ28gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLm1pbnV0ZXNGcm9tTm93KC1uLCBuZXcgRGF0ZSgpKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogVGhlIHRpbWUsIGRheXMgaW4gdGhlIHBhc3QuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBBIERhdGUgb2JqZWN0LlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGRheXNBZ286IGZ1bmN0aW9uIGRheXNBZ28gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLmRheXNGcm9tTm93KC1uLCBuZXcgRGF0ZSgpKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogVGhlIHRpbWUsIHNlY29uZHMgaW4gdGhlIHBhc3QuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBBIERhdGUgb2JqZWN0LlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHNlY29uZHNBZ286IGZ1bmN0aW9uIHNlY29uZHNBZ28gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLnNlY29uZHNGcm9tTm93KC1uLCBuZXcgRGF0ZSgpKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogVGhlIHRpbWUsIG1pbnV0ZXMgaW4gdGhlIHBhc3QuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBBIERhdGUgb2JqZWN0LlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIG1pbnV0ZXNBZ286IGZ1bmN0aW9uIG1pbnV0ZXNBZ28gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLm1pbnV0ZXNGcm9tTm93KC1uLCBuZXcgRGF0ZSgpKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogVGhlIHRpbWUsIHllYXJzIGluIHRoZSBwYXN0LlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gQSBEYXRlIG9iamVjdC5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB5ZWFyc0FnbzogZnVuY3Rpb24geWVhcnNBZ28gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLnllYXJzRnJvbU5vdygtbiwgbmV3IERhdGUoKSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIENvbnZlcnRzIGEgbnVtYmVyIHRvIHRoZSBISDpNTTpTUy5NU0VDIHRpbWUgZm9ybWF0XG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IHQgVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAbWVtYmVyb2YgTnVtYmVyLnByb3RvdHlwZVxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Qm9vbGVhbj19IFtvbWl0TVM9ZmFsc2VdIFdoZXRoZXIgb3Igbm90IHRvIGluY2x1ZGUgdGhlIE1TIHBvcnRpb24gb2YgdGhlIHJldHVybmVkIHN0cmluZ1xuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBmb3JtYXR0ZWQgbnVtYmVyLCBub3cgYSBzdHJpbmcuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgY2xvY2tUaW1lOiBmdW5jdGlvbiBjbG9ja1RpbWUgKHQsIG9taXRNUykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbXMsIHNlY3MsIG1pbnMsIGhycztcblxuICAgICAgICAgICAgICAgICAgICBtcyA9IHQgJSAxMDAwO1xuICAgICAgICAgICAgICAgICAgICB0ID0gKHQgLSBtcykgLyAxMDAwO1xuXG4gICAgICAgICAgICAgICAgICAgIHNlY3MgPSB0ICUgNjA7XG4gICAgICAgICAgICAgICAgICAgIHQgPSAodCAtIHNlY3MpIC8gNjA7XG5cbiAgICAgICAgICAgICAgICAgICAgbWlucyA9IHQgJSA2MDtcbiAgICAgICAgICAgICAgICAgICAgaHJzID0gKHQgLSBtaW5zKSAvIDYwO1xuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5wYWQoaHJzLnRvU3RyaW5nKCksIDIpICArICc6JyArIGxpYnMubnVtYmVyLnBhZChtaW5zLnRvU3RyaW5nKCksIDIpICsgJzonICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpYnMubnVtYmVyLnBhZChzZWNzLnRvU3RyaW5nKCksIDIpICsgKChvbWl0TVMgPT09IHRydWUpID8gJycgOiAnLicgKyBsaWJzLm51bWJlci5wYWQobXMudG9TdHJpbmcoKSwgMykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRnVuY3Rpb24gbGlicmFyeSBmdW5jdGlvbnNcbiAgICAgICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGZ1bmN0aW9uOiB7XG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBJbmhlcml0IHRoZSBwcm90b3R5cGUgbWV0aG9kcyBmcm9tIG9uZSBjb25zdHJ1Y3RvciBpbnRvIGFub3RoZXIuXG4gICAgICAgICAgICAgICAgICogTW9zdGx5IGJvcnJvd2VkIGRpcmVjdGx5IGZyb20gTm9kZS5qc1xuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNvbnN0cnVjdG9yIFRoZSBpbmhlcml0aW5nIGNvbnN0cnVjdG9yXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gc3VwZXJDb25zdHJ1Y3RvciBUaGUgcGFyZW50IGNvbnN0cnVjdG9yXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7RnVuY3Rpb259IFRoZSBpbmhlcml0aW5nIGNvbnN0cnVjdG9yXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgaW5oZXJpdHM6IGZ1bmN0aW9uIGluaGVyaXRzIChjb25zdHJ1Y3Rvciwgc3VwZXJDb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY29uc3RydWN0b3IgPT09IHVuZGVmaW5lZCB8fCBjb25zdHJ1Y3RvciA9PT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBjb25zdHJ1Y3RvciB0byBcImluaGVyaXRzXCIgbXVzdCBub3QgYmUgJyArICdudWxsIG9yIHVuZGVmaW5lZCcpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChzdXBlckNvbnN0cnVjdG9yID09PSB1bmRlZmluZWQgfHwgc3VwZXJDb25zdHJ1Y3RvciA9PT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBzdXBlciBjb25zdHJ1Y3RvciB0byBcImluaGVyaXRzXCIgbXVzdCBub3QgJyArICdiZSBudWxsIG9yIHVuZGVmaW5lZCcpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChzdXBlckNvbnN0cnVjdG9yLnByb3RvdHlwZSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIHN1cGVyIGNvbnN0cnVjdG9yIHRvIFwiaW5oZXJpdHNcIiBtdXN0ICcgKyAnaGF2ZSBhIHByb3RvdHlwZScpO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0cnVjdG9yLnN1cGVyXyA9IHN1cGVyQ29uc3RydWN0b3I7XG4gICAgICAgICAgICAgICAgICAgIE9iamVjdC5zZXRQcm90b3R5cGVPZihjb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHN1cGVyQ29uc3RydWN0b3IucHJvdG90eXBlKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBLaWxsIGFsIHRoZSBQcm90b0xpYiBjYWNoZSwgZm9yIGFsbCBpbnN0YW5jZXMuLi5cbiAgICAgICAgICAgICAgICAgICAgUHJvdG9MaWIua2lsbENhY2hlRm9yQ29uc3RydWN0b3IoY29uc3RydWN0b3IpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29uc3RydWN0b3I7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQXJyYXkgbGlicmFyeSBmdW5jdGlvbnNcbiAgICAgICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGFycmF5OiB7XG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBTaHVmZmxlcyBhbiBhcnJheVxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGEgVGhlIEFycmF5IG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0FycmF5PCo+fSBUaGUgbWl4ZWQgdXAgYXJyYXlcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBzaHVmZmxlOiBmdW5jdGlvbiBzaHVmZmxlIChhKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcih2YXIgaSA9IGEubGVuZ3RoIC0gMTsgaSA+IDA7IGktLSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGogPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoaSArIDEpKSwgdG1wID0gYVtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFbaV0gPSBhW2pdO1xuICAgICAgICAgICAgICAgICAgICAgICAgYVtqXSA9IHRtcDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogQ29tcHV0ZXMgdGhlIHVuaW9uIGJldHdlZW4gdGhlIGN1cnJlbnQgYXJyYXksIGFuZCBhbGwgdGhlIGFycmF5IG9iamVjdHMgcGFzc2VkIGluLiBUaGF0IGlzLFxuICAgICAgICAgICAgICAgICAqIHRoZSBzZXQgb2YgdW5pcXVlIG9iamVjdHMgcHJlc2VudCBpbiBhbGwgb2YgdGhlIGFycmF5cy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBhIFRoZSBBcnJheSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0gey4uLkFycmF5fSBhcnIgQSBsaXN0IG9mIGFycmF5IG9iamVjdHNcbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtBcnJheTwqPn0gVGhlIHVuaW9uIHNldCBvZiB0aGUgcHJvdmlkZWQgYXJyYXlzLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHVuaW9uOiBmdW5jdGlvbiB1bmlvbiAoYSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IGxpYnMub2JqZWN0Lm9ubHkobGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpLCAnYXJyYXknKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgdW5pb24gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgYXJncy51bnNoaWZ0KGEpO1xuICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKGFyZ3MsIGZ1bmN0aW9uIChhcnJheSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChhcnJheSwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZih1bmlvbi5pbmRleE9mKGl0ZW0pID09PSAtMSkgdW5pb24ucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVuaW9uO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSZXR1cm5zIGFsbCB0aGUgaXRlbXMgdW5pcXVlIHRvIGEgc2luZ2xlIGFycmF5ICh0aGUgc2V0IGRpZmZlcmVuY2UpLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uQXJyYXl9IGFycmF5cyBUaGUgQXJyYXkgb2JqZWN0cyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IG90aGVyIFRoZSBhcnJheSB0byBjb21wdXRlIHRoZSBkaWZmZXJlbmNlIGZyb20uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7QXJyYXl9IEEgbmV3IGFycmF5IHdpdGggaXRlbXMgdW5pcXVlIHRvIGVhY2ggYXJyYXkuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgZGlmZmVyZW5jZTogZnVuY3Rpb24gZGlmZmVyZW5jZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcnJheXMgICA9IGxpYnMub2JqZWN0Lm9ubHkobGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpLCAnYXJyYXknKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpZmYgICAgID0gW10sXG4gICAgICAgICAgICAgICAgICAgICAgICBhbGxJdGVtcyA9IFtdLFxuICAgICAgICAgICAgICAgICAgICAgICAgaTtcblxuICAgICAgICAgICAgICAgICAgICBmb3IoaSA9IDA7IGkgPCBhcnJheXMubGVuZ3RoOyBpKyspIGFsbEl0ZW1zID0gYWxsSXRlbXMuY29uY2F0KGFycmF5c1tpXSk7XG5cbiAgICAgICAgICAgICAgICAgICAgZm9yKGkgPSAwOyBpIDwgYWxsSXRlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpbkFycmF5ID0gLTEsIHVuaXF1ZSA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IodmFyIG4gPSAwOyBuIDwgYXJyYXlzLmxlbmd0aDsgbisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoaW5BcnJheSA9PT0gLTEgJiYgYXJyYXlzW25dLmluZGV4T2YoYWxsSXRlbXNbaV0pID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5BcnJheSA9IG47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuaXF1ZSAgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmKGluQXJyYXkgIT09IC0xICYmIGFycmF5c1tuXS5pbmRleE9mKGFsbEl0ZW1zW2ldKSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluQXJyYXkgPSBuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmlxdWUgID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoaW5BcnJheSAhPT0gLTEgJiYgdW5pcXVlKSBkaWZmLnB1c2goYWxsSXRlbXNbaV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRpZmY7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJldHVybnMgdGhlIGl0ZW1zIGNvbW1vbiB0byBhbGwgYXJyYXlzLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uQXJyYXl9IGl0ZW1zIFRoZSBhcnJheXMgZnJvbSB3aGljaCB0byBjb21wdXRlIHRoZSBpbnRlcnNlY3Rpb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7QXJyYXl9IEEgbmV3IGFycmF5IHdpdGggaXRlbXMgY29tbW9uIHRvIGJvdGggYXJyYXlzLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGludGVyc2VjdDogZnVuY3Rpb24gaW50ZXJzZWN0ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFycmF5cyA9IGxpYnMub2JqZWN0Lm9ubHkobGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpLCAnYXJyYXknKTtcblxuICAgICAgICAgICAgICAgICAgICBpZihhcnJheXMubGVuZ3RoID09PSAwKSByZXR1cm4gW107XG4gICAgICAgICAgICAgICAgICAgIGlmKGFycmF5cy5sZW5ndGggPT09IDEpIHJldHVybiBsaWJzLm9iamVjdC5jb3B5KGFycmF5c1swXSk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGludGVyc2VjdGlvbiA9IGFycmF5c1swXSwgaW50ZXJtZWRpYXRlID0gW107XG4gICAgICAgICAgICAgICAgICAgIGZvcih2YXIgaSA9IDE7IGkgPCBhcnJheXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhcnIgPSBsaWJzLm9iamVjdC5jb3B5KGFycmF5c1tpXSk7IC8vIERvbid0IHdhbnQgdG8gbW9kaWZ5IHRoZSBvcmlnaW5hbCBhcnJheSFcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcih2YXIgbiA9IDA7IG4gPCBpbnRlcnNlY3Rpb24ubGVuZ3RoOyBuKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihhcnIuaW5kZXhPZihpbnRlcnNlY3Rpb25bbl0pID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW50ZXJtZWRpYXRlLnB1c2goaW50ZXJzZWN0aW9uW25dKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlkeCA9IGFyci5pbmRleE9mKGludGVyc2VjdGlvbltuXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFyci5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnRlcnNlY3Rpb24gPSBpbnRlcm1lZGlhdGU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnRlcm1lZGlhdGUgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpbnRlcnNlY3Rpb247XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIENyZWF0ZXMgYSBuZXcgYXJyYXkgZnJvbSB0aGUgY3VycmVudCBvbmUsIHdpdGggYWxsIG9jY3VyZW5jZXMgb2YgdGhlIHByb3ZpZGVkIGFyZ3VtZW50cyBvbW1pdGVkLjxicj5cbiAgICAgICAgICAgICAgICAgKiBGb3IgZXhhbXBsZTogPGVtPlsxLDIsMyw0LDVdLndpdGhvdXQoMSk8L2VtPiB3aWxsIHJldHVybiA8ZW0+WzIsMyw0LDVdPC9lbT5cbiAgICAgICAgICAgICAgICAgKiBhbmQgPGVtPlsxLCBudWxsLCAyLCBudWxsLCB1bmRlZmluZWRdLndpdGhvdXQobnVsbCwgdW5kZWZpbmVkKTwvZW0+IHdpbGwgcmV0dXJuIDxlbT5bMSwgMl08L2VtPlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGEgVGhlIEFycmF5IG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHtBcnJheTwqPn0gQSBzaGFsbG93IGNvcHkgb2YgdGhlIGFycmF5IHdpdGggdGhlIHByb3ZpZGVkIGFyZ3VtZW50cyBvbW1pdGVkLlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHdpdGhvdXQ6IGZ1bmN0aW9uIHdpdGhvdXQgKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IGxpYnMub2JqZWN0LnRvQXJyYXkoYXJndW1lbnRzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGEgICAgPSBhcmdzLnNoaWZ0KCksXG4gICAgICAgICAgICAgICAgICAgICAgICByZXMgID0gW107XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoIShhIGluc3RhbmNlb2YgQXJyYXkpKSByZXR1cm4gYTtcbiAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChhLCBmdW5jdGlvbiAodikgeyBpZihhcmdzLmluZGV4T2YodikgPT09IC0xKSByZXMucHVzaCh2KTsgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJvdGF0ZXMgdGhlIGFycmF5IGxlZnQgb3IgcmlnaHQgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgdGltZXMuIElmIHRoZSBkaXJlY3Rpb24gaXMgbGVmdCwgaXQgd2lsbCBzaGlmdCBvZmYgdGhlXG4gICAgICAgICAgICAgICAgICogZmlyc3QgPGVtPm48L2VtPiBlbGVtZW50cyBhbmQgcHVzaCB0aGVtIHRvIHRoZSBlbmQgb2YgdGhlIGFycmF5LiBJZiByaWdodCwgaXQgd2lsbCBwb3Agb2ZmIHRoZSBsYXN0IDxlbT5uPC9lbT5cbiAgICAgICAgICAgICAgICAgKiBpdGVtcyBhbmQgdW5zaGlmdCB0aGVtIG9udG8gdGhlIGZyb250IG9mIHRoZSBhcnJheS5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBhIFRoZSBBcnJheSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZz19IFtkaXJlY3Rpb249J2xlZnQnXSBUaGUgZGlyZWN0aW9uIHRvIHJvdGF0ZSBhcnJheSBtZW1iZXJzLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyPX0gW2Ftb3VudD0xXSBUaGUgbnVtYmVyIG9mIGVsZW1lbnRzIHRvIHNoaWZ0XG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7QXJyYXk8Kj59IFRoZSBjdXJyZW50IGFycmF5LCBzaGlmdGVkLlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHJvdGF0ZTogZnVuY3Rpb24gcm90YXRlIChhLCBkaXJlY3Rpb24sIGFtb3VudCkge1xuICAgICAgICAgICAgICAgICAgICBpZighKGEgaW5zdGFuY2VvZiBBcnJheSkpIHJldHVybiBhO1xuICAgICAgICAgICAgICAgICAgICBpZihkaXJlY3Rpb24gJiYgbGlicy5vYmplY3QuaXNOdW1lcmljKGRpcmVjdGlvbikgJiYgIWFtb3VudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYW1vdW50ICAgID0gZGlyZWN0aW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoIWFtb3VudCB8fCAoYW1vdW50ICYmICFsaWJzLm9iamVjdC5pc051bWVyaWMoYW1vdW50KSkpIGFtb3VudCA9IDE7XG4gICAgICAgICAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBhbW91bnQ7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoZGlyZWN0aW9uICE9PSAncmlnaHQnKSBhLnB1c2goYS5zaGlmdCgpKTsgZWxzZSBhLnVuc2hpZnQoYS5wb3AoKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGE7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJvdGF0ZXMgdGhlIGFycmF5IGxlZnQgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgdGltZXMuXG4gICAgICAgICAgICAgICAgICogVGhpcyBpcyB1c2VmdWwgaWYgdHJ5aW5nIHRvIGNyZWF0ZSBhIGNpcmN1bGFyIHF1ZXVlLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGEgVGhlIEFycmF5IG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyPX0gW2Ftb3VudD0xXSBUaGUgbnVtYmVyIG9mIHRpbWVzIHRvIHJvdGF0ZSB0aGUgYXJyYXkgbGVmdC5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtBcnJheTwqPn0gVGhlIGN1cnJlbnQgYXJyYXksIHJvdGF0ZWQgbGVmdC5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICByb3RhdGVMZWZ0OiBmdW5jdGlvbiByb3RhdGVMZWZ0IChhLCBhbW91bnQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoIShhIGluc3RhbmNlb2YgQXJyYXkpKSByZXR1cm4gYTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkucm90YXRlKGEsICdsZWZ0JywgYW1vdW50KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUm90YXRlcyB0aGUgYXJyYXkgcmlnaHQgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgdGltZXMuXG4gICAgICAgICAgICAgICAgICogVGhpcyBpcyB1c2VmdWwgaWYgdHJ5aW5nIHRvIGNyZWF0ZSBhIGNpcmN1bGFyIHF1ZXVlLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGEgVGhlIEFycmF5IG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyPX0gW2Ftb3VudD0xXSBUaGUgbnVtYmVyIG9mIHRpbWVzIHRvIHJvdGF0ZSB0aGUgYXJyYXkgbGVmdC5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtBcnJheTwqPn0gVGhlIGN1cnJlbnQgYXJyYXksIHJvdGF0ZWQgcmlnaHQuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgcm90YXRlUmlnaHQ6IGZ1bmN0aW9uIHJvdGF0ZUxlZnQgKGEsIGFtb3VudCkge1xuICAgICAgICAgICAgICAgICAgICBpZighKGEgaW5zdGFuY2VvZiBBcnJheSkpIHJldHVybiBhO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS5yb3RhdGUoYSwgJ3JpZ2h0JywgYW1vdW50KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUmVtb3ZlcyBkdXBsaWNhdGVzIGZyb20gdGhlIGN1cnJlbnQgYXJyYXkuXG4gICAgICAgICAgICAgICAgICogVGhpcyBpcyBhIGRlc3RydWN0aXZlIGFjdGlvbiwgYW5kIHdpbGwgbW9kaWZ5IHRoZSBhcnJheSBpbiBwbGFjZS5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBhIFRoZSBBcnJheSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJucyB7QXJyYXk8Kj59IFRoZSBjdXJyZW50IGFycmF5LCB3aXRoIGR1cGxpY2F0ZXMgcmVtb3ZlZC5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBtYWtlVW5pcXVlOiBmdW5jdGlvbiBtYWtlVW5pcXVlIChhKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKCEoYSBpbnN0YW5jZW9mIEFycmF5KSkgcmV0dXJuIGE7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHZpc2l0ZWQgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHZpc2l0ZWQuaW5kZXhPZihhW2ldKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aXNpdGVkLnB1c2goYVtpXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpLS07IC8vIFNwbGljZSB3aWxsIGFmZmVjdCB0aGUgaW50ZXJuYWwgYXJyYXkgcG9pbnRlciwgc28gZml4IGl0Li4uXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGE7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEdldHMgYW4gYXJyYXkgb2YgdW5pcXVlIGl0ZW1zIGZyb20gdGhlIGN1cnJlbnQgYXJyYXkuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gYSBUaGUgQXJyYXkgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybnMge0FycmF5fSBBIG5ldyBhcnJheSB3aXRoIG5vIGR1cGxpY2F0ZSB2YWx1ZXMuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgdW5pcXVlOiBmdW5jdGlvbiB1bmlxdWUgKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoIShhIGluc3RhbmNlb2YgQXJyYXkpKSByZXR1cm4gYTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgdmlzaXRlZCA9IFtdLFxuICAgICAgICAgICAgICAgICAgICAgICAgdW5pcXVlICA9IFtdO1xuXG4gICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2goYSwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHZpc2l0ZWQuaW5kZXhPZihpdGVtKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmlxdWUucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aXNpdGVkLnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5pcXVlO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBTb3J0cyB0aGUgYXJyYXkgaW4gYXNjZW5kaW5nIG9yZGVyLlxuICAgICAgICAgICAgICAgICAqIFRoaXMgaXMgYSBkZXN0cnVjdGl2ZSBhY3Rpb24sIGFuZCB3aWxsIG1vZGlmeSB0aGUgYXJyYXkgaW4gcGxhY2UuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gYSBUaGUgQXJyYXkgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybnMge0FycmF5fSBUaGUgYXJyYXkgc29ydGVkIGluIGFzY2VuZGluZyBvcmRlci5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBhc2NlbmRpbmc6IGZ1bmN0aW9uIGFzY2VuZGluZyAoYSkge1xuICAgICAgICAgICAgICAgICAgICBpZighKGEgaW5zdGFuY2VvZiBBcnJheSkpIHJldHVybiBhO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYS5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihhICE9PSB1bmRlZmluZWQgJiYgYSAhPT0gbnVsbCkgYSA9IGEudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGIgIT09IHVuZGVmaW5lZCAmJiBiICE9PSBudWxsKSBiID0gYi50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEgPCBiID8gLTEgOiBhID4gYiA/IDEgOiAwO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogU29ydHMgdGhlIGFycmF5IGluIGRlc2NlbmRpbmcgb3JkZXIuXG4gICAgICAgICAgICAgICAgICogVGhpcyBpcyBhIGRlc3RydWN0aXZlIGFjdGlvbiwgYW5kIHdpbGwgbW9kaWZ5IHRoZSBhcnJheSBpbiBwbGFjZS5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBhIFRoZSBBcnJheSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFRoZSBhcnJheSBzb3J0ZWQgaW4gZGVzY2VuZGluZyBvcmRlci5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBkZXNjZW5kaW5nOiBmdW5jdGlvbiBkZXNjZW5kaW5nIChhKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKCEoYSBpbnN0YW5jZW9mIEFycmF5KSkgcmV0dXJuIGE7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGEgIT09IHVuZGVmaW5lZCAmJiBhICE9PSBudWxsKSBhID0gYS50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoYiAhPT0gdW5kZWZpbmVkICYmIGIgIT09IG51bGwpIGIgPSBiLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYSA+IGIgPyAtMSA6IGEgPCBiID8gMSA6IDA7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQXJyYXkgbGlicmFyeSBmdW5jdGlvbnNcbiAgICAgICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG9iamVjdDoge1xuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogR2V0cyB0aGUgdW5pcXVlIGlkIG9mIGFuIG9iamVjdC5cbiAgICAgICAgICAgICAgICAgKiBPbmx5IHdvcmtzIGZvciBub24tbGl0ZXJhbHMsIG90aGVyaXNlIE9iamVjdC5fX2dldF9wcm90b2xpYl9pZF9fIHdpbGwgdGhyb3cuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R8RnVuY3Rpb259IG8gVGhlIG9iamVjdCB0byBnZXQgdGhlIHVuaXF1ZSBpZCBmb3IuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBBIHVuaXF1ZSBvYmplY3QgaWRcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB1bmlxdWVJZDogZnVuY3Rpb24gdW5pcXVlSWQgKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG8uX19nZXRfcHJvdG9saWJfaWRfXztcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogQ29tcHV0ZXMgdGhlIGZyZXF1ZW5jaWVzIGZvciBlYWNoIGl0ZW0gaW4gYWxsIG9mIGFyZ3VtZW50cy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0gey4uLip9IG9ianMgVGhlIG9iamVjdHMgdG8gY29tcHV0ZSB0aGUgaGlzdG9ncmFtIGZyb20uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7T2JqZWN0PE51bWJlcj59IEFuIG9iamVjdCB0aGF0IGhhcyB0aGUgaXRlbXMgZnJvbSBhbGwgb2YgdGhlIGFyZ3VtZW50cyBhcyBpdHMga2V5cyBhbmQgdGhlaXIgZnJlcXVlbmNpZXMgYXMgaXQncyB2YWx1ZXMuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgaGlzdG9ncmFtOiBmdW5jdGlvbiBoaXN0b2dyYW0gKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaGlzdG9ncmFtID0ge307XG4gICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZighaGlzdG9ncmFtW29dKSBoaXN0b2dyYW1bb10gPSAxOyBlbHNlIGhpc3RvZ3JhbVtvXSsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZih0eXBlb2YgbyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKCFoaXN0b2dyYW1bJ2Z1bmN0aW9uJ10pIGhpc3RvZ3JhbVsnZnVuY3Rpb24nXSA9IDE7IGVsc2UgaGlzdG9ncmFtW29dKys7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5ldmVyeShvLCBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCh0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIHR5cGVvZiB2YWwgPT09ICdmdW5jdGlvbic6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIHR5cGVvZiB2YWwgPT09ICd1bmRlZmluZWQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9IHR5cGVvZiB2YWw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIHR5cGVvZiB2YWwgPT09ICdvYmplY3QnICYmIHZhbCA9PT0gbnVsbDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSAnbnVsbCc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIHR5cGVvZiB2YWwgPT09ICdvYmplY3QnICYmIHZhbCBpbnN0YW5jZW9mIEFycmF5OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9ICdhcnJheSc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIHR5cGVvZiB2YWwgPT09ICdvYmplY3QnOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9ICdvYmplY3QnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSB2YWwudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBoaXN0b2dyYW1bdmFsXSAhPT0gJ251bWJlcicpIGhpc3RvZ3JhbVt2YWxdID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGlzdG9ncmFtW3ZhbF0rKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBoaXN0b2dyYW07XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIENyZWF0ZXMgYSBzaGFsbG93IGNvcHkgb2YgJ2l0ZW0nLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Kn0gaXRlbSBUaGUgaXRlbSB0byBzaGFsbG93IFwiY29weVwiLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4geyp9IEEgc2hhbGxvdyBjb3B5IG9mIHRoZSBpdGVtLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGNvcHk6IGZ1bmN0aW9uIGNvcHkgKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvcHk7XG4gICAgICAgICAgICAgICAgICAgIGlmKCFpdGVtKSByZXR1cm4gaXRlbTtcblxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHR5cGVvZiBpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2Z1bmN0aW9uJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGl0ZW0gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbS5zbGljZSgwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvcHkgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5ldmVyeShpdGVtLCBmdW5jdGlvbiAobywgaykgeyBjb3B5W2tdID0gbzsgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjb3B5O1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSZXR1cm5zIHRoZSBudW1iZXIgb2Ygb2NjdXJlbmNlcyBvZiBcIndoYXRcIlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Kn0gb2JqIFRoZSBpdGVtIHRvIGNvdW50IHRoZSBvY2N1cmVuY2VzIG9mIFwid2hhdFwiIGluLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Kn0gd2hhdCBUaGUgaXRlbSB0byBjb3VudCB0aGUgb2NjdXJlbmNlcyBvZiB0aGUgaXRlbSBpbiB0aGUgYXJyYXkuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7W3R5cGVdfSBbZGVzY3JpcHRpb25dXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgb2NjdXJyZW5jZXNPZjogZnVuY3Rpb24gb2NjdXJyZW5jZXNPZiAob2JqLCB3aGF0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPCAyKSByZXR1cm4gMDtcblxuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2Ygb2JqID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvYmogPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2NjdXJyZW5jZXNPZihvYmoudG9TdHJpbmcoKSwgd2hhdCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZih0eXBlb2Ygb2JqID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2NjdXJyZW5jZXNPZihmaXhGaXJlZm94RnVuY3Rpb25TdHJpbmcob2JqLnRvU3RyaW5nKCkpLCB3aGF0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHZhciBjb3VudCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvYmogPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2Ygd2hhdCA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIHdoYXQgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlZ2V4cCA9IG5ldyBSZWdFeHAod2hhdC50b1N0cmluZygpLCAnZycpLCBtO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlKG0gPSByZWdleHAuZXhlYyhvYmopKSBjb3VudCsrOyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmKHR5cGVvZiBvYmogIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5ldmVyeShvYmosIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoaXRlbSA9PT0gd2hhdCkgY291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjb3VudDtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUmV0dXJucyB0aGUgb2JqZWN0J3Mga2V5cy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybnMge0FycmF5PFN0cmluZ3xOdW1iZXI+fSBUaGUgb2JqZWN0J3Mga2V5IHNldFxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGtleXMgOiBmdW5jdGlvbiBrZXlzIChvKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKG8gPT09IHVuZGVmaW5lZCB8fCBvID09PSBudWxsKSByZXR1cm4gW107XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGtleXMgPSBnZXRLZXlzKG8pLCBpZHg7XG4gICAgICAgICAgICAgICAgICAgIGlmKGxpYnMub2JqZWN0LmlzQXJndW1lbnRzKG8pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZHggPSBrZXlzLmluZGV4T2YoJ2xlbmd0aCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoaWR4ID4gLTEpIGtleXMuc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGtleXM7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJldHVybnMgdGhlICdzaXplJyBvciAnbGVuZ3RoJyBvZiBhbiBvYmplY3QuXG4gICAgICAgICAgICAgICAgICogPHVsPlxuICAgICAgICAgICAgICAgICAqICAgICAgPGxpPiBTdHJpbmcgICAtPiBUaGUgc3RyaW5nJ3MgbGVuZ3RoICA8L2xpPlxuICAgICAgICAgICAgICAgICAqICAgICAgPGxpPiBOdW1iZXIgICAtPiBUaGUgbnVtYmVyIG9mIGRpZ2l0cyA8L2xpPlxuICAgICAgICAgICAgICAgICAqICAgICAgPGxpPiBPYmplY3QgICAtPiBUaGUgbnVtYmVyIG9mIGtleXMgICA8L2xpPlxuICAgICAgICAgICAgICAgICAqICAgICAgPGxpPiBBcnJheSAgICAtPiBUaGUgbnVtYmVyIG9mIGl0ZW1zICA8L2xpPlxuICAgICAgICAgICAgICAgICAqICAgICAgPGxpPiBGdW5jdGlvbiAtPiAxICAgICAgICAgICAgICAgICAgICA8L2xpPlxuICAgICAgICAgICAgICAgICAqIDwvdWw+XG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBudW1iZXIgb2YgaXRlbXMgd2l0aGluIHRoZSBvYmplY3QuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgc2l6ZTogZnVuY3Rpb24gc2l6ZSAobykge1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2godHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSB0eXBlb2YgbyA9PT0gJ2Z1bmN0aW9uJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gMTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSB0eXBlb2YgbyA9PT0gJ251bWJlcic6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG8udG9TdHJpbmcoKS5sZW5ndGg7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgbyBpbnN0YW5jZW9mIEFycmF5OlxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSB0eXBlb2YgbyA9PT0gJ3N0cmluZyc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG8ubGVuZ3RoO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIGxpYnMub2JqZWN0LmlzQXJndW1lbnRzKG8pICYmIHR5cGVvZiBvLmxlbmd0aCAhPT0gJ3VuZGVmaW5lZCc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG8ubGVuZ3RoIC0gMTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBvICYmIHR5cGVvZiBvID09PSAnb2JqZWN0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMobykubGVuZ3RoO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIERldGVybWluZXMgaWYgYW4gb2JqZWN0IGNhbiBiZSBjb252ZXJ0ZWQgdG8gYSBudW1iZXIuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHsuLi5PYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBvYmplY3QgaXMgbnVtZXJpYywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGlzTnVtZXJpYzogZnVuY3Rpb24gaXNOdW1lcmljICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAhaXNOYU4ocGFyc2VGbG9hdChpdGVtKSkgJiYgaXNGaW5pdGUoaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBDb252ZXJ0cyBhbiBvYmplY3QgdG8gYSBudW1iZXIuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHsuLi5PYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBvYmplY3QgYXMgYSBudW1iZXIuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgZ2V0TnVtZXJpYzogZnVuY3Rpb24gZ2V0TnVtZXJpYyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB2YWxzID0gW107XG4gICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHMucHVzaChsaWJzLm9iamVjdC5pc051bWVyaWMobykgPyBwYXJzZUZsb2F0KG8pIDogTmFOKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWxzLmxlbmd0aCA9PT0gMSA/IHZhbHNbMF0gOiB2YWxzO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBEZXRlcm1pbmVzIGlmIGFuIG9iamVjdCBoYXMgbm8ga2V5cywgaWYgYW4gYXJyYXkgaGFzIG5vIGl0ZW1zLCBvciBpZiBhIHN0cmluZyA9PT0gJycuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHsuLi5PYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBvYmplY3QgaXMgJ2VtcHR5JywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGlzRW1wdHk6IGZ1bmN0aW9uIGlzRW1wdHkgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LnNpemUoaXRlbSkgPT09IDAgJiYgaXRlbSAhPT0gZmFsc2UgJiYgaXRlbSAhPT0gJycgJiYgaXRlbSAhPT0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFRydWUgaWYgdGhlIG9iamVjdHMgcGFzc2VkIGluIGFyZSBhbGwgYXJyYXlzLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHsuLi5PYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgdGhlIG9iamVjdCBpcyBhbiBhcnJheSwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGlzQXJyYXk6IGZ1bmN0aW9uIGlzQXJyYXkgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW0gaW5zdGFuY2VvZiBBcnJheTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFRydWUgaWYgdGhlIG9iamVjdHMgcGFzc2VkIGluIGFyZSBhbGwgb2JqZWN0cyBhbmQgbm90IGFycmF5cywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uT2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufSBUcnVlIGlmIHRoZSBvYmplY3QgaXMgYW4gb2JqZWN0IGFuZCBub3QgYW4gYXJyYXksIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBpc1B1cmVPYmplY3Q6IGZ1bmN0aW9uIGlzUHVyZU9iamVjdCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gIShpdGVtIGluc3RhbmNlb2YgQXJyYXkpICYmIHR5cGVvZiBpdGVtID09PSAnb2JqZWN0JztcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFRydWUgaWYgdGhlIG9iamVjdHMgcGFzc2VkIGluIGFyZSBhbGwgc3RyaW5ncywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uT2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufSBUcnVlIGlmIHRoZSBvYmplY3QgaXMgYSBzdHJpbmcsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBpc1N0cmluZzogZnVuY3Rpb24gaXNTdHJpbmcgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJztcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFRydWUgaWYgdGhlIG9iamVjdHMgcGFzc2VkIGluIGFyZSBhbGwgYm9vbGVhbnMsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0gey4uLk9iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgb2JqZWN0IGlzIGEgYm9vbGVhbiwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGlzQm9vbGVhbjogZnVuY3Rpb24gaXNCb29sZWFuICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0eXBlb2YgaXRlbSA9PT0gJ2Jvb2xlYW4nO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogVHJ1ZSBpZiB0aGUgb2JqZWN0cyBwYXNzZWQgaW4gYXJlIGFsbGZ1bmN0aW9uLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHsuLi5PYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgdGhlIG9iamVjdCBpcyBhIGZ1bmN0aW9uLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgaXNGdW5jdGlvbjogZnVuY3Rpb24gaXNGdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHlwZW9mIGl0ZW0gPT09ICdmdW5jdGlvbic7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBUcnVlIGlmIHRoZSBvYmplY3RzIHBhc3NlZCBpbiBhcmUgYWxsbGwsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0gey4uLk9iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgb2JqZWN0IGlzIGEgZnVuY3Rpb24sIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBpc051bGw6IGZ1bmN0aW9uIGlzTnVsbCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbSA9PT0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFRydWUgaWYgdGhlIG9iamVjdHMgcGFzc2VkIGluIGFyZSBhbGwgdW5kZWZpbmVkLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHsuLi5PYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgdGhlIG9iamVjdCBpcyBhIGZ1bmN0aW9uLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgaXNVbmRlZmluZWQ6IGZ1bmN0aW9uIGlzVW5kZWZpbmVkICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtID09PSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBUcnVlIGlmIHRoZSBvYmplY3RzIHBhc3NlZCBpbiBhcmUgYWxsIGFyZ3VtZW50cyBvYmplY3RzLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgdGhlIG9iamVjdCBpcyBhbiBhcmd1bWVudHMgb2JqZWN0LCBmYWxzZSBvdGhlcndpc2VcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBpc0FyZ3VtZW50czogZnVuY3Rpb24gaXNBcmd1bWVudHMgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChpdGVtKSA9PT0gJ1tvYmplY3QgQXJndW1lbnRzXSc7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBDb252ZXJzIGFuIG9iamVjdCB0byBhIG51bWJlciwgaWYgcG9zc2libGUuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHsuLi5PYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBvYmplY3QgYXMgYSBmbG9hdCBvciBOYU4uXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgdG9OdW1iZXI6IGZ1bmN0aW9uIHRvTnVtYmVyICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhbHMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFscy5wdXNoKGxpYnMub2JqZWN0LmlzTnVtZXJpYyhvKSA/IHBhcnNlRmxvYXQobykgOiBOYU4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHMubGVuZ3RoID09PSAxID8gdmFsc1swXSA6IHZhbHM7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIENvbnZlcnMgYW4gb2JqZWN0IHRvIGFuIGludGVnZXIsIGlmIHBvc3NpYmxlLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgb2JqZWN0IGFzIGFuIGludGVnZXIgb3IgTmFOLlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHRvSW50OiBmdW5jdGlvbiB0b0ludCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB2YWxzID0gW107XG4gICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByYWRpeCA9IC9eMHgvLnRlc3QobykgPyAxNiA6IDEwOyAvLyBDaGVjayBmb3IgaGV4IHN0cmluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFscy5wdXNoKGxpYnMub2JqZWN0LmlzTnVtZXJpYyhvKSA/IHBhcnNlSW50KG8sIHJhZGl4KSA6IE5hTik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFscy5sZW5ndGggPT09IDEgPyB2YWxzWzBdIDogdmFscztcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUmV0dXJucyBhIHJhbmRvbSBhcnJheSBpdGVtLCByYW5kb20gb2JqZWN0IHByb3BlcnR5LCByYW5kb20gY2hhcmFjdGVyIGluIGEgc3RyaW5nLCBvciByYW5kb20gZGlnaXQgaW4gYSBudW1iZXIuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHJhbmRvbTogZnVuY3Rpb24gcmFuZG9tIChvKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG8gaW5zdGFuY2VvZiBBcnJheSA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBvLmxlbmd0aCldIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvW09iamVjdC5rZXlzKG8pW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIE9iamVjdC5rZXlzKG8pLmxlbmd0aCldXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmKHR5cGVvZiBvID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgbyA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2YWwgPSBvLCBuZWdhdGl2ZSA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihvLmxlbmd0aCA9PT0gMCkgcmV0dXJuICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdudW1iZXInICYmIG8gPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmVnYXRpdmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9IE1hdGguYWJzKHZhbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9IHZhbC50b1N0cmluZygpW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHZhbC50b1N0cmluZygpLmxlbmd0aCldO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdudW1iZXInKSB2YWwgPSBwYXJzZUludCh2YWwsIDEwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZWdhdGl2ZSA/IC12YWwgOiB2YWw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG87XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEludm9rZXMgdGhlIGNhbGxiYWNrICdmJyBmb3IgZWFjaCBwcm9wZXJ0eSB0aGUgb2JqZWN0IGNvbnRhaW5zLiBJZiB0aGlzIGlzIGNhbGxlZFxuICAgICAgICAgICAgICAgICAqIG9uIGEgbnVtYmVyIG9yIGZ1bmN0aW9uLCB0aGUgb2JqZWN0IHdpbGwgYmUgY2FzdCB0byBhIHN0cmluZy48YnI+PGJyPlxuICAgICAgICAgICAgICAgICAqIFRoZSBjYWxsYmFjayBgZmAgd2lsbCBiZSBpbnZva2VkIHdpdGggdGhlIGZvbGxvd2luZyBhcmd1bWVudHM6XG4gICAgICAgICAgICAgICAgICogPHVsPlxuICAgICAgICAgICAgICAgICAqIFx0PGxpPnZhbHVlICAgICAtIFRoZSB2YWx1ZSBvZiB0aGUgY3VycmVudCBvYmplY3QgYmVpbmcgaXRlcmF0ZWQgb3ZlcjwvbGk+XG4gICAgICAgICAgICAgICAgICogXHQ8bGk+a2V5ICAgICAgIC0gVGhlIGtleSBvZiB0aGUgY3VycmVudCBvYmplY3QgKGlmIGFuIG9iamVjdCwgdGhlIGluZGV4IGlmIGFuIGFycmF5KTwvbGk+XG4gICAgICAgICAgICAgICAgICogXHQ8bGk+aXRlcmF0aW9uIC0gVGhlIGN1cnJlbnQgaXRlcmF0aW9uIChzYW1lIGFzIGtleSBpZiBhIHN0cmluZyBvciBhcnJheSk8L2xpPlxuICAgICAgICAgICAgICAgICAqIFx0PGxpPmV4aXQgICAgICAtIEEgZnVuY3Rpb24gd2hpY2ggd2lsbCBicmVhayB0aGUgbG9vcCBhbmQgcmV0dXJuIHRoZSB2YWx1ZXMgcGFzc2VkIHRvIGl0LFxuICAgICAgICAgICAgICAgICAqIFx0XHRcdFx0XHRvciBhIHNpbmdsZSB2YWx1ZSBpZiBvbmx5IGEgc2luZ2xlIHZhbHVlIGlzIHBhc3NlZC48L2xpPlxuICAgICAgICAgICAgICAgICAqIDwvdWw+XG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyPX0gW3JhbmdlQT0wXSBUaGUgaXRlcmF0aW9uIHN0YXJ0IGluZGV4XG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXI9fSBbcmFuZ2VCPSdsZW5ndGggb2YgdGhlIGl0ZW0nXSBUaGUgaXRlcmF0aW9uIGVuZCBpbmRleFxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGYgVGhlIGNhbGxiYWNrIHRvIGludm9rZSBmb3IgZWFjaCBpdGVtIHdpdGhpbiB0aGUgb2JqZWN0XG4gICAgICAgICAgICAgICAgICogQHJldHVybnMgeyp9IFRoZSB2YWx1ZSBwYXNzZWQgdG8gdGhlIGV4aXQgcGFyYW1ldGVyIG9mIHRoZSBjYWxsYmFjay4uLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGVhY2g6IGZ1bmN0aW9uIGVhY2ggKG8sIHJhbmdlQSwgcmFuZ2VCLCBmKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQ2FuJ3QgdXNlIGxhc3QgaGVyZS4uIHdvdWxkIGNhdXNlIGNpcmN1bGFyIHJlZi4uLlxuICAgICAgICAgICAgICAgICAgICBmID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGsgPSBhcmd1bWVudHMubGVuZ3RoIC0gMTsgayA+PSAwOyBrLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGFyZ3VtZW50c1trXSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZiA9IGFyZ3VtZW50c1trXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHZhciByZXQgICAgPSBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgYnJva2VuID0gZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmICAgPSBvLFxuICAgICAgICAgICAgICAgICAgICAgICAga2V5cywgcHJvcGVydHksIHZhbHVlLFxuXG4gICAgICAgICAgICAgICAgICAgICAgICBleGl0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyb2tlbiAgID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXQgICAgICA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gbGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpIDogYXJndW1lbnRzWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICBpZihmIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBzZWxmID09PSAnbnVtYmVyJyB8fCB0eXBlb2Ygc2VsZiA9PT0gJ2Z1bmN0aW9uJyB8fCB0eXBlb2Ygc2VsZiA9PT0gJ2Jvb2xlYW4nKSBzZWxmID0gby50b1N0cmluZygpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGaXJlZm94IGRvZXMgc29tZSBmdW5reSBzdHVmZiBoZXJlLi4uXG4gICAgICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyA9PT0gJ2Z1bmN0aW9uJykgc2VsZiA9IGZpeEZpcmVmb3hGdW5jdGlvblN0cmluZyhzZWxmKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIFNhZmFyaVxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlzQXJncyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKSA9PT0gJ1tvYmplY3QgQXJndW1lbnRzXScsIGlkeCA9IC0xO1xuICAgICAgICAgICAgICAgICAgICAgICAga2V5cyA9IGdldEtleXMoc2VsZik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZHggID0ga2V5cy5pbmRleE9mKCdsZW5ndGgnKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoaXNBcmdzICYmIGlkeCA+IC0xKSBrZXlzLnNwbGljZShpZHgsIDEpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICByYW5nZUEgPSBwYXJzZUludChyYW5nZUEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2VBID0gKGlzTmFOKHJhbmdlQSkgfHwgIWlzRmluaXRlKHJhbmdlQSkpID8gMCA6IHJhbmdlQTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2VCID0gcGFyc2VJbnQocmFuZ2VCKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlQiA9IChpc05hTihyYW5nZUIpIHx8ICFpc0Zpbml0ZShyYW5nZUIpKSA/IGtleXMubGVuZ3RoIDogcmFuZ2VCO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaSA9IDAsIG47XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihNYXRoLmFicyhyYW5nZUEpID4gTWF0aC5hYnMocmFuZ2VCKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHJhbmdlQiA8IDApIHJhbmdlQiA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYocmFuZ2VBIDwgMCkgcmFuZ2VBID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihyYW5nZUEgPiBrZXlzLmxlbmd0aCAtIDEpIHJhbmdlQSA9IGtleXMubGVuZ3RoIC0gMTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcihuID0gcmFuZ2VBOyBuID49IHJhbmdlQjsgbi0tKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5ID0ga2V5c1tuXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgICAgPSAodHlwZW9mIG8gPT09ICdudW1iZXInICYmICFpc05hTihwYXJzZUZsb2F0KHNlbGZbcHJvcGVydHldKSkpID8gcGFyc2VGbG9hdChzZWxmW3Byb3BlcnR5XSkgOiBzZWxmW3Byb3BlcnR5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZi5jYWxsKG8sIHZhbHVlLCBwcm9wZXJ0eSwgbiwgZXhpdCwgaSsrLCBvKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoYnJva2VuKSBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByYW5nZUIgPSByYW5nZUIgKyAxID4ga2V5cy5sZW5ndGggPyBrZXlzLmxlbmd0aCA6IHJhbmdlQiArIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYocmFuZ2VCIDwgMCkgcmFuZ2VCID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihyYW5nZUEgPCAwKSByYW5nZUEgPSAwO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yKG4gPSByYW5nZUE7IG4gPCByYW5nZUI7IG4rKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eSA9IGtleXNbbl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlICAgID0gKHR5cGVvZiBvID09PSAnbnVtYmVyJyAmJiAhaXNOYU4ocGFyc2VGbG9hdChzZWxmW3Byb3BlcnR5XSkpKSA/IHBhcnNlRmxvYXQoc2VsZltwcm9wZXJ0eV0pIDogc2VsZltwcm9wZXJ0eV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGYuY2FsbChvLCB2YWx1ZSwgcHJvcGVydHksIG4sIGV4aXQsIGkrKywgbyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGJyb2tlbikgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEludm9rZXMgdGhlIGNhbGxiYWNrICdmJyBmb3IgZXZlcnkgcHJvcGVydHkgdGhlIG9iamVjdCBjb250YWlucy4gSWYgdGhlIGNhbGxiYWNrIHJldHVybnMgZmFsc2UsIHRoZVxuICAgICAgICAgICAgICAgICAqIGxvb3AgaXMgYnJva2VuIGFuZCBmYWxzZSBpcyByZXR1cm5lZDsgb3RoZXJ3aXNlIHRydWUgaXMgcmV0dXJuZWQuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGYgVGhlIGNhbGxiYWNrIHRvIGludm9rZSBmb3IgZWFjaCBpdGVtIHdpdGhpbiB0aGUgb2JqZWN0XG4gICAgICAgICAgICAgICAgICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgbm9uZSBvZiB0aGUgY2FsbGJhY2sgaW52b2NhdGlvbnMgcmV0dXJuZWQgZmFsc2UuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgZXZlcnk6IGZ1bmN0aW9uIGV2ZXJ5IChvLCBmKSB7XG4gICAgICAgICAgICAgICAgICAgIGYgPSBmIGluc3RhbmNlb2YgRnVuY3Rpb24gPyBmIDogdW5kZWZpbmVkO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKGYgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNlbGYgPSBvLCBrZXlzLCBwcm9wZXJ0eSwgdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2Ygc2VsZiA9PT0gJ251bWJlcicgfHwgdHlwZW9mIHNlbGYgPT09ICdmdW5jdGlvbicgfHwgdHlwZW9mIHNlbGYgPT09ICdib29sZWFuJykgc2VsZiA9IG8udG9TdHJpbmcoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmlyZWZveCBkb2VzIHNvbWUgZnVua3kgc3R1ZmYgaGVyZS4uLlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdmdW5jdGlvbicpIHNlbGYgPSBmaXhGaXJlZm94RnVuY3Rpb25TdHJpbmcoc2VsZik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBTYWZhcmkuLi5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpc0FyZ3MgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobykgPT09ICdbb2JqZWN0IEFyZ3VtZW50c10nLCBpZHggPSAtMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleXMgPSBnZXRLZXlzKHNlbGYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWR4ICA9IGtleXMuaW5kZXhPZignbGVuZ3RoJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGlzQXJncyAmJiBpZHggPiAtMSkga2V5cy5zcGxpY2UoaWR4LCAxKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGkgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBuID0gMDsgbiA8IGtleXMubGVuZ3RoOyBuKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eSA9IGtleXNbbl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgICAgPSAodHlwZW9mIG8gPT09ICdudW1iZXInICYmICFpc05hTihwYXJzZUZsb2F0KHNlbGZbcHJvcGVydHldKSkpID8gcGFyc2VGbG9hdChzZWxmW3Byb3BlcnR5XSkgOiBzZWxmW3Byb3BlcnR5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihmLmNhbGwobywgdmFsdWUsIHByb3BlcnR5LCBuLCBpKyssIG8pID09PSBmYWxzZSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBJbnZva2VzIHRoZSBjYWxsYmFjayAnZicgZm9yIGV2ZXJ5IHByb3BlcnR5IHRoZSBvYmplY3QgY29udGFpbnMuIElmIHRoZSBjYWxsYmFjayByZXR1cm5zIHRydWUsIHRoZVxuICAgICAgICAgICAgICAgICAqIGxvb3AgaXMgYnJva2VuIGFuZCBmYWxzZSBpcyByZXR1cm5lZDsgb3RoZXJ3aXNlIHRydWUgaXMgcmV0dXJuZWQuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGYgVGhlIGNhbGxiYWNrIHRvIGludm9rZSBmb3IgZWFjaCBpdGVtIHdpdGhpbiB0aGUgb2JqZWN0XG4gICAgICAgICAgICAgICAgICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgbm9uZSBvZiB0aGUgY2FsbGJhY2sgaW52b2NhdGlvbnMgcmV0dXJuZWQgZmFsc2UuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgYW55OiBmdW5jdGlvbiBhbnkgKG8sIGYpIHtcbiAgICAgICAgICAgICAgICAgICAgZiA9IGYgaW5zdGFuY2VvZiBGdW5jdGlvbiA/IGYgOiB1bmRlZmluZWQ7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoZiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2VsZiA9IG8sIGtleXMsIHByb3BlcnR5LCB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBzZWxmID09PSAnbnVtYmVyJyB8fCB0eXBlb2Ygc2VsZiA9PT0gJ2Z1bmN0aW9uJyB8fCB0eXBlb2Ygc2VsZiA9PT0gJ2Jvb2xlYW4nKSBzZWxmID0gby50b1N0cmluZygpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGaXJlZm94IGRvZXMgc29tZSBmdW5reSBzdHVmZiBoZXJlLi4uXG4gICAgICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyA9PT0gJ2Z1bmN0aW9uJykgc2VsZiA9IGZpeEZpcmVmb3hGdW5jdGlvblN0cmluZyhzZWxmKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIFNhZmFyaS4uLlxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlzQXJncyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKSA9PT0gJ1tvYmplY3QgQXJndW1lbnRzXScsIGlkeCA9IC0xO1xuICAgICAgICAgICAgICAgICAgICAgICAga2V5cyA9IGdldEtleXMoc2VsZik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZHggID0ga2V5cy5pbmRleE9mKCdsZW5ndGgnKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoaXNBcmdzICYmIGlkeCA+IC0xKSBrZXlzLnNwbGljZShpZHgsIDEpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IodmFyIG4gPSAwOyBuIDwga2V5cy5sZW5ndGg7IG4rKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5ID0ga2V5c1tuXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSAgICA9ICh0eXBlb2YgbyA9PT0gJ251bWJlcicgJiYgIWlzTmFOKHBhcnNlRmxvYXQoc2VsZltwcm9wZXJ0eV0pKSkgPyBwYXJzZUZsb2F0KHNlbGZbcHJvcGVydHldKSA6IHNlbGZbcHJvcGVydHldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXQgPSBmLmNhbGwobywgdmFsdWUsIHByb3BlcnR5LCBuLCBpKyssIG8pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHJldCAhPT0gdW5kZWZpbmVkKSByZXR1cm4gcmV0O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIENvbnZlcnRzIGFuIG9iamVjdCB0byBhbiBhcnJheS4gRm9yIHN0cmluZ3MsIG51bWJlcnMsIGFuZCBmdW5jdGlvbnMgdGhpcyB3aWxsXG4gICAgICAgICAgICAgICAgICogcmV0dXJuIGEgY2hhciBhcnJheSB0byB0aGVpciByZXNwZWN0aXZlIC50b1N0cmluZygpIHZhbHVlc1xuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtBcnJheTwqPn0gVGhlIG9iamVjdCwgY29udmVydGVkIHRvIGFuIGFycmF5LlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHRvQXJyYXk6IGZ1bmN0aW9uIHRvQXJyYXkgKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYobyBpbnN0YW5jZW9mIEFycmF5KSByZXR1cm4gbGlicy5vYmplY3QuY29weShvKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyciA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKG8sIGZ1bmN0aW9uICh2YWwpIHsgYXJyLnB1c2godmFsKTsgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhcnI7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJldHVybnMgdGhlIGZpcnN0IG4gZWxlbWVudHMgb2YgYW4gb2JqZWN0LiBJZiB0aGUgb2JqZWN0IGlzIGFuIGFycmF5LCBhbmQgb25seSBvbmUgaXRlbXMgaXMgcmV0cmlldmVkLFxuICAgICAgICAgICAgICAgICAqIHRoYXQgaXRlbSB3aWxsIGJlIHJldHVybmVkLCByYXRoZXIgdGhhbiBhbiBhcnJheS5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXI9fSBbbj0xXSBUaGUgbnVtYmVyIG9mIGVsZW1lbnRzIHRvIHJldHVyblxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0FycmF5PCo+fSBUaGUgZmlyc3QgbiBlbGVtZW50cyBvZiB0aGUgYXJyYXkuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgZmlyc3Q6IGZ1bmN0aW9uIGZpcnN0IChvLCBuKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBnb3ROID0gKG4gPT09IDAgPyB0cnVlIDogISFuKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHY7XG5cbiAgICAgICAgICAgICAgICAgICAgbiA9IHBhcnNlSW50KG4sIDEwKTtcbiAgICAgICAgICAgICAgICAgICAgbiA9IGlzTmFOKG4pIHx8ICFpc0Zpbml0ZShuKSA/IDEgOiBuO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYodHlwZW9mIG8gIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihuICE9PSAwKSB2ID0gby50b1N0cmluZygpLnNsaWNlKDAsIG4pOyBlbHNlIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZihvIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKG4gPT09IDEgJiYgIWdvdE4pIHJldHVybiBvWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYobiA9PT0gMCAmJiAhZ290TikgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG4gIT09IDAgPyBvLnNsaWNlKDAsIG4pIDogIFtdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdiA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChvLCAwLCBuIC0gMSwgZnVuY3Rpb24gKGl0ZW0sIGtleSkgeyB2W2tleV0gPSBpdGVtOyB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBrZXlzID0gZ2V0S2V5cyh2KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKG4gPT09IDEgJiYgIWdvdE4gJiYga2V5cy5sZW5ndGggPT09IDApIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBrZXlzLmxlbmd0aCA9PT0gMSAmJiAhZ290TiA/IHZba2V5c1swXV0gOiB2O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2Lmxlbmd0aCA9PT0gMSAmJiAhZ290TiA/IHZbMF0gOiB2O1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSZXR1cm5zIHRoZSBsYXN0IG4gZWxlbWVudHMgb2YgYW4gb2JqZWN0LiBJZiB0aGUgb2JqZWN0IGlzIGFuIGFycmF5LCBhbmQgb25seSBvbmUgaXRlbXMgaXMgcmV0cmlldmVkLFxuICAgICAgICAgICAgICAgICAqIHRoYXQgaXRlbSB3aWxsIGJlIHJldHVybmVkIHJhdGhlciB0aGFuIGFuIGFycmF5LlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcj19IFtuPTFdIFRoZSBudW1iZXIgb2YgZWxlbWVudHMgdG8gcmV0dXJuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7QXJyYXk8Kj59IFRoZSBsYXN0IG4gZWxlbWVudHMgb2YgdGhlIGFycmF5LlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGxhc3Q6IGZ1bmN0aW9uIGxhc3QgKG8sIG4pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdib29sZWFuJykgcmV0dXJuIG87XG4gICAgICAgICAgICAgICAgICAgIHZhciBnb3ROID0gKCEhbiB8fCBuID09PSAwKTtcblxuICAgICAgICAgICAgICAgICAgICBuID0gcGFyc2VJbnQobiwgMTApO1xuICAgICAgICAgICAgICAgICAgICBuID0gaXNOYU4obikgfHwgIWlzRmluaXRlKG4pID8gMSA6IG47XG4gICAgICAgICAgICAgICAgICAgIHZhciB2ID0gbnVsbCwga2V5cywgbGVuID0gbGlicy5vYmplY3Quc2l6ZShvKSwgaWR4O1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYobGlicy5vYmplY3QuaXNBcmd1bWVudHMobykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleXMgPSBnZXRLZXlzKG8pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWR4ICA9IGtleXMuaW5kZXhPZignbGVuZ3RoJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGlkeCA+IC0xKSBrZXlzLnNwbGljZShpZHgsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdiA9IFtdOyBsZW4gPSBrZXlzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFyZ3VtZW50cyBvYmplY3Qgc2hvdWxkIGlnbm9yZSB1bmRlZmluZWQgbWVtYmVycy4uLlxuICAgICAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChrZXlzLCAwLCBsZW4sIGZ1bmN0aW9uIChrKSB7IGlmKG9ba10gIT09IHVuZGVmaW5lZCkgdi51bnNoaWZ0KG9ba10pOyB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHYgPSB2LnNsaWNlKDAsIG4pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYodHlwZW9mIG8gIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihuICE9PSAwKSB2ID0gby50b1N0cmluZygpLnNsaWNlKC1uKTsgZWxzZSByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmKG8gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYobiA9PT0gMSAmJiAhZ290TikgcmV0dXJuIG9bby5sZW5ndGggLTFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYobiA9PT0gMCAmJiAhZ290TikgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG4gIT09IDAgPyBvLnNsaWNlKC1uKSA6IFtdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdiA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYobiA8IDApIG4gPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChvLCBsZW4gLSBuLCBsZW4sIGZ1bmN0aW9uIChpdGVtLCBrZXkpIHsgdltrZXldID0gaXRlbTsgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlzID0gZ2V0S2V5cyh2KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYobiA9PT0gMSAmJiAhZ290TiAmJiBrZXlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBrZXlzLmxlbmd0aCA9PT0gMSAmJiAhZ290TiA/IHZba2V5c1swXV0gOiB2O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2Lmxlbmd0aCA9PT0gMSAmJiAhZ290TiA/IHZbMF0gOiB2O1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBJZiB0aGUgbGFzdCBpdGVtIGluIHRoZSBvYmplY3QgaXMgYSBmdW5jdGlvbiwgaXQgd2lsbCBiZSByZXR1cm5lZC4gT3RoZXJ3aXNlLCBhbiBcImVtcHR5XCIgZnVuY3Rpb24gd2lsbCBiZSByZXR1cm5lZC5cbiAgICAgICAgICAgICAgICAgKiBVc2VmdWwgZm9yIGVuc3VyaW5nIHRoYXQgYSBjYWxsYmFjayBjYW4gYWx3YXlzIGJlIGludm9rZWQsIHdpdGhvdXQgY2hlY2tpbmcgaWYgdGhlIGFyZ3VtZW50IGlzIGEgZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKiBvdmVyIGFuZCBvdmVyLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gZ2V0IHRoZSBjYWxsYmFjayBmb3IuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7RnVuY3Rpb259IElmIHRoZSBsYXN0IGl0ZW0gaW4gdGhlIG9iamVjdCBpcyBhIGZ1bmN0aW9uLCBpdCB3aWxsIGJlIHJldHVybmVkLiBPdGhlcndpc2UsIGFuIFwiZW1wdHlcIiBmdW5jdGlvbiB3aWxsIGJlIHJldHVybmVkLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGdldENhbGxiYWNrOiBmdW5jdGlvbiBnZXRDYWxsYmFjayAobykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGFzdCA9IGxpYnMub2JqZWN0Lmxhc3Qobyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsYXN0IGluc3RhbmNlb2YgRnVuY3Rpb24gPyBsYXN0IDogTlVMTF9GVU5DVElPTjtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogRmluZCBhIGNoaWxkIG9mIGFuIG9iamVjdCB1c2luZyB0aGUgZ2l2ZW4gcGF0aCwgc3BsaXQgYnkgdGhlIGdpdmVuIGRlbGltaXRlciAob3IgJy4nIGJ5IGRlZmF1bHQpXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFRoZSBwYXRoIHRvIHRoZSBjaGlsZCBvYmplY3RcbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZz19IFtkZWxpbWl0ZXI9Jy4nXSBUaGUgcGF0aCBkZWxpbWl0ZXJcbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9uPX0gZG9uZSBBIGNhbGxiYWNrIGZvciBjb21wbGV0aW9uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7KnxOdWxsfSBUaGUgY2hpbGQgb2JqZWN0IGF0IHRoZSBnaXZlbiBzdHJpbmcgcGF0aCwgb3IgbnVsbCBpZiBpdCBkb2Vzbid0IGV4aXN0LlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGZpbmRDaGlsZEF0UGF0aDogZnVuY3Rpb24gZmluZENoaWxkQXRQYXRoIChvLCBwYXRoLCBkZWxpbWl0ZXIsIG9yaWdpbmFsLCBpbnZva2VkLCBkb25lKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvbmUgPSBsaWJzLm9iamVjdC5nZXRDYWxsYmFjayhhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2VsZiA9IG87XG5cbiAgICAgICAgICAgICAgICAgICAgb3JpZ2luYWwgPSAoIShvcmlnaW5hbCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSAmJiBvcmlnaW5hbCkgPyBvcmlnaW5hbCA6IHNlbGY7XG4gICAgICAgICAgICAgICAgICAgIGludm9rZWQgID0gaW52b2tlZCB8fCBmYWxzZTtcblxuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxpbWl0ZXIgPSB0eXBlb2YgZGVsaW1pdGVyID09PSAnc3RyaW5nJyA/IGRlbGltaXRlciA6ICcuJztcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGggICAgICA9IHBhdGguc3BsaXQoZGVsaW1pdGVyKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHAgPSBwYXRoLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmVhY2gobywgZnVuY3Rpb24gKG8sIGssIGksIGV4aXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYocGF0aC5sZW5ndGggPT09IDAgJiYgayA9PT0gcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9uZS5jYWxsKG9yaWdpbmFsLCBvLCBzZWxmLCBrKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludm9rZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhpdChvKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvYmogPSBsaWJzLm9iamVjdC5maW5kQ2hpbGRBdFBhdGgobywgcGF0aC5qb2luKGRlbGltaXRlciksIGRlbGltaXRlciwgb3JpZ2luYWwsIGludm9rZWQsIGRvbmUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYob2JqICE9PSBudWxsKSBleGl0KG9iaik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZighaW52b2tlZCAmJiBvcmlnaW5hbCA9PT0gc2VsZiAmJiBkb25lIGluc3RhbmNlb2YgRnVuY3Rpb24pIGRvbmUuY2FsbChvcmlnaW5hbCwgbnVsbCwgc2VsZiwgbnVsbCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBQcm9kdWNlcyBhIHNoYWxsb3cgY2xvbmUgb2YgdGhlIG9iamVjdCwgdGhhdCBpcywgaWYgSlNPTi5zdHJpbmdpZnkgY2FuIGhhbmRsZSBpdC48YnI+XG4gICAgICAgICAgICAgICAgICogVGhlIG9iamVjdCBtdXN0IGJlIG5vbi1jaXJjdWxhci5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbj19IHJlcGxhY2VyIFRoZSBKU09OLnN0cmluZ2lmeSByZXBsYWNlciBwYXJhbWV0ZXIuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7Kn0gQSBzaGFsbG93IGNsb25lIG9mIHRoZSBvYmplY3QuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgY2xvbmU6IGZ1bmN0aW9uIGNsb25lIChvLCByZXBsYWNlcikge1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIG8gPT09ICdudW1iZXInKSByZXR1cm4gbztcblxuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkobywgcmVwbGFjZXIpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gY2xvbmUgb2JqZWN0OiAnICsgZS5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBGaWx0ZXJzIGFuIGFycmF5IG9yIG9iamVjdCB1c2luZyBvbmx5IHRoZSB0eXBlcyBhbGxvd2VkLiBUaGF0IGlzLCBpZiB0aGUgaXRlbSBpbiB0aGUgYXJyYXkgaXMgb2YgYSB0eXBlIGxpc3RlZFxuICAgICAgICAgICAgICAgICAqIGluIHRoZSBhcmd1bWVudHMsIHRoZW4gaXQgd2lsbCBiZSBhZGRlZCB0byB0aGUgZmlsdGVyZWQgYXJyYXkuIEluIHRoaXMgY2FzZSAnYXJyYXknIGlzIGEgdmFsaWQgdHlwZS5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHsuLi5TdHJpbmd9IHR5cGVzIEEgbGlzdCBvZiB0eXBlb2YgdHlwZXMgdGhhdCBhcmUgYWxsb3dlZCBpbiB0aGUgYXJyYXkuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7QXJyYXk8Kj59IEFuIGFycmF5IGZpbHRlcmVkIGJ5IG9ubHkgdGhlIGFsbG93ZWQgdHlwZXMuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgb25seTogZnVuY3Rpb24gb25seSAobywgdHlwZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZXMgPSBsaWJzLm9iamVjdC50b0FycmF5KGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIHR5cGVzLnNoaWZ0KCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQWxsb3dzIHRoZSAncGx1cmFsJyBmb3JtIG9mIHRoZSB0eXBlLi4uXG4gICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2godHlwZXMsIGZ1bmN0aW9uICh0eXBlLCBrZXkpIHsgdGhpc1trZXldID0gdHlwZS5yZXBsYWNlKC9zJC8sICcnKTsgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gIT09ICdvYmplY3QnIHx8ICFvKSByZXR1cm4gbztcbiAgICAgICAgICAgICAgICAgICAgdmFyIGlzQXJyYXkgID0gbyBpbnN0YW5jZW9mIEFycmF5ID8gdHJ1ZSA6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyZWQgPSBpc0FycmF5ID8gW10gOiB7fSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVBcnIgID0gdHlwZXMuaW5kZXhPZignYXJyYXknKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVPYmogID0gdHlwZXMuaW5kZXhPZignb2JqZWN0IG9iamVjdCcpO1xuXG4gICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2gobywgZnVuY3Rpb24gKGl0ZW0sIGtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHR5cGVJdGVtID0gdHlwZXMuaW5kZXhPZih0eXBlb2YgaXRlbSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHR5cGVPYmogIT09IC0xICYmIHR5cGVBcnIgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoKHR5cGVvZiBpdGVtID09PSAnb2JqZWN0JyAmJiAhKGl0ZW0gaW5zdGFuY2VvZiBBcnJheSkpIHx8ICh0eXBlb2YgaXRlbSAhPT0gJ29iamVjdCcgJiYgdHlwZUl0ZW0gIT09IC0xKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihpc0FycmF5KSBmaWx0ZXJlZC5wdXNoKGl0ZW0pOyBlbHNlIGZpbHRlcmVkW2tleV0gPSBpdGVtO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYodHlwZU9iaiAhPT0gLTEgJiYgdHlwZUFyciAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlcy5wdXNoKCdvYmplY3QnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZih0eXBlSXRlbSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoaXNBcnJheSkgZmlsdGVyZWQucHVzaChpdGVtKTsgZWxzZSBmaWx0ZXJlZFtrZXldID0gaXRlbTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmKHR5cGVJdGVtICE9PSAtMSB8fCAoaXRlbSBpbnN0YW5jZW9mIEFycmF5ICYmIHR5cGVBcnIgIT09IC0xKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGlzQXJyYXkpIGZpbHRlcmVkLnB1c2goaXRlbSk7IGVsc2UgZmlsdGVyZWRba2V5XSA9IGl0ZW07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmlsdGVyZWQ7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEZpbHRlcnMgYW4gb2JqZWN0IHVzaW5nIHRoZSBnaXZlbiBwcmVkaWNhdGUgZnVuY3Rpb24uIEZvciBvYmplY3RzLCBhIG5ldyBvYmplY3Qgd2lsbCBiZSByZXR1cm5lZCwgd2l0aFxuICAgICAgICAgICAgICAgICAqIHRoZSB2YWx1ZXMgdGhhdCBwYXNzZWQgdGhlIHByZWRpY2F0ZSBmdW5jdGlvbi4gRm9yIHN0cmluZ3MsIGEgbmV3IHN0cmluZyB3aWxsIGJlIHJldHVybmVkIHdpdGggdGhlIGNoYXJhY3RlcnNcbiAgICAgICAgICAgICAgICAgKiB0aGF0IHBhc3NlZCB0aGUgcHJlZGljYXRlIGZ1bmN0aW9uLiBGb3IgbnVtYmVycywgYSBuZXcgbnVtYmVyIHdpbGwgYmUgcmV0dXJuZWQgd2l0aCB0aGUgZGlnaXRzIHRoYXQgcGFzc2VkXG4gICAgICAgICAgICAgICAgICogdGhlIHByZWRpY2F0ZSBmdW5jdGlvbi4gRnVuY3Rpb25zIHdpbGwgYmUgb3BlcmF0ZWQgb24gYXMgc3RyaW5ncy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gcHJlZGljYXRlIFRoZSBmdW5jdGlvbiB1c2VkIHRvIGZpbHRlciB0aGUgb2JqZWN0LlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4geyp9IFRoZSBmaWx0ZXJlZCBvYmplY3RcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB3aGVyZTogZnVuY3Rpb24gd2hlcmUgKG8sIHByZWRpY2F0ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZighKHByZWRpY2F0ZSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRlbXAgPSBwcmVkaWNhdGU7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmVkaWNhdGUgPSBmdW5jdGlvbiAoaSkgeyByZXR1cm4gaSA9PSB0ZW1wOyB9OyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmKG8gPT09IG51bGwgfHwgbyA9PT0gdW5kZWZpbmVkKSByZXR1cm4gbztcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIDAgPT09ICdib29sZWFuJykgcmV0dXJuIHByZWRpY2F0ZS5jYWxsKG8sIG8sIDApO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBpc09iamVjdCA9IHR5cGVvZiBvID09PSAnb2JqZWN0JyAmJiAhKG8gaW5zdGFuY2VvZiBBcnJheSkgPyB0cnVlIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXJlZCA9ICFpc09iamVjdCA/IFtdIDoge307XG5cbiAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChvLCBmdW5jdGlvbiAoaXRlbSwga2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihwcmVkaWNhdGUuY2FsbChpdGVtLCBpdGVtLCBrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoaXNPYmplY3QpIGZpbHRlcmVkW2tleV0gPSBpdGVtOyBlbHNlIGZpbHRlcmVkLnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvICE9PSAnb2JqZWN0JykgZmlsdGVyZWQgPSBmaWx0ZXJlZC5qb2luKCcnKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZpbHRlcmVkO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBGaWx0ZXJzIGFuIG9iamVjdCBieSBrZXlzIHVzaW5nIHRoZSBnaXZlbiBwcmVkaWNhdGUgZnVuY3Rpb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IHByZWRpY2F0ZSBUaGUgZnVuY3Rpb24gdXNlZCB0byBmaWx0ZXIgdGhlIG9iamVjdC5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHsqfSBUaGUgZmlsdGVyZWQgb2JqZWN0XG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgd2hlcmVLZXlzOiBmdW5jdGlvbiB3aGVyZUtleXMgKG8sIHByZWRpY2F0ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZighKHByZWRpY2F0ZSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRlbXAgPSBwcmVkaWNhdGU7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmVkaWNhdGUgPSBmdW5jdGlvbiAoaykgeyByZXR1cm4gayA9PSB0ZW1wOyB9OyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmKG8gPT09IG51bGwgfHwgbyA9PT0gdW5kZWZpbmVkKSByZXR1cm4gbztcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIDAgPT09ICdib29sZWFuJykgcmV0dXJuIHByZWRpY2F0ZS5jYWxsKG8sIG8sIDApO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBpc09iamVjdCA9IHR5cGVvZiBvID09PSAnb2JqZWN0JyAmJiAhKG8gaW5zdGFuY2VvZiBBcnJheSkgPyB0cnVlIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXJlZCA9ICFpc09iamVjdCA/IFtdIDoge307XG5cbiAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChvLCBmdW5jdGlvbiAoaXRlbSwga2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihwcmVkaWNhdGUuY2FsbChrZXksIGtleSwgaXRlbSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihpc09iamVjdCkgZmlsdGVyZWRba2V5XSA9IGl0ZW07IGVsc2UgZmlsdGVyZWQucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gIT09ICdvYmplY3QnKSBmaWx0ZXJlZCA9IGZpbHRlcmVkLmpvaW4oJycpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmlsdGVyZWQ7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEZvciBvYmplY3RzLCBpbnZlcnRzIHRoZSBvYmplY3RzIGtleXMvdmFsdWVzLiBJZiB0aGUgdmFsdWUgaXNuJ3QgYSBudW1iZXIgb3IgYXJyYXksIGl0IHdpbGwgYmUgb21pdHRlZC5cbiAgICAgICAgICAgICAgICAgKiBGb3Igc3RyaW5ncywgaXQgd2lsbCByZXZlcnNlIHRoZSBzdHJpbmcuXG4gICAgICAgICAgICAgICAgICogRm9yIG51bWJlciwgaXQgd2lsbCBjb21wdXRlIHRoZSBudW1iZXIncyBpbnZlcnNlIChpLmUuIDEgLyB4KS5cbiAgICAgICAgICAgICAgICAgKiBGb3IgZnVuY3Rpb25zLCBpbnZlcnQgcmV0dXJucyBhIG5ldyBmdW5jdGlvbiB0aGF0IHdyYXBzIHRoZSBnaXZlbiBmdW5jdGlvbiBhbmQgaW52ZXJ0cyBpdCdzIHJlc3VsdC5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7Kn0gVGhlIGludmVyc2UsIGFzIGRlc2NyaWJlZCBhYm92ZS5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBpbnZlcnQ6IGZ1bmN0aW9uIGludmVydCAobykge1xuICAgICAgICAgICAgICAgICAgICBpZihvID09PSBudWxsIHx8IG8gPT09IHVuZGVmaW5lZCkgcmV0dXJuIG87XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnc3RyaW5nJykgICByZXR1cm4gbGlicy5zdHJpbmcucmV2ZXJzZShvKTtcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdudW1iZXInKSAgIHJldHVybiAxIC8gbztcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdib29sZWFuJykgIHJldHVybiAhbztcblxuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHsgcmV0dXJuIGxpYnMub2JqZWN0LmludmVydChvLmFwcGx5KG8sIGFyZ3VtZW50cykpOyB9O1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIG9iaiA9IHt9O1xuICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKG8sIGZ1bmN0aW9uIChpdGVtLCBrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgaXRlbSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZighb2JqW2l0ZW1dKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ialtpdGVtXSA9IGtleTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0bXAgPSBvYmpbaXRlbV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ialtpdGVtXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYmpbaXRlbV0ucHVzaCh0bXAsIGtleSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSZXR1cm5zIHRoZSBtYXhpbXVtIGl0ZW0gaW4gdGhlIG9iamVjdC5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbj19IGZ1bmMgSWYgcGFzc2VkLCB0aGUgZnVuY3Rpb24gd2lsbCBiZSBpbnZva2VkIGZvciBlYWNoIGl0ZW0gaW4gdGhlIG9iamVjdCBjb2xsZWN0aW9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4geyp9IFRoZSBtYXhpbXVtIGl0ZW0gaW4gdGhlIG9iamVjdCBjb2xsZWN0aW9uLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIG1heDogZnVuY3Rpb24gbWF4IChvLCBmdW5jKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKCFvIHx8IHR5cGVvZiBvICE9PSAnb2JqZWN0JykgcmV0dXJuIG87XG4gICAgICAgICAgICAgICAgICAgIGlmKGxpYnMub2JqZWN0LnNpemUobykgPT09IDApIHJldHVybjtcblxuICAgICAgICAgICAgICAgICAgICBpZighKGZ1bmMgaW5zdGFuY2VvZiBGdW5jdGlvbikpIGZ1bmMgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgIHZhciBtYXgsIG1heFZhbHVlO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKCFmdW5jKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXggPSBsaWJzLm9iamVjdC5maXJzdChvKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2gobywgMSwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihpdGVtID49IG1heCkgbWF4ID0gaXRlbTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWF4ICAgICAgPSBsaWJzLm9iamVjdC5maXJzdChvKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heFZhbHVlID0gZnVuYy5jYWxsKG1heCwgbWF4KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChvLCAxLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IGZ1bmMuY2FsbChpdGVtLCBpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZih2YWx1ZSA+PSBtYXhWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXggICAgICA9IGl0ZW07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1heFZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG1heDtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUmV0dXJucyB0aGUga2V5IG9mIHRoZSBpdGVtIHdpdGggdGhlIGhpZ2hlc3QgdmFsdWUgaW4gdGhlIG9iamVjdC5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbj19IGZ1bmMgSWYgcGFzc2VkLCB0aGUgZnVuY3Rpb24gd2lsbCBiZSBpbnZva2VkIGZvciBlYWNoIGl0ZW0gaW4gdGhlIG9iamVjdCBjb2xsZWN0aW9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4geyp9IFRoZSBtYXhpbXVtIGl0ZW0gaW4gdGhlIG9iamVjdCBjb2xsZWN0aW9uLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGtleU9mTWF4OiBmdW5jdGlvbiBrZXlPZk1heCAobywgZnVuYykge1xuICAgICAgICAgICAgICAgICAgICBpZighbyB8fCB0eXBlb2YgbyAhPT0gJ29iamVjdCcpIHJldHVybiBvO1xuICAgICAgICAgICAgICAgICAgICBpZihsaWJzLm9iamVjdC5zaXplKG8pID09PSAwKSByZXR1cm47XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoIShmdW5jIGluc3RhbmNlb2YgRnVuY3Rpb24pKSBmdW5jID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbWF4LCBtYXhWYWx1ZSwgbWF4S2V5O1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKCFmdW5jKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXggICAgPSBsaWJzLm9iamVjdC5maXJzdChvKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heEtleSA9IGxpYnMub2JqZWN0LmtleXMobylbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKG8sIDEsIGZ1bmN0aW9uIChpdGVtLCBrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihpdGVtID49IG1heCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXggICAgPSBpdGVtO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXhLZXkgPSBrZXk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXggICAgICA9IGxpYnMub2JqZWN0LmZpcnN0KG8pO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWF4S2V5ICAgPSBsaWJzLm9iamVjdC5rZXlzKG8pWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWF4VmFsdWUgPSBmdW5jLmNhbGwobWF4LCBtYXgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKG8sIDEsIGZ1bmN0aW9uIChpdGVtLCBrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBmdW5jLmNhbGwoaXRlbSwgaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYodmFsdWUgPj0gbWF4VmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYodmFsdWUgPj0gbWF4VmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1heCAgICAgID0gaXRlbTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1heFZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXhLZXkgICA9IGtleTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBtYXhLZXk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJldHVybnMgdGhlIG1pbmltdW0gaXRlbSBpbiB0aGUgb2JqZWN0LlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9uPX0gZnVuYyBJZiBwYXNzZWQsIHRoZSBmdW5jdGlvbiB3aWxsIGJlIGludm9rZWQgZm9yIGVhY2ggaXRlbSBpbiB0aGUgb2JqZWN0IGNvbGxlY3Rpb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7Kn0gVGhlIG1pbmltdW0gaXRlbSBpbiB0aGUgb2JqZWN0IGNvbGxlY3Rpb24uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgbWluOiBmdW5jdGlvbiBtaW4gKG8sIGZ1bmMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoIW8gfHwgdHlwZW9mIG8gIT09ICdvYmplY3QnKSByZXR1cm4gbztcbiAgICAgICAgICAgICAgICAgICAgaWYobGlicy5vYmplY3Quc2l6ZShvKSA9PT0gMCkgcmV0dXJuO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKCEoZnVuYyBpbnN0YW5jZW9mIEZ1bmN0aW9uKSkgZnVuYyA9IHVuZGVmaW5lZDtcblxuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyAhPT0gJ29iamVjdCcpIHJldHVybiBvO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbWluLCBtaW5WYWx1ZTtcblxuICAgICAgICAgICAgICAgICAgICBpZighZnVuYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWluID0gbGlicy5vYmplY3QuZmlyc3Qobyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKG8sIDEsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoaXRlbSA8PSBtaW4pIG1pbiA9IGl0ZW07XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pbiAgICAgID0gbGlicy5vYmplY3QuZmlyc3Qobyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBtaW5WYWx1ZSA9IGZ1bmMuY2FsbChtaW4sIG1pbik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2gobywgMSwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBmdW5jLmNhbGwoaXRlbSwgaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYodmFsdWUgPD0gbWluVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWluICAgICAgPSBpdGVtO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaW5WYWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBtaW47XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJldHVybnMgdGhlIGtleSBvZiB0aGUgaXRlbSB3aXRoIHRoZSBsb3dlc3QgdmFsdWUgaW4gdGhlIG9iamVjdC5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbj19IGZ1bmMgSWYgcGFzc2VkLCB0aGUgZnVuY3Rpb24gd2lsbCBiZSBpbnZva2VkIGZvciBlYWNoIGl0ZW0gaW4gdGhlIG9iamVjdCBjb2xsZWN0aW9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4geyp9IFRoZSBtaW5pbXVtIGl0ZW0gaW4gdGhlIG9iamVjdCBjb2xsZWN0aW9uLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGtleU9mTWluOiBmdW5jdGlvbiBrZXlPZk1pbiAobywgZnVuYykge1xuICAgICAgICAgICAgICAgICAgICBpZighbyB8fCB0eXBlb2YgbyAhPT0gJ29iamVjdCcpIHJldHVybiBvO1xuICAgICAgICAgICAgICAgICAgICBpZihsaWJzLm9iamVjdC5zaXplKG8pID09PSAwKSByZXR1cm47XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoIShmdW5jIGluc3RhbmNlb2YgRnVuY3Rpb24pKSBmdW5jID0gdW5kZWZpbmVkO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvICE9PSAnb2JqZWN0JykgcmV0dXJuIG87XG4gICAgICAgICAgICAgICAgICAgIHZhciBtaW4sIG1pblZhbHVlLCBtaW5LZXk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoIWZ1bmMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pbiAgICA9IGxpYnMub2JqZWN0LmZpcnN0KG8pO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWluS2V5ID0gbGlicy5vYmplY3Qua2V5cyhvKVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2gobywgMSwgZnVuY3Rpb24gKGl0ZW0sIGtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGl0ZW0gPD0gbWluKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pbiAgICA9IGl0ZW07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pbktleSA9IGtleTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pbiAgICAgID0gbGlicy5vYmplY3QuZmlyc3Qobyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBtaW5WYWx1ZSA9IGZ1bmMuY2FsbChtaW4sIG1pbik7XG4gICAgICAgICAgICAgICAgICAgICAgICBtaW5LZXkgICA9IGxpYnMub2JqZWN0LmtleXMobylbMF07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2gobywgMSwgZnVuY3Rpb24gKGl0ZW0sIGtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IGZ1bmMuY2FsbChpdGVtLCBpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZih2YWx1ZSA8PSBtaW5WYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaW4gICAgICA9IGl0ZW07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pblZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pbktleSAgID0ga2V5O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBtaW5LZXk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFRlc3RzIHdoZXRoZXIgb3Igbm90IHRoZSBvYmplY3QgaGFzIGEgbWV0aG9kIGNhbGxlZCAnbWV0aG9kJy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IG1ldGhvZCBUaGUgbmFtZSBvZiB0aGUgbWV0aG9kIHRvIHRlc3QgZXhpc3RlbmNlIGZvci5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufSBUcnVlIGlmIHRoZSBvYmplY3QgaGFzIGEgZnVuY3Rpb24gY2FsbGVkICdtZXRob2QnLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgaW1wbGVtZW50czogZnVuY3Rpb24gX2ltcGxlbWVudHMgKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IGxpYnMub2JqZWN0LnRvQXJyYXkoYXJndW1lbnRzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGEgICAgPSBhcmdzLnNoaWZ0KCk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoIWEpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3MsIGZ1bmN0aW9uIChtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZighKGFbbV0gaW5zdGFuY2VvZiBGdW5jdGlvbikpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFNhbWUgYXMgT2JqZWN0LmouaW1wbGVtZW50cywgZXhjZXBjdCB3aXRoIGEgaGFzT3duUHJvcGVydHkgY2hlY2suXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBtZXRob2QgVGhlIG5hbWUgb2YgdGhlIG1ldGhvZCB0byB0ZXN0IGV4aXN0ZW5jZSBmb3IuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgb2JqZWN0IGhhcyBpdHMgb3duIGZ1bmN0aW9uIGNhbGxlZCAnbWV0aG9kJywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGltcGxlbWVudHNPd246IGZ1bmN0aW9uIGltcGxlbWVudHNPd24gKG8sIG1ldGhvZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IGxpYnMub2JqZWN0LnRvQXJyYXkoYXJndW1lbnRzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGEgICAgPSBhcmdzLnNoaWZ0KCk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoIWEpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3MsIGZ1bmN0aW9uIChtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZighKGFbbV0gaW5zdGFuY2VvZiBGdW5jdGlvbikgfHwgIW8uaGFzT3duUHJvcGVydHkobWV0aG9kKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgIC8qKiBAdG9kbzogQWRkIHNvbWUgRXJyb3IgdXRpbGl0eSBmdW5jdGlvbnMuLi4gKi9cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGJvb2xlYW46IHtcbiAgICAgICAgICAgICAgICAvKiogQHRvZG86IEFkZCBzb21lIEJvb2xlYW4gdXRpbGl0eSBmdW5jdGlvbnMuLi4gKi9cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHJlZ2V4cDoge1xuICAgICAgICAgICAgICAgIC8qKiBAdG9kbzogQWRkIHNvbWUgUmVnRXhwIHV0aWxpdHkgZnVuY3Rpb25zLi4uICovXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBsaWJzO1xuICAgIH1cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGxpYnM7XG59KCkpO1xuIiwiZXhwb3J0cy5lbmRpYW5uZXNzID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJ0xFJyB9O1xuXG5leHBvcnRzLmhvc3RuYW1lID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0eXBlb2YgbG9jYXRpb24gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiBsb2NhdGlvbi5ob3N0bmFtZVxuICAgIH1cbiAgICBlbHNlIHJldHVybiAnJztcbn07XG5cbmV4cG9ydHMubG9hZGF2ZyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIFtdIH07XG5cbmV4cG9ydHMudXB0aW1lID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gMCB9O1xuXG5leHBvcnRzLmZyZWVtZW0gPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIE51bWJlci5NQVhfVkFMVUU7XG59O1xuXG5leHBvcnRzLnRvdGFsbWVtID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBOdW1iZXIuTUFYX1ZBTFVFO1xufTtcblxuZXhwb3J0cy5jcHVzID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gW10gfTtcblxuZXhwb3J0cy50eXBlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJ0Jyb3dzZXInIH07XG5cbmV4cG9ydHMucmVsZWFzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodHlwZW9mIG5hdmlnYXRvciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuIG5hdmlnYXRvci5hcHBWZXJzaW9uO1xuICAgIH1cbiAgICByZXR1cm4gJyc7XG59O1xuXG5leHBvcnRzLm5ldHdvcmtJbnRlcmZhY2VzXG49IGV4cG9ydHMuZ2V0TmV0d29ya0ludGVyZmFjZXNcbj0gZnVuY3Rpb24gKCkgeyByZXR1cm4ge30gfTtcblxuZXhwb3J0cy5hcmNoID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJ2phdmFzY3JpcHQnIH07XG5cbmV4cG9ydHMucGxhdGZvcm0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnYnJvd3NlcicgfTtcblxuZXhwb3J0cy50bXBkaXIgPSBleHBvcnRzLnRtcERpciA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gJy90bXAnO1xufTtcblxuZXhwb3J0cy5FT0wgPSAnXFxuJztcbiJdfQ==
