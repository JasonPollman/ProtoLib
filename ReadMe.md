# ProtoLib
------
**The namespace friendly prototype library.**   
*"There's nothing wrong with modifying primitive prototypes, as long as you do it right."*   

------
ProtoLib is a fast, node and browser friendly JavaScript library. It "tucks" library methods inside a single, customizable property attached to *Object.prototype*.

Currently working in Node.js, Chrome, Firefox, and Safari.
**Untested in IE**

Basically, I got sick of writing the same library methods over and over, dealing with static methods, and colliding libraries...   

...Enter ProtoLib.

## Features
---
- **Over 100 library methods**
    - [See the list below...](#available-methods)
- **Collision Free**
    - *You* define the property attached to *Object.prototype*.
    - The default is *_* (underscore), but this can be set to any string.
- **Extensible**
    - ProtoLib allows you to extend the library for any prototype.
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
3. [Available Methods](#available-methods)
    - [Objects](#objects)
    - [Strings](#strings)
    - [Arrays](#arrays)
    - [Functions](#functions)
    - [Numbers](#numbers)
    - [Date Objects](#date-objects)


## Getting Started
---
```js
// Require the protolib library.
var ProtoLib = require('protolib');

// Create a new instance, specifying the accessor property (e.g. "handle").
// This will default to '_' if unspecified.
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
Use ***/dist/protolib.min.js***... */index.js* is for Node.js only.

*my-html-file.hmtl*
```html
<script type="text/javascript" src="path/to/protolib.min.js"></script>
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

## Available Methods
---
| Name                              | Description                      |
| :-------------------------------- | :------------------------------- |
| [**Objects**](#objects)                                              |
| [any](#any)                         | Loops through each item in an object until a *non-undefined* value is returned |
| [clone](#clone)                     | Clones an object using *JSON.stringify* and *JSON.parse* |
| [copy](#copy)                       | Creates a shallow copy of an object |
| [each](#each)                       | Loops through each item in an object, with an optional start and end range |
| [every](#every)                     | Loops through each item in an object until *false* is returned |
| [findChildAtPath](#findchildatpath) | Walks an object's children an returns the child specified by a string path |
| [first](#first)                     | Gets the first *n* items of an object |
| [getCallback](#getcallback)         | Gets the callback (last) value from a set, or returns an empty function |
| [getNumeric](#getnumeric)           | Gets an object's numeric equivalent (or *NaN*) |
| [histogram](#histogram)             | Computes an object's histogram of values |
| [implements](#implements)           | Determines if an object has the given property, and that property is a method |
| [implementsOwn](#implementsown)     | Determines if an object has the given property, and that property is a method which belongs to the object |
| [invert](#invert)                   | Inverts an object's keys and values, or computes the mathematical inverse of a number |
| [isArguments](#isarguments)         | Determines if the given objects are all Arguments objects |
| [isArray](#isarray)                 | Determines if the given objects are all arrays |
| [isBoolean](#isboolean)             | Determines if the given objects are all booleans |
| [isEmpty](#isempty)                 | Determines if the given objects are all empty (not null, not undefined, and not an empty string) |
| [isFunction](#isfunction)           | Determines if the given objects are all functions |
| [isNumeric](#isnumeric)             | Determines if the given objects are all numeric (can be parsed as a number) |
| [isNull](#isnull)                   | Determines if the given objects are all null |
| [isPureObject](#ispureobject)       | Determines if the given objects are all objects (and not arrays) |
| [isString](#isstring)               | Determines if the given objects are all strings |
| [isUndefined](#isundefined)         | Determines if the given objects are all undefined |
| [keys](#keys)                       | Gets an object's key set |
| [last](#last)                       | Gets the last *n* items of an object |
| [max](#max)                         | Finds the maximum value in an object |
| [min](#min)                         | Finds the minimum value in an object |
| [occurrencesOf](#occurrencesof)     | Counts an object's occurrences of the provided arguments |
| [random](#random)                   | Gets a random item from the object |
| [size](#size)                       | Gets the size ("length") of an object |
| [toArray](#toarray)                 | Converts an object to an array |
| [toNumber](#tonumber)               | Gets an object's numeric equivalent (or *NaN*) |
| [toInt](#toint)                     | Gets an object's integer equivalent (or *NaN*) |
| [only](#only)                       | Filters an object by the given types |
| [where](#where)                     | Filters an object using a predicate function |
| [whereKeys](#wherekeys)             | Filters an object by its keys using a predicate function |
| [**Strings**](#strings)                                              |
| [**Arrays**](#arrays)                                                |
| [**Functions**](#functions)                                          |
| [**Numbers**](#numbers)                                              |
| [**Dates**](#dates)                                                  |

**The examples below assume you have set 'lib' to a new instance of protolib and that you're using the default handler ('_'), that is:**

```js
var ProtoLib = require('protolib'),
    lib = new ProtoLib('_');

// Or in the browser...
var lib = new window.ProtoLib('_');
```

### Objects

#### histogram    
**Returns an object containing a frequencies of values.**   
For objects (arrays and pure objects), it will count the frequency of values. For strings, it will count character frequencies. Numbers and functions will be converted using *toString*.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **histogram**() → *{Object<Number>}* |
| static   | **histogram**(*{...\*}* **items**) → *{Object<Number>}* |

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
**Returns a shallow copy of an object**   
For non-objects, the provided value is simply returned. For objects, a shallow copy is made.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **copy**() → *{\*}* |
| static   | **copy**(*{\*}* **item**) → *{\*}* |

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
**Counts the number of occurrences of *what**    
For strings, numbers, and functions, the character occurrences are counted; For objects, the occurrences of "what" are counted by object reference or by value for non-object members.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **occurrencesOf**(*{\*}* **what**) → *{Number}* |
| static   | **occurrencesOf**(*{\*}* **item**, *{\*}* **what**) → *{Number}* |

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
**Returns the object's key set**   
Note: For numbers and functions, this will *always* return an empty array.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **keys**() → *{Array<String>}* |
| static   | **keys**(*{\*}* item) → *{Array<String>}* |

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
For strings, it will return *the string's length*, for numbers: the *number of digits*, for objects: *Object.keys(...).length*, for arrays: *Array.length*, and for functions: *1*.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **size**() → *{Number}* |
| static   | **size**(*{\*}* **item**) → *{Number}* |

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
| instance | **isNumeric**() → *{Boolean}* |
| static   | **isNumeric**(*{...\*}* **items**) → *{Boolean}* |

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
**Get's an object's number equivalent.**   
Returns the number represented by the given value, or *NaN*.   
If used in the static context, it will return an array with the results for each argument *if more than one argument is supplied*.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **getNumeric**() → *{Number|NaN}* |
| static   | **getNumeric**(*{...\*}* **objs**) → *{Number|NaN}* |

```js
[]._.getNumeric();               // NaN
{}._.getNumeric();               // NaN

'string'._.getNumeric();         // NaN
'1234'._.getNumeric();           // 1234
'-1234'._.getNumeric();          // -1234
'-1234.56'._.getNumeric();       // -1234.56
'1e7'._.getNumeric();            // 10000000
'0xFF'._.getNumeric();           // 255

(1234)._.getNumeric();           // 1234
(1234.56)._.getNumeric();        // 1234.56
(-1234)._.getNumeric();          // -1234
(1e7)._.getNumeric();            // 10000000
(0x64)._.getNumeric();           // 100

(function () {})._.isNumeric();  // NaN

/* Static Use */
lib.object.getNumeric('1', '0xFF', 'hello world', 7); // Returns [1, 255, NaN, 7]
lib.object.getNumeric('90'); // Returns 90
```

#### isEmpty
**Determines if the given objects are "empty".**   
That is, if *obj !== null && obj !== undefined && obj !== ''*. **So zero (0) isn't empty.**   
For collections, it will assert that the object has a length of more than zero.    

If used in the static context, it will return true if and only if all arguments are empty.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **isEmpty**() → *{Boolean}* |
| static   | **isEmpty**(*{...\*}* **objs**) → *{Boolean}* |

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
| instance | **isArray**() → *{Boolean}* |
| static   | **isArray**(*{...\*}* **objs**) → *{Boolean}* |

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
| instance | **isPureObject**() → *{Boolean}* |
| static   | **isPureObject**(*{...\*}* **objs**) → *{Boolean}* |

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
| instance | **isString**() → *{Boolean}* |
| static   | **isString**(*{...\*}* **objs**) → *{Boolean}* |

#### isBoolean
**Determines if the given objects are all booleans.**
If used in the static context, it will return true if and only if all arguments are booleans.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **isBoolean**() → *{Boolean}* |
| static   | **isBoolean**(*{...\*}* **objs**) → *{Boolean}* |

#### isFunction
**Determines if the given objects are all functions.**   
If used in the static context, it will return true if and only if all arguments are functions.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **isFunction**() → *{Boolean}* |
| static   | **isFunction**(*{...\*}* **objs**) → *{Boolean}* |

#### isNull
**Determines if the given objects are all null.**   
If used in the static context, it will return true if and only if all arguments are null.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **isNull**() → *{Boolean}* |
| static   | **isNull**(*{...\*}* **objs**) → *{Boolean}* |

#### isUndefined
**Determines if the given objects are all undefined.**   
If used in the static context, it will return true if and only if all arguments are undefined.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **isUndefined**() → *{Boolean}* |
| static   | **isUndefined**(*{...\*}* **objs**) → *{Boolean}* |

#### isArguments
**Determines if the given objects are all arguments objects.**   
If used in the static context, it will return true if and only if all arguments are Arguments instances.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **isArguments**() → *{Boolean}* |
| static   | **isArguments**(*{...\*}* **objs**) → *{Boolean}* |

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

#### toNumber   
*Alias for [getNumeric](#getnumeric)*

#### toInt
**Get's the object's integer equivalent.**   
Returns the integer value represented by the given value(s), or *NaN*.
If used in the static context, it will return an array with the results for each argument *if more than one argument is supplied*.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **toInt**() |
| static   | **toInt**(*{...\*}* **objs**) |

```js
[]._.toInt();               // NaN
{}._.toInt();               // NaN

'string'._.toInt();         // NaN
'1234.12'._.toInt();        // 1234
'-1234.000112'._.toInt();   // -1234
'1e7'._.toInt();            // 10000000
'0xFF'._.toInt();           // 255

(1234.789)._.toInt();       // 1234
(-1234.00012)._.toInt();    // -1234
(1e7)._.toInt();            // 10000000
(0x64)._.toInt();           // 100

(function () {})._.toInt();  // NaN

/* Static Use */
lib.object.toInt('1', '0xFF', 'hello world', 7); // Returns [1, 255, NaN, 7]
```

#### random
**Returns a random item from an array or object, a random digit from a number, or a random character from a string.**   
Functions are cast to strings with *Function.toString*

| Context  | Signature        |
| :--------| :--------------- |
| instance | **random**() → *{\*\}* |
| static   | **random**(*{\*}* **obj**) → *{\*\}* |

```js
[1, 2, 3, 4].random()._.random();         // Could be any of: 1, 2, 3, or 4
{ foo: 'a', bar: 'b', baz: 0 }._.random() // Could be any of: 'a', 'b', 0,
'string'._.random()                       // Could be any of: 's', 't', 'r', 'i', 'n', 'g'

/* Static Use */
lib.object.random([[1, 2, 3], ['a', 'b', 'c'], 9]);
// Returns either one of the arrays or 9
```

#### each
**Invokes the provided callback for "each" item in the collection.**   
For each item in the collection, a callback (*onIteration*) is invoked with the following arguments:
*this* refers to the object being iterated over within the body of *onIteration*.

| Argument               | Definition       |
| :--------------------- | :--------------- |
| {\*} **value**         | The value of the current item being iterated over |
| {String} **key**       | The key of the current item |
| {Number} **iteration** | The current iteration count.<br/>For arrays *key* and *iteration* will be the same. |
| {Function} **exit**    | A function that, when called will break the loop and return the arguments passed to it as an array (or if a single value is passed, the value itself) |
| {*} **parent**         | The object being iterated over. Typically, *this* and *parent* will be equal, however *parent* exists in the event *onIteration* has been bound. If using an arrow function *this* will be lexically block scoped, so *parent* should be used to be safe. |

Functions and Numbers are cast to strings with *Function/Number.toString*.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **each**(*{Number=}* [**startRange**=0], *{Number=}* [**endRange**=obj.length - 1], *{Function}* **onInteration**) → *{\*\|null}* |
| static   | **each**(*{\*}* **obj**, *{Number=}* [**startRange**=0], *{Number=}* [**endRange**=obj.length - 1], *{Function}* **onInteration**)) → *{\*\|null}* |

**Note:** All ranges are inclusive. If *startRange* is greater than *endRange* it will perform a decrementing loop.
```js
var total = 0, keyTotal = 0;
[1, 2, 3, 4, 5]._.each((val, key) => {
    total    += val;
    keyTotal += key.toString();
});
// total    = 15
// keyTotal = '01234'

{ hello: 1, world: 'foo', array: [1, 2, 3] }._.each((val, key, i, exit) => {
    console.log(val + ',' + key + ',' + i);
});
// Logged on 0th iteration: 1, 'hello', 0
// Logged on 1st iteration: 'foo', 'world', 1
// Logged on 2nd iteration: 1,2,3, 'array', 2

var truncated = '';
var result = 'hello world!'._.each((val, key, i, exit) => {
    if(val === ' ') return exit(val);
    truncated += val;
});
// truncated = 'hello'
// result    = ' '

/* Using Ranges */
/* All ranges are inclusive */

var arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
arr._.each(0, 3, function (val, key, i, exit) {
    this[key] *= 7;
});
// arr = [7, 14, 21, 28, 5, 6, 7, 8, 9, 10]

arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
arr._.each(4, 3, function (val, key, i, exit, parent) {
    parent[key] *= 7;
});
// arr = [1, 2, 3, 28, 35, 6, 7, 8, 9, 10]

// If rangeA > rangeB, a decrementing loop will be performed!
arr = ['d', 'l', 'r', 'o', 'w', ' ', 'o', 'l', 'l', 'e', 'h'],
str = '';
arr._.each(10000, 0, function (val, key, i, exit) {
    str += val;
});
// str = 'hello world'

/* Static Use */
var myArray = ['a', 'b', 'c'],
    onInteration = () => { /* Do something... */ }

lib.object.each(myArray, 0, 1 onInteration);
// Iterates through 'a' and 'b', but not 'c'.
```

#### every
**Invokes the provided callback for "every" item in the collection.**   
Loops through each item in the object and calls *onIteration*. If *false* is returned, the loop will break and return *false*, otherwise it will return *true*. This is similar to *Array.every* except that it works for all objects, and will break only on *false* and not a *falsy* return (null, undefined, 0, etc.).
*this* refers to the object being iterated over within the body of *onIteration*.

| Argument               | Definition       |
| :--------------------- | :--------------- |
| {\*} **value**         | The value of the current item being iterated over |
| {String} **key**       | The key of the current item |
| {Number} **iteration** | The current iteration count.<br/>For arrays *key* and *iteration* will be the same. |
| {Function} **exit**    | A function that, when called will break the loop and return the arguments passed to it as an array (or if a single value is passed, the value itself) |
| {*} **parent**         | The object being iterated over. Typically, *this* and *parent* will be equal, however *parent* exists in the event *onIteration* has been bound. If using an arrow function *this* will be lexically block scoped, so *parent* should be used to be safe. |

Functions and Numbers are cast to strings with *Function/Number.toString*.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **every**(*{Function}* **onInteration**) → *{Boolean}* |
| static   | **every**(*{\*}* **obj**, *{Function}* **onInteration**)) → *{Boolean}* |

```js
var obj = { a: 1, b: 2, c: 3 },
    keys = [],
    vals = [];

obj._.every((val, key) => {
    vals.push(val);
    keys.push(key);
});
// vals = [1, 2, 3], keys = ['a', 'b', 'c']

var didLoopThroughAllItems = obj._.every(val => {
    if(val === 3) return false;
});
// didLoopThroughAllItems = false

didLoopThroughAllItems = obj._.every(val => {
    if(val === 999) return false;
});
// didLoopThroughAllItems = true

/* Static Use */
var myArray = ['a', 'b', 'c'],
    onInteration = () => { /* Do something... */ }

lib.object.every(myArray, onInteration);
```

#### any
**Invokes the provided callback for every item in the collection and breaks when any value (other than undefined) is returned.**   
Loops through each item in the object and calls *onIteration*. If a "non-undefined" value is returned, the loop will break and return that value.

| Argument               | Definition       |
| :--------------------- | :--------------- |
| {\*} **value**         | The value of the current item being iterated over |
| {String} **key**       | The key of the current item |
| {Number} **iteration** | The current iteration count.<br/>For arrays *key* and *iteration* will be the same. |
| {Function} **exit**    | A function that, when called will break the loop and return the arguments passed to it as an array (or if a single value is passed, the value itself) |
| {*} **parent**         | The object being iterated over. Typically, *this* and *parent* will be equal, however *parent* exists in the event *onIteration* has been bound. If using an arrow function *this* will be lexically block scoped, so *parent* should be used to be safe. |

Functions and Numbers are cast to strings with *Function/Number.toString*.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **any**(*{Function}* **onInteration**) → *{\*\|undefined}* |
| static   | **any**(*{\*}* **obj**, *{Function}* **onInteration**)) → *{\*\|undefined}* |

```js
var obj = { a: 1, b: 2, c: 3 },
    keys = [],
    vals = [];

obj._.any((val, key) => {
    vals.push(val);
    keys.push(key);
});
// vals = [1, 2, 3], keys = ['a', 'b', 'c']

var result = obj._.any(val => {
    if(val === 3) return val;
});
// result = 3

result = obj._.any(val => {
    if(val === 999) return val;
});
// result = undefined

result = 'hello world'._.any(function (val, key) {
    if(key == 4) return 'got the letter o';
});
// result = 'got the letter o'

/* Static Use */
var myArray = ['a', 'b', 'c'],
    onInteration = () => { /* Do something... */ }

lib.object.any(myArray, onInteration);
```

#### toArray
**Converts an object to an array**   
Useful for converting *arguments* objects to arrays.
If an array is passed, a shallow copy of the array will be returned.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **toArray**() → *{Array<\*>}* |
| static   | **toArray**(*{\*}* **obj**) → *{Array<\*>}* |

```js
var string = 'a string',
    chars  = string._.toArray(); // chars = ['a', ' ', 's', 't', 'r', 'i', 'n', 'g']

var obj = { foo: 1, bar: 2 },
    arr = obj._.toArray(); // arr = [1, 2]

(function () {
    var args = arguments._.toArray();
    // args = [1, 2, 3, 4]
}(1, 2, 3, 4));

/* Static Use */
var converted = lib.object.toArray({ a: [1, 2], b: { foo: 'bar' }});
// converted = [[1, 2], { foo: 'bar' }]
```

#### first
**Returns the first n items of an object**   
If *n* is 1, the first item will be returned. If *n* is more than 1, an array/object of the first *n* items will be returned.
IF a string is passed, a single string will always be returned... in this way it works like *String.slice*.
Strings, numbers and functions will be cast to string using *toString*.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **first**(*{Number=}* [**n**=1]) → *{\*\|Array<\*>\|Object<\*>}* |
| static   | **first**(*{\*}* **obj**, *{Number=}* [**n**=1]) → *{\*\|Array<\*>\|Object<\*>}* |

```js
var string = 'a string',

    first = string._.first(),
    // first = 'a'
    firstFour = string._.first(4);
    // firstTwo = 'a st'

var array = [1, 2, 3, 4],

    arrayFirst = array._.first(),
    // arrayFirst = 1

    arrayFirstThree = array._.first(3);
    // arrayFirstThree = [1, 2, 3]

var object = { foo: 'bar', hello: 'world' },

    objectFirst = object._.first(),
    // objectFirst = 'bar'

    objectFirstThree = object._.first(3);
    // objectFirstThree = { foo: 'bar', hello: 'world' }

/* Static Use */
var staticFirst = lib.object.first([1, 2, 3]);
// staticFirst = 1
```

#### last
**Returns the last n items of an object**   
Works similar to *first*, except it returns the last *n* items, rather than the first *n*,

| Context  | Signature        |
| :--------| :--------------- |
| instance | **last**(*{Number=}* [**n**=1]) → *{\*\|Array<\*>\|Object<\*>}* |
| static   | **last**(*{\*}* **obj**, *{Number=}* [**n**=1]) → *{\*\|Array<\*>\|Object<\*>}* |

#### getCallback
**Always returns a callback**   
If the last item in the object is a function, it will be returned, otherwise an "empty" function is returned. This is useful for ensuring that you always have a valid callback when used against an *arguments* object.

This method is useless against strings, numbers, and functions. It will however, return an "empty" function if called on one.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **getCallback**() → *{Function}* |
| static   | **getCallback**(*{\*}* **obj**) → *{Function}* |

```js
// For this example EMPTY_CALLBACK_REPLACEMENT is a "blank" function.
// EMPTY_CALLBACK_REPLACEMENT === function () {}

var cb = [1, 2, 3, 4].getCallback();         // cb === EMPTY_CALLBACK_REPLACEMENT

cb = [1, 2, 3, function someFunction () {}]; // cb === someFunction
cb = { foo: 'bar', hello: 'world' };         // cb === EMPTY_CALLBACK_REPLACEMENT
cb = { foo: 'bar', hello: () => {} };        // cb === anonymous arrow function

(function (argA, argB, argC) {
    cb = arguments.getCallback();
    // cb === argC === exampleCallbackFunction
}('argA', 'argB', function exampleCallbackFunction () {}));

(function (argA, argB, argC, argD, argE) {
    cb = arguments.getCallback();
    // cb === EMPTY_CALLBACK_REPLACEMENT
    // Since exampleCallbackFunction wasn't the *last* argument,
    // the empty function was assigned to cb.
}('argA', 'argB', function exampleCallbackFunction () {}, 'argD', 'argE'));

/* Static Use */
var staticFirst = lib.object.getCallback(someObject);
```

#### findChildAtPath
**Finds the child of an object specified by the given string path**   
Finds the child specified by the given string "path" and delimiter (default '.') by walking the objects keys.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **findChildAtPath**(*{String}* **path**, {String=} [**delimiter**='.'], {Function=} **done**) → *{\*\|null}* |
| static   | **findChildAtPath**(*{\*}* **obj**, *{String}* **path**, {String=} [**delimiter**='.'], {Function=} **done**) → *{\*\|null}* |

```js
var someObject = {
    a: {
        aa: {
            aaa: 1,
            aab: 'hello'
        },
        ab: {
            aba: 2,
            abb: 'world'
        }
    },
    b: {
        ba: {
            baa: 3,
            bab: 'foo'
        },
        bb: {
            bba: 4,
            bbb: 'bar'
        }
    },
    c: [
        100,
        200,
        {
            example: 'value'
        }
    ]
}

var aa = someObject._.findChildAtPath('a.aa'),
    // Returns the object labeled by 'aa'

    aaa = someObject._.findChildAtPath('a.aa.aaa'),
    // Returns the value labeled by 'aaa' (1)

    bba = someObject._.findChildAtPath('a.bb.bba'),
    // Returns the value labeled by 'bba' (3)

    xxy = someObject._.findChildAtPath('a.bb.xxy'),
    // Returns null

    // Works on arrays too...
    c1 = someObject._.findChildAtPath('c.1'),
    // Returns 200

    c1 = someObject._.findChildAtPath('c.2.example'),
    // Returns 'value'

    d = someObject._.findChildAtPath('d'),
    // Returns null

    xxx = someObject._.findChildAtPath('');
    // Returns someObject

// If a function is passed for parameter *done*, it will be invoked
// with the item at the path, the parent of the item, and the item's key
aa = someObject._.findChildAtPath('a.aa', function (value, parent, key) {
    // this   = someObject
    // value  = { aaa: 1, aab: 'hello' }
    // parent = the object labeled by 'a' above.
    // key    = 'aa'
});

aaa = someObject._.findChildAtPath('a.aa.aaa', function (value, parent, key) {
    // this   = someObject
    // value  = 1
    // parent = the object labeled by 'a.aa' above.
    // key    = 'aaa'
});

/* Static Use */
var child = lib.object.findChildAtPath(someObject, 'somePath');
```

#### clone
**Clones an object using *JSON.stringify* and *JSON.parse***   
Throws an error if the object is circular.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **clone**() → *{\*}* |
| static   | **clone**(*{\*}* **obj**) → *{\*}* |

```js
var foo, bar;

foo = { a: 1, b: 2, c: 3 };
bar = foo._.clone(); // bar = { a: 1, b: 2, c: 3 }

foo = [1, 2, 3, 4, { a: 1, b: 2}];
bar = foo._.clone(); // bar = [1, 2, 3, 4, { a: 1, b: 2}]

/* Static Use */
lib.object.clone(myObject);
```

#### only
**Returns a new object with only the given types**   
Filters an object by the specified list of types ('string', 'number', 'object', 'array', 'function', 'object object'). Any *typeof* type can be used, and multiple arguments can be specified. *object* will return both arrays and objects, *object object* will return only objects, and *array* will filter only arrays.

Plural forms of the types can be used as well.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **only**(*{...String}* **types**) → *{\*}* |
| static   | **only**(*{\*}* **obj**, *{...String}* **types**) → *{\*}* |

```js
var foo, bar;
foo = [1, 2, 3, 'a', 'b', 'c', 4, 5, 6];

bar = foo._.only('numbers');            // bar = [1, 2, 3, 4, 5, 6]
bar = foo._.only('strings');            // bar = ['a', 'b', 'c']
bar = foo._.only('numbers', 'strings'); // bar = [1, 2, 3, 'a', 'b', 'c', 4, 5, 6]

foo = {
    a: [1, 2, 3],
    b: 'a string',
    c: function () {},
    d: null,
    e: { z: 9, y: 8 }
};

bar = foo._.only('object');         // bar = { a: [1, 2, 3], d: null, e: { z: 9, y: 8 } }
bar = foo._.only('array');          // bar = { a: [1, 2, 3] }
bar = foo._.only('object object');  // bar = { d: null, e: { z: 9, y: 8 } }
bar = foo._.only('function');       // bar = { c: function () {} }

// Useless on strings, numbers, and functions...
bar = (5)._.only('string')              // bar = 5
bar = ('hello world')._.only('string')  // bar = 'hello world'
bar = (function () {})._.only('string') // bar = function () {}

/* Static Use */
lib.object.only(myObject, 'typeA', 'typeB', 'typeC'...);
```

#### where
**Returns a new object, filtering by a predicate function**   
Filters an object by using a predicate function. If the predicate returns *true* the item is included in the results. The predicate function will be invoked for each item within the object with the following signature: **onItem** (*{\*}* **item**, *{String}* **key**).

| Context  | Signature        |
| :--------| :--------------- |
| instance | **where**(*{Function}* **predicate**) → *{\*}* |
| static   | **where**(*{\*}* **obj**, *{Function}* **predicate**) → *{\*}* |

```js
var foo, bar;
foo = [1, 2, 3, 4];

bar = foo._.where(item => item > 2); // bar = [3, 4]
bar = foo._.where(item => true);     // bar = [1, 2, 3, 4]

foo = {
    a: [1, 2, 3],
    b: 'a string',
    c: function () {},
    d: null,
    e: { z: 9, y: 8 }
};

bar = foo._.where((item, key) => key === 'a');      // bar = { a: [1, 2, 3] }
bar = foo._.where(function (item, key) {            // bar = { b: 'a string' }
    return typeof item !== 'object' && key !== 'c';
});

/* Static Use */
lib.object.where(myObject, predicateFunction);
```

#### whereKeys
**Returns a new object, filtering an object's keys by a predicate function**   
The same as *where*, except that the predicate function is invoked with the signature: **onItem** (*{String}* **key**, *{\*}* **item**).

| Context  | Signature        |
| :--------| :--------------- |
| instance | **whereKeys**(*{Function}* **predicate**) → *{\*}* |
| static   | **whereKeys**(*{\*}* **obj**, *{Function}* **predicate**) → *{\*}* |

#### invert
**Inverts an object's keys and values.**     
For numbers it computes the mathematical inverse (x<sup>-1</sup>).
For strings, it reverses the string.
For functions, invert returns a new function that wraps the given function and inverts it's result.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **invert**() → *{\*}* |
| static   | **invert**(*{\*}* **obj**) → *{\*}* |

```js
(1)._.invert()     // -> 1
(0)._.invert()     // -> Infinity
(789)._.invert()   // -> ~0.00126742712

[6, 7, 8]._.invert() // -> { 6: 0, 7: 1, 8: 2 }
{ a: 'foo', b: 5 }   // -> { foo: 'a', 5: b }
'string'._.invert()  // -> 'gnirts'
true._.invert()      // -> false

// For functions, invert returns a new function that wraps the
// given function and inverts it's result.
function alwaysTrue = () {
    return true;
}

var alwaysFalse = alwaysTrue._.invert();
alwaysFalse() // -> false

// Under the hood alwaysFalse was turned into something like this...
function () {
    return alwaysTrue.apply(alwaysTrue, arguments)._.invert();
}

/* Static Use */
lib.object.invert(myObject);
```

#### max
**Get's the highest value from an object**   
For numbers, strings, functions, and booleans, the object is simply returned.
An optional predicate function is available to determine the max for objects. The predicate is called with the current value in the collection, whatever is returned from the predicate is used in the evaluation to determine the if the value is the max.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **max**(*{Function=}* **predicate**) → *{\*}* |
| static   | **max**(*{\*}* **obj**, *{Function=}* **predicate**) → *{\*}* |

```js
[1, 4, 7, 5, 99, 1, 2]._.max()          // -> 99
['a', 'e', 'i', 'q', 'b', 'z']._.max()  // -> 'z'
[1, 'a', 4, 'r', 999]._.max()           // -> 999, since 999 > 'r' char code
{ a: 43, b: 123, c: 0 }._.max()         // -> 123

// Predicate example
var data = [
    {
        name: 'foo',
        value: 1
    },
    {
        name: 'bar',
        value: 2
    },
    {
        name: 'baz',
        value: 3
    }
];

var max = data._.max(function (item) {
    return item.value;
});

// max = { name: 'baz', value: 3 }

/* Static Use */
lib.object.max(myObject);
```
#### min
**Get's the lowest value from an object**   
Same as [max](#max), except it returns the minimum value.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **min**(*{Function=}* **predicate**) → *{\*}* |
| static   | **min**(*{\*}* **obj**, *{Function=}* **predicate**) → *{\*}* |

#### implements
**Determines if an object has the given properties, and those properties are methods**   

| Context  | Signature        |
| :--------| :--------------- |
| instance | **implements**(*{String}* **method**) → *{\*}* |
| static   | **implements**(*{\*}* **obj**, *{String}* **method**) → *{\*}* |

```js
var MyClass = function () {
    this.foo = function () {};
    this.bar = 5;
    this.baz = function () {};
};

var x = new MyClass();
x._.implements('foo', 'baz'); // -> true
x._.implements('bar', 'baz'); // -> false, baz is not a method

var y = {
    orange: function () {},
    apple: false
};

y._.implements('orange'); // -> true
y._.implements('apple'); // -> false, apple is not a method

/* Static Use */
lib.object.max(myObject);
```

#### implementsOwn
**Determines if an object has the given properties, and those properties are methods which belongs to the object**   
Same as [implements](#implements), except with added *hasOwnProperty* check.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **implementsOwn**(*{String}* **method**) → *{\*}* |
| static   | **implementsOwn**(*{\*}* **obj**, *{String}* **method**) → *{\*}* |

### Strings

#### camelize
**Converts a string to camel case.**   
Replaces */[^a-z0-9$]/g* and makes the first letter of each word uppercase (except the first, of course).

| Context  | Signature        |
| :--------| :--------------- |
| instance | **camelize**() → *{String}* |
| static   | **camelize**(*{\*}* **myString**) → *{String}* |

```js
var myString = 'hello world!';
myString._.camelize(); // -> 'helloWorld'

"we_don't_like_underscores_in_javascript"._.camelize();
// -> 'weDontLikeUnderscoresInJavascript'
```

#### decamelize
**Converts a camel case string to "somewhat" sentence form.**   

| Context  | Signature        |
| :--------| :--------------- |
| instance | **decamelize**() → *{String}* |
| static   | **decamelize**(*{\*}* **myString**) → *{String}* |

```js
var myString = 'thisIsCamelCased';
myString._.decamelize(); // -> 'this is camel cased'

'interestingBehavior'._.decamelize();
// -> 'interesting behavior'

'interestingBEHAVIOR'._.decamelize();
// -> 'interesting b e h a v i o r'
```
#### repeat
**Repeats a string *n* times.**   

| Context  | Signature        |
| :--------| :--------------- |
| instance | **repeat**() → *{String}* |
| static   | **repeat**(*{\*}* **myString**) → *{String}* |

```js
var myString = 'repeat me ';
myString._.repeat(3); // -> 'repeat me repeat me repeat me '

'*'._.repeat(10);     // -> '**********'
'Racecar'._.repeat(3) // -> 'RacecarRacecarRacecar'

/* Static Use */
lib.string.repeat(myString);
```

#### ltrim
**Left trims whitespace from a string.**   
Functions just like *String.trim*, except only on the left side of the string.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **ltrim**() → *{String}* |
| static   | **ltrim**(*{\*}* **myString**) → *{String}* |

#### rtrim
**Right trims whitespace from a string.**   
Functions just like *String.trim*, except only on the right side of the string.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **rtrim**() → *{String}* |
| static   | **rtrim**(*{\*}* **myString**) → *{String}* |

#### htmlEncode
**Escapes HTML special characters.**   

| Context  | Signature        |
| :--------| :--------------- |
| instance | **htmlEncode**() → *{String}* |
| static   | **htmlEncode**(*{\*}* **myString**) → *{String}* |

```js
var myString = '5 is > 7, but 7 < 9';
myString._.htmlEncode(); // -> '5 is &gt; 7, but 7 is &lt; 9'

/* Static Use */
lib.string.htmlEncode(myString);
```

#### htmlDecode
**Unescapes HTML special characters.**   

| Context  | Signature        |
| :--------| :--------------- |
| instance | **htmlDecode**() → *{String}* |
| static   | **htmlDecode**(*{\*}* **myString**) → *{String}* |

```js
var myString = '5 is &gt; 7, but 7 is &lt; 9';
myString._.htmlDecode(); // -> '5 is > 7, but 7 < 9'

/* Static Use */
lib.string.htmlDecode(myString);
```

#### addSlashes
**Creates an 'eval' safe string, by adding slashes to ", ', \t, \n, \f, \r, and the NULL byte.**   

| Context  | Signature        |
| :--------| :--------------- |
| instance | **addSlashes**() → *{String}* |
| static   | **addSlashes**(*{\*}* **myString**) → *{String}* |

```js
var myString = 'function () { return "hello world!"};';
myString._.addSlashes(); // -> 'function () { return \"hello world!\"};'

/* Static Use */
lib.string.addSlashes(myString);
```

#### ucFirst
**Returns the string with the first letter capitalized.**   

| Context  | Signature        |
| :--------| :--------------- |
| instance | **ucFirst**() → *{String}* |
| static   | **ucFirst**(*{\*}* **myString**) → *{String}* |

```js
var myString = 'hello world!';
myString._.ucFirst(); // -> 'Hello world!'

/* Static Use */
lib.string.ucFirst(myString);
```

#### lcFirst
**Returns the string with the first letter lowercased.**   

| Context  | Signature        |
| :--------| :--------------- |
| instance | **lcFirst**() → *{String}* |
| static   | **lcFirst**(*{\*}* **myString**) → *{String}* |

```js
var myString = 'Hello world!';
myString._.lcFirst(); // -> 'hello world!'

/* Static Use */
lib.string.lcFirst(myString);
```

#### titleCase
**Returns the string in title case.**   

| Context  | Signature        |
| :--------| :--------------- |
| instance | **titleCase**() → *{String}* |
| static   | **titleCase**(*{\*}* **myString**) → *{String}* |

```js
var myString   = 'the quick red fox jumped over the lazy brown dog!',
    titleCased = myString._.titleCase();

// titleCased = 'The Quick Red Fox Jumped Over The Lazy Brown Dog!'

/* Static Use */
lib.string.titleCase(myString);
```
