ALTER TABLE "projects" ADD COLUMN "slug" varchar(200);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "long_markdown" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "screenshots" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_slug_unique" UNIQUE("slug");