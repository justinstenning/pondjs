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
 * A `Processor` which takes a `fieldSpec` and returns a new `Event`
 * with only those selected columns.
 */
export class Select extends Processor {
    constructor(options) {
        super();
        this.options = options;
    }
    addEvent(event) {
        return Immutable.List([event.select(this.options.fields)]);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3NlbGVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7R0FRRztBQUVILE9BQU8sS0FBSyxTQUFTLE1BQU0sV0FBVyxDQUFDO0FBS3ZDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFJeEM7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLE1BQXNCLFNBQVEsU0FBZTtJQUN0RCxZQUFvQixPQUFzQjtRQUN0QyxLQUFLLEVBQUUsQ0FBQztRQURRLFlBQU8sR0FBUCxPQUFPLENBQWU7SUFFMUMsQ0FBQztJQUNELFFBQVEsQ0FBQyxLQUFlO1FBQ3BCLE9BQU8sU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDL0QsQ0FBQztDQUNKIn0=
