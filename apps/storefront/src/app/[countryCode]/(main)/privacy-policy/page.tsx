import { Metadata } from "next"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import LegalPageLayout from "@modules/legal/components/legal-page-layout"
import LegalSection from "@modules/legal/components/legal-section"

export const metadata: Metadata = {
  title: "Politique de confidentialité — Kim-Hi Noodle",
  description: "Politique de confidentialité du site kim-hi-noodle.fr.",
}

const dataTable = [
  {
    data: "Prénom, nom, email, téléphone",
    source: "Création de compte client",
    purpose: "Gestion du compte et des commandes",
    basis: "Exécution du contrat",
  },
  {
    data: "Email, téléphone",
    source: "Formulaire de réservation de table",
    purpose: "Traitement de la réservation, contact en cas d'imprévu",
    basis: "Exécution du contrat",
  },
  {
    data: "Données de paiement (carte bancaire)",
    source: "Paiement en ligne",
    purpose: "Traitement de la transaction",
    basis: "Transmises directement à Stripe, non stockées par CHOUR — exécution du contrat",
  },
  {
    data: "Identifiant de panier, jeton de connexion",
    source: "Cookies techniques (_medusa_cart_id, _medusa_jwt, _medusa_cache_id)",
    purpose: "Fonctionnement du site (panier, connexion, cache)",
    basis: "Intérêt légitime — cookies strictement nécessaires, exemptés de consentement",
  },
  {
    data: "Identifiants anti-fraude (__stripe_mid, __stripe_sid)",
    source: "Cookies déposés par Stripe sur la page de paiement",
    purpose: "Prévention de la fraude au paiement",
    basis: "Intérêt légitime — cookies strictement nécessaires, exemptés de consentement",
  },
]

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      title="Politique de confidentialité"
      lastUpdated="9 août 2026"
    >
      <LegalSection title="Responsable du traitement">
        <p>
          CHOUR, 652 Avenue de l&apos;Europe, 34170 Castelnau-le-Lez —{" "}
          <a
            href="mailto:contact@kim-hi-noodle.fr"
            className="text-khn-gold underline underline-offset-2"
          >
            contact@kim-hi-noodle.fr
          </a>
          . Voir les{" "}
          <LocalizedClientLink
            href="/legal-notice"
            className="text-khn-gold underline underline-offset-2"
          >
            mentions légales
          </LocalizedClientLink>{" "}
          pour l&apos;identité complète.
        </p>
      </LegalSection>

      <LegalSection title="Données collectées et finalités">
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="border-b border-stone-300">
                <th className="py-2 px-2 font-medium text-stone-800">
                  Donnée
                </th>
                <th className="py-2 px-2 font-medium text-stone-800">
                  Collectée via
                </th>
                <th className="py-2 px-2 font-medium text-stone-800">
                  Finalité
                </th>
                <th className="py-2 px-2 font-medium text-stone-800">
                  Base légale
                </th>
              </tr>
            </thead>
            <tbody>
              {dataTable.map((row) => (
                <tr key={row.data} className="border-b border-stone-200 align-top">
                  <td className="py-3 px-2">{row.data}</td>
                  <td className="py-3 px-2">{row.source}</td>
                  <td className="py-3 px-2">{row.purpose}</td>
                  <td className="py-3 px-2">{row.basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection title="Destinataires des données">
        <ul className="list-disc list-outside pl-5 flex flex-col gap-2">
          <li>Le personnel habilité de CHOUR (gestion des commandes et réservations).</li>
          <li>Stripe (prestataire de paiement), pour le traitement des transactions.</li>
          <li>Vercel Inc., pour l&apos;hébergement du site.</li>
          <li>
            Railway Corporation, pour l&apos;hébergement du serveur
            d&apos;application et des bases de données.
          </li>
          <li>
            Cloudflare, Inc., pour le stockage des images et documents (dont
            les factures).
          </li>
          <li>
            Plus Five Five, Inc. (Resend), pour l&apos;envoi des emails
            transactionnels (confirmation de commande, réinitialisation de
            mot de passe, etc.).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Durée de conservation">
        <ul className="list-disc list-outside pl-5 flex flex-col gap-2">
          <li>
            Compte client : 3 ans à compter de la dernière commande ou
            connexion, puis suppression.
          </li>
          <li>
            Réservation de table : 1 an après la date de la réservation, puis
            suppression.
          </li>
          <li>
            Commandes et factures : 10 ans, au titre des obligations
            comptables (article L123-22 du Code de commerce).
          </li>
          <li>Données de paiement : non conservées par CHOUR (gérées par Stripe).</li>
        </ul>
      </LegalSection>

      <LegalSection title="Transferts hors Union européenne">
        <p>
          Vercel Inc., Railway Corporation, Cloudflare, Inc. et Plus Five
          Five, Inc. (Resend) sont des sociétés américaines. Les données
          qu&apos;elles sont amenées à traiter dans le cadre de
          l&apos;hébergement et du fonctionnement du site le sont dans le
          cadre de garanties contractuelles (clauses contractuelles types de
          la Commission européenne).
        </p>
        <p>
          Il en va de même pour Stripe (société américaine), pour le
          traitement des transactions de paiement.
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          Le site utilise uniquement des cookies strictement nécessaires à
          son fonctionnement (panier, authentification, cache serveur) et à
          la prévention de la fraude au paiement (déposés par Stripe sur la
          page de paiement). Aucun cookie de mesure d&apos;audience ou
          publicitaire n&apos;est déposé à ce jour. Si un outil
          d&apos;analytics ou de suivi publicitaire est ajouté par la suite,
          cette politique sera mise à jour et un recueil de consentement
          conforme sera mis en place avant leur dépôt.
        </p>
      </LegalSection>

      <LegalSection title="Droits des personnes">
        <p>
          Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès,
          de rectification, d&apos;effacement, de limitation,
          d&apos;opposition et de portabilité de vos données, ainsi que du
          droit d&apos;introduire une réclamation auprès de la CNIL
          (cnil.fr). Pour exercer ces droits, contactez{" "}
          <a
            href="mailto:contact@kim-hi-noodle.fr"
            className="text-khn-gold underline underline-offset-2"
          >
            contact@kim-hi-noodle.fr
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageLayout>
  )
}
