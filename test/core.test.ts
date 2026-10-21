import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildAddArgs,
  buildCommands,
  cmdQuote,
  collectSkills,
  formatCommand,
  groupBySource,
  resolveLesson,
  skillUsage,
  spawnSpec,
  UnknownLessonError,
} from '../src/core.js';
import type { Lesson } from '../src/lessons.js';

const names = (s: { name: string }[]) => s.map((x) => x.name);

function first<T>(xs: T[]): T {
  const [x] = xs;
  assert.ok(x !== undefined, 'expected a non-empty array');
  return x;
}

test('resolves ids and aliases forgivingly', () => {
  for (const i of ['l03', 'L3', '3', '03', 'lesson-03', 'Lesson03', ' l03 ']) {
    assert.equal(resolveLesson(i).id, 'l03', i);
  }
  assert.equal(resolveLesson('10').id, 'l10');
  assert.equal(resolveLesson('pre-work').id, 'prework');
  assert.equal(resolveLesson('PREWORK').id, 'prework');
  assert.equal(resolveLesson('Brownfield').id, 'brownfield');
  assert.equal(resolveLesson('discovery').id, 'discovery');
});

test('unknown id throws helpful error', () => {
  assert.throws(
    () => resolveLesson('l99'),
    (e: unknown) => {
      assert.ok(e instanceof UnknownLessonError);
      assert.match(e.message, /Valid lessons: prework, l01/);
      return true;
    },
  );
  assert.throws(() => resolveLesson('m1l3'), UnknownLessonError);
});

test('required skills only by default', () => {
  assert.deepEqual(names(collectSkills(['l04'])), [
    'om-discover',
    'om-backlog',
    'om-synthetic-users',
  ]);
});

test('--optional adds optional skills', () => {
  assert.deepEqual(names(collectSkills(['l04'], { optional: true })).slice(-1), [
    'om-setup-discovery-pipeline',
  ]);
});

test('cumulative includes earlier lessons, deduped, and skips extras', () => {
  const s = names(collectSkills(['l05'], { upto: true }));
  assert.deepEqual(s, [
    'om-setup-agent-pipeline',
    'om-prepare-issue',
    'om-auto-fix-issue',
    'om-code-review',
    'om-discover',
    'om-backlog',
    'om-synthetic-users',
    'om-spec-writing',
    'grill-me',
  ]);
  // brownfield is not pulled into a cumulative range of a later lesson
  assert.ok(
    !names(collectSkills(['l10'], { upto: true, optional: true })).includes(
      'om-auto-create-pr-loop',
    ),
  );
  // but named explicitly it works and --upto does not expand extras
  assert.deepEqual(names(collectSkills(['brownfield'], { upto: true })), [
    'om-setup-agent-pipeline',
  ]);
});

test('dedupes across multiple lessons', () => {
  const s = names(collectSkills(['l03', 'brownfield']));
  assert.equal(s.filter((n) => n === 'om-setup-agent-pipeline').length, 1);
});

test('groups by source', () => {
  const g = groupBySource(collectSkills(['l05']));
  assert.deepEqual(
    [...g],
    [
      ['open-mercato/skills', ['om-spec-writing']],
      ['mattpocock/skills', ['grill-me']],
    ],
  );
  assert.equal(buildCommands(collectSkills(['l05'])).length, 2);
});

test('empty lessons give no skills or commands', () => {
  for (const id of ['prework', 'l01', 'l02', 'l06', 'l08', 'l09', 'discovery']) {
    assert.deepEqual(collectSkills([id]), [], id);
  }
  assert.deepEqual(buildCommands([]), []);
});

test('builds args with passthrough flags', () => {
  assert.deepEqual(
    buildAddArgs('open-mercato/skills', ['a', 'b'], {
      global: true,
      agent: ['claude-code', 'codex'],
      yes: true,
    }),
    [
      'skills',
      'add',
      'open-mercato/skills',
      '--skill',
      'a',
      '--skill',
      'b',
      '--global',
      '--agent',
      'claude-code',
      '--agent',
      'codex',
      '--yes',
    ],
  );
  assert.deepEqual(buildAddArgs('x/y', ['a']), ['skills', 'add', 'x/y', '--skill', 'a']);
});

test('npx binary per platform and display format', () => {
  assert.equal(first(buildCommands(collectSkills(['l03']), {}, 'win32')).command, 'npx.cmd');
  const c = first(buildCommands(collectSkills(['l03']), { yes: true }, 'linux'));
  assert.equal(c.command, 'npx');
  assert.match(
    formatCommand(c),
    /^npx skills add open-mercato\/skills --skill om-setup-agent-pipeline .* --yes$/,
  );
});

test('spawn spec uses a shell only on Windows', () => {
  const cmd = first(buildCommands(collectSkills(['l03']), { agent: ['claude code'] }, 'win32'));
  const win = spawnSpec(cmd, 'win32');
  assert.equal(win.shell, true);
  assert.deepEqual(win.args, []);
  assert.match(
    win.command,
    /^npx\.cmd skills add open-mercato\/skills --skill om-setup-agent-pipeline .* --agent "claude code"$/,
  );
  const nix = spawnSpec(first(buildCommands(collectSkills(['l03']), {}, 'linux')), 'linux');
  assert.equal(nix.shell, false);
  assert.equal(nix.command, 'npx');
  assert.equal(nix.args[0], 'skills');
});

test('cmdQuote rejects cmd.exe metacharacters', () => {
  assert.equal(cmdQuote('open-mercato/skills'), 'open-mercato/skills');
  assert.equal(cmdQuote('a b'), '"a b"');
  for (const bad of ['a&b', 'a|b', '%PATH%', 'a"b', 'a^b', 'a>b'])
    assert.throws(() => cmdQuote(bad));
});

test('works with custom lesson data', () => {
  const custom: Lesson[] = [
    { id: 'a', aliases: ['x'], title: 'A', required: [{ name: 's' }], optional: [], notes: '' },
  ];
  assert.equal(resolveLesson('x', custom).id, 'a');
  assert.deepEqual(names(collectSkills(['a'], {}, custom)), ['s']);
});

test('skillUsage lists every skill with lessons', () => {
  const u = skillUsage();
  const sd = u.find((x) => x.skill.name === 'om-synthetic-users');
  assert.ok(sd);
  assert.deepEqual(sd.required, ['l04']);
  assert.deepEqual(sd.optional, ['l07']);
  const dedup = new Set(u.map((x) => x.skill.name));
  assert.equal(dedup.size, u.length);
});
