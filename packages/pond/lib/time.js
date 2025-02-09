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
exports.Time = void 0;
exports.now = now;
exports.time = timeFactory;
const _ = require("lodash");
const key_1 = require("./key");
const timerange_1 = require("./timerange");
const types_1 = require("./types");
/**
 * Constructs a new `Time` object that can be used as a key for `Event`'s.
 *
 * A `Time` object represents a timestamp, and is stored as a Javascript `Date`
 * object. The difference with just a `Date` is that is conforms to the interface
 * required to be an `Event` key.
 */
class Time extends key_1.Key {
    static isTime(t) {
        return t instanceof Time;
    }
    constructor(d) {
        super();
        if (_.isDate(d)) {
            this._d = d;
        } else if (_.isNumber(d)) {
            this._d = new Date(d);
        } else if (_.isString(d)) {
            this._d = new Date(d);
        } else {
            this._d = new Date();
        }
    }
    type() {
        return "time";
    }
    toJSON() {
        return { time: +this._d };
    }
    toString() {
        return JSON.stringify(this.toJSON());
    }
    /**
     * Returns the native Date object for this `Time`
     */
    toDate() {
        return this.timestamp();
    }
    /**
     * The timestamp of this data, in UTC time, as a string.
     */
    toUTCString() {
        return this.timestamp().toUTCString();
    }
    /**
     * The timestamp of this data, in Local time, as a string.
     */
    toLocalString() {
        return this.timestamp().toString();
    }
    /**
     * The timestamp of this data
     */
    timestamp() {
        return this._d;
    }
    valueOf() {
        return +this._d;
    }
    /**
     * The begin time of this `Event`, which will be just the timestamp
     */
    begin() {
        return this.timestamp();
    }
    /**
     * The end time of this `Event`, which will be just the timestamp
     */
    end() {
        return this.timestamp();
    }
    /**
     * Takes this Time and returns a TimeRange of given duration
     * which is either centrally located around the Time, or aligned
     * to either the Begin or End time.
     *
     * For example remapping keys, each one of the keys is a Time, but
     * we want to convert the timeseries to use TimeRanges instead:
     * ```
     * const remapped = series.mapKeys(t => t.toTimeRange(duration("5m"), TimeAlignment.Middle));
     * ```
     *
     * The alignment is either:
     *  * TimeAlignment.Begin
     *  * TimeAlignment.Middle
     *  * TimeAlignment.End
     *
     */
    toTimeRange(duration, align) {
        const d = +duration;
        const timestamp = +this.timestamp();
        switch (align) {
            case types_1.TimeAlignment.Begin:
                return new timerange_1.TimeRange(timestamp, timestamp + d);
            case types_1.TimeAlignment.Middle:
                const half = Math.round(d / 2);
                return new timerange_1.TimeRange(timestamp - half, timestamp + d - half);
            case types_1.TimeAlignment.End:
                return new timerange_1.TimeRange(timestamp - d, timestamp);
        }
    }
}
exports.Time = Time;
/**
 * Constructs a new `Time` object. A `Time` object represents a timestamp,
 * and is stored as a Javascript `Date` object. The difference with just a Date is that
 * this conforms to the interface required to be an `Event` key.
 */
function timeFactory(d) {
    return new Time(d);
}
/**
 * Returns the the current time as a `Time` object
 */
function now() {
    return new Time(new Date());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy90aW1lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7R0FRRzs7O0FBNklNLGtCQUFHO0FBQWlCLDJCQUFJO0FBM0lqQyw0QkFBNEI7QUFFNUIsK0JBQTRCO0FBQzVCLDJDQUF3QztBQUN4QyxtQ0FBd0M7QUFFeEM7Ozs7OztHQU1HO0FBQ0gsTUFBYSxJQUFLLFNBQVEsU0FBRztJQUN6QixNQUFNLENBQUMsTUFBTSxDQUFDLENBQU87UUFDakIsT0FBTyxDQUFDLFlBQVksSUFBSSxDQUFDO0lBQzdCLENBQUM7SUFJRCxZQUFZLENBQTBCO1FBQ2xDLEtBQUssRUFBRSxDQUFDO1FBQ1IsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDZCxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNoQixDQUFDO2FBQU0sSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxQixDQUFDO2FBQU0sSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxQixDQUFDO2FBQU0sQ0FBQztZQUNKLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUN6QixDQUFDO0lBQ0wsQ0FBQztJQUVELElBQUk7UUFDQSxPQUFPLE1BQU0sQ0FBQztJQUNsQixDQUFDO0lBRUQsTUFBTTtRQUNGLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUVELFFBQVE7UUFDSixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsTUFBTTtRQUNGLE9BQU8sSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQzVCLENBQUM7SUFFRDs7T0FFRztJQUNILFdBQVc7UUFDUCxPQUFPLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUMxQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxhQUFhO1FBQ1QsT0FBTyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDdkMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsU0FBUztRQUNMLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQztJQUNuQixDQUFDO0lBRUQsT0FBTztRQUNILE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO0lBQ3BCLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUs7UUFDRCxPQUFPLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUM1QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxHQUFHO1FBQ0MsT0FBTyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDNUIsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7O09BZ0JHO0lBQ0gsV0FBVyxDQUFDLFFBQWtCLEVBQUUsS0FBb0I7UUFDaEQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUM7UUFDcEIsTUFBTSxTQUFTLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDcEMsUUFBUSxLQUFLLEVBQUUsQ0FBQztZQUNaLEtBQUsscUJBQWEsQ0FBQyxLQUFLO2dCQUNwQixPQUFPLElBQUkscUJBQVMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ25ELEtBQUsscUJBQWEsQ0FBQyxNQUFNO2dCQUNyQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDL0IsT0FBTyxJQUFJLHFCQUFTLENBQUMsU0FBUyxHQUFHLElBQUksRUFBRSxTQUFTLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQ2pFLEtBQUsscUJBQWEsQ0FBQyxHQUFHO2dCQUNsQixPQUFPLElBQUkscUJBQVMsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3ZELENBQUM7SUFDTCxDQUFDO0NBQ0o7QUE1R0Qsb0JBNEdDO0FBRUQ7Ozs7R0FJRztBQUNILFNBQVMsV0FBVyxDQUFDLENBQTBCO0lBQzNDLE9BQU8sSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkIsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBUyxHQUFHO0lBQ1IsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUM7QUFDaEMsQ0FBQyJ9
