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
import { Align } from "./align";
import { Collection } from "./collection";
import { Event } from "./event";
import { Fill } from "./fill";
import { grouped } from "./groupedcollection";
import { Rate } from "./rate";
import { windowed } from "./windowedcollection";
/**
 * In general, a `Collection` is a bucket of `Event`'s, with no particular order. This,
 * however, is a sub-class of a `Collection` which always maintains time-based sorting.
 *
 * As a result, it allows certain operations such as `bisect()` which depend on a
 * known ordering.
 *
 * This is the backing structure for a `TimeSeries`. You probably want to use a
 * `TimeSeries` directly.
 */
export class SortedCollection extends Collection {
    /**
     * Construct a new `Sorted Collection`
     */
    constructor(arg1) {
        super(arg1);
        if (!super.isChronological()) {
            this._events = this._events.sortBy(event => {
                return +event.getKey().timestamp();
            });
        }
    }
    /**
     * Appends a new `Event` to the `SortedCollection`, returning a new `SortedCollection`
     * containing that `Event`. Optionally the `Event`s may be de-duplicated.
     *
     * The `dedup` arg may `true` (in which case any existing `Event`s with the
     * same key will be replaced by this new `Event`), or with a function. If
     * `dedup` is a user function that function will be passed a list of all `Event`s
     * with that duplicated key and will be expected to return a single `Event`
     * to replace them with, thus shifting de-duplication logic to the user.
     *
     * DedupFunction:
     * ```
     * (events: Immutable.List<Event<T>>) => Event<T>
     * ```
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
     * const myDedupedCollection = sortedCollection<Time>()
     *     .addEvent(e1)
     *     .addEvent(e2)
     *     .addEvent(e3, (events) => {
     *         const a = events.reduce((sum, e) => sum + e.get("a"), 0);
     *         return new Event<Time>(t, { a });
     *     });
     * ```
     */
    addEvent(event, dedup) {
        const events = this.eventList();
        const sortRequired = events.size > 0 && event.begin() < events.get(0).begin();
        const c = super.addEvent(event, dedup);
        if (sortRequired) {
            return new SortedCollection(c.sortByKey());
        } else {
            return new SortedCollection(c);
        }
    }
    /**
     * Returns true if all `Event`s are in chronological order. In the case
     * of a `SortedCollection` this will always return `true`.
     */
    isChronological() {
        return true;
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
        return this;
    }
    /**
     * Map over the events in this `SortedCollection`. For each `Event`
     * passed to your callback function you should map that to
     * a new `Event`.
     *
     * @example
     * ```
     * const mapped = sorted.map(event => {
     *     return new Event(event.key(), { a: 55 });
     * });
     * ```
     */
    map(mapper) {
        const remapped = this._events.map(mapper);
        return new SortedCollection(Immutable.List(remapped));
    }
    /**
     * Flat map over the events in this `SortedCollection`.
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
        return new SortedCollection(Immutable.List(remapped));
    }
    /**
     * Filter the `SortedCollection`'s `Event`'s with the supplied function.
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
        const filtered = this._events.filter(predicate);
        return new SortedCollection(Immutable.List(filtered));
    }
    /**
     * Returns the index that `bisect`'s the `TimeSeries` at the time specified.
     */
    bisect(t, b) {
        const tms = t.getTime();
        const size = this.size();
        let i = b || 0;
        if (!size) {
            return undefined;
        }
        for (; i < size; i++) {
            const ts = this.at(i)
                .timestamp()
                .getTime();
            if (ts > tms) {
                return i - 1 >= 0 ? i - 1 : 0;
            } else if (ts === tms) {
                return i;
            }
        }
        return i - 1;
    }
    /**
     * The `align()` method takes a `Event`s and interpolates new values on precise
     * time intervals. For example we get measurements from our network every 30 seconds,
     * but not exactly. We might get values timestamped at :32, 1:01, 1:28, 2:00 and so on.
     *
     * It is helpful to remove this at some stage of processing incoming data so that later
     * the aligned values can be aggregated together (combining multiple series into a singe
     * aggregated series).
     *
     * The alignment is controlled by the `AlignmentOptions`. This is an object of the form:
     * ```
     * {
     *    fieldSpec: string | string[];
     *    period: Period;
     *    method?: AlignmentMethod;
     *    limit?: number;
     * }
     * ```
     * Options:
     *  * `fieldSpec` - the field or fields to align
     *  * `period` - a `Period` object to control the time interval to align to
     *  * `method` - the interpolation method, which may be
     *    `AlignmentMethod.Linear` or `AlignmentMethod.Hold`
     *  * `limit` - how long to interpolate values before inserting nulls on boundaries.
     *
     * Note: Only a `Collection` of `Event<Time>` objects can be aligned. `Event<Index>`
     * objects are basically already aligned and it makes no sense in the case of a
     * `Event<TimeRange>`.
     *
     * Note: Aligned `Event`s will only contain the fields that the alignment was requested
     * on. Which is to say if you have two columns, "in" and "out", and only request to align
     * the "in" column, the "out" value will not be contained in the resulting collection.
     */
    align(options) {
        const p = new Align(options);
        return this.flatMap(e => p.addEvent(e));
    }
    /**
     * Returns the derivative of the `Event`s in this `Collection` for the given columns.
     *
     * The result will be per second. Optionally you can substitute in `null` values
     * if the rate is negative. This is useful when a negative rate would be considered
     * invalid like an ever increasing counter.
     *
     * To control the rate calculation you need to specify a `RateOptions` object, which
     * takes the following form:
     * ```
     * {
     *     fieldSpec: string | string[];
     *     allowNegative?: boolean;
     * }
     * ```
     * Options:
     *  * `fieldSpec` - the field to calculate the rate on
     *  * `allowNegative` - allow emit of negative rates
     */
    rate(options) {
        const p = new Rate(options);
        return this.flatMap(e => p.addEvent(e));
    }
    /**
     * Fills missing/invalid values in the `Event` with new values.
     *
     * These new value can be either zeros, interpolated values from neighbors, or padded,
     * meaning copies of previous value.
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
     *  * `method` - the interpolation method, one of `FillMethod.Hold`, `FillMethod.Pad`
     *               or `FillMethod.Linear`
     *  * `limit` - the number of missing values to fill before giving up
     *
     * Returns a new filled `Collection`.
     */
    fill(options) {
        const p = new Fill(options);
        return this.flatMap(e => p.addEvent(e));
    }
    /**
     * GroupBy a field's value. The result is a `GroupedCollection`, which internally maps
     * a key (the value of the field) to a `Collection` of `Event`s in that group.
     *
     * Example:
     *
     * In this example we group by the field "team_name" and then call the `aggregate()`
     * method on the resulting `GroupedCollection`.
     *
     * ```
     * const teamAverages = c
     *     .groupBy("team_name")
     *     .aggregate({
     *         "goals_avg": ["goals", avg()],
     *         "against_avg": ["against", avg()],
     *     });
     * teamAverages.get("raptors").get("goals_avg"));
     * teamAverages.get("raptors").get("against_avg"))
     * ```
     */
    groupBy(field) {
        return grouped(field, this);
    }
    /**
     * Window the `Collection` into a given period of time.
     *
     * This is similar to `groupBy` except `Event`s are grouped by their timestamp
     * based on the `Period` supplied. The result is a `WindowedCollection`.
     *
     * The windowing is controlled by the `WindowingOptions`, which takes the form:
     * ```
     * {
     *     window: WindowBase;
     *     trigger?: Trigger;
     * }
     * ```
     * Options:
     *  * `window` - a `WindowBase` subclass, currently `Window` or `DayWindow`
     *  * `trigger` - not needed in this context
     *
     * Example:
     *
     * ```
     * const c = new Collection()
     *     .addEvent(event(time("2015-04-22T02:28:00Z"), map({ team: "a", value: 3 })))
     *     .addEvent(event(time("2015-04-22T02:29:00Z"), map({ team: "a", value: 4 })))
     *     .addEvent(event(time("2015-04-22T02:30:00Z"), map({ team: "b", value: 5 })));
     *
     * const thirtyMinutes = window(duration("30m"));
     *
     * const windowedCollection = c.window({
     *     window: thirtyMinutes
     * });
     *
     * ```
     */
    window(options) {
        return windowed(options, Immutable.Map({ all: this }));
    }
    /**
     * Static function to compare two collections to each other. If the collections
     * are of the same value as each other then equals will return true.
     */
    // tslint:disable:member-ordering
    static is(collection1, collection2) {
        let result = true;
        const size1 = collection1.size();
        const size2 = collection2.size();
        if (size1 !== size2) {
            return false;
        } else {
            for (let i = 0; i < size1; i++) {
                result = result && Event.is(collection1.at(i), collection2.at(i));
            }
            return result;
        }
    }
    clone(events, keyMap) {
        const c = new SortedCollection();
        c._events = events;
        c._keyMap = keyMap;
        return c;
    }
}
function sortedCollectionFactory(arg1) {
    return new SortedCollection(arg1);
}
export { sortedCollectionFactory as sortedCollection, sortedCollectionFactory as sorted };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic29ydGVkY29sbGVjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9zb3J0ZWRjb2xsZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7OztHQVFHO0FBRUgsT0FBTyxLQUFLLFNBQVMsTUFBTSxXQUFXLENBQUM7QUFHdkMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUNoQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQzFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFDaEMsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUM5QixPQUFPLEVBQUUsT0FBTyxFQUF1QyxNQUFNLHFCQUFxQixDQUFDO0FBRW5GLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFHOUIsT0FBTyxFQUFFLFFBQVEsRUFBc0IsTUFBTSxzQkFBc0IsQ0FBQztBQUlwRTs7Ozs7Ozs7O0dBU0c7QUFDSCxNQUFNLE9BQU8sZ0JBQWdDLFNBQVEsVUFBYTtJQUM5RDs7T0FFRztJQUNILFlBQVksSUFBK0M7UUFDdkQsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ1osSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ3ZDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDdkMsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDO0lBQ0wsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O09Ba0NHO0lBQ0ksUUFBUSxDQUFDLEtBQWUsRUFBRSxLQUFrQztRQUMvRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDaEMsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssRUFBRSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDOUUsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdkMsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNmLE9BQU8sSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQztRQUMvQyxDQUFDO2FBQU0sQ0FBQztZQUNKLE9BQU8sSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQyxDQUFDO0lBQ0wsQ0FBQztJQUVEOzs7T0FHRztJQUNJLGVBQWU7UUFDbEIsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7O09BZ0JHO0lBQ0ksU0FBUztRQUNaLE9BQU8sSUFBSSxDQUFDO0lBQ2hCLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7T0FXRztJQUNJLEdBQUcsQ0FDTixNQUFzRDtRQUV0RCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMxQyxPQUFPLElBQUksZ0JBQWdCLENBQUksU0FBUyxDQUFDLElBQUksQ0FBVyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQ3ZFLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7T0FXRztJQUNJLE9BQU8sQ0FDVixNQUFzRTtRQUV0RSxNQUFNLFFBQVEsR0FBNkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDeEUsT0FBTyxJQUFJLGdCQUFnQixDQUFJLFNBQVMsQ0FBQyxJQUFJLENBQVcsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUN2RSxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7T0FVRztJQUNJLE1BQU0sQ0FBQyxTQUFzRDtRQUNoRSxNQUFNLFFBQVEsR0FBNkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDMUUsT0FBTyxJQUFJLGdCQUFnQixDQUFJLFNBQVMsQ0FBQyxJQUFJLENBQVcsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUN2RSxDQUFDO0lBRUQ7O09BRUc7SUFDSSxNQUFNLENBQUMsQ0FBTyxFQUFFLENBQVU7UUFDN0IsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3hCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUN6QixJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRWYsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1IsT0FBTyxTQUFTLENBQUM7UUFDckIsQ0FBQztRQUVELE9BQU8sQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ25CLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2lCQUNoQixTQUFTLEVBQUU7aUJBQ1gsT0FBTyxFQUFFLENBQUM7WUFDZixJQUFJLEVBQUUsR0FBRyxHQUFHLEVBQUUsQ0FBQztnQkFDWCxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEMsQ0FBQztpQkFBTSxJQUFJLEVBQUUsS0FBSyxHQUFHLEVBQUUsQ0FBQztnQkFDcEIsT0FBTyxDQUFDLENBQUM7WUFDYixDQUFDO1FBQ0wsQ0FBQztRQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNqQixDQUFDO0lBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O09BZ0NHO0lBQ0ksS0FBSyxDQUFDLE9BQXlCO1FBQ2xDLE1BQU0sQ0FBQyxHQUFHLElBQUksS0FBSyxDQUFJLE9BQU8sQ0FBQyxDQUFDO1FBQ2hDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQWtCRztJQUNJLElBQUksQ0FBQyxPQUFvQjtRQUM1QixNQUFNLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBSSxPQUFPLENBQUMsQ0FBQztRQUMvQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FxQkc7SUFDSSxJQUFJLENBQUMsT0FBb0I7UUFDNUIsTUFBTSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUksT0FBTyxDQUFDLENBQUM7UUFDL0IsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQW1CRztJQUNJLE9BQU8sQ0FBQyxLQUE4QztRQUN6RCxPQUFPLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQWdDRztJQUNJLE1BQU0sQ0FBQyxPQUF5QjtRQUNuQyxPQUFPLFFBQVEsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDM0QsQ0FBQztJQUVEOzs7T0FHRztJQUNILGlDQUFpQztJQUNqQyxNQUFNLENBQUMsRUFBRSxDQUFDLFdBQWtDLEVBQUUsV0FBa0M7UUFDNUUsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDO1FBQ2xCLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNqQyxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFakMsSUFBSSxLQUFLLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDbEIsT0FBTyxLQUFLLENBQUM7UUFDakIsQ0FBQzthQUFNLENBQUM7WUFDSixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzdCLE1BQU0sR0FBRyxNQUFNLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0RSxDQUFDO1lBQ0QsT0FBTyxNQUFNLENBQUM7UUFDbEIsQ0FBQztJQUNMLENBQUM7SUFFUyxLQUFLLENBQUMsTUFBTSxFQUFFLE1BQU07UUFDMUIsTUFBTSxDQUFDLEdBQUcsSUFBSSxnQkFBZ0IsRUFBSyxDQUFDO1FBQ3BDLENBQUMsQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO1FBQ25CLENBQUMsQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO1FBQ25CLE9BQU8sQ0FBQyxDQUFDO0lBQ2IsQ0FBQztDQUNKO0FBRUQsU0FBUyx1QkFBdUIsQ0FBZ0IsSUFBK0M7SUFDM0YsT0FBTyxJQUFJLGdCQUFnQixDQUFJLElBQUksQ0FBQyxDQUFDO0FBQ3pDLENBQUM7QUFFRCxPQUFPLEVBQUUsdUJBQXVCLElBQUksZ0JBQWdCLEVBQUUsdUJBQXVCLElBQUksTUFBTSxFQUFFLENBQUMifQ==
