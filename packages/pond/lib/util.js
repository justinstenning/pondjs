"use strict";
/**
 *  Copyright (c) 2015-2017, The Regents of the University of California,
 *  through Lawrence Berkeley National Laboratory (subject to receipt
 *  of any required approvals from the U.S. Dept. of Energy).
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const Immutable = require("immutable");
const _ = require("lodash");
const moment = require("moment-timezone");
const duration_1 = require("./duration");
const index_1 = require("./index");
const period_1 = require("./period");
const time_1 = require("./time");
const timerange_1 = require("./timerange");
const UNITS = {
    n: { label: "nanoseconds", length: 1 / 1000000 },
    u: { label: "microseconds", length: 1 / 1000 },
    l: { label: "milliseconds", length: 1 },
    s: { label: "seconds", length: 1000 },
    m: { label: "minutes", length: 60 * 1000 },
    h: { label: "hours", length: 60 * 60 * 1000 },
    d: { label: "days", length: 60 * 60 * 24 * 1000 }
};
/**
 * A value is valid if it isn't either undefined, null, or a NaN
 */
function isValid(v) {
    return !(_.isUndefined(v) || _.isNaN(v) || _.isNull(v));
}
/**
 * The last duration of time until now, represented as a `TimeRange`
 */
function untilNow(d) {
    const t = new Date();
    const begin = new Date(+t - +d);
    return new timerange_1.TimeRange(begin, t);
}
/**
 * Single zero left padding, for days and months.
 */
function leftPad(value) {
    return `${value < 10 ? "0" : ""}${value}`;
}
const indexStringRegex = /^((([0-9]+)([smhdlun]))@)*(([0-9]+)([smhdlun]))(\+([0-9]+))*-([0-9]+)$/;
/**
 * Returns a duration in milliseconds given a window period.
 * For example "30s" (30 seconds) should return 30000ms. Accepts
 * seconds (e.g. "30s"), minutes (e.g. "5m"), hours (e.g. "6h") and
 * days (e.g. "30d") as the period.
 */
function windowDuration(p) {
    // window should be two parts, a number and a letter if it's a
    // range based index, e.g "1h".
    const parts = indexStringRegex.exec(p);
    if (parts && parts.length >= 3) {
        const num = parseInt(parts[1], 10);
        const unit = parts[2];
        return num * UNITS[unit].length * 1000;
    }
}
/**
 * Decodes a period based index string. The result is a structure containing:
 *  - decodedPeriod
 *  - decodedDuration
 *  - decodedIndex
 */
function decodeIndexString(indexString) {
    const parts = indexStringRegex.exec(indexString);
    const [g1, d, g2, g3, g4, frequency, g6, g7, g8, offset, i] = parts;
    const decodedPeriod = (0, period_1.period)(
        (0, duration_1.duration)(frequency),
        offset ? (0, time_1.time)(parseInt(offset, 10)) : null
    );
    const decodedDuration = d ? (0, duration_1.duration)(d) : decodedPeriod.frequency();
    const decodedIndex = parseInt(i, 10);
    return { decodedPeriod, decodedDuration, decodedIndex };
}
function isIndexString(indexString) {
    return indexStringRegex.test(indexString);
}
/**
 * Helper function to get the window position relative
 * to Jan 1, 1970.
 */
function windowPositionFromDate(p, date) {
    const d = this.windowDuration(p);
    let dd = moment.utc(date).valueOf();
    return Math.floor((dd /= d));
}
/**
 * Given an index string, return the `TimeRange` that represents. This is the
 * main parsing function as far as taking an index string and decoding it into
 * the timerange that it represents. For example, this is how the Index
 * constructor is able to take a string and represent a timerange. It is also
 * used when windowing to determine trigger times.
 */
