declare module xp.Dom {
    /**
     * Creates a HTML element from string content.
     * @param html HTML markup.
     * @param selectorSetter Selector/setter dictionary.
     */
    function create(html: { tag: string; attrs?: any; children?: Array<string | { tag: string; attrs?: any; children?: any }> }, selectorSetters?: {
        [selector: string]: (htmlEl) => void;
    }): HTMLElement;
    /**
     * Returns the first element that matches the selector.
     * @param selector Selector.
     * @param parent Element to start the search from.
     */
    function select(selector: string, parent?: NodeSelector): HTMLElement;
    /**
     * Removes a node.
     * @param node Node to remove.
     */
    function remove(node: Node): Node;
}
declare module xp.Log {
    /**
     * Message importance level.
     */
    enum HeatLevel {
        Log = 1,
        Info = 2,
        Warn = 4,
        Error = 8,
    }
    /**
     * Message domain.
     */
    enum Domain {
        Misc = 16,
        Binding = 32,
        UI = 64,
        Test = 128,
    }
    /**
     * Configures what output messages will be display.
     */
    var DisplayMessages: HeatLevel | Domain;
    /**
     * Writes a message to console.
     * @param level Importance level.
     * @param domain Domain.
     * @param msgOrAny Message (composite formatting string) or any other item.
     * @param args Arguments to insert into formatting string.
     */
    function write(level: HeatLevel, domain: Domain, msgOrAny: any, ...args: any[]): void;
}
declare module xp {
    /**
     * Replaces each format item in a specified string with values.
     * @param formatStr A composite format string.
     * @param args Arguments to insert into formatting string.
     */
    function formatString(format: string, ...ars: any[]): string;
    /**
     * Creates a deep copy of an item.
     * Only enumerable properties will be copied.
     * @param item Item to copy.
     */
    function clone<T>(item: T): T;
    /**
     * Creates unique identifier.
     */
    function createUuid(): string;
    /**
     * Gets class name of object.
     * @param obj Object.
     */
    function getClassName(obj: any): string;
    /**
     * Creates new object by passing arguments to constructor.
     * @param ctor Type of object.
     * @param args Arguments to apply.
     * @returns New object.
     */
    function applyConstructor<T extends Object>(ctor: new (...args) => T, args: any[]): T;
    /**
     * Hides type's prototype properties (makes them non-enumerable).
     * @param ctor Type constructor.
     * @param propsToHide
     */
    function hidePrototypeProperties(ctor: new (...args) => Object, propsToHide?: string[]): void;
}
declare module xp.Path {
    /**
     * Returns object's property.
     * @param obj Source object.
     * @param path Path to property. If path='', then source object will be returned.
     * @param [throwErr=true] Throws an error if property not found.
     */
    function getPropertyByPath(obj: any, path: any, throwErr?: boolean): any;
    /**
     * Sets property value by path.
     * @param obj Source object.
     * @param path Path to property.
     * @param value Value.
     * @param [throwErr=true] Throws an error if property not found.
     */
    function setPropertyByPath(obj: any, path: any, value: any, throwErr?: boolean): void;
    /**
     * Gets object path from property path.
     * @param propertyPath Property path.
     */
    function getObjectPath(propertyPath: string): string;
    /**
     * Gets property name from property path.
     * @param propertyPath Property path.
     */
    function getPropertyName(propertyPath: string): string;
    /**
     * Replaces path indexers with properties.
     * E.g. "obj[value].prop" transforms into "obj.value.prop".
     * @param path Property path.
     */
    function replaceIndexers(path: string): string;
}
declare module xp {
    /**
     * Defines a constructor of type T instance.
     */
    interface Constructor<T> {
        new (...args: any[]): T;
    }
}
declare module xp {
    /**
     * Key/value dictionary.
     */
    class Dictionary<TKey, TValue> {
        /**
         * Key/value pairs.
         */
        pairs: KeyValuePair<TKey, TValue>[];
        /**
         * Creates a dictionary.
         */
        constructor(items?: KeyValuePair<TKey, TValue>[]);
        /**
         * Gets a value.
         * @param key Key.
         */
        get(key: TKey): TValue;
        /**
         * Sets a value.
         * @param key Key.
         * @param value Value.
         */
        set(key: TKey, value: TValue): void;
        /**
         * Removes a value.
         */
        remove(key: TKey): void;
    }
    /**
     * Key/value pair.
     */
    interface KeyValuePair<TKey, TValue> {
        key: TKey;
        value: TValue;
    }
}
declare module xp {
    /**
     * Event.
     * @param TEventArgs Type of event arguments object.
     */
    class Event<TEventArgs> {
        private handlers;
        /**
         * Adds event handler.
         * @param handler Function which will be called when event happens.
         * @param thisArg Context of handler.
         * @returns Subscription.
         */
        addHandler(handler: EventHandler<TEventArgs>, thisArg?: any): Subscription<TEventArgs>;
        /**
         * Removes event handler.
         * @param handler Function to remove.
         * @returns Removed handler.
         */
        removeHandler(handler: EventHandler<TEventArgs>): EventHandler<TEventArgs>;
        /**
         * Removes all event handlers.
         */
        removeAllHandlers(): void;
        /**
         * Determines if the specified handler is already subscribed for an event.
         * @param handler Event handler.
         */
        hasHandler(handler: EventHandler<TEventArgs>): boolean;
        /**
         * Fires the event.
         * @param args Event arguments.
         */
        invoke(args: TEventArgs): void;
    }
    /**
     * Function which handles an event.
     * @param TEventArgs Type of event arguments object.
     */
    interface EventHandler<TEventArgs> {
        /**
         * @param args Event arguments object.
         */
        (args: TEventArgs): void;
    }
    /**
     * Simplifies subscription and especially unsubscription of events.
     */
    class EventRegistrar {
        private subscriptions;
        /**
         * Subscribes specified handlers on events.
         * @param event Event.
         * @param handler Event handler.
         * @param thisArg Handler's scope.
         * @returns Subscription.
         */
        subscribe<T>(event: Event<T>, handler: EventHandler<T>, thisArg?: any): Subscription<T>;
        /**
         * Unsubscribes specified handlers on events.
         * @param predicate Function to filter subscriptions.
         */
        unsubscribe<T>(predicate: (s: Subscription<T>) => boolean): void;
        /**
         * Unsubscribes all registered handlers.
         */
        unsubscribeAll(): void;
    }
    /**
     * Contains info about event and it's handler.
     */
    interface Subscription<T> {
        event: Event<T>;
        handler: EventHandler<T>;
        scope: any;
    }
}
declare module xp {
    /**
     * Defines an object, which notifies of it's properties changes.
     */
    interface Notifier {
        /**
         * Is invoked when any object's property is changed.
         * Argument is a property name.
         */
        onPropertyChanged: Event<string>;
    }
    /**
     * Determines whether object implements INotifier.
     * @param obj Object.
     */
    function isNotifier(obj: any): boolean;
    /**
     * An object which notifies of it's changes.
     */
    class ObservableObject implements Notifier {
        onPropertyChanged: xp.Event<string>;
        protected __convertNested__: boolean;
        /**
         * Creates an object, which notifies of it's properties changes.
         * @param source Source object.
         * @param convertNested Specifies whether to convert nested items into observables. Default is true.
         */
        constructor(source: Object, convertNested?: boolean);
        protected __initProperties__(): void;
        protected __copySource__(source: Object): void;
        /**
         * Determines whether specified object can be converted into an observable object.
         * @param source Source object.
         */
        static isConvertable(source: any): boolean;
        /**
         * Adds property to INotifier.
         * @param obj Notifier.
         * @param name Name of the property to create.
         * @param value Default value.
         * @param convertToObservable Specifies whether to convert value into observable. Default is true.
         */
        static extend(obj: Notifier, name: string, value: any, convertToObservable?: boolean): void;
    }
}
interface Array<T> {
    /**
     * Moves an item within an array.
     * @param from Item's current index.
     * @param to Target index.
     */
    move(from: number, to: number): Array<T>;
    /**
     * Attaches an item to an array.
     * @param item Item.
     * @param index Target index.
     */
    attach(item: T, index: number): number;
    /**
     * Detaches an item from an array.
     * @param index Item's index.
     */
    detach(index: number): T;
}
declare module xp {
    /**
     * Defines a collection, which notifies of it's changes.
     */
    interface CollectionNotifier<T> {
        /**
         * Is invoked when collection is changed.
         */
        onCollectionChanged: Event<CollectionChangeArgs<T>>;
    }
    enum CollectionChangeAction {
        Create = 0,
        Replace = 1,
        Delete = 2,
        Move = 3,
        Attach = 4,
        Detach = 5,
    }
    interface CollectionChangeArgs<T> {
        action: CollectionChangeAction;
        newIndex?: number;
        oldIndex?: number;
        newItem?: T;
        oldItem?: T;
    }
    /**
     * Determines whether object implements ICollectionNotifier.
     * @param obj Object.
     */
    function isCollectionNotifier(obj: any): boolean;
    /**
     * A collection which notifies of it's changes.
     */
    class ObservableCollection<T> extends ObservableObject implements Array<T>, CollectionNotifier<T>, Notifier {
        protected inner: Array<T>;
        /**
         * Creates a collection which notifies of it's changes.
         * @param collection Source collection.
         * @param convertItems Specifies whether to convert collection items into observables. Default is true.
         */
        constructor(collection?: Array<T>, convertItems?: boolean);
        protected __initProperties__(): void;
        protected __copySource__(collection: Array<T>): void;
        onPropertyChanged: Event<string>;
        onCollectionChanged: Event<CollectionChangeArgs<T>>;
        private __splicing__;
        /**
         * Handles item's addition into collection.
         */
        protected add(item: any, index: any, moving?: boolean): void;
        /**
         * Handles item's removal item from collection.
         */
        protected remove(index: any, moving?: boolean): T;
        protected appendIndexProperty(): void;
        protected deleteIndexProperty(): void;
        protected createNotifierIfPossible(item: any): any;
        length: number;
        move(from: number, to: number): T[];
        attach(item: T, index: number): number;
        detach(index: number): T;
        pop(): T;
        push(...items: T[]): number;
        reverse(): T[];
        shift(): T;
        private __sorting__;
        sort(compareFn?: (a: T, b: T) => number): T[];
        splice(start: number): T[];
        splice(start: number, deleteCount: number, ...items: T[]): any;
        unshift(...items: T[]): number;
        concat<U extends T[]>(...items: U[]): T[];
        join(separator?: string): string;
        slice(start?: number, end?: number): T[];
        /**
         * Method called by JSON.stringify()
         */
        toJSON(): T[];
        toString(): string;
        toLocaleString(): string;
        indexOf(searchElement: T, fromIndex?: number): number;
        lastIndexOf(searchElement: T, fromIndex?: number): number;
        forEach(callbackfn: (value: T, index: number, array: T[]) => void, thisArg?: any): void;
        every(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg?: any): boolean;
        some(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg?: any): boolean;
        filter(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg?: any): T[];
        map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[];
        reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
        reduceRight<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
        [n: number]: T;
    }
}
declare module xp {
    /**
     * Creates an object or collection, which notifies of it's properties changes.
     * WARNING: Avoid circular references.
     * WARNING: Source properties must be initialized (have some value).
     * New properties may be added using ObservableObject.extend().
     * @param source Source object.
     * @param convertNested Specifies whether to convert nested items into observables. Default is true.
     */
    function observable<T>(source: T, convertNested?: boolean): T;
}
declare module xp {
    /**
     * UI control's property bindable expression.
     */
    class Expression implements Notifier {
        /**
         * Is invoked when expression result changes.
         */
        onPropertyChanged: Event<string>;
        private scope;
        private func;
        private propsPaths;
        private managers;
        private params;
        private collectionRegistrations;
        /**
         * Creates control's property bindable expression.
         * @param expression Expression e.g. "{obj.a} * 2 + Math.round({b})".
         */
        constructor(expression: string, scope: any);
        /**
         * Gets expression evaluation result.
         */
        result: any;
        private resultField;
        /**
         * Executes the expression.
         */
        exec(): void;
        private sourceSetToken;
        /**
         * Resets source and causes expression evaluation.
         * @param scope Source.
         */
        resetWith(scope: Object): void;
        /**
         * Removes binding.
         * Must be called when target is being disposed or property path changes.
         */
        unbind(): void;
    }
    /**
     * Evaluates an expression.
     * Supports the next operators: ?:, ||, &&, !==, ===, !=, ==, >=, >, <=, <, -, +, /, *, typeof, !, ().
     * @param expression Expression string, eg. "x * (arr.indexOf(x) + 1)".
     * @param scope Object containing expression variables, eg. { x: 2,
     */
    function evaluate(expression: string, scope: Object): any;
}
declare module xp {
    /**
     * Manages the scope data binding for a single property.
     * This manager is hold by target and must exist until
     * target is disposed. Nested source properties are
     * not supposed to be always reachable.
     */
    class BindingManager {
        private target;
        private targetPropertyPath;
        private scope;
        private path;
        private defaultValue;
        /**
         * Creates the scope binding manager.
         * @param target Target.
         * @param targetPropertyPath Target property path.
         * @param scope Scope object.
         * @param path Path to bind to.
         * @param options Options.
         */
        constructor(target: Object, targetPropertyPath: string, scope: Object, path: string, defaultValue?: any);
        private pathParts;
        private pathObjects;
        /**
         * Registers path objects' change handlers.
         * @param [startIndex=0] Path index to start re-initialization from.
         */
        private registerPathObjects(startIndex?);
        /**
         * Resets binding with new binding source (with the same hierarchy).
         * @param scope Scope to sync with.
         */
        resetWith(scope: Object): void;
        /**
         * Updates source property.
         */
        updateSource(): void;
        /**
         * Updates target property.
         */
        updateTarget(): void;
        /**
         * Removes binding.
         * Must be called when target is being disposed or property path changes.
         */
        unbind(): void;
        private logMessage(message);
    }
}
declare module xp {
    /**
     * Calls a setter function when a single property
     * change occurs. Nested source properties are
     * not supposed to be always reachable.
     */
    class BindingCallManager extends BindingManager {
        private setterFn;
        /**
         * Creates the binding call manager.
         * @param scope Scope object.
         * @param path Path to bind to.
         * @param setterFn Setter function.
         * @param [getterFn] Getter function.
         * @param [defaultValue] Value to use is case when source property is unreachable.
         */
        constructor(scope: Object, path: string, setterFn: (value) => void, getterFn?: () => any, defaultValue?: any);
    }
}
declare module xp {
    /**
     * Base observable model.
     */
    class Model implements Notifier {
        /**
         * Creates an observable model.
         */
        constructor();
        /**
         * Is invoked when any property is changed.
         */
        onPropertyChanged: Event<string>;
        /**
         * Defines a getter and setter for a model instance, which notifies of it's change.
         * @param obj Model instance.
         * @param prop Property name.
         * @param value Default value. If observable then setted values will be converted to observable.
         * @param opts Model property options. Convertors can be defined here. Enumerable by default.
         */
        static property(obj: Notifier, prop: string, value?: any, opts?: ModelPropertyOptions): void;
        /**
         * Defines a non-enumerable and non-observable field.
         * @param obj Model instance.
         * @param prop Field name.
         * @param value Default value.
         */
        static nonEnumerableField<T extends Model>(obj: Model, field: string, value?: any): void;
    }
    /**
     * Options of a model property.
     */
    interface ModelPropertyOptions {
        setterConvertor?: (v) => any;
        getterConvertor?: (v) => any;
        enumerable?: boolean;
        convertToObservable?: boolean;
        convertNested?: boolean;
    }
    /**
     * Model property decorator.
     */
    function property(opts?: ModelPropertyOptions): PropertyDecorator;
}
declare module xp {
    /**
     * Data scope. Supports multiple levels and notifies of their changes.
     */
    class Scope implements Notifier {
        onPropertyChanged: Event<string>;
        private __registrar__;
        /**
         * Creates a scope.
         * @param source Source object. Should be observable.
         * @param parent Parent scope. Should be observable.
         */
        constructor(source: Object, parent: Object);
        /**
         * Must be called when the scope object is not used anymore.
         * Otherwise source object changes would be reflected.
         */
        unsubscribeScopeFromChanges(): void;
    }
}
declare module xp {
    /**
     * Serializes item to JSON.
     * @param item Item to serialize.
     * @param writeModel Specifies whether to write models prototypes names (adds __xp_model__ property). Default is true.
     * @param replacer A function that transforms the result.
     * @param whiteSpace Specifies whether to add white space into output. Default is " ".
     */
    function serialize(item: any, writeModel?: boolean, replacer?: (k: string, v: any) => any, whiteSpace?: string): string;
    /**
     * Deserializes JSON string and restores models.
     * @param json JSON string.
     * @param models Array of models' constructors. Each constructor must be parameterless.
     * @param reviver A function which prescribes how the value is transformed. Is called before model restore.
     */
    function deserialize(json: string, models?: {
        new (): Object;
    }[], reviver?: (k: string, v: any) => any): any;
}
declare type domEvent = Event;
declare type domMouseEvent = MouseEvent;
declare type domKeyboardEvent = KeyboardEvent;
declare module xp {
    interface UIEventArgs<T extends domEvent> {
        element: Element;
        elementX?: number;
        elementY?: number;
        domEvent: T;
    }
    interface EventArgs extends UIEventArgs<domEvent> {
    }
    interface MouseEventArgs extends UIEventArgs<domMouseEvent> {
    }
    interface KeyboardEventArgs extends UIEventArgs<domKeyboardEvent> {
    }
    function createEventArgs<T extends domEvent>(control: Element, domEventObject: T): UIEventArgs<T>;
}
declare type domElement = Element;
declare module xp {
    interface ElementMarkup<T extends Element> {
        onClick?: (e: MouseEventArgs) => void;
        onDoubleClick?: (e: MouseEventArgs) => void;
        onMouseDown?: (e: MouseEventArgs) => void;
        onMouseUp?: (e: MouseEventArgs) => void;
        onMouseMove?: (e: MouseEventArgs) => void;
        onMouseEnter?: (e: MouseEventArgs) => void;
        onMouseLeave?: (e: MouseEventArgs) => void;
        onKeyPress?: (e: KeyboardEvent) => void;
        onKeyDown?: (e: KeyboardEvent) => void;
        onKeyUp?: (e: KeyboardEvent) => void;
        onRendered?: (e: T) => void;
        onRemoved?: (e: T) => void;
        init?: (el: T) => void;
        enabled?: boolean | string;
        name?: string;
        key?: string;
        width?: string;
        height?: string;
        minWidth?: string;
        minHeight?: string;
        maxWidth?: string;
        maxHeight?: string;
        margin?: string;
        style?: string;
        flex?: string;
        visible?: boolean | string;
        useParentScope?: boolean;
        scope?: any;
    }
    /**
     * UI element.
     */
    class Element extends Model {
        init: (el: Element) => void;
        enabled: boolean;
        name: string;
        key: string;
        width: string;
        height: string;
        minWidth: string;
        minHeight: string;
        maxWidth: string;
        maxHeight: string;
        margin: string;
        style: string;
        flex: string;
        visible: boolean;
        /**
         * Creates UI element.
         */
        constructor(markup?: ElementMarkup<Element>);
        /**
         * Initializes UI element.
         */
        protected initElement(): void;
        /**
         * DOM element of a control.
         */
        domElement: HTMLElement;
        /**
         * Returns element's template.
         */
        protected getTemplate(): HTMLElement;
        /**
         * Renders an element into DOM.
         * @param domElement Target DOM element to be replaced with control.
         */
        renderTo(domElement: HTMLElement): void;
        __setRenderedState__(rendered: any): void;
        __isRendered__: boolean;
        onClick: Event<MouseEventArgs>;
        onDoubleClick: Event<MouseEventArgs>;
        onMouseDown: Event<MouseEventArgs>;
        onMouseUp: Event<MouseEventArgs>;
        onMouseMove: Event<MouseEventArgs>;
        onMouseEnter: Event<MouseEventArgs>;
        onMouseLeave: Event<MouseEventArgs>;
        onKeyPress: Event<KeyboardEventArgs>;
        onKeyDown: Event<KeyboardEventArgs>;
        onKeyUp: Event<KeyboardEventArgs>;
        /**
         * Is invoked when element is being removed.
         */
        onRemoved: xp.Event<Element>;
        /**
         * Is invoked when element is first time rendered.
         */
        onRendered: xp.Event<Element>;
        /**
         * Initializes control's events.
         */
        protected initEvents(): void;
        protected initSimpleDomEvent(eventName: string, event: Event<EventArgs>): void;
        applyMarkup(markup: ElementMarkup<Element>): void;
        /**
         * Defines a single property.
         * @param prop Property name.
         * @param options Property options.
         */
        protected defineProperty(prop: string, options: ElementPropertyOptions): void;
        /**
         * Defines element's properties.
         */
        protected defineProperties(): void;
        /**
         * Sets default values.
         */
        protected setDefaults(): void;
        /**
         * Gets element's parent.
         */
        parent: Container;
        __setParent__(parent: any): void;
        private _parent;
        /**
         * Handles parent context change.
         */
        protected parentScopeChangeHandler: () => void;
        /**
         * Specifies whether element should use parent data scope.
         */
        useParentScope: boolean;
        /**
         * Removes element.
         */
        remove(): void;
        /**
         * Inserts element before target element.
         * @param target Target element.
         */
        insertBefore(target: Element): void;
        /**
         * Inserts element after target element.
         * @param target Target element.
         */
        insertAfter(target: Element): void;
        /**
         * Adds an element at container's end.
         * @param container Container element.
         */
        appendTo(container: Container): void;
        /**
         * Adds an element at container's beginning.
         * @param container Container element.
         */
        prependTo(container: Container): void;
        detach(): void;
        /**
         * Bubbles up through all parents invoking a function.
         * Stops when function returns 'truthy' value.
         * @param fn Function to execute on each parent.
         * @returns Element which lead to returning 'truthy' value.
         */
        bubbleBy(fn: (el: Element) => any): Element;
        /**
         * Sets the focus to this element.
         */
        focus(): void;
        /**
         * Holds control's properties' bindings.
         */
        protected bindings: xp.Dictionary<string | {
            (value): void;
        }, BindingManager>;
        /**
         * Holds control's properties' expressions.
         */
        protected expressions: xp.Dictionary<string | {
            (value, el?: Element): void;
        }, Expression>;
        /**
         * Binds control's property to source property.
         * @param setter Control's property name or a function.
         * @param path Source property name.
         * @param source Binding source object. If not specified the element's scope will be used.
         * @param defaultValue Value to use is case when source property is null or undefined.
         */
        bind(setter: string | {
            (value): void;
        }, path: string, source?: any, defaultValue?: any): void;
        /**
         * Unbinds control property from data context.
         * @param setter Name of the property to unbind, or a reference to a setter.
         */
        unbind(setter: string): void;
        /**
         * Binds control's property to expression.
         * @param controlProperty Control's property name.
         * @param expression Expression e.g. "{obj.a} * 2 + Math.round({b})".
         * @param [source] Binding source object.
         */
        express(setter: string | {
            (value, element?: Element): void;
        }, expression: string, source?: any): void;
        /**
         * Get's or sets control's data scope.
         */
        scope: Object;
        private _scope;
        /**
         * Is invoked when user performs an input action.
         * @param setter Target control property or setter.
         * @param value Value, that user inputs.
         */
        protected onInput(setter: string | {
            (value): void;
        }, value: any): void;
        /**
         * Fires when data scope is changed.
         */
        onScopeChanged: xp.Event<Object>;
    }
    interface ElementPropertyOptions {
        setter?: (v) => void;
        getter?: () => any;
        observable?: boolean;
        acceptedValues?: any[];
    }
}
declare module xp {
    interface ButtonMarkup<T extends Button> extends ElementMarkup<T> {
        icon?: string;
        text?: string;
    }
    /**
     * Simple button.
     */
    class Button extends Element {
        icon: string;
        text: string;
        constructor(markup?: ButtonMarkup<Button>);
        protected getTemplate(): HTMLElement;
        protected iconElement: HTMLElement;
        protected textElement: HTMLElement;
        protected setDefaults(): void;
        protected defineProperties(): void;
    }
}
declare module xp {
    interface CheckBoxMarkup<T extends CheckBox> extends ElementMarkup<T> {
        onCheckChange?: (e: CheckChangeArgs) => void;
        checked?: boolean | string;
        text?: string;
        readonly?: boolean | string;
    }
    /**
     * Check box input.
     */
    class CheckBox extends Element {
        checked: boolean;
        text: string;
        readonly: boolean;
        constructor(markup?: CheckBoxMarkup<CheckBox>);
        protected getTemplate(): HTMLElement;
        protected checkElement: HTMLInputElement;
        protected textElement: HTMLElement;
        /**
         * Fires when check box value is changed.
         */
        onCheckChange: xp.Event<CheckChangeArgs>;
        protected initEvents(): void;
        protected setDefaults(): void;
        protected defineProperties(): void;
    }
    interface CheckChangeArgs extends EventArgs {
        checked: boolean;
    }
}
declare module xp {
    interface LabelMarkup<T extends Label> extends ElementMarkup<T> {
        text?: string;
    }
    class Label extends Element {
        text: string;
        constructor(markup?: LabelMarkup<Label>);
        protected getTemplate(): HTMLElement;
        protected defineProperties(): void;
    }
}
declare module xp {
    /**
     * Dummy placeholder.
     */
    class Placeholder extends Element {
        protected getTemplate(): HTMLElement;
        setDefaults(): void;
    }
}
declare module xp {
    interface RadioButtonMarkup<T extends RadioButton> extends CheckBoxMarkup<T> {
        group?: string;
        item?: any | string;
        selectedItem?: any | string;
    }
    /**
     * Radio button.
     */
    class RadioButton extends CheckBox {
        group: string;
        item: any;
        selectedItem: any;
        constructor(markup: RadioButtonMarkup<RadioButton>);
        protected getTemplate(): HTMLElement;
        protected initEvents(): void;
        protected defineProperties(): void;
    }
}
declare module xp {
    interface ToggleButtonMarkup<T extends ToggleButton> extends RadioButtonMarkup<T> {
        icon?: string;
    }
    class ToggleButton extends RadioButton {
        icon: string;
        constructor(markup?: ToggleButtonMarkup<ToggleButton>);
        protected getTemplate(): HTMLElement;
        protected iconElement: HTMLElement;
        protected textElement: HTMLElement;
        protected setDefaults(): void;
        protected defineProperties(): void;
    }
}
declare module xp {
    interface TextBoxMarkup<T extends TextBox> extends ElementMarkup<T> {
        onTextChange?: (e: TextChangeArgs) => void;
        text?: string;
        value?: number | string;
        notifyOnKeyDown?: boolean | string;
        type?: string;
        readonly?: boolean | string;
        placeholder?: string;
        min?: number;
        max?: number;
        step?: number;
    }
    /**
     * Text input.
     */
    class TextBox extends Element {
        text: string;
        value: number | string;
        notifyOnKeyDown: boolean;
        type: string;
        readonly: boolean;
        placeholder: string;
        min: number;
        max: number;
        step: number;
        constructor(markup?: TextBoxMarkup<TextBox>);
        protected getTemplate(): HTMLElement;
        domElement: HTMLInputElement | HTMLTextAreaElement;
        /**
         * Fires when element's text is changed.
         */
        onTextChange: Event<TextChangeArgs>;
        protected initEvents(): void;
        protected setDefaults(): void;
        protected defineProperties(): void;
    }
    interface TextChangeArgs extends EventArgs {
        oldText: string;
        newText: string;
    }
}
declare module xp {
    /**
     * Text input.
     */
    class TextArea extends TextBox {
        protected getTemplate(): HTMLElement;
        domElement: HTMLTextAreaElement;
    }
}
declare module xp {
    interface HtmlMarkup<T extends Html> extends ElementMarkup<T> {
        html?: { tag: string, attrs?: any, children?: any[] };
        url?: string;
    }
    /**
     * HTML content.
     */
    class Html extends Element {
        html: string;
        url: string;
        constructor(markup: HtmlMarkup<Html>);
        protected getTemplate(): HTMLDivElement;
        applyMarkup(markup: HtmlMarkup<Html>): void;
        protected defineProperties(): void;
    }
}
declare module xp {
    interface ContainerMarkup<T extends Container> extends ElementMarkup<T> {
        padding?: string;
    }
    /**
     * UI container.
     */
    class Container extends Element {
        padding: string;
        constructor(markup?: ContainerMarkup<Container>, children?: Element[]);
        /**
         * Initializes UI container.
         */
        protected initElement(): void;
        /**
         * Returns the DOM-element where children are placed.
         */
        protected getContainerElement(): HTMLElement;
        __setRenderedState__(rendered: any): void;
        protected defineProperties(): void;
        /**
         * Children.
         * WARNING: Must be set only by itself.
         */
        children: Element[];
        /**
         * Adds an element at container's end.
         * @param element Element to append.
         */
        append(element: Element): void;
        /**
         * Adds an element at container's beginning.
         * @param element Element to prepend.
         */
        prepend(element: Element): void;
        /**
         * Inserts element at index.
         * @param element Element to prepend.
         * @param index Index to insert at.
         */
        insert(element: Element, index: number): void;
        /**
         * Detaches the child element, but doesn't remove it.
         * @param child Element to detach.
         */
        detachChild(child: Element): void;
        /**
         * Cascades through all child elements invoking a function.
         * Stops when function returns 'truthy' value.
         * @param fn Function to execute on each element.
         * @param checkRoot Specifies whether to process root element.
         * @returns Element which lead to returning 'truthy' value.
         */
        cascadeBy(fn: (el: Element) => any, checkRoot?: boolean): Element;
        /**
         * Searches for the first matched.
         * @param predicate Predicate.
         */
        find(predicate: (el: Element) => boolean): Element;
        /**
         * Searches for all element with given name, key or selector.
         * @param predicate Predicate.
         */
        findAll(predicate: (el: Element) => boolean): Element[];
        /**
         * Removes element.
         */
        remove(): void;
        /**
         * Removes container's chlldren.
         */
        removeChildren(): void;
    }
}
declare module xp {
    interface StackMarkup<T extends Stack> extends ContainerMarkup<T> {
        itemsIndent?: string;
        scrollBar?: string;
        wrapping?: string;
    }
    /**
     * Base stack panel.
     */
    class Stack extends Container {
        itemsIndent: string;
        scrollBar: string;
        wrapping: string;
        protected setDefaults(): void;
        protected defineProperties(): void;
    }
}
declare module xp {
    interface HBoxMarkup<T extends HBox> extends StackMarkup<T> {
        contentAlign?: string;
        itemsAlign?: string;
    }
    /**
     * Horizontal stack panel.
     */
    class HBox extends Stack {
        contentAlign: string;
        itemsAlign: string;
        constructor(markup?: HBoxMarkup<HBox>, children?: Element[]);
        protected getTemplate(): HTMLElement;
        protected setDefaults(): void;
        protected defineProperties(): void;
    }
}
declare module xp {
    interface VBoxMarkup<T extends VBox> extends StackMarkup<T> {
        contentAlign?: string;
        itemsAlign?: string;
    }
    /**
     * Vertical stack panel.
     */
    class VBox extends Stack {
        contentAlign: string;
        itemsAlign: string;
        constructor(markup?: VBoxMarkup<VBox>, children?: Element[]);
        protected getTemplate(): HTMLElement;
        protected setDefaults(): void;
        protected defineProperties(): void;
    }
}
declare module xp {
    interface ListMarkup<T extends List> extends VBoxMarkup<T> {
        items?: any[] | string;
        itemId?: string;
        itemCreator?: (item?: any) => Element;
    }
    /**
     * List container.
     */
    class List extends VBox {
        items: any[];
        itemId: string;
        itemCreator: (item?: any) => Element;
        constructor(markup?: ListMarkup<List>);
        protected getTemplate(): HTMLElement;
        protected setDefaults(): void;
        protected defineProperties(): void;
        protected initEvents(): void;
        private itemsRegistar;
        protected addItem(index: number, item: any): void;
        private createItemScopeFrom(item);
        private itemReplacementToken;
        private itemReplacementHandlers;
        /**
         * Removes element.
         */
        remove(): void;
        protected removeReplacementHandlers(): void;
    }
}
declare module xp {
    interface WindowMarkup<T extends Window> extends VBoxMarkup<T> {
        title?: string;
    }
    /**
     * Window.
     */
    class Window extends VBox {
        title: string;
        constructor(markup?: WindowMarkup<Window>, children?: Element[]);
        /**
         * Instance of Window.
         */
        static instance: Window;
        protected getTemplate(): HTMLElement;
        protected initElement(): void;
        protected setDefaults(): void;
        protected defineProperties(): void;
        protected tint: ModalTint;
        protected modal: Element;
        /**
         * Shows modal dialog.
         * It may be any element but it is recommended to use a modal.
         */
        showModal(modal: Element): void;
        /**
         * Closes a current modal dialog.
         */
        closeModal(): void;
    }
}
declare module xp {
    interface ModalMarkup<T extends Modal> extends VBoxMarkup<T> {
        /**
         * If returns 'true', the dialog will be closed.
         * Otherwise the dialog will not be closed.
         */
        onClose?: () => boolean;
    }
    /**
     * Modal dialog base.
     */
    class Modal extends VBox {
        /**
         * If returns 'true', the dialog will be closed.
         * Otherwise the dialog will not be closed.
         */
        onClose: () => boolean;
        /**
         * Creates a modal dialog.
         */
        constructor(markup?: ModalMarkup<Modal>, children?: Element[]);
        /**
         * Displays the modal dialog.
         */
        show(): void;
        /**
         * Closes the dialog.
         */
        close(): void;
        protected getTemplate(): HTMLElement;
    }
    /**
     * Modal dialog tint.
     */
    class ModalTint extends Container {
        protected getTemplate(): HTMLElement;
    }
}
declare module xp {
    /**
     * Simple dialog that displays a message.
     */
    class MessageBox extends Modal {
        /**
         * Creates a message box.
         * @param message Message.
         * @param title Title.
         */
        constructor(message?: string, title?: string, actions?: {
            [text: string]: () => void;
        });
        /**
         * Displays a message box.
         * @param message Message.
         * @param title Title.
         */
        static show(message?: string, title?: string, actions?: {
            [text: string]: () => void;
        }): void;
    }
}
declare module xp {
    /**
     * Context menu.
     */
    class ContextMenu extends VBox {
        /**
         * Creates a context menu.
         * @param data Menu-items' data.
         */
        constructor(data: ContextMenuItemData[]);
        protected getTemplate(): HTMLElement;
        protected createMenuItem(data: ContextMenuItemData): void;
        /**
         * Displays the context menu.
         * @param x X.
         * @param y Y.
         */
        show(x: number, y: number): void;
        /**
         * Displays a context menu at a given point.
         * @param x X.
         * @param y Y.
         * @param data Menu-items' data.
         */
        static show(x: number, y: number, data: ContextMenuItemData[]): void;
    }
    interface ContextMenuItemData {
        text: string;
        action: () => void;
        key?: string;
        icon?: string;
        disabled?: boolean;
    }
}
declare module xp.Tests {
    /**
     * Throws an error if statement is not true.
     */
    function assert(statement: boolean): void;
    /**
     * Determines whether two objects are equal.
     * If not throws an error.
     */
    function assertEqual(a: any, b: any): void;
}
