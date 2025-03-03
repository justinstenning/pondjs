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
import moment from "moment-timezone";
import { Index, index } from "./index";
import { Period } from "./period";
import { Time, time } from "./time";
import { TimeRange } from "./timerange";
export var WindowType;
(function(WindowType) {
    WindowType[(WindowType["Day"] = 1)] = "Day";
    WindowType[(WindowType["Month"] = 2)] = "Month";
    WindowType[(WindowType["Week"] = 3)] = "Week";
    WindowType[(WindowType["Year"] = 4)] = "Year";
})(WindowType || (WindowType = {}));
export class WindowBase {}
/**
 * Specifies a repeating day duration specific to the supplied timezone. You can
 * create one using the `daily()` factory function.
 *
 * Example:
 * ```
 * const dayWindowNewYork = daily("America/New_York");
 * const indexes = dayWindowNewYork.getIndexSet(Util.untilNow(duration("5d")));
 * ```
 */
// tslint:disable-next-line:max-classes-per-file
export class DayWindow extends WindowBase {
    /**
     * Given an index string representing a day (e.g. "2015-08-22"), and optionally
     * the timezone (default is UTC), return the corresponding `TimeRange`.
     */
    static timeRangeOf(indexString, tz = "Etc/UTC") {
        const parts = indexString.split("-");
        if (parts.length !== 3) {
            throw new Error("Index string for day is badly formatted");
        }
        let beginTime;
        let endTime;
        if (
            !_.isNaN(parseInt(parts[0], 10)) &&
            !_.isNaN(parseInt(parts[1], 10)) &&
            !_.isNaN(parseInt(parts[2], 10))
        ) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const day = parseInt(parts[2], 10);
            beginTime = moment.tz([year, month - 1, day], tz);
            endTime = moment.tz([year, month - 1, day], tz).endOf("day");
        }
    }
    /**
     * Construct a new `DayWindow`, optionally supplying the timezone `tz`
     * for the `Window`. The default is `UTC`.
     */
    constructor(tz = "Etc/UTC") {
        super();
        this._tz = tz;
    }
    /**
     * Returns an `Immutable.OrderedSet<Index>` set of day `Index`es for the
     * `Time` or `TimeRange` supplied as `t`.
     *
     * The simplest invocation of this function would be to pass in a `Time`
     * and get the day (e.g. "2017-09-10"). What day you get may depend on the
     * timezone specified when constructing this `DayWindow`. The most useful
     * aspect of a `DayWindow` is that you can use this index set to bucket
     * `Event`s into days in a particular timezone.
     */
    getIndexSet(t) {
        let results = Immutable.OrderedSet();
        let t1;
        let t2;
        if (t instanceof Time) {
            t1 = moment(+t).tz(this._tz);
            t2 = moment(+t).tz(this._tz);
        } else if (t instanceof TimeRange) {
            t1 = moment(+t.begin()).tz(this._tz);
            t2 = moment(+t.end()).tz(this._tz);
        }
        let tt = t1;
        while (tt.isSameOrBefore(t2)) {
            results = results.add(index(t1.format("YYYY-MM-DD"), this._tz));
            tt = tt.add(1, "d");
        }
        return results;
    }
}
/**
 * A `Window` is a specification for repeating range of time range which is
 * typically used in Pond to describe an aggregation bounds.
 *
 * Windows have a `Period` (which defines the frequency and offset of window
 * placement) combined with a `Duration` (which is the size of the window
 * itself).
 *
 * If a `Window` is defined with only a `Duration` then the freqency of the
 * `Window` is equal to the duration of the window (i.e. a fixed window).
 * If the period is smaller than the duration we have a sliding window.
 *
 * From a `Window` you can get a set of `Index`es for a specific `Time` or
 * `TimeRange`, giving you the `Window` or `Window`s that overlap that `Time`
 * or `TimeRange`. The main use of this is it allows you to easily bucket
 * `Events` into the appropiate `Window`s.
 *
 * Example:
 * ```
 * const timeseries = timeSeries(data);
 * const everyThirtyMinutes = window(duration("30m"));
 * const dailyAvg = timeseries.fixedWindowRollup({
 *     window: everyThirtyMinutes,
 *     aggregation: { average: ["value", avg()] }
 * });
 * ```
 *
 * Note: You can also use `DayWindow` with a specified timezone for more
 * control over daily aggregations.
 */
