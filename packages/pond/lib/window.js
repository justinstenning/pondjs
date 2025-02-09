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
exports.Window = exports.DayWindow = exports.WindowBase = exports.WindowType = void 0;
exports.window = window;
exports.daily = daily;
const Immutable = require("immutable");
const _ = require("lodash");
const moment = require("moment-timezone");
const index_1 = require("./index");
const period_1 = require("./period");
const time_1 = require("./time");
const timerange_1 = require("./timerange");
var WindowType;
(function(WindowType) {
    WindowType[(WindowType["Day"] = 1)] = "Day";
    WindowType[(WindowType["Month"] = 2)] = "Month";
    WindowType[(WindowType["Week"] = 3)] = "Week";
    WindowType[(WindowType["Year"] = 4)] = "Year";
})(WindowType || (exports.WindowType = WindowType = {}));
class WindowBase {}
exports.WindowBase = WindowBase;
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
class DayWindow extends WindowBase {
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
        if (t instanceof time_1.Time) {
            t1 = moment(+t).tz(this._tz);
            t2 = moment(+t).tz(this._tz);
        } else if (t instanceof timerange_1.TimeRange) {
            t1 = moment(+t.begin()).tz(this._tz);
            t2 = moment(+t.end()).tz(this._tz);
        }
        let tt = t1;
        while (tt.isSameOrBefore(t2)) {
            results = results.add((0, index_1.index)(t1.format("YYYY-MM-DD"), this._tz));
            tt = tt.add(1, "d");
        }
        return results;
    }
}
exports.DayWindow = DayWindow;
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
class Window extends WindowBase {
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
            this._period = new period_1.Period(d);
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
        if (t instanceof time_1.Time) {
            t1 = t;
            t2 = t;
        } else if (t instanceof timerange_1.TimeRange) {
            t1 = t.begin();
            t2 = t.end();
        }
        let result = Immutable.OrderedSet();
        const prefix = this.toString();
        const scanBegin = this._period.next((0, time_1.time)(+t1 - +this._duration));
        let periodIndex = Math.ceil(+scanBegin / +this._period.frequency());
        const indexes = [];
        while (periodIndex * +this._period.frequency() <= +t2) {
            result = result.add(new index_1.Index(`${prefix}-${periodIndex}`));
            periodIndex += 1;
        }
        return result;
    }
}
exports.Window = Window;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3dpbmRvdy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7O0dBUUc7OztBQTJRTSx3QkFBTTtBQUFFLHNCQUFLO0FBelF0Qix1Q0FBdUM7QUFDdkMsNEJBQTRCO0FBQzVCLDBDQUEwQztBQUcxQyxtQ0FBdUM7QUFDdkMscUNBQWtDO0FBQ2xDLGlDQUFvQztBQUNwQywyQ0FBd0M7QUFFeEMsSUFBWSxVQUtYO0FBTEQsV0FBWSxVQUFVO0lBQ2xCLHlDQUFPLENBQUE7SUFDUCw2Q0FBSyxDQUFBO0lBQ0wsMkNBQUksQ0FBQTtJQUNKLDJDQUFJLENBQUE7QUFDUixDQUFDLEVBTFcsVUFBVSwwQkFBVixVQUFVLFFBS3JCO0FBRUQsTUFBc0IsVUFBVTtDQUUvQjtBQUZELGdDQUVDO0FBRUQ7Ozs7Ozs7OztHQVNHO0FBQ0gsZ0RBQWdEO0FBQ2hELE1BQWEsU0FBVSxTQUFRLFVBQVU7SUFDckM7OztPQUdHO0lBQ0ksTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFtQixFQUFFLEtBQWEsU0FBUztRQUNqRSxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3JDLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNyQixNQUFNLElBQUksS0FBSyxDQUFDLHlDQUF5QyxDQUFDLENBQUM7UUFDL0QsQ0FBQztRQUVELElBQUksU0FBd0IsQ0FBQztRQUM3QixJQUFJLE9BQXNCLENBQUM7UUFDM0IsSUFDSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNoQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNoQyxDQUFDLENBQUMs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
