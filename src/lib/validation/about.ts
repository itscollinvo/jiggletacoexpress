import { z } from "zod";

/** /now content — plain markdown, unbounded. */
export const NowInputSchema = z.object({
  content: z.string().default(""),
});
export type NowInput = z.infer<typeof NowInputSchema>;

/** Timeline entry — year is freeform string ("2023", "Summer 2024"). */
export const TimelineEntryInputSchema = z.object({
  year: z
    .string()
    .trim()
    .min(1, "Year is required")
    .max(80, "Year must be 80 characters or fewer"),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or fewer"),
  description: z.string().trim().default(""),
  // Optional lucide icon name (e.g. "GraduationCap"). Empty string → null.
  icon: z
    .string()
    .trim()
    .max(60, "Icon name too long")
    .optional()
    .default(""),
  sortOrder: z.coerce
    .number()
    .int("Sort order must be a whole number")
    .default(0),
});
export type TimelineEntryInput = z.infer<typeof TimelineEntryInputSchema>;

export function timelineToDbInput(input: TimelineEntryInput) {
  return {
    year: input.year,
    title: input.title,
    description: input.description,
    icon: input.icon && input.icon.length > 0 ? input.icon : null,
    sortOrder: input.sortOrder,
  };
}

/** About photo — URL + optional caption + sort order. */
export const AboutPhotoInputSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  caption: z
    .string()
    .trim()
    .max(200, "Caption must be 200 characters or fewer")
    .optional()
    .default(""),
  sortOrder: z.coerce.number().int().default(0),
});
export type AboutPhotoInput = z.infer<typeof AboutPhotoInputSchema>;

export function photoToDbInput(input: AboutPhotoInput) {
  return {
    url: input.url,
    caption: input.caption && input.caption.length > 0 ? input.caption : null,
    sortOrder: input.sortOrder,
  };
}
