(function () {
    'use strict';

    /**
     * Function Identifier.
     * @type {Number}
     */
    var fid = 0,

    /**
     * True if the Node.js environment is loaded, false otherwise.
     * @type {Boolean}
     */
     IS_BROWSER = typeof window !== 'undefined';

    // This provides a way to determine the name of a functiion constructor in a platform agnostic way...
    Object.defineProperty(Function.prototype, '__get_protolib_name__', {
        configurable : false,
        enumerable   : false,
        get          : function () {
            if(typeof this.__protolib_name__ !== 'string') {
                Object.defineProperty(this, '__protolib_name__', {
                    configurable : false,
                    enumberable  : false,
                    writable     : false,
                    value        : typeof this.name === 'string' && this.name ? this.name : 'anonymous:' + fid++
                });
            }
            return this.__protolib_name__;
        }
    });

    var ProtoLib = function (handle) {
        handle = handle || 'p';

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
         * The static library
         */
        libs,

        /**
         * The protolibrary
         */
        libp;

        /**
         * Appends all the library functions to this instance for static use.
         * @return {ProtoLib} The current ProtoLib instance
         */
        function attachLibraryToSelf () {
            for(var i in libs)
                if(libs.hasOwnProperty(i) && !self[i]) self[i] = libs[i];
            return self;
        }

        /**
         * Adds the library methods from the primitive object prototypes.
         * @return {ProtoLib} The current ProtoLib instance
         */
        function applyLibraryToPrototypes () {
            var p, c, obj = {}, i, name,

            addMethod = function addMethod (o, k) { if(!obj[k]) obj[k] = o; };

            if(!attached) {
                attached = true;
                Object.defineProperty(Object.prototype, handle, {
                    configurable : true,
                    enumerable   : false,
                    get          : function () {
                        obj = {}; i = 0;
                        p = Object.getPrototypeOf(this);

                        do { // This will traverse the protoypes of the object, so inherited properties will be made available
                             // to objects down the prototype chain...

                            if(p.constructor) {
                                name = p.constructor.__get_protolib_name__;
                                if(/^anonymous:/.test(name)) name = 'anonymous';

                                if(p && name && typeof name === 'string') {
                                    c = name.toLowerCase();

                                    if(cached[c] && i === 0) {
                                        currentThis = this;
                                        return cached[c];
                                    }
                                    else if(libp[c]) {
                                        currentThis = this;
                                        libs.object.each(libp[c], addMethod);
                                        cached[c] = obj;
                                    }
                                }
                            }

                            i++;
                        } while(p = Object.getPrototypeOf(p)); // jshint ignore:line
                        return obj;
                    }
                });
            }
            return self;
        }

        /**
         * Removes the library methods from the primitive object prototypes.
         * @return {ProtoLib} The current ProtoLib instance
         */
        function removeLibraryFromPrototypes () {
            if(attached) {
                delete Object.prototype[handle];
                attached = false;
            }
            return self;
        }

        /**
         * Retrieves the last item from the 'thisPointerStack' and invokes the provided callback with it.
         * @param {Function} callback The callback to be invoked with the current 'this' value.
         * @return The result of the invocation of the callback.
         */
        function getThisValueAndInvoke (callback) {
            return callback(currentThis !== undefined && currentThis !== null ? currentThis.valueOf() : currentThis);
        }

        libs = require('./lib/libs')();
        libp = require('./lib/libp')(libs, getThisValueAndInvoke);

        /**
         * Sets the handle
         * @param {String} h The new handle
         * @return {ProtoLib} The current ProtoLib instance
         */
        this.setHandle = function (h) {
            if(typeof h === 'string') handle = h;
            removeLibraryFromPrototypes();
            applyLibraryToPrototypes();
            return self;
        };

        /**
         * Adds a library method to a prototype.
         * @param {String} name The name of the library method to add.
         * @param {String=} [proto='object'] The prototype to add to. If omitted, it will default to object.
         * @param {Function} callback The method to add.
         * @return {Boolean} True if the method was added, false otherwise.
         */
        this.extend = function (name, proto, callback) {
            callback = libs.object.last(arguments);

            if(typeof name !== 'string' || !(callback instanceof Function)) return false;
            if(!proto || typeof proto !== 'string') proto = 'object';

            if(!libp[proto]) libp[proto] = {};
            if(!libs[proto]) libs[proto] = {};

            libs[proto][name] = callback;
            libp[proto][name] = function () {
                var args = libs.object.makeArray(arguments);
                return getThisValueAndInvoke(function (c) {
                    args.push(c);
                    return callback.apply(c, args);
                });
            };

            delete cached[proto];
            return true;
        };

        /**
         * Remvoes a library method from a prototype.
         * @param {String} proto The prototype to remove from.
         * @param {String} name The name of the library method to remove.
         * @return {Boolean} True if the method was removed, false otherwise.
         */
        this.remove = function (name, proto) {
            if(typeof proto !== 'string' || typeof name !== 'string') return false;
            if(libp[proto] && libp[proto][name]) delete libp[proto][name];
            if(libs[proto] && libs[proto][name]) delete libs[proto][name];
            delete cached[proto];
            return true;
        };

        /**
         * Removes the prototype library reference from the object prototype.
         * @return {ProtoLib} The current ProtoLib instance
         */
        this.unload = function () {
            removeLibraryFromPrototypes();
            return self;
        };

        // Apply the library to the object prototype, and attach all the static functions
        // to the current ProtoLib instance...
        applyLibraryToPrototypes();
        attachLibraryToSelf();

        // Attach Node.js specific library functions/members...
        if(!IS_BROWSER) require('./lib/NodeAddons')(self);
    };

    var x = new ProtoLib('_');

    return !IS_BROWSER ?
        module.exports  = ProtoLib :
        window.ProtoLib = ProtoLib ;
}());
