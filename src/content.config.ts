import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Каждая коллекция — это папка с markdown-файлами.
// Добавили файл в папку, он сам появился на сайте.

const dx = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/dx' }),
  schema: z.object({
    title: z.string(),
    callsign: z.string().optional(),
    location: z.string().optional(),
    dateStart: z.coerce.date(),
    dateEnd: z.coerce.date().optional(),
    summary: z.string(),
    qsos: z.number().optional(),
    bands: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const rda = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/rda' }),
  schema: z.object({
    title: z.string(),
    rdaRefs: z.array(z.string()).default([]),
    date: z.coerce.date(),
    summary: z.string(),
    qsos: z.number().optional(),
    draft: z.boolean().default(false),
  }),
});

const handbook = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/handbook' }),
  schema: z.object({
    title: z.string(),
    category: z.string(),
    summary: z.string(),
    updated: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { dx, rda, handbook };
