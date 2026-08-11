import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

export type OrderItem = {
  id: string;
  title: string;
  variant_title?: string;
  subtitle?: string;
  quantity: number;
  unit_price: number;
  total: number;
  thumbnail?: string;
};

export type TaxBreakdownRow = {
  rate: number;
  amount: number;
};

export type OrderAddress = {
  first_name?: string;
  last_name?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  postal_code?: string;
  country_code?: string;
  phone?: string;
};

export type OrderConfirmationEmailProps = {
  order_id: string | number;
  created_at: string;
  currency: string;
  total: number;
  subtotal: number;
  shipping_total: number;
  tax_breakdown: TaxBreakdownRow[];
  discount_total?: number;
  items: OrderItem[];
  shipping_address?: OrderAddress;
  customer_name?: string;
};

function formatPrice(amount: number | null | undefined, currency: string): string {
  if (amount == null || isNaN(Number(amount))) return "—"
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(Number(amount));
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr));
}

function countryName(code: string): string {
  try {
    return (
      new Intl.DisplayNames(["fr"], { type: "region" }).of(
        code.toUpperCase(),
      ) ?? code.toUpperCase()
    );
  } catch {
    return code.toUpperCase();
  }
}

export default function OrderConfirmationEmail({
  order_id,
  created_at,
  currency,
  total,
  subtotal,
  shipping_total,
  tax_breakdown = [],
  discount_total = 0,
  items = [],
  shipping_address,
  customer_name,
}: OrderConfirmationEmailProps) {
  const greeting = customer_name ? `Bonjour ${customer_name},` : "Bonjour,";

  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>{`Votre commande #${String(order_id)} a bien été confirmée — merci !`}</Preview>
      <Body style={body}>
        {/* Header */}
        <Section style={header}>
          <Container style={headerInner}>
            <Text style={brandName}>Kim-Hi Noodle</Text>
          </Container>
        </Section>

        <Container style={container}>
          {/* Hero */}
          <Section style={hero}>
            <Heading style={h1}>Merci pour votre commande !</Heading>
            <Text style={heroText}>{greeting}</Text>
            <Text style={heroText}>
              Nous avons bien reçu votre commande et nous la préparons avec
              soin. Votre commande sera prête pour le retrait en magasin très
              prochainement.
            </Text>
          </Section>

          {/* Order info badge */}
          <Section style={orderBadge}>
            <Row>
              <Column style={orderBadgeCell}>
                <Text style={orderBadgeLabel}>Commande</Text>
                <Text style={orderBadgeValue}>#{order_id}</Text>
              </Column>
              <Column style={orderBadgeCell}>
                <Text style={orderBadgeLabel}>Date</Text>
                <Text style={orderBadgeValue}>{formatDate(created_at)}</Text>
              </Column>
              <Column style={orderBadgeCell}>
                <Text style={orderBadgeLabel}>Total</Text>
                <Text style={orderBadgeValue}>
                  {formatPrice(total, currency)}
                </Text>
              </Column>
            </Row>
          </Section>

          <Hr style={divider} />

          {/* Items */}
          <Section style={section}>
            <Heading style={h2}>Votre commande</Heading>
            {items.map((item) => (
              <Row key={item.id} style={itemRow}>
                <Column style={itemImageCell}>
                  {item.thumbnail &&
                  item.thumbnail.startsWith("http") &&
                  !item.thumbnail.includes("localhost") &&
                  !item.thumbnail.includes("127.0.0.1") ? (
                    <Img
                      src={item.thumbnail}
                      width={64}
                      height={64}
                      alt={item.title}
                      style={itemImage}
                    />
                  ) : (
                    <Section style={itemImagePlaceholder}>
                      <Text style={itemImagePlaceholderText}>📦</Text>
                    </Section>
                  )}
                </Column>
                <Column style={itemDetails}>
                  <Text style={itemTitle}>{item.title}</Text>
                  {(item.variant_title || item.subtitle) && (
                    <Text style={itemVariant}>
                      {item.variant_title ?? item.subtitle}
                    </Text>
                  )}
                  <Text style={itemQty}>Qté : {item.quantity ?? "—"}</Text>
                </Column>
                <Column style={itemPriceCell}>
                  <Text style={itemPrice}>
                    {formatPrice(item.unit_price * (item.quantity ?? 1), currency)}
                  </Text>
                  {(item.quantity ?? 0) > 1 && (
                    <Text style={itemUnitPrice}>
                      {formatPrice(item.unit_price, currency)} / unité
                    </Text>
                  )}
                </Column>
              </Row>
            ))}
          </Section>

          <Hr style={divider} />

          {/* Totals */}
          <Section style={section}>
            <Heading style={h2}>Récapitulatif</Heading>
            <Row style={totalRow}>
              <Column>
                <Text style={totalLabel}>Sous-total</Text>
              </Column>
              <Column style={totalValueCell}>
                <Text style={totalValue}>
                  {formatPrice(subtotal, currency)}
                </Text>
              </Column>
            </Row>
            {discount_total > 0 && (
              <Row style={totalRow}>
                <Column>
                  <Text style={totalLabel}>Remise</Text>
                </Column>
                <Column style={totalValueCell}>
                  <Text style={discountValue}>
                    −{formatPrice(discount_total, currency)}
                  </Text>
                </Column>
              </Row>
            )}
            <Row style={totalRow}>
              <Column>
                <Text style={totalLabel}>Retrait en magasin</Text>
              </Column>
              <Column style={totalValueCell}>
                <Text style={totalValue}>
                  {shipping_total === 0
                    ? "Gratuit"
                    : formatPrice(shipping_total, currency)}
                </Text>
              </Column>
            </Row>
            {tax_breakdown
              .filter((row) => row.amount > 0)
              .map((row) => (
                <Row key={row.rate} style={totalRow}>
                  <Column>
                    <Text style={taxInfoLabel}>dont TVA ({row.rate} %)</Text>
                  </Column>
                  <Column style={totalValueCell}>
                    <Text style={taxInfoValue}>
                      {formatPrice(row.amount, currency)}
                    </Text>
                  </Column>
                </Row>
              ))}
            <Hr style={totalDivider} />
            <Row style={totalRow}>
              <Column>
                <Text style={grandTotalLabel}>Total</Text>
              </Column>
              <Column style={totalValueCell}>
                <Text style={grandTotalValue}>
                  {formatPrice(total, currency)}
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Pickup location */}
          <Hr style={divider} />
          <Section style={section}>
            <Heading style={h2}>Lieu de retrait</Heading>
            <Text style={addressText}>Kim-Hi Noodle</Text>
            <Text style={addressText}>652 Avenue de l'Europe</Text>
            <Text style={addressText}>34170 Castelnau-le-Lez</Text>
          </Section>

          {/* Billing address */}
          {shipping_address && (
            <>
              <Hr style={divider} />
              <Section style={section}>
                <Heading style={h2}>Adresse de facturation</Heading>
                <Text style={addressText}>
                  {[shipping_address.first_name, shipping_address.last_name]
                    .filter(Boolean)
                    .join(" ")}
                </Text>
                {shipping_address.address_1 && (
                  <Text style={addressText}>{shipping_address.address_1}</Text>
                )}
                {shipping_address.address_2 && (
                  <Text style={addressText}>{shipping_address.address_2}</Text>
                )}
                {(shipping_address.postal_code || shipping_address.city) && (
                  <Text style={addressText}>
                    {[shipping_address.postal_code, shipping_address.city]
                      .filter(Boolean)
                      .join(" ")}
                  </Text>
                )}
                {shipping_address.country_code && (
                  <Text style={addressText}>
                    {countryName(shipping_address.country_code)}
                  </Text>
                )}
                {shipping_address.phone && (
                  <Text style={addressText}>{shipping_address.phone}</Text>
                )}
              </Section>
            </>
          )}

          {/* Support */}
          <Hr style={divider} />
          <Section style={supportSection}>
            <Text style={supportText}>
              Des questions ? Notre équipe est là pour vous aider.
            </Text>
            <Text style={supportText}>
              Répondez simplement à cet email ou contactez notre support.
            </Text>
          </Section>
        </Container>

        {/* Footer */}
        <Section style={footer}>
          <Container style={footerInner}>
            <Text style={footerText}>
              © {new Date().getFullYear()} Kim-Hi Noodle. Tous droits réservés.
            </Text>
            <Text style={footerText}>
              Vous recevez cet email car vous avez passé une commande sur notre
              site.
            </Text>
          </Container>
        </Section>
      </Body>
    </Html>
  );
}

