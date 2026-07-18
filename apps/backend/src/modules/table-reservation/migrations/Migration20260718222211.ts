import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260718222211 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "table_reservation_config" ("id" text not null, "min_lead_minutes" integer not null, "horizon_days" integer not null, "slot_step_minutes" integer not null, "max_party_size" integer not null, "last_seating_margin_minutes" integer not null, "large_party_phone" text not null, "restaurant_notification_email" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "table_reservation_config_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_table_reservation_config_deleted_at" ON "table_reservation_config" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "table_reservation_service_window" ("id" text not null, "name" text not null, "day_of_week" integer not null, "start_time" text not null, "end_time" text not null, "capacity" integer not null, "duration_minutes" integer not null, "active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "table_reservation_service_window_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_table_reservation_service_window_deleted_at" ON "table_reservation_service_window" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "table_reservation_config" cascade;`);

    this.addSql(`drop table if exists "table_reservation_service_window" cascade;`);
  }

}
