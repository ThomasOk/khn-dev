// Premier test unitaire du repo : il ne prouve rien du domaine, il prouve que le
// runner unitaire est branché — que `TEST_TYPE=unit` sélectionne bien ce fichier et
// que la transformation TypeScript (@swc/jest) tourne. Les vrais tests unitaires
// arrivent avec `deriverCreneaux` ; ce fichier peut disparaître à ce moment-là.

type Creneau = {
  debut: string
  fin: string
}

const premierCreneau = async (creneaux: Creneau[]): Promise<Creneau | undefined> =>
  creneaux[0]

describe("bootstrap du runner unitaire", () => {
  it("s'exécute sous TEST_TYPE=unit", () => {
    expect(process.env.TEST_TYPE).toEqual("unit")
  })

  it("transforme le TypeScript et attend les promesses", async () => {
    const creneau = await premierCreneau([{ debut: "12:00", fin: "12:15" }])

    expect(creneau).toEqual({ debut: "12:00", fin: "12:15" })
  })
})
