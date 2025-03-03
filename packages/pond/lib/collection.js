/*
 *  Copyright (c) 2017, The Regents of the University of California,
 *  through Lawrence Berkeley National Laboratory (subject to receipt
 *  of any required approvals from the U.S. Dept. of Energy).
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */
import * as Immutable from "immutable";
import * as _ from "lodash";
import { Base } from "./base";
import { Collapse } from "./collapse";
import { Event } from "./event";
import { Select } from "./select";
import { timerange } from "./timerange";
import {
    avg,
    first,
    InterpolationType,
    last,
    max,
    median,
    min,
    percentile,
    stdev,
    sum
} from "./functions";
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
export class Collection extends Base {
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
        const list = this._events.map(event => new Event(mapper(event.getKey()), event.getData()));
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
            return timerange(minimum, maximum);
        }
    }
    aggregate(reducer, fieldSpec) {
        const v = Event.aggregate(this.eventList(), reducer, fieldSpec);
        if (_.isString(fieldSpec)) {
            return v[fieldSpec];
        } else if (_.isArray(fieldSpec)) {
            return v;
        }
    }
    first(fieldSpec, filter) {
        return this.aggregate(first(filter), fieldSpec);
    }
    last(fieldSpec, filter) {
        return this.aggregate(last(filter), fieldSpec);
    }
    sum(fieldSpec, filter) {
        return this.aggregate(sum(filter), fieldSpec);
    }
    avg(fieldSpec, filter) {
        return this.aggregate(avg(filter), fieldSpec);
    }
    max(fieldSpec, filter) {
        return this.aggregate(max(filter), fieldSpec);
    }
    min(fieldSpec, filter) {
        return this.aggregate(min(filter), fieldSpec);
    }
    median(fieldSpec, filter) {
        return this.aggregate(median(filter), fieldSpec);
    }
    stdev(fieldSpec, filter) {
        return this.aggregate(stdev(filter), fieldSpec);
    }
    percentile(q, fieldSpec, interp = InterpolationType.linear, filter) {
        return this.aggregate(percentile(q, interp, filter), fieldSpec);
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
    quantile(n, column = "value", interp = InterpolationType.linear) {
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
                if (InterpolationType.lower || fraction === 0) {
                    v = v0;
                } else if (InterpolationType.linear) {
                    v = v0 + (v1 - v0) * fraction;
                } else if (InterpolationType.higher) {
                    v = v1;
                } else if (InterpolationType.nearest) {
                    v = fraction < 0.5 ? v0 : v1;
                } else if (InterpolationType.midpoint) {
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
        const p = new Collapse(options);
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
        const p = new Select(options);
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
function collectionFactory(arg1) {
    return new Collection(arg1);
}
export { collectionFactory as collection };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9jb2xsZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7OztHQVFHO0FBRUgsT0FBTyxLQUFLLFNBQVMsTUFBTSxXQUFXLENBQUM7QUFDdkMsT0FBTyxLQUFLLENBQUMsTUFBTSxRQUFRLENBQUM7QUFFNUIsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUM5QixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ3RDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFFaEMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUNsQyxPQUFPLEVBQUUsU0FBUyxFQUFhLE1BQU0sYUFBYSxDQUFDO0FBTW5ELE9BQU8sRUFDSCxHQUFHLEVBQ0gsS0FBSyxFQUNMLGlCQUFpQixFQUNqQixJQUFJLEVBQ0osR0FBRyxFQUNILE1BQU0sRUFDTixHQUFHLEVBQ0gsVUFBVSxFQUNWLEtBQUssRUFDTCxHQUFHLEVBQ04sTUFBTSxhQUFhLENBQUM7QUFFckI7O0dBRUc7QUFDSCxTQUFTLFlBQVksQ0FBQyxLQUF3QjtJQUMxQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUNuQixPQUFPLEtBQUssQ0FBQztJQUNqQixDQUFDO1NBQU0sSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDM0IsT0FBTyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzVCLENBQUM7QUFDTCxDQUFDO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7R0FnQkc7QUFDSCxNQUFNLE9BQU8sVUFBMEIsU0FBUSxJQUFJO0lBQy9DOztPQUVHO0lBQ08sTUFBTSxDQUFDLFdBQVcsQ0FDeEIsTUFBZ0M7UUFFaEMsSUFBSSxNQUFNLEdBQUcsU0FB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
