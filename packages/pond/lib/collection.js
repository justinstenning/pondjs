"use strict";
/*
 *  Copyright (c) 2017, The Regents of the University of California,
 *  through Lawrence Berkeley National Laboratory (subject to receipt
 *  of any required approvals from the U.S. Dept. of Energy).
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Collection = void 0;
exports.collection = collectionFactory;
const Immutable = require("immutable");
const _ = require("lodash");
const base_1 = require("./base");
const collapse_1 = require("./collapse");
const event_1 = require("./event");
const select_1 = require("./select");
const timerange_1 = require("./timerange");
const functions_1 = require("./functions");
/**
 * Convert the `fieldspec` into a list if it is not already.
 */
function fieldAsArray(field) {
    if (_.isArray(field)) {
        return field;
    } else if (_.isString(field)) {
        return field.split(".");
    }
}
/**
 * A `Collection` holds a ordered (but not sorted) list of `Event`s and provides the
 * underlying functionality for manipulating those `Event`s.
 *
 * In Typescript, `Collection` is a generic of type `T`, which is the homogeneous
 * `Event` type of the `Collection`. `T` is likely one of:
 *  * `Collection<Time>`
 *  * `Collection<TimeRange>`
 *  * `Collection<Index>`
 *
 * A `Collection` has several sub-classes, including a `SortedCollection`, which maintains
 * `Events` in chronological order.
 *
 * A `TimeSeries` wraps a `SortedCollection` by attaching meta data to the series of
 * chronological `Event`s. This provides the most common structure to use for dealing with
 * sequences of `Event`s.
 */
