// Creator videos for the hands-on steps of the base recipes. Each recipe page (the source)
// embeds one YouTube video by Marcel Paa, and its description lists chapters. A step opens
// the video at its chapter. Checked 2026-10-01: the YouTube oEmbed of every video id names
// the author "Einfach Backen - Marcel Paa"; the chapter times come from the description.
import type { StepVideo } from '../types'

type Video = { id: string; title: string; source: string }

const NINE_TO_FIVE: Video = {
  id: 'Gp5ELw3jD04',
  title: 'Brot backen trotz Vollzeitjob: Mein 9-to-5 Sauerteigbrot mit Zeitplan!',
  source: 'https://www.marcelpaa.com/rezepte/9-to-5-sauerteigbrot-fuer-berufstaetige/',
}

const BASIC: Video = {
  id: 'K4TdJsa1voI',
  title: 'Sauerteig Basic Brot - Mein einfaches Standard Sauerteigbrot Rezept',
  source: 'https://www.marcelpaa.com/rezepte/sauerteig-basic-brot/',
}

const ONE_BY_ONE: Video = {
  id: 'J9A6yoKrygs',
  title: 'Sauerteig Brot 1x1 - Schritt für Schritt zum perfekten Sauerteigbrot - Brot Backen Masterclass',
  source: 'https://www.marcelpaa.com/rezepte/sauerteig-brot-1x1/',
}

function chapter(stepId: string, video: Video, name: string, startSeconds: number): StepVideo {
  return {
    stepId,
    title: `${video.title} · ${name}`,
    url: `https://www.youtube.com/watch?v=${video.id}&t=${startSeconds}s`,
    source: video.source,
  }
}

export const stepVideos: StepVideo[] = [
  chapter('nine-to-five-mix', NINE_TO_FIVE, 'Hauptteig', 31),
  chapter('nine-to-five-shape', NINE_TO_FIVE, 'Formen', 180),
  chapter('basic-autolyse-mix', BASIC, 'Autolyse', 29),
  chapter('basic-mix', BASIC, 'Hauptteig', 58),
  chapter('basic-fold-1', BASIC, 'Dehnen & Falten', 179),
  chapter('basic-fold-2', BASIC, 'Dehnen & Falten', 179),
  chapter('basic-shape', BASIC, 'Formen', 191),
  chapter('one-by-one-preferment-mix', ONE_BY_ONE, 'Vorstufen', 71),
  chapter('one-by-one-autolyse-mix', ONE_BY_ONE, 'Autolyse', 216),
  chapter('one-by-one-mix', ONE_BY_ONE, 'Hauptteig', 500),
  chapter('one-by-one-fold-1', ONE_BY_ONE, 'Dehnen & Falten', 635),
  chapter('one-by-one-fold-2', ONE_BY_ONE, 'Dehnen & Falten', 635),
  chapter('one-by-one-shape', ONE_BY_ONE, 'Formen', 731),
]

export function findStepVideo(stepId: string): StepVideo | undefined {
  return stepVideos.find((video) => video.stepId === stepId)
}
