CREATE TABLE "vault_folders" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vault_folders_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "vault_journal" ADD COLUMN "folder_id" integer;--> statement-breakpoint
ALTER TABLE "vault_notes" ADD COLUMN "folder_id" integer;--> statement-breakpoint
ALTER TABLE "vault_photos" ADD COLUMN "folder_id" integer;--> statement-breakpoint
ALTER TABLE "vault_journal" ADD CONSTRAINT "vault_journal_folder_id_vault_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."vault_folders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_notes" ADD CONSTRAINT "vault_notes_folder_id_vault_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."vault_folders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_photos" ADD CONSTRAINT "vault_photos_folder_id_vault_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."vault_folders"("id") ON DELETE restrict ON UPDATE no action;

-- V.1 data migration: create default "General" folder and backfill existing rows
INSERT INTO vault_folders (slug, name, description, is_public, sort_order)
VALUES ('general', 'General', 'Default folder for pre-refactor vault content.', false, 0);

UPDATE vault_photos  SET folder_id = (SELECT id FROM vault_folders WHERE slug = 'general') WHERE folder_id IS NULL;
UPDATE vault_notes   SET folder_id = (SELECT id FROM vault_folders WHERE slug = 'general') WHERE folder_id IS NULL;
UPDATE vault_journal SET folder_id = (SELECT id FROM vault_folders WHERE slug = 'general') WHERE folder_id IS NULL;

-- V.1 data migration: create default "General" folder and backfill existing rows
INSERT INTO vault_folders (slug, name, description, is_public, sort_order)
VALUES ('general', 'General', 'Default folder for pre-refactor vault content.', false, 0);

UPDATE vault_photos  SET folder_id = (SELECT id FROM vault_folders WHERE slug = 'general') WHERE folder_id IS NULL;
UPDATE vault_notes   SET folder_id = (SELECT id FROM vault_folders WHERE slug = 'general') WHERE folder_id IS NULL;
UPDATE vault_journal SET folder_id = (SELECT id FROM vault_folders WHERE slug = 'general') WHERE folder_id IS NULL;