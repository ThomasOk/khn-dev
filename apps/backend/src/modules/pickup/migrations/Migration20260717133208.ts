import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260717133208 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "pickup_config" add column if not exists "restaurant_notification_email" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "pickup_config" drop column if exists "restaurant_notification_email";`);
  }

}
