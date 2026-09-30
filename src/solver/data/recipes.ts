// Base recipes of Marcel Paa. The creator docs (docs/creators/marcel-paa/research.md:18-20
// in timschoch/flexibeck) link these recipe pages; grams and times come from the pages,
// fetched 2026-09-30. Every number marked "assumed" is not on the page.
import type { LeafStep, Recipe } from '../types'

const HOUR = 60
const REFERENCE_TEMPERATURE = 24 // assumed: the pages give no kitchen temperature
const PREHEAT_MINUTES = 45 // assumed: the pages say "preheat to 250 °C", not for how long
const FOLD_MINUTES = 5 // assumed
const SHAPE_MINUTES = 15 // assumed

function rest(id: string, minutes: number): LeafStep {
  return { id, kind: 'rest', name: 'Rest', presence: 'unattended', environment: 'room', duration: { min: minutes, max: minutes } }
}

function fillingRest(id: string): LeafStep {
  return { id, kind: 'rest', name: 'Rest', presence: 'unattended', environment: 'room' }
}

function fold(id: string): LeafStep {
  return { id, kind: 'fold', name: 'Stretch and fold', presence: 'hands-on', environment: 'room', duration: { min: FOLD_MINUTES, max: FOLD_MINUTES } }
}

function shape(id: string): LeafStep {
  return { id, kind: 'shape', name: 'Shape', presence: 'hands-on', environment: 'room', duration: { min: SHAPE_MINUTES, max: SHAPE_MINUTES } }
}

function coldProof(id: string, hours: { min: number; max: number }): LeafStep {
  return {
    id,
    kind: 'proof',
    name: 'Proof in the fridge',
    presence: 'unattended',
    environment: 'fridge',
    duration: { min: hours.min * HOUR, max: hours.max * HOUR },
  }
}

function bake(id: string, minutes: { min: number; max: number }): LeafStep {
  return {
    id,
    kind: 'bake',
    name: 'Bake',
    presence: 'attended',
    environment: 'oven',
    duration: minutes,
    inputs: [
      {
        id: `${id}-preheat`,
        kind: 'preheat',
        name: 'Preheat to 250 °C',
        presence: 'attended',
        environment: 'oven',
        duration: { min: PREHEAT_MINUTES, max: PREHEAT_MINUTES },
      },
    ],
  }
}

