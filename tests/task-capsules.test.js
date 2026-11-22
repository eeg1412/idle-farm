import test from 'node:test';
import assert from 'node:assert/strict';
import {
  claimTaskCapsules, objectives, settleTaskRewards, taskCapsuleRewards, taskCapsuleRewardTotal,
} from '../src/game/objectives.js';
import { newWorld } from '../src/game/world.js';

function settledWorld() {
  const world = newWorld(0);
  settleTaskRewards(world);
  world.capsules = 0n;
  world.pendingTaskCapsules = 0n;
  return world;
}

test('task capsule table matches spec 10.6 and every id is a real task', () => {
  assert.equal(taskCapsuleRewardTotal, 186_100n);
  assert.equal(Object.values(taskCapsuleRewards).reduce((sum, value) => sum + value, 0n), 186_100n);
  assert.ok(Object.isFrozen(taskCapsuleRewards));
  const { guide, long } = objectives({ ...newWorld(0), stats: { ...newWorld(0).stats, sold: 1n } });
  const ids = new Set([...guide, ...long].map((task) => task.id));
  for (const id of Object.keys(taskCapsuleRewards)) assert.ok(ids.has(id), id);
  for (const task of [...guide, ...long]) assert.equal(task.rewardCapsules, taskCapsuleRewards[task.id] ?? 0n);
});

test('a newly receipted task grants its capsules in the same settlement', () => {
  const world = settledWorld();
  world.stats.sold = 1n;
  const result = settleTaskRewards(world);
  assert.deepEqual(result.ids, ['firstSale']);
  assert.equal(result.capsules, 300n);
  assert.equal(result.capsuleOverflow, 0n);
  assert.equal(world.capsules, 300n);
  assert.equal(world.pendingTaskCapsules, 0n);
});

test('tasks without a capsule reward grant none', () => {
  const world = settledWorld();
  world.stats.plots = 1n;
  const result = settleTaskRewards(world);
  assert.deepEqual(result.ids, ['firstPlot']);
  assert.equal(result.capsules, 0n);
  assert.equal(result.capsuleOverflow, 0n);
  assert.equal(world.capsules, 0n);
});

test('overflow waits as pending and claims fill only up to the cap', () => {
  const world = settledWorld();
  world.capsules = 143_900n;
  world.stats.sold = 1n;
  const result = settleTaskRewards(world);
  assert.equal(result.capsules, 100n);
  assert.equal(result.capsuleOverflow, 200n);
  assert.equal(world.capsules, 144_000n);
  assert.equal(world.pendingTaskCapsules, 200n);

  assert.deepEqual(claimTaskCapsules(world), { added: 0n, remaining: 200n });
  world.capsules = 143_950n;
  assert.deepEqual(claimTaskCapsules(world), { added: 50n, remaining: 150n });
  assert.equal(world.capsules, 144_000n);
  world.capsules = 0n;
  assert.deepEqual(claimTaskCapsules(world), { added: 150n, remaining: 0n });
  assert.equal(world.capsules, 150n);
  assert.equal(world.pendingTaskCapsules, 0n);
  assert.equal(claimTaskCapsules(world), false);
});

test('missing pending field claims nothing', () => {
  const world = settledWorld();
  delete world.pendingTaskCapsules;
  assert.equal(claimTaskCapsules(world), false);
});

test('receipts issued before the update are not re-granted', () => {
  const world = settledWorld();
  world.taskRewards = [...world.taskRewards, 'firstSale'];
  world.stats.sold = 1n;
  world.stats.plots = 1n;
  const result = settleTaskRewards(world);
  assert.deepEqual(result.ids, ['firstPlot']);
  assert.equal(result.capsules, 0n);
  assert.equal(world.capsules, 0n);
  assert.equal(world.pendingTaskCapsules, 0n);
});
