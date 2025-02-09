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
exports.Duration = void 0;
exports.duration = durationFactory;
const _ = require("lodash");
const moment = require("moment");
const UNITS = {
    nanoseconds: 1 / 1000 / 1000,
    microseconds: 1 / 1000,
    milliseconds: 1,
    seconds: 1000,
    minutes: 1000 * 60,
    hours: 1000 * 60 * 60,
    days: 1000 * 60 * 60 * 24,
    weeks: 1000 * 60 * 60 * 24 * 7
};
const SHORT_UNITS = {
    n: 1 / 1000 / 1000,
    u: 1 / 1000,
    l: 1,
    s: 1000,
    m: 1000 * 60,
    h: 1000 * 60 * 60,
    d: 1000 * 60 * 60 * 24,
    w: 1000 * 60 * 60 * 24 * 7
};
/**
 * A `Duration` is a fixed length of time, unattached to any point in time.
 *
 * It is typically used in combination with a `Period` to describe an aggregation
 * window. For example a `period(duration("1d"))` would indicate windows that are
 * a day long.
 */
class Duration {
    /**
     * There are a number of ways to construct a duration:
     *  * Passing a number to the constructor will be considered milliseconds
     *  * Passing a string to the constuctor will be considered a duration string, with a
     *    format of `%d[s|m|h|d]`
     *  * Passing a number and a string will be considered a quantity and a unit.
     *    The string should be one of: "milliseconds", "seconds", "minutes", "hours",
     *    "days" or "weeks"
     *  * Finally, you can pass either a `moment.Duration` or a `Moment.Duration-like`
     *    object to the constructor
     *
     * Example 1
     * ```
     * const thirtyMinutes = duration("30m";
     * ```
     *
     * Example 2:
     * ```
     * const dayDuration = duration(24, "hours");
     * ```
     *
     * Example 3:
     * ```
     * const p = duration({
     *     seconds: 2,
     *     minutes: 2,
     *     hours: 2,
     *     days: 2,
     *     weeks: 2,
     *     months: 2,
     *     years: 2
     * });
     * ```
     * In all cases you can use `new Duration()` or the factory function `duration()`.
     */
    constructor(arg1, arg2) {
        if (_.isNumber(arg1)) {
            if (!arg2) {
                this._duration = arg1;
            } else if (_.isString(arg2) && _.has(UNITS, arg2)) {
                const multiplier = arg1;
                this._duration = multiplier * UNITS[arg2];
            } else {
                throw new Error("Unknown arguments pssed to Duration constructor");
            }
        } else if (_.isString(arg1)) {
            this._string = arg1;
            let multiplier;
            let unit;
            const regex = /([0-9]+)([nulsmhdw])/;
            const parts = regex.exec(arg1);
            if (parts && parts.length >= 3) {
                multiplier = parseInt(parts[1], 10);
                unit = parts[2];
                this._duration = multiplier * SHORT_UNITS[unit];
            }
        } else if (moment.isDuration(arg1)) {
            const d = arg1;
            this._string = d.toISOString();
            this._duration = d.asMilliseconds();
        } else if (_.isObject(arg1)) {
            const d = moment.duration(arg1);
            this._string = d.toISOString();
            this._duration = d.asMilliseconds();
        } else {
            throw new Error("Unknown arguments pssed to Duration constructor");
        }
    }
    /**
     * Returns a string for the `Duration`. If the `Duration` was originally
     * defined with a string then that string is returned. If defined with a `Moment.duration`
     * then Moment's `toISOString()` is used. Otherwise this falls back to a millisecond
     * representation.
     */
    toString() {
        if (this._string) {
            return this._string;
        }
        return `${this._duration}ms`;
    }
    /**
     * Returns the number of milliseconds for this `Duration`.
     *
     * Example:
     * ```
     * const p = duration(moment.duration(24, "hours"));
     * console.log(+p) // 86400000
     */
    valueOf() {
        return this._duration;
    }
}
exports.Duration = Duration;
function durationFactory(arg1, arg2) {
    return new Duration(arg1, arg2);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHVyYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZHVyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7OztHQVFHOzs7QUE0SXlCLG1DQUFRO0FBMUlwQyw0QkFBNEI7QUFDNUIsaUNBQWlDO0FBRWpDLE1BQU0sS0FBSyxHQUE4QjtJQUNyQyxXQUFXLEVBQUUsQ0FBQyxHQUFHLElBQUksR0FBRyxJQUFJO0lBQzVCLFlBQVksRUFBRSxDQUFDLEdBQUcsSUFBSTtJQUN0QixZQUFZLEVBQUUsQ0FBQztJQUNmLE9BQU8sRUFBRSxJQUFJO0lBQ2IsT0FBTyxFQUFFLElBQUksR0FBRyxFQUFFO0lBQ2xCLEtBQUssRUFBRSxJQUFJLEdBQUcsRUFBRSxHQUFHLEVBQUU7SUFDckIsSUFBSSxFQUFFLElBQUksR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUU7SUFDekIsS0FBSyxFQUFFLElBQUksR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDO0NBQ2pDLENBQUM7QUFFRixNQUFNLFdBQVcsR0FBOEI7SUFDM0MsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLEdBQUcsSUFBSTtJQUNsQixDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUk7SUFDWCxDQUFDLEVBQUUsQ0FBQztJQUNKLENBQUMsRUFBRSxJQUFJO0lBQ1AsQ0FBQyxFQUFFLElBQUksR0FBRyxFQUFFO0lBQ1osQ0FBQyxFQUFFLElBQUksR0FBRyxFQUFFLEdBQUcsRUFBRTtJQUNqQixDQUFDLEVBQUUsSUFBSSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRTtJQUN0QixDQUFDLEVBQUUsSUFBSSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUM7Q0FDN0IsQ0FBQztBQUVGOzs7Ozs7R0FNRztBQUNILE1BQWEsUUFBUTtJQUlqQjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQWtDRztJQUNI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
