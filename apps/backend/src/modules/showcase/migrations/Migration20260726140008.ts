import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260726140008 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "showcase_config" ("id" text not null, "enabled" boolean not null default false, "note" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "showcase_config_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_showcase_config_deleted_at" ON "showcase_config" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "showcase_config" cascade;`);
  }

}
