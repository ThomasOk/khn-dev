import { Metadata } from "next"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import LegalPageLayout from "@modules/legal/components/legal-page-layout"
import LegalSection from "@modules/legal/components/legal-section"
import Pending from "@modules/legal/components/pending"

export const metadata: Metadata = {
  title: "Conditions générales de vente — Kim-Hi Noodle",
  description: "Conditions générales de vente du site kim-hi-noodle.fr.",
}

export default function TermsOfSalePage() {
  return (
    <LegalPageLayout
      title="Conditions générales de vente"
      lastUpdated="24 juillet 2026"
    >
      <LegalSection title="Article 1 — Champ d'application">
        <p>
          Les présentes conditions générales de vente (CGV) s&apos;appliquent à
          toute commande passée sur le site kim-hi-noodle.fr par un client (le «
          Client ») auprès de CHOUR (le « Vendeur », mentions légales
          disponibles{" "}
          <LocalizedClientLink
            href="/legal-notice"
            className="text-khn-gold underline underline-offset-2"
          >
            ici
          </LocalizedClientLink>
          ), pour la vente de produits alimentaires et de boissons destinés à
          être retirés sur place (click &amp; collect) au restaurant Kim-Hi
          Noodle, 652 Avenue de l&apos;Europe, 34170 Castelnau-le-Lez.
        </p>
      </LegalSection>

      <LegalSection title="Article 2 — Produits">
        <p>
          Les produits proposés à la vente sont ceux figurant sur le site au
          jour de la consultation, dans la limite des stocks disponibles. Les
          photographies illustrant les produits n&apos;ont pas de valeur
          contractuelle.
        </p>
      </LegalSection>

      <LegalSection title="Article 3 — Compte client">
        <p>
          La commande en ligne nécessite la création d&apos;un compte client,
          avec les informations suivantes : prénom, nom, adresse email, numéro
          de téléphone. Le Client s&apos;engage à fournir des informations
          exactes et à préserver la confidentialité de son mot de passe. CHOUR
          ne pourra être tenu responsable d&apos;un accès non autorisé résultant
          d&apos;une négligence du Client.
        </p>
      </LegalSection>

      <LegalSection title="Article 4 — Commande">
        <p>
          Le Client sélectionne ses produits, valide son panier, procède au
          paiement en ligne puis retire sa commande le jour même, aux horaires
          d&apos;ouverture à emporter, sur présentation du numéro de commande
          reçu par email.
        </p>
      </LegalSection>

      <LegalSection title="Article 5 — Prix">
        <p>Les prix sont indiqués en euros, toutes taxes comprises (TTC).</p>
      </LegalSection>

      <LegalSection title="Article 6 — Paiement">
        <p>
          Le paiement en ligne s&apos;effectue par carte bancaire via un
          prestataire de paiement sécurisé (Stripe). Le règlement sur place peut
          également être effectué en espèces, par carte bancaire ou par
          titre-restaurant, selon les modalités en vigueur au restaurant.
        </p>
      </LegalSection>

      <LegalSection title="Article 7 — Droit de rétractation">
        <p>
          Conformément à l&apos;article L. 221-28, 5° du Code de la
          consommation, le droit de rétractation ne s&apos;applique pas aux
          contrats de fourniture de denrées alimentaires périssables. En
          conséquence, aucune commande validée et payée ne peut faire
          l&apos;objet d&apos;une rétractation, d&apos;une annulation, d&apos;un
          remboursement ou d&apos;un échange, sauf non-conformité du produit
          remis au Client.
        </p>
      </LegalSection>

      <LegalSection title="Article 8 — Non-retrait de commande">
        <p>
          Toute commande non retirée aux horaires convenus reste due dans son
          intégralité et ne donne lieu à aucun remboursement.
        </p>
      </LegalSection>

      <LegalSection title="Article 9 — Réclamations">
        <p>
          Toute réclamation relative à la conformité d&apos;un produit doit être
          adressée à CHOUR dans un délai de 48 heures suivant le retrait, par
          email à{" "}
          <a
            href="mailto:contact@kim-hi-noodle.fr"
            className="text-khn-gold underline underline-offset-2"
          >
            contact@kim-hi-noodle.fr
          </a>{" "}
          ou par courrier à l&apos;adresse du restaurant.
        </p>
      </LegalSection>

      <LegalSection title="Article 10 — Vente d'alcool">
        <p>
          La vente d&apos;alcool est interdite aux mineurs. CHOUR se réserve le
          droit de demander une pièce d&apos;identité lors du retrait de toute
          commande incluant une boisson alcoolisée, et de refuser la remise en
          cas de doute sur la majorité du Client.
        </p>
      </LegalSection>

      <LegalSection title="Article 11 — Données personnelles">
        <p>
          Les données personnelles collectées sont traitées conformément à la{" "}
          <LocalizedClientLink
            href="/privacy-policy"
            className="text-khn-gold underline underline-offset-2"
          >
            politique de confidentialité
          </LocalizedClientLink>
          .
        </p>
      </LegalSection>

      <LegalSection title="Article 12 — Droit applicable et juridiction">
        <p>
          Les présentes CGV sont soumises au droit français. À défaut de
          résolution amiable, le litige est porté devant la juridiction
          compétente selon les règles de droit commun applicables aux
          consommateurs.
        </p>
      </LegalSection>

      {/* <LegalSection title="Article 13 — Médiation de la consommation">
        <p>
          Conformément aux articles L. 616-1 et suivants du Code de la
          consommation, le Client consommateur peut recourir gratuitement à
          un médiateur de la consommation en cas de litige non résolu
          directement avec CHOUR.{" "}
          <Pending>
            Nom et coordonnées du médiateur à compléter.
          </Pending>
        </p>
      </LegalSection> */}
    </LegalPageLayout>
  )
}
