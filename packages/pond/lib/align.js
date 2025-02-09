"use strict";
/**
 *  Copyright (c) 2016-2017, The Regents of the University of California,
 *  through Lawrence Berkeley National Laboratory (subject to receipt
 *  of any required approvals from the U.S. Dept. of Energy).
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Align = void 0;
const Immutable = require("immutable");
const _ = require("lodash");
const event_1 = require("./event");
const processor_1 = require("./processor");
const time_1 = require("./time");
const timerange_1 = require("./timerange");
const types_1 = require("./types");
/**
 * A `Processor` that is used to align `Event`s into bins of regular time period, using a
 * `Period` object to define those bins.
 *
 * This processor is useful if you have a series of  data that you want to force into a
 * period. We use this processor to take near 30 second measurements and align them to
 * exactly 30 second intervals. This enables us to later take aggregations of multiple
 * series like this knowing that points will align with each other.
 *
 * A `Processor` is typically used internally to map `Event` data.
 * For more typical use, see:
 *  * `EventStream.align()`
 *  * `TimeSeries.align()`
 *  * `Collection.align()`
 */
class Align extends processor_1.Processor {
    /**
     * ```
     * const p = new Align<T>({
     *     fieldSpec: "value",
     *     period: period().every(duration("1m")),
     *     method: AlignmentMethod.Linear
     * });
     * ```
     * Options:
     *  * `fieldSpec` is the `Event` field or fields that should be aligned
     *  * `period` is the `Period` of the alignment (see `Period`)
     *  * `method` maybe `AlignmentMethod.Linear` or `AlignmentMethod.Hold`
     */
    constructor(options) {
        super();
        const { fieldSpec, period, method = types_1.AlignmentMethod.Hold, limit = null } = options;
        this._fieldSpec = _.isString(fieldSpec) ? [fieldSpec] : fieldSpec;
        this._method = method;
        this._limit = limit;
        this._period = period;
        // Previous event
        this._previous = null;
    }
    /**
     * Perform the align operation on the event and return an `Immutable.List` of
     * `Event`s of type `T`. The returned `Event`s are those interpolated between
     * the last `Event` and this one using the `AlignmentMethod` supplied in the
     * constructor.
     */
    addEvent(event) {
        if (!(event.getKey() instanceof time_1.Time)) {
            throw new Error("The key of aligned events must be a Time");
        }
        const eventList = new Array();
        if (!this._previous) {
            this._previous = event;
            if (this.isAligned(event)) {
                eventList.push(event);
            }
            return Immutable.List();
        }
        const boundaries = this.getBoundaries(event);
        boundaries.forEach(boundaryTime => {
            let outputEvent;
            if (this._limit && boundaries.size > this._limit) {
                outputEvent = this.interpolateHold(boundaryTime, true);
            } else {
                switch (this._method) {
                    case types_1.AlignmentMethod.Linear:
                        outputEvent = this.interpolateLinear(boundaryTime, event);
                        break;
                    case types_1.AlignmentMethod.Hold:
                        outputEvent = this.interpolateHold(boundaryTime);
                        break;
                    default:
                        throw new Error("Unknown AlignmentMethod");
                }
            }
            eventList.push(outputEvent);
        });
        this._previous = event;
        return Immutable.List(eventList);
    }
    /**
     * Test to see if an event is perfectly aligned. Used on first event.
     */
    isAligned(event) {
        return this._period.isAligned((0, time_1.time)(event.timestamp()));
    }
    /**
     * Returns a list of indexes of window boundaries if the current
     * event and the previous event do not lie in the same window. If
     * they are in the same window, return an empty list.
     */
    getBoundaries(event) {
        if (+this._previous.timestamp() === +event.timestamp()) {
            return Immutable.List([]);
        }
        const range = (0, timerange_1.timerange)(this._previous.timestamp(), event.timestamp());
        return this._period.within(range);
    }
    /**
     * Generate a new event on the requested boundary and carry over the
     * value from the previous event.
     *
     * A variation just sets the values to null, this is used when the
     * limit is hit.
     */
    interpolateHold(boundaryTime, setNone = false) {
        let d = Immutable.Map();
        this._fieldSpec.forEach(fieldPath => {
            const value = setNone ? null : this._previous.get(fieldPath);
            d = _.isString(fieldPath) ? d.set(fieldPath, value) : d.setIn(fieldPath, value);
        });
        return new event_1.Event(boundaryTime, d);
    }
    /**
     * Generate a linear differential between two counter values that lie
     * on either side of a window boundary.
     */
    interpolateLinear(boundaryTime, event) {
        let d = Immutable.Map();
        const previousTime = this._previous.timestamp().getTime();
        const currentTime = event.timestamp().getTime();
        // This ratio will be the same for all values being processed
        const f = (+boundaryTime - previousTime) / (currentTime - previousTime);
        this._fieldSpec.forEach(fieldPath => {
            //
            // Generate the delta beteen the values and
            // bulletproof against non-numeric or bad paths
            //
            const previousVal = this._previous.get(fieldPath);
            const currentVal = event.get(fieldPath);
            let interpolatedVal = null;
            if (!_.isNumber(previousVal) || !_.isNumber(currentVal)) {
                // tslint:disable-next-line
                console.warn(`Path ${fieldPath} contains a non-numeric value or does not exist`);
            } else {
                interpolatedVal = previousVal + f * (currentVal - previousVal);
            }
            d = _.isString(fieldPath)
                ? d.set(fieldPath, interpolatedVal)
                : d.setIn(fieldPath, interpolatedVal);
        });
        return new event_1.Event(boundaryTime, d);
    }
}
exports.Align = Align;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxpZ24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvYWxpZ24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7OztHQVFHOzs7QUFFSCx1Q0FBdUM7QUFDdkMsNEJBQTRCO0FBRTVCLG1DQUFnQztBQUdoQywyQ0FBd0M7QUFDeEMsaUNBQW9DO0FBQ3BDLDJDQUF3QztBQUV4QyxtQ0FBNEQ7QUFFNUQ7Ozs7Ozs7Ozs7Ozs7O0dBY0c7QUFDSCxNQUFhLEtBQXFCLFNBQVEscUJBQWU7SUFPckQ7Ozs7Ozs7Ozs7OztPQVlHO0lBQ0gsWUFBWSxPQUF5QjtRQUNqQyxLQUFLLEVBQUUsQ0FBQztRQUVSLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLE1BQU0sR0FBRyx1QkFBZSxDQUFDLElBQUksRUFBRSxLQUFLLEdBQUcsSUFBSSxFQUFFLEdBQUcsT0FBTyxDQUFDO1FBQ25GLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQ2xFLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO1FBQ3RCLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO1FBRXRCLGlCQUFpQjtRQUNqQixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztJQUMxQixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSSxRQUFRLENBQUMsS0FBZTtRQUMzQixJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLFlBQVksV0FBSSxDQUFDLEVBQUUsQ0FBQztZQUNwQyxNQUFNLElBQUksS0FBSyxDQUFDLDBDQUEwQyxDQUFDLENBQUM7UUFDaEUsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFHLElBQUksS0FBSyxFQUFZLENBQUM7UUFFeEMs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
