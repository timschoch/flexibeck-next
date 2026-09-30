// Creator videos for the hands-on techniques of the base recipes and the hacks. Each source
// page embeds one YouTube video by Marcel Paa, and its description lists chapters. A step
// opens the video of its recipe or hack at the chapter of its technique. Checked 2026-10-01:
// the YouTube oEmbed of every video id names the author "Einfach Backen - Marcel Paa"; the
// chapter times come from the description.
import type { Step, StepKind, Technique, TechniqueVideo } from '../types'
import { hacks } from './hacks'
import { recipes } from './recipes'

type Chapter = { name: string; startSeconds: number }
type Video = {
  youtubeId: string
  title: string
  creator: string
  source: string
  /** The chapter that shows each technique. A video need not show them all. */
  chapters: Partial<Record<Technique, Chapter>>
}

const NINE_TO_FIVE: Video = {
  youtubeId: 'Gp5ELw3jD04',
  title: 'Brot backen trotz Vollzeitjob: Mein 9-to-5 Sauerteigbrot mit Zeitplan!',
  creator: 'Marcel Paa',
  source: 'https://www.marcelpaa.com/rezepte/9-to-5-sauerteigbrot-fuer-berufstaetige/',
  chapters: {
    mix: { name: 'Hauptteig', startSeconds: 31 },
    shape: { name: 'Formen', startSeconds: 180 },
  },
}

const BASIC: Video = {
  youtubeId: 'K4TdJsa1voI',
  title: 'Sauerteig Basic Brot - Mein einfaches Standard Sauerteigbrot Rezept',
  creator: 'Marcel Paa',
  source: 'https://www.marcelpaa.com/rezepte/sauerteig-basic-brot/',
  chapters: {
    autolyse: { name: 'Autolyse', startSeconds: 29 },
    mix: { name: 'Hauptteig', startSeconds: 58 },
    fold: { name: 'Dehnen & Falten', startSeconds: 179 },
    shape: { name: 'Formen', startSeconds: 191 },
  },
}

// The masterclass shows every technique. Its chapter stands in where the video of another
// recipe or hack has no chapter for a technique.
const ONE_BY_ONE: Video & { chapters: Record<Technique, Chapter> } = {
  youtubeId: 'J9A6yoKrygs',
  title: 'Sauerteig Brot 1x1 - Schritt für Schritt zum perfekten Sauerteigbrot - Brot Backen Masterclass',
  creator: 'Marcel Paa',
  source: 'https://www.marcelpaa.com/rezepte/sauerteig-brot-1x1/',
  chapters: {
    'levain-build': { name: 'Vorstufen', startSeconds: 71 },
    autolyse: { name: 'Autolyse', startSeconds: 216 },
    mix: { name: 'Hauptteig', startSeconds: 500 },
    fold: { name: 'Dehnen & Falten', startSeconds: 635 },
    shape: { name: 'Formen', startSeconds: 731 },
  },
}

// The video of the four-hour method (hacks.md:42). It has no chapter for the stretch and fold.
const FOUR_HOUR: Video = {
  youtubeId: 'ZdIlvbulBA8',
  title: 'Sauerteigbrot in 4 Stunden? Das ultimative Leinsamenbrot-Rezept!',
  creator: 'Marcel Paa',
  source: 'https://www.marcelpaa.com/rezepte/4-stunden-leinsamenbrot/',
  chapters: {
    mix: { name: 'Teig herstellen', startSeconds: 10 },
    shape: { name: 'Formen', startSeconds: 130 },
  },
}

/** The video of each recipe and of each hack that brings its own steps, by recipe id or hack id. */
const videos: Record<string, Video> = {
  'nine-to-five': NINE_TO_FIVE,
  'sauerteig-basic-brot': BASIC,
  'sauerteig-brot-1x1': ONE_BY_ONE,
  'four-hour-method': FOUR_HOUR,
}

function isTechnique(kind: StepKind): kind is Technique {
  return kind in ONE_BY_ONE.chapters
}

function videoOf(ownerId: string, technique: Technique): TechniqueVideo {
  const own = videos[ownerId]
  const video = own?.chapters[technique] ? own : ONE_BY_ONE
  const chapter = video.chapters[technique] ?? ONE_BY_ONE.chapters[technique]
  return {
    technique,
    title: `${video.title} · ${chapter.name}`,
    youtubeId: video.youtubeId,
    startSeconds: chapter.startSeconds,
    creator: video.creator,
    source: video.source,
  }
}

/** Each hands-on step with its video. `ownerId` is the recipe or hack the steps belong to. */
function listStepVideos(steps: Step[], ownerId: string, parent?: Step): [string, TechniqueVideo][] {
  return steps.flatMap((step) => {
    const inputs = listStepVideos(step.inputs ?? [], ownerId)
    if ('children' in step) return [...inputs, ...listStepVideos(step.children, ownerId, step)]
    // A mix inside an autolyse or a levain build is that technique.
    const kind = parent?.kind === 'autolyse' || parent?.kind === 'levain-build' ? parent.kind : step.kind
    if (step.presence !== 'hands-on' || !isTechnique(kind)) return inputs
    return [...inputs, [step.id, videoOf(ownerId, kind)]]
  })
}

const videosByStepId = new Map([
  ...recipes.flatMap((recipe) => listStepVideos(recipe.steps, recipe.id)),
  ...hacks.flatMap((hack) =>
    hack.effects.flatMap((effect) => (effect.kind === 'replace-steps' ? listStepVideos(effect.steps, hack.id) : [])),
  ),
])

/** The creator video for a hands-on step of a recipe or a hack. Nothing for any other step. */
export function findTechniqueVideo(stepId: string): TechniqueVideo | undefined {
  return videosByStepId.get(stepId)
}