function timeRangeFromIndexString(indexString, tz = "Etc/UTC") {
    const parts = indexString.split("-");
    let beginTime;
    let endTime;
    switch (parts.length) {
        case 3:
            // A day, month and year e.g. 2014-10-24
            if (
                !_.isNaN(parseInt(parts[0], 10)) &&
                !_.isNaN(parseInt(parts[1], 10)) &&
                !_.isNaN(parseInt(parts[2], 10))
            ) {
                const parsedYear = parseInt(parts[0], 10);
                const parsedMonth = parseInt(parts[1], 10);
                const parsedDay = parseInt(parts[2], 10);
                beginTime = moment.tz([parsedYear, parsedMonth - 1, parsedDay], tz);
                endTime = moment.tz([parsedYear, parsedMonth - 1, parsedDay], tz).endOf("day");
            }
            break;
        case 2:
            if (isIndexString(indexString)) {
                // Period index string e.g. 1d-1234
                const { decodedPeriod, decodedDuration, decodedIndex } = decodeIndexString(
                    indexString
                );
                const beginTimestamp = decodedIndex * +decodedPeriod.frequency();
                const endTimestamp = beginTimestamp + +decodedDuration;
                beginTime = moment(beginTimestamp).tz(tz);
                endTime = moment(endTimestamp).tz(tz);
            } else if (!_.isNaN(parseInt(parts[0], 10)) && !_.isNaN(parseInt(parts[1], 10))) {
                // A month and year e.g 2015-09
                const parsedYear = parseInt(parts[0], 10);
                const parsedMonth = parseInt(parts[1], 10);
                beginTime = moment.tz([parsedYear, parsedMonth - 1], tz);
                endTime = moment.tz([parsedYear, parsedMonth - 1], tz).endOf("month");
            }
            break;
        // A year e.g. 2015
        case 1:
            const year = parseInt(parts[0], 10);
            beginTime = moment.tz([year], tz);
            endTime = moment.tz([year], tz).endOf("year");
            break;
    }
    if (beginTime && beginTime.isValid() && endTime && endTime.isValid()) {
        return (0, timerange_1.timerange)(beginTime, endTime);
    } else {
        return undefined;
    }
}
/**
 * Returns a nice string for an index string. If the index string is of
 * the form 1d-2345 then just that string is returned (there's not nice
 * way to put it), but if it represents a day, month, or year
 * (e.g. 2015-07) then a nice string like "July" will be returned. It's
 * also possible to pass in the format of the reply for these types of
 * strings. See moment's format naming conventions:
 * http://momentjs.com/docs/#/displaying/format/
 */
function niceIndexString(indexString, format) {
    let t;
    const parts = indexString.split("-");
    switch (parts.length) {
        case 3:
            if (
                !_.isNaN(parseInt(parts[0], 10)) &&
                !_.isNaN(parseInt(parts[1], 10)) &&
                !_.isNaN(parseInt(parts[2], 10))
            ) {
                const parsedYear = parseInt(parts[0], 10);
                const parsedMonth = parseInt(parts[1], 10);
                const parsedDay = parseInt(parts[2], 10);
                t = moment.utc([parsedYear, parsedMonth - 1, parsedDay]);
                if (format) {
                    return t.format(format);
                } else {
                    return t.format("MMMM Do YYYY");
                }
            }
            break;
        case 2:
            if (isIndexString(indexString)) {
                return indexString;
            } else if (!_.isNaN(parseInt(parts[0], 10)) && !_.isNaN(parseInt(parts[1], 10))) {
                const parsedYear = parseInt(parts[0], 10);
                const parsedMonth = parseInt(parts[1], 10);
                t = moment.utc([parsedYear, parsedMonth - 1]);
                if (format) {
                    return t.format(format);
                } else {
                    return t.format("MMMM");
                }
            }
            break;
        case 1:
            const year = parts[0];
            t = moment.utc([year]);
            if (format) {
                return t.format(format);
            } else {
                return t.format("YYYY");
            }
    }
    return indexString;
}
/**
 * Returns true if the value is null, undefined or NaN
 */
function isMissing(val) {
    return _.isNull(val) || _.isUndefined(val) || _.isNaN(val);
}
/**
 * Function to turn a constructor args into a timestamp
 */
