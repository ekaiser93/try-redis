const express = require("express");
const cors = require("cors");
const axios = require("axios");
const redis = require("redis");
const redisClient = redis.createClient();

redisClient.on("error", function (error) {
  console.error(error);
});

const DEFAULT_EXPIRATION = 3600;

const app = express();
const port = 3000;
app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(cors());

/**
 * get dog photos by breed (ex: boxer)
 * @param breed the type of dog
 */
app.get("/dog-photos/:breed", async (req, res) => {
  const photos = await getOrSetCache(`dog-photos/${req.params.breed}`, async () => {
    const { data } = await axios.get(
      `https://dog.ceo/api/breed/${req.params.breed}/images`
    );
    return data;
  });
  res.json(photos);
});

function getOrSetCache(key, cb) {
  return new Promise((resolve, reject) => {
    redisClient.get(key, async (error, data) => {
      if (error) return reject(error);
      // if we get data back from redis
      if (data !== null) return resolve(JSON.parse(data));
      // if data is expired or not there
      const freshData = await cb();
      redisClient.setex(key, DEFAULT_EXPIRATION, JSON.stringify(freshData));
      return resolve(freshData);
    });
  });
}

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`);
});
