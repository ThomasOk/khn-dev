import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260725152322 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "announcement" add column if not exists "body" text null, add column if not exists "link_label" text null, add column if not exists "link_url" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "announcement" drop column if exists "body", drop column if exists "link_label", drop column if exists "link_url";`);
  }

}
