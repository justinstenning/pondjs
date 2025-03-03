/*
 *  Copyright (c) 2017, The Regents of the University of California,
 *  through Lawrence Berkeley National Laboratory (subject to receipt
 *  of any required approvals from the U.S. Dept. of Energy).
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */
var __rest =
    (this && this.__rest) ||
    function(s, e) {
        var t = {};
        for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                    t[p[i]] = s[p[i]];
            }
        return t;
    };
import * as Immutable from "immutable";
import * as _ from "lodash";
import { duration } from "./duration";
import { Event } from "./event";
import { Index, index } from "./index";
import { SortedCollection } from "./sortedcollection";
import { time } from "./time";
import { timerange } from "./timerange";
import { daily, window } from "./window";
import { InterpolationType } from "./functions";
import { FillMethod, Trigger } from "./types";
function buildMetaData(meta) {
    const d = meta ? meta : {};
    // Name
    d.name = meta.name ? meta.name : "";
    // Index
    if (meta.index) {
        if (_.isString(meta.index)) {
            d.index = new Index(meta.index).asString();
        } else if (meta.index instanceof Index) {
            d.index = meta.index.asString();
        }
    }
    // Timezone
    d.tz = "Etc/UTC";
    if (_.isString(meta.tz)) {
        d.tz = meta.tz;
    }
    return Immutable.Map(d);
}
/**
 * Create a `Time` based `TimeSeries` using the wire format
 * ```
 * {
 *   "name": name,
 *   "columns": ["time", column-1, ..., column-n]
 *   "points": [
 *      [t1, v1, v2, ..., v2],
 *      [t2, v1, v2, ..., vn],
 *      ...
 *   ]
 * }
 * ```
 */
function timeSeries(arg) {
    const wireFormat = arg;
    const { columns, points, tz = "Etc/UTC" } = wireFormat,
        meta2 = __rest(wireFormat, ["columns", "points", "tz"]);
    const [eventKey, ...eventFields] = columns;
    const events = points.map(point => {
        const [key, ...eventValues] = point;
        const d = _.zipObject(eventFields, eventValues);
        return new Event(time(key), Immutable.fromJS(d));
    });
    return new TimeSeries(Object.assign({ events: Immutable.List(events) }, meta2));
}
/**
 * Create an `Index` based `TimeSeries` using the wire format
 * ```
 * {
 *   "name": name,
 *   "columns": ["index", column-1, ..., column-n]
 *   "points": [
 *      [t1, v1, v2, ..., v2],
 *      [t2, v1, v2, ..., vn],
 *      ...
 *   ]
 * }
 * ```
 */
function indexedSeries(arg) {
    const wireFormat = arg;
    const { columns, points, tz = "Etc/UTC" } = wireFormat,
        meta2 = __rest(wireFormat, ["columns", "points", "tz"]);
    const [eventKey, ...eventFields] = columns;
    const events = points.map(point => {
        const [key, ...eventValues] = point;
        const d = _.zipObject(eventFields, eventValues);
        return new Event(index(key), Immutable.fromJS(d));
    });
    return new TimeSeries(Object.assign({ events: Immutable.List(events) }, meta2));
}
/**
 * Create a `Timerange` based `TimeSeries` using the wire format
 * ```
 * {
 *   "name": name,
 *   "columns": ["timerange", column-1, ..., column-n]
 *   "points": [
 *      [t1, v1, v2, ..., v2],
 *      [t2, v1, v2, ..., vn],
 *      ...
 *   ]
 * }
 * ```
 */
