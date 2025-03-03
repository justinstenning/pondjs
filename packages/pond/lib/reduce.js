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
import { Processor } from "./processor";
/**
 * A `Processor` to take a rolling set of incoming `Event`s, a
 * Immutable.List<Event>, and reduce them down to a single output `Event`.
 * This enables different types of past dependent functions.
 *
 * To control the rate calculation you need to specify a `ReduceOptions` object
 * in the constuctor, which takes the following form:
 * ```
 * {
 *     count: number;
 *     accumulator: Event
 *     iteratee: ListReducer;
 * }
 * ```
 * Options:
 *  * `count` - The number of `Event`s to include on each call. The last `count`
 *              `Event`s are passed to the `reducer` function.
 *  * `accumulator` - optional initial value
 *  * `iteratee` - a function mapping an `Immutable.List<Event>` to an `Event`
 */
export class Reducer extends Processor {
    constructor(options) {
        super();
        const { count = 1, iteratee, accumulator } = options;
        this._count = count;
        this._iteratee = iteratee;
        this._previous = Immutable.List();
        this._accumulator = accumulator ? accumulator : null;
    }
    /**
     * Perform the reduce operation on the `Event` and emit.
     */
    addEvent(event) {
        this._previous = this._previous.push(event);
        if (this._previous.size > this._count) {
            this._previous = this._previous.shift();
        }
        this._accumulator = this._iteratee(this._accumulator, this._previous);
        return Immutable.List([this._accumulator]);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVkdWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3JlZHVjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7R0FRRztBQUVILE9BQU8sS0FBSyxTQUFTLE1BQU0sV0FBVyxDQUFDO0FBS3ZDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFJeEM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FtQkc7QUFDSCxNQUFNLE9BQU8sT0FBdUIsU0FBUSxTQUFlO0lBT3ZELFlBQVksT0FBeUI7UUFDakMsS0FBSyxFQUFFLENBQUM7UUFDUixNQUFNLEVBQUUsS0FBSyxHQUFHLENBQUMsRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLEdBQUcsT0FBTyxDQUFDO1FBQ3JELElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDO1FBQzFCLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLElBQUksRUFBWSxDQUFDO1FBQzVDLElBQUksQ0FBQyxZQUFZLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUN6RCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxRQUFRLENBQUMsS0FBZTtRQUNwQixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzVDLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3BDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUM1QyxDQUFDO1FBQ0QsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3RFLE9BQU8sU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0lBQy9DLENBQUM7Q0FDSiJ9
