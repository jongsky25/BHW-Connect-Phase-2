import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

// Only these new source references may extend the historical no-change audits.
// Pin the manifest too: changing its own figure hashes cannot authorize new bytes.
const additions = [
  ['content/training/day1-basic-competencies/manual-references/chapter1.json', 'ecc13635a7ea05ce19a7729a2fe5c4c743377c5a5efffe38228d64869c337299'],
  ['public/training/manual-2022/communication-questions-4f91035253d7.png', '4f91035253d7c8defcd778f362970d0ff2fba8b85cf2d74ea773c3eb84b8147c'],
  ['public/training/manual-2022/five-whys-7ff5ccc5cc17.png', '7ff5ccc5cc172b54f872516d1da67c7af886290c4a26f22a9514a777f8292741'],
  ['public/training/manual-2022/priority-table-240812e8b826.png', '240812e8b826f97495918290e5a3ab9f3c90dfd991968bfa0e7efd89005ba13c'],
  ['public/training/manual-2022/safety-table-1-8008b60af5c8.png', '8008b60af5c8dc400d6f519695c4d90d87cdf55fd6e3e415e26fe696fe35e91d'],
  ['public/training/manual-2022/safety-table-2-03e7ebfea21f.png', '03e7ebfea21fe5a7d17e2140168253d1f875dc056b5cefc02d8acece39efd969'],
];

export function chapter1ManualReferenceExclusions() {
  return additions.map(([path, expected]) => {
    const actual = createHash('sha256').update(readFileSync(path)).digest('hex');
    assert.equal(actual, expected, 'Chapter 1 manual reference drift: ' + path);
    return ':(exclude)' + path;
  });
}
