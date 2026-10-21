/**
 * Single source of truth for the AITL course: lessons and the skills they use.
 * Nothing else in the codebase may hardcode lesson or skill data.
 */

export const DEFAULT_SOURCE = 'open-mercato/skills';

export interface SkillRef {
  name: string;
  /** Overrides DEFAULT_SOURCE when the skill lives in another repository. */
  source?: string;
}

export interface Lesson {
  id: string;
  aliases: string[];
  title: string;
  required: SkillRef[];
  optional: SkillRef[];
  notes: string;
  /** Extras (brownfield, discovery) are not part of cumulative ranges. */
  extra?: boolean;
}

const om = (name: string): SkillRef => ({ name });
const grillMe: SkillRef = { name: 'grill-me', source: 'mattpocock/skills' };

export const LESSONS: Lesson[] = [
  {
    id: 'prework',
    aliases: ['pre-work', 'pre'],
    title: 'Pre-work',
    required: [],
    optional: [],
    notes:
      'No Open Mercato skills are needed yet. Learn the concepts and set up your environment.',
  },
  {
    id: 'l01',
    aliases: [],
    title: 'Lesson 01',
    required: [],
    optional: [],
    notes: 'Work with the agent and the prompts from the lesson.',
  },
  {
    id: 'l02',
    aliases: [],
    title: 'Lesson 02',
    required: [],
    optional: [],
    notes:
      'om-setup-agent-pipeline is only previewed in this lesson; you run it in lesson 03.',
  },
  {
    id: 'l03',
    aliases: [],
    title: 'Lesson 03',
    required: [
      om('om-setup-agent-pipeline'),
      om('om-prepare-issue'),
      om('om-auto-fix-issue'),
      om('om-code-review'),
    ],
    optional: [],
    notes:
      'In the current exercise use om-auto-fix-issue instead of the plain om-fix from the recording. The flow triggers the subsequent fix and review stages.',
  },
  {
    id: 'l04',
    aliases: [],
    title: 'Lesson 04',
    required: [om('om-discover'), om('om-backlog'), om('om-synthetic-users')],
    optional: [om('om-setup-discovery-pipeline')],
    notes:
      'om-synthetic-users is used for the personas exercise. om-setup-discovery-pipeline is optional process setup; the brief itself does not require it.',
  },
  {
    id: 'l05',
    aliases: [],
    title: 'Lesson 05',
    required: [om('om-spec-writing'), grillMe],
    optional: [],
    notes:
      'grill-me by Matt Pocock is used to review the spec. It is a separate package (mattpocock/skills).',
  },
  {
    id: 'l06',
    aliases: [],
    title: 'Lesson 06',
    required: [],
    optional: [],
    notes: 'You prepare the design system with the prompts from the lesson.',
  },
  {
    id: 'l07',
    aliases: [],
    title: 'Lesson 07',
    required: [om('om-mockup-prototype')],
    optional: [om('om-synthetic-users'), om('om-discover')],
    notes:
      'Optionally use om-synthetic-users to validate the prototype and later `om-discover --refresh` to update the brief. om-ux-setup is not needed in this lesson.',
  },
  {
    id: 'l08',
    aliases: [],
    title: 'Lesson 08',
    required: [],
    optional: [],
    notes:
      'No new mandatory skill. You code interactively using the specs, prototypes and project rules prepared earlier.',
  },
  {
    id: 'l09',
    aliases: [],
    title: 'Lesson 09',
    required: [],
    optional: [],
    notes:
      'You audit the security of installed skills. The intro and pdf-generator examples are part of the lab, not the Open Mercato catalog.',
  },
  {
    id: 'l10',
    aliases: [],
    title: 'Lesson 10',
    required: [],
    optional: [om('om-framework-context')],
    notes:
      'om-framework-context is shown as part of context management in Open Mercato. You do not need to run it in DevMentor.',
  },
  {
    id: 'brownfield',
    aliases: [],
    title: 'Brownfield',
    required: [om('om-setup-agent-pipeline')],
    optional: [om('om-prepare-issue'), om('om-auto-create-pr-loop')],
    notes:
      'om-prepare-issue appears in the additional app-rewrite case. The autonomous om-auto-create-pr-loop is a discussed alternative, not the recommended primary path.',
    extra: true,
  },
  {
    id: 'discovery',
    aliases: [],
    title: 'Discovery',
    required: [],
    optional: [],
    notes:
      'You prepare materials for om-discover, which you run in practical lesson 04.',
    extra: true,
  },
];
