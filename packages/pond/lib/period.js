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
exports.Period = void 0;
exports.period = period;
const Immutable = require("immutable");
const _ = require("lodash");
const time_1 = require("./time");
/**
 * A `Period` is a repeating time which is typically used to
 * either define the repeating nature of a `Window` or to describe periodic
 * boundaries of fill or align operations when doing data cleaning
 * on a `TimeSeries`.
 *
 * Periods have a frequency and an offset. If there is no offset, it
 * is aligned to Jan 1, 1970 00:00 UTC.
 *
 * To create a repeating window, see `Window` creation.
 */
class Period {
    /**
     * To define a `Period`, you need to supply the `duration` of the frequency that the
     * period repeats on. Optionally you can specify an `offset` for the period.
     *
     * Typically you would construct a `Period` object with the `period()` factory
     * function, which has a chaining style to it to make it easier to read in the code.
     * There is also a more standard constructor form.
     *
     * Example:
     * ```
     * const everyFiveMinutes = period()
     *     .every(duration("5m"))
     *     .offsetBy(time("2017-07-21T09:38:00.000Z"));
     * ```
     */
    constructor(frequency, offset) {
        this._frequency = frequency;
        this._offset = offset && !_.isNaN(offset) ? offset.timestamp().getTime() : 0;
    }
    /**
     * The `Period` expressed as a string, which is either $freq or $freq-$offset
     * depending on if an offset is present.
     */
    toString() {
        return this._offset ? `${this._frequency}+${this._offset}` : `${this._frequency}`;
    }
    /**
     * Returns the frequency part of the `Period`
     */
    frequency() {
        return this._frequency;
    }
    /**
     * Returns the offset of the `Period`
     */
    offset() {
        return this._offset;
    }
    /**
     * Chaining style specification of the `Duration` of the `Period`.
     * Returns a new `Period`.
     */
    every(frequency) {
        return new Period(frequency, (0, time_1.time)(this._offset));
    }
    /**
     * Chaining style specification of the offset, supplied as a `Time`.
     * Returns a new `Period`.
     */
    offsetBy(offset) {
        return new Period(this._frequency, offset);
    }
    /**
     * Returns true if the `Time` supplied is aligned with this `Period`.
     * If the `Period` is every 5m then 1:35pm align (true) while 1:36 would
     * not (false).
     */
    isAligned(t) {
        return ((+t - +this._offset) / +this._frequency) % 1 === 0;
    }
    /**
     * Given a `Time`, find the next `Time` aligned to the period.
     */
    next(t) {
        const index = Math.ceil((+t - +this._offset) / +this._frequency);
        const next = index * +this._frequency + this._offset;
        return next === +t ? new time_1.Time(next + +this._frequency) : new time_1.Time(next);
    }
    /**
     * Returns an `Immutable.List` of `Time`s within the given `TimeRange`
     * that align with this `Period`. Not this will potentially include
     * the start time of the timerange but never the end time of the timerange.
     *
     * Example:
     * ```
     * const range = timerange(
     *     time("2017-07-21T09:30:00.000Z"),
     *     time("2017-07-21T09:45:00.000Z")
     * );
     * const everyFiveMinutes = period()
     *     .every(duration("5m"))
     *     .offsetBy(time("2017-07-21T09:38:00.000Z"));
     *
     * const within = everyFiveMinutes.within(range);  // 9:33am, 9:38am, 9:43am
     * ```
     */
    within(timerange) {
        let result = Immutable.List();
        const t1 = (0, time_1.time)(timerange.begin());
        const t2 = (0, time_1.time)(timerange.end());
        let scan = this.isAligned(t1) ? t1 : this.next(t1);
        while (+scan < +t2) {
            result = result.push(scan);
            scan = this.next(scan);
        }
        return result;
    }
}
exports.Period = Period;
/**
 * A `Period` is a repeating time which is typically used in Pond to
 * either define the repeating nature of a `Window`
 * or to describe `Align` or `Fill` positions when doing data cleaning
 * on a `TimeSeries`.
 *
 * To define a `Period`, you need to supply the `duration` of the frequency that the
 * period repeats on. Optionally you can specify an `offset` for the period. You can
 * also use a chaining style construction.
 */
function period(frequency, offset) {
    return new Period(frequency, offset);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyaW9kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3BlcmlvZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7O0dBUUc7OztBQW9KTSx3QkFBTTtBQWxKZix1Q0FBdUM7QUFDdkMsNEJBQTRCO0FBRzVCLGlDQUFvQztBQUdwQzs7Ozs7Ozs7OztHQVVHO0FBQ0gsTUFBYSxNQUFNO0lBSWY7Ozs7Ozs7Ozs7Ozs7O09BY0c7SUFDSCxZQUFZLFNBQW9CLEVBQUUsTUFBYTtRQUMzQyxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztRQUM1QixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pGLENBQUM7SUFFRDs7O09BR0c7SUFDSCxRQUFRO1FBQ0osT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUN0RixDQUFDO0lBRUQ7O09BRUc7SUFDSCxTQUFTO1FBQ0wsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO0lBQzNCLENBQUM7SUFFRDs7T0FFRztJQUNILE1BQU07UUFDRixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7SUFDeEIsQ0FBQztJQUVEOzs7T0FHRztJQUNILEtBQUssQ0FBQyxTQUFtQjtRQUNyQixPQUFPLElBQUksTUFBTSxDQUFDLFNBQVMsRUFBRSxJQUFBLFdBQUksRUFBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUNyRCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsUUFBUSxDQUFDLE1BQVk7UUFDakIsT0FBTyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsU0FBUyxDQUFDLENBQU87UUFDYixPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQy9ELENBQUM7SUFFRDs7T0FFRztJQUNILElBQUksQ0FBQyxDQUFPO1FBQ1IsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2pFLE1BQU0sSUFBSSxHQUFHLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUNyRCxPQUFPLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxXQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLFdBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM1RSxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7O09BaUJHO0lBQ0gsTUFBTSxDQUFDLFNBQW9CO1FBQ3ZCLElBQUksTUFBTSxHQUFHLFNBQVMsQ0FBQyxJQUFJLEVBQVEsQ0FBQztRQUVwQyxNQUFNLEVBQUUsR0FBRyxJQUFBLFdBQUksRUFBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUNuQyxNQUFNLEVBQUUsR0FBRyxJQUFBLFdBQUksRUFBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUVqQyxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbkQsT0FBTyxDQUFDLElBQUksR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2pCLE1BQU0sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzNCLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNCLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQztJQUNsQixDQUFDO0NBQ0o7QUFoSEQsd0JBZ0hDO0FBRUQ7Ozs7Ozs7OztHQVNHO0FBQ0gsU0FBUyxNQUFNLENBQUMsU0FBb0IsRUFBRSxNQUFhO0lBQy9DLE9BQU8sSUFBSSxNQUFNLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQ3pDLENBQUMifQ==
