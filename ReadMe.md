# ProtoLib
------
**The namespace friendly prototype library**   
*There's nothing wrong with modifying primitive prototypes, as long as you do it right.*   

------
ProtoLib is a fast, node and browser friendly JavaScript library. It "tucks" library methods inside a single, customizable
property attached to *Object.prototype*.

It works in Node.js, Chrome, Firefox, and Safari.
**Untested in IE**

Basically, I got sick of writing library methods over and over, dealing with static methods, and colliding libraries... enter: ProtoLib.

## Features
---
- **Over 100 library methods**
    - See the list below...
- **Collision Free**
    - You define the property attached to *Object.prototype*
    - The default is *_* (underscore), but this can be set to any string.
- **Extensible**
    - ProtoLib allows you to extend that library for any prototype.
    - Extend both custom objects and primitives.
- **Switch the library on and off, on the fly**

## Install
---
```bash
$ npm install protolib --save
```

## Table of Contents
---
1. [Install](#install)
2. [Getting Started](#getting-started)
    - [Browser Use](#browser-use)
3. [Library Methods](#library-methods)
    - [Objects](#objects)
        - [histogram](#histogram)
        - [copy](#copy)
        - [occurrencesOf](#occurrencesof)
        - [keys](#keys)
        - [size](#size)
        - [isNumeric](#isnumeric)
        - [getNumeric](#getnumeric)
        - [isEmpty](#isempty)
        - [isArray](#isarray)
        - [isString](#isstring)
        - [isBoolean](#isboolean)
        - [isFunction](#isfunction)
        - [isNull](#isnull)
        - [isUndefined](#isundefined)
        - [isArguments](#isarguments)
        - [toNumber](#tonumber)
        - [toInt](#toint)
        - [random](#random)
        - [each](#each)
        - [every](#every)
        - [any](#any)
        - [toArray](#toarray)
        - [first](#first)
        - [last](#last)
        - [getCallback](#getcallback)
        - [findChildAtPath](#findchildatpath)
        - [clone](#clone)
        - [only](#only)
        - [where](#where)
        - [whereKeys](#wherekeys)
        - [invert](#invert)
        - [max](#max)
        - [min](#min)
        - [implements](#implements)
        - [implementsOwn](#implementsown)
    - [Strings](#strings)
        - [camelize](#camelize)
        - [decamelize](#decamelize)
        - [differenceFromString](#differencefromstring)
        - [intersectString](#intersectstring)
        - [repeat](#repeat)
        - [rtrim](#rtrim)
        - [ltrim](#ltrim)
        - [htmlEncode](#htmlencode)
        - [htmlDecode](#htmldecode)
        - [addSlashes](#addslashes)
        - [ucFirst](#ucfirst)
        - [lcFirst](#lcfirst)
        - [titleCase](#titlecase)
        - [splice](#splice)
        - [ellipses](#ellipses)
        - [shuffle](#shuffle)
        - [reverse](#reverse)
        - [withoutTrailingSlash](#withouttrailingslash)
        - [withTrailingSlash](#withtrailingslash)
        - [regexpSafe](#regexpsafe)
        - [pad](#pad)
        - [newlineToBreak](#newlinetobreak)
        - [tabsToSpan](#tabstospan)
        - [wordWrapToLength](#wordwraptolength)
    - [Arrays](#arrays)
        - [shuffle](#shuffle)
        - [union](#union)
        - [difference](#difference)
        - [intersect](#intersect)
        - [without](#without)
        - [rotate](#rotate)
        - [rotateLeft](#rotateleft)
        - [rotateRight](#rotateright)
        - [makeUnique](#makeUnique)
        - [unique](#unique)
        - [ascending](#ascending)
        - [descending](#descending)
    - [Functions](#functions)
        - [inherits](#inherits)
    - [Numbers](#numbers)
        - [factorial](#factorial)
        - [choose](#choose)
        - [pad](#pad)
        - [daysFrom](#daysfrom)
        - [daysFromNow](#daysfromnow)
        - [secondsFrom](#secondsfrom)
        - [secondsFromNow](#secondsfromnow)
        - [yearsFrom](#yearsfrom)
        - [yearsFromNow](#yearsfromnow)
        - [monthsFrom](#monthsfrom)
        - [monthsFromNow](#monthsfromnow)
        - [hoursFrom](#hoursfrom)
        - [hoursFromNow](#hoursfromnow)
        - [minutesFrom](#minutesfrom)
        - [minutesFromNow](#minutesfromnow)
        - [monthsAgo](#monthsago)
        - [daysAgo](#daysago)
        - [secondsAgo](#secondsago)
        - [minutesAgo](#minutesago)
        - [yearsAgo](#yearsago)
        - [clockTime](#clocktime)
    - [Date Objects](#date-objects)
        - [advanceDays](#advancedays)
        - [advanceMonths](#advancemonths)
        - [advanceYears](#advanceyears)
        - [yyyymmdd](#yyyymmdd)
        - [clockTime](#clocktime)


## Getting Started
---
```js
// Require the protolib library.
var ProtoLib = require('protolib');

// Create a new instance, specifying the accessor property (e.g. "handle"). This will default to '_' if unspecified.
var lib = new ProtoLib('_');

// That's it!
// All objects now have access to the defined library methods from the '_' property.
var str = 'hello world!';

str._.titleCase() // -> 'Hello World!'
str._.ucFirst()   // -> 'Hello world!'
str._.reverse()   // -> '!dlrow olleh'

// Chaning with ProtoLib:
str._.titleCase()._.reverse()) // ->'!dlroW olleH'
```

**Oh Noes! I'm using a library that uses '_', what can I do?**

```js
var ProtoLib = require('protolib');

// Just instantiate ProtoLib with a different handle.
var lib = new ProtoLib('lib'),
    obj = { foo: 'hello', bar: 'world' };

obj.lib.invert()        // -> { hello: 'foo', world: 'bar' }
   .lib.histogram()     // -> { 'foo': 1, 'bar': 1 }
   .lib.size()          // -> 2
```

### Browser Use
*my-html-file.hmtl*
```html
<script type="text/javascript" src="protolib.min.js"></script>
<script type="text/javascript" src="my-script.js"></script>
```
*my-script.js*
```js
var lib = new window.ProtoLib('_');
var arr = [1, 2, 3, 4];

arr._.rotate('left', 2)                 // -> [3, 4, 1, 2]
arr._.intersect([1, 5, 6], [9, 3, 4])   // -> [3, 4, 1]
arr._.without(4, 1)                     // -> [3]

// Chaining some methods together:
arr = [1, 2, 'hello', 'world', { foo: 'bar' }];

arr._.only('string')                   // -> ['hello', 'world']
   ._.each(function (val, key) {       // -> ['dlrow', 'olleh']
        this[key] = val._.reverse();
   });
```

## Library methods
---

### Objects

#### histogram    
**Returns an object containing the frequencies for each value in the provided arguments.**
For objects (arrays and pure objects), it will count the frequency of values.
For strings, it will count character frequencies. Numbers and functions will be converted using *toString*, and thus treated like strings. Except, for numbers, the result will attempt to parse each value as a number.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **histogram**() |
| static   | **histogram**(*{...\*}* items) |

```js
[1, 2, 3, 4, 1, 1, 1, 5, 5]._.histogram()
// Returns { 1: 4, 2: 1, 3: 1, 4: 1, 5: 2 }

'racecar'._.histogram()
// Returns { r: 2, a: 2, c: 2, e: 1 }

'AAAAaaaa'._.histogram()
// Returns { A: 4, a: 4 }

(1234).histogram()
// Returns { 1: 1, 2: 1, 3: 1, 4: 1 }

(-1234).histogram()
// Returns { '-': 1, 1: 1, 2: 1, 3: 1, 4: 1 }

{ foo: 'bar', hello: 'world', number: 5, five: 5 }._.histogram()
// Returns { bar: 1, world: 1, 5: 2 }

/* Static Use */

lib.object.histogram([1, 2, 3], 'a string', function () {});
// Returns { 1: 1, 2: 1, 3: 1, a: 1, ' ': 1, s: 1, t: 1, r: 1, i: 1, n: 1, g: 1, 'function': 1 }

lib.object.histogram([1, 2, 3, [3, 4, 5], ['a', 'b', 'c']]);
// Returns { 1: 1, 2: 1, 3: 1, array: 2 }
```

#### copy    
**Returns a shallow copy of *item***
For non-objects, the given value is simply returned. For objects, a shallow copy is made.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **copy**() |
| static   | **copy**(*{\*}* item) |

```js
[1, 2, 3, 'a', 'b', 'c']._.copy();
// Returns a copy of the above array.

{ foo: 'bar' }._.copy();
// Returns a copy of the above object.

'hello world'._.copy();
// Returns 'hello world'

/* Static Use */
lib.object.copy(something);
```

#### occurrencesOf   
**Counts the number of occurrences of *what***
For non-objects, the character occurrences are counted; for objects, the occurrences of "what" are counted by reference for object, and value for non-obejcts.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **occurrencesOf**(*{\*}* what) |
| static   | **occurrencesOf**(*{\*}* item, *{\*}* what) |

```js
[1, 1, 1, 1, 3]._.occurrencesOf(1);
// Returns 4

[1, 1, 1, 1, 3]._.occurrencesOf('1');
// Returns 0

{ foo: 'bar', hello: 'world' }._.occurrencesOf('bar');
// Returns 1

'racecar'._.occurrencesOf('r');
// Returns 2

/* Static Use */
lib.object.occurrencesOf(haystack, needle);
```

#### keys    
**Returns the object's keys**
For numbers and functions, this will *always* return an empty array.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **keys**() |
| static   | **keys**(*{\*}* item) |

```js
[1, 1, 1, 1, 3]._.keys();
// Returns ['0', '1', '2', '3', '4']

{ foo: 'bar', baz: 'biz' }._.keys();
// Returns ['foo', 'bar']

'a string'._.keys();
// Returns ['0', '1', '2', '3', '4', '5', '6', '7']

(1234)._.keys();
// Returns []

(function () {})._.keys();
// Returns []

/* Static Use */
lib.object.keys(item);
```

#### size
**Returns the "size" of an object (length).**
For strings, it will return *the string's length*, for numbers: the *number of digits*, for objects: *Object.keys(obj).length*, for arrays: *Array.length*, and for functions: *1*.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **size**() |
| static   | **size**(*{\*}* item) |

```js
[1, 1, 1, 1, 3]._.size();
// Returns 5

{ foo: 'bar', baz: 'biz' }._.size();
// Returns 2

'a string'._.size();
// Returns 8

(1234)._.size();
// Returns 4

(-1234)._.size();
// Returns 5

(function () {})._.size();
// Returns 1

/* Static Use */
lib.object.size(item);
```

#### isNumeric    
**Determines if the object "is numeric".**
Returns true if the object can be parsed as a number and is finite, false otherwise.
If used in the static context, it will return true if and only if all arguments are numeric.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **isNumeric**() |
| static   | **isNumeric**(*{...\*}* items) |

```js
[]._.isNumeric();               // false
{}._.isNumeric();               // false

'string'._.isNumeric();         // false
'1234'._.isNumeric();           // true
'-1234'._.isNumeric();          // true
'1e7'._.isNumeric();            // true
'0xFF'._.isNumeric();           // true

(1234)._.isNumeric();           // true
(-1234)._.isNumeric();          // true
(1e7)._.isNumeric();            // true
(0x64)._.isNumeric();           // true

(function () {})._.isNumeric(); // false

/* Static Use */
lib.object.isNumeric(a, b, c...);
```

#### getNumeric
**Get's the given value's number equivalent.**
Returns the number represented by the given value, or NaN.
If used in the static context, it will return an array with the results for each argument *if more than one argument is supplied*.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **getNumeric**() |
| static   | **getNumeric**(*{...\*}* objs) |

```js
[]._.getNumeric();               // NaN
{}._.getNumeric();               // NaN

'string'._.getNumeric();         // NaN
'1234'._.getNumeric();           // 1234
'-1234'._.getNumeric();          // -1234
'1e7'._.getNumeric();            // 10000000
'0xFF'._.getNumeric();           // 255

(1234)._.getNumeric();           // 1234
(-1234)._.getNumeric();          // -1234
(1e7)._.getNumeric();            // 10000000
(0x64)._.getNumeric();           // 100

(function () {})._.isNumeric();  // NaN

/* Static Use */
lib.object.getNumeric('1', '0xFF', 'hello world', 7); // Returns [1, 255, NaN, 7]
```

#### isEmpty
**Determines if the given objects are "empty".**
That is, if *obj !== null && obj !== undefined*. So zero (0) isn't empty.
For collections, it will assert that the object has a length of more than zero.   

If used in the static context, it will return true if and only if all arguments are empty.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **isEmpty**() |
| static   | **isEmpty**(*{...\*}* objs) |

```js
[]._.isEmpty()                // true
{}._.isEmpty()                // true
[1]._.isEmpty()               // false
{ foo: 1, bar: 2}._.isEmpty() // false
(0)._.isEmpty()               // false
''._.isEmpty()                // true
'hello world'._.isEmpty()     // false
function () {}._.isEmpty()    // false

/* Static Use */
lib.object.isEmpty(0, '', 1, []);    // false
lib.object.isEmpty([], {}, []);      // true
lib.object.isEmpty(null, undefined); // true
```

#### isArray
**Determines if the given objects are all arrays.**
If used in the static context, it will return true if and only if all arguments are arrays.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **isArray**() |
| static   | **isArray**(*{...\*}* objs) |

```js
[]._.isArray()                // true
{}._.isArray()                // false
[1]._.isArray()               // true
{ foo: 1, bar: 2}._.isArray() // false
'hello world'._.isArray()     // false
function () {}._.isArray()    // false

/* Static Use */
lib.object.isArray(0, [], [1, 2, 3]);               // false
lib.object.isArray([], [1, 2, 3], ['a', 'b', 'c']); // true
lib.object.isArray(null, []);                       // false
```

#### isPureObject
**Determines if the given objects are all objects, but not arrays.**
If used in the static context, it will return true if and only if all arguments are "pure objects".

| Context  | Signature        |
| :--------| :--------------- |
| instance | **isPureObject**() |
| static   | **isPureObject**(*{...\*}* objs) |

```js
[]._.isPureObject()                // false
{}._.isPureObject()                // true
[1]._.isPureObject()               // false
{ foo: 1, bar: 2}._.isPureObject() // true
'hello world'._.isPureObject()     // false
function () {}._.isPureObject()    // false

/* Static Use */
lib.object.isPureObject({}, {}, {}); // true
lib.object.isPureObject([], {});     // false
lib.object.isPureObject(null, {});   // false
```

#### isString
**Determines if the given objects are all strings.**
If used in the static context, it will return true if and only if all arguments are strings.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **isString**() |
| static   | **isString**(*{...\*}* objs) |

#### isBoolean
**Determines if the given objects are all booleans.**
If used in the static context, it will return true if and only if all arguments are booleans.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **isBoolean**() |
| static   | **isBoolean**(*{...\*}* objs) |

#### isFunction
**Determines if the given objects are all functions.**
If used in the static context, it will return true if and only if all arguments are functions.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **isFunction**() |
| static   | **isFunction**(*{...\*}* objs) |

#### isNull
**Determines if the given objects are all null.**
If used in the static context, it will return true if and only if all arguments are null.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **isNull**() |
| static   | **isNull**(*{...\*}* objs) |

#### isUndefined
**Determines if the given objects are all undefined.**
If used in the static context, it will return true if and only if all arguments are undefined.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **isUndefined**() |
| static   | **isUndefined**(*{...\*}* objs) |

#### isArguments
**Determines if the given objects are all arguments objects.**
If used in the static context, it will return true if and only if all arguments are Arguments instances.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **isArguments**() |
| static   | **isArguments**(*{...\*}* objs) |

```js
[]._.isArguments()                // false
{}._.isArguments()                // false
[1]._.isArguments()               // false
{ foo: 1, bar: 2}._.isArguments() // false
'hello world'._.isArguments()     // false
function () {}._.isArguments()    // false

(function () {
    arguments._.isArguments()     // true
}());

/* Static Use */

(function () {
    lib.object.isArguments(arguments); // true
}());

lib.object.isArguments([]);            // false
```