function timestampFromArg(arg) {
    if (_.isNumber(arg)) {
        return new Date(arg);
    } else if (_.isString(arg)) {
        return new Date(+arg);
    } else if (_.isDate(arg)) {
        return new Date(arg.getTime());
    } else if (moment.isMoment(arg)) {
        return new Date(arg.valueOf());
    } else {
        throw new Error(
            `Unable to get timestamp from ${arg}. Should be a number, date, or moment.`
        );
    }
}
/**
 * Function to turn a constructor args into a `TimeRange`
 */
function timeRangeFromArg(arg) {
    if (arg instanceof timerange_1.TimeRange) {
        return arg;
    } else if (_.isString(arg)) {
        const [begin, end] = arg.split(",");
        return new timerange_1.TimeRange(+begin, +end);
    } else if (_.isArray(arg) && arg.length === 2) {
        const argArray = arg;
        return new timerange_1.TimeRange(argArray[0], argArray[1]);
    } else {
        throw new Error(`Unable to parse timerange. Should be a TimeRange. Got ${arg}.`);
    }
}
/**
 * Function to turn a constructor of two args into an `Index`.
 * The second arg defines the timezone (local or UTC)
 */
function indexFromArgs(arg1, arg2 = "Etc/UTC") {
    if (_.isString(arg1)) {
        return (0, index_1.index)(arg1, arg2);
    } else if (arg1 instanceof index_1.Index) {
        return arg1;
    } else {
        throw new Error(`Unable to get index from ${arg1}. Should be a string or Index.`);
    }
}
/**
 * Function to turn a constructor arg into an `Immutable.Map`
 * of data.
 */
function dataFromArg(arg) {
    let data;
    if (_.isObject(arg)) {
        // Deeply convert the data to Immutable Map
        data = Immutable.fromJS(arg);
    } else if (data instanceof Immutable.Map) {
        // Copy reference to the data
        data = arg;
    } else if (_.isNumber(arg) || _.isString(arg)) {
        // Just add it to the value key of a new Map
        // e.g. new Event(t, 25); -> t, {value: 25}
        data = Immutable.Map({ value: arg });
    } else {
        throw new Error(`Unable to interpret event data from ${arg}.`);
    }
    return data;
}
/**
 * Convert the `field spec` into a list if it is not already.
 */
function fieldAsArray(field) {
    if (_.isArray(field)) {
        return field;
    } else if (_.isString(field)) {
        return field.split(".");
    }
}
exports.default = {
    dataFromArg,
    fieldAsArray,
    indexFromArgs,
    isMissing,
    isValid,
    leftPad,
    isIndexString,
    decodeIndexString,
    niceIndexString,
    timeRangeFromArg,
    timeRangeFromIndexString,
    timestampFromArg,
    untilNow,
    windowDuration,
    windowPositionFromDate
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7R0FRRzs7QUFFSCx1Q0FBdUM7QUFDdkMsNEJBQTRCO0FBQzVCLDBDQUEwQztBQUUxQyx5Q0FBZ0Q7QUFDaEQsbUNBQXVDO0FBQ3ZDLHFDQUEwQztBQUMxQyxpQ0FBOEI7QUFDOUIsMkNBQW1EO0FBRW5ELE1BQU0sS0FBSyxHQUFHO0lBQ1YsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBRSxNQUFNLEVBQUUsQ0FBQyxHQUFHLE9BQU8sRUFBRTtJQUNoRCxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLE1BQU0sRUFBRSxDQUFDLEdBQUcsSUFBSSxFQUFFO0lBQzlDLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtJQUN2QyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7SUFDckMsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsRUFBRSxHQUFHLElBQUksRUFBRTtJQUMxQyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksRUFBRTtJQUM3QyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxJQUFJLEVBQUU7Q0FDcEQsQ0FBQztBQUVGOztHQUVHO0FBQ0gsU0FBUyxPQUFPLENBQUMsQ0FBUztJQUN0QixPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0s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
