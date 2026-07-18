import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

// Distinct from order-confirmation.tsx by design (spec §"Deux emails au
// client") — this one fires at payment.captured and carries the Facture,
// never the order-placed confirmation.
export type InvoiceNotificationEmailProps = {
  order_id: string | number;
  formatted_number: string;
};

export default function InvoiceNotificationEmail({
  order_id,
  formatted_number,
}: InvoiceNotificationEmailProps) {
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>{`Votre facture ${formatted_number} — commande #${String(order_id)}`}</Preview>
      <Body style={body}>
        <Section style={header}>
          <Container style={headerInner}>
            <Text style={brandName}>Kim-Hi Noodle</Text>
          </Container>
        </Section>

        <Container style={container}>
          <Section style={hero}>
            <Heading style={h1}>Votre facture</Heading>
            <Text style={heroText}>
              Merci pour votre commande. Votre facture est en pièce jointe, au format PDF.
            </Text>
          </Section>

          <Hr style={divider} />

          <Section style={section}>
            <Text style={label}>Commande</Text>
            <Text style={value}>#{order_id}</Text>
          </Section>

          <Hr style={divider} />

          <Section style={section}>
            <Text style={label}>Numéro de facture</Text>
            <Text style={valueEmphasis}>{formatted_number}</Text>
          </Section>
        </Container>

        <Section style={footer}>
          <Container style={footerInner}>
            <Text style={footerText}>
              © {new Date().getFullYear()} Kim-Hi Noodle.
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
  margin: 0,
};

const divider: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "0 40px",
};

const section: React.CSSProperties = {
  padding: "20px 40px",
};

const label: React.CSSProperties = {
  fontSize: "11px",
  color: "#9ca3af",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  margin: "0 0 4px",
  fontWeight: "600",
};

const value: React.CSSProperties = {
  fontSize: "16px",
  color: "#111827",
  fontWeight: "600",
  margin: 0,
};

const valueEmphasis: React.CSSProperties = {
  fontSize: "20px",
  color: "#111827",
  fontWeight: "700",
  margin: 0,
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
  margin: 0,
  lineHeight: "1.5",
};
