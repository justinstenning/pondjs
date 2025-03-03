import * as Immutable from "immutable";
import * as _ from "lodash";
import { Event } from "./event";
import { index } from "./index";
import { Align } from "./align";
import { Collapse } from "./collapse";
import { Fill } from "./fill";
import { Rate } from "./rate";
import { Reducer } from "./reduce";
import { Select } from "./select";
import { WindowedCollection } from "./windowedcollection";
/**
 * @private
 *
 * A Node is a transformation between type S and type T. Both S
 * and T much extend Base.
 *
 * The transformation happens when a `Node` has its `set()` method called
 * by another `Node`. The `input` to set() is of type `S`. When this happens
 * a subclass specific implementation of `process` is called to actually
 * transform the input (of type `S` to an output of type `T`). Of course
 * `S` and `T` maybe the same if the input and output types are expected
 * to be the same. The result of `process`, of type `T`, is returned and
 * the passed onto other downstream Nodes, by calling their `set()` methods.
 */
// tslint:disable-next-line:max-classes-per-file
export class Node {
    constructor() {
        this.observers = Immutable.List();
    }
    addObserver(node) {
        this.observers = this.observers.push(node);
    }
    set(input) {
        const outputs = this.process(input);
        if (outputs) {
            outputs.forEach(output => this.notify(output));
        }
    }
    notify(output) {
        if (this.observers.size > 0) {
            this.observers.forEach(node => {
                node.set(output);
            });
        }
    }
}
//
// Nodes
//
/**
 * @private
 *
 * A node which will be at the top of the chain input node. It will accept `Event`s
 * and pass them down the processing chain.
 */
// tslint:disable-next-line:max-classes-per-file
export class EventInputNode extends Node {
    constructor() {
        super();
        // pass
    }
    process(e) {
        return Immutable.List([e]);
    }
}
/**
 * @private
 *
 * A node which will be a top of the chain input node. It will accept `KeyedCollection`s
 * and pass them down the processing chain.
 */
// tslint:disable-next-line:max-classes-per-file
export class KeyedCollectionInputNode extends Node {
    constructor() {
        super();
        // pass
    }
    process(e) {
        return Immutable.List([e]);
    }
}
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
export class EventOutputNode extends Node {
    constructor(callback) {
        super();
        this.callback = callback;
    }
    process(e) {
        this.callback(e);
        return Immutable.List();
    }
}
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
export class KeyedCollectionOutputNode extends Node {
    constructor(callback) {
        super();
        this.callback = callback;
    }
    process(keyedCollection) {
        const [key, collection] = keyedCollection;
        this.callback(collection, key);
        return Immutable.List();
    }
}
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
export class MapNode extends Node {
    constructor(mapper) {
        super();
        this.mapper = mapper;
    }
    process(e) {
        return Immutable.List([this.mapper(e)]);
    }
}
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
export class FlatMapNode extends Node {
    constructor(mapper) {
        super();
        this.mapper = mapper;
    }
    process(e) {
        return this.mapper(e);
    }
}
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
export class FilterNode extends Node {
    constructor(predicate) {
        super();
        this.predicate = predicate;
    }
    process(e) {
        return this.predicate(e) ? Immutable.List([e]) : Immutable.List([]);
    }
}
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
export class FillNode extends Node {
    constructor(options) {
        super();
        this.processor = new Fill(options);
    }
    process(e) {
        return this.processor.addEvent(e);
    }
}
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
export class AlignNode extends Node {
    constructor(options) {
        super();
        this.processor = new Align(options);
    }
    process(e) {
        return this.processor.addEvent(e);
    }
}
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
export class SelectNode extends Node {
    constructor(options) {
        super();
        this.processor = new Select(options);
    }
    process(e) {
        return this.processor.addEvent(e);
    }
}
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
export class CollapseNode extends Node {
    constructor(options) {
        super();
        this.processor = new Collapse(options);
    }
    process(e) {
        return this.processor.addEvent(e);
    }
}
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
export class RateNode extends Node {
    constructor(options) {
        super();
        this.processor = new Rate(options);
    }
    process(e) {
        return this.processor.addEvent(e);
    }
}
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
export class ReduceNode extends Node {
    constructor(options) {
        super();
        this.processor = new Reducer(options);
    }
    process(e) {
        return this.processor.addEvent(e);
    }
}
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
export class WindowOutputNode extends Node {
    constructor(options) {
        super();
        this.processor = new WindowedCollection(options);
    }
    process(e) {
        const keyedCollections = this.processor.addEvent(e);
        return keyedCollections;
    }
}
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
export class AggregationNode extends Node {
    constructor(aggregationSpec) {
        super();
        this.aggregationSpec = aggregationSpec;
    }
    process(keyedCollection) {
        const [group, collection] = keyedCollection;
        const d = {};
        const [groupKey, windowKey] =
            group.split("::").length === 2 ? group.split("::") : [null, group];
        _.forEach(this.aggregationSpec, (src, dest) => {
            const [srcField, reducer] = src;
            d[dest] = collection.aggregate(reducer, srcField);
        });
        const indexedEvent = new Event(index(windowKey), Immutable.fromJS(d));
        return Immutable.List([indexedEvent]);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9ub2RlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxTQUFTLE1BQU0sV0FBVyxDQUFDO0FBQ3ZDLE9BQU8sS0FBSyxDQUFDLE1BQU0sUUFBUSxDQUFDO0FBRzVCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFDaEMsT0FBTyxFQUFTLEtBQUssRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUl2QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQ2hDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDdEMsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUM5QixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQzlCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDbkMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUVsQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQWlCMUQ7Ozs7Ozs7Ozs7Ozs7R0FhRztBQUNILGdEQUFnRDtBQUNoRCxNQUFNLE9BQWdCLElBQUk7SUFBMUI7UUFDYyxjQUFTLEdBQUcsU0FBUyxDQUFDLElBQUksRUFBaUIsQ0FBQztJQXNCMUQsQ0FBQztJQXBCVSxXQUFXLENBQUMsSUFBbUI7UUFDbEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRU0sR0FBRyxDQUFDLEtBQVE7UUFDZixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BDLElBQUksT0FBTyxFQUFFLENBQUM7WUFDVixPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxF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
