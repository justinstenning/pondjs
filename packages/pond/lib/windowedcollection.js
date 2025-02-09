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
exports.WindowedCollection = void 0;
exports.windowed = windowFactory;
const Immutable = require("immutable");
const _ = require("lodash");
const base_1 = require("./base");
const event_1 = require("./event");
const groupedcollection_1 = require("./groupedcollection");
const index_1 = require("./index");
const sortedcollection_1 = require("./sortedcollection");
const time_1 = require("./time");
const util_1 = require("./util");
const types_1 = require("./types");
/**
 * A map of `SortedCollection`s indexed by a string key representing a window.
 */
class WindowedCollection extends base_1.Base {
    constructor(arg1, arg2, arg3) {
        super();
        if (Immutable.Map.isMap(arg1)) {
            this.collections = arg1;
        } else {
            this.options = arg1;
            if (Immutable.Map.isMap(arg2)) {
                const collections = arg2;
                // Rekey all the events in the collections with a new key that
                // combines their existing group with the windows they fall in.
                // An event could fall into 0, 1 or many windows, depending on the
                // window's period and duration, as supplied in the `WindowOptions`.
                let remapped = Immutable.List();
                collections.forEach((c, k) => {
                    c.forEach(e => {
                        const groups = this.options.window
                            .getIndexSet((0, time_1.time)(e.timestamp()))
                            .toList();
                        groups.forEach(g => {
                            remapped = remapped.push([`${k}::${g.asString()}`, e]);
                        });
                    });
                });
                this.collections = remapped
                    .groupBy(e => e[0])
                    .map(eventList => eventList.map(kv => kv[1]))
                    .map(eventList => new sortedcollection_1.SortedCollection(eventList.toList()))
                    .toMap();
            } else {
                let collection;
                if (_.isString(arg2) || _.isArray(arg2)) {
                    this.group = util_1.default.fieldAsArray(arg2);
                    collection = arg3;
                } else {
                    collection = arg2;
                }
                if (collection) {
                    throw new Error("Unimplemented");
                } else {
                    this.collections = Immutable.Map();
                }
            }
        }
    }
    /**
     * Fetch the `SortedCollection` of `Event`s contained in the windowed grouping
     */
    get(key) {
        return this.collections.get(key);
    }
    /**
     * Example:
     * ```
     * const rolledUp = collection
     *   .groupBy("team")
     *   .window(period("30m"))
     *   .aggregate({
     *       team: ["team", keep()],
     *       total: [ "score", sum() ],
     *   });
     * ```
     */
    aggregate(aggregationSpec) {
        let eventMap = Immutable.Map();
        this.collections.forEach((collection, group) => {
            const d = {};
            const [groupKey, windowKey] = group.split("::");
            _.forEach(aggregationSpec, (src, dest) => {
                const [srcField, reducer] = src;
                d[dest] = collection.aggregate(reducer, srcField);
            });
            const eventKey = (0, index_1.index)(windowKey);
            const indexedEvent = new event_1.Event(eventKey, Immutable.fromJS(d));
            if (!eventMap.has(groupKey)) {
                eventMap = eventMap.set(groupKey, Immutable.List());
            }
            eventMap = eventMap.set(groupKey, eventMap.get(groupKey).push(indexedEvent));
        });
        const mapping = eventMap.map(
            eventList => new sortedcollection_1.SortedCollection(eventList)
        );
        return new groupedcollection_1.GroupedCollection(mapping);
    }
    /**
     * Collects all `Event`s from the groupings and returns them placed
     * into a single `SortedCollection`.
     */
    flatten() {
        let events = Immutable.List();
        this.collections.flatten().forEach(collection => {
            events = events.concat(collection.eventList());
        });
        return new sortedcollection_1.SortedCollection(events);
    }
    /**
     * Removes any grouping present, returning an Immutable.Map
     * mapping just the window to the `SortedCollection`.
     */
    ungroup() {
        const result = Immutable.Map();
        this.collections.forEach((collection, key) => {
            const newKey = key.split("::")[1];
            result[newKey] = collection;
        });
        return result;
    }
    addEvent(event) {
        let toBeEmitted = Immutable.List();
        const discardWindows = true;
        const emitOnDiscard = this.options.trigger === types_1.Trigger.onDiscardedWindow;
        const emitEveryEvent = this.options.trigger === types_1.Trigger.perEvent;
        const keys = this.getEventGroups(event);
        // Add event to an existing collection(s) or a new collection(s)
        keys.forEach(key => {
            // Add event to collection referenced by this key
            let targetCollection;
            let createdCollection = false;
            if (this.collections.has(key)) {
                targetCollection = this.collections.get(key);
            } else {
                targetCollection = new sortedcollection_1.SortedCollection(Immutable.List());
                createdCollection = true;
            }
            this.collections = this.collections.set(key, targetCollection.addEvent(event));
            // Push onto the emit list
            if (emitEveryEvent) {
                toBeEmitted = toBeEmitted.push([key, this.collections.get(key)]);
            }
        });
        // Discard past collections
        let keep = Immutable.Map();
        let discard = Immutable.Map();
        this.collections.forEach((collection, collectionKey) => {
            const [__, windowKey] =
                collectionKey.split("::").length > 1
                    ? collectionKey.split("::")
                    : [null, collectionKey];
            if (+event.timestamp() < +util_1.default.timeRangeFromIndexString(windowKey).end()) {
                keep = keep.set(collectionKey, collection);
            } else {
                discard = discard.set(collectionKey, collection);
            }
        });
        if (emitOnDiscard) {
            discard.forEach((collection, collectionKey) => {
                toBeEmitted = toBeEmitted.push([collectionKey, collection]);
            });
        }
        this.collections = keep;
        return toBeEmitted;
    }
    getEventGroups(event) {
        // Window the data
        const windowKeyList = this.options.window
            .getIndexSet((0, time_1.time)(event.timestamp()))
            .toList();
        let fn;
        // Group the data
        if (this.group) {
            if (_.isFunction(this.group)) {
                fn = this.group;
            } else {
                const fieldSpec = this.group;
                const fs = util_1.default.fieldAsArray(fieldSpec);
                fn = e => e.get(fs);
            }
        }
        const groupKey = fn ? fn(event) : null;
        return windowKeyList.map(windowKey =>
            groupKey ? `${groupKey}::${windowKey}` : `${windowKey}`
        );
    }
}
exports.WindowedCollection = WindowedCollection;
function windowFactory(arg1, arg2) {
    return new WindowedCollection(arg1, arg2);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93ZWRjb2xsZWN0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3dpbmRvd2VkY29sbGVjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7O0dBUUc7OztBQXdSdUIsaUNBQVE7QUF0UmxDLHVDQUF1QztBQUN2Qyw0QkFBNEI7QUFFNUIsaUNBQThCO0FBQzlCLG1DQUFnQztBQUNoQywyREFBMEU7QUFDMUUsbUNBQXVDO0FBRXZDLHlEQUFzRDtBQUN0RCxpQ0FBOEI7QUFDOUIsaUNBQTBCO0FBRTFCLG1DQU1pQjtBQWVqQjs7R0FFRztBQUNILE1BQWEsa0JBQWtDLFNBQVEsV0FBSTtJQXNDdkQsWUFBWSxJQUFTLEVBQUUsSUFBVSxFQUFFLElBQVU7UUFDekMsS0FBSyxFQUFFLENBQUM7UUFDUixJQUFJLFNBQVMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDNUIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFrQyxDQUFDO1FBQzFELENBQUM7YUFBTSxDQUFDO1lBQ0osSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUF3QixDQUFDO1lBRXhDLElBQUksU0FBUyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDNUIsTUFBTSxXQUFXLEdBQUcsSUFBa0QsQ0FBQztnQkFFdkUsOERBQThEO2dCQUM5RCwrREFBK0Q7Z0JBQy9ELGtFQUFrRTtnQkFDbEUsb0VBQW9FO2dCQUNwRSxJQUFJLFFBQVEsR0FBRyxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ2hDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7b0JBQ3pCLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7d0JBQ1YsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNOzZCQUM3QixXQUFXLENBQUMs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