function timeRangeSeries(arg) {
    const wireFormat = arg;
    const { columns, points, tz = "Etc/UTC" } = wireFormat,
        meta2 = __rest(wireFormat, ["columns", "points", "tz"]);
    const [eventKey, ...eventFields] = columns;
    const events = points.map(point => {
        const [key, ...eventValues] = point;
        const d = _.zipObject(eventFields, eventValues);
        return new Event(timerange(key[0], key[1]), Immutable.fromJS(d));
    });
    return new TimeSeries(Object.assign({ events: Immutable.List(events) }, meta2));
}
export { timeSeries, indexedSeries, timeRangeSeries };
/**
 * A `TimeSeries<K>` represents a series of `Event<K>`'s, contained within a `Collection<K>`,
 * along with associated meta data.
 *
 * Each `Event<K>`, a single entity in the Collection, is a combination of:
 * * `Key` of type K (`Time`, `TimeRange`, or `Index`)
 * * `data` of type Immutable.Map<string, any> - corresponding set of key/values
 *
 * To construct a `TimeSeries` you would typicaly use the wire format, which is a data
 * structure passed into one of the helper factory functions. See the constructor
 * docs below for details of this format. It's fairly simple.
 *
 * You can also construct a `TimeSeries` from a list of `Event`s.
 *
 * A `TimeSeries` supports some notion of what timezone it is in, and this can be
 * specified in the constructor. `Event`s in this `TimeSeries` are considered to
 * be in this timezone. Specifically, if they are `Event<Index>`'s an event might be
 * at "2014-08-31". The actual timerange of that representation depends on where
 * you are. Note: an `Index` of "1d-1234" is always a UTC representation.
 *
 * Methods exist to query back out of the `TimeSeries`:
 *
 *  * Specific `Event`s with `at()`, `atFirst()` and `atLast()`, or at a
 * particular time with `atTime()`.
 *  * Meta data can also be accessed using `name()`, `timezone()` and `isUTC()`,
 * along with `columns()` and the `eventList()` or `collection()` itself. More
 * general user defined meta data can be accessed with `meta()`.
 *  * The overall time range of the `TimeSeries` can be queried with `timerange()`,
 * of for convenience also see `begin()` and `end()`.
 *
 * Mutating a `TimeSeries` will always return a new `TimeSeries`:
 *  * Meta data can be modified with `setMeta()`, `setName()` and renameColumns().
 *  * The set of `Event`s can be altered with operations such as `slice()`, `crop()`.
 *  * Or alternatively you can `select()` specific columns.
 *  * You can take the `rate()` of data
 *
 * Basic statistics operations allow you to get percentiles, quantiles,
 * `avg()`, `min()`, `max()`, `sum()`, `count()` etc for any column within the
 * `TimeSeries`.
 *
 * Traversing over the `Event`s in the `TimeSeries` can be done most efficiently
 * with either `forEach()` or `map()`.
 *
 * Reducing data within a `TimeSeries` is a common task:
 *  * `collapse()` will take a list of columns an collapse those down to
 *    a single output column using a function (e.g. sum())
 *  * `fixedWindowRollup()` lets you aggregate into specific time windows
 *    to produce a new series.
 *  * `hourlyRollup()` and `dailyRollup()` similarly
 *  * You can also make a new mapping from a window to a `Collection` out
 *    of the `TimeSeries` with `collectionByWindow()`
 *  * see also static functions for reducing and merging
 *    multiple `TimeSeries` together
 *
 * Fixing or transforming non-ideal data is another important function:
 *  * `sizeValid()` will tell you how many `Event`s are valid
 *  * statistic functions all take a filter function that can filter the
 *    `Event`s being processed to handle missing or bad data
 *  * `fill()` will fix missing data by inserting a new value where undefined,
 *    null or NaN values are found, using interpolation or 0.
 *  * `align()` will change the time position of data to lie on specific time
 *    boundaries using different interpolation methods (e.g. align to each minute)
 *
 * Some static methods also exist:
 *  * `equal()` and `is()` are two was to compare if a `TimeSeries` is the same.
 *  * `timeSeriesListMerge()` can be used to concatenate two `TimeSeries` together
 *    or to merge multiple `TimeSeries` together that have different column names.
 *  * `timeSeriesListReduce()` can be used for operations like summing multiple
 *    `TimeSeries` together
 *
 */
