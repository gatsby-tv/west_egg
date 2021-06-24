import { ChannelID, EncodedToken, UserID } from "@gatsby-tv/types";
import chai from "chai";
import chaiHttp from "chai-http";
import app from "../src/index";

chai.use(chaiHttp);
chai.should();

describe("auth", () => {
  // TODO: Refresh jwt
  // TODO: Create channel with jwt and save channel id
  // TODO: Create video with jwt and channel id
  // TODO: Move all test data to JSON files

  let signinKey: string,
    jwt: EncodedToken,
    userId: UserID,
    channelId: ChannelID;

  // Get signin key (dev)
  it("POST /v1/auth/signin should send signin key", () => {
    chai
      .request(app)
      .post("/v1/auth/signin")
      .send({
        email: "test@gmail.com"
      })
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.not.be.empty;
        signinKey = res.body.key;
      });
  });

  // Persist signin key for 1h
  it("POST /v1/auth/signin/:key/persist should persist signin key", () => {
    chai
      .request(app)
      .post(`/v1/auth/signin/${signinKey}/persist`)
      .send()
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.empty;
      });
  });

  // TODO: Create user with signin key
  // it("POST /v1/user should create user", () => {
  //   chai
  //     .request(app)
  //     .post("/v1/user")
  //     .send({
  //       key: signinKey,
  //       handle: "test",
  //       name: "test"
  //     })
  //     .end((err, res) => {
  //       res.should.have.status(201);
  //       res.body.should.not.be.empty;
  //     });
  // });
});
