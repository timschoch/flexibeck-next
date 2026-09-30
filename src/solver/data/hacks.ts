// Validated hacks of Marcel Paa. Source: docs/creators/marcel-paa/hacks.md in
// timschoch/flexibeck, cited as hacks.md:<line>. Never add a hack that is not there.
// Impact scores are assumed from the source's words; the source gives no scale.
//
// Left out, no timing number in the source: 30 % levain (hacks.md:8, "viel schneller"),
// Kochstück (hacks.md:53), water temperature (hacks.md:79). Left out, needs a step the
// solver cannot insert yet: indirect method (hacks.md:54), autolyse (hacks.md:88).
// Starter care (hacks.md:60, 70) is not a dough hack.
import type { Hack, LeafStep, Step } from '../types'

const HOUR = 60
const REFERENCE_TEMPERATURE = 24 // assumed: the source gives no kitchen temperature

function rest(id: string, minutes: number): LeafStep {
  return { id, kind: 'rest', name: 'Rest', presence: 'unattended', environment: 'room', duration: { min: minutes, max: minutes } }
}

function fold(id: string): LeafStep {
  // 5 min per fold: assumed.
  return { id, kind: 'fold', name: 'Stretch and fold', presence: 'hands-on', environment: 'room', duration: { min: 5, max: 5 } }
}

// hacks.md:42: bulk 120 min with 3 stretch-and-folds at 30-minute intervals, shape, proof 40-50 min.
const fourHourSteps: Step[] = [
  // 15 min mix: assumed.
  { id: 'four-hour-mix', kind: 'mix', name: 'Mix', presence: 'hands-on', environment: 'room', duration: { min: 15, max: 15 } },
  {
    id: 'four-hour-bulk',
    kind: 'bulk',
    name: 'Bulk',
    fermentationBudget: { minutes: 120, temperature: REFERENCE_TEMPERATURE },
    children: [
      rest('four-hour-bulk-rest-1', 30),
      fold('four-hour-fold-1'),
      rest('four-hour-bulk-rest-2', 30),
      fold('four-hour-fold-2'),
      rest('four-hour-bulk-rest-3', 30),
      fold('four-hour-fold-3'),
      { id: 'four-hour-bulk-rest-4', kind: 'rest', name: 'Rest', presence: 'unattended', environment: 'room' },
    ],
  },
  // 15 min shape: assumed.
  { id: 'four-hour-shape', kind: 'shape', name: 'Shape', presence: 'hands-on', environment: 'room', duration: { min: 15, max: 15 } },
  {
    id: 'four-hour-proof',
    kind: 'proof',
    name: 'Proof',
    fermentationBudget: { minutes: 45, temperature: REFERENCE_TEMPERATURE },
    children: [{ id: 'four-hour-proof-rest', kind: 'rest', name: 'Rest', presence: 'unattended', environment: 'room' }],
  },
  {
    id: 'four-hour-bake',
    kind: 'bake',
    name: 'Bake',
    presence: 'attended',
    environment: 'oven',
    // 50 min bake and 45 min preheat: assumed, the source gives neither.
    duration: { min: 50, max: 50 },
    inputs: [
      { id: 'four-hour-preheat', kind: 'preheat', name: 'Preheat', presence: 'attended', environment: 'oven', duration: { min: 45, max: 45 } },
    ],
  },
]