// Styles
const body: React.CSSProperties = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: 0,
  padding: 0,
};

const header: React.CSSProperties = {
  backgroundColor: "#111827",
  padding: "24px 0",
};

const headerInner: React.CSSProperties = {
  maxWidth: "600px",
  margin: "0 auto",
  padding: "0 24px",
};

const brandName: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "20px",
  fontWeight: "700",
  margin: 0,
  letterSpacing: "-0.3px",
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  maxWidth: "600px",
  margin: "0 auto",
  borderRadius: "0 0 8px 8px",
  overflow: "hidden",
};

const hero: React.CSSProperties = {
  padding: "40px 40px 24px",
};

const h1: React.CSSProperties = {
  fontSize: "26px",
  fontWeight: "700",
  color: "#111827",
  margin: "0 0 16px",
  lineHeight: "1.3",
};

const heroText: React.CSSProperties = {
  fontSize: "15px",
  color: "#4b5563",
  lineHeight: "1.6",
  margin: "0 0 8px",
};

const orderBadge: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  margin: "0 40px 24px",
  padding: "0",
  border: "1px solid #e5e7eb",
};

const orderBadgeCell: React.CSSProperties = {
  padding: "16px 20px",
  textAlign: "center",
  borderRight: "1px solid #e5e7eb",
  width: "33.33%",
};

