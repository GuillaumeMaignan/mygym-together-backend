var app = require("../app");
var request = require("supertest");
const mongoose = require("mongoose");

describe("Connection test", () => {
  test("test signIn avec compte existant en base et bon mot de passe", async () => {
    await request(app)
      .post("/users/sign-In")
      .send({
        // ne pas oublier un espace après le .com
        // dans la base de données, cet user comprend un espace après le .com
        emailFromFront: "marindanger@gmail.com ",
        passwordFromFront: "aze",
      })
      .expect(200)
      .expect("content-Type", /json/)
      .then((response) => {
        expect(response.body.token).toEqual("NcEBKrmBZEQsPCUsdMg0xpvaMKGgH_Gw");
      });
  });

  test("test signIn avec compte existant en base et mauvais mot de passe", async () => {
    await request(app)
      .post("/users/sign-In")
      .send({
        // ne pas oublier un espace après le .com
        emailFromFront: "marindanger@gmail.com ",
        passwordFromFront: "azerty",
      })
      .expect(200)
      .expect("content-Type", /json/)
      .then((response) => {
        expect(response.body.token).not.toEqual(
          "NcEBKrmBZEQsPCUsdMg0xpvaMKGgH_Gw"
        );
      });
  });

  test("test signIn avec compte inexistant", async () => {
    await request(app)
      .post("/users/sign-In")
      .send({
        // ne pas oublier un espace après le .com
        emailFromFront: "itShouldBeError@jest.fr",
        passwordFromFront: "azerty",
      })
      .expect(200)
      .expect("content-Type", /json/)
      .then((response) => {
        expect(response.body.result).toEqual(false);
      });
  });

  test("test signIn avec information manquante", async () => {
    await request(app)
      .post("/users/sign-In")
      .expect(200)
      .expect("content-Type", /json/)
      .then((response) => {
        expect(response.body.result).toEqual(false);
      });
  });

  afterAll(() => {
    mongoose.connection.close();
  });
});
