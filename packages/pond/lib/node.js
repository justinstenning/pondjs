"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AggregationNode = exports.WindowOutputNode = exports.ReduceNode = exports.RateNode = exports.CollapseNode = exports.SelectNode = exports.AlignNode = exports.FillNode = exports.FilterNode = exports.FlatMapNode = exports.MapNode = exports.KeyedCollectionOutputNode = exports.EventOutputNode = exports.KeyedCollectionInputNode = exports.EventInputNode = exports.Node = void 0;
const Immutable = require("immutable");
const _ = require("lodash");
const event_1 = require("./event");
const index_1 = require("./index");
const align_1 = require("./align");
const collapse_1 = require("./collapse");
const fill_1 = require("./fill");
const rate_1 = require("./rate");
const reduce_1 = require("./reduce");
const select_1 = require("./select");
const windowedcollection_1 = require("./windowedcollection");
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
class Node {
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
exports.Node = Node;
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
class EventInputNode extends Node {
    constructor() {
        super();
        // pass
    }
    process(e) {
        return Immutable.List([e]);
    }
}
exports.EventInputNode = EventInputNode;
/**
 * @private
 *
 * A node which will be a top of the chain input node. It will accept `KeyedCollection`s
 * and pass them down the processing chain.
 */
// tslint:disable-next-line:max-classes-per-file
class KeyedCollectionInputNode extends Node {
    constructor() {
        super();
        // pass
    }
    process(e) {
        return Immutable.List([e]);
    }
}
exports.KeyedCollectionInputNode = KeyedCollectionInputNode;
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
class EventOutputNode extends Node {
    constructor(callback) {
        super();
        this.callback = callback;
    }
    process(e) {
        this.callback(e);
        return Immutable.List();
    }
}
exports.EventOutputNode = EventOutputNode;
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
class KeyedCollectionOutputNode extends Node {
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
exports.KeyedCollectionOutputNode = KeyedCollectionOutputNode;
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
class MapNode extends Node {
    constructor(mapper) {
        super();
        this.mapper = mapper;
    }
    process(e) {
        return Immutable.List([this.mapper(e)]);
    }
}
exports.MapNode = MapNode;
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
class FlatMapNode extends Node {
    constructor(mapper) {
        super();
        this.mapper = mapper;
    }
    process(e) {
        return this.mapper(e);
    }
}
exports.FlatMapNode = FlatMapNode;
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
class FilterNode extends Node {
    constructor(predicate) {
        super();
        this.predicate = predicate;
    }
    process(e) {
        return this.predicate(e) ? Immutable.List([e]) : Immutable.List([]);
    }
}
exports.FilterNode = FilterNode;
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
class FillNode extends Node {
    constructor(options) {
        super();
        this.processor = new fill_1.Fill(options);
    }
    process(e) {
        return this.processor.addEvent(e);
    }
}
exports.FillNode = FillNode;
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
class AlignNode extends Node {
    constructor(options) {
        super();
        this.processor = new align_1.Align(options);
    }
    process(e) {
        return this.processor.addEvent(e);
    }
}
exports.AlignNode = AlignNode;
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
class SelectNode extends Node {
    constructor(options) {
        super();
        this.processor = new select_1.Select(options);
    }
    process(e) {
        return this.processor.addEvent(e);
    }
}
exports.SelectNode = SelectNode;
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
class CollapseNode extends Node {
    constructor(options) {
        super();
        this.processor = new collapse_1.Collapse(options);
    }
    process(e) {
        return this.processor.addEvent(e);
    }
}
exports.CollapseNode = CollapseNode;
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
class RateNode extends Node {
    constructor(options) {
        super();
        this.processor = new rate_1.Rate(options);
    }
    process(e) {
        return this.processor.addEvent(e);
    }
}
exports.RateNode = RateNode;
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
class ReduceNode extends Node {
    constructor(options) {
        super();
        this.processor = new reduce_1.Reducer(options);
    }
    process(e) {
        return this.processor.addEvent(e);
    }
}
exports.ReduceNode = ReduceNode;
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
class WindowOutputNode extends Node {
    constructor(options) {
        super();
        this.processor = new windowedcollection_1.WindowedCollection(options);
    }
    process(e) {
        const keyedCollections = this.processor.addEvent(e);
        return keyedCollections;
    }
}
exports.WindowOutputNode = WindowOutputNode;
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
class AggregationNode extends Node {
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
        const indexedEvent = new event_1.Event((0, index_1.index)(windowKey), Immutable.fromJS(d));
        return Immutable.List([indexedEvent]);
    }
}
exports.AggregationNode = AggregationNode;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9ub2RlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHVDQUF1QztBQUN2Qyw0QkFBNEI7QUFHNUIsbUNBQWdDO0FBQ2hDLG1DQUF1QztBQUl2QyxtQ0FBZ0M7QUFDaEMseUNBQXNDO0FBQ3RDLGlDQUE4QjtBQUM5QixpQ0FBOEI7QUFDOUIscUNBQW1DO0FBQ25DLHFDQUFrQztBQUVsQyw2REFBMEQ7QUFpQjFEOzs7Ozs7Ozs7Ozs7O0dBYUc7QUFDSCxnREFBZ0Q7QUFDaEQsTUFBc0IsSUFBSTtJQUExQjtRQUNjLGNBQVMsR0FBRyxTQUFTLENBQUMsSUFBSSxFQUFpQixDQUFDO0lBc0IxRCxDQUFDO0lBcEJVLFdBQVcsQ0FBQyxJQUFtQjtRQUNsQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFFTSxHQUFHLENBQUMsS0FBUTtRQUNmLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEMsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNWLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDbkQsQ0FBQztJQUNMLENBQUM7SUFFUyxNQUFNLENBQUMsTUFBUztRQUN0QixJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUMxQixJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3JCLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQztJQUNMLENBQUM7Q0FHSjtBQXZCRCxvQkF1QkM7QUFFRCxF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
