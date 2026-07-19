import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import {
  formatReservationDateLong,
  formatReservationTime,
} from "../../../lib/reservation/format-reservation";

export type TableReservationConfirmationEmailProps = {
  customer_name: string;
  // Civil "YYYY-MM-DD" / "HH:MM" — see TableReservation model.
  date: string;
  time: string;
  party_size: number;
  restaurant_phone: string;
  cancellation_url: string;
};

export default function TableReservationConfirmationEmail({
  customer_name,
  date,
  time,
  party_size,
  restaurant_phone,
  cancellation_url,
}: TableReservationConfirmationEmailProps) {
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>{`Votre réservation du ${formatReservationDateLong(date)} à ${formatReservationTime(time)} est confirmée`}</Preview>
      <Body style={body}>
        <Section style={header}>
          <Container style={headerInner}>
            <Text style={brandName}>Kim-Hi Noodle</Text>
          </Container>
        </Section>

        <Container style={container}>
          <Section style={hero}>
            <Heading style={h1}>Réservation confirmée</Heading>
            <Text style={heroText}>Bonjour {customer_name},</Text>
            <Text style={heroText}>
              Votre table est réservée chez Kim-Hi Noodle. À bientôt !
            </Text>
          </Section>

          <Section style={badge}>
            <Row>
              <Column style={badgeCell}>
                <Text style={badgeLabel}>Date</Text>
                <Text style={badgeValue}>{formatReservationDateLong(date)}</Text>
              </Column>
              <Column style={badgeCell}>
                <Text style={badgeLabel}>Heure</Text>
                <Text style={badgeValue}>{formatReservationTime(time)}</Text>
              </Column>
              <Column style={badgeCellLast}>
                <Text style={badgeLabel}>Couverts</Text>
                <Text style={badgeValue}>{party_size}</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={divider} />

          <Section style={section}>
            <Heading style={h2}>Besoin de changer</Heading>
            <Text style={bodyText}>
              Le groupe s'agrandit ? Annulez cette réservation puis reprenez
              un créneau — ou, plus simple, appelez-nous directement au{" "}
              <strong>{restaurant_phone}</strong>.
            </Text>
            <Button style={cancelButton} href={cancellation_url}>
              Annuler ma réservation
            </Button>
          </Section>

          <Hr style={divider} />

          <Section style={section}>
            <Heading style={h2}>Lieu</Heading>
            <Text style={addressText}>Kim-Hi Noodle</Text>
            <Text style={addressText}>652 Avenue de l'Europe</Text>
            <Text style={addressText}>34170 Castelnau-le-Lez</Text>
          </Section>
        </Container>

        <Section style={footer}>
          <Container style={footerInner}>
            <Text style={footerText}>
              © {new Date().getFullYear()} Kim-Hi Noodle. Tous droits réservés.
            </Text>
            <Text style={footerText}>
              Conservez cet email : il contient votre lien d'annulation.
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

const badge: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  margin: "0 40px 24px",
  padding: "0",
  border: "1px solid #e5e7eb",
};

const badgeCell: React.CSSProperties = {
  padding: "16px 20px",
  textAlign: "center",
  borderRight: "1px solid #e5e7eb",
  width: "33.33%",
};

const badgeCellLast: React.CSSProperties = {
  padding: "16px 20px",
  textAlign: "center",
  width: "33.33%",
};

const badgeLabel: React.CSSProperties = {
  fontSize: "11px",
  color: "#9ca3af",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  margin: "0 0 4px",
  fontWeight: "600",
};

const badgeValue: React.CSSProperties = {
  fontSize: "14px",
  color: "#111827",
  fontWeight: "600",
  margin: 0,
};

const divider: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "0 40px",
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

const bodyText: React.CSSProperties = {
  fontSize: "14px",
  color: "#4b5563",
  lineHeight: "1.6",
  margin: "0 0 16px",
};

const cancelButton: React.CSSProperties = {
  backgroundColor: "#111827",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center",
  display: "inline-block",
  padding: "12px 20px",
};

const addressText: React.CSSProperties = {
  fontSize: "14px",
  color: "#374151",
  margin: "0 0 2px",
  lineHeight: "1.6",
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
