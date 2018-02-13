var xp;
(function (xp) {
    var Dom;
    (function (Dom) {
        /**
         * Creates a HTML element from string content.
         * @param declaration HTML declaration object {tag, attrs, children}
         * @param selectorSetter Selector/setter dictionary.
         */
        function create(declaration, selectorSetters) {
            var XHTML_NS = 'http://www.w3.org/1999/xhtml';
            var SVG_NS = 'http://www.w3.org/2000/svg';
            var temp = document.createElement('div');
            function traverse(parentNode, d) {
                if (d == null) {
                    return;
                }
                var node;
                if (typeof d === 'string') {
                    node = document.createTextNode(d);
                } else if (d.tag === 'svg') {
                    node = document.createElementNS(SVG_NS, 'svg');
                } else if (parentNode.namespaceURI === XHTML_NS) {
                    node = document.createElement(d.tag);
                } else {
                    node = document.createElementNS(parentNode.namespaceURI, d.tag);
                }
                if (typeof d === 'object') {
                    if (d.attrs) {
                        Object.keys(d.attrs).forEach(function (key) {
                            var value = d.attrs[key];
                            if (value != null && value !== false) {
                                node.setAttribute(key, value === true ? '' : String(value));
                            }
                        });
                    }
                    if (d.children) {
                        d.children.forEach(function (c) {
                            traverse(node, c);
                        });
                    }
                }
                parentNode.appendChild(node);
            }
            traverse(temp, declaration);
            var result = temp.firstElementChild;
            for (var selector in selectorSetters) {
                var el = select(selector, result);
                if (!el) {
                    throw new Error('Selector "' + selector + '" didn\'t return anything.');
                }
                var setter = selectorSetters[selector];
                setter(el);
            }
            return result;
        }
        Dom.create = create;
        /**
         * Returns the first element that matches the selector.
         * @param selector Selector.
         * @param parent Element to start the search from.
         */
        function select(selector, parent) {
            parent = parent || document;
            return parent.querySelector(selector);
        }
        Dom.select = select;
        /**
         * Removes a node.
         * @param node Node to remove.
         */
        function remove(node) {
            if (node.parentNode) {
                return node.parentNode.removeChild(node);
            }
            return node;
        }
        Dom.remove = remove;
    })(Dom = xp.Dom || (xp.Dom = {}));
})(xp || (xp = {}));
var xp;
(function (xp) {
    var Log;
    (function (Log) {
        /**
         * Message importance level.
         */
        (function (HeatLevel) {
            HeatLevel[HeatLevel["Log"] = 1] = "Log";
            HeatLevel[HeatLevel["Info"] = 2] = "Info";
            HeatLevel[HeatLevel["Warn"] = 4] = "Warn";
            HeatLevel[HeatLevel["Error"] = 8] = "Error";
        })(Log.HeatLevel || (Log.HeatLevel = {}));
        var HeatLevel = Log.HeatLevel;
        /**
         * Message domain.
         */
        (function (Domain) {
            Domain[Domain["Misc"] = 16] = "Misc";
            Domain[Domain["Binding"] = 32] = "Binding";
            Domain[Domain["UI"] = 64] = "UI";
            Domain[Domain["Test"] = 128] = "Test";
        })(Log.Domain || (Log.Domain = {}));
        var Domain = Log.Domain;
        /**
         * Configures what output messages will be display.
         */
        Log.DisplayMessages = HeatLevel.Info | HeatLevel.Warn | HeatLevel.Error
            | Domain.Misc | Domain.Binding | Domain.UI | Domain.Test;
        /**
         * Writes a message to console.
         * @param level Importance level.
         * @param domain Domain.
         * @param msgOrAny Message (composite formatting string) or any other item.
         * @param args Arguments to insert into formatting string.
         */
        function write(level, domain, msgOrAny) {
            var args = [];
            for (var _i = 3; _i < arguments.length; _i++) {
                args[_i - 3] = arguments[_i];
            }
            if ((domain & Log.DisplayMessages) > 0
                && (level & Log.DisplayMessages) > 0) {
                var output;
                if (typeof msgOrAny === 'string') {
                    args.unshift(msgOrAny);
                    var output = xp.formatString.apply(null, args);
                }
                else {
                    output = msgOrAny;
                }
                switch (level) {
                    case HeatLevel.Log:
                        console.log(output);
                        break;
                    case HeatLevel.Info:
                        console.info(output);
                        break;
                    case HeatLevel.Warn:
                        console.warn(output);
                        break;
                    case HeatLevel.Error:
                        console.error(output);
                        break;
                    default:
                        throw new Error('Not implemented.');
                }
            }
        }
        Log.write = write;
        // IE 9 HACK
        if (!window.console)
            window.console = {};
        if (!window.console.log)
            window.console.log = function () { };
        if (!window.console.info)
            window.console.info = function () { };
        if (!window.console.warn)
            window.console.warn = function () { };
        if (!window.console.error)
            window.console.error = function () { };
    })(Log = xp.Log || (xp.Log = {}));
})(xp || (xp = {}));
var xp;
(function (xp) {
    /**
     * Replaces each format item in a specified string with values.
     * @param formatStr A composite format string.
     * @param args Arguments to insert into formatting string.
     */
    function formatString(format) {
        var ars = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            ars[_i - 1] = arguments[_i];
        }
        var s = format;
        for (var i = 0; i < ars.length; i++) {
            s = s.replace(new RegExp("\\{" + i + "\\}", "gm"), ars[i]);
        }
        return s;
    }
    xp.formatString = formatString;
    /**
     * Creates a deep copy of an item.
     * Only enumerable properties will be copied.
     * @param item Item to copy.
     */
    function clone(item) {
        var sources = [];
        var results = [];
        var cloneItem = function (item) {
            var index = sources.indexOf(item);
            if (index >= 0) {
                return results[index];
            }
            // Simple types
            var itemType = typeof item;
            if (item === null
                || itemType === 'string'
                || itemType === 'boolean'
                || itemType === 'number'
                || itemType === 'undefined'
                || itemType === 'function') {
                return item;
            }
            else if (item instanceof Object) {
                var result;
                // Date
                if (item instanceof Date) {
                    var d = new Date();
                    d.setDate(item.getTime());
                    result = d;
                }
                else if (item instanceof Array) {
                    var arr = [];
                    for (var i = 0; i < item.length; i++) {
                        arr[i] = cloneItem(item[i]);
                    }
                    result = arr;
                }
                else if (item instanceof xp.ObservableCollection) {
                    var col = new xp.ObservableCollection();
                    for (var i = 0; i < item.length; i++) {
                        col.push(cloneItem(item[i]));
                    }
                    result = col;
                }
                else if (item instanceof xp.ObservableObject) {
                    var obj = {};
                    for (var key in item) {
                        obj[key] = cloneItem(item[key]);
                    }
                    result = xp.observable(obj);
                }
                else if (item instanceof Node) {
                    result = item.cloneNode(true);
                }
                else {
                    var ctor = Object.getPrototypeOf(item).constructor;
                    var instance = new ctor();
                    for (var key in item) {
                        if (item.hasOwnProperty(key)) {
                            instance[key] = cloneItem(item[key]);
                        }
                    }
                    result = instance;
                }
                sources.push(item);
                results.push(result);
                return result;
            }
            else {
                throw new Error('Item type is not supported for cloning.');
            }
        };
        return cloneItem(item);
    }
    xp.clone = clone;
    /**
     * Creates unique identifier.
     */
    function createUuid() {
        // http://www.ietf.org/rfc/rfc4122.txt
        var s = [];
        var hexDigits = "0123456789abcdef";
        for (var i = 0; i < 36; i++) {
            s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
        }
        s[14] = "4"; // bits 12-15 of the time_hi_and_version field to 0010
        s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1); // bits 6-7 of the clock_seq_hi_and_reserved to 01
        s[8] = s[13] = s[18] = s[23] = "-";
        var uuid = s.join("");
        return uuid;
    }
    xp.createUuid = createUuid;
    /**
     * Gets class name of object.
     * @param obj Object.
     */
    function getClassName(obj) {
        var funcNameRegex = /function\s+(.+?)\s*\(/;
        var results = funcNameRegex.exec(obj['constructor'].toString());
        return (results && results.length > 1) ? results[1] : '';
    }
    xp.getClassName = getClassName;
    /**
     * Creates new object by passing arguments to constructor.
     * @param ctor Type of object.
     * @param args Arguments to apply.
     * @returns New object.
     */
    function applyConstructor(ctor, args) {
        // http://stackoverflow.com/a/8843181/4137472
        return new (ctor.bind.apply(ctor, [null].concat(args)));
    }
    xp.applyConstructor = applyConstructor;
    /**
     * Hides type's prototype properties (makes them non-enumerable).
     * @param ctor Type constructor.
     * @param propsToHide
     */
    function hidePrototypeProperties(ctor, propsToHide) {
        var proto = ctor.prototype;
        for (var prop in proto) {
            if (!propsToHide || propsToHide.length === 0 || propsToHide.indexOf(prop) >= 0) {
                var desc = Object.getOwnPropertyDescriptor(proto, prop);
                if (desc && desc.configurable) {
                    desc.enumerable = false;
                    Object.defineProperty(proto, prop, desc);
                }
            }
        }
    }
    xp.hidePrototypeProperties = hidePrototypeProperties;
})(xp || (xp = {}));
var xp;
(function (xp) {
    var Path;
    (function (Path) {
        /**
         * Returns object's property.
         * @param obj Source object.
         * @param path Path to property. If path='', then source object will be returned.
         * @param [throwErr=true] Throws an error if property not found.
         */
        function getPropertyByPath(obj, path, throwErr) {
            if (throwErr === void 0) { throwErr = true; }
            if (!obj) {
                if (throwErr) {
                    throw new Error('Unable to get property by path "' + path + '".');
                }
                else {
                    return void 0;
                }
            }
            path = path.replace(/\[(.+)\]/g, '.$1');
            if (path === '') {
                return obj;
            }
            var parts = path.split('.');
            var current = obj;
            parts.every(function (p) {
                if (current === void 0 || current === null) {
                    if (throwErr) {
                        throw new Error('Unable to get property by path "' + path + '".');
                    }
                    return false;
                }
                current = current[p];
                return true;
            });
            return current;
        }
        Path.getPropertyByPath = getPropertyByPath;
        /**
         * Sets property value by path.
         * @param obj Source object.
         * @param path Path to property.
         * @param value Value.
         * @param [throwErr=true] Throws an error if property not found.
         */
        function setPropertyByPath(obj, path, value, throwErr) {
            if (throwErr === void 0) { throwErr = true; }
            var objPath = getObjectPath(path);
            var obj = getPropertyByPath(obj, objPath, throwErr);
            var propName = getPropertyName(path);
            // TODO: Allow adding properties?
            if (!(propName in obj) && throwErr) {
                throw new Error(xp.formatString('Unable to set property value "{0}" by path "{1}". Property is unreachable.', value, path));
            }
            obj[propName] = value;
        }
        Path.setPropertyByPath = setPropertyByPath;
        /**
         * Gets object path from property path.
         * @param propertyPath Property path.
         */
        function getObjectPath(propertyPath) {
            propertyPath = propertyPath.replace(/\[(.+)\]/g, '.$1');
            var matches = propertyPath.match(/^(.*)\.[^\.]*$/);
            if (matches && matches[1]) {
                return matches[1];
            }
            else {
                return '';
            }
        }
        Path.getObjectPath = getObjectPath;
        /**
         * Gets property name from property path.
         * @param propertyPath Property path.
         */
        function getPropertyName(propertyPath) {
            propertyPath = propertyPath.replace(/\[(.+)\]/g, '.$1');
            var matches = propertyPath.match(/(^.*\.)?([^\.]*)$/);
            if (matches && matches[2]) {
                return matches[2];
            }
            else {
                return '';
            }
        }
        Path.getPropertyName = getPropertyName;
        /**
         * Replaces path indexers with properties.
         * E.g. "obj[value].prop" transforms into "obj.value.prop".
         * @param path Property path.
         */
        function replaceIndexers(path) {
            // Without validation
            //var result = path.replace(indexerRegex, '.$1');
            // With property identifier validation.
            var result = path.replace(indexerRegex, function (match, m1) {
                if (!identifierRegex.test(m1)) {
                    throw new Error(xp.formatString('Wrong property identifier. Property: "{0}". Path: "{1}".', path, m1));
                }
                return '.' + m1;
            });
            return result;
        }
        Path.replaceIndexers = replaceIndexers;
        var indexerRegex = /\[(.+?)\]/g;
        //var identifierRegex = /^[$A-Z_][0-9A-Z_$]*$/i;
        var identifierRegex = /^[0-9A-Z_$]*$/i;
    })(Path = xp.Path || (xp.Path = {}));
})(xp || (xp = {}));
var xp;
(function (xp) {
    /**
     * Key/value dictionary.
     */
    var Dictionary = (function () {
        /**
         * Creates a dictionary.
         */
        function Dictionary(items) {
            this.pairs = items || [];
        }
        /**
         * Gets a value.
         * @param key Key.
         */
        Dictionary.prototype.get = function (key) {
            var found = this.pairs.filter(function (p) { return p.key === key; });
            return found.length > 0 ? found[0].value : void 0;
        };
        /**
         * Sets a value.
         * @param key Key.
         * @param value Value.
         */
        Dictionary.prototype.set = function (key, value) {
            var found = this.pairs.filter(function (t) { return t.key === key; });
            if (found.length > 0) {
                if (value === void 0) {
                    // Remove pair
                    this.pairs.splice(this.pairs.indexOf(found[0]), 1);
                }
                else {
                    // Reset value
                    found[0].value = value;
                }
            }
            else {
                // Add pair
                this.pairs.push({
                    key: key,
                    value: value
                });
            }
        };
        /**
         * Removes a value.
         */
        Dictionary.prototype.remove = function (key) {
            var found = this.pairs.filter(function (t) { return t.key === key; });
            if (found.length > 0) {
                this.pairs.splice(this.pairs.indexOf(found[0]), 1);
            }
        };
        return Dictionary;
    })();
    xp.Dictionary = Dictionary;
})(xp || (xp = {}));
var xp;
(function (xp) {
    /**
     * Event.
     * @param TEventArgs Type of event arguments object.
     */
    var Event = (function () {
        function Event() {
            this.handlers = [];
        }
        /**
         * Adds event handler.
         * @param handler Function which will be called when event happens.
         * @param thisArg Context of handler.
         * @returns Subscription.
         */
        Event.prototype.addHandler = function (handler, thisArg) {
            var subscription = {
                event: this,
                handler: handler,
                scope: thisArg
            };
            if (this.handlers.filter(function (h) { return h.handler === handler; } /* && h.scope === thisArg*/)[0]) {
                throw new Error('Duplicate subscription.');
            }
            this.handlers.push(subscription);
            return subscription;
        };
        /**
         * Removes event handler.
         * @param handler Function to remove.
         * @returns Removed handler.
         */
        Event.prototype.removeHandler = function (handler) {
            var found = this.handlers.filter(function (h) { return h.handler === handler; })[0];
            if (!found) {
                throw new Error('Unable to remove event handler :\n' + handler.toString());
            }
            this.handlers.splice(this.handlers.indexOf(found), 1);
            return found.handler;
        };
        /**
         * Removes all event handlers.
         */
        Event.prototype.removeAllHandlers = function () {
            this.handlers = [];
        };
        /**
         * Determines if the specified handler is already subscribed for an event.
         * @param handler Event handler.
         */
        Event.prototype.hasHandler = function (handler) {
            return this.handlers.filter(function (h) { return h.handler === handler; }).length > 0;
        };
        /**
         * Fires the event.
         * @param args Event arguments.
         */
        Event.prototype.invoke = function (args) {
            this.handlers.forEach(function (item) {
                item.handler.call(item.scope, args);
            });
        };
        return Event;
    })();
    xp.Event = Event;
    /**
     * Simplifies subscription and especially unsubscription of events.
     */
    var EventRegistrar = (function () {
        function EventRegistrar() {
            this.subscriptions = [];
        }
        /**
         * Subscribes specified handlers on events.
         * @param event Event.
         * @param handler Event handler.
         * @param thisArg Handler's scope.
         * @returns Subscription.
         */
        EventRegistrar.prototype.subscribe = function (event, handler, thisArg) {
            var subscription = event.addHandler(handler, thisArg);
            this.subscriptions.push(subscription);
            return subscription;
        };
        /**
         * Unsubscribes specified handlers on events.
         * @param predicate Function to filter subscriptions.
         */
        EventRegistrar.prototype.unsubscribe = function (predicate) {
            var index;
            while ((index = this.subscriptions.indexOf(this.subscriptions.filter(predicate)[0])) >= 0) {
                var s = this.subscriptions[index];
                s.event.removeHandler(s.handler);
                this.subscriptions.splice(index, 1);
            }
        };
        /**
         * Unsubscribes all registered handlers.
         */
        EventRegistrar.prototype.unsubscribeAll = function () {
            this.subscriptions.forEach(function (s) {
                s.event.removeHandler(s.handler);
            });
            this.subscriptions = [];
        };
        return EventRegistrar;
    })();
    xp.EventRegistrar = EventRegistrar;
})(xp || (xp = {}));
var xp;
(function (xp) {
    /**
     * Determines whether object implements INotifier.
     * @param obj Object.
     */
    function isNotifier(obj) {
        return (obj
            && typeof obj === 'object'
            && 'onPropertyChanged' in obj);
    }
    xp.isNotifier = isNotifier;
    /**
     * An object which notifies of it's changes.
     */
    var ObservableObject = (function () {
        /**
         * Creates an object, which notifies of it's properties changes.
         * @param source Source object.
         * @param convertNested Specifies whether to convert nested items into observables. Default is true.
         */
        function ObservableObject(source, convertNested) {
            if (convertNested === void 0) { convertNested = true; }
            this.__initProperties__();
            this.__convertNested__ = convertNested;
            if (source) {
                this.__copySource__(source);
            }
        }
        ObservableObject.prototype.__initProperties__ = function () {
            Object.defineProperty(this, 'onPropertyChanged', {
                configurable: true,
                value: new xp.Event()
            });
            Object.defineProperty(this, '__convertNested__', {
                configurable: true,
                writable: true,
                value: true
            });
        };
        ObservableObject.prototype.__copySource__ = function (source) {
            if (source instanceof ObservableObject) {
                throw new Error('Source object is already observable.');
            }
            if (Array.isArray(source)) {
                throw new Error('Source must not be an array. Use ObservableCollection.');
            }
            if (!(source instanceof Object)) {
                throw new Error('Source must be an object.');
            }
            for (var key in source) {
                // Create notification property
                ObservableObject.extend(this, key, source[key], this.__convertNested__);
            }
        };
        /**
         * Determines whether specified object can be converted into an observable object.
         * @param source Source object.
         */
        ObservableObject.isConvertable = function (source) {
            return (typeof source === 'object'
                && !isNotifier(source)
                && source !== null
                && !(source instanceof Date));
        };
        /**
         * Adds property to INotifier.
         * @param obj Notifier.
         * @param name Name of the property to create.
         * @param value Default value.
         * @param convertToObservable Specifies whether to convert value into observable. Default is true.
         */
        ObservableObject.extend = function (obj, name, value, convertToObservable) {
            if (convertToObservable === void 0) { convertToObservable = true; }
            //
            // Ensure property is not already present.
            if (name in obj) {
                throw new Error('Unable to create notification property. Object already has "' + name + '" property.');
            }
            if (name === 'onPropertyChanged') {
                throw new Error('Unable to create notification property. Reserved name "' + name + '" is used.');
            }
            // Clone date
            if (value instanceof Date) {
                var d = new Date();
                d.setTime(value.getTime());
                value = d;
            }
            //
            // Getters/setters
            var getter = function () {
                return value;
            };
            // NOTE: Check if property is an object.
            // If so -> make it Observable and use observable setter.
            if (convertToObservable && ObservableObject.isConvertable(value)) {
                value = xp.observable(value);
                var setter = function (newObj) {
                    if (ObservableObject.isConvertable(newObj)) {
                        newObj = xp.observable(newObj);
                    }
                    value = newObj;
                    obj.onPropertyChanged.invoke(name);
                };
            }
            else {
                var setter = function (v) {
                    value = v;
                    obj.onPropertyChanged.invoke(name);
                };
            }
            //
            // Define property
            Object.defineProperty(obj, name, {
                get: getter,
                set: setter,
                enumerable: true,
                configurable: true
            });
        };
        return ObservableObject;
    })();
    xp.ObservableObject = ObservableObject;
    xp.hidePrototypeProperties(ObservableObject);
})(xp || (xp = {}));
//
// NOTE: Extend Array interface with move(), attach(),
// detach() methods to prevent bound DOM regeneration
// when moving items within or between collections or
// performing a sort.
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
Object.defineProperties(Array.prototype, {
    move: {
        value: function (from, to) {
            if (from < 0)
                from = this.length + from;
            if (to < 0)
                to = this.length + to;
            if (from > this.length - 1 || to > this.length - 1 || from < 0 || to < 0) {
                throw new Error('Index was out of range.');
            }
            var picked = this.splice(from, 1)[0];
            this.splice(to, 0, picked);
            return this;
        }
    },
    attach: {
        value: function (item, index) {
            this.splice(index, 0, item);
            return this.length;
        }
    },
    detach: {
        value: function (index) {
            return this.splice(index, 1)[0];
        }
    }
});
var xp;
(function (xp) {
    (function (CollectionChangeAction) {
        CollectionChangeAction[CollectionChangeAction["Create"] = 0] = "Create";
        CollectionChangeAction[CollectionChangeAction["Replace"] = 1] = "Replace";
        //Update?
        CollectionChangeAction[CollectionChangeAction["Delete"] = 2] = "Delete";
        //Reset,
        CollectionChangeAction[CollectionChangeAction["Move"] = 3] = "Move";
        CollectionChangeAction[CollectionChangeAction["Attach"] = 4] = "Attach";
        CollectionChangeAction[CollectionChangeAction["Detach"] = 5] = "Detach";
    })(xp.CollectionChangeAction || (xp.CollectionChangeAction = {}));
    var CollectionChangeAction = xp.CollectionChangeAction;
    /**
     * Determines whether object implements ICollectionNotifier.
     * @param obj Object.
     */
    function isCollectionNotifier(obj) {
        return obj && typeof obj === 'object' && 'onCollectionChanged' in obj;
    }
    xp.isCollectionNotifier = isCollectionNotifier;
    /**
     * A collection which notifies of it's changes.
     */
    var ObservableCollection = (function (_super) {
        __extends(ObservableCollection, _super);
        /**
         * Creates a collection which notifies of it's changes.
         * @param collection Source collection.
         * @param convertItems Specifies whether to convert collection items into observables. Default is true.
         */
        function ObservableCollection(collection, convertItems) {
            if (convertItems === void 0) { convertItems = true; }
            _super.call(this, collection, convertItems);
        }
        ObservableCollection.prototype.__initProperties__ = function () {
            var _this = this;
            _super.prototype.__initProperties__.call(this);
            var definePrivateProperty = function (prop, value, writable) {
                Object.defineProperty(_this, prop, {
                    configurable: true,
                    enumerable: false,
                    writable: !!writable,
                    value: value
                });
            };
            definePrivateProperty('onCollectionChanged', new xp.Event());
            definePrivateProperty('inner', [], true);
            definePrivateProperty('sorting', false, true);
            definePrivateProperty('splicing', false, true);
        };
        ObservableCollection.prototype.__copySource__ = function (collection) {
            var _this = this;
            if (collection && (!Array.isArray(collection) || collection instanceof ObservableCollection)) {
                throw new Error('Source must be an array.');
            }
            //this.inner = [];
            if (collection) {
                // Copy collection
                collection.forEach(function (item, i) {
                    _this.add(item, i);
                });
            }
        };
        /**
         * Handles item's addition into collection.
         */
        ObservableCollection.prototype.add = function (item, index, moving) {
            item = this.createNotifierIfPossible(item);
            this.inner.splice(index, 0, item);
            this.appendIndexProperty();
            // Notify
            this.onCollectionChanged.invoke({
                action: moving ?
                    CollectionChangeAction.Attach
                    : CollectionChangeAction.Create,
                newIndex: index,
                newItem: item
            });
            this.onPropertyChanged.invoke('length');
            if (!this.__splicing__) {
                for (var i = index; i < this.inner.length; i++) {
                    this.onPropertyChanged.invoke(i.toString());
                }
            }
        };
        /**
         * Handles item's removal item from collection.
         */
        ObservableCollection.prototype.remove = function (index, moving) {
            var item = this.inner.splice(index, 1)[0];
            this.deleteIndexProperty();
            // Notify
            this.onCollectionChanged.invoke({
                action: moving ?
                    CollectionChangeAction.Detach
                    : CollectionChangeAction.Delete,
                oldIndex: index,
                oldItem: item
            });
            this.onPropertyChanged.invoke('length');
            if (!this.__splicing__) {
                for (var i = index; i < this.inner.length + 1; i++) {
                    this.onPropertyChanged.invoke(i.toString());
                }
            }
            return item;
        };
        // Must be called after inner collection change.
        ObservableCollection.prototype.appendIndexProperty = function () {
            var _this = this;
            var index = this.inner.length - 1;
            Object.defineProperty(this, index.toString(), {
                get: function () { return _this.inner[index]; },
                set: function (value) {
                    value = _this.createNotifierIfPossible(value);
                    // Notify
                    _this.onCollectionChanged.invoke({
                        action: CollectionChangeAction.Replace,
                        oldIndex: index,
                        newIndex: index,
                        oldItem: _this.inner[index],
                        newItem: _this.inner[index] = value
                    });
                    _this.onPropertyChanged.invoke(index.toString());
                },
                enumerable: true,
                configurable: true
            });
        };
        // Must be called after inner collection change.
        ObservableCollection.prototype.deleteIndexProperty = function () {
            delete this[this.inner.length];
        };
        ObservableCollection.prototype.createNotifierIfPossible = function (item) {
            if (this.__convertNested__ && xp.ObservableObject.isConvertable(item)) {
                item = xp.observable(item);
            }
            return item;
        };
        Object.defineProperty(ObservableCollection.prototype, "length", {
            //-----------
            // Properties
            //-----------
            get: function () {
                return this.inner.length;
            },
            enumerable: true,
            configurable: true
        });
        //----------------
        // Mutator methods
        //----------------
        // Extension
        ObservableCollection.prototype.move = function (from, to) {
            this.inner.move(from, to);
            // Notify
            this.onCollectionChanged.invoke({
                action: CollectionChangeAction.Move,
                oldIndex: from,
                newIndex: to,
                oldItem: this.inner[to],
                newItem: this.inner[to]
            });
            if (!this.__sorting__) {
                for (var i = Math.min(from, to); i <= Math.max(from, to); i++) {
                    this.onPropertyChanged.invoke(i.toString());
                }
            }
            return this.inner;
        };
        // Extension
        ObservableCollection.prototype.attach = function (item, index) {
            this.add(item, index, true);
            return this.inner.length;
        };
        // Extension
        ObservableCollection.prototype.detach = function (index) {
            var item = this.remove(index, true);
            return item;
        };
        ObservableCollection.prototype.pop = function () {
            var item = this.remove(this.inner.length - 1);
            return item;
        };
        ObservableCollection.prototype.push = function () {
            var _this = this;
            var items = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                items[_i - 0] = arguments[_i];
            }
            items.forEach(function (item) {
                _this.add(item, _this.inner.length);
            });
            return this.inner.length;
        };
        ObservableCollection.prototype.reverse = function () {
            this.__sorting__ = true;
            var length = this.inner.length;
            for (var i = 0; i < length - 1; i++) {
                this.move(0, length - 1 - i); // Collection notifications are inside move()
            }
            this.__sorting__ = false;
            // Notify of properties changes
            for (var i = 0; i < length; i++) {
                // Middle item was not changed
                if (!(length % 2 === 1 && Math.floor(length / 2) === i)) {
                    this.onPropertyChanged.invoke(i.toString());
                }
            }
            return this.inner;
        };
        ObservableCollection.prototype.shift = function () {
            var item = this.remove(0);
            return item;
        };
        ObservableCollection.prototype.sort = function (compareFn) {
            var _this = this;
            var unsorted = this.inner.slice();
            var sorted = unsorted.slice().sort(compareFn);
            var indicies = unsorted.map(function (v, i) {
                return {
                    old: i,
                    new: sorted.indexOf(v)
                };
            });
            indicies.sort(function (a, b) { return b.new - a.new; });
            for (var i = 0; i < indicies.length; i++) {
                for (var j = i + 1; j < indicies.length; j++) {
                    if (indicies[i].old < indicies[j].old) {
                        indicies[j].old--;
                    }
                }
            }
            this.__sorting__ = true;
            indicies.forEach(function (i) { return i.old !== i.new && _this.move(i.old, i.new); }); // Collection notifications are inside move()
            this.__sorting__ = false;
            // Notify of properties changes
            indicies.forEach(function (i) {
                if (i.new !== i.old) {
                    _this.onPropertyChanged.invoke(i.new.toString());
                }
            });
            return this.inner;
        };
        ObservableCollection.prototype.splice = function (start, deleteCount) {
            //
            // Check
            var _this = this;
            var items = [];
            for (var _i = 2; _i < arguments.length; _i++) {
                items[_i - 2] = arguments[_i];
            }
            if (start === void 0 /* || (items && items.length === 0)*/ /*TypeScript creates an empty Array*/) {
                throw new Error('The specified arguments may lead to unexpected result.');
            }
            if (start < 0)
                start = this.inner.length + start;
            if (start < 0 || start > this.inner.length || deleteCount < 0)
                throw new Error('Index was out of range.');
            deleteCount = isNaN(deleteCount) ? (this.inner.length - start) : deleteCount;
            //
            // Process
            var oldLength = this.inner.length;
            this.__splicing__ = true;
            // Delete
            var deleted = new Array();
            for (var i = 0; i < deleteCount; i++) {
                var item = this.remove(start);
                deleted.push(item);
            }
            if (items) {
                // Add
                var index = start;
                items.forEach(function (item) {
                    _this.add(item, index);
                    index++;
                });
            }
            this.__splicing__ = false;
            // Notify of properties changes
            var addedCount = items ? items.length : 0;
            var newLength = this.inner.length;
            var end = deleteCount === addedCount ? start + addedCount : Math.max(newLength, oldLength);
            for (var i = start; i < end; i++) {
                this.onPropertyChanged.invoke(i.toString());
            }
            return deleted;
        };
        ObservableCollection.prototype.unshift = function () {
            var items = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                items[_i - 0] = arguments[_i];
            }
            this.splice(0, 0, items.length > 1 ? items : items[0]);
            //for (var i = 0; i < items.length; i++) {
            //    this.add(items[i], i);
            //}
            return this.inner.length;
        };
        ObservableCollection.prototype.concat = function () {
            var items = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                items[_i - 0] = arguments[_i];
            }
            return this.inner.concat.apply(this.inner, arguments);
        };
        ObservableCollection.prototype.join = function (separator) { return this.inner.join.apply(this.inner, arguments); };
        ObservableCollection.prototype.slice = function (start, end) { return this.inner.slice.apply(this.inner, arguments); };
        /**
         * Method called by JSON.stringify()
         */
        ObservableCollection.prototype.toJSON = function () {
            return this.inner;
        };
        //toString(): string { return this.inner.toString(); }
        ObservableCollection.prototype.toString = function () { return Object.prototype.toString.call(this); };
        //toString(): string { return '[object Array]'; }
        ObservableCollection.prototype.toLocaleString = function () { return this.inner.toLocaleString(); };
        ObservableCollection.prototype.indexOf = function (searchElement, fromIndex) { return this.inner.indexOf.apply(this.inner, arguments); };
        ObservableCollection.prototype.lastIndexOf = function (searchElement, fromIndex) { return this.inner.lastIndexOf.apply(this.inner, arguments); };
        //------------------
        // Iteration methods
        //------------------
        ObservableCollection.prototype.forEach = function (callbackfn, thisArg) { return this.inner.forEach.apply(this.inner, arguments); };
        ObservableCollection.prototype.every = function (callbackfn, thisArg) { return this.inner.every.apply(this.inner, arguments); };
        ObservableCollection.prototype.some = function (callbackfn, thisArg) { return this.inner.some.apply(this.inner, arguments); };
        ObservableCollection.prototype.filter = function (callbackfn, thisArg) { return this.inner.filter.apply(this.inner, arguments); };
        ObservableCollection.prototype.map = function (callbackfn, thisArg) { return this.inner.map.apply(this.inner, arguments); };
        ObservableCollection.prototype.reduce = function (callbackfn, initialValue) { return this.inner.reduce.apply(this.inner, arguments); };
        ObservableCollection.prototype.reduceRight = function (callbackfn, initialValue) { return this.inner.reduceRight.apply(this.inner, arguments); };
        return ObservableCollection;
    })(xp.ObservableObject);
    xp.ObservableCollection = ObservableCollection;
    xp.hidePrototypeProperties(ObservableCollection);
})(xp || (xp = {}));
var xp;
(function (xp) {
    /**
     * Creates an object or collection, which notifies of it's properties changes.
     * WARNING: Avoid circular references.
     * WARNING: Source properties must be initialized (have some value).
     * New properties may be added using ObservableObject.extend().
     * @param source Source object.
     * @param convertNested Specifies whether to convert nested items into observables. Default is true.
     */
    function observable(source, convertNested) {
        if (convertNested === void 0) { convertNested = true; }
        // Check
        if (xp.isNotifier(source)) {
            throw new Error('Source object is already observable.');
        }
        if (!(typeof source === 'object')) {
            throw new Error('Source must be an object.');
        }
        else if (source instanceof Date) {
            throw new Error('Dates cannot be converted into an observable.');
        }
        // Return
        if (Array.isArray(source)) {
            return new xp.ObservableCollection(source, convertNested);
        }
        else {
            return new xp.ObservableObject(source, convertNested);
        }
    }
    xp.observable = observable;
})(xp || (xp = {}));
var xp;
(function (xp) {
    /**
     * UI control's property bindable expression.
     */
    var Expression = (function () {
        /**
         * Creates control's property bindable expression.
         * @param expression Expression e.g. "{obj.a} * 2 + Math.round({b})".
         */
        function Expression(expression, scope) {
            var _this = this;
            this.sourceSetToken = false; // Prevents multiple evaluations on all bindings reset.
            this.scope = scope;
            Object.defineProperty(this, 'onPropertyChanged', {
                value: new xp.Event()
            });
            // Find paths
            var regex = /\{([^\s\(\)]+?)\}/g;
            var matches = expression.match(regex);
            var propsPaths = [];
            if (matches) {
                for (var i = 0; i < matches.length; i++) {
                    var path = matches[i].replace('{', '').replace('}', '');
                    if (path === '')
                        throw new Error('Empty path binding for expression is not supported. Expression: "' + expression + '"');
                    if (propsPaths.indexOf(path) < 0) {
                        propsPaths.push(path);
                    }
                }
            }
            this.propsPaths = propsPaths;
            // Create function
            var body = expression;
            var params = [];
            this.params = { onPropertyChanged: new xp.Event() };
            this.collectionRegistrations = {};
            propsPaths.forEach(function (p, i) {
                var param = 'p' + i;
                //body = body.replace('{' + p + '}', param); // Doesn't replace all. Regexp?
                body = body.split('{' + p + '}').join(param);
                params.push(param);
                // Add param property
                var fieldName = '_' + param;
                _this.params[fieldName] = null;
                Object.defineProperty(_this.params, param, {
                    get: function () { return _this.params[fieldName]; },
                    set: function (value) {
                        if (_this.collectionRegistrations[param]) {
                            // Unsubscribe from collection changes
                            _this.collectionRegistrations[param].unsubscribeAll();
                            delete _this.collectionRegistrations[param];
                        }
                        if (value !== void 0 && xp.isCollectionNotifier(value)) {
                            // Subscribe for collection changes
                            var registar = new xp.EventRegistrar();
                            var cn = value;
                            registar.subscribe(cn.onCollectionChanged, function (args) {
                                _this.exec();
                            }, _this);
                            _this.collectionRegistrations[param] = registar;
                        }
                        _this.params[fieldName] = value;
                        // Execute function
                        if (!_this.sourceSetToken) {
                            _this.exec();
                        }
                    },
                    enumerable: true,
                    configurable: true
                });
            });
            // NOTE: new Function() and eval() are forbidden in Chrome apps.
            //this.func = new Function(params.join(', '), 'return ' + body + ';');
            //
            // Parse expression
            this.func = function () {
                var scope = {};
                for (var i = 0; i < arguments.length; i++) {
                    scope['p' + i] = arguments[i];
                }
                var result = evaluate(body, scope);
                return result;
            };
            // Create managers
            this.managers = [];
            this.propsPaths.forEach(function (path, i) {
                var manager = new xp.BindingManager(_this.params, params[i], _this.scope, path);
                _this.managers.push(manager);
            });
            // Execute
            this.exec();
        }
        Object.defineProperty(Expression.prototype, "result", {
            /**
             * Gets expression evaluation result.
             */
            get: function () {
                return this.resultField;
            },
            set: function (value) {
                // TODO: Try set source values,
                this.resultField = value;
                this.onPropertyChanged.invoke('result');
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Executes the expression.
         */
        Expression.prototype.exec = function () {
            // Get parameters
            var params = [];
            for (var key in this.params) {
                // TODO: Use "Object.defineProperty" with "enumerable:false"
                // for properties, which should not be listed.
                if (key[0] === 'p') {
                    var p = this.params[key];
                    if (p instanceof xp.ObservableCollection) {
                        p = p.slice();
                    }
                    params.push(p);
                }
            }
            try {
                // Execute
                this.resultField = this.func.apply(null, params);
            }
            catch (e) {
                xp.Log.write(xp.Log.HeatLevel.Warn, xp.Log.Domain.Binding, 'Expression error: ' + e);
                this.resultField = null;
            }
            this.onPropertyChanged.invoke('result');
        };
        /**
         * Resets source and causes expression evaluation.
         * @param scope Source.
         */
        Expression.prototype.resetWith = function (scope) {
            this.sourceSetToken = true;
            this.scope = scope;
            this.managers.forEach(function (m) {
                m.resetWith(scope);
            });
            this.sourceSetToken = false;
            this.exec();
        };
        /**
         * Removes binding.
         * Must be called when target is being disposed or property path changes.
         */
        Expression.prototype.unbind = function () {
            this.managers.forEach(function (m) { return m.unbind(); });
            this.onPropertyChanged.removeAllHandlers();
        };
        return Expression;
    })();
    xp.Expression = Expression;
    xp.hidePrototypeProperties(Expression);
    /**
     * Evaluates an expression.
     * Supports the next operators: ?:, ||, &&, !==, ===, !=, ==, >=, >, <=, <, -, +, /, *, typeof, !, ().
     * @param expression Expression string, eg. "x * (arr.indexOf(x) + 1)".
     * @param scope Object containing expression variables, eg. { x: 2,
     */
    function evaluate(expression, scope) {
        // TODO: Seems to be weird. Needs refactoring, should behave like eval().
        var hideBrackets = function (str) {
            var prev;
            while (prev !== str) {
                prev = str;
                str = str.replace(/\([^\(\)]*\)/g, function ($0) { return new Array($0.length + 1).join(' '); });
            }
            return str;
        };
        var splitLeftRight = function (expr) {
            // Replace strings with whitespaces
            var str = expr.replace(/((".*?")|('.*?'))/g, function ($0, $1) { return new Array($1.length + 1).join(' '); });
            // Replace brackets with whitespaces
            str = hideBrackets(str);
            var index = str.indexOf(this.op);
            if (index < 0) {
                return null;
            }
            else {
                return [
                    expr.slice(0, index),
                    expr.slice(index + this.op.length, expr.length)
                ];
            }
        };
        var splitRight = function (expr) {
            // Replace strings with whitespaces
            var str = expr.replace(/((".*?")|('.*?'))/g, function ($0, $1) { return new Array($1.length + 1).join(' '); });
            // Replace brackets with whitespaces
            str = hideBrackets(str);
            var index = str.indexOf(this.op);
            if (index < 0) {
                return null;
            }
            else {
                return [
                    expr.slice(index + this.op.length, expr.length)
                ];
            }
        };
        //var splitMiddle = function (expr: string) {
        //    if (this.op !== '[]' && this.op !== '()') {
        //        throw new Error('This split fn is not supported for operand "' + this.op + '".');
        //    }
        //    // Replace strings with whitespaces
        //    var str = expr.replace(/((".*?")|('.*?'))/g,($0, $1) => new Array($1.length + 1).join(' '));
        //    var regex = new RegExp('\\' + this.op[0] + '[^\\' + this.op[0] + '\\' + this.op[1] + ']*?\\' + this.op[1]);
        //    var match = str.match(regex);
        //    if (match && match[0]) {
        //        var index = str.indexOf(match[0]);
        //        return [
        //            expr.slice(index + 1, index + match[0].length - 1)
        //        ];
        //    }
        //    else {
        //        return null;
        //    }
        //};
        // Precedence
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence#Table
        var parsers = [
            //{
            //    op: '()',
            //    fn: (a) => a,
            //    split: splitMiddle
            //},
            {
                op: '?:',
                fn: function (a, b, c) { return a ? b : c; },
                split: function (expr) {
                    // Replace strings with whitespaces
                    var str = expr.replace(/((".*?")|('.*?'))/g, function ($0, $1) { return new Array($1.length + 1).join(' '); });
                    // Replace brackets with whitespaces
                    str = hideBrackets(str);
                    var index1 = str.indexOf(this.op[0]);
                    if (index1 < 0) {
                        return null;
                    }
                    else {
                        var index2 = str.indexOf(this.op[1], index1 + 1);
                        if (index2 < 0) {
                            return null;
                        }
                        else {
                            return [
                                expr.slice(0, index1),
                                expr.slice(index1 + 1, index2),
                                expr.slice(index2 + 1, expr.length)
                            ];
                        }
                    }
                }
            },
            {
                op: '||',
                fn: function (a, b) { return a || b; },
                split: splitLeftRight
            }, {
                op: '&&',
                fn: function (a, b) { return a && b; },
                split: splitLeftRight
            }, {
                op: '!==',
                fn: function (a, b) { return a !== b; },
                split: splitLeftRight
            }, {
                op: '===',
                fn: function (a, b) { return a === b; },
                split: splitLeftRight
            }, {
                op: '!=',
                fn: function (a, b) { return a != b; },
                split: splitLeftRight
            }, {
                op: '==',
                fn: function (a, b) { return a == b; },
                split: splitLeftRight
            }, {
                op: '>=',
                fn: function (a, b) { return a >= b; },
                split: splitLeftRight
            }, {
                op: '>',
                fn: function (a, b) { return a > b; },
                split: splitLeftRight
            }, {
                op: '<=',
                fn: function (a, b) { return a <= b; },
                split: splitLeftRight
            }, {
                op: '<',
                fn: function (a, b) { return a < b; },
                split: splitLeftRight
            }, {
                op: '-',
                fn: function (a, b) { return a - b; },
                split: splitLeftRight
            }, {
                op: '+',
                fn: function (a, b) { return a + b; },
                split: splitLeftRight
            }, {
                op: '/',
                fn: function (a, b) { return a / b; },
                split: splitLeftRight
            }, {
                op: '*',
                fn: function (a, b) { return a * b; },
                split: splitLeftRight
            }, {
                op: 'typeof',
                fn: function (a) { return typeof a; },
                split: splitRight
            }, {
                op: '!',
                fn: function (a) { return !a; },
                split: splitRight
            },
        ];
        var parse = function (expr, level) {
            expr = expr.trim();
            if (level === void (0)) {
                level = 0;
            }
            if (level === parsers.length) {
                if (expr[0] === '(' && expr[expr.length - 1] === ')') {
                    return parse(expr.slice(1, expr.length - 1), 0);
                }
                //
                // Return value
                // Boolean
                if (expr === 'true') {
                    return true;
                }
                if (expr === 'false') {
                    return false;
                }
                // Number
                var num = +expr;
                if (expr !== '' && !isNaN(num)) {
                    return num;
                }
                // String
                if (/^(".*")|('.*')$/.test(expr)) {
                    return expr.slice(1, expr.length - 1);
                }
                // Scope variable
                if (expr in scope) {
                    return scope[expr];
                }
                // Global scope variable
                if (expr in window) {
                    return window[expr];
                }
                // Get property
                var firstDotIndex = expr.indexOf('.');
                if (firstDotIndex >= 0) {
                    var varName = expr.slice(0, firstDotIndex);
                    if (!(varName in scope) && !(varName in window)) {
                        throw new Error('Expression scope doesn\'t contain "' + varName + '".');
                    }
                    var value = varName in scope ? scope[varName] : window[varName];
                    var propPath = expr.slice(firstDotIndex + 1, expr.length);
                    var objPath = xp.Path.getObjectPath(propPath);
                    var lastObj = xp.Path.getPropertyByPath(value, objPath, false);
                    if (typeof lastObj !== 'object' || lastObj === null) {
                        xp.Log.write(xp.Log.HeatLevel.Info, xp.Log.Domain.Binding, 'Unable to execute expression: Item supposed to be an object.');
                        // TODO: Throw error?
                        return;
                    }
                    var propName = xp.Path.getPropertyName(propPath);
                    var funcMatch = propName.match(/\((.*)\)$/);
                    if (funcMatch && funcMatch[1]) {
                        // Call function
                        propName = propName.slice(0, funcMatch.index);
                        var paramsStr = funcMatch[1];
                        var params = paramsStr.split(',').map(function (p) { return parse(p); });
                        return lastObj[propName].apply(lastObj, params);
                    }
                    else {
                        return lastObj[propName];
                    }
                }
                else {
                    // Is function?
                    var funcMatch = expr.match(/\((.*)\)$/);
                    if (funcMatch && funcMatch[1]) {
                        // Call function
                        var propName = expr.slice(0, funcMatch.index);
                        var paramsStr = funcMatch[1];
                        var params = paramsStr.split(',').map(function (p) { return parse(p); });
                        return lastObj[propName].apply(lastObj, params);
                    }
                }
                // Couldn't resolve
                throw new Error('Expression scope doesn\'t contain "' + expr + '".');
            }
            // Get parser at current level
            var parser = parsers[level];
            // Split expression
            var parts = parser.split(expr);
            if (!parts) {
                // Not found -> parse at next level
                return parse(expr, level + 1);
            }
            else {
                // Parse parts and evaluate
                var args = [];
                for (var i = 0; i < parts.length; i++) {
                    var arg = parse(parts[i], level);
                    args.push(arg);
                }
                return parser.fn.apply(null, args);
            }
        };
        var result = parse(expression);
        return result;
    }
    xp.evaluate = evaluate;
})(xp || (xp = {}));
var xp;
(function (xp) {
    // TODO: Parameters object.
    // TODO: Option for not updating source
    // for the first time (usually element
    // has no scope when binding occurs)?
    /**
     * Manages the scope data binding for a single property.
     * This manager is hold by target and must exist until
     * target is disposed. Nested source properties are
     * not supposed to be always reachable.
     */
    var BindingManager = (function () {
        /**
         * Creates the scope binding manager.
         * @param target Target.
         * @param targetPropertyPath Target property path.
         * @param scope Scope object.
         * @param path Path to bind to.
         * @param options Options.
         */
        function BindingManager(target, targetPropertyPath, scope, path, defaultValue) {
            //
            // Checks
            if (!targetPropertyPath)
                throw new Error('Target property path is not set.');
            if (!path)
                throw new Error('Unable to bind to empty path.');
            this.target = target;
            this.targetPropertyPath = targetPropertyPath;
            this.scope = scope;
            this.path = path;
            this.defaultValue = defaultValue;
            //
            // Split path into parts
            // TODO: Support for "$parent.path", "$root.path".
            this.pathParts = xp.Path.replaceIndexers(path).split('.');
            if (!this.pathParts || this.pathParts.length < 1) {
                throw new Error(xp.formatString('Wrong binding path: "{0}".', path));
            }
            this.pathParts.forEach(function (part) {
                if (part === '')
                    throw new Error(xp.formatString('Unable to bind to empty path. Path: "{0}".', path));
            });
            // Subscribe for all path changes
            this.registerPathObjects();
            this.updateTarget();
        }
        /**
         * Registers path objects' change handlers.
         * @param [startIndex=0] Path index to start re-initialization from.
         */
        BindingManager.prototype.registerPathObjects = function (startIndex) {
            //
            // Unregister previous replacement handlers
            var _this = this;
            if (startIndex === void 0) { startIndex = 0; }
            if (this.pathObjects) {
                var po = this.pathObjects;
                for (var i = startIndex; i < po.length - 1; i++) {
                    if (xp.isNotifier(po[i].obj)) {
                        po[i].obj.onPropertyChanged.removeHandler(po[i].handler);
                    }
                }
                this.pathObjects.splice(startIndex, po.length - startIndex);
            }
            //
            // Register replacement handlers for path objects
            var parts = this.pathParts;
            if (startIndex === 0) {
                this.pathObjects = [];
            }
            this.pathObjects[startIndex] = {
                obj: startIndex === 0 ?
                    this.scope
                    : xp.Path.getPropertyByPath(this.scope, parts.slice(0, startIndex).join('.'))
            };
            var po = this.pathObjects;
            for (var i = startIndex; i < parts.length; i++) {
                // Property name
                var prop = parts[i];
                po[i].prop = prop;
                var current = po[i].obj;
                if (!current) {
                    break;
                }
                // Next path object
                po[i + 1] = {
                    obj: current[prop]
                };
                //
                // Create property replacement handler
                if (xp.isNotifier(current)) {
                    var handler;
                    if (i == parts.length - 1) {
                        // Only updates the target.
                        handler = (function (propNameToCompare) {
                            return function (prop) {
                                if (prop === propNameToCompare) {
                                    _this.updateTarget();
                                }
                            };
                        })(prop);
                    }
                    else {
                        // Re-registers lower path objects and updates the target.
                        handler = (function (propNameToCompare, indexToReplaceFrom) {
                            return function (prop) {
                                if (prop === propNameToCompare) {
                                    _this.registerPathObjects(indexToReplaceFrom);
                                    _this.updateTarget();
                                }
                            };
                        })(prop, i + 1);
                    }
                    po[i].obj.onPropertyChanged.addHandler(handler, this);
                    po[i].handler = handler;
                }
            }
            this.pathObjects = po;
        };
        /**
         * Resets binding with new binding source (with the same hierarchy).
         * @param scope Scope to sync with.
         */
        BindingManager.prototype.resetWith = function (scope) {
            this.logMessage(xp.formatString('Reset with "{0}".', this.scope));
            this.scope = scope;
            this.registerPathObjects();
            this.updateTarget();
        };
        /**
         * Updates source property.
         */
        BindingManager.prototype.updateSource = function () {
            var value = xp.Path.getPropertyByPath(this.target, this.targetPropertyPath);
            var pathLength = this.pathParts.length;
            var sourceObj = this.pathObjects[pathLength - 1].obj;
            if (typeof sourceObj === 'object' && sourceObj !== null) {
                this.logMessage(xp.formatString('Update source "{0}" property with value "{1}".', this.path, value));
                var sourceProp = this.pathParts[pathLength - 1];
                sourceObj[sourceProp] = value;
            }
            else {
                this.logMessage(xp.formatString('Unable to update source property "{0}". It is unreachable.', this.path));
            }
        };
        /**
         * Updates target property.
         */
        BindingManager.prototype.updateTarget = function () {
            var value = xp.Path.getPropertyByPath(this.scope, this.path, false);
            var path = xp.Path.getObjectPath(this.targetPropertyPath);
            var prop = xp.Path.getPropertyName(this.targetPropertyPath);
            var targetObj = xp.Path.getPropertyByPath(this.target, path);
            if (value !== void 0 && value !== null) {
                this.logMessage(xp.formatString('Update target with "{0}" property value "{1}".', this.path, value));
                targetObj[prop] = value;
            }
            else {
                this.logMessage(xp.formatString('Unable to reach value "{0}". Using default value "{1}".', this.path, this.defaultValue));
                targetObj[prop] = this.defaultValue;
            }
        };
        /**
         * Removes binding.
         * Must be called when target is being disposed or property path changes.
         */
        BindingManager.prototype.unbind = function () {
            this.logMessage('Unbind.');
            if (this.pathObjects) {
                var po = this.pathObjects;
                for (var i = 0; i < po.length - 1; i++) {
                    if (xp.isNotifier(po[i].obj)) {
                        po[i].obj.onPropertyChanged.removeHandler(po[i].handler);
                    }
                }
            }
        };
        BindingManager.prototype.logMessage = function (message) {
            xp.Log.write(xp.Log.HeatLevel.Log, xp.Log.Domain.Binding, 'BM of "{0}#{1}.{2}": {3}', xp.getClassName(this.target), this.target['name'], this.targetPropertyPath, message);
        };
        return BindingManager;
    })();
    xp.BindingManager = BindingManager;
})(xp || (xp = {}));
var xp;
(function (xp) {
    /**
     * Calls a setter function when a single property
     * change occurs. Nested source properties are
     * not supposed to be always reachable.
     */
    var BindingCallManager = (function (_super) {
        __extends(BindingCallManager, _super);
        /**
         * Creates the binding call manager.
         * @param scope Scope object.
         * @param path Path to bind to.
         * @param setterFn Setter function.
         * @param [getterFn] Getter function.
         * @param [defaultValue] Value to use is case when source property is unreachable.
         */
        function BindingCallManager(scope, path, setterFn, getterFn, defaultValue) {
            _super.call(this, (function () {
                // Create an object with getter and setter.
                var target = {};
                Object.defineProperty(target, 'result', {
                    set: function (result) {
                        setterFn(result);
                    },
                    get: function () {
                        if (getterFn) {
                            return getterFn();
                        }
                        return void 0;
                    }
                });
                return target;
            })(), 'result', scope, path, defaultValue);
        }
        return BindingCallManager;
    })(xp.BindingManager);
    xp.BindingCallManager = BindingCallManager;
})(xp || (xp = {}));
var xp;
(function (xp) {
    // TODO: Define properties for model's prototype?
    /**
     * Base observable model.
     */
    var Model = (function () {
        /**
         * Creates an observable model.
         */
        function Model() {
            Object.defineProperty(this, 'onPropertyChanged', {
                enumerable: false,
                configurable: true,
                writable: false,
                value: new xp.Event()
            });
        }
        //-----------------
        // Static functions
        //-----------------
        // TODO: Use Typescript 1.5 decorators for property definitions?
        /**
         * Defines a getter and setter for a model instance, which notifies of it's change.
         * @param obj Model instance.
         * @param prop Property name.
         * @param value Default value. If observable then setted values will be converted to observable.
         * @param opts Model property options. Convertors can be defined here. Enumerable by default.
         */
        Model.property = function (obj, prop, value, opts) {
            opts = opts || {};
            var convertToObservable = opts.convertToObservable || xp.isNotifier(value);
            var convertNested = opts.convertNested || (value instanceof xp.ObservableObject
                ? value['__convertNested__']
                : false);
            if (opts.enumerable === void 0) {
                opts.enumerable = true;
            }
            // Getter
            if (opts.getterConvertor) {
                var getterConvertor = opts.getterConvertor;
                var getter = function () { return getterConvertor(value); };
            }
            else {
                var getter = function () { return value; };
            }
            // Setter
            if (opts.setterConvertor) {
                var setterConvertor = opts.setterConvertor;
                if (convertToObservable) {
                    var setter = function (v) {
                        if (xp.ObservableObject.isConvertable(v)) {
                            v = xp.observable(v, convertNested);
                        }
                        value = setterConvertor(v);
                        obj.onPropertyChanged.invoke(prop);
                    };
                }
                else {
                    var setter = function (v) {
                        value = setterConvertor(v);
                        obj.onPropertyChanged.invoke(prop);
                    };
                }
            }
            else {
                if (convertToObservable) {
                    var setter = function (v) {
                        if (xp.ObservableObject.isConvertable(v)) {
                            v = xp.observable(v, convertNested);
                        }
                        value = v;
                        obj.onPropertyChanged.invoke(prop);
                    };
                }
                else {
                    var setter = function (v) {
                        value = v;
                        obj.onPropertyChanged.invoke(prop);
                    };
                }
            }
            // Define property
            Object.defineProperty(obj, prop, {
                get: getter,
                set: setter,
                configurable: true,
                enumerable: opts.enumerable
            });
        };
        /**
         * Defines a non-enumerable and non-observable field.
         * @param obj Model instance.
         * @param prop Field name.
         * @param value Default value.
         */
        Model.nonEnumerableField = function (obj, field, value) {
            Object.defineProperty(obj, field, {
                enumerable: false,
                configurable: true,
                writable: true,
                value: value
            });
        };
        return Model;
    })();
    xp.Model = Model;
    /**
     * Model property decorator.
     */
    function property(opts) {
        opts = opts || {};
        return function (proto, propName) {
            var convertToObservable = opts.convertToObservable;
            var convertNested = opts.convertNested;
            var enumerable = opts.enumerable === void 0 ? true : opts.enumerable;
            var fieldName = '_' + propName;
            // Getter
            if (opts.getterConvertor) {
                var getterConvertor = opts.getterConvertor;
                var getter = function () { return getterConvertor(this[fieldName]); };
            }
            else {
                var getter = function () { return this[fieldName]; };
            }
            // Setter
            if (opts.setterConvertor) {
                var setterConvertor = opts.setterConvertor;
                if (convertToObservable) {
                    var setter = function (v) {
                        if (xp.ObservableObject.isConvertable(v)) {
                            v = xp.observable(v, convertNested);
                        }
                        this[fieldName] = setterConvertor(v);
                        this.onPropertyChanged.invoke(propName);
                    };
                }
                else {
                    var setter = function (v) {
                        this[fieldName] = setterConvertor(v);
                        this.onPropertyChanged.invoke(propName);
                    };
                }
            }
            else {
                if (convertToObservable) {
                    var setter = function (v) {
                        if (xp.ObservableObject.isConvertable(v)) {
                            v = xp.observable(v, convertNested);
                        }
                        this[fieldName] = v;
                        this.onPropertyChanged.invoke(propName);
                    };
                }
                else {
                    var setter = function (v) {
                        this[fieldName] = v;
                        this.onPropertyChanged.invoke(propName);
                    };
                }
            }
            // Define property
            Object.defineProperty(proto, propName, {
                get: getter,
                set: setter,
                configurable: true,
                enumerable: enumerable
            });
            // Define field
            Object.defineProperty(proto, fieldName, {
                writable: true,
                configurable: true
            });
        };
    }
    xp.property = property;
    ;
})(xp || (xp = {}));
var xp;
(function (xp) {
    /**
     * Data scope. Supports multiple levels and notifies of their changes.
     */
    var Scope = (function () {
        /**
         * Creates a scope.
         * @param source Source object. Should be observable.
         * @param parent Parent scope. Should be observable.
         */
        function Scope(source, parent) {
            var _this = this;
            Object.defineProperty(this, 'onPropertyChanged', {
                value: new xp.Event()
            });
            Object.defineProperty(this, '__registrar__', {
                value: new xp.EventRegistrar()
            });
            //
            // Create property for each source property
            var ownProps = [];
            var settingProp = false;
            var createOwnProperty = function (prop) {
                Object.defineProperty(_this, prop, {
                    enumerable: true,
                    configurable: true,
                    get: function () {
                        return source[prop];
                    },
                    set: function (value) {
                        settingProp = true;
                        source[prop] = value;
                        settingProp = false;
                        _this.onPropertyChanged.invoke(prop);
                    }
                });
                ownProps.push(prop);
            };
            for (var prop in source) {
                createOwnProperty(prop);
            }
            // Subscribe for changes
            if (xp.isNotifier(source)) {
                this.__registrar__.subscribe(source.onPropertyChanged, function (prop) {
                    if (!settingProp) {
                        if (ownProps.indexOf(prop) < 0) {
                            createOwnProperty(prop);
                        }
                        _this.onPropertyChanged.invoke(prop);
                    }
                }, this);
            }
            if (parent) {
                //
                // Create property for each missing parent property
                var parentProps = [];
                var createParentProperty = function (prop) {
                    Object.defineProperty(_this, prop, {
                        enumerable: true,
                        configurable: true,
                        get: function () {
                            return parent[prop];
                        },
                        set: function (value) {
                            settingProp = true;
                            parent[prop] = value;
                            settingProp = false;
                            _this.onPropertyChanged.invoke(prop);
                        }
                    });
                    parentProps.push(prop);
                };
                for (var prop in parent) {
                    if (ownProps.indexOf(prop) < 0) {
                        createParentProperty(prop);
                    }
                }
                // Subscribe for changes
                if (xp.isNotifier(parent)) {
                    this.__registrar__.subscribe(parent.onPropertyChanged, function (prop) {
                        if (!settingProp && ownProps.indexOf(prop) < 0) {
                            if (parentProps.indexOf(prop) < 0) {
                                createParentProperty(prop);
                            }
                            _this.onPropertyChanged.invoke(prop);
                        }
                    }, this);
                }
            }
        }
        // TODO: Automate scope unsubscription or don't care.
        /**
         * Must be called when the scope object is not used anymore.
         * Otherwise source object changes would be reflected.
         */
        Scope.prototype.unsubscribeScopeFromChanges = function () {
            this.__registrar__.unsubscribeAll();
        };
        return Scope;
    })();
    xp.Scope = Scope;
    xp.hidePrototypeProperties(Scope);
})(xp || (xp = {}));
var xp;
(function (xp) {
    // TODO: Serialize and restore circular references (e.g. by "id" like in Inker).
    /**
     * Serializes item to JSON.
     * @param item Item to serialize.
     * @param writeModel Specifies whether to write models prototypes names (adds __xp_model__ property). Default is true.
     * @param replacer A function that transforms the result.
     * @param whiteSpace Specifies whether to add white space into output. Default is " ".
     */
    function serialize(item, writeModel, replacer, whiteSpace) {
        if (writeModel === void 0) { writeModel = true; }
        if (whiteSpace === void 0) { whiteSpace = ' '; }
        return JSON.stringify(item, function (k, v) {
            if (writeModel
                && v !== null
                && typeof v === 'object'
                && !Array.isArray(v)
                && !(Object.getPrototypeOf(v) === Object)) {
                // Add model name
                v['__xp_model__'] = xp.getClassName(v);
            }
            if (replacer) {
                v = replacer(k, v);
            }
            return v;
        }, whiteSpace);
    }
    xp.serialize = serialize;
    /**
     * Deserializes JSON string and restores models.
     * @param json JSON string.
     * @param models Array of models' constructors. Each constructor must be parameterless.
     * @param reviver A function which prescribes how the value is transformed. Is called before model restore.
     */
    function deserialize(json, models, reviver) {
        // Create "name"-"constructor" doctionary.
        var modelsDictionary = {};
        models && models.forEach(function (m) {
            var name = m.toString().match(/^function\s*(.*?)\s*\(/)[1];
            if (name in modelsDictionary) {
                throw new Error('Duplicate model name: "' + name + '".');
            }
            modelsDictionary[name] = m;
        });
        return JSON.parse(json, function (k, v) {
            if (reviver) {
                v = reviver(k, v);
            }
            if (typeof v === 'object' && v !== null && '__xp_model__' in v) {
                if (v['__xp_model__'] === 'ObservableObject' || v['__xp_model__'] === 'ObservableCollection') {
                    // Create observable
                    delete v['__xp_model__'];
                    return xp.observable(v);
                }
                //
                // Restore model
                var ctor = modelsDictionary[v['__xp_model__']];
                if (!ctor) {
                    throw new Error('No costructor specified for model "' + v['__xp_model__'] + '".');
                }
                var model = new ctor();
                for (var prop in v) {
                    if (prop !== '__xp_model__') {
                        model[prop] = v[prop];
                    }
                }
                return model;
            }
            return v;
        });
    }
    xp.deserialize = deserialize;
})(xp || (xp = {}));
var xp;
(function (xp) {
    function createEventArgs(control, domEventObject) {
        var rect = control.domElement.getBoundingClientRect();
        var e = {
            domEvent: domEventObject,
            element: control
        };
        if ('pageX' in domEventObject) {
            e.elementX = domEventObject.pageX - rect.left;
        }
        if ('pageY' in domEventObject) {
            e.elementY = domEventObject.pageY - rect.top;
        }
        return e;
    }
    xp.createEventArgs = createEventArgs;
})(xp || (xp = {}));
var xp;
(function (xp) {
    /**
     * UI element.
     */
    var Element = (function (_super) {
        __extends(Element, _super);
        /**
         * Creates UI element.
         */
        function Element(markup) {
            var _this = this;
            _super.call(this);
            /*internal*/ this.__isRendered__ = false;
            /**
             * Handles parent context change.
             */
            this.parentScopeChangeHandler = function () {
                if (_this.useParentScope) {
                    var scopeBinding = _this.bindings.get('scope');
                    if (!scopeBinding) {
                        // Use parent's scope
                        _this.scope = _this.parent.scope;
                    }
                    else {
                        // Update context binding
                        scopeBinding.resetWith(_this.parent.scope);
                    }
                }
            };
            /**
             * Specifies whether element should use parent data scope.
             */
            this.useParentScope = true;
            this.initElement();
            if (markup) {
                this.applyMarkup(markup);
            }
            this.init && this.init(this);
        }
        /**
         * Initializes UI element.
         */
        Element.prototype.initElement = function () {
            this.defineProperties();
            this.domElement = this.getTemplate();
            this.initEvents();
            this.setDefaults();
        };
        /**
         * Returns element's template.
         */
        Element.prototype.getTemplate = function () {
            //return document.createElement('div');
            throw new Error('Unable to create an instance of an abstract element.');
        };
        /**
         * Renders an element into DOM.
         * @param domElement Target DOM element to be replaced with control.
         */
        Element.prototype.renderTo = function (domElement) {
            domElement.parentElement.replaceChild(this.domElement, domElement);
            this.__setRenderedState__(true);
        };
        /*internal*/ Element.prototype.__setRenderedState__ = function (rendered) {
            this.__isRendered__ = rendered;
            if (rendered && this.onRendered)
                this.onRendered.invoke(this);
        };
        /**
         * Initializes control's events.
         */
        Element.prototype.initEvents = function () {
            var _this = this;
            this.bindings = new xp.Dictionary();
            this.expressions = new xp.Dictionary();
            // Control's events
            this.onScopeChanged = new xp.Event();
            this.onRendered = new xp.Event();
            this.onClick = new xp.Event();
            this.onDoubleClick = new xp.Event();
            this.onMouseDown = new xp.Event();
            this.onMouseUp = new xp.Event;
            this.onMouseMove = new xp.Event();
            this.onMouseEnter = new xp.Event();
            this.onMouseLeave = new xp.Event();
            this.onKeyPress = new xp.Event();
            this.onKeyDown = new xp.Event();
            this.onKeyUp = new xp.Event();
            // Unregister events on remove?
            this.onRemoved = new xp.Event();
            this.onRemoved.addHandler(function () {
                _this.onScopeChanged.removeAllHandlers();
                _this.onRendered.removeAllHandlers();
                _this.onClick.removeAllHandlers();
                _this.onDoubleClick.removeAllHandlers();
                _this.onMouseDown.removeAllHandlers();
                _this.onMouseUp.removeAllHandlers();
                _this.onMouseMove.removeAllHandlers();
                _this.onMouseEnter.removeAllHandlers();
                _this.onMouseLeave.removeAllHandlers();
                _this.onKeyPress.removeAllHandlers();
                _this.onKeyDown.removeAllHandlers();
                _this.onKeyUp.removeAllHandlers();
            }, this);
            // DOM events
            this.initSimpleDomEvent('click', this.onClick);
            this.initSimpleDomEvent('dblclick', this.onDoubleClick);
            this.initSimpleDomEvent('mousedown', this.onMouseDown);
            this.initSimpleDomEvent('mouseup', this.onMouseUp);
            this.initSimpleDomEvent('mousemove', this.onMouseMove);
            // TODO: Fix mouseenter and mouseleave events.
            //this.initSimpleDomEvent('mouseenter', this.onMouseEnter);
            //this.initSimpleDomEvent('mouseleave', this.onMouseLeave);
            this.initSimpleDomEvent('mouseover', this.onMouseEnter);
            this.initSimpleDomEvent('mouseout', this.onMouseLeave);
            this.initSimpleDomEvent('keypress', this.onKeyPress);
            this.initSimpleDomEvent('keydown', this.onKeyDown);
            this.initSimpleDomEvent('keyup', this.onKeyUp);
        };
        Element.prototype.initSimpleDomEvent = function (eventName, event) {
            var _this = this;
            this.domElement.addEventListener(eventName, function (e) {
                var args = xp.createEventArgs(_this, e);
                event.invoke(args);
            });
        };
        //--------------
        //   PROPERTIES
        //--------------
        Element.prototype.applyMarkup = function (markup) {
            for (var prop in markup) {
                // Check for binding
                var value = markup[prop];
                if (typeof value === 'string') {
                    var binding = value.match(/^\{(.*)\}$/);
                    var expression = value.match(/^\((.*)\)$/);
                    if (binding && binding[1]) {
                        this.bind(prop, binding[1]);
                    }
                    else if (expression && expression[1]) {
                        this.express(prop, expression[1]);
                    }
                    else {
                        this[prop] = value;
                    }
                }
                else {
                    if (this[prop] instanceof xp.Event) {
                        this[prop].addHandler(markup[prop], this);
                    }
                    else {
                        this[prop] = value;
                    }
                }
            }
        };
        /**
         * Defines a single property.
         * @param prop Property name.
         * @param options Property options.
         */
        Element.prototype.defineProperty = function (prop, options) {
            var _this = this;
            var value;
            Object.defineProperty(this, prop, {
                enumerable: true,
                configurable: true,
                get: function () {
                    if (options.getter) {
                        return options.getter();
                    }
                    return value;
                },
                set: function (v) {
                    if (options.acceptedValues && options.acceptedValues.indexOf(v) < 0) {
                        throw new Error(xp.formatString('The value "{0}" is not accepted for a {1}. List of accepted values: {2}.', v, xp.getClassName(_this), options.acceptedValues.join(', ')));
                    }
                    if (options.setter) {
                        options.setter(v);
                    }
                    value = v;
                    if (options.observable) {
                        _this.onPropertyChanged.invoke(prop);
                    }
                }
            });
        };
        /**
         * Defines element's properties.
         */
        Element.prototype.defineProperties = function () {
            var _this = this;
            this.defineProperty('enabled', {
                setter: function (value) {
                    if (value) {
                        _this.domElement.classList.remove('disabled');
                        _this.domElement.style.pointerEvents = '';
                    }
                    else {
                        _this.domElement.classList.add('disabled');
                        _this.domElement.style.pointerEvents = 'none';
                    }
                },
                observable: true
            });
            this.defineProperty('name', {
                setter: function (value) { return _this.domElement.id = value; },
                getter: function () { return _this.domElement.id; }
            });
            this.defineProperty('key', {});
            this.defineProperty('width', {
                setter: function (value) { return _this.domElement.style.width = value; },
                getter: function () { return _this.domElement.offsetWidth + 'px'; }
            });
            this.defineProperty('height', {
                setter: function (value) { return _this.domElement.style.height = value; },
                getter: function () { return _this.domElement.offsetHeight + 'px'; }
            });
            this.defineProperty('minWidth', {
                setter: function (value) { return _this.domElement.style.minWidth = value; },
                getter: function () { return _this.domElement.style.minWidth; }
            });
            this.defineProperty('minHeight', {
                setter: function (value) { return _this.domElement.style.minHeight = value; },
                getter: function () { return _this.domElement.style.minHeight; }
            });
            this.defineProperty('maxWidth', {
                setter: function (value) { return _this.domElement.style.maxWidth = value; },
                getter: function () { return _this.domElement.style.maxWidth; }
            });
            this.defineProperty('maxHeight', {
                setter: function (value) { return _this.domElement.style.maxHeight = value; },
                getter: function () { return _this.domElement.style.maxHeight; }
            });
            this.defineProperty('margin', {
                setter: function (value) { return _this.domElement.style.margin = value; },
                getter: function () { return _this.domElement.style.margin; }
            });
            var style = '';
            this.defineProperty('style', {
                getter: function () { return style; },
                setter: function (value) {
                    // Remove prev
                    if (style) {
                        var classes = style.split(' ');
                        classes.forEach(function (c) { return _this.domElement.classList.remove(c); });
                    }
                    // Set new
                    style = value;
                    var classes = value.split(' ');
                    classes.forEach(function (c) { return _this.domElement.classList.add(c); });
                }
            });
            this.defineProperty('flex', {
                setter: function (flex) {
                    _this.domElement.classList.remove('flex-None');
                    _this.domElement.classList.remove('flex-Stretch');
                    _this.domElement.classList.remove('flex-Grow');
                    _this.domElement.classList.remove('flex-Shrink');
                    switch (flex) {
                        case 'none':
                            _this.domElement.classList.add('flex-None');
                            break;
                        case 'stretch':
                            _this.domElement.classList.add('flex-Stretch');
                            break;
                        case 'grow':
                            _this.domElement.classList.add('flex-Grow');
                            break;
                        case 'shrink':
                            _this.domElement.classList.add('flex-Shrink');
                            break;
                        default:
                            throw new Error('Unknown flex value "' + flex + '".');
                    }
                },
                acceptedValues: ['none', 'shrink', 'grow', 'stretch']
            });
            this.defineProperty('visible', {
                setter: function (value) {
                    if (value) {
                        _this.domElement.classList.remove('hidden');
                    }
                    else {
                        _this.domElement.classList.add('hidden');
                    }
                },
                // TODO: Determine if element is really visible?
                //getter: !this.domElement.classList.contains('hidden');
                observable: true
            });
        };
        /**
         * Sets default values.
         */
        Element.prototype.setDefaults = function () {
            this.enabled = true;
            this.visible = true;
        };
        Object.defineProperty(Element.prototype, "parent", {
            //------------
            //  RELATIONS
            //------------
            /**
             * Gets element's parent.
             */
            get: function () {
                return this._parent;
            },
            enumerable: true,
            configurable: true
        });
        /*internal*/ Element.prototype.__setParent__ = function (parent) {
            if (parent && parent.children.indexOf(this) < 0)
                throw new Error('The "parent" property must be set only by parent.');
            if (this._parent) {
                this._parent.onScopeChanged.removeHandler(this.parentScopeChangeHandler);
            }
            this._parent = parent;
            if (parent) {
                this._parent.onScopeChanged.addHandler(this.parentScopeChangeHandler, this);
                this.parentScopeChangeHandler();
                if (!this.__isRendered__ && parent.__isRendered__)
                    // Mark as rendered
                    this.__setRenderedState__(true);
            }
        };
        /**
         * Removes element.
         */
        Element.prototype.remove = function () {
            this.detach();
            this.bindings.pairs.forEach(function (p) { return p.value.unbind(); });
            this.bindings.pairs.splice(0);
            this.expressions.pairs.forEach(function (p) { return p.value.unbind(); });
            this.expressions.pairs.splice(0);
            // DOM
            xp.Dom.remove(this.domElement);
            this.onRemoved.invoke(this);
            this.onRemoved.removeAllHandlers();
        };
        /**
         * Inserts element before target element.
         * @param target Target element.
         */
        Element.prototype.insertBefore = function (target) {
            if (!target.parent) {
                throw new Error('Target element has no parent.');
            }
            var index;
            if (this.parent === target.parent) {
                var from = this.parent.children.indexOf(this);
                var to = this.parent.children.indexOf(target);
                index = from < to ? to - 1 : to;
            }
            else {
                index = target.parent.children.indexOf(target);
            }
            target.parent.insert(this, index);
        };
        /**
         * Inserts element after target element.
         * @param target Target element.
         */
        Element.prototype.insertAfter = function (target) {
            if (!target.parent) {
                throw new Error('Target element has no parent.');
            }
            var index;
            if (this.parent === target.parent) {
                var from = this.parent.children.indexOf(this);
                var to = this.parent.children.indexOf(target);
                index = from < to ? to : to + 1;
            }
            else {
                index = target.parent.children.indexOf(target) + 1;
            }
            target.parent.insert(this, index);
        };
        /**
         * Adds an element at container's end.
         * @param container Container element.
         */
        Element.prototype.appendTo = function (container) {
            container.append(this);
        };
        /**
         * Adds an element at container's beginning.
         * @param container Container element.
         */
        Element.prototype.prependTo = function (container) {
            container.prepend(this);
        };
        /*
         * Detaches the element, but doesn't remove it.
         */
        Element.prototype.detach = function () {
            if (this.parent) {
                this.parent.detachChild(this);
            }
        };
        /**
         * Bubbles up through all parents invoking a function.
         * Stops when function returns 'truthy' value.
         * @param fn Function to execute on each parent.
         * @returns Element which lead to returning 'truthy' value.
         */
        Element.prototype.bubbleBy = function (fn) {
            var current = this;
            while (current) {
                if (!!fn(current) === true) {
                    return current;
                }
                current = current.parent;
            }
            return null;
        };
        /**
         * Sets the focus to this element.
         */
        Element.prototype.focus = function () {
            this.domElement.focus();
        };
        /**
         * Binds control's property to source property.
         * @param setter Control's property name or a function.
         * @param path Source property name.
         * @param source Binding source object. If not specified the element's scope will be used.
         * @param defaultValue Value to use is case when source property is null or undefined.
         */
        Element.prototype.bind = function (setter, path, source, defaultValue) {
            var binding = this.bindings.get(setter);
            if (binding) {
                // Unsubscribe from prev changes
                binding.unbind();
            }
            if (setter === '' || path === '') {
                throw new Error('Binding path cannot be empty.');
            }
            if (setter === 'scope' && !this.useParentScope && !source) {
                throw new Error('Unable to bind element\'s scope to itself.');
            }
            if (!source) {
                if (this.useParentScope) {
                    if (this.parent) {
                        source = this.parent.scope;
                    }
                }
                else {
                    source = this.scope;
                }
            }
            if (typeof setter === 'string') {
                this.bindings.set(setter, new xp.BindingManager(this, setter, source, path, defaultValue));
            }
            else {
                this.bindings.set(setter, new xp.BindingCallManager(source, path, setter, null, defaultValue));
            }
        };
        /**
         * Unbinds control property from data context.
         * @param setter Name of the property to unbind, or a reference to a setter.
         */
        Element.prototype.unbind = function (setter) {
            var binding = this.bindings.get(setter);
            if (binding) {
                binding.unbind();
                this.bindings.remove(setter);
            }
            var expr = this.expressions.get(setter);
            if (expr) {
                expr.unbind();
                this.expressions.remove(setter);
            }
        };
        /**
         * Binds control's property to expression.
         * @param controlProperty Control's property name.
         * @param expression Expression e.g. "{obj.a} * 2 + Math.round({b})".
         * @param [source] Binding source object.
         */
        Element.prototype.express = function (setter, expression, source) {
            var _this = this;
            var expr = this.expressions.get(setter);
            if (expr) {
                expr.unbind();
            }
            expr = new xp.Expression(expression, source || this.scope);
            this.expressions.set(setter, expr);
            if (typeof setter === 'string') {
                this.bindings.set(setter, new xp.BindingManager(this, setter, expr, 'result'));
            }
            else {
                this.bindings.set(setter, new xp.BindingCallManager(expr, 'result', function (result) { return setter(result, _this); }));
            }
        };
        Object.defineProperty(Element.prototype, "scope", {
            /**
             * Get's or sets control's data scope.
             */
            get: function () {
                return this._scope;
            },
            set: function (scope) {
                var _this = this;
                if (this.bindings.get('scope') && scope !== this.parent.scope)
                    scope = new xp.Scope(scope, this.parent.scope);
                xp.Log.write(xp.Log.HeatLevel.Log, xp.Log.Domain.UI | xp.Log.Domain.Binding, '{0}:{1}: Set data scope "{2}".', xp.getClassName(this), this.name || '-', scope);
                this._scope = scope;
                this.bindings.pairs.forEach(function (p) {
                    var setter = p.key;
                    var binding = p.value;
                    if (setter !== 'scope' && !_this.expressions.get(setter)) {
                        binding.resetWith(scope);
                    }
                });
                this.expressions.pairs.forEach(function (p) {
                    var setter = p.key;
                    var expr = p.value;
                    if (setter !== 'scope') {
                        expr.resetWith(scope);
                    }
                });
                this.onScopeChanged.invoke(scope);
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Is invoked when user performs an input action.
         * @param setter Target control property or setter.
         * @param value Value, that user inputs.
         */
        Element.prototype.onInput = function (setter, value) {
            xp.Log.write(xp.Log.HeatLevel.Log, xp.Log.Domain.UI, '{0}:{1}.{2}: Input "{3}".', xp.getClassName(this), this.name || '-', setter, value);
            if (typeof setter === 'string') {
                xp.Path.setPropertyByPath(this, setter, value);
            }
            else {
                setter(value);
            }
            var binding = this.bindings.get(setter);
            if (binding) {
                // TODO: Does it cause double control property change?
                binding.updateSource();
            }
        };
        return Element;
    })(xp.Model);
    xp.Element = Element;
})(xp || (xp = {}));
var xp;
(function (xp) {
    /**
     * Simple button.
     */
    var Button = (function (_super) {
        __extends(Button, _super);
        function Button(markup) {
            _super.call(this, markup);
        }
        //----
        // DOM
        //----
        Button.prototype.getTemplate = function () {
            var _this = this;
            return xp.Dom.create({
                tag: 'button',
                attrs: { class: 'Button', type: 'button' },
                children: [
                    {
                        tag: 'span',
                        attrs: { class: 'wrapper' },
                        children: [
                            { tag: 'span', attrs: { class: 'icon' } },
                            { tag: 'span', attrs: { class: 'text' } }
                        ]
                    }
                ]
            }, {
                    '.icon': function (el) { return _this.iconElement = el; },
                    '.text': function (el) { return _this.textElement = el; }
                });
        };
        //-----------
        // PROPERTIES
        //-----------
        Button.prototype.setDefaults = function () {
            _super.prototype.setDefaults.call(this);
            this.icon = null;
            this.text = '';
        };
        Button.prototype.defineProperties = function () {
            var _this = this;
            _super.prototype.defineProperties.call(this);
            var prevIcon;
            this.defineProperty('icon', {
                // NOTE: If starts with ".", then class will be added.
                // Otherwise background image URL will be set.
                // If "*", then icon element will hold space, but no image will be set.
                setter: function (pathOrClass) {
                    if (typeof pathOrClass === 'string' && pathOrClass !== '') {
                        // Remove prev icon
                        if (prevIcon) {
                            if (prevIcon[0] === '.') {
                                _this.iconElement.classList.remove(prevIcon.slice(1));
                            }
                            else {
                                _this.iconElement.style.backgroundImage = '';
                            }
                        }
                        // Set new icon
                        pathOrClass = pathOrClass.trim();
                        if (pathOrClass !== '*') {
                            if (pathOrClass[0] === '.') {
                                _this.iconElement.classList.add(pathOrClass.slice(1));
                            }
                            else {
                                _this.iconElement.style.backgroundImage = xp.formatString('url({0})', pathOrClass);
                            }
                            prevIcon = pathOrClass;
                        }
                        _this.iconElement.classList.remove('hidden');
                    }
                    else {
                        // Hide icon element
                        _this.iconElement.classList.add('hidden');
                    }
                }
            });
            this.defineProperty('text', {
                setter: function (text) {
                    if (!!text === true) {
                        // Set text
                        _this.textElement.textContent = text;
                        _this.textElement.classList.remove('hidden');
                    }
                    else {
                        _this.textElement.classList.add('hidden');
                    }
                }
            });
        };
        return Button;
    })(xp.Element);
    xp.Button = Button;
})(xp || (xp = {}));
var xp;
(function (xp) {
    /**
     * Check box input.
     */
    var CheckBox = (function (_super) {
        __extends(CheckBox, _super);
        function CheckBox(markup) {
            _super.call(this, markup);
        }
        //----
        // DOM
        //----
        CheckBox.prototype.getTemplate = function () {
            var _this = this;
            return xp.Dom.create({
                tag: 'label',
                attrs: { class: 'CheckBox' },
                children: [
                    {
                        tag: 'input',
                        attrs: { type: 'checkbox' },
                    },
                    {
                        tag: 'span',
                        attrs: { class: 'check' },
                    },
                    {
                        tag: 'label',
                        attrs: { class: 'text' },
                    }
                ]
            }, {
                    'input': function (el) { return _this.checkElement = el; },
                    '.text': function (el) { return _this.textElement = el; }
                });
        };
        CheckBox.prototype.initEvents = function () {
            var _this = this;
            _super.prototype.initEvents.call(this);
            this.onCheckChange = new xp.Event();
            this.onRemoved.addHandler(function () { return _this.onCheckChange.removeAllHandlers(); }, this);
            // On check change input
            this.domElement.addEventListener('change', function (e) {
                if (!_this.readonly) {
                    _this.onInput('checked', _this.checked);
                    var args = xp.createEventArgs(_this, e);
                    args.checked = _this.checked;
                    _this.onCheckChange.invoke(args);
                }
            });
        };
        //-----------
        // PROPERTIES
        //-----------
        CheckBox.prototype.setDefaults = function () {
            _super.prototype.setDefaults.call(this);
            this.checked = false;
            this.readonly = false;
            this.text = '';
        };
        CheckBox.prototype.defineProperties = function () {
            var _this = this;
            _super.prototype.defineProperties.call(this);
            this.defineProperty('checked', {
                getter: function () { return _this.checkElement.checked; },
                setter: function (value) { return _this.checkElement.checked = value; },
                observable: true
            });
            this.defineProperty('text', {
                setter: function (text) {
                    if (!!text === true) {
                        // Set text
                        _this.textElement.textContent = text;
                        _this.textElement.classList.remove('hidden');
                    }
                    else {
                        _this.textElement.classList.add('hidden');
                    }
                }
            });
            this.defineProperty('readonly', {
                setter: function (readonly) {
                    if (!readonly) {
                        _this.checkElement.readOnly = false;
                        _this.domElement.style.pointerEvents = '';
                    }
                    else {
                        _this.checkElement.readOnly = true; // Doesn't work
                        _this.domElement.style.pointerEvents = 'none';
                    }
                }
            });
            this.defineProperty('enabled', {
                setter: function (value) {
                    if (value) {
                        _this.domElement.classList.remove('disabled');
                    }
                    else {
                        _this.domElement.classList.add('disabled');
                    }
                    if (!_this.readonly && value) {
                        _this.checkElement.readOnly = false;
                        _this.domElement.style.pointerEvents = '';
                    }
                    else {
                        _this.checkElement.readOnly = true; // Doesn't work
                        _this.domElement.style.pointerEvents = 'none';
                    }
                },
                observable: true
            });
        };
        return CheckBox;
    })(xp.Element);
    xp.CheckBox = CheckBox;
})(xp || (xp = {}));
var xp;
(function (xp) {
    var Label = (function (_super) {
        __extends(Label, _super);
        function Label(markup) {
            _super.call(this, markup);
        }
        //----
        // DOM
        //----
        Label.prototype.getTemplate = function () {
            return xp.Dom.create({
                tag: 'label',
                attrs: { class: 'Label' }
            });
        };
        //-----------
        // PROPERTIES
        //-----------
        Label.prototype.defineProperties = function () {
            var _this = this;
            _super.prototype.defineProperties.call(this);
            this.defineProperty('text', {
                setter: function (text) {
                    _this.domElement.textContent = text;
                },
                observable: true
            });
        };
        return Label;
    })(xp.Element);
    xp.Label = Label;
})(xp || (xp = {}));
var xp;
(function (xp) {
    /**
     * Dummy placeholder.
     */
    var Placeholder = (function (_super) {
        __extends(Placeholder, _super);
        function Placeholder() {
            _super.apply(this, arguments);
        }
        Placeholder.prototype.getTemplate = function () {
            return xp.Dom.create({
                tag: 'span',
                attrs: { class: 'Placeholder' },
                children: ['&nbsp;']
            });
        };
        Placeholder.prototype.setDefaults = function () {
            _super.prototype.setDefaults.call(this);
            //this.width = '100%';
            //this.height = '100%';
        };
        return Placeholder;
    })(xp.Element);
    xp.Placeholder = Placeholder;
})(xp || (xp = {}));
var xp;
(function (xp) {
    /**
     * Radio button.
     */
    var RadioButton = (function (_super) {
        __extends(RadioButton, _super);
        function RadioButton(markup) {
            _super.call(this, markup);
        }
        //----
        // DOM
        //----
        RadioButton.prototype.getTemplate = function () {
            var _this = this;
            return xp.Dom.create({
                tag: 'label',
                attrs: { class: 'RadioButton' },
                children: [
                    {
                        tag: 'input',
                        attrs: { type: 'radio' },
                    },
                    {
                        tag: 'span',
                        attrs: { class: 'check' },
                    },
                    {
                        tag: 'label',
                        attrs: { class: 'text' },
                    }
                ]
            }, {
                    'input': function (el) { return _this.checkElement = el; },
                    '.text': function (el) { return _this.textElement = el; }
                });
        };
        //-------
        // EVENTS
        //-------
        RadioButton.prototype.initEvents = function () {
            var _this = this;
            _super.prototype.initEvents.call(this);
            this.onCheckChange.addHandler(function (args) {
                if (args.checked) {
                    _this.onInput('selectedItem', _this.item);
                }
            }, this);
        };
        //-----------
        // PROPERTIES
        //-----------
        RadioButton.prototype.defineProperties = function () {
            var _this = this;
            _super.prototype.defineProperties.call(this);
            this.defineProperty('group', {
                getter: function () { return _this.checkElement.name; },
                setter: function (value) { return _this.checkElement.name = value; }
            });
            this.defineProperty('item', {
                setter: function (item) {
                    if (_this.checked != (item == _this.selectedItem)) {
                        _this.checked = item == _this.selectedItem;
                    }
                },
                observable: true
            });
            this.defineProperty('selectedItem', {
                setter: function (item) {
                    if (_this.checked != (item == _this.item)) {
                        _this.checked = item == _this.item;
                    }
                },
                observable: true
            });
        };
        return RadioButton;
    })(xp.CheckBox);
    xp.RadioButton = RadioButton;
})(xp || (xp = {}));
var xp;
(function (xp) {
    var ToggleButton = (function (_super) {
        __extends(ToggleButton, _super);
        function ToggleButton(markup) {
            _super.call(this, markup);
        }
        //----
        // DOM
        //----
        ToggleButton.prototype.getTemplate = function () {
            var _this = this;
            return xp.Dom.create({
                tag: 'label',
                attrs: { class: 'ToggleButton' },
                children: [
                    {
                        tag: 'input',
                        attrs: { type: 'radio' },
                    },
                    {
                        tag: 'span',
                        attrs: { class: 'icon' },
                    },
                    {
                        tag: 'label',
                        attrs: { class: 'text' },
                    }
                ]
            }, {
                    'input': function (el) { return _this.checkElement = el; },
                    '.icon': function (el) { return _this.iconElement = el; },
                    '.text': function (el) { return _this.textElement = el; }
                });
        };
        //-----------
        // PROPERTIES
        //-----------
        ToggleButton.prototype.setDefaults = function () {
            _super.prototype.setDefaults.call(this);
            this.icon = null;
        };
        ToggleButton.prototype.defineProperties = function () {
            var _this = this;
            _super.prototype.defineProperties.call(this);
            this.defineProperty('checked', {
                getter: function () { return _this.checkElement.checked; },
                setter: function (checked) {
                    _this.checkElement.checked = checked;
                    if (checked) {
                        _this.domElement.classList.add('checked');
                    }
                    else {
                        _this.domElement.classList.remove('checked');
                    }
                },
                observable: true
            });
            var prevIcon;
            this.defineProperty('icon', {
                // NOTE: If starts with ".", then class will be added.
                // Otherwise background image URL will be set.
                // If "*", then icon element will hold space, but no image will be set.
                setter: function (pathOrClass) {
                    if (typeof pathOrClass === 'string' && pathOrClass !== '') {
                        // Remove prev icon
                        if (prevIcon) {
                            if (prevIcon[0] === '.') {
                                _this.iconElement.classList.remove(prevIcon.slice(1));
                            }
                            else {
                                _this.iconElement.style.backgroundImage = '';
                            }
                        }
                        // Set new icon
                        pathOrClass = pathOrClass.trim();
                        if (pathOrClass !== '*') {
                            if (pathOrClass[0] === '.') {
                                _this.iconElement.classList.add(pathOrClass.slice(1));
                            }
                            else {
                                _this.iconElement.style.backgroundImage = xp.formatString('url({0})', pathOrClass);
                            }
                            prevIcon = pathOrClass;
                        }
                        _this.iconElement.classList.remove('hidden');
                    }
                    else {
                        // Hide icon element
                        _this.iconElement.classList.add('hidden');
                    }
                }
            });
        };
        return ToggleButton;
    })(xp.RadioButton);
    xp.ToggleButton = ToggleButton;
})(xp || (xp = {}));
var xp;
(function (xp) {
    /**
     * Text input.
     */
    var TextBox = (function (_super) {
        __extends(TextBox, _super);
        function TextBox(markup) {
            _super.call(this, markup);
        }
        //----
        // DOM
        //----
        TextBox.prototype.getTemplate = function () {
            var template = xp.Dom.create({ tag: 'input', attrs: { class: 'TextBox' } });
            //template.attr('tabindex', TabIndex++);
            return template;
        };
        TextBox.prototype.initEvents = function () {
            var _this = this;
            _super.prototype.initEvents.call(this);
            this.onTextChange = new xp.Event();
            this.onRemoved.addHandler(function () { return _this.onTextChange.removeAllHandlers(); }, this);
            var oldText = '';
            var onInput = function (e) {
                var args = xp.createEventArgs(_this, e);
                args.oldText = oldText;
                var newText = _this.value.toString();
                args.newText = newText;
                _this.onTextChange.invoke(args);
                _this.onInput('text', _this.value);
                _this.onInput('value', _this.value);
                oldText = newText;
            };
            // On text input
            this.domElement.addEventListener('change', function (e) {
                onInput(e);
            });
            this.domElement.addEventListener('input', function (e) {
                if (_this.notifyOnKeyDown) {
                    onInput(e);
                }
            });
            var isIE = !!navigator.userAgent.match(/Trident\/7\./);
            this.domElement.addEventListener('keypress', function (e) {
                if (e.keyCode === 13) {
                    if (isIE) {
                        onInput(e);
                    }
                }
            });
        };
        //protected isValid(value) {
        //    switch (this.type) {
        //        case TextBoxType.string:
        //            return true;
        //        case TextBoxType.number:
        //            return !!(<string>value.toString()).match(/^\d+\.{0,1}\d*?$/);
        //        default:
        //            throw new Error('TextBoxType value is not implemented.');
        //    }
        //}
        //-----------
        // PROPERTIES
        //-----------
        TextBox.prototype.setDefaults = function () {
            _super.prototype.setDefaults.call(this);
            this.type = 'string';
            this.readonly = false;
            this.placeholder = '';
        };
        TextBox.prototype.defineProperties = function () {
            var _this = this;
            _super.prototype.defineProperties.call(this);
            this.defineProperty('text', {
                getter: function () { return _this.domElement.value; },
                setter: function (text) {
                    if (text === void 0 || text === null) {
                        text = '';
                    }
                    _this.domElement.value = text;
                },
                observable: true
            });
            this.defineProperty('value', {
                getter: function () {
                    switch (_this.type) {
                        case 'string':
                            return _this.text;
                        case 'number':
                            return parseFloat(_this.text) || 0;
                        default:
                            throw new Error('TextBox type value is not implemented.');
                    }
                },
                setter: function (value) {
                    var t = typeof value;
                    if (t === 'number' || t === 'boolean') {
                        value = value.toString();
                    }
                    if (value === void 0 || value === null) {
                        value = '';
                    }
                    _this.text = value;
                },
                observable: true
            });
            this.defineProperty('type', {
                setter: function (value) {
                    switch (value) {
                        case 'string':
                            _this.domElement.type = 'text';
                            break;
                        case 'number':
                            _this.domElement.type = 'number';
                            break;
                        default:
                            throw new Error('TextBoxType value is not implemented.');
                    }
                },
                acceptedValues: ['string', 'number']
            });
            this.defineProperty('min', {
                setter: function (value) { return _this.domElement.setAttribute('min', value.toString()); }
            });
            this.defineProperty('max', {
                setter: function (value) { return _this.domElement.setAttribute('max', value.toString()); }
            });
            this.defineProperty('step', {
                setter: function (value) { return _this.domElement.setAttribute('step', value.toString()); }
            });
            this.defineProperty('readonly', {
                setter: function (readonly) {
                    if (!readonly) {
                        _this.domElement.readOnly = false;
                    }
                    else {
                        _this.domElement.readOnly = true;
                    }
                }
            });
            this.defineProperty('placeholder', {
                getter: function () { return _this.domElement.placeholder; },
                setter: function (placeholder) {
                    if (placeholder) {
                        _this.domElement.placeholder = placeholder;
                    }
                    else {
                        _this.domElement.placeholder = '';
                    }
                }
            });
        };
        return TextBox;
    })(xp.Element);
    xp.TextBox = TextBox;
})(xp || (xp = {}));
var xp;
(function (xp) {
    //export interface TextAreaMarkup extends ElementMarkup {
    //    text?: string;
    //    notifiOnKeyDown?: boolean;
    //    readonly?: boolean|string;
    //    placeholder?: string;
    //}
    /**
     * Text input.
     */
    var TextArea = (function (_super) {
        __extends(TextArea, _super);
        function TextArea() {
            _super.apply(this, arguments);
        }
        //constructor(markup: TextAreaMarkup) {
        //    super(markup);
        //}
        //----
        // DOM
        //----
        TextArea.prototype.getTemplate = function () {
            var template = xp.Dom.create({
                tag: 'textarea',
                attrs: { class: 'TextArea TextBox', spellcheck: 'false' }
            });
            //template.attr('tabindex', TabIndex++);
            return template;
        };
        return TextArea;
    })(xp.TextBox);
    xp.TextArea = TextArea;
})(xp || (xp = {}));
var xp;
(function (xp) {
    /**
     * HTML content.
     */
    var Html = (function (_super) {
        __extends(Html, _super);
        function Html(markup) {
            _super.call(this, markup);
        }
        Html.prototype.getTemplate = function () {
            return document.createElement('div');
        };
        Html.prototype.applyMarkup = function (markup) {
            //
            // Apply HTML and URL first
            var m = {};
            for (var prop in markup) {
                m[prop] = markup[prop];
            }
            if ((m.html && m.url)
                || !(m.html || m.url)) {
                throw new Error('One property, "html" or "url", must be specified.');
            }
            if (m.html) {
                this.html = m.html;
                delete m.html;
            }
            if (m.url) {
                this.url = m.url;
                delete m.url;
            }
            _super.prototype.applyMarkup.call(this, m);
        };
        Html.prototype.defineProperties = function () {
            var _this = this;
            _super.prototype.defineProperties.call(this);
            var wasUrlSet = false;
            var wasHtmlSet = false;
            var setHtmlFromUrl = false;
            this.defineProperty('html', {
                getter: function () { return _this.domElement.outerHTML; },
                setter: function (html) {
                    if (!setHtmlFromUrl && wasHtmlSet) {
                        throw new Error('Unable to set HTML twice.');
                    }
                    var element = xp.Dom.create(html);
                    if (element.nodeType !== 1) {
                        throw new Error('Html control must have one root element.');
                    }
                    if (_this.domElement.parentNode) {
                        _this.domElement.parentNode.replaceChild(element, _this.domElement);
                    }
                    _this.domElement = element;
                    wasHtmlSet = true;
                    // Re-init events.
                    // TODO: Unsubscribe from prev enents.
                    _this.initEvents();
                    // TODO: Apply bindings.
                }
            });
            this.defineProperty('url', {
                setter: function (url) {
                    if (wasUrlSet) {
                        throw new Error('Unable to set URL twice.');
                    }
                    var xhr = new XMLHttpRequest();
                    xhr.open('get', url);
                    xhr.onreadystatechange = function () {
                        if (xhr.readyState === 4) {
                            wasUrlSet = true;
                            setHtmlFromUrl = true;
                            _this.html = xhr.responseText;
                            setHtmlFromUrl = false;
                        }
                    };
                    xhr.send(null);
                }
            });
        };
        return Html;
    })(xp.Element);
    xp.Html = Html;
})(xp || (xp = {}));
var xp;
(function (xp) {
    /**
     * UI container.
     */
    var Container = (function (_super) {
        __extends(Container, _super);
        function Container(markup, children) {
            var _this = this;
            _super.call(this, markup);
            children && children.forEach(function (c) { return _this.append(c); });
            // Set named children
            if (true /*Object.getPrototypeOf(this).constructor.isView*/) {
                //
                // TODO: Prevent name collision and unnecessary named children properties set.
                // Maybe use TypeScript 1.5 metadata.
                //
                // Maybe no need in setting names cause variables can be set from markup: { init: (tb) => this.textBox = tb }
                this.cascadeBy(function (el) {
                    if (el !== _this && el.name) {
                        if (el.name in _this) {
                            throw new Error(xp.formatString('Unable to set named child "{0}". Container\'s property is already defined.', el.name));
                        }
                        _this[el.name] = el;
                    }
                });
            }
        }
        /**
         * Initializes UI container.
         */
        Container.prototype.initElement = function () {
            this.children = [];
            _super.prototype.initElement.call(this);
        };
        //----
        // DOM
        //----
        /**
         * Returns the DOM-element where children are placed.
         */
        Container.prototype.getContainerElement = function () {
            return this.domElement;
        };
        /*internal*/ Container.prototype.__setRenderedState__ = function (rendered) {
            this.__isRendered__ = rendered;
            this.children && this.children.forEach(function (ch) {
                ch.__setRenderedState__(rendered);
            });
            if (rendered && this.onRendered)
                this.onRendered.invoke(this);
        };
        //-----------
        // PROPERTIES
        //-----------
        Container.prototype.defineProperties = function () {
            var _this = this;
            _super.prototype.defineProperties.call(this);
            this.defineProperty('padding', {
                setter: function (value) { return _this.domElement.style.padding = value; },
                getter: function () { return _this.domElement.style.padding; }
            });
        };
        /**
         * Adds an element at container's end.
         * @param element Element to append.
         */
        Container.prototype.append = function (element) {
            this.insert(element, this.children.length);
        };
        /**
         * Adds an element at container's beginning.
         * @param element Element to prepend.
         */
        Container.prototype.prepend = function (element) {
            this.insert(element, 0);
        };
        /**
         * Inserts element at index.
         * @param element Element to prepend.
         * @param index Index to insert at.
         */
        Container.prototype.insert = function (element, index) {
            if (element.parent === this && this.children.indexOf(element) == index) {
                // Don't do anything.
                return;
            }
            if (index > this.children.length) {
                throw new Error('Index was out or range.');
            }
            var container = this.getContainerElement();
            if (element.parent === this) {
                var from = this.children.indexOf(element);
                // DOM
                var target = from < index ? index + 1 : index;
                if (target === this.children.length) {
                    container.appendChild(element.domElement);
                }
                else {
                    container.insertBefore(element.domElement, container.children.item(target));
                }
                this.children.move(from, index);
            }
            else {
                if (element.parent)
                    element.parent.detachChild(element);
                // DOM
                if (index === this.children.length) {
                    container.appendChild(element.domElement);
                }
                else {
                    container.insertBefore(element.domElement, container.children.item(index));
                }
                this.children.splice(index, 0, element);
                element.__setParent__(this);
            }
        };
        /**
         * Detaches the child element, but doesn't remove it.
         * @param child Element to detach.
         */
        Container.prototype.detachChild = function (child) {
            var index = this.children.indexOf(child);
            if (index < 0) {
                throw new Error('Element is not a child of this container.');
            }
            this.children.splice(index, 1);
            child.__setParent__(null);
            // DOM
            xp.Dom.remove(child.domElement);
        };
        /**
         * Cascades through all child elements invoking a function.
         * Stops when function returns 'truthy' value.
         * @param fn Function to execute on each element.
         * @param checkRoot Specifies whether to process root element.
         * @returns Element which lead to returning 'truthy' value.
         */
        Container.prototype.cascadeBy = function (fn, checkRoot) {
            if (checkRoot === void 0) { checkRoot = false; }
            if (checkRoot && !!fn(this) === true) {
                return this;
            }
            else {
                for (var i = 0; i < this.children.length; i++) {
                    if (!!fn(this.children[i]) === true) {
                        return this.children[i];
                    }
                    else {
                        if (this.children[i] instanceof Container) {
                            var result = this.children[i].cascadeBy(fn, false);
                            if (result != null) {
                                return result;
                            }
                        }
                    }
                }
            }
            return null;
        };
        /**
         * Searches for the first matched.
         * @param predicate Predicate.
         */
        Container.prototype.find = function (predicate) {
            return this.cascadeBy(function (el) { return predicate(el); });
        };
        /**
         * Searches for all element with given name, key or selector.
         * @param predicate Predicate.
         */
        Container.prototype.findAll = function (predicate) {
            var results = [];
            this.cascadeBy(function (el) {
                if (predicate(el)) {
                    results.push(el);
                }
            });
            return results;
        };
        /**
         * Removes element.
         */
        Container.prototype.remove = function () {
            // Remove children
            this.removeChildren();
            // Remove itself
            _super.prototype.remove.call(this);
        };
        /**
         * Removes container's chlldren.
         */
        Container.prototype.removeChildren = function () {
            for (var i = this.children.length - 1; i >= 0; i--) {
                this.children[i].remove();
            }
            this.children = [];
        };
        return Container;
    })(xp.Element);
    xp.Container = Container;
})(xp || (xp = {}));
var xp;
(function (xp) {
    /**
     * Base stack panel.
     */
    var Stack = (function (_super) {
        __extends(Stack, _super);
        function Stack() {
            _super.apply(this, arguments);
        }
        //-----------
        // PROPERTIES
        //-----------
        Stack.prototype.setDefaults = function () {
            _super.prototype.setDefaults.call(this);
            this.itemsIndent = 'none';
            this.scrollBar = 'both';
            this.wrapping = 'nowrap';
        };
        Stack.prototype.defineProperties = function () {
            var _this = this;
            _super.prototype.defineProperties.call(this);
            this.defineProperty('itemsIndent', {
                setter: function (indent) {
                    _this.domElement.classList.remove('itemsIndent-05');
                    _this.domElement.classList.remove('itemsIndent-1');
                    _this.domElement.classList.remove('itemsIndent-2');
                    _this.domElement.classList.remove('itemsIndent-4');
                    switch (indent) {
                        case 'none':
                            break;
                        case '0.5em':
                            _this.domElement.classList.add('itemsIndent-05');
                            break;
                        case '1em':
                            _this.domElement.classList.add('itemsIndent-1');
                            break;
                        case '2em':
                            _this.domElement.classList.add('itemsIndent-2');
                            break;
                        case '4em':
                            _this.domElement.classList.add('itemsIndent-4');
                            break;
                        default:
                            throw new Error('Unknown items indent value: ' + indent);
                    }
                },
                acceptedValues: ['none', '0.5em', '1em', '2em', '4em']
            });
            this.defineProperty('scrollBar', {
                setter: function (scroll) {
                    _this.domElement.classList.remove('scrollBar-None');
                    _this.domElement.classList.remove('scrollBar-Horizontal');
                    _this.domElement.classList.remove('scrollBar-Vertical');
                    _this.domElement.classList.remove('scrollBar-Both');
                    switch (scroll) {
                        case 'none':
                            _this.domElement.classList.add('scrollBar-None');
                            break;
                        case 'horizontal':
                            _this.domElement.classList.add('scrollBar-Horizontal');
                            break;
                        case 'vertical':
                            _this.domElement.classList.add('scrollBar-Vertical');
                            break;
                        case 'both':
                            _this.domElement.classList.add('scrollBar-Both');
                            break;
                        default:
                            throw new Error('Unknown scroll bar value: ' + scroll);
                    }
                },
                acceptedValues: ['none', 'horizontal', 'vertical', 'both']
            });
            this.defineProperty('wrapping', {
                setter: function (wrap) {
                    _this.domElement.classList.remove('wrapping-NoWrap');
                    _this.domElement.classList.remove('wrapping-Wrap');
                    switch (wrap) {
                        case 'nowrap':
                            _this.domElement.classList.add('wrapping-NoWrap');
                            break;
                        case 'wrap':
                            _this.domElement.classList.add('wrapping-Wrap');
                            break;
                        default:
                            throw new Error('Unknown wrapping value: ' + wrap);
                    }
                },
                acceptedValues: ['nowrap', 'wrap']
            });
        };
        return Stack;
    })(xp.Container);
    xp.Stack = Stack;
})(xp || (xp = {}));
var xp;
(function (xp) {
    /**
     * Horizontal stack panel.
     */
    var HBox = (function (_super) {
        __extends(HBox, _super);
        function HBox(markup, children) {
            _super.call(this, markup, children);
        }
        //----
        // DOM
        //----
        HBox.prototype.getTemplate = function () {
            var template = xp.Dom.create({ tag: 'div', attrs: { class: 'HBox' } });
            return template;
        };
        //protected getContainerElement(): HTMLElement {
        //    return this.domElement;
        //}
        //-----------
        // PROPERTIES
        //-----------
        HBox.prototype.setDefaults = function () {
            _super.prototype.setDefaults.call(this);
            this.contentAlign = 'left';
            this.itemsAlign = 'stretch';
        };
        HBox.prototype.defineProperties = function () {
            var _this = this;
            _super.prototype.defineProperties.call(this);
            this.defineProperty('contentAlign', {
                setter: function (align) {
                    _this.domElement.classList.remove('contentAlign-Left');
                    _this.domElement.classList.remove('contentAlign-Center');
                    _this.domElement.classList.remove('contentAlign-Right');
                    switch (align) {
                        case 'left':
                            _this.domElement.classList.add('contentAlign-Left');
                            break;
                        case 'center':
                            _this.domElement.classList.add('contentAlign-Center');
                            break;
                        case 'right':
                            _this.domElement.classList.add('contentAlign-Right');
                            break;
                        default:
                            throw new Error('Unknown content alignment value: ' + align);
                    }
                },
                acceptedValues: ['left', 'center', 'right']
            });
            this.defineProperty('itemsAlign', {
                setter: function (align) {
                    _this.domElement.classList.remove('itemsAlign-Top');
                    _this.domElement.classList.remove('itemsAlign-Middle');
                    _this.domElement.classList.remove('itemsAlign-Bottom');
                    _this.domElement.classList.remove('itemsAlign-Stretch');
                    switch (align) {
                        case 'top':
                            _this.domElement.classList.add('itemsAlign-Top');
                            break;
                        case 'middle':
                            _this.domElement.classList.add('itemsAlign-Middle');
                            break;
                        case 'bottom':
                            _this.domElement.classList.add('itemsAlign-Bottom');
                            break;
                        case 'stretch':
                            _this.domElement.classList.add('itemsAlign-Stretch');
                            break;
                        default:
                            throw new Error('Unknown items alignment value: ' + align);
                    }
                },
                acceptedValues: ['top', 'middle', 'bottom', 'stretch']
            });
        };
        return HBox;
    })(xp.Stack);
    xp.HBox = HBox;
})(xp || (xp = {}));
var xp;
(function (xp) {
    /**
     * Vertical stack panel.
     */
    var VBox = (function (_super) {
        __extends(VBox, _super);
        function VBox(markup, children) {
            _super.call(this, markup, children);
        }
        //----
        // DOM
        //----
        VBox.prototype.getTemplate = function () {
            var template = xp.Dom.create({ tag: 'div', attrs: { class: 'VBox' } });
            return template;
        };
        //protected getContainerElement(): HTMLElement {
        //    return this.domElement;
        //}
        //-----------
        // PROPERTIES
        //-----------
        VBox.prototype.setDefaults = function () {
            _super.prototype.setDefaults.call(this);
            this.contentAlign = 'top';
            this.itemsAlign = 'stretch';
        };
        VBox.prototype.defineProperties = function () {
            var _this = this;
            _super.prototype.defineProperties.call(this);
            this.defineProperty('contentAlign', {
                setter: function (align) {
                    _this.domElement.classList.remove('contentAlign-Top');
                    _this.domElement.classList.remove('contentAlign-Middle');
                    _this.domElement.classList.remove('contentAlign-Bottom');
                    switch (align) {
                        case 'top':
                            _this.domElement.classList.add('contentAlign-Top');
                            break;
                        case 'middle':
                            _this.domElement.classList.add('contentAlign-Middle');
                            break;
                        case 'bottom':
                            _this.domElement.classList.add('contentAlign-Bottom');
                            break;
                        default:
                            throw new Error('Unknown content alignment value: ' + align);
                    }
                },
                acceptedValues: ['top', 'middle', 'bottom']
            });
            this.defineProperty('itemsAlign', {
                setter: function (align) {
                    _this.domElement.classList.remove('itemsAlign-Left');
                    _this.domElement.classList.remove('itemsAlign-Center');
                    _this.domElement.classList.remove('itemsAlign-Right');
                    _this.domElement.classList.remove('itemsAlign-Stretch');
                    switch (align) {
                        case 'left':
                            _this.domElement.classList.add('itemsAlign-Left');
                            break;
                        case 'center':
                            _this.domElement.classList.add('itemsAlign-Center');
                            break;
                        case 'right':
                            _this.domElement.classList.add('itemsAlign-Right');
                            break;
                        case 'stretch':
                            _this.domElement.classList.add('itemsAlign-Stretch');
                            break;
                        default:
                            throw new Error('Unknown items alignment value: ' + align);
                    }
                },
                acceptedValues: ['left', 'center', 'right', 'stretch']
            });
        };
        return VBox;
    })(xp.Stack);
    xp.VBox = VBox;
})(xp || (xp = {}));
var xp;
(function (xp) {
    /**
     * List container.
     */
    var List = (function (_super) {
        __extends(List, _super);
        function List(markup) {
            _super.call(this, markup);
            this.itemReplacementToken = false;
            this.itemReplacementHandlers = [];
        }
        //----
        // DOM
        //----
        List.prototype.getTemplate = function () {
            return xp.Dom.create({ tag: 'div', attrs: { class: 'List VBox' } });
        };
        //-----------
        // PROPERTIES
        //-----------
        List.prototype.setDefaults = function () {
            _super.prototype.setDefaults.call(this);
            this.itemId = 'item';
        };
        List.prototype.defineProperties = function () {
            var _this = this;
            _super.prototype.defineProperties.call(this);
            this.defineProperty('items', {
                setter: function (items) {
                    // Remove current children
                    _this.removeReplacementHandlers();
                    _this.removeChildren();
                    _this.itemsRegistar.unsubscribeAll();
                    if (items && _this.itemCreator) {
                        // Create new children
                        items.forEach(function (item, i) {
                            _this.addItem(i, item);
                        });
                        // Subscribe for changes
                        if (xp.isCollectionNotifier(items)) {
                            var collection = items;
                            _this.itemsRegistar.subscribe(collection.onCollectionChanged, function (args) {
                                switch (args.action) {
                                    case xp.CollectionChangeAction.Attach:
                                    case xp.CollectionChangeAction.Create:
                                        _this.addItem(args.newIndex, args.newItem);
                                        break;
                                    case xp.CollectionChangeAction.Detach:
                                    case xp.CollectionChangeAction.Delete:
                                        // Remove replacement handler
                                        var found = _this.itemReplacementHandlers.filter(function (h) { return h.item === args.oldItem; })[0];
                                        found.holder.onPropertyChanged.removeHandler(found.handler);
                                        _this.itemReplacementHandlers.splice(_this.itemReplacementHandlers.indexOf(found), 1);
                                        _this.children[args.oldIndex].remove();
                                        break;
                                    case xp.CollectionChangeAction.Replace:
                                        if (!_this.itemReplacementToken) {
                                            _this.children[args.newIndex].scope[_this.itemId] = args.newItem;
                                        }
                                        break;
                                    case xp.CollectionChangeAction.Move:
                                        _this.insert(_this.children[args.oldIndex], args.newIndex);
                                        break;
                                    default:
                                        throw new Error('Not implemented.');
                                }
                            }, _this);
                        }
                        if (xp.isNotifier(items)) {
                            var itemsLengthChangeHandler = function (prop) {
                                //if (prop === 'length') {
                                //    // Hide or show control
                                //    if (this.items.length > 0) {
                                //        this.domElement.show();
                                //    }
                                //    else {
                                //        this.domElement.hide();
                                //    }
                                //}
                            };
                            _this.itemsRegistar.subscribe(items.onPropertyChanged, itemsLengthChangeHandler, _this);
                            // Handle length for the first time
                            itemsLengthChangeHandler('length');
                        }
                    }
                }
            });
            this.defineProperty('itemCreator', {
                // Re-create items
                setter: function () { return _this.items = _this.items; }
            });
        };
        //-------
        // EVENTS
        //-------
        List.prototype.initEvents = function () {
            _super.prototype.initEvents.call(this);
            this.itemsRegistar = new xp.EventRegistrar();
        };
        List.prototype.addItem = function (index, item) {
            // Create child
            var child = this.itemCreator(item);
            child.name = xp.createUuid();
            child.useParentScope = false;
            // Append child
            this.insert(child, index);
            // Set child's scope
            child.scope = this.createItemScopeFrom(item);
        };
        List.prototype.createItemScopeFrom = function (item) {
            //
            // Create item scope
            var _this = this;
            var obj = {};
            obj[this.itemId] = item;
            var scope = new xp.Scope(xp.observable(obj), this.scope);
            //
            // Handle item replacement inside item-element scope
            var hr = {
                item: item,
                handler: function (prop) {
                    if (prop === _this.itemId) {
                        var index = _this.items.indexOf(hr.item);
                        if (index < 0) {
                            throw new Error('Item does not belong to List items.');
                        }
                        _this.itemReplacementToken = true;
                        _this.items[index] = hr.holder[prop];
                        _this.itemReplacementToken = false;
                        hr.item = hr.holder[prop];
                    }
                },
                holder: scope
            };
            hr.holder.onPropertyChanged.addHandler(hr.handler, this);
            this.itemReplacementHandlers.push(hr);
            return scope;
        };
        /**
         * Removes element.
         */
        List.prototype.remove = function () {
            // Remove replacement handlers
            this.removeReplacementHandlers();
            // Remove itself
            _super.prototype.remove.call(this);
        };
        List.prototype.removeReplacementHandlers = function () {
            if (this.itemReplacementHandlers) {
                this.itemReplacementHandlers.forEach(function (hr) {
                    hr.holder.onPropertyChanged.removeHandler(hr.handler);
                });
                this.itemReplacementHandlers = [];
            }
        };
        return List;
    })(xp.VBox);
    xp.List = List;
})(xp || (xp = {}));
var xp;
(function (xp) {
    /**
     * Window.
     */
    var Window = (function (_super) {
        __extends(Window, _super);
        function Window(markup, children) {
            _super.call(this, markup, children);
        }
        //----
        // DOM
        //----
        Window.prototype.getTemplate = function () {
            // TODO: When to render?
            // Replace body or append to it?
            var template = document.body;
            template.classList.add('Window');
            template.classList.add('VBox');
            this.__setRenderedState__(true);
            //// Remove current content
            //while (template.firstElementChild) {
            //    template.removeChild(template.firstElementChild);
            //}
            return template;
        };
        Window.prototype.initElement = function () {
            _super.prototype.initElement.call(this);
            if (Window.instance)
                throw new Error('There is already another Window.');
            Window.instance = this;
        };
        //-------
        // EVENTS
        //-------
        //-----------
        // PROPERTIES
        //-----------
        Window.prototype.setDefaults = function () {
            _super.prototype.setDefaults.call(this);
            this.title = 'XP Application';
        };
        Window.prototype.defineProperties = function () {
            _super.prototype.defineProperties.call(this);
            this.defineProperty('title', {
                getter: function () { return document.title; },
                setter: function (title) { return document.title = title; },
                observable: true
            });
        };
        /**
         * Shows modal dialog.
         * It may be any element but it is recommended to use a modal.
         */
        Window.prototype.showModal = function (modal) {
            if (this.tint || this.modal)
                throw new Error('Another modal is displayed.');
            // Create tint
            this.tint = new xp.ModalTint();
            this.tint.appendTo(this);
            // Place modal
            this.modal = modal;
            modal.appendTo(this.tint);
        };
        /**
         * Closes a current modal dialog.
         */
        Window.prototype.closeModal = function () {
            this.modal.remove();
            this.tint.remove();
            this.modal = null;
            this.tint = null;
        };
        return Window;
    })(xp.VBox);
    xp.Window = Window;
})(xp || (xp = {}));
var xp;
(function (xp) {
    /**
     * Modal dialog base.
     */
    var Modal = (function (_super) {
        __extends(Modal, _super);
        /**
         * Creates a modal dialog.
         */
        function Modal(markup, children) {
            _super.call(this, markup, children);
        }
        /**
         * Displays the modal dialog.
         */
        Modal.prototype.show = function () {
            xp.Window.instance.showModal(this);
        };
        /**
         * Closes the dialog.
         */
        Modal.prototype.close = function () {
            var result = this.onClose ?
                this.onClose()
                : true;
            if (result)
                xp.Window.instance.closeModal();
        };
        //----
        // DOM
        //----
        Modal.prototype.getTemplate = function () {
            return xp.Dom.create({ tag: 'div', attrs: { class: 'Modal VBox' } });
        };
        return Modal;
    })(xp.VBox);
    xp.Modal = Modal;
    /**
     * Modal dialog tint.
     */
    var ModalTint = (function (_super) {
        __extends(ModalTint, _super);
        function ModalTint() {
            _super.apply(this, arguments);
        }
        ModalTint.prototype.getTemplate = function () {
            return xp.Dom.create({ tag: 'div', attrs: { class: 'ModalTint' } });
        };
        return ModalTint;
    })(xp.Container);
    xp.ModalTint = ModalTint;
})(xp || (xp = {}));
var xp;
(function (xp) {
    /**
     * Simple dialog that displays a message.
     */
    var MessageBox = (function (_super) {
        __extends(MessageBox, _super);
        /**
         * Creates a message box.
         * @param message Message.
         * @param title Title.
         */
        function MessageBox(message, title, actions) {
            var _this = this;
            _super.call(this, {
                padding: '1em 1.5em',
                width: '32em',
                margin: '-15% 0 0 0'
            });
            // TODO: Separate style file?
            // Title element
            if (title !== void 0) {
                var titleEl = new xp.Label({
                    text: title,
                    style: 'title',
                    margin: '0 0 1rem 0'
                });
                //titleEl.domElement.css('font-size', '1.5em');
                titleEl.appendTo(this);
            }
            // Message element
            if (message !== void 0) {
                var messageEl = new xp.Label({
                    margin: '0 0 2em 0',
                    text: message,
                    style: 'message'
                });
                messageEl.appendTo(this);
            }
            // Create buttons
            actions = actions || {
                'OK': function () { }
            };
            var hbox = new xp.HBox({
                contentAlign: 'right'
            });
            for (var key in actions) {
                (function (key) {
                    var button = new xp.Button({
                        text: key,
                        minWidth: '4em',
                        init: function (el) {
                            return el.onClick.addHandler(function () {
                                actions[key]();
                                _this.close();
                            });
                        }
                    });
                    button.appendTo(hbox);
                })(key);
            }
            hbox.appendTo(this);
        }
        /**
         * Displays a message box.
         * @param message Message.
         * @param title Title.
         */
        MessageBox.show = function (message, title, actions) {
            var box = new MessageBox(message, title, actions);
            box.show();
        };
        return MessageBox;
    })(xp.Modal);
    xp.MessageBox = MessageBox;
})(xp || (xp = {}));
var xp;
(function (xp) {
    /**
     * Context menu.
     */
    var ContextMenu = (function (_super) {
        __extends(ContextMenu, _super);
        /**
         * Creates a context menu.
         * @param data Menu-items' data.
         */
        function ContextMenu(data) {
            var _this = this;
            _super.call(this);
            data.forEach(function (d) { return _this.createMenuItem(d); });
        }
        //----
        // DOM
        //----
        ContextMenu.prototype.getTemplate = function () {
            return xp.Dom.create({ tag: 'div', attrs: { class: 'ContextMenu VBox' } });
        };
        ContextMenu.prototype.createMenuItem = function (data) {
            var menuItem = new ContextMenuItem(data, this);
            menuItem.appendTo(this);
        };
        /**
         * Displays the context menu.
         * @param x X.
         * @param y Y.
         */
        ContextMenu.prototype.show = function (x, y) {
            var _this = this;
            // Subscribe for outer events for cancel
            var cancel = function (e) {
                _this.remove();
                window.removeEventListener('mousedown', cancel);
                window.removeEventListener('keydown', onKey);
            };
            var onKey = function (e) {
                if (e.keyCode === 27) {
                    cancel(e);
                }
            };
            window.addEventListener('mousedown', cancel);
            window.addEventListener('keydown', onKey);
            // Set coordinate
            this.domElement.style.left = x + 'px';
            this.domElement.style.top = y + 'px';
            // Append to Window
            xp.Window.instance.append(this);
            // Move if overflows
            var menuBox = this.domElement.getBoundingClientRect();
            var winBox = document.documentElement.getBoundingClientRect();
            if (menuBox.right > winBox.right) {
                this.domElement.style.left = (x - menuBox.width) + 'px';
            }
            if (menuBox.bottom > winBox.bottom) {
                this.domElement.style.top = (y - menuBox.height) + 'px';
            }
        };
        /**
         * Displays a context menu at a given point.
         * @param x X.
         * @param y Y.
         * @param data Menu-items' data.
         */
        ContextMenu.show = function (x, y, data) {
            var menu = new ContextMenu(data);
            menu.show(x, y);
        };
        return ContextMenu;
    })(xp.VBox);
    xp.ContextMenu = ContextMenu;
    //----------
    // Menu item
    //----------
    var ContextMenuItem = (function (_super) {
        __extends(ContextMenuItem, _super);
        function ContextMenuItem(data, menu) {
            _super.call(this);
            this.menu = menu;
            this.initItemData(data);
        }
        ContextMenuItem.prototype.initItemData = function (data) {
            var _this = this;
            if (data.icon) {
                if (data.icon[0] === '.') {
                    this.iconElement.classList.add(data.icon.slice(1));
                }
                else {
                    this.iconElement.style.backgroundImage = xp.formatString('url({0})', data.icon);
                }
            }
            if (data.key) {
                this.keyElement.textContent = data.key;
            }
            if (data.disabled) {
                this.enabled = false;
            }
            this.textElement.textContent = data.text;
            this.onMouseDown.addHandler(function (e) {
                e.domEvent.stopPropagation();
                _this.menu.remove();
                data.action();
            }, this);
        };
        //----
        // DOM
        //----
        ContextMenuItem.prototype.getTemplate = function () {
            var template = xp.Dom.create({
                tag: 'span',
                attrs: { class: 'ContextMenuItem', role: 'button' },
                children: [
                    {
                        tag: 'span',
                        attrs: { class: 'wrapper' },
                        children: [
                            {
                                tag: 'span',
                                attrs: { class: 'icon' },
                            },
                            {
                                tag: 'span',
                                attrs: { class: 'text' },
                            },
                            {
                                tag: 'span',
                                attrs: { class: 'key' },
                            },
                        ]
                    }
                ]
            });
            this.iconElement = xp.Dom.select('.icon', template);
            this.textElement = xp.Dom.select('.text', template);
            this.keyElement = xp.Dom.select('.key', template);
            return template;
        };
        return ContextMenuItem;
    })(xp.Element);
})(xp || (xp = {}));
var xp;
(function (xp) {
    var Tests;
    (function (Tests) {
        /**
         * Throws an error if statement is not true.
         */
        function assert(statement) {
            var t = typeof statement;
            if (t !== 'boolean')
                throw new Error('Assert statement must be boolean but not ' + t + '.');
            if (statement !== true) {
                throw new Error(xp.formatString('Statement is wrong.'));
            }
        }
        Tests.assert = assert;
        /**
         * Determines whether two objects are equal.
         * If not throws an error.
         */
        function assertEqual(a, b) {
            if (a !== b) {
                throw new Error(xp.formatString('"{0}" is not equal to "{1}".', a, b));
            }
        }
        Tests.assertEqual = assertEqual;
    })(Tests = xp.Tests || (xp.Tests = {}));
})(xp || (xp = {}));
