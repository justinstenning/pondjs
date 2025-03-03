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
 * A processor which takes a fieldSpec and returns a new event
 * with a new column that is a collapsed result of the selected
 * columns. To collapse the columns it uses the supplied reducer
 * function. Optionally the new column can completely replace
 * the existing columns in the event.
 */
export class Collapse extends Processor {
    constructor(options) {
        super();
        this.options = options;
    }
    addEvent(event) {
        return Immutable.List([
            event.collapse(
                this.options.fieldSpecList,
                this.options.fieldName,
                this.options.reducer,
                this.options.append
            )
        ]);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGFwc2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvY29sbGFwc2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7O0dBUUc7QUFFSCxPQUFPLEtBQUssU0FBUyxNQUFNLFdBQVcsQ0FBQztBQUt2QyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBSXhDOzs7Ozs7R0FNRztBQUNILE1BQU0sT0FBTyxRQUF3QixTQUFRLFNBQWU7SUFDeEQsWUFBb0IsT0FBd0I7UUFDeEMsS0FBSyxFQUFFLENBQUM7UUFEUSxZQUFPLEdBQVAsT0FBTyxDQUFpQjtJQUU1QyxDQUFDO0lBQ0QsUUFBUSxDQUFDLEtBQWU7UUFDcEIsT0FBTyxTQUFTLENBQUMsSUFBSSxDQUFDO1lBQ2xCLEtBQUssQ0FBQyxRQUFRLENBQ1YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQzFCLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUN0QixJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFDcEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQ3RCO1NBQ0osQ0FBQyxDQUFDO0lBQ1AsQ0FBQztDQUNKIn0=
