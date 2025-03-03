/**
 *  Copyright (c) 2016-2017, The Regents of the University of California,
 *  through Lawrence Berkeley National Laboratory (subject to receipt
 *  of any required approvals from the U.S. Dept. of Energy).
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */
import * as Immutable from "immutable";
import * as _ from "lodash";
import { Event } from "./event";
import { Processor } from "./processor";
import { timerange } from "./timerange";
import util from "./util";
/**
 * A `Processor` to take the derivative of the incoming `Event`s
 * for the given fields. The resulting output `Event`s will contain
 * per second values.
 *
 * Optionally you can substitute in `null` values if the rate is negative.
 * This is useful when a negative rate would be considered invalid like an
 * ever increasing counter.
 *
 * To control the rate calculation you need to specify a `RateOptions` object
 * in the constuctor, which takes the following form:
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
export class Rate extends Processor {
    constructor(options) {
        super();
        const { fieldSpec, allowNegative = false } = options;
        // Options
        this.fieldSpec = _.isString(fieldSpec) ? [fieldSpec] : fieldSpec;
        this.allowNegative = allowNegative;
        // Previous event
        this.previous = null;
    }
    /**
     * Perform the rate operation on the `Event` and the the `_previous`
     * `Event` and emit the result.
     */
    addEvent(event) {
        const eventList = new Array();
        if (!this.previous) {
            this.previous = event;
            return Immutable.List();
        }
        const rate = this.getRate(event);
        if (rate) {
            eventList.push(rate);
        }
        this.previous = event;
        return Immutable.List(eventList);
    }
    /**
     * Generate a new `TimeRangeEvent` containing the rate per second
     * between two events.
     */
    getRate(event) {
        let d = Immutable.Map();
        const previousTime = this.previous.timestamp().getTime();
        const currentTime = event.timestamp().getTime();
        const deltaTime = (currentTime - previousTime) / 1000;
        this.fieldSpec.forEach(path => {
            const fieldPath = util.fieldAsArray(path);
            const ratePath = fieldPath.slice();
            ratePath[ratePath.length - 1] += "_rate";
            const previousVal = this.previous.get(fieldPath);
            const currentVal = event.get(fieldPath);
            let rate = null;
            if (_.isNumber(currentVal) && _.isNumber(previousVal)) {
                // Calculate the rate
                rate = (currentVal - previousVal) / deltaTime;
            } else if (
                (previousVal !== null && !_.isNumber(previousVal)) ||
                (currentVal !== null && !_.isNumber(currentVal))
            ) {
                // Only issue warning if the current or previous values are bad
                // i.e. not a number or not null (null values result in null output)
                console.warn(`Event field "${fieldPath}" is a non-numeric or non-null value`);
            }
            d =
                this.allowNegative === false && rate < 0
                    ? (d = d.setIn(ratePath, null)) // don't allow negative differentials in certain cases
                    : (d = d.setIn(ratePath, rate));
        });
        return new Event(timerange(previousTime, currentTime), d);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmF0ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9yYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7OztHQVFHO0FBRUgsT0FBTyxLQUFLLFNBQVMsTUFBTSxXQUFXLENBQUM7QUFDdkMsT0FBTyxLQUFLLENBQUMsTUFBTSxRQUFRLENBQUM7QUFFNUIsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUVoQyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ3hDLE9BQU8sRUFBYSxTQUFTLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDbkQsT0FBTyxJQUFJLE1BQU0sUUFBUSxDQUFDO0FBSTFCOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQW9CRztBQUNILE1BQU0sT0FBTyxJQUFvQixTQUFRLFNBQXVCO0lBTzVELFlBQVksT0FBb0I7UUFDNUIsS0FBSyxFQUFFLENBQUM7UUFDUixNQUFNLEVBQUUsU0FBUyxFQUFFLGFBQWEsR0FBRyxLQUFLLEVBQUUsR0FBRyxPQUFPLENBQUM7UUFFckQsVUFBVTtRQUNWLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQ2pFLElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFDO1FBRW5DLGlCQUFpQjtRQUNqQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztJQUN6QixDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksUUFBUSxDQUFDLEtBQWU7UUFDM0IsTUFBTSxTQUFTLEdBQUcsSUFBSSxLQUFLLEVBQW9CLENBQUM7UUFFaEQsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNqQixJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQztZQUN0QixPQUFPLFNBQVMsQ0FBQyxJQUFJLEVBQW9C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
