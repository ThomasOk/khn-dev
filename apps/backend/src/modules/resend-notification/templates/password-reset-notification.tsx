import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

export type PasswordResetNotificationEmailProps = {
  reset_url: string;
};

export default function PasswordResetNotificationEmail({
  reset_url,
}: PasswordResetNotificationEmailProps) {
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>Réinitialisez votre mot de passe Kim-Hi Noodle</Preview>
      <Body style={body}>
        <Section style={header}>
          <Container style={headerInner}>
            <Text style={brandName}>Kim-Hi Noodle</Text>
          </Container>
        </Section>

        <Container style={container}>
          <Section style={hero}>
            <Heading style={h1}>Réinitialisation du mot de passe</Heading>
            <Text style={heroText}>
              Une demande de réinitialisation de mot de passe a été faite pour
              ce compte. Cliquez sur le bouton ci-dessous pour choisir un
              nouveau mot de passe.
            </Text>
            <Button style={resetButton} href={reset_url}>
              Réinitialiser mon mot de passe
            </Button>
            <Text style={smallText}>
              Ce lien expire dans 15 minutes. Si vous n&apos;êtes pas à
              l&apos;origine de cette demande, ignorez cet email : votre mot
              de passe reste inchangé.
            </Text>
          </Section>
        </Container>

        <Section style={footer}>
          <Container style={footerInner}>
            <Text style={footerText}>
              © {new Date().getFullYear()} Kim-Hi Noodle. Tous droits réservés.
            </Text>
          </Container>
        </Section>
      </Body>
    </Html>
  );
}

// Styles — same palette as the other templates in this module.
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
  padding: "40px 40px 32px",
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
  margin: "0 0 24px",
};

const resetButton: React.CSSProperties = {
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

const smallText: React.CSSProperties = {
  fontSize: "13px",
  color: "#9ca3af",
  lineHeight: "1.6",
  margin: "24px 0 0",
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
