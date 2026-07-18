import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260718224557 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "table_reservation_closure" ("id" text not null, "start_date" text not null, "end_date" text not null, "reason" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "table_reservation_closure_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_table_reservation_closure_deleted_at" ON "table_reservation_closure" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "table_reservation_closure" cascade;`);
  }

}
