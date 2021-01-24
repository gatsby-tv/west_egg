import express, { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import "dotenv/config";
import db from "./db";
import auth from "./routes/auth";
import channel from "./routes/channel";
import video from "./routes/video";
import {
  ErrorResponse,
  InternalError,
  StatusCode,
  WestEggError
} from "@gatsby-tv/types";

const app = express();
const port = process.env.PORT || 3001;

// TODO: Check for all environment variables needed
if (!process.env.JWT_SECRET) {
  console.error("FATAL: No JWT secret key set!");
  process.exit(1);
}

// Set Base64 JWT secret
process.env.JWT_SECRET = Buffer.from(process.env.JWT_SECRET).toString("base64");

// Add json body parser
app.use(bodyParser.json());

// Allow CORS for all requests
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, PUT, POST, DELETE, PATCH, OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Add routes to app
app.use("/auth", auth);
app.use("/channel", channel);
app.use("/video", video);

// Handle all errors
app.use(
  (
    error: WestEggError | Error,
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    // Check if response already sent
    if (res.headersSent) {
      return;
    }

    // Check if error is specific with response code
    if (error instanceof WestEggError) {
      return res.status(error.statusCode).json({ error } as ErrorResponse);
    }

    // If not, log and send generic internal error
    else {
      console.error(error);
      return res.status(StatusCode.INTERNAL_ERROR).json({
        error: new InternalError()
      } as ErrorResponse);
    }
  }
);

// Start server
(async () => {
  await db.connect();
  app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}/`);
  });
})();
