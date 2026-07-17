import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260717214043 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "issuer_config" ("id" text not null, "legal_name" text not null, "address" text not null, "siren" text not null, "siret" text not null, "vat_number" text not null, "legal_form" text not null, "share_capital" text not null, "rcs_city" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "issuer_config_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_issuer_config_deleted_at" ON "issuer_config" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "issuer_config" cascade;`);
  }

}