const orderBadgeLabel: React.CSSProperties = {
  fontSize: "11px",
  color: "#9ca3af",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  margin: "0 0 4px",
  fontWeight: "600",
};

const orderBadgeValue: React.CSSProperties = {
  fontSize: "14px",
  color: "#111827",
  fontWeight: "600",
  margin: 0,
};

const section: React.CSSProperties = {
  padding: "24px 40px",
};

const h2: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#111827",
  margin: "0 0 16px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const divider: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "0 40px",
};

const itemRow: React.CSSProperties = {
  marginBottom: "16px",
};

const itemImageCell: React.CSSProperties = {
  width: "80px",
  verticalAlign: "top",
  paddingRight: "16px",
};

const itemImage: React.CSSProperties = {
  borderRadius: "6px",
  objectFit: "cover",
  border: "1px solid #e5e7eb",
};

const itemImagePlaceholder: React.CSSProperties = {
  width: "64px",
  height: "64px",
  backgroundColor: "#f3f4f6",
  borderRadius: "6px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const itemImagePlaceholderText: React.CSSProperties = {
  fontSize: "24px",
  margin: 0,
  textAlign: "center",
  lineHeight: "64px",
};

const itemDetails: React.CSSProperties = {
  verticalAlign: "top",
};

const itemTitle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#111827",
  margin: "0 0 2px",
};

const itemVariant: React.CSSProperties = {
  fontSize: "13px",
  color: "#6b7280",
  margin: "0 0 4px",
};

const itemQty: React.CSSProperties = {
  fontSize: "13px",
  color: "#9ca3af",
  margin: 0,
};

const itemPriceCell: React.CSSProperties = {
  textAlign: "right",
  verticalAlign: "top",
  whiteSpace: "nowrap",
};

const itemPrice: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#111827",
  margin: "0 0 2px",
};

const itemUnitPrice: React.CSSProperties = {
  fontSize: "12px",
  color: "#9ca3af",
  margin: 0,
};

const totalRow: React.CSSProperties = {
  marginBottom: "8px",
};

const totalLabel: React.CSSProperties = {
  fontSize: "14px",
  color: "#4b5563",
  margin: 0,
};

const totalValueCell: React.CSSProperties = {
  textAlign: "right",
};

const totalValue: React.CSSProperties = {
  fontSize: "14px",
  color: "#111827",
  margin: 0,
};

const discountValue: React.CSSProperties = {
  fontSize: "14px",
  color: "#059669",
  margin: 0,
};

const totalDivider: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "12px 0",
};

const grandTotalLabel: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: "700",
  color: "#111827",
  margin: 0,
};

const grandTotalValue: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: "700",
  color: "#111827",
  margin: 0,
};

const addressText: React.CSSProperties = {
  fontSize: "14px",
  color: "#374151",
  margin: "0 0 2px",
  lineHeight: "1.6",
};

const supportSection: React.CSSProperties = {
  padding: "24px 40px 32px",
  textAlign: "center",
};

const supportText: React.CSSProperties = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0 0 4px",
};

const footer: React.CSSProperties = {
  padding: "24px 0",
};

const footerInner: React.CSSProperties = {
  maxWidth: "600px",
  margin: "0 auto",
  padding: "0 24px",
  textAlign: "center",
};

const footerText: React.CSSProperties = {
  fontSize: "12px",
  color: "#9ca3af",
  margin: "0 0 4px",
  lineHeight: "1.5",
};

const taxInfoLabel: React.CSSProperties = {
  fontSize: "12px",
  color: "#9ca3af",
  margin: 0,
  fontStyle: "italic",
};

const taxInfoValue: React.CSSProperties = {
  fontSize: "12px",
  color: "#9ca3af",
  margin: 0,
  fontStyle: "italic",
};
