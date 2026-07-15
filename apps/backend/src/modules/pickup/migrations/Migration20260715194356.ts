import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260715194356 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`drop index if exists "IDX_pickup_closure_date_unique";`);

    this.addSql(`alter table if exists "pickup_closure" add column if not exists "end_date" text not null;`);
    this.addSql(`alter table if exists "pickup_closure" rename column "date" to "start_date";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "pickup_closure" drop column if exists "end_date";`);

    this.addSql(`alter table if exists "pickup_closure" rename column "start_date" to "date";`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_pickup_closure_date_unique" ON "pickup_closure" ("date") WHERE deleted_at IS NULL;`);
  }

}
