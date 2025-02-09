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
exports.FillMethod = exports.AlignmentMethod = exports.Trigger = exports.TimeAlignment = void 0;
//
// Enums
//
/**
 * When relating a `TimeRange` to a `Time` this enum lets you specify where
 * in the `TimeRange` you mean:
 *  * `Begin`
 *  * `Middle`
 *  * `End`
 */
var TimeAlignment;
(function(TimeAlignment) {
    TimeAlignment[(TimeAlignment["Begin"] = 1)] = "Begin";
    TimeAlignment[(TimeAlignment["Middle"] = 2)] = "Middle";
    TimeAlignment[(TimeAlignment["End"] = 3)] = "End";
})(TimeAlignment || (exports.TimeAlignment = TimeAlignment = {}));
/**
 * Rate of emit from within a stream:
 *  * `perEvent` - an updated `Collection` is emitted on each new `Event`
 *  * `onDiscardedWindow` - an updated `Collection` is emitted whenever a window is no longer used
 */
var Trigger;
(function(Trigger) {
    Trigger[(Trigger["perEvent"] = 1)] = "perEvent";
    Trigger[(Trigger["onDiscardedWindow"] = 2)] = "onDiscardedWindow";
})(Trigger || (exports.Trigger = Trigger = {}));
/**
 * Method of interpolation used by the `align()` function:
 *  * `Hold` - Emits the last known good value at alignment boundaries
 *  * `Linear` - Emits linearly interpolated values at alignment boundaries
 */
var AlignmentMethod;
(function(AlignmentMethod) {
    AlignmentMethod[(AlignmentMethod["Hold"] = 1)] = "Hold";
    AlignmentMethod[(AlignmentMethod["Linear"] = 2)] = "Linear";
})(AlignmentMethod || (exports.AlignmentMethod = AlignmentMethod = {}));
/**
 * Method of filling used by the `fill()` function:
 *  * `Pad` - Fill with the previous value
 *  * `Linear` - Fill between the last value and the next value linearly
 *  * `Zero` - Fill with 0
 */
var FillMethod;
(function(FillMethod) {
    FillMethod[(FillMethod["Zero"] = 1)] = "Zero";
    FillMethod[(FillMethod["Pad"] = 2)] = "Pad";
    FillMethod[(FillMethod["Linear"] = 3)] = "Linear";
})(FillMethod || (exports.FillMethod = FillMethod = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvdHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7OztHQVFHOzs7QUE4QkgsRUFBRTtBQUNGLFFBQVE7QUFDUixFQUFFO0FBRUY7Ozs7OztHQU1HO0FBQ0gsSUFBWSxhQUlYO0FBSkQsV0FBWSxhQUFhO0lBQ3JCLG1EQUFTLENBQUE7SUFDVCxxREFBTSxDQUFBO0lBQ04sK0NBQUcsQ0FBQTtBQUNQLENBQUMsRUFKVyxhQUFhLDZCQUFiLGFBQWEsUUFJeEI7QUFFRDs7OztHQUlHO0FBQ0gsSUFBWSxPQUdYO0FBSEQsV0FBWSxPQUFPO0lBQ2YsNkNBQVksQ0FBQTtJQUNaLCtEQUFpQixDQUFBO0FBQ3JCLENBQUMsRUFIVyxPQUFPLHVCQUFQLE9BQU8sUUFHbEI7QUFFRDs7OztHQUlHO0FBQ0gsSUFBWSxlQUdYO0FBSEQsV0FBWSxlQUFlO0lBQ3ZCLHFEQUFRLENBQUE7SUFDUix5REFBTSxDQUFBO0FBQ1YsQ0FBQyxFQUhXLGVBQWUsK0JBQWYsZUFBZSxRQUcxQjtBQUVEOzs7OztHQUtHO0FBQ0gsSUFBWSxVQUlYO0FBSkQsV0FBWSxVQUFVO0lBQ2xCLDJDQUFRLENBQUE7SUFDUix5Q0FBRyxDQUFBO0lBQ0gsK0NBQU0sQ0FBQTtBQUNWLENBQUMsRUFKVyxVQUFVLDBCQUFWLFVBQVUsUUFJckIifQ==
