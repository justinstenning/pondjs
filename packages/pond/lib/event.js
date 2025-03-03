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
import { Index, index } from "./index";
import { Time, time } from "./time";
import { TimeRange, timerange } from "./timerange";
import util from "./util";
/**
 * An Event is a mapping from a time based key to a data object represented
 * by an `Immutable.Map`.
 *
 * The key needs to be a sub-class of the base class `Key`, which typically
 * would be one of the following:
 *
 *  * `Time` - a single timestamp
 *  * `TimeRange` - a timerange over which the Event took place
 *  * `Index` - a different representation of a TimeRange
 *
 * The data object needs to be an `Immutable.Map<string, any>`.
 *
 * To get values out of the data, use `get()`. This method takes
 * what is called a field, which is a top level key of the data
 * map.
 *
 * Fields can refer to deep data with either a path (as an array)
 * or dot notation ("path.to.value").
 *
 * Example:
 *
 * ```
 * const timestamp = time(new Date("2015-04-22T03:30:00Z");
 * const e = event(t, Immutable.Map({ temperature: 75.2, humidity: 84 }));
 * const humidity = e.get("humidity");  // 84
 * ```
 *
 * There exists several static methods for `Event` that enable the
 * ability to compare `Events`, `merge()` or `combine()` lists of `Event`s or
 * check for duplicates.
 *
 * You can also do per-`Event` operations like `select()` out specific fields or
 * `collapse()` multiple fields into one using an aggregation function.
 *
 * Note: Managing multiple `Event`s is typically done with a `Collection`
 * which is literally a collections of `Event`s, or a `TimeSeries` which
 * is an chronological set of `Event`s plus some additional meta data.
 */
