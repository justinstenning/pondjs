/**
 *  Copyright (c) 2015-2017, The Regents of the University of California,
 *  through Lawrence Berkeley National Laboratory (subject to receipt
 *  of any required approvals from the U.S. Dept. of Energy).
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */

declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;

import * as Immutable from "immutable";
import moment from "moment";
import Moment = moment.Moment;

import { collection } from "../src/collection";
import { duration } from "../src/duration";
import { event } from "../src/event";
import { period } from "../src/period";
import { sortedCollection } from "../src/sortedcollection";
import { time } from "../src/time";

import { timeSeries } from "../src/timeseries";
import { AlignmentMethod, AlignmentOptions } from "../src/types";

const SIMPLE_GAP_DATA = [
    [1471824030000, 0.75], // 00:00:30
    [1471824105000, 2], // 00:01:45
    [1471824210000, 1], // 00:03:30
    [1471824390000, 1], // 00:06:30
    [1471824510000, 3], // 00:08:30
    [1471824525000, 5] // 00:08:45
];

const SIMPLE_GAP_DATA_BAD = [
    [1471824030000, 0.75], // Mon, 22 Aug 2016 00:00:30 GMT
    [1471824105000, 2], // Mon, 22 Aug 2016 00:01:45 GMT
    [1471824210000, 1], // Mon, 22 Aug 2016 00:03:30 GMT
    [1471824390000, 1], // Mon, 22 Aug 2016 00:06:30 GMT
    [1471824510000, "bob!"], // Mon, 22 Aug 2016 00:08:30 GMT
    [1471824525000, 5] // Mon, 22 Aug 2016 00:08:45 GMT
];

it("can do basic alignment using TimeSeries.align()", () => {
    const list = SIMPLE_GAP_DATA.map(e => {
        return event(time(e[0]), Immutable.Map({ value: e[1] }));
    });

    const c = sortedCollection(Immutable.List(list));
    const aligned = c.align({
        fieldSpec: "value",
        period: period().every(duration("1m")),
        method: AlignmentMethod.Linear
    });

    expect(aligned.size()).toBe(8);
    expect(aligned.at(0).get("value")).toBe(1.25);
    expect(aligned.at(1).get("value")).toBe(1.8571428571428572);
    expect(aligned.at(2).get("value")).toBe(1.2857142857142856);
    expect(aligned.at(3).get("value")).toBe(1.0);
    expect(aligned.at(4).get("value")).toBe(1.0);
    expect(aligned.at(5).get("value")).toBe(1.0);
    expect(aligned.at(6).get("value")).toBe(1.5);
    expect(aligned.at(7).get("value")).toBe(2.5);
});

it("can do basic hold alignment", () => {
    const list = SIMPLE_GAP_DATA.map(e => {
        return event(time(e[0]), Immutable.Map({ value: e[1] }));
    });

    const c = sortedCollection(Immutable.List(list));
    const aligned = c.align({
        fieldSpec: ["value"],
        period: period(duration("1m")),
        method: AlignmentMethod.Hold
    });

    expect(aligned.size()).toBe(8);
    expect(aligned.at(0).get("value")).toBe(0.75);
    expect(aligned.at(1).get("value")).toBe(2);
    expect(aligned.at(2).get("value")).toBe(2);
    expect(aligned.at(3).get("value")).toBe(1);
    expect(aligned.at(4).get("value")).toBe(1);
    expect(aligned.at(5).get("value")).toBe(1);
    expect(aligned.at(6).get("value")).toBe(1);
    expect(aligned.at(7).get("value")).toBe(1);
});

it("can do alignment on already align data", () => {
    const alignOptions: AlignmentOptions = {
        fieldSpec: ["value"],
        period: period(duration("30s")),
        method: AlignmentMethod.Linear,
        limit: 3
    };

    const ts = timeSeries({
        name: "aligned",
        tz: "Etc/UTC",
        columns: ["time", "value"],
        points: [
            [90000, 5],
            [120000, 10],
            [185000, 12]
        ]
    });

    const aligned = ts.align(alignOptions);

    expect(aligned.at(0).get("value")).toBe(5);
    expect(aligned.at(1).get("value")).toBe(10);
    expect(aligned.at(2).get("value")).toBe(10.923076923076923);
    expect(aligned.at(3).get("value")).toBe(11.846153846153847);
});
