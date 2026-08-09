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
    <LegalPageLayout title="Mentions légales" lastUpdated="9 août 2026">
      <LegalSection title="Éditeur du site">
        <p>Le site kim-hi-noodle.fr est édité par :</p>
        <div className="flex flex-col gap-3">
          <div>
            <p className="font-medium text-stone-800">Dénomination sociale</p>
            <p>CHOUR</p>
          </div>
          <div>
            <p className="font-medium text-stone-800">Forme juridique</p>
            <p>Société par actions simplifiée (SAS)</p>
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
              className="transition-colors duration-200 [@media(hover:hover)]:hover:text-khn-gold"
            >
              09 73 89 60 13
            </a>
          </div>
          <div>
            <p className="font-medium text-stone-800">Email</p>
            <a
              href="mailto:contact@kim-hi-noodle.fr"
              className="transition-colors duration-200 [@media(hover:hover)]:hover:text-khn-gold"
            >
              contact@kim-hi-noodle.fr
            </a>
          </div>
          <div>
            <p className="font-medium text-stone-800">
              Directeur de la publication
            </p>
            <p>Philippe OK, Président de CHOUR</p>
          </div>
        </div>
      </LegalSection>

      <LegalSection title="Hébergement">
        <p>
          Le site est hébergé par plusieurs prestataires, conformément à
          l&apos;article 6-III de la loi n°2004-575 du 21 juin 2004 pour la
          confiance dans l&apos;économie numérique (LCEN) :
        </p>
        <ul className="list-disc list-outside pl-5 flex flex-col gap-2">
          <li>
            <span className="font-medium text-stone-800">Vercel Inc.</span>{" "}
            (site web) — 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis
          </li>
          <li>
            <span className="font-medium text-stone-800">
              Railway Corporation
            </span>{" "}
            (serveur d&apos;application et bases de données) — 548 Market St PMB
            68956, San Francisco, CA 94104, États-Unis
          </li>
          <li>
            <span className="font-medium text-stone-800">Cloudflare, Inc.</span>{" "}
            (stockage des images et documents) — 101 Townsend Street, San
            Francisco, CA 94107, États-Unis
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          L&apos;ensemble des contenus du site (textes, photographies, logo,
          charte graphique) est la propriété de CHOUR ou de ses partenaires,
          sauf mention contraire. Toute reproduction, représentation,
          modification ou exploitation, totale ou partielle, sans autorisation
          préalable, est interdite.
        </p>
      </LegalSection>

      <LegalSection title="Données personnelles">
        <p>
          Le traitement des données personnelles collectées sur le site est
          décrit dans la{" "}
          <LocalizedClientLink
            href="/privacy-policy"
            className="text-khn-gold underline underline-offset-2"
          >
            politique de confidentialité
          </LocalizedClientLink>
          .
        </p>
      </LegalSection>

      {/* <LegalSection title="Médiation de la consommation">
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
      </LegalSection> */}
    </LegalPageLayout>
  )
}
