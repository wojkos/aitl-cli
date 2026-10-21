#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { InvalidArgumentError, Command as Program } from 'commander';
import {
  buildCommands,
  type Command,
  collectSkills,
  formatCommand,
  resolveLesson,
  skillSource,
  skillUsage,
  spawnSpec,
} from './core.js';
import { DEFAULT_SOURCE, LESSONS, type SkillRef } from './lessons.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  version: string;
};

function fmtSkill(s: { name: string; source?: string }): string {
  return s.source && s.source !== DEFAULT_SOURCE ? `${s.name} (${s.source})` : s.name;
}

function pad(rows: string[][]): string {
  const widths: number[] = [];
  for (const r of rows) {
    for (const [i, c] of r.entries()) widths[i] = Math.max(widths[i] ?? 0, c.length);
  }
  return rows
    .map((r) =>
      r
        .map((c, i) => c.padEnd(widths[i] ?? 0))
        .join('  ')
        .trimEnd(),
    )
    .join('\n');
}

function fail(err: unknown): never {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}

function run(cmd: Command): Promise<number> {
  return new Promise((resolve) => {
    const spec = spawnSpec(cmd);
    const child = spawn(spec.command, spec.args, { stdio: 'inherit', shell: spec.shell });
    child.on('error', (e) => {
      console.error(`Failed to run ${cmd.command}: ${e.message}`);
      resolve(127);
    });
    child.on('close', (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
}

const program = new Program();
program
  .name('aitl-cli')
  .description('Install exactly the agent skills needed for a given AITL lesson.')
  .version(pkg.version);

program
  .command('list')
  .description('List lessons with their required skills')
  .action(() => {
    const rows = [['ID', 'TITLE', 'REQUIRED SKILLS', 'OPTIONAL']];
    for (const l of LESSONS) {
      rows.push([
        l.id,
        l.title,
        l.required.length ? l.required.map((s) => s.name).join(', ') : '-',
        l.optional.length ? `+${l.optional.length}` : '-',
      ]);
    }
    console.log(pad(rows));
  });

program
  .command('info <lesson>')
  .description('Show details of a lesson and the commands `get` would run')
  .action((id: string) => {
    try {
      const l = resolveLesson(id);
      console.log(`${l.title} (${l.id})\n`);
      const show = (label: string, skills: typeof l.required) =>
        console.log(`${label}: ${skills.length ? skills.map(fmtSkill).join(', ') : '(none)'}`);
      show('Required', l.required);
      show('Optional', l.optional);
      console.log(`\nNotes: ${l.notes}\n`);
      const req = buildCommands(collectSkills([l.id]));
      if (req.length === 0) {
        console.log('Nothing to install for this lesson.');
      } else {
        console.log('Install required skills:');
        for (const c of req) console.log(`  ${formatCommand(c)}`);
      }
      if (l.optional.length) {
        console.log('Install required + optional skills (--optional):');
        for (const c of buildCommands(collectSkills([l.id], { optional: true }))) {
          console.log(`  ${formatCommand(c)}`);
        }
      }
    } catch (e) {
      fail(e);
    }
  });

function collectAgent(value: string, prev: string[] = []): string[] {
  if (!value.trim()) throw new InvalidArgumentError('Agent name must not be empty.');
  return [...prev, value];
}

program
  .command('get <lesson...>')
  .description('Install the skills for one or more lessons')
  .option('--optional', 'include optional skills')
  .option('--upto', 'include required skills of all lessons from prework up to the given one')
  .option('--cumulative', 'alias of --upto')
  .option('--dry-run', 'print the commands without executing them')
  .option('-g, --global', 'install globally (passed to `skills add`)')
  .option('-a, --agent <agent>', 'target agent, repeatable (passed to `skills add`)', collectAgent)
  .option('-y, --yes', 'skip confirmation prompts (passed to `skills add`)')
  .action(async (ids: string[], o) => {
    let skills: SkillRef[];
    try {
      skills = collectSkills(ids, { optional: o.optional, upto: o.upto || o.cumulative });
    } catch (e) {
      fail(e);
    }
    if (skills.length === 0) {
      for (const id of ids) {
        const l = resolveLesson(id);
        console.log(`${l.title}: ${l.notes}`);
      }
      console.log('\nNothing to install for the selected lesson(s).');
      return;
    }
    const cmds = buildCommands(skills, { global: o.global, agent: o.agent, yes: o.yes });
    if (o.dryRun) {
      for (const c of cmds) console.log(formatCommand(c));
      return;
    }
    for (const c of cmds) {
      console.log(`> ${formatCommand(c)}`);
      const code = await run(c);
      if (code !== 0) process.exit(code);
    }
  });

program
  .command('skills')
  .description('List all skills used by the course and where they are used')
  .action(() => {
    const rows = [['SKILL', 'SOURCE', 'REQUIRED IN', 'OPTIONAL IN']];
    for (const u of skillUsage()) {
      rows.push([
        u.skill.name,
        skillSource(u.skill),
        u.required.join(', ') || '-',
        u.optional.join(', ') || '-',
      ]);
    }
    console.log(pad(rows));
  });

program.parseAsync().catch(fail);
