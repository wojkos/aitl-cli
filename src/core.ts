/** Pure logic: lesson resolution, skill set computation, command building. */
import { DEFAULT_SOURCE, LESSONS, type Lesson, type SkillRef } from './lessons.js';

export class UnknownLessonError extends Error {
  constructor(public readonly input: string, validIds: string[]) {
    super(
      `Unknown lesson "${input}". Valid lessons: ${validIds.join(', ')} ` +
        `(also accepted: 3, 03, l3, lesson-03).`,
    );
    this.name = 'UnknownLessonError';
  }
}

export function skillSource(skill: SkillRef): string {
  return skill.source ?? DEFAULT_SOURCE;
}

/** Normalizes forms like "3", "03", "l3", "L03", "lesson-03", "lesson03" to "l03". */
function normalize(input: string): string {
  const s = input.trim().toLowerCase();
  const m = /^(?:lesson[-_ ]?|l)?0*(\d{1,2})$/.exec(s);
  if (m) return `l${m[1]!.padStart(2, '0')}`;
  return s;
}

export function resolveLesson(input: string, lessons: Lesson[] = LESSONS): Lesson {
  const key = normalize(input);
  const found = lessons.find(
    (l) => l.id === key || l.aliases.some((a) => a.toLowerCase() === key),
  );
  if (!found) throw new UnknownLessonError(input, lessons.map((l) => l.id));
  return found;
}

export interface ResolveOptions {
  optional?: boolean;
  upto?: boolean;
}

/** Lessons whose skills are included for one requested lesson. */
export function expandLessons(
  lesson: Lesson,
  upto: boolean,
  lessons: Lesson[] = LESSONS,
): Lesson[] {
  if (!upto || lesson.extra) return [lesson];
  const idx = lessons.indexOf(lesson);
  return lessons.slice(0, idx + 1).filter((l) => !l.extra);
}

/** Resolves a set of lessons into a deduplicated, ordered skill list. */
export function collectSkills(
  inputs: string[],
  opts: ResolveOptions = {},
  lessons: Lesson[] = LESSONS,
): SkillRef[] {
  const seen = new Set<string>();
  const out: SkillRef[] = [];
  const add = (s: SkillRef) => {
    const key = `${skillSource(s)}\u0000${s.name}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(s);
    }
  };
  for (const input of inputs) {
    const lesson = resolveLesson(input, lessons);
    const targets = expandLessons(lesson, !!opts.upto, lessons);
    for (const t of targets) t.required.forEach(add);
    // Optional skills only for the explicitly requested lesson, not the whole range.
    if (opts.optional) lesson.optional.forEach(add);
  }
  return out;
}

/** Groups skills by source, preserving first-seen order. */
export function groupBySource(skills: SkillRef[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const s of skills) {
    const src = skillSource(s);
    const list = groups.get(src) ?? [];
    list.push(s.name);
    groups.set(src, list);
  }
  return groups;
}

export interface PassthroughOptions {
  global?: boolean;
  agent?: string[];
  yes?: boolean;
}

export interface Command {
  command: string;
  args: string[];
}

/** Args for `npx skills add <source> --skill a --skill b [-g] [-a x] [-y]`. */
export function buildAddArgs(
  source: string,
  names: string[],
  opts: PassthroughOptions = {},
): string[] {
  const args = ['skills', 'add', source];
  for (const n of names) args.push('--skill', n);
  if (opts.global) args.push('--global');
  for (const a of opts.agent ?? []) args.push('--agent', a);
  if (opts.yes) args.push('--yes');
  return args;
}

export function npxBinary(platform: string = process.platform): string {
  return platform === 'win32' ? 'npx.cmd' : 'npx';
}

export function buildCommands(
  skills: SkillRef[],
  opts: PassthroughOptions = {},
  platform: string = process.platform,
): Command[] {
  return [...groupBySource(skills)].map(([source, names]) => ({
    command: npxBinary(platform),
    args: buildAddArgs(source, names, opts),
  }));
}

function shellQuote(s: string): string {
  return /^[\w@%+=:,./-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`;
}

/** Display form of a command; always shows `npx` regardless of platform. */
export function formatCommand(cmd: Command): string {
  return ['npx', ...cmd.args].map(shellQuote).join(' ');
}

export interface SkillUsage {
  skill: SkillRef;
  required: string[];
  optional: string[];
}

/** Every skill referenced by the course, with the lessons that use it. */
export function skillUsage(lessons: Lesson[] = LESSONS): SkillUsage[] {
  const map = new Map<string, SkillUsage>();
  const touch = (s: SkillRef) => {
    const key = `${skillSource(s)}\u0000${s.name}`;
    let u = map.get(key);
    if (!u) map.set(key, (u = { skill: s, required: [], optional: [] }));
    return u;
  };
  for (const l of lessons) {
    l.required.forEach((s) => touch(s).required.push(l.id));
    l.optional.forEach((s) => touch(s).optional.push(l.id));
  }
  return [...map.values()];
}