class Collection extends base_1.Base {
    /**
     * Rebuild the keyMap from scratch
     */
    static buildKeyMap(events) {
        let keyMap = Immutable.Map();
        events.forEach((e, i) => {
            const k = e.getKey().toString();
            const indicies = keyMap.has(k) ? keyMap.get(k).add(i) : Immutable.Set([i]);
            keyMap = keyMap.set(k, indicies);
        });
        return keyMap;
    }
    /**
     * Construct a new `Collection`.
     *
     * You can construct a new empty `Collection` with `new`:
     *
     * ```
     * const myCollection = new Collection<Time>();
     * ```
     *
     * Alternatively, you can use the factory function:
     *
     * ```
     * const myCollection = collection<Time>();
     * ```
     *
     * A `Collection` may also be constructed with an initial list of `Events`
     * by supplying an `Immutable.List<Event<T>>`, or from another `Collection`
     * to make a copy.
     *
     * See also `SortedCollection`, which keeps `Event`s in chronological order,
     * and also allows you to do `groupBy` and `window` operations. For a higher
     * level interface for managing `Event`s, use the `TimeSeries`, which wraps
     * the `SortedCollection` along with meta data about that collection.
     */
    constructor(arg1) {
        super();
        if (!arg1) {
            this._events = Immutable.List();
            this._keyMap = Immutable.Map();
        } else if (arg1 instanceof Collection) {
            const other = arg1;
            this._events = other._events;
            this._keyMap = other._keyMap;
        } else if (Immutable.List.isList(arg1)) {
            this._events = arg1;
            this._keyMap = Collection.buildKeyMap(arg1);
        }
    }
    /**
     * Returns the `Collection` as a regular JSON object.
     */
    toJSON() {
        return this._events.toJS();
    }
    /**
     * Serialize out the `Collection` as a string. This will be the
     * string representation of `toJSON()`.
     */
    toString() {
        return JSON.stringify(this.toJSON());
    }
    /**
     * Adds a new `Event` into the `Collection`, returning a new `Collection`
     * containing that `Event`. Optionally the `Event`s may be de-duplicated.
     *
     * The dedup arg may `true` (in which case any existing `Event`s with the
     * same key will be replaced by this new Event), or with a function. If
     * dedup is a user function that function will be passed a list of all `Event`s
     * with that duplicated key and will be expected to return a single `Event`
     * to replace them with, thus shifting de-duplication logic to the user.
     *
     * Example 1:
     *
     * ```
     * let myCollection = collection<Time>()
     *     .addEvent(e1)
     *     .addEvent(e2);
     * ```
     *
     * Example 2:
     * ```
     * // dedup with the sum of the duplicated events
     * const myCollection = collection<Time>()
     *     .addEvent(e1)
     *     .addEvent(e2)
     *     .addEvent(e3, (events) => {
     *         const a = events.reduce((sum, e) => sum + e.get("a"), 0);
     *         return new Event<Time>(t, { a });
     *     });
     * ```
     */
    addEvent(event, dedup) {
        const k = event.getKey().toString();
        let events = this._events;
        let e = event; // Our event to be added
        let indicies = this._keyMap.has(k) ? this._keyMap.get(k) : Immutable.Set();
        // Dedup
        if (dedup) {
            const conflicts = this.atKey(event.getKey()).toList();
            if (conflicts.size > 0) {
                // Remove duplicates from the event list
                events = this._events.filterNot(
                    duplicate => duplicate.getKey().toString() === event.getKey().toString()
                );
                // Resolves the duplicates and this event to a single event
                if (_.isFunction(dedup)) {
                    e = dedup(conflicts.concat(e));
                }
                // Indicies for this key will only have this one event in it
                indicies = Immutable.Set();
            }
        }
        // Add the new event to our event list
        events = events.push(e);
        // Call the post add hook to give sub-classes a chance to modify
        // the event list. If they do, then we'll rebuild the keyMap.
        let newKeyMap = this._keyMap;
        indicies = indicies.add(events.size - 1);
        newKeyMap = this._keyMap.set(k, indicies);
        return this.clone(events, newKeyMap);
    }
    /**
     * Removes the `Event` (or duplicate keyed Events) with the given key.
     */
    removeEvents(key) {
        const k = key.toString();
        const indices = this._keyMap.get(k);
        const events = this._events.filterNot((event, i) => indices.has(i));
        const keyMap = this._keyMap.remove(k);
        return this.clone(events, keyMap);
    }
    /**
     * Takes the last n `Event`'s of the `Collection` and returns a new `Collection`.
     */
    takeLast(amount) {
        const events = this._events.takeLast(amount);
        const keyMap = Collection.buildKeyMap(events);
        return this.clone(events, keyMap);
    }
    /**
     * Completely replace the existing `Event`'s in this Collection.
     */
    setEvents(events) {
        let keyMap = Immutable.Map();
        events.forEach((e, i) => {
            const k = e.getKey().toString();
            const indicies = keyMap.has(k) ? keyMap.get(k).add(i) : Immutable.Set([i]);
            keyMap = keyMap.set(k, indicies);
        });
        return this.clone(events, keyMap);
    }
    /**
     * Returns the number of `Event`'s in this Collection
     */
    size() {
        return this._events.size;
    }
    /**
     * Returns the number of valid items in this `Collection`.
     *
     * Uses the `fieldPath` to look up values in all Events.
     *
     * It then counts the number that are considered valid, which
     * specifically are not:
     *  * NaN
     *  * undefined
     *  * null.
     */
    sizeValid(fieldPath = "value") {
        let count = 0;
        this._events.forEach(e => {
            if (e.isValid(fieldPath)) {
                count++;
            }
        });
        return count;
    }
    /**
     * Return if the `Collection` has any events in it
     */
    isEmpty() {
        return this.size() === 0;
    }
    /**
     * Returns the `Event` at the given position `pos` in the `Collection`. The
     * events in the `Collection` will be in the same order as they were inserted,
     * unless some sorting has been evoked by the user.
     *
     * Note: this is the least efficient way to fetch a point. If you wish to scan
     * the whole set of Events, use iterators (see `forEach()` and `map()`).
     * For direct access the `Collection` is optimized for returning results via
     * the `Event`'s key T, i.e. timestamp (see `atKey()`).
     *
     * Example:
     * ```
     * const c1 = collection(
     *     Immutable.List([
     *         event(time("2015-04-22T03:30:00Z"), Immutable.Map({ a: 5, b: 6 })),
     *         event(time("2015-04-22T02:30:00Z"), Immutable.Map({ a: 4, b: 2 }))
     *     ])
     * );
     * c1.at(1).get("a")  // 4
     * ```
     */
    at(pos) {
        return this.eventList().get(pos);
    }
    /**
     * Returns the `Event` located at the key specified, if it exists.
     *
     * Note: this doesn't find the closest key, or implement `bisect`. For that you need the
     * `SortedCollection`, that is also part of a `TimeSeries`.
     * On the plus side, if you know the key this is an efficient way to access the
     * `Event` within the `Collection`.
     *
     * Example:
     * ```
     * const t1 = time("2015-04-22T03:30:00Z");
     * const t2 = time("2015-04-22T02:30:00Z");
     * const c1 = collection(
     *     Immutable.List([
     *         event(t1, Immutable.Map({ a: 5, b: 6 })),
     *         event(t2, Immutable.Map({ a: 4, b: 2 }))
     *     ])
     * );
     * const event = collection.atKey(t2);
     * event.get("a")   // 4
     * ```
     */
    atKey(key) {
        const indexes = this._keyMap.get(key.toString());
        return indexes
            .map(i => {
                return this._events.get(i);
            })
            .toList();
    }
    /**
     * Returns the first event in the `Collection`.
     */
    firstEvent() {
        return this._events.first();
    }
    /**
     * Returns the last event in the `Collection`.
     */
    lastEvent() {
        return this._events.last();
    }
    /**
     * Returns all the `Event<T>`s as an `Immutable.List`.
     */
    eventList() {
        return this._events.toList();
    }
    /**
     * Returns the events in the `Collection` as an `Immutable.Map`, where
     * the key of type `T` (`Time`, `Index`, or `TimeRange`),
     * represented as a string, is mapped to the `Event` itself.
     *
     * @returns Immutable.Map<T, Event<T>> Events in this Collection,
     *                                     converted to a Map.
     */
    eventMap() {
        return this._events.toMap();
    }
    /**
     * Returns an iterator (`IterableIterator`) into the internal
     * list of events within this `Collection`.
     *
     * Example:
     * ```
     * let iterator = collection.entries();
     * for (let x = iterator.next(); !x.done; x = iterator.next()) {
     *     const [key, event] = x.value;
     *     console.log(`Key: ${key}, Event: ${event.toString()}`);
     * }
     * ```
     */
    entries() {
        return this._events.entries();
    }
    /**
     * Iterate over the events in this `Collection`.
     *
     * `Event`s are in the order that they were added, unless the Collection
     * has since been sorted. The `sideEffect` is a user supplied function which
     * is passed the `Event<T>` and the index.
     *
     * Returns the number of items iterated.
     *
     * Example:
     * ```
     * collection.forEach((e, i) => {
     *     console.log(`Event[${i}] is ${e.toString()}`);
     * })
     * ```
     */
    forEach(sideEffect) {
        return this._events.forEach(sideEffect);
    }
    /**
     * Map the `Event`s in this `Collection` to new `Event`s.
     *
     * For each `Event` passed to your `mapper` function you return a new Event.
     *
     * Example:
     * ```
     * const mapped = sorted.map(event => {
     *     return new Event(event.key(), { a: event.get("x") * 2 });
     * });
     * ```
     */
    map(mapper) {
        const remapped = this._events.map(mapper);
        return new Collection(Immutable.List(remapped));
    }
    /**
     * Remap the keys, but keep the data the same. You can use this if you
     * have a `Collection` of `Event<Index>` and want to convert to events
     * of `Event<Time>`s, for example. The return result of remapping the
     * keys of a T to U i.e. `Collection<T>` remapped with new keys of type
     * `U` as a `Collection<U>`.
     *
     * Example:
     *
     * In this example we remap `Time` keys to `TimeRange` keys using the `Time.toTimeRange()`
     * method, centering the new `TimeRange`s around each `Time` with duration given
     * by the `Duration` object supplied, in this case representing one hour.
     *
     * ```
     * const remapped = myCollection.mapKeys<TimeRange>(t =>
     *     t.toTimeRange(duration("1h"), TimeAlignment.Middle)
     * );
     * ```
     *
     */
    mapKeys(mapper) {
        const list = this._events.map(
            event => new event_1.Event(mapper(event.getKey()), event.getData())
        );
        return new Collection(list);
    }
    /**
     * Flat map over the events in this `Collection`.
     *
     * For each `Event<T>` passed to your callback function you should map that to
     * zero, one or many `Event<U>`s, returned as an `Immutable.List<Event<U>>`.
     *
     * Example:
     * ```
     * const processor = new Fill<T>(options);  // processor addEvent() returns 0, 1 or n new events
     * const filled = this.flatMap<T>(e => processor.addEvent(e));
     * ```
     */
    flatMap(mapper) {
        const remapped = this._events.flatMap(mapper);
        return new Collection(Immutable.List(remapped));
    }
    /**
     * Sorts the `Collection` by the `Event` key `T`.
     *
     * In the case case of the key being `Time`, this is clear.
     * For `TimeRangeEvents` and `IndexedEvents`, the `Collection`
     * will be sorted by the begin time.
     *
     * This method is particularly useful when the `Collection`
     * will be passed into a `TimeSeries`.
     *
     * See also `Collection.isChronological()`.
     *
     * @example
     * ```
     * const sorted = collection.sortByKey();
     * ```
     */
    sortByKey() {
        const sorted = Immutable.List(
            this._events.sortBy(event => {
                return +event.getKey().timestamp();
            })
        );
        return new Collection(sorted);
    }
    /**
     * Sorts the `Collection` using the value referenced by
     * the `field`.
     */
    sort(field) {
        const fs = fieldAsArray(field);
        const sorted = Immutable.List(
            this._events.sortBy(event => {
                return event.get(fs);
            })
        );
        return new Collection(sorted);
    }
    /**
     * Perform a slice of events within the `Collection`, returns a new
     * `Collection` representing a portion of this `TimeSeries` from `begin` up to
     * but not including `end`.
     */
    slice(begin, end) {
        return this.setEvents(this._events.slice(begin, end));
    }
    /**
     * Returns a new `Collection` with all `Event`s except the first
     */
    rest() {
        return this.setEvents(this._events.rest());
    }
    /**
     * Filter the Collection's `Event`'s with the supplied function.
     *
     * The function `predicate` is passed each `Event` and should return
     * true to keep the `Event` or false to discard.
     *
     * Example:
     * ```
     * const filtered = collection.filter(e => e.get("a") < 8)
     * ```
     */
    filter(predicate) {
        return this.setEvents(this._events.filter(predicate));
    }
    /**
     * Returns the time range extents of the `Collection` as a `TimeRange`.
     *
     * Since this `Collection` is not necessarily in order, this method will traverse the
     * `Collection` and determine the earliest and latest time represented within it.
     */
    timerange() {
        let minimum;
        let maximum;
        this.forEach(e => {
            if (!minimum || e.begin() < minimum) {
                minimum = e.begin();
            }
            if (!maximum || e.end() > maximum) {
                maximum = e.end();
            }
        });
        if (minimum && maximum) {
            return (0, timerange_1.timerange)(minimum, maximum);
        }
    }
    aggregate(reducer, fieldSpec) {
        const v = event_1.Event.aggregate(this.eventList(), reducer, fieldSpec);
        if (_.isString(fieldSpec)) {
            return v[fieldSpec];
        } else if (_.isArray(fieldSpec)) {
            return v;
        }
    }
    first(fieldSpec, filter) {
        return this.aggregate((0, functions_1.first)(filter), fieldSpec);
    }
    last(fieldSpec, filter) {
        return this.aggregate((0, functions_1.last)(filter), fieldSpec);
    }
    sum(fieldSpec, filter) {
        return this.aggregate((0, functions_1.sum)(filter), fieldSpec);
    }
    avg(fieldSpec, filter) {
        return this.aggregate((0, functions_1.avg)(filter), fieldSpec);
    }
    max(fieldSpec, filter) {
        return this.aggregate((0, functions_1.max)(filter), fieldSpec);
    }
    min(fieldSpec, filter) {
        return this.aggregate((0, functions_1.min)(filter), fieldSpec);
    }
    median(fieldSpec, filter) {
        return this.aggregate((0, functions_1.median)(filter), fieldSpec);
    }
    stdev(fieldSpec, filter) {
        return this.aggregate((0, functions_1.stdev)(filter), fieldSpec);
    }
    percentile(q, fieldSpec, interp = functions_1.InterpolationType.linear, filter) {
        return this.aggregate((0, functions_1.percentile)(q, interp, filter), fieldSpec);
    }
    /**
     * Gets n quantiles within the `Collection`.
     *
     * The quantiles function has several parameters that can be supplied:
     * * `n` - The number of quantiles
     * * `column` - Field to find the quantiles within
     * * `interp` - Specifies the interpolation method to use when the desired, see below
     *
     * For `interp` a `InterpolationType` should be supplied if the default ("linear") is
     * not used. This enum is defined like so:
     * ```
     * enum InterpolationType {
     *     linear = 1,
     *     lower,
     *     higher,
     *     nearest,
     *     midpoint
     * }
     * ```
     * Emum values:
     *   * `linear`: i + (j - i) * fraction, where fraction is the
     *             fractional part of the index surrounded by i and j.
     *   * `lower`: i.
     *   * `higher`: j.
     *   * `nearest`: i or j whichever is nearest.
     *   * `midpoint`: (i + j) / 2.
     */
    quantile(n, column = "value", interp = functions_1.InterpolationType.linear) {
        const results = [];
        const sorted = this.sort(column);
        const subsets = 1.0 / n;
        if (n > this.size()) {
            throw new Error("Subset n is greater than the Collection length");
        }
        for (let i = subsets; i < 1; i += subsets) {
            const index = Math.floor((sorted.size() - 1) * i);
            if (index < sorted.size() - 1) {
                const fraction = (sorted.size() - 1) * i - index;
                const v0 = +sorted.at(index).get(column);
                const v1 = +sorted.at(index + 1).get(column);
                let v;
                if (functions_1.InterpolationType.lower || fraction === 0) {
                    v = v0;
                } else if (functions_1.InterpolationType.linear) {
                    v = v0 + (v1 - v0) * fraction;
                } else if (functions_1.InterpolationType.higher) {
                    v = v1;
                } else if (functions_1.InterpolationType.nearest) {
                    v = fraction < 0.5 ? v0 : v1;
                } else if (functions_1.InterpolationType.midpoint) {
                    v = (v0 + v1) / 2;
                }
                results.push(v);
            }
        }
        return results;
    }
    /**
     * Returns true if all events in this `Collection` are in chronological order.
     */
    isChronological() {
        let result = true;
        let t;
        this.forEach(e => {
            if (!t) {
                t = e.timestamp().getTime();
            } else {
                if (e.timestamp() < t) {
                    result = false;
                }
                t = e.timestamp();
            }
        });
        return result;
    }
    /**
     * Collapse multiple columns of a `Collection` into a new column.
     *
     * The `collapse()` method needs to be supplied with a `CollapseOptions`
     * object. You use this to specify the columns to collapse, the column name
     * of the column to collapse to and the reducer function. In addition you
     * can choose to append this new column or use it in place of the columns
     * collapsed.
     *
     * ```
     * {
     *    fieldSpecList: string[];
     *    fieldName: string;
     *    reducer: any;
     *    append: boolean;
     * }
     * ```
     * Options:
     *  * `fieldSpecList` - the list of fields to collapse
     *  * `fieldName` - the new field's name
     *  * `reducer()` - a function to collapse using e.g. `avg()`
     *  * `append` - to include only the new field, or include it in addition
     *     to the previous fields.
     *
     * Example:
     * ```
     * // Initial collection
     * const t1 = time("2015-04-22T02:30:00Z");
     * const t2 = time("2015-04-22T03:30:00Z");
     * const t3 = time("2015-04-22T04:30:00Z");
     * const c = collection<Time>()
     *     .addEvent(event(t1, Immutable.Map({ a: 5, b: 6 })))
     *     .addEvent(event(t2, Immutable.Map({ a: 4, b: 2 })))
     *     .addEvent( event(t2, Immutable.Map({ a: 6, b: 3 })));
     *
     * // Sum columns "a" and "b" into a new column "v"
     * const sums = c.collapse({
     *     fieldSpecList: ["a", "b"],
     *     fieldName: "v",
     *     reducer: sum(),
     *     append: false
     * });
     *
     * sums.at(0).get("v")  // 11
     * sums.at(1).get("v")  // 6
     * sums.at(2).get("v")  // 9
     * ```
     */
    collapse(options) {
        const p = new collapse_1.Collapse(options);
        return this.flatMap(e => p.addEvent(e));
    }
    /**
     * Select out specified columns from the `Event`s within this `Collection`.
     *
     * The `select()` method needs to be supplied with a `SelectOptions`
     * object, which takes the following form:
     *
     * ```
     * {
     *     fields: string[];
     * }
     * ```
     * Options:
     *  * `fields` - array of columns to keep within each `Event`.
     *
     * Example:
     * ```
     * const timestamp1 = time("2015-04-22T02:30:00Z");
     * const timestamp2 = time("2015-04-22T03:30:00Z");
     * const timestamp3 = time("2015-04-22T04:30:00Z");
     * const e1 = event(timestamp1, Immutable.Map({ a: 5, b: 6, c: 7 }));
     * const e2 = event(timestamp2, Immutable.Map({ a: 4, b: 5, c: 6 }));
     * const e3 = event(timestamp2, Immutable.Map({ a: 6, b: 3, c: 2 }));
     *
     * const c = collection<Time>()
     *     .addEvent(e1)
     *     .addEvent(e2)
     *     .addEvent(e3);
     *
     * const c1 = c.select({
     *     fields: ["b", "c"]
     * });
     *
     * // result: 3 events containing just b and c (a is discarded)
     * ```
     */
    select(options) {
        const p = new select_1.Select(options);
        return this.flatMap(e => p.addEvent(e));
    }
    //
    // To be reimplemented by subclass
    //
    /**
     * Internal method to clone this `Collection` (protected)
     */
    clone(events, keyMap) {
        const c = new Collection();
        c._events = events;
        c._keyMap = keyMap;
        return c;
    }
    onEventAdded(events) {
        return events;
    }
}
exports.Collection = Collection;
function collectionFactory(arg1) {
    return new Collection(arg1);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9jb2xsZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7R0FRRzs7O0FBNDZCMkIsdUNBQVU7QUExNkJ4Qyx1Q0FBdUM7QUFDdkMsNEJBQTRCO0FBRTVCLGlDQUE4QjtBQUM5Qix5Q0FBc0M7QUFDdEMsbUNBQWdDO0FBRWhDLHFDQUFrQztBQUNsQywyQ0FBbUQ7QUFNbkQsMkNBV3FCO0FBRXJCOztHQUVHO0FBQ0gsU0FBUyxZQUFZLENBQUMsS0FBd0I7SUFDMUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDbkIsT0FBTyxLQUFLLENBQUM7SUFDakIsQ0FBQztTQUFNLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQzNCLE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM1QixDQUFDO0FBQ0wsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7O0dBZ0JHO0FBQ0gsTUFBYSxVQUEwQixTQUFRLFdBQUk7SUFDL0M7O09BRUc7SUFDTyxNQUFNLENBQUMsV0FBVyxDQUN4QixNQUFnQztRQUVoQyxJQUFJLE1BQU0sR0FBRyxTQUFTLENBQUMsR0FBRyxFQUFpQyxDQUFDO1FBRTVELE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDcEIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2hDLE1BQU0sUUFBUSxHQUEwQixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDakQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDdEIsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxH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