export const recipes: Recipe[] = [
  {
    id: 'nine-to-five',
    name: '9 to 5 Sauerteigbrot für Berufstätige',
    source: 'https://www.marcelpaa.com/rezepte/9-to-5-sauerteigbrot-fuer-berufstaetige/',
    // 70 g active sourdough on 400 g wheat + 100 g rye flour. Mostly wheat; 20 % of the flour is rye.
    levainPercent: 14,
    steps: [
      {
        id: 'nine-to-five-mix',
        kind: 'mix',
        name: 'Mix and knead by hand',
        presence: 'hands-on',
        environment: 'room',
        duration: { min: 15, max: 15 }, // assumed
        ingredients: [
          { name: 'wheat flour type 550', grams: 400 },
          { name: 'dark rye flour type 1150', grams: 100 },
          { name: 'active sourdough', grams: 70 },
          { name: 'water, about 25 °C', grams: 350 },
          { name: 'salt', grams: 12 },
        ],
      },
      {
        id: 'nine-to-five-bulk',
        kind: 'bulk',
        name: 'Bulk overnight',
        // 7-10 h at room temperature: 8.5 h midpoint.
        fermentationBudget: { minutes: 8.5 * HOUR, temperature: REFERENCE_TEMPERATURE },
        children: [fillingRest('nine-to-five-bulk-rest')],
      },
      shape('nine-to-five-shape'),
      coldProof('nine-to-five-proof', { min: 8, max: 10 }),
      bake('nine-to-five-bake', { min: 50, max: 55 }),
    ],
  },
  {
    id: 'sauerteig-basic-brot',
    name: 'Sauerteig Basic Brot',
    source: 'https://www.marcelpaa.com/rezepte/sauerteig-basic-brot/',
    // 220 g Lievito Madre on 1000 g flour.
    levainPercent: 22,
    steps: [
      {
        id: 'basic-autolyse',
        kind: 'autolyse',
        name: 'Autolyse',
        children: [
          {
            id: 'basic-autolyse-mix',
            kind: 'mix',
            name: 'Mix flour and water',
            presence: 'hands-on',
            environment: 'room',
            duration: { min: 2, max: 3 },
            ingredients: [
              { name: 'water, hand-warm', grams: 680 },
              { name: 'wheat flour type 550', grams: 850 },
              { name: 'wholemeal wheat flour', grams: 150 },
            ],
          },
          {
            id: 'basic-autolyse-rest',
            kind: 'rest',
            name: 'Rest',
            presence: 'unattended',
            environment: 'room',
            duration: { min: 30, max: 60 },
          },
        ],
      },
      {
        id: 'basic-mix',
        kind: 'mix',
        name: 'Mix in salt and sourdough',
        presence: 'hands-on',
        environment: 'room',
        duration: { min: 15, max: 20 },
        ingredients: [
          { name: 'salt', grams: 23 },
          { name: 'sourdough (Lievito Madre)', grams: 220 },
        ],
      },
      {
        id: 'basic-bulk',
        kind: 'bulk',
        name: 'Bulk',
        // 60 min, fold, then 1-2 h more with 1-2 folds: 2-3 h, 2.5 h midpoint.
        fermentationBudget: { minutes: 2.5 * HOUR, temperature: REFERENCE_TEMPERATURE },
        children: [
          rest('basic-bulk-rest-1', HOUR),
          fold('basic-fold-1'),
          rest('basic-bulk-rest-2', 45), // assumed: the page does not say when the second fold comes
          fold('basic-fold-2'),
          fillingRest('basic-bulk-rest-3'),
        ],
      },
      shape('basic-shape'),
      coldProof('basic-proof', { min: 8, max: 18 }),
      bake('basic-bake', { min: 55, max: 55 }),
    ],
  },
  {
    id: 'sauerteig-brot-1x1',
    name: 'Sauerteig Brot 1×1',
    source: 'https://www.marcelpaa.com/rezepte/sauerteig-brot-1x1/',
    // 420 g Sauerteig-Vorteig on 800 g flour in the autolyse.
    levainPercent: 52.5,
    steps: [
      {
        id: 'one-by-one-mix',
        kind: 'mix',
        name: 'Knead preferment into the autolyse',
        presence: 'hands-on',
        environment: 'room',
        duration: { min: 8, max: 10 },
        inputs: [
          {
            id: 'one-by-one-preferment',
            kind: 'levain-build',
            name: 'Sauerteig-Vorteig',
            // 8-12 h at room temperature: 10 h midpoint.
            fermentationBudget: { minutes: 10 * HOUR, temperature: REFERENCE_TEMPERATURE },
            children: [
              {
                id: 'one-by-one-preferment-mix',
                kind: 'mix',
                name: 'Mix starter, water and flour',
                presence: 'hands-on',
                environment: 'room',
                duration: { min: 5, max: 5 }, // assumed
                ingredients: [
                  { name: 'sourdough starter', grams: 20 },
                  { name: 'water, 26-30 °C', grams: 200 },
                  { name: 'wheat flour type 550', grams: 200 },
                ],
              },
              fillingRest('one-by-one-preferment-rest'),
            ],
          },
          {
            id: 'one-by-one-autolyse',
            kind: 'autolyse',
            name: 'Autolyse with salt',
            children: [
              {
                id: 'one-by-one-autolyse-mix',
                kind: 'mix',
                name: 'Mix until lump-free',
                presence: 'hands-on',
                environment: 'room',
                duration: { min: 5, max: 5 }, // assumed
                ingredients: [
                  { name: 'fine wholemeal wheat flour', grams: 150 },
                  { name: 'wheat flour type 550', grams: 650 },
                  { name: 'water, 26-30 °C', grams: 500 },
                  { name: 'salt', grams: 21 },
                ],
              },
              {
                id: 'one-by-one-autolyse-rest',
                kind: 'rest',
                name: 'Rest',
                presence: 'unattended',
                environment: 'room',
                duration: { min: 8 * HOUR, max: 12 * HOUR },
              },
            ],
          },
        ],
      },
      {
        id: 'one-by-one-bulk',
        kind: 'bulk',
        name: 'Bulk',
        // 30 min, fold, 30 min, fold, 1 h: 2 h.
        fermentationBudget: { minutes: 2 * HOUR, temperature: REFERENCE_TEMPERATURE },
        children: [
          rest('one-by-one-bulk-rest-1', 30),
          fold('one-by-one-fold-1'),
          rest('one-by-one-bulk-rest-2', 30),
          fold('one-by-one-fold-2'),
          fillingRest('one-by-one-bulk-rest-3'),
        ],
      },
      shape('one-by-one-shape'),
      coldProof('one-by-one-proof', { min: 12, max: 18 }),
      bake('one-by-one-bake', { min: 45, max: 50 }),
    ],
  },
]
