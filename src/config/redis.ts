import Redis from "ioredis";

// Redis client ka ek instance create kar rahe hain
// aur Redis server ke sath connection establish karega
export const redis = new Redis({
  host: "127.0.0.1", // Redis server ka address (localhost) my comp
  port: 6379        // Redis ka default port location in my comp
});

// jab Redis server se successful connection ho jata hai
redis.on("connect", () => {
  // console me confirmation message print kar rahe hain
  console.log("Redis connected");
});

// agar Redis ke sath connection ya runtime error aaye
redis.on("error", (err) => {
  // error details log kar rahe hain debugging ke liye
  console.error("Redis error", err);
});
