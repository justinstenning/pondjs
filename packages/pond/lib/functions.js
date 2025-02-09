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
exports.filter = exports.InterpolationType = void 0;
exports.keep = keep;
exports.sum = sum;
exports.avg = avg;
exports.max = max;
exports.min = min;
exports.count = count;
exports.first = first;
exports.last = last;
exports.difference = difference;
exports.median = median;
exports.stdev = stdev;
exports.percentile = percentile;
const _ = require("lodash");
const util_1 = require("./util");
//
// Functions to process missing values out of a value list
//
/**
 * A pass through filter, keeps the input values just as they were.
 */
const keepMissing = values => values;
/**
 * Filters out any missing values (`null`, `undefined` or `NaN`) from the input values
 */
const ignoreMissing = values => values.filter(util_1.default.isValid);
/**
 * Replaces any missing value (`null`, `undefined` or `NaN`) with the value `0`
 */
const zeroMissing = values => values.map(v => (util_1.default.isValid(v) ? v : 0));
/**
 * Scans the input values for missing values (`null`, `undefined` or `NaN`) and
 * returns `null` if one or more exist, otherwise returns the original values. An
 * example of doing this might be that you are summing values of events in
 * an hour, but if you are missing any values you don't want do the sum at all,
 * you want to say that for that hour the sum is unknown.
 */
const propagateMissing = values => (ignoreMissing(values).length === values.length ? values : null);
/**
 * If the input values are an empty array, return `null`, otherwise return
 * the input values.
 */
const noneIfEmpty = values => (values.length === 0 ? null : values);
/**
 * Like `first()` except it will return null if not all the values are
 * the same. This can be used to transfer a value when doing aggregation.
 *
 * For instance you might "group by" the 'type', then `avg` the 'value', but
 * you want to results to include the type. So you would `keep()` the type
 * and `avg()` the value.
 */
function keep(clean = exports.filter.ignoreMissing) {
    return values => {
        const cleanValues = clean(values);
        if (!cleanValues) {
            return null;
        }
        const result = first()(cleanValues);
        cleanValues.forEach(v => {
            if (v !== result) {
                return null;
            }
        });
        return result;
    };
}
/**
 * Returns a `sum()` function, i.e. returns a function that takes a list
 * of values and returns their total.
 *
 * Example:
 * ```
 * import { sum } from "pondjs";
 * const aggregationFunction = sum()
 * const result = aggregationFunction([3, 5, 6]) // 14
 * ```
 *
 * Optionally you can specify the method by which unclean values
 * are treated. The default is to exclude missing values from
 * the sum calculation. Other possibilities are:
 * * `propagateMissing` - which will cause the sum itself to be null if the
 *                        values contain a missing value
 * * `zeroMissing` - will replace missing values with a zero, which for a sum
 *                   is the same as excluding those values
 */
function sum(clean = exports.filter.ignoreMissing) {
    return values => {
        const cleanValues = clean(values);
        if (!cleanValues) {
            return null;
        }
        return _.reduce(cleanValues, (a, b) => a + b, 0);
    };
}
/**
 * Returns an `avg()` function. i.e. returns a function that takes a list
 * of values and returns the average of those.
 *
 * Example:
 * ```
 * import { avg } from "pondjs";
 * const aggregationFunction = avg()
 * const result = aggregationFunction([3, 5, 6]) // ~4.66666
 * ```
 *
 * Optionally you can specify the method by which unclean values
 * are treated. The default is to exclude missing values from
 * the average calculation. Other possibilities are:
 * * `propagateMissing` - which will cause the resulting average to be null if the values
 *                        contain a missing value
 * * `zeroMissing` - will replace missing values with a zero, thus missing values will bring
 *                   the average down
 */
function avg(clean = exports.filter.ignoreMissing) {
    return values => {
        const cleanValues = clean(values);
        if (!cleanValues) {
            return null;
        }
        const total = _.reduce(
            cleanValues,
            (a, b) => {
                return a + b;
            },
            0
        );
        return total / cleanValues.length;
    };
}
/**
 * Return a `max()` function.  i.e. returns a function that takes a list
 * of values and returns the average of those.
 *
 * Optionally you can specify the method by which unclean values
 * are treated. The default is to exclude missing values from
 * the maximum search. Other possibilities are:
 * * `propagateMissing` - which will cause the max itself to be null if the values
 *                        contain a missing value
 * * `zeroMissing` - will replace missing values with a zero
 */