export class Window extends WindowBase {
    /**
     * To construct a `Window` you need to supply the `Duration` or length of the
     * window and the sliding `Period` of the window.
     *
     *  * Supply the `Duration` as the `d` arg.
     *  * Optionally supply the `Period`
     *
     * Repeats of the Window are given an index to represent that specific repeat.
     * That index is represented by an `Index` object and can also be represented
     * by a string that encodes the specific repeat.
     *
     * Since an `Index` can be a key for a `TimeSeries`, a repeated period and
     * associated data can be represented that way.
     *
     * ```
     *              |<- duration ---------->|
     * |<- offset ->|<- freq ->|                  (<- period )
     *              [-----------------------]
     *                         [-----------------------]
     *                                    [-----------------------]
     *                                            ...
     * ```
     *
     */
    // tslint:disable-next-line:max-classes-per-file
    constructor(d, period) {
        super();
        this._duration = d;
        if (period) {
            this._period = period;
        } else {
            this._period = new Period(d);
        }
    }
    toString() {
        if (+this._period.frequency() === +this.duration()) {
            return this._period.toString();
        } else {
            return `${this._duration}@${this._period}`;
        }
    }
    /**
     * Returns the underlying period of the Window
     */
    period() {
        return this._period;
    }
    /**
     * Returns the duration of the Window
     */
    duration() {
        return this._duration;
    }
    /**
     * Specify how often the underlying period repeats
     */
    every(frequency) {
        return new Window(this._duration, this._period.every(frequency));
    }
    /**
     * Specify an offset for the underlying period
     */
    offsetBy(t) {
        return new Window(this._duration, this._period.offsetBy(t));
    }
    /**
     * Returns the Window repeats as an `Immutable.Set<Index>` that covers
     * (in whole or in part) the time or timerange supplied. In this example,
     * B, C, D and E will be returned:
     *
     * ```
     *                    t (Time)
     *                    |
     *  [----------------]|                    A
     *      [-------------|--]                 B*
     *          [---------|------]             C*
     *              [-----|----------]         D*
     *                  [-|--------------]     E*
     *                    | [----------------] F
     * ```
     *
     */
    getIndexSet(t) {
        let t1;
        let t2;
        if (t instanceof Time) {
            t1 = t;
            t2 = t;
        } else if (t instanceof TimeRange) {
            t1 = t.begin();
            t2 = t.end();
        }
        let result = Immutable.OrderedSet();
        const prefix = this.toString();
        const scanBegin = this._period.next(time(+t1 - +this._duration));
        let periodIndex = Math.ceil(+scanBegin / +this._period.frequency());
        const indexes = [];
        while (periodIndex * +this._period.frequency() <= +t2) {
            result = result.add(new Index(`${prefix}-${periodIndex}`));
            periodIndex += 1;
        }
        return result;
    }
}
function window(d, period) {
    return new Window(d, period);
}
/*
function daily() {
    return new Window(WindowType.Day);
}
function monthly() {
    return new Window(WindowType.Month);
}
function yearly() {
    return new Window(WindowType.Year);
}
*/
function daily(tz = "Etc/UTC") {
    return new DayWindow(tz);
}
export { window, daily /*, monthly, yearly*/ };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3dpbmRvdy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7R0FRRztBQUVILE9BQU8sS0FBSyxTQUFTLE1BQU0sV0FBVyxDQUFDO0FBQ3ZDLE9BQU8sS0FBSyxDQUFDLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sTUFBTSxNQUFNLGlCQUFpQixDQUFDO0FBR3JDLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQ3ZDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDbEMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDcEMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUV4QyxNQUFNLENBQU4sSUFBWSxVQUtYO0FBTEQsV0FBWSxVQUFVO0lBQ2xCLHlDQUFPLENBQUE7SUFDUCw2Q0FBSyxDQUFBO0lBQ0wsMkNBQUksQ0FBQTtJQUNKLDJDQUFJLENBQUE7QUFDUixDQUFDLEVBTFcsVUFBVSxLQUFWLFVBQVUsUUFLckI7QUFFRCxNQUFNLE9BQWdCLFVBQVU7Q0FFL0I7QUFFRDs7Ozs7Ozs7O0dBU0c7QUFDSCxnREFBZ0Q7QUFDaEQsTUFBTSxPQUFPLFNBQVUsU0FBUSxVQUFVO0lBQ3JDOzs7T0FHRztJQUNJLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBbUIsRUFBRSxLQUFhLFNBQVM7UUFDakUsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNyQyxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDckIsTUFBTSxJQUFJLEtBQUssQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO1FBQy9ELENBQUM7UUFFRCxJQUFJLFNBQXdCLENBQUM7UUFDN0IsSUFBSSxPQUFzQixDQUFDO1FBQzNC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
