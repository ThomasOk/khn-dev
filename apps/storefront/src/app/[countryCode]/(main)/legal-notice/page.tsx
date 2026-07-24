import { Metadata } from "next"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import LegalPageLayout from "@modules/legal/components/legal-page-layout"
import LegalSection from "@modules/legal/components/legal-section"
import Pending from "@modules/legal/components/pending"

export const metadata: Metadata = {
  title: "Mentions légales — Kim-Hi Noodle",
  description: "Mentions légales du site kim-hi-noodle.fr.",
}

export default function LegalNoticePage() {
  return (
    <LegalPageLayout title="Mentions légales" lastUpdated="24 juillet 2026">
      <LegalSection title="Éditeur du site">
        <p>Le site kim-hi-noodle.fr est édité par :</p>
        <div className="flex flex-col gap-3">
          <div>
            <p className="font-medium text-stone-800">Dénomination sociale</p>
            <p>CHOUR</p>
          </div>
          <div>
            <p className="font-medium text-stone-800">Forme juridique</p>
            <p>
              <Pending>À compléter</Pending>
            </p>
          </div>
          <div>
            <p className="font-medium text-stone-800">Siège social</p>
            <p>
              652 Avenue de l&apos;Europe
              <br />
              34170 Castelnau-le-Lez
            </p>
          </div>
          <div>
            <p className="font-medium text-stone-800">SIRET</p>
            <p>904 222 353 — RCS Montpellier</p>
          </div>
          <div>
            <p className="font-medium text-stone-800">
              N° de TVA intracommunautaire
            </p>
            <p>FR88 904222353</p>
          </div>
          <div>
            <p className="font-medium text-stone-800">Téléphone</p>
            <a
              href="tel:0973896013"
              className="transition-colors duration-200 [@media(hover:hover)]:hover:text-orange-600"
            >
              09 73 89 60 13
            </a>
          </div>
          <div>
            <p className="font-medium text-stone-800">Email</p>
            <a
              href="mailto:contact@kim-hi-noodle.fr"
              className="transition-colors duration-200 [@media(hover:hover)]:hover:text-orange-600"
            >
              contact@kim-hi-noodle.fr
            </a>
          </div>
          <div>
            <p className="font-medium text-stone-800">
              Directeur de la publication
            </p>
            <p>
              <Pending>À compléter</Pending>
            </p>
          </div>
        </div>
      </LegalSection>

      <LegalSection title="Hébergement">
        <p>
          <Pending>
            À compléter dès que l&apos;hébergeur du nouveau site sera choisi
            (nom, adresse, téléphone), conformément à l&apos;article 6-III de
            la loi n°2004-575 du 21 juin 2004 pour la confiance dans
            l&apos;économie numérique (LCEN).
          </Pending>
        </p>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          L&apos;ensemble des contenus du site (textes, photographies, logo,
          charte graphique) est la propriété de CHOUR ou de ses partenaires,
          sauf mention contraire. Toute reproduction, représentation,
          modification ou exploitation, totale ou partielle, sans
          autorisation préalable, est interdite.
        </p>
      </LegalSection>

      <LegalSection title="Données personnelles">
        <p>
          Le traitement des données personnelles collectées sur le site est
          décrit dans la{" "}
          <LocalizedClientLink
            href="/privacy-policy"
            className="text-orange-600 underline underline-offset-2"
          >
            politique de confidentialité
          </LocalizedClientLink>
          .
        </p>
      </LegalSection>

      <LegalSection title="Médiation de la consommation">
        <p>
          Conformément aux articles L. 616-1 et R. 616-1 du Code de la
          consommation, tout client consommateur dispose du droit de
          recourir gratuitement à un médiateur de la consommation en vue de
          la résolution amiable d&apos;un litige.
        </p>
        <p>
          <Pending>
            À compléter — nom et coordonnées du médiateur de la consommation.
          </Pending>
        </p>
      </LegalSection>
    </LegalPageLayout>
  )
}
