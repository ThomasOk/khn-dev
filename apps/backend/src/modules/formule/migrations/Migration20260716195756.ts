import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260716195756 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "formule" drop constraint if exists "formule_product_id_unique";`);
    this.addSql(`create table if not exists "formule" ("id" text not null, "product_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "formule_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_formule_product_id_unique" ON "formule" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_formule_deleted_at" ON "formule" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "formule_composant" ("id" text not null, "key" text not null, "label" text not null, "rank" integer not null, "formule_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "formule_composant_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_formule_composant_formule_id" ON "formule_composant" ("formule_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_formule_composant_deleted_at" ON "formule_composant" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "formule_composant" add constraint "formule_composant_formule_id_foreign" foreign key ("formule_id") references "formule" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "formule_composant" drop constraint if exists "formule_composant_formule_id_foreign";`);

    this.addSql(`drop table if exists "formule" cascade;`);

    this.addSql(`drop table if exists "formule_composant" cascade;`);
  }

}
