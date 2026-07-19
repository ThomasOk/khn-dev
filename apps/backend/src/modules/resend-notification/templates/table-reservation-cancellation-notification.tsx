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
import {
  formatReservationDateLong,
  formatReservationTime,
} from "../../../lib/reservation/format-reservation";

export type TableReservationCancellationNotificationEmailProps = {
  customer_name: string;
  customer_phone: string;
  date: string;
  time: string;
  party_size: number;
};

// The most useful of the two restaurant emails (ticket 06): it changes a
// Feuille de service that may already be printed, unlike a fresh
// réservation, which is good news with no urgency. The red banner is
// deliberate — this is the one email in the module meant to stand out in an
// inbox at a glance.
export default function TableReservationCancellationNotificationEmail({
  customer_name,
  customer_phone,
  date,
  time,
  party_size,
}: TableReservationCancellationNotificationEmailProps) {
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>{`Annulation — ${customer_name} — ${formatReservationDateLong(date)} ${formatReservationTime(time)}`}</Preview>
      <Body style={body}>
        <Section style={header}>
          <Container style={headerInner}>
            <Text style={brandName}>Kim-Hi Noodle</Text>
          </Container>
        </Section>

        <Container style={container}>
          <Section style={alertBanner}>
            <Text style={alertText}>Table libérée</Text>
          </Section>

          <Section style={hero}>
            <Heading style={h1}>Réservation annulée</Heading>
          </Section>

          <Hr style={divider} />

          <Section style={section}>
            <Text style={label}>Client</Text>
            <Text style={value}>{customer_name}</Text>
            <Text style={subvalue}>{customer_phone}</Text>
          </Section>

          <Hr style={divider} />

          <Section style={section}>
            <Text style={label}>Créneau libéré</Text>
            <Text style={valueEmphasis}>
              {formatReservationDateLong(date)} · {formatReservationTime(time)}
            </Text>
          </Section>

          <Hr style={divider} />

          <Section style={section}>
            <Text style={label}>Couverts</Text>
            <Text style={valueEmphasis}>{party_size}</Text>
          </Section>
        </Container>

        <Section style={footer}>
          <Container style={footerInner}>
            <Text style={footerText}>© {new Date().getFullYear()} Kim-Hi Noodle.</Text>
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

const alertBanner: React.CSSProperties = {
  backgroundColor: "#dc2626",
  padding: "10px 40px",
};

const alertText: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  margin: 0,
  textAlign: "center",
};

const hero: React.CSSProperties = {
  padding: "24px 40px 8px",
};

const h1: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: "700",
  color: "#111827",
  margin: 0,
  lineHeight: "1.3",
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

const subvalue: React.CSSProperties = {
  fontSize: "13px",
  color: "#6b7280",
  margin: "2px 0 0",
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
