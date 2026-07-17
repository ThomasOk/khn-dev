import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260717211104 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "invoice" drop constraint if exists "invoice_year_number_unique";`);
    this.addSql(`alter table if exists "invoice" drop constraint if exists "invoice_order_id_unique";`);
    this.addSql(`create table if not exists "invoice" ("id" text not null, "order_id" text not null, "year" integer not null, "number" integer not null, "formatted_number" text not null, "frozen_data" jsonb not null, "file_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "invoice_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_invoice_order_id_unique" ON "invoice" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_invoice_deleted_at" ON "invoice" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_invoice_year_number_unique" ON "invoice" ("year", "number") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "invoice_counter" ("id" text not null, "value" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "invoice_counter_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_invoice_counter_deleted_at" ON "invoice_counter" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "invoice" cascade;`);

    this.addSql(`drop table if exists "invoice_counter" cascade;`);
  }

}