function max(clean = exports.filter.ignoreMissing) {
    return values => {
        const cleanValues = clean(values);
        if (!cleanValues) {
            return null;
        }
        const result = _.max(cleanValues);
        if (_.isFinite(result)) {
            return result;
        }
    };
}
/**
 * Return a `min()` function.
 *
 * Optionally you can specify the method by which unclean values
 * are treated. The default is to exclude missing values from
 * the minimum search. Other possibilities are:
 * * `propagateMissing` - which will cause the min itself to be null if the
 *                         values contain a missing value
 * * `zeroMissing` - will replace missing values with a zero
 */
function min(clean = exports.filter.ignoreMissing) {
    return values => {
        const cleanValues = clean(values);
        if (!cleanValues) {
            return null;
        }
        const result = _.min(cleanValues);
        if (_.isFinite(result)) {
            return result;
        }
    };
}
/**
 * Returns a `count()` function.
 *
 * Optionally you can specify the method by which unclean values
 * are treated. The default is to exclude missing values from
 * the count. Other possibilities are:
 * * `propagateMissing` - which will cause the count itself to be null if the
 *                         values contain a missing value
 */
function count(clean = exports.filter.ignoreMissing) {
    return values => {
        const cleanValues = clean(values);
        if (!cleanValues) {
            return null;
        }
        return cleanValues.length;
    };
}
/**
 * Returns a `first()` function, i.e. a function that returns the first
 * value in the supplied values list.
 *
 * Optionally you can specify the method by which unclean values
 * are treated. The default is to exclude missing values from
 * the list, i.e to find the first non-missing value. Other
 * possibilities are:
 * * `keepMissing` - to return the first value, regardless of if it is a missing value or not.
 */
function first(clean = exports.filter.ignoreMissing) {
    return values => {
        const cleanValues = clean(values);
        if (!cleanValues) {
            return null;
        }
        return cleanValues.length ? cleanValues[0] : undefined;
    };
}
/**
 * Returns a `last()` function, i.e. a function that returns the list
 * value in the supplied values list.
 *
 * Optionally you can specify the method by which unclean values
 * are treated. The default is to exclude missing values from
 * the list, i.e to find the last non-missing value. Other
 * possibilities are:
 * * `keepMissing` - to return the last value, regardless of if it is a missing value or not.
 */
function last(clean = exports.filter.ignoreMissing) {
    return values => {
        const cleanValues = clean(values);
        if (!cleanValues) {
            return null;
        }
        return cleanValues.length ? cleanValues[cleanValues.length - 1] : undefined;
    };
}
/**
 * Returns a `difference()` function, i.e. a function that returns
 * the difference between the `min` and `max` values.
 *
 * Optionally you can specify the method by which unclean values
 * are treated. The default is to exclude missing values from
 * the list, i.e to find the last non-missing value. Other
 * possibilities are:
 * * `propagateMissing` - which will cause the min itself to be null if the
 *                         values contain a missing value
 * * `zeroMissing` - will replace missing values with a zero
 */
function difference(clean = exports.filter.ignoreMissing) {
    return values => {
        const cleanValues = clean(values);
        if (!cleanValues) {
            return null;
        }
        return _.max(cleanValues) - _.min(cleanValues);
    };
}
/**
 * Returns the `median()` function, i.e. a function that returns
 * the median of the values supplied to it.
 */
function median(clean = exports.filter.ignoreMissing) {
    return values => {
        const cleanValues = clean(values);
        if (!cleanValues) {
            return null;
        }
        const sorted = cleanValues.sort();
        const i = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) {
            const a = sorted[i];
            const b = sorted[i - 1];
            return (a + b) / 2;
        } else {
            return sorted[i];
        }
    };
}
/**
 * Returns a function that returns a `stdev()` function, i.e. a function
 * that returns the standard deviation of the values supplied to it.
 */