export const hacks: Hack[] = [
  {
    // hacks.md:8, 10
    id: 'levain-20',
    name: '20 % levain',
    source: 'hacks.md:8; https://www.youtube.com/watch?v=J9A6yoKrygs 07:09-08:20',
    requirements: [{ kind: 'levain-percent', min: 10, max: 20 }],
    effects: [
      { kind: 'levain', target: { stepKind: 'bulk', position: 'all' }, percent: 20 },
      { kind: 'levain', target: { stepKind: 'proof', position: 'all' }, percent: 20 },
    ],
    impact: { scores: { sourness: 1 }, text: 'More starter speeds fermentation and makes the loaf more sour if the total time stays the same.' },
    limits: 'About 3-6 h bulk, depending on weather and starter activity. The same percentage runs about 8 h in summer and 12 h in winter.',
    combinesWith: ['cold-final-proof'],
  },
  {
    // hacks.md:8
    id: 'levain-10',
    name: '10 % levain',
    source: 'hacks.md:8; https://www.youtube.com/watch?v=J9A6yoKrygs 07:09-08:20',
    requirements: [{ kind: 'levain-percent', min: 10, max: 20 }],
    effects: [
      { kind: 'levain', target: { stepKind: 'bulk', position: 'all' }, percent: 10 },
      { kind: 'levain', target: { stepKind: 'proof', position: 'all' }, percent: 10 },
    ],
    impact: { scores: {}, text: 'Slower bulk. The source names no change in taste.' },
    limits: 'About 8-12 h bulk. The same percentage runs about 8 h in summer and 12 h in winter.',
    combinesWith: [],
  },
  {
    // hacks.md:14-20
    id: 'cold-bulk',
    name: 'Cold bulk, about 60 h',
    source: 'hacks.md:18; https://www.youtube.com/watch?v=WrO1AxCoYNQ 02:11-03:53, 05:05-05:31',
    requirements: [],
    effects: [
      // 55-59 h: assumed from "about 55 more hours" and "about 60 hours" in total.
      { kind: 'move-to-fridge', target: { stepKind: 'bulk', position: 'first' }, roomMinutes: HOUR, duration: { min: 55 * HOUR, max: 59 * HOUR } },
      // hacks.md:26: warm final proof 2-3 h after the cold bulk.
      { kind: 'set-duration', target: { stepKind: 'proof', position: 'last' }, environment: 'room', duration: { min: 2 * HOUR, max: 3 * HOUR } },
    ],
    impact: { scores: { aroma: 2, crust: 1 }, text: 'A superb aroma and better colour.' },
    limits:
      'One hour at room temperature first, "really important". No upper bound beyond about 60 h. Folds 1-3 times a day in the fridge are not planned yet.',
    combinesWith: [],
  },
  {
    // hacks.md:23-27
    id: 'cold-bulk-short-proof',
    name: 'Cold bulk, short warm proof',
    source: 'hacks.md:26; https://www.youtube.com/watch?v=WrO1AxCoYNQ 07:23-07:39',
    requirements: [],
    effects: [
      { kind: 'move-to-fridge', target: { stepKind: 'bulk', position: 'first' }, roomMinutes: HOUR, duration: { min: 55 * HOUR, max: 59 * HOUR } },
      { kind: 'set-duration', target: { stepKind: 'proof', position: 'last' }, environment: 'room', duration: { min: 30, max: 30 } },
    ],
    impact: { scores: { aroma: 2, volume: -1 }, text: 'The cold bulk aroma; a warm proof of 30 min "isn\'t that bad".' },
    limits: 'The dough is very cold from the fridge. Do not skip the warm proof.',
    combinesWith: [],
  },
  {
    // hacks.md:31-36, 11
    id: 'cold-final-proof',
    name: 'Cold final proof, 10-20 h',
    source: 'hacks.md:34; https://www.youtube.com/watch?v=K4TdJsa1voI 03:53-04:00',
    requirements: [],
    effects: [
      // 40 %: assumed. hacks.md:33 gives a 2-3 h room bulk before it, at 20 % levain whose full
      // bulk is 3-6 h (hacks.md:8): 2 h of the 4.5 h midpoint is 44 %, rounded down.
      { kind: 'end-early', target: { stepKind: 'bulk', position: 'first' }, budget: 0.4 },
      {
        kind: 'move-to-fridge',
        target: { stepKind: 'proof', environment: 'room', position: 'last' },
        roomMinutes: 0,
        duration: { min: 10 * HOUR, max: 20 * HOUR },
      },
    ],
    impact: { scores: { crumb: 1, crust: 1 }, text: 'Elastic, moist crumb and a thin, crisp crust with roasted notes.' },
    limits: 'Not longer than 20 h, "otherwise you\'d need to adjust the recipe". Bake straight from the fridge.',
    combinesWith: ['levain-20'],
  },
  {
    // hacks.md:97-101
    id: 'workday-cold-proof',
    name: '9-to-5: cold proof over the workday',
    source: 'hacks.md:100; https://www.marcelpaa.com/rezepte/9-to-5-sauerteigbrot-fuer-berufstaetige/',
    requirements: [],
    effects: [
      {
        kind: 'move-to-fridge',
        target: { stepKind: 'proof', environment: 'room', position: 'last' },
        roomMinutes: 0,
        duration: { min: 8 * HOUR, max: 10 * HOUR },
      },
    ],
    impact: { scores: {}, text: 'The recipe page names no change in taste.' },
    limits: 'After a full bulk of 7-10 h at room temperature.',
    combinesWith: [],
  },
  {
    // hacks.md:39-45
    id: 'four-hour-method',
    name: '4-hour bread with yeast',
    source: 'hacks.md:42; https://www.youtube.com/watch?v=ZdIlvbulBA8 01:44-01:49',
    requirements: [],
    effects: [
      { kind: 'replace-steps', target: { stepKind: 'mix', position: 'first' }, steps: fourHourSteps },
      // hacks.md:43: per about 1 kg flour; the starter stays in for flavour only.
      { kind: 'add-ingredient', ingredient: { name: 'fresh yeast', grams: 12 } },
      { kind: 'add-ingredient', ingredient: { name: 'active malt', grams: 7 } },
    ],
    impact: {
      scores: { crumb: 1, crust: 1, sourness: -1 },
      text: 'Surprisingly good aroma for the short time, elastic and moist crumb from the malt, thin crisp crust. A long fermentation is not possible this way.',
    },
    limits: 'An occasional shortcut for a morning or afternoon bake. Does not combine with any cold step.',
    combinesWith: [],
  },
]
