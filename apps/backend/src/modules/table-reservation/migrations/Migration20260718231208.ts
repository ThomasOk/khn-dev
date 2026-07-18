import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260718231208 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "table_reservation" drop constraint if exists "table_reservation_cancellation_token_unique";`);
    this.addSql(`create table if not exists "table_reservation" ("id" text not null, "date" text not null, "time" text not null, "party_size" integer not null, "duration_minutes" integer not null, "service_window_id" text not null, "status" text check ("status" in ('confirmed', 'cancelled')) not null default 'confirmed', "customer_name" text not null, "customer_email" text not null, "customer_phone" text not null, "note" text null, "cancellation_token" text not null, "cancelled_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "table_reservation_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_table_reservation_cancellation_token_unique" ON "table_reservation" ("cancellation_token") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_table_reservation_deleted_at" ON "table_reservation" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "table_reservation" cascade;`);
  }

}