export class Event extends Base {
    /**
     * Do the two supplied events contain the same data, even if they are not
     * the same instance? Uses `Immutable.is()` to compare the event data and
     * the key.
     */
    static is(event1, event2) {
        return (
            event1.getKey().toString() === event2.getKey().toString() &&
            event1.getData().equals(event2.getData())
        );
    }
    /**
     * Returns if the two supplied events are duplicates of each other.
     *
     * Duplicated is defined as the keys of the `Event`s being the same.
     * This is the case with incoming events sometimes where a second event
     * is either known to be the same (but duplicate) of the first, or
     * supersedes the first.
     *
     * You can also pass in `false` for `ignoreValues` and get a full compare,
     * including the data of the event, thus ignoring the supersede case.
     *
     * Example:
     * ```
     * const e1 = event(t, Immutable.Map({ a: 5, b: 6, c: 7 }));
     * const e2 = event(t, Immutable.Map({ a: 5, b: 6, c: 7 }));
     * const e3 = event(t, Immutable.Map({ a: 100, b: 6, c: 7 }));
     *
     * Event.isDuplicate(e1, e2)        // true
     * Event.isDuplicate(e1, e3)        // true
     * Event.isDuplicate(e1, e3, false) // false
     * Event.isDuplicate(e1, e2, false) // false
     * ```
     */
    static isDuplicate(event1, event2, ignoreValues = true) {
        if (ignoreValues) {
            return (
                event1.keyType() === event2.keyType() &&
                event1.getKey().toString() === event2.getKey().toString()
            );
        } else {
            return event1.keyType() === event2.keyType() && Event.is(event1, event2);
        }
    }
    /**
     * Merges multiple `Event`'s together into a new array of `Event`s, one
     * for each key of the source events. Merging is done on the data of
     * each `Event`. Values from later events in the list overwrite
     * earlier values if fields conflict.
     *
     * Common use cases:
     *   * append events of different timestamps
     *     e.g. merge earlier events with later events
     *   * merge in events with one field to events with another field
     *     e.g. combine events with a field "in" with another list of events
     *          with a field "out" to get events with both "in" and "out"
     *   * merge in events that supersede the previous events
     *
     * Events in the supplied list need to be of homogeneous types
     *
     * See also:
     *  * `TimeSeries.timeSeriesListMerge()` if what you have is a
     * `TimeSeries`. That uses this code but with a friendlier API.
     *
     * Example:
     * ```
     * const t = time(new Date("2015-04-22T03:30:00Z"));
     * const event1 = event(t, Immutable.Map({ a: 5, b: 6 }));
     * const event2 = event(t, Immutable.Map({ c: 2 }));
     * const merged = Event.merge(Immutable.List([event1, event2]));
     * merged.get(0).get("a");    // 5
     * merged.get(0).get("b");    // 6
     * merged.get(0).get("c");    // 2
     */
    static merge(events, deep) {
        // Early exit
        if (events instanceof Immutable.List && events.size === 0) {
            return Immutable.List();
        }
        //
        // Group events by event key
        //
        const mergeDeep = deep || false;
        const eventList = [];
        const eventMap = {};
        const keyMap = {};
        events.forEach(e => {
            const key = e.getKey();
            const k = key.toString();
            if (!_.has(eventMap, k)) {
                eventMap[k] = [];
                keyMap[k] = e.getKey();
            }
            eventMap[k].push(e);
        });
        //
        // For each key we'll build a new event of the same type as the source
        // events. Here we loop through all the events for that key, then for each field
        // we are considering, we get all the values and reduce them (sum, avg, etc)
        // to a new data object d, which we then build a new Event from.
        //
        const outEvents = [];
        _.each(eventMap, (perKeyEvents, key) => {
            let reduced = null;
            let d = null;
            _.each(perKeyEvents, e => {
                if (!reduced) {
                    reduced = e;
                    d = reduced.getData();
                } else {
                    d = mergeDeep ? d.mergeDeep(e.getData()) : d.merge(e.getData());
                }
                reduced = reduced.setData(d);
            });
            outEvents.push(reduced);
        });
        return Immutable.List(outEvents);
    }
    /**
     * Returns a function that will take a list of `Event`s and merge them
     * together using the `fieldSpec` provided. This is used as a `reducer` for
     * merging multiple `TimeSeries` together with `TimeSeries.timeSeriesListMerge()`.
     */
    static merger(deep) {
        return events => Event.merge(events, deep);
    }
    /**
     * Static function to combine multiple `Event`s together into a new array
     * of events, one `Event` for each key of the source events. The list of
     * `Events` should be specified as an array or `Immutable.List<Event<K>>`.
     *
     * Combining acts on the fields specified in the `fieldSpec` (or all
     * fields) and uses the `reducer` function supplied to take the multiple
     * values associated with the key and reduce them down to a single value.
     *
     * The return result will be an `Immutable.List<Event<K>>` of the same type K
     * as the input.
     *
     * Example:
     * ```
     * const t = time("2015-04-22T03:30:00Z");
     * const events = [
     *     event(t, Immutable.Map({ a: 5, b: 6, c: 7 })),
     *     event(t, Immutable.Map({ a: 2, b: 3, c: 4 })),
     *     event(t, Immutable.Map({ a: 1, b: 2, c: 3 }))
     * ];
     * const result = Event.combine(Immutable.List(events), sum());
     * // result[0] is {a: 8, b: 11, c: 14 }
     * ```
     * See also: `TimeSeries.timeSeriesListSum()`
     */
    static combine(events, reducer, fieldSpec) {
        if (events instanceof Immutable.List && events.size === 0) {
            return Immutable.List();
        }
        let eventTemplate;
        if (events instanceof Immutable.List) {
            eventTemplate = events.get(0);
        } else {
            eventTemplate = events[0];
        }
        let fieldNames;
        if (_.isString(fieldSpec)) {
            fieldNames = [fieldSpec];
        } else if (_.isArray(fieldSpec)) {
            fieldNames = fieldSpec;
        }
        //
        // Group events by event key
        //
        const eventMap = {};
        const keyMap = {};
        events.forEach(e => {
            const key = e.getKey();
            const k = key.toString();
            if (!_.has(eventMap, k)) {
                eventMap[k] = [];
                keyMap[k] = e.getKey();
            }
            eventMap[k].push(e);
        });
        //
        // For each key we'll build a new event of the same type as the source
        // events. Here we loop through all the events for that key, then for
        // each field we are considering, we get all the values and reduce
        // them (sum, avg, etc) to get a the new data for that key.
        //
        const outEvents = [];
        _.each(eventMap, (perKeyEvents, key) => {
            // tslint:disable-next-line
            const mapEvent = {};
            _.each(perKeyEvents, perKeyEvent => {
                let fields = fieldNames;
                if (!fields) {
                    const obj = perKeyEvent.getData().toJSON();
                    fields = _.map(obj, (v, fieldName) => `${fieldName}`);
                }
                fields.forEach(fieldName => {
                    if (!mapEvent[fieldName]) {
                        mapEvent[fieldName] = [];
                    }
                    mapEvent[fieldName].push(perKeyEvent.getData().get(fieldName));
                });
            });
            const data = {};
            _.map(mapEvent, (values, fieldName) => {
                data[fieldName] = reducer(values);
            });
            const e = new Event(keyMap[key], eventTemplate.getData().merge(data));
            outEvents.push(e);
        });
        return Immutable.List(outEvents);
    }
    /**
     * Static method that returns a function that will take a list of `Event`'s
     * and combine them together using the `fieldSpec` and reducer function provided.
     * This is used as an event reducer for merging multiple `TimeSeries` together
     * with `timeSeriesListReduce()`.
     */
    static combiner(fieldSpec, reducer) {
        return events => Event.combine(events, reducer, fieldSpec);
    }
    static map(events, multiFieldSpec = "value") {
        const result = {};
        if (typeof multiFieldSpec === "string") {
            const fieldSpec = multiFieldSpec;
            events.forEach(e => {
                if (!_.has(result, fieldSpec)) {
                    result[fieldSpec] = [];
                }
                const value = e.get(fieldSpec);
                result[fieldSpec].push(value);
            });
        } else if (_.isArray(multiFieldSpec)) {
            const fieldSpecList = multiFieldSpec;
            _.each(fieldSpecList, fieldSpec => {
                events.forEach(e => {
                    if (!_.has(result, fieldSpec)) {
                        result[fieldSpec] = [];
                    }
                    result[fieldSpec].push(e.get(fieldSpec));
                });
            });
        } else {
            events.forEach(e => {
                _.each(e.data().toJSON(), (value, key) => {
                    if (!_.has(result, key)) {
                        result[key] = [];
                    }
                    result[key].push(value);
                });
            });
        }
        return result;
    }
    /**
     * Static function that takes a `Immutable.List` of events, a `reducer` function and a
     * `fieldSpec` (field or list of fields) and returns an aggregated result in the form
     * of a new Event, for each column.
     *
     * The reducer is of the form:
     * ```
     * (values: number[]) => number
     * ```
     *
     * Example:
     * ```
     * const result = Event.aggregate(EVENT_LIST, avg(), ["in", "out"]);
     * // result = { in: 5, out: 14.25 }
     * ```
     */
    static aggregate(events, reducer, multiFieldSpec) {
        function reduce(mapped, f) {
            const result = {};
            _.each(mapped, (valueList, key) => {
                result[key] = f(valueList);
            });
            return result;
        }
        return reduce(this.map(events, multiFieldSpec), reducer);
    }
    /**
     * Construction of an `Event` requires both a time-based key and an
     * `Immutable.Map` of (`string` -> data) mappings.
     *
     * The time-based key should be either a `Time`, a `TimeRange` or an `Index`,
     * though it would be possible to subclass `Key` with another type so long
     * as it implements that abstract interface.
     *
     * The data portion maybe deep data. Using `Immutable.toJS()` is helpful in
     * that case.
     *
     * You can use `new Event<T>()` to create a new `Event`, but it's easier to use
     * one of the factory functions: `event()`, `timeEvent()`, `timeRangeEvent()` and
     * `indexedEvent()`
     *
     * Example 1:
     * ```
     * const e = event(time(new Date(1487983075328)), Immutable.Map({ name: "bob" }));
     * ```
     *
     * Example 2:
     * ```
     * // An event for a particular day with indexed key
     * const e = event(index("1d-12355"), Immutable.Map({ value: 42 }));
     * ```
     *
     * Example 3:
     * ```
     * // Outage event spans a timerange
     * const e = event(timerange(beginTime, endTime), Immutable.Map({ ticket: "A1787383" }));
     * ```
     *
     * Example 4:
     * ```
     * const e = timeEvent({
     *     time: 1487983075328,
     *     data: { a: 2, b: 3 }
     * });
     * ```
     */
    constructor(key, data) {
        super();
        this.key = key;
        this.data = data;
    }
    /**
     * Returns the key this `Event`.
     *
     * The result is of type T (a `Time`, `TimeRange` or `Index`), depending on
     * what the `Event` was constructed with.
     */
    getKey() {
        return this.key;
    }
    /**
     * Returns the label of the key
     */
    keyType() {
        return this.key.type();
    }
    /**
     * Returns the data associated with this event in the form
     * of an `Immutable.Map`. This is infact an accessor for the internal
     * representation of data in this `Event`.
     */
    getData() {
        return this.data;
    }
    /**
     * Sets new `data` associated with this event. The new `data` is supplied
     * in the form of an `Immutable.Map`. A new `Event<T>` will be returned
     * containing this new data, but having the same key.
     */
    setData(data) {
        return new Event(this.key, data);
    }
    /**
     * Gets the `value` of a specific field within the `Event`.
     *
     * You can refer to a fields with one of the following notations:
     *  * (undefined) -> "value"
     *  * "temperature"
     *  * "path.to.deep.data"
     *  * ["path", "to", "deep", "data"].
     *
     * Example 1:
     * ```
     * const e = event(index("1d-12355"), Immutable.Map({ value: 42 }));
     * e.get("value"); // 42
     * ```
     *
     * Example 2:
     * ```
     * const t = time(new Date("2015-04-22T03:30:00Z"));
     * const e = event(t, Immutable.fromJS({ a: 5, b: { c: 6 } }));
     * e.get("b.c"); // 6
     * ```
     *
     * Note: the default `field` is "value".
     */
    get(field = "value") {
        const f = util.fieldAsArray(field);
        return this.getData().getIn(f);
    }
    /**
     * Set a new `value` on the `Event` for the given `field`, and return a new `Event`.
     *
     * You can refer to a `field` with one of the following notations:
     *  * (undefined) -> "value"
     *  * "temperature"
     *  * "path.to.deep.data"
     *  * ["path", "to", "deep", "data"].
     *
     * `value` is the new value to set on for the given `field` on the `Event`.
     *
     * ```
     * const t = time(new Date(1487983075328));
     * const initial = event(t, Immutable.Map({ name: "bob" }));
     * const modified = e.set("name", "fred");
     * modified.toString() // {"time": 1487983075328, "data": {"name":"fred"} }
     * ```
     */
    set(field = "value", value) {
        const f = util.fieldAsArray(field);
        return new Event(this.getKey(), this.getData().setIn(f, value));
    }
    /**
     * Will return false if the value for the specified `fields` in this `Event` is
     * either `undefined`, `NaN` or `null` for the given field or fields. This
     * serves as a determination of a "missing" value within a `TimeSeries` or
     * `Collection`.
     */
    isValid(fields) {
        let invalid = false;
        const fieldList = _.isUndefined(fields) || _.isArray(fields) ? fields : [fields];
        fieldList.forEach(field => {
            const v = this.get(field);
            invalid = _.isUndefined(v) || _.isNaN(v) || _.isNull(v);
        });
        return !invalid;
    }
    /**
     * Converts the `Event` into a standard Javascript object
     */
    toJSON() {
        const k = this.getKey().toJSON()[this.keyType()];
        return {
            [this.keyType()]: k,
            data: this.getData().toJSON()
        };
    }
    /**
     * Converts the `Event` to a string
     */
    toString() {
        return JSON.stringify(this.toJSON());
    }
    /**
     * Returns the timestamp of the `Event`.
     *
     * This a convenience for calling `Event.getKey()` followed by `timestamp()`.
     */
    timestamp() {
        return this.getKey().timestamp();
    }
    /**
     * The begin time of the `Event`. If the key of the `Event` is a `Time` then
     * the begin and end time of the `Event` will be the same as the `Event`
     * timestamp.
     */
    begin() {
        return this.getKey().begin();
    }
    /**
     * The end time of the `Event`. If the key of the `Event` is a `Time` then
     * the begin and end time of the `Event` will be the same as the `Event`
     * timestamp.
     */
    end() {
        return this.getKey().end();
    }
    index() {
        return index(this.indexAsString());
    }
    indexAsString() {
        return this.key.toString();
    }
    /**
     * Returns the `TimeRange` over which this `Event` occurs. If this `Event`
     * has a `Time` key then the duration of this range will be 0.
     */
    timerange() {
        return new TimeRange(this.key.begin(), this.key.end());
    }
    /**
     * Shortcut for `timerange()` followed by `toUTCString()`.
     */
    timerangeAsUTCString() {
        return this.timerange().toUTCString();
    }
    /**
     * Shortcut for `timestamp()` followed by `toUTCString()`.
     */
    timestampAsUTCString() {
        return this.timestamp().toUTCString();
    }
    /**
     * Returns an array containing the key in the first element and then the data map
     * expressed as JSON as the second element. This is the method that is used by
     * a `TimeSeries` to build its wireformat representation.
     */
    toPoint(columns) {
        const values = [];
        columns.forEach(c => {
            const v = this.getData().get(c);
            values.push(v === "undefined" ? null : v);
        });
        if (this.keyType() === "time") {
            return [this.timestamp().getTime(), ...values];
        } else if (this.keyType() === "index") {
            return [this.indexAsString(), ...values];
        } else if (this.keyType() === "timerange") {
            return [
                [
                    this.timerange()
                        .begin()
                        .getTime(),
                    this.timerange()
                        .end()
                        .getTime()
                ],
                ...values
            ];
        }
    }
    /**
     * Collapses an array of fields, specified in the `fieldSpecList`, into a single
     * field named `fieldName` using the supplied reducer function. Optionally you can keep
     * all existing fields by supplying the `append` argument as `true`.
     *
     * Example:
     * ```
     * const t = time(new Date("2015-04-22T03:30:00Z"));
     * const e = event(t, Immutable.Map({ in: 5, out: 6, status: "ok" }));
     * const result = e.collapse(["in", "out"], "total", sum(), true);
     * // { "in": 5, "out": 6, "status": "ok", "total": 11 } }
     * ```
     */
    collapse(fieldSpecList, fieldName, reducer, append = false) {
        const data = append ? this.getData().toJS() : {};
        const d = fieldSpecList.map(fs => this.get(fs));
        data[fieldName] = reducer(d);
        return this.setData(Immutable.fromJS(data));
    }
    /**
     * Selects specific fields of an `Event` using the `fields` array of strings
     * and returns a new event with just those fields.
     *
     * Example:
     * ```
     * const t = time(new Date("2015-04-22T03:30:00Z"));
     * const e = event(t, Immutable.Map({ a: 5, b: 6, c: 7 }));
     * const result = e.select(["a", "b"]);  // data is { a: 5, b: 6 }}
     * ```
     */
    select(fields) {
        const data = {};
        _.each(fields, fieldName => {
            const value = this.get(fieldName);
            data[fieldName] = value;
        });
        return this.setData(Immutable.fromJS(data));
    }
}
function timeEvent(arg1, arg2) {
    if (arg1 instanceof Time && Immutable.Map.isMap(arg2)) {
        const data = arg2;
        return new Event(arg1, data);
    } else {
        const t = arg1.time;
        const data = arg1.data;
        return new Event(time(t), Immutable.Map(data));
    }
}
function indexedEvent(arg1, arg2) {
    if (arg1 instanceof Index && Immutable.Map.isMap(arg2)) {
        const data = arg2;
        return new Event(arg1, data);
    } else {
        const i = arg1.index;
        const data = arg1.data;
        return new Event(index(i), Immutable.Map(data));
    }
}
function timeRangeEvent(arg1, arg2) {
    if (arg1 instanceof TimeRange && Immutable.Map.isMap(arg2)) {
        const data = arg2;
        return new Event(arg1, data);
    } else {
        const tr = arg1.timerange;
        const data = arg1.data;
        return new Event(timerange(tr[0], tr[1]), Immutable.Map(data));
    }
}
function event(key, data) {
    return new Event(key, data);
}
export { event, timeEvent, timeRangeEvent, indexedEvent };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZXZlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7O0dBUUc7QUFFSCxPQUFPLEtBQUssU0FBUyxNQUFNLFdBQVcsQ0FBQztBQUN2QyxPQUFPLEtBQUssQ0FBQyxNQUFNLFFBQVEsQ0FBQztBQUU1QixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQzlCLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBRXZDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ3BDLE9BQU8sRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBSW5ELE9BQU8sSUFBSSxNQUFNLFFBQVEsQ0FBQztBQUUxQjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FzQ0c7QUFDSCxNQUFNLE9BQU8sS0FBNEIsU0FBUSxJQUFJO0lBQ2pEOzs7O09BSUc7SUFDSSxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQWtCLEVBQUUsTUFBa0I7UUFDbkQsT0FBTyxDQUNILE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUUsS0FBSyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFO1lBQ3pELE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQzVDLENBQUM7SUFDTixDQUFDO0lBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FzQkc7SUFDSSxNQUFNLENBQUMsV0FBVyxDQUNyQixNQUFrQixFQUNsQixNQUFrQixFQUNsQixlQUF3QixJQUFJO1FBRTVCLElBQUksWUFBWSxFQUFFLENBQUM7WUFDZixPQUFPLENBQ0gsTUFBTSxDQUFDLE9BQU8sRUFBRSxLQUFLLE1BQU0sQ0FBQyxPQUFP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
