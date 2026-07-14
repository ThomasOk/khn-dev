import { medusaIntegrationTestRunner } from "@medusajs/test-utils"

// Le runner crée la base, y joue toutes les migrations Medusa et démarre l'app :
// le premier passage dépasse largement les 5 s par défaut de Jest.
jest.setTimeout(60 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, dbConnection, dbConfig }) => {
    describe("bootstrap du runner d'intégration HTTP", () => {
      it("sert l'application Medusa en HTTP", async () => {
        const response = await api.get("/health")

        expect(response.status).toEqual(200)
      })

      it("tourne sur une base Postgres jetable, migrée, distincte de la base de dev", async () => {
        const { rows } = await dbConnection.raw(
          "select current_database() as name"
        )
        const baseCourante = rows[0].name
        const baseDeDev = new URL(process.env.DATABASE_URL!).pathname.slice(1)

        expect(baseCourante).toEqual(dbConfig.dbName)
        expect(baseCourante).not.toEqual(baseDeDev)

        const { rows: tables } = await dbConnection.raw(
          "select table_name from information_schema.tables where table_schema = 'public' and table_name = 'product'"
        )

        expect(tables).toHaveLength(1)
      })
    })
  },
})
