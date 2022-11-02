var dotenv = require("dotenv"); // env vars
const mongoose = require("mongoose"); // mongodb

// env vars: > heroku config:set SITE=heroku
dotenv.config();

// connect to mongodb/atlas
const dbOptions = {
  connectTimeoutMS: 5000,
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

if (process.env.USE_LOCAL_DB === "yes") {
  mongoose.connect(
    `mongodb://127.0.0.1:27017/gymtogether`,
    dbOptions,
    function (err) {
      if (err == null) {
        console.log(`[DB] > connected to localhost`);
      } else {
        console.log(`[DB] > connection ERROR [local db]: ${err}`);
      }
    }
  );
} else if (process.env.USE_LOCAL_DB === "no") {
  mongoose.connect(
    `mongodb+srv://cloud:${process.env.ATLAS_PWD}@weatherapp-v11t.k6nho.mongodb.net/gymtogether?retryWrites=true&w=majority`,
    dbOptions,
    function (err) {
      if (err == null) {
        console.log(`[DB] > connected to Atlas`);
      } else {
        console.log(`[DB] > connection ERROR: ${err}`);
      }
    }
  );
}