export class TimeSeries {
    /**
     * You can initialize a `TimeSeries` with either a list of `Event`'s, or with
     * what we call the wire format. Usually you would want to construct a `TimeSeries`
     * by converting your data into this format.
     *
     * The format of the data is an object which has several special keys,
     * i.e. fields that have special meaning for the `TimeSeries` and additional keys
     * that are optionally added to form the meta data for the `TimeSeries`:
     *
     * Special keys:
     *
     *  - **name** - The name of the series (optional)
     *  - **columns** - are necessary and give labels to the data in the points. The first
     *                  column is special, it is the the key for the row and should be
     *                  either "time", "timerange" or "index". Other columns are user
     *                  defined. (required)
     *  - **points** - are an array of tuples. Each row is at a different time (or timerange),
     *                 and each value corresponds to the column labels. (required)
     *  - **tz** - timezone (optional)
     *
     * You can add additional fields as meta data custom to your application.
     *
     * To create a new `TimeSeries` object from the above data format, simply use one of
     * the factory functions. For `Time` based `TimeSeries` you would use `timeSeries()`.
     * Other options are `timeRangeSeries()` and `indexedSeries()`:
     *
     * Example:
     *
     * ```
     * import { timeSeries } from "pondjs";
     *
     * const series = timeSeries({
     *     name: "traffic",
     *     columns: ["time", "in", "out"],
     *     points: [
     *         [1400425947000, 52, 12],
     *         [1400425948000, 18, 42],
     *         [1400425949000, 26, 81],
     *         [1400425950000, 93, 11],
     *         ...
     *     ]
     * });
     * ```
     *
     * Another example:
     *
     * ```
     * const availability = indexedSeries({
     *     name: "Last 3 months",
     *     columns: ["index", "uptime", incidents],
     *     points: [
     *         ["2015-06", "100%", 0], // 2015-06 specified here for June 2015
     *         ["2015-05", "92%", 2],
     *         ["2015-04", "87%", 5]
     *     ]
     * });
     * ```
     *
     * Alternatively, you can construct a `TimeSeries` with a list of events.
     * To do this you need to use the `TimeSeries` constructor directly.
     *
     * These may be `TimeEvents`, `TimeRangeEvents` or `IndexedEvents`:
     *
     * ```
     * import { TimeSeries } from "pondjs"
     * const events = [];
     * events.push(timeEvent(time(new Date(2015, 7, 1)), Immutable.Map({ value: 27 })));
     * events.push(timeEvent(time(new Date(2015, 8, 1)), Immutable.Map({ value: 14 })));
     * const series = new TimeSeries({
     *     name: "events",
     *     events: Immutable.List(events)
     * });
     * ```
     */
    constructor(arg) {
        this._collection = null;
        this._data = null;
        if (arg instanceof TimeSeries) {
            //
            // Copy another TimeSeries
            //
            const other = arg;
            this._data = other._data;
            this._collection = other._collection;
        } else if (_.isObject(arg)) {
            if (_.has(arg, "collection")) {
                //
                // Initialized from a Collection
                //
                const { collection } = arg,
                    meta3 = __rest(arg, ["collection"]);
                this._collection = new SortedCollection(collection);
                this._data = buildMetaData(meta3);
            } else if (_.has(arg, "events")) {
                //
                // Has a list of events
                //
                const { events } = arg,
                    meta1 = __rest(arg, ["events"]);
                this._collection = new SortedCollection(events);
                this._data = buildMetaData(meta1);
            }
        }
    }
    /**
     * Turn the `TimeSeries` into regular javascript objects
     */
    toJSON() {
        const e = this.atFirst();
        if (!e) {
            return;
        }
        const columnList = this.columns();
        const columns = [e.keyType(), ...columnList];
        const points = [];
        for (const evt of this._collection.eventList()) {
            points.push(evt.toPoint(columnList));
        }
        return _.extend(this._data.toJSON(), { columns, points });
    }
    /**
     * Represent the `TimeSeries` as a string, which is useful for
     * serializing it across the network.
     */
    toString() {
        return JSON.stringify(this.toJSON());
    }
    /**
     * Returns the extents of the `TimeSeries` as a `TimeRange`.
     */
    timerange() {
        return this._collection.timerange();
    }
    /**
     * Alias for `timerange()`
     */
    range() {
        return this.timerange();
    }
    /**
     * Gets the earliest time represented in the `TimeSeries`.
     */
    begin() {
        return this.range().begin();
    }
    /**
     * Gets the latest time represented in the `TimeSeries`.
     */
    end() {
        return this.range().end();
    }
    /**
     * Access a specific `TimeSeries` event via its position
     */
    at(pos) {
        return this._collection.at(pos);
    }
    /**
     * Returns an event in the series by its time. This is the same
     * as calling `bisect()` first and then using `at()` with the index.
     */
    atTime(t) {
        const pos = this.bisect(t);
        if (pos >= 0 && pos < this.size()) {
            return this.at(pos);
        }
    }
    /**
     * Returns the first `Event` in the series.
     */
    atFirst() {
        return this._collection.firstEvent();
    }
    /**
     * Returns the last `Event` in the series.
     */
    atLast() {
        return this._collection.lastEvent();
    }
    /**
     * Sets a new underlying collection for this `TimeSeries` and retuns a
     * new `TimeSeries`.
     */
    setCollection(collection) {
        const result = new TimeSeries(this);
        if (collection) {
            result._collection = collection;
        } else {
            result._collection = new SortedCollection();
        }
        return result;
    }
    /**
     * Returns the index that bisects the `TimeSeries` at the time specified.
     */
    bisect(t, b) {
        return this._collection.bisect(t, b);
    }
    /**
     * Perform a slice of events within the `TimeSeries`, returns a new
     * `TimeSeries` representing a portion of this `TimeSeries` from
     * `begin` up to but not including `end`.
     */
    slice(begin, end) {
        const sliced = new SortedCollection(this._collection.slice(begin, end));
        return this.setCollection(sliced);
    }
    /**
     * Crop the `TimeSeries` to the specified `TimeRange` and return a new `TimeSeries`.
     */
    crop(tr) {
        const timerangeBegin = tr.begin();
        let beginPos = this.bisect(timerangeBegin);
        const bisectedEventOutsideRange = this.at(beginPos).timestamp() < timerangeBegin;
        beginPos = bisectedEventOutsideRange ? beginPos + 1 : beginPos;
        const endPos = this.bisect(tr.end(), beginPos);
        return this.slice(beginPos, endPos + 1);
    }
    //
    // Access meta data about the series
    //
    /**
     * Fetch the `TimeSeries` name
     */
    name() {
        return this._data.get("name");
    }
    /**
     * Rename the `TimeSeries`
     */
    setName(name) {
        return this.setMeta("name", name);
    }
    /**
     * Fetch the timeSeries `Index`, if it has one. This is still in the
     * API for historical reasons but is just a short cut to calling
     * `series.getMeta("index")`.
     */
    index() {
        return index(this._data.get("index"));
    }
    /**
     * Fetch the timeSeries `Index`, as a `string`, if it has one.
     */
    indexAsString() {
        return this.index() ? this.index().asString() : undefined;
    }
    /**
     * Fetch the timeseries `Index`, as a `TimeRange`, if it has one.
     */
    indexAsRange() {
        return this.index() ? this.index().toTimeRange() : undefined;
    }
    /**
     * Fetch if the timezone is UTC
     */
    isUTC() {
        return this._data.get("tz") === "Etc/UTC";
    }
    /**
     * Returns the timezone set on this `TimeSeries`.
     */
    timezone() {
        return this._data.get("tz");
    }
    /**
     * Fetch the list of column names as a list of string.
     * This is determined by traversing though the events and collecting the set.
     * Note: the order is not defined
     */
    columns() {
        const c = {};
        for (const e of this._collection.eventList()) {
            const d = e.getData();
            d.forEach((val, key) => {
                c[key] = true;
            });
        }
        return _.keys(c);
    }
    /**
     * Returns the list of Events in the `Collection` of events for this `TimeSeries`
     * The result is an Immutable.List of the `Event`s.
     */
    eventList() {
        return this.collection().eventList();
    }
    /**
     * Returns the internal `SortedCollection` of events for this `TimeSeries`
     */
    collection() {
        return this._collection;
    }
    /**
     * Returns the meta data about this `TimeSeries` as a JSON object.
     * Any extra data supplied to the `TimeSeries` constructor will be
     * placed in the meta data object. This returns either all of that
     * data as a JSON object, or a specific key if `key` is supplied.
     */
    meta(key) {
        if (!key) {
            return this._data.toJSON();
        } else {
            return this._data.get(key);
        }
    }
    /**
     * Set new meta data for the `TimeSeries` using a `key` and `value`.
     * The result will be a new `TimeSeries`.
     */
    setMeta(key, value) {
        const newTimeSeries = new TimeSeries(this);
        const d = newTimeSeries._data;
        const dd = d.set(key, value);
        newTimeSeries._data = dd;
        return newTimeSeries;
    }
    /**
     * Returns the number of events in this `TimeSeries`
     */
    size() {
        return this._collection ? this._collection.size() : 0;
    }
    /**
     * Returns the number of valid items in this `TimeSeries`.
     *
     * Uses the `fieldSpec` to look up values in all events.
     * It then counts the number that are considered valid, which
     * specifically are not NaN, undefined or null.
     */
    sizeValid(fieldSpec) {
        return this._collection.sizeValid(fieldSpec);
    }
    /**
     * Returns the number of events in this `TimeSeries`. Alias
     * for size().
     */
    count() {
        return this.size();
    }
    /**
     * Returns the sum of the `Event`'s in this `Collection`
     * for the `fieldspec`. Optionally pass in a filter function.
     */
    sum(fieldPath = "value", filter) {
        return this._collection.sum(fieldPath, filter);
    }
    /**
     * Aggregates the `Event`'s in this `TimeSeries` down to
     * their maximum value(s).
     *
     * The `fieldSpec` passed into the avg function is either a field name or
     * a list of fields.
     *
     * The `filter` is one of the Pond filter functions that can be used to remove
     * bad values in different ways before filtering.
     *
     * The result is the maximum value if the fieldSpec is for one field. If
     * multiple fields then a map of fieldName -> max values is returned
     */
    max(fieldPath = "value", filter) {
        return this._collection.max(fieldPath, filter);
    }
    /**
     * Aggregates the events down to their minimum value
     */
    min(fieldPath = "value", filter) {
        return this._collection.min(fieldPath, filter);
    }
    /**
     * Aggregates the `Event`'s in this `TimeSeries` down
     * to their average(s).
     *
     * The `fieldSpec` passed into the avg function is either
     * a field name or a list of fields.
     *
     * The `filter` is one of the Pond filter functions that can be used to remove
     * bad values in different ways before filtering.
     *
     * Example:
     * ```
     * const series = timeSeries({
     *     name: "data",
     *     columns: ["time", "temperature"],
     *     points: [
     *         [1509725624100, 5],
     *         [1509725624200, 8],
     *         [1509725624300, 2]
     *     ]
     * });
     * const avg = series.avg("temperature"); // 5
     * ```
     */
    avg(fieldPath = "value", filter) {
        return this._collection.avg(fieldPath, filter);
    }
    /**
     * Aggregates the events down to their medium value
     */
    median(fieldPath = "value", filter) {
        return this._collection.median(fieldPath, filter);
    }
    /**
     * Aggregates the events down to their stdev
     */
    stdev(fieldPath = "value", filter) {
        return this._collection.stdev(fieldPath, filter);
    }
    /**
     * Gets percentile q within the `TimeSeries`. This works the same way as numpy.
     *
     * The percentile function has several parameters that can be supplied:
     * * `q` - The percentile (should be between 0 and 100)
     * * `fieldSpec` - Field or fields to find the percentile of
     * * `interp` - Specifies the interpolation method to use when the desired, see below
     * * `filter` - Optional filter function used to clean data before aggregating
     *
     * For `interp` a `InterpolationType` should be supplied if the default ("linear") is
     * not used. This enum is defined like so:
     * ```
     * enum InterpolationType {
     *     linear = 1,  // i + (j - i) * fraction
     *     lower,       // i
     *     higher,      // j
     *     nearest,     // i or j, whichever is nearest
     *     midpoint     // (i + j) / 2
     * }
     * ```
     */
    percentile(q, fieldPath = "value", interp = InterpolationType.linear, filter) {
        return this._collection.percentile(q, fieldPath, interp, filter);
    }
    /**
     * Aggregates the `TimeSeries` `Event`s down to a single value per field.
     *
     * This makes use of a user defined function suppled as the `func` to do
     * the reduction of values to a single value. The `ReducerFunction` is defined
     * like so:
     *
     * ```
     * (values: number[]) => number
     * ```
     *
     * Fields to be aggregated are specified using a `fieldSpec` argument, which
     * can be a field name or array of field names.
     *
     * If the `fieldSpec` matches multiple fields then an object is returned
     * with keys being the fields and the values being the aggregated value for
     * those fields. If the `fieldSpec` is for a single field then just the
     * aggregated value is returned.
     *
     * Note: The `TimeSeries` class itself contains most of the common aggregation functions
     * built in (e.g. `series.avg("value")`), but this is here to help when what
     * you need isn't supplied out of the box.
     */
    aggregate(func, fieldPath = "value") {
        return this._collection.aggregate(func, fieldPath);
    }
    /**
     * Gets n quantiles within the `TimeSeries`. This works the same way as numpy's percentile().
     * For example `timeseries.quantile(4)` would be the same as using percentile
     * with q = 0.25, 0.5 and 0.75.
     */
    quantile(quantity, fieldPath = "value", interp = InterpolationType.linear) {
        return this._collection.quantile(quantity, fieldPath, interp);
    }
    /**
     * Iterate over the events in this `TimeSeries`.
     *
     * `Event`s are in the chronological. The `sideEffect` is a user supplied
     * function which is passed the `Event<T>` and the index:
     * ```
     * (e: Event<T>, index: number) => { //... }
     * ```
     *
     * Returns the number of items iterated.
     *
     * Example:
     * ```
     * series.forEach((e, i) => {
     *     console.log(`Event[${i}] is ${e.toString()}`);
     * })
     * ```
     */
    forEach(sideEffect) {
        return this._collection.forEach(sideEffect);
    }
    /**
     * Map the `Event`s in this `TimeSeries` to new `Event`s.
     *
     * For each `Event` passed to your `mapper` function you return a new Event:
     * ```
     * (event: Event<T>, index: number) => Event<M>
     * ```
     *
     * Example:
     * ```
     * const mapped = sorted.map(e => {
     *     return new Event(e.key(), { a: e.get("x") * 2 });
     * });
     * ```
     */
    map(mapper) {
        const remapped = this._collection.map(mapper);
        return this.setCollection(remapped);
    }
    /**
     * Flat map over the events in this `TimeSeries`.
     *
     * For each `Event` passed to your callback function you should map that to
     * zero, one or many `Event`s, returned as an `Immutable.List<Event>`.
     *
     * Example:
     * ```
     * const series = timeSeries({
     *     name: "Map Traffic",
     *     columns: ["time", "NASA_north", "NASA_south"],
     *     points: [
     *         [1400425951000, { in: 100, out: 200 }, { in: 145, out: 135 }],
     *         [1400425952000, { in: 200, out: 400 }, { in: 146, out: 142 }],
     *         [1400425953000, { in: 300, out: 600 }, { in: 147, out: 158 }],
     *         [1400425954000, { in: 400, out: 800 }, { in: 155, out: 175, other: 42 }]
     *     ]
     * });
     * const split = series.flatMap(e =>
     *     Immutable.List([
     *         e.setData(e.get("NASA_north")),
     *         e.setData(e.get("NASA_south"))
     *     ])
     * );
     * split.toString();
     *
     * // {
     * //     "name": "Map Traffic",
     * //     "tz": "Etc/UTC",
     * //     "columns": ["time","in","out","other"],
     * //     "points":[
     * //         [1400425951000, 100, 200, null],
     * //         [1400425951000, 145, 135, null],
     * //         [1400425952000, 200, 400, null],
     * //         [1400425952000, 146, 142, null],
     * //         [1400425953000, 300, 600, null],
     * //         [1400425953000, 147, 158, null],
     * //         [1400425954000, 400, 800, null],
     * //         [1400425954000, 155, 175, 42]
     * //     ]
     * // }
     * ```
     */
    flatMap(mapper) {
        const remapped = this._collection.flatMap(mapper);
        return this.setCollection(remapped);
    }
    /**
     * Remap the keys of the underlying Events, but keep the data the same.
     *
     * For example you can use this if you have a `TimeSeries<Index>` and want to
     * convert to events of `TimeSeries<Time>`s.
     *
     * The mapper function supplied to `mapKeys` should return key of type
     * `U` given a key of type `T`.
     *
     * Example:
     *
     * In this example we remap `Time` keys to `TimeRange` keys using the `Time.toTimeRange()`
     * method, centering the new `TimeRange`s around each `Time` with duration given
     * by the `Duration` object supplied, in this case representing one hour.
     *
     * ```
     * const hourlyRanges = series.mapKeys<TimeRange>(t =>
     *     t.toTimeRange(duration("1h"), TimeAlignment.Middle)
     * );
     * ```
     *
     */
    mapKeys(mapper) {
        const collection = new SortedCollection(this._collection.mapKeys(mapper));
        return this.setCollection(collection);
    }
    /**
     * Filter the `TimeSeries`'s `Event`'s with the supplied function.
     *
     * The function `predicate` is passed each `Event` and should return
     * true to keep the `Event` or false to discard.
     *
     * Example:
     * ```
     * const filtered = series.filter(e => e.get("a") < 8)
     * ```
     */
    filter(predicate) {
        const filtered = this._collection.filter(predicate);
        return this.setCollection(filtered);
    }
    /**
     * Select out specified columns from the `Event`s within this `TimeSeries`.
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
     * const series = timeSeries({
     *     name: "data",
     *     columns: ["time", "a", "b", "c"],
     *     points: [
     *         [1509725624100, 5, 3, 4],
     *         [1509725624200, 8, 1, 3],
     *         [1509725624300, 2, 9, 1]
     *     ]
     * });
     * const newSeries = series.select({
     *     fields: ["b", "c"]
     * });
     *
     * // returns a series with columns ["b", "c"] only, "a" is discarded.
     * ```
     */
    select(options) {
        const collection = new SortedCollection(this._collection.select(options));
        return this.setCollection(collection);
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
     * const series = timeSeries({
     *     name: "data",
     *     columns: ["time", "a", "b"],
     *     points: [
     *         [1509725624100, 5, 6],
     *         [1509725624200, 4, 2],
     *         [1509725624300, 6, 3]
     *     ]
     * });
     *
     * // Sum columns "a" and "b" into a new column "v"
     * const sums = series.collapse({
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
        const collection = new SortedCollection(this._collection.collapse(options));
        return this.setCollection(collection);
    }
    /**
     * Rename columns in the underlying events.
     *
     * Takes a object of columns to rename. Returns a new `TimeSeries` containing
     * new events. Columns not in the dict will be retained and not renamed.
     *
     * Example:
     * ```
     * new_ts = ts.renameColumns({
     *     renameMap: {in: "new_in", out: "new_out"}
     * });
     * ```
     *
     * As the name implies, this will only rename the main
     * "top level" (ie: non-deep) columns. If you need more
     * extravagant renaming, roll your own using `TimeSeries.map()`.
     */
    renameColumns(options) {
        const { renameMap } = options;
        return this.map(e => {
            const eventType = e.keyType();
            const d = e.getData().mapKeys(key => renameMap[key] || key);
            switch (eventType) {
                case "time":
                    return new Event(time(e.toPoint(this.columns())[0]), d);
                case "index":
                    return new Event(index(e.toPoint(this.columns())[0]), d);
                case "timerange":
                    const timeArray = e.toPoint(this.columns())[0];
                    return new Event(timerange(timeArray[0], timeArray[1]), d);
            }
        });
    }
    /**
     * Take the data in this `TimeSeries` and "fill" any missing or invalid
     * values. This could be setting `null` values to zero so mathematical
     * operations will succeed, interpolate a new value, or pad with the
     * previously given value.
     *
     * The fill is controlled by the `FillOptions`. This is an object of the form:
     * ```
     * {
     *     fieldSpec: string | string[];
     *     method?: FillMethod;
     *     limit?: number;
     * }
     * ```
     * Options:
     *  * `fieldSpec` - the field to fill
     *  * `method` - the interpolation method, one of `FillMethod.Zero`, `FillMethod.Pad`
     *               or `FillMethod.Linear`
     *  * `limit` - the number of missing values to fill before giving up
     *
     * Example:
     * ```
     * const filled = timeseries.fill({
     *     fieldSpec: ["direction.in", "direction.out"],
     *     method: "zero",
     *     limit: 3
     * });
     * ```
     */
    fill(options) {
        const { fieldSpec = null, method = FillMethod.Zero, limit = null } = options;
        let filledCollection;
        if (method === FillMethod.Zero || method === FillMethod.Pad) {
            filledCollection = this._collection.fill({ fieldSpec, method, limit });
        } else if (method === FillMethod.Linear) {
            if (_.isArray(fieldSpec)) {
                filledCollection = this._collection;
                fieldSpec.forEach(fieldPath => {
                    const args = { fieldSpec: fieldPath, method, limit };
                    filledCollection = filledCollection.fill(args);
                });
            } else {
                filledCollection = this._collection.fill({
                    fieldSpec,
                    method,
                    limit
                });
            }
        } else {
            throw new Error(`Invalid fill method: ${method}`);
        }
        const collection = new SortedCollection(filledCollection);
        return this.setCollection(collection);
    }
    /**
     * Align event values to regular time boundaries. The value at
     * the boundary is interpolated. Only the new interpolated
     * points are returned. If limit is reached nulls will be
     * returned at each boundary position.
     *
     * One use case for this is to modify irregular data (i.e. data
     * that falls at slightly irregular times) so that it falls into a
     * sequence of evenly spaced values. We use this to take data we
     * get from the network which is approximately every 30 second
     * (:32, 1:02, 1:34, ...) and output data on exact 30 second
     * boundaries (:30, 1:00, 1:30, ...).
     *
     * Another use case is data that might be already aligned to
     * some regular interval, but that contains missing points.
     * While `fill()` can be used to replace `null` values, `align()`
     * can be used to add in missing points completely. Those points
     * can have an interpolated value, or by setting limit to 0,
     * can be filled with nulls. This is really useful when downstream
     * processing depends on complete sequences.
     *
     * Example:
     * ```
     *  const alignOptions: AlignmentOptions = {
     *       fieldSpec: ["value"],
     *       period: period(duration("30s")),
     *       method: AlignmentMethod.Linear,
     *       limit: 3
     *   };
     *
     *   const aligned = series.align(alignOptions);
     *
     * ```
     */
    align(options) {
        const collection = new SortedCollection(this._collection.align(options));
        return this.setCollection(collection);
    }
    /**
     * Returns the derivative of the `TimeSeries` for the given columns. The result will
     * be per second. Optionally you can substitute in `null` values if the rate
     * is negative. This is useful when a negative rate would be considered invalid.
     */
    rate(options) {
        const collection = new SortedCollection(this._collection.rate(options));
        return this.setCollection(collection);
    }
    /**
     * Builds a new `TimeSeries` by dividing events within the `TimeSeries`
     * across multiple fixed windows of size `windowSize`.
     *
     * Note that these are windows defined relative to Jan 1st, 1970,
     * and are UTC, so this is best suited to smaller window sizes
     * (hourly, 5m, 30s, 1s etc), or in situations where you don't care
     * about the specific window, just that the data is smaller.
     *
     * Each window then has an aggregation specification applied as
     * `aggregation`. This specification describes a mapping of output
     * fieldNames to aggregation functions and their fieldPath. For example:
     * ```
     * { in_avg: { in: avg() }, out_avg: { out: avg() } }
     * ```
     * will aggregate both "in" and "out" using the average aggregation
     * function and return the result as in_avg and out_avg.
     *
     * Note that each aggregation function, such as `avg()` also can take a
     * filter function to apply before the aggregation. A set of filter functions
     * exists to do common data cleanup such as removing bad values. For example:
     * ```
     * { value_avg: { value: avg(filter.ignoreMissing) } }
     * ```
     *
     * Example:
     * ```
     *     const timeseries = new TimeSeries(data);
     *     const dailyAvg = timeseries.fixedWindowRollup({
     *         windowSize: "1d",
     *         aggregation: {value:["value", avg()]}
     *     });
     * ```
     *
     * Note that to output the result as `TimeEvent`'s instead of `IndexedEvent`'s,
     * you can do the following :
     * ```
     * timeseries.fixedWindowRollup(options).mapKeys(index => time(index.toTimeRange().mid()))
     * ```
     *
     */
    fixedWindowRollup(options) {
        if (!options.window) {
            throw new Error("window must be supplied");
        }
        if (!options.aggregation || !_.isObject(options.aggregation)) {
            throw new Error(
                "aggregation object must be supplied, for example: {value: {value: avg()}}"
            );
        }
        const aggregatorPipeline = this._collection
            .window({ window: options.window, trigger: Trigger.onDiscardedWindow })
            .aggregate(options.aggregation)
            .flatten();
        const collections = new SortedCollection(aggregatorPipeline);
        return this.setCollection(collections);
    }
    /**
     * Builds a new `TimeSeries` by dividing events into hours.
     *
     * Each window then has an aggregation specification `aggregation`
     * applied. This specification describes a mapping of output
     * fieldNames to aggregation functions and their fieldPath. For example:
     * ```
     * {in_avg: ["in", avg()], out_avg: ["out", avg()]}
     * ```
     *
     */
    hourlyRollup(options) {
        const { aggregation } = options;
        if (!aggregation || !_.isObject(aggregation)) {
            throw new Error(
                "aggregation object must be supplied, for example: {value: {value: avg()}}"
            );
        }
        return this.fixedWindowRollup({
            window: window(duration("1h")),
            aggregation
        });
    }
    /**
     * Builds a new `TimeSeries` by dividing events into days.
     *
     * Each window then has an aggregation specification `aggregation`
     * applied. This specification describes a mapping of output
     * fieldNames to aggregation functions and their fieldPath. For example:
     * ```
     * {in_avg: ["in", avg()], out_avg: ["out", avg()]}
     * ```
     *
     */
    dailyRollup(options) {
        const { aggregation, timezone = "Etc/UTC" } = options;
        if (!aggregation || !_.isObject(aggregation)) {
            throw new Error(
                "aggregation object must be supplied, for example: {avg_value: {value: avg()}}"
            );
        }
        return this._rollup({ window: daily(timezone), aggregation });
    }
    /**
     * Builds a new `TimeSeries` by dividing events into months.
     *
     * Each window then has an aggregation specification `aggregation`
     * applied. This specification describes a mapping of output
     * fieldNames to aggregation functions and their fieldPath. For example:
     * ```
     * {in_avg: ["in", avg()], out_avg: ["out", avg()]}
     * ```
     *
     */
    /*
    monthlyRollup(options: RollupOptions<T>): TimeSeries<Index> {
        const { aggregation } = options;

        if (!aggregation || !_.isObject(aggregation)) {
            throw new Error(
                "aggregation object must be supplied, for example: {value: {value: avg()}}"
            );
        }

        return this._rollup({ windowSize: period("monthly"), aggregation });
    }
    */
    /**
     * Builds a new `TimeSeries` by dividing events into years.
     *
     * Each window then has an aggregation specification `aggregation`
     * applied. This specification describes a mapping of output
     * fieldNames to aggregation functions and their fieldPath. For example:
     *
     * ```
     * {in_avg: ["in", avg()], out_avg: ["out", avg()]}
     * ```
     *
     */
    /*
    yearlyRollup(options: RollupOptions<T>): TimeSeries<Index> {
        const { aggregation } = options;

        if (!aggregation || !_.isObject(aggregation)) {
            throw new Error(
                "aggregation object must be supplied, for example: {value: {value: avg()}}"
            );
        }

        return this._rollup({ windowSize: period("yearly"), aggregation });
    }
    */
    /**
     * @private
     *
     * Internal function to build the `TimeSeries` rollup functions using
     * an aggregator Pipeline.
     */
    _rollup(options) {
        const aggregatorPipeline = this._collection
            .window({ window: options.window, trigger: Trigger.onDiscardedWindow })
            .aggregate(options.aggregation)
            .flatten();
        const collections = new SortedCollection(aggregatorPipeline);
        return this.setCollection(collections);
    }
    /**
     * Builds multiple `Collection`s, each collects together
     * events within a window of size `windowSize`. Note that these
     * are windows defined relative to Jan 1st, 1970, and are UTC.
     *
     * Example:
     * ```
     * const timeseries = new TimeSeries(data);
     * const collections = timeseries.collectByFixedWindow({windowSize: "1d"});
     * console.log(collections); // {1d-16314: Collection, 1d-16315: Collection, ...}
     * ```
     *
     */
    collectByWindow(options) {
        return this._collection.window({ window: options.window }).ungroup();
    }
    /*
     * STATIC
     */
    /**
     * Static function to compare two `TimeSeries` to each other. If the `TimeSeries`
     * are of the same instance as each other then equals will return true.
     */
    // tslint:disable:member-ordering
    static equal(series1, series2) {
        return series1._data === series2._data && series1._collection === series2._collection;
    }
    /**
     * Static function to compare two `TimeSeries` to each other. If the `TimeSeries`
     * are of the same value as each other then equals will return true.
     */
    static is(series1, series2) {
        return (
            Immutable.is(series1._data, series2._data) &&
            SortedCollection.is(series1._collection, series2._collection)
        );
    }
    /**
     * Reduces a list of `TimeSeries` objects using a reducer function. This works
     * by taking each event in each `TimeSeries` and collecting them together
     * based on timestamp. All events for a given time are then merged together
     * using the reducer function to produce a new event. The reducer function is
     * applied to all columns in the `fieldSpec`. Those new events are then
     * collected together to form a new `TimeSeries`.
     *
     * Example:
     *
     * For example you might have two TimeSeries with columns "in" and "out" which
     * corresponds to two measurements per timestamp. You could use this function to
     * obtain a new TimeSeries which was the sum of the the three measurements using
     * the `sum()` reducer function and an ["in", "out"] fieldSpec.
     *
     * ```
     * const totalSeries = TimeSeries.timeSeriesListReduce({
     *     name: "totals",
     *     seriesList: [inTraffic, outTraffic],
     *     reducer: sum(),
     *     fieldSpec: [ "in", "out" ]
     * });
     * ```
     */
    static timeSeriesListReduce(options) {
        const { seriesList, fieldSpec, reducer } = options,
            data = __rest(options, ["seriesList", "fieldSpec", "reducer"]);
        const combiner = Event.combiner(fieldSpec, reducer);
        return TimeSeries.timeSeriesListEventReduce(
            Object.assign({ seriesList, fieldSpec, reducer: combiner }, data)
        );
    }
    /**
     * Takes a list of `TimeSeries` and merges them together to form a new
     * `TimeSeries`.
     *
     * Merging will produce a new `Event` only when events are conflict free, so
     * it is useful in the following cases:
     *  * to combine multiple `TimeSeries` which have different time ranges, essentially
     *  concatenating them together
     *  * combine `TimeSeries` which have different columns, for example inTraffic has
     *  a column "in" and outTraffic has a column "out" and you want to produce a merged
     *  trafficSeries with columns "in" and "out".
     *
     * Example:
     * ```
     * const inTraffic = new TimeSeries(trafficDataIn);
     * const outTraffic = new TimeSeries(trafficDataOut);
     * const trafficSeries = TimeSeries.timeSeriesListMerge({
     *     name: "traffic",
     *     seriesList: [inTraffic, outTraffic]
     * });
     * ```
     */
    static timeSeriesListMerge(options) {
        const { seriesList, fieldSpec, reducer, deep = false } = options,
            data = __rest(options, ["seriesList", "fieldSpec", "reducer", "deep"]);
        const merger = Event.merger(deep);
        return TimeSeries.timeSeriesListEventReduce(
            Object.assign({ seriesList, fieldSpec, reducer: merger }, data)
        );
    }
    /**
     * @private
     */
    static timeSeriesListEventReduce(options) {
        const { seriesList, fieldSpec, reducer } = options,
            data = __rest(options, ["seriesList", "fieldSpec", "reducer"]);
        if (!seriesList || !_.isArray(seriesList)) {
            throw new Error("A list of TimeSeries must be supplied to reduce");
        }
        if (!reducer || !_.isFunction(reducer)) {
            throw new Error("reducer function must be supplied, for example avg()");
        }
        // for each series, make a map from timestamp to the
        // list of events with that timestamp
        const eventList = [];
        seriesList.forEach(series => {
            for (const e of series._collection.eventList()) {
                eventList.push(e);
            }
        });
        const events = reducer(Immutable.List(eventList));
        // Make a collection. If the events are out of order, sort them.
        // It's always possible that events are out of order here, depending
        // on the start times of the series, along with it the series
        // have missing data, so I think we don't have a choice here.
        const collection = new SortedCollection(events);
        const timeseries = new TimeSeries(Object.assign(Object.assign({}, data), { collection }));
        return timeseries;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZXNlcmllcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy90aW1lc2VyaWVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7OztHQVFHOzs7Ozs7Ozs7Ozs7QUFFSCxPQUFPLEtBQUssU0FBUyxNQUFNLFdBQVcsQ0FBQztBQUN2QyxPQUFPLEtBQUssQ0FBQyxNQUFNLFFBQVEsQ0FBQztBQUk1QixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ3RDLE9BQU8sRUFBUyxLQUFLLEVBQTJDLE1BQU0sU0FBUyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBSXZDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxJQUFJLEVBQVEsTUFBTSxRQUFRLENBQUM7QUFDcEMsT0FBTyxFQUFhLFNBQVMsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUNuRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUV6QyxPQUFPLEVBR0gsaUJBQWlCLEVBUXBCLE1BQU0sYUFBYSxDQUFDO0FBRXJCLE9BQU8sRUFLSCxVQUFVLEVBUVYsT0FBTyxFQUVWLE1BQU0sU0FBUyxDQUFDO0FBRWpCLFNBQVMsYUFBYSxDQUFDLElBQUk7SUFDdkIsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUUzQixPQUFPO0lBQ1AsQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFFcEMsUUFBUTtJQUNSLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2IsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUks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
