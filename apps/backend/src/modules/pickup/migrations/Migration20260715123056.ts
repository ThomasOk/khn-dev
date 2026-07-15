import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260715123056 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "pickup_closure" drop constraint if exists "pickup_closure_date_unique";`);
    this.addSql(`create table if not exists "pickup_closure" ("id" text not null, "date" text not null, "reason" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pickup_closure_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_pickup_closure_date_unique" ON "pickup_closure" ("date") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pickup_closure_deleted_at" ON "pickup_closure" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pickup_config" ("id" text not null, "prep_delay_minutes" integer not null, "slot_duration_minutes" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pickup_config_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pickup_config_deleted_at" ON "pickup_config" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pickup_schedule" ("id" text not null, "day_of_week" integer not null, "start_time" text not null, "end_time" text not null, "active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pickup_schedule_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pickup_schedule_deleted_at" ON "pickup_schedule" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "pickup_closure" cascade;`);

    this.addSql(`drop table if exists "pickup_config" cascade;`);

    this.addSql(`drop table if exists "pickup_schedule" cascade;`);
  }

}