function stdev(clean = exports.filter.ignoreMissing) {
    return values => {
        const cleanValues = clean(values);
        if (!cleanValues) {
            return null;
        }
        let sums = 0;
        const mean = avg(clean)(cleanValues);
        cleanValues.forEach(v => (sums += Math.pow(v - mean, 2)));
        return Math.sqrt(sums / values.length);
    };
}
var InterpolationType;
(function(InterpolationType) {
    InterpolationType[(InterpolationType["linear"] = 1)] = "linear";
    InterpolationType[(InterpolationType["lower"] = 2)] = "lower";
    InterpolationType[(InterpolationType["higher"] = 3)] = "higher";
    InterpolationType[(InterpolationType["nearest"] = 4)] = "nearest";
    InterpolationType[(InterpolationType["midpoint"] = 5)] = "midpoint";
})(InterpolationType || (exports.InterpolationType = InterpolationType = {}));
/**
 * Returns a `percentile` function within the a values list.
 *
 * The parameters controlling the function:
 *  * `q` - The percentile (should be between 0 and 100), e.g q=75 for 75th percentile.
 *  * `interp` - Specifies the interpolation method to use when the desired
 *    quantile lies between two data points.
 *             Options are:
 *              * linear: i + (j - i) * fraction, where fraction is
 *                the fractional part of the index surrounded by i and j.
 *              * lower: i.
 *              * higher: j.
 *              * nearest: i or j whichever is nearest.
 *              * midpoint: (i + j) / 2.
 *  * `clean` - Strategy to use when encountering missing data:
 *              * `propagateMissing` - which will cause the min
 *                 itself to be null if the values contain a
 *                 missing value
 *              * `zeroMissing` - will replace missing values
 *                 with a zero
 */
function percentile(q, interp = InterpolationType.linear, clean = exports.filter.ignoreMissing) {
    return values => {
        const cleanValues = clean(values);
        if (!cleanValues) {
            return null;
        }
        let v;
        const sorted = cleanValues.slice().sort((a, b) => a - b);
        const size = sorted.length;
        if (q < 0 || q > 100) {
            throw new Error("Percentile q must be between 0 and 100");
        }
        const i = q / 100;
        const index = Math.floor((sorted.length - 1) * i);
        if (size === 1 || q === 0) {
            return sorted[0];
        }
        if (q === 100) {
            return sorted[size - 1];
        }
        if (index < size - 1) {
            const fraction = (size - 1) * i - index;
            const v0 = sorted[index];
            const v1 = sorted[index + 1];
            if (interp === InterpolationType.lower || fraction === 0) {
                v = v0;
            } else if (interp === InterpolationType.linear) {
                v = v0 + (v1 - v0) * fraction;
            } else if (interp === InterpolationType.higher) {
                v = v1;
            } else if (interp === InterpolationType.nearest) {
                v = fraction < 0.5 ? v0 : v1;
            } else if (interp === InterpolationType.midpoint) {
                v = (v0 + v1) / 2;
            }
        }
        return v;
    };
}
exports.filter = {
    keepMissing,
    ignoreMissing,
    zeroMissing,
    propagateMissing,
    noneIfEmpty
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnVuY3Rpb25zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2Z1bmN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7O0dBUUc7OztBQWtESCxvQkFjQztBQXFCRCxrQkFRQztBQXFCRCxrQkFlQztBQWFELGtCQVdDO0FBWUQsa0JBV0M7QUFXRCxzQkFRQztBQVlELHNCQVFDO0FBWUQsb0JBUUM7QUFjRCxnQ0FRQztBQU1ELHdCQWdCQztBQU1ELHNCQVdDO0FBK0JELGdDQWlEQztBQXRYRCw0QkFBNEI7QUFHNUIsaUNBQTBCO0FBRTFCLEVBQUU7QUFDRiwwREFBMEQ7QUFDMUQsRUFBRTtBQUVGOztHQUVHO0FBQ0gsTUFBTSxXQUFXLEdBQUcsQ0FBQyxNQUFnQixFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUM7QUFFakQ7O0dBRUc7QUFDSCxNQUFNLGFBQWEsR0FBRyxDQUFDLE1BQWdCLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBRXhFOztHQUVHO0FBQ0gsTUFBTSxXQUFXLEdBQUcsQ0FBQyxNQUFnQixFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFFckY7Ozs7OztHQU1HO0FBQ0gsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLE1BQWdCLEVBQUUsRUFBRSxDQUMxQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxLQUFLLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBRW5FOzs7R0FHRztBQUNILE1BQU0sV0FBVyxHQUFHLENBQUMsTUFBZ0IsRUFBRSxFQUFFLENB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
