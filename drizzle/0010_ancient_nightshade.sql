ALTER TABLE "vault_folders" DROP CONSTRAINT "vault_folders_slug_unique";--> statement-breakpoint
ALTER TABLE "vault_folders" ALTER COLUMN "is_public" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "vault_folders" ADD COLUMN "parent_id" integer;--> statement-breakpoint
ALTER TABLE "vault_journal" ADD COLUMN "is_public" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "vault_notes" ADD COLUMN "is_public" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "vault_photos" ADD COLUMN "is_public" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "vault_folders" ADD CONSTRAINT "vault_folders_parent_id_vault_folders_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."vault_folders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_folders" ADD CONSTRAINT "vault_folders_parent_slug_uniq" UNIQUE("parent_id","slug");