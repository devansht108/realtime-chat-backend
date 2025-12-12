import { redis } from "../config/redis";

// mark user online
export async function setUserOnline(userId: string) {
  await redis.set(`user:${userId}:online`, "1");
}

// mark user offline and store last seen timestamp
export async function setUserOffline(userId: string) {
  await redis.del(`user:${userId}:online`);
  await redis.set(`user:${userId}:lastSeen`, Date.now().toString());
}

// check if user is online
export async function isUserOnline(userId: string) {
  return (await redis.get(`user:${userId}:online`)) === "1";
}

// fetch status of multiple users in one request
export async function getManyUsersStatus(userIds: string[]) {
  const pipeline = redis.pipeline();

  // add GET commands for each user
  for (const id of userIds) {
    pipeline.get(`user:${id}:online`);
    pipeline.get(`user:${id}:lastSeen`);
  }

  // execute the pipeline
  const results = await pipeline.exec();

  // fallback in case results is null
  if (!results) return [];

  const statuses = [];
  let idx = 0;

  for (const id of userIds) {
    // online value
    const online = results[idx][1];

    // last seen value
    const lastSeen = results[idx + 1][1];

    // move forward by 2 because each user has 2 commands
    idx += 2;

    statuses.push({
      userId: id,
      online: online === "1",
      lastSeen: lastSeen ? Number(lastSeen) : null
    });
  }

  return statuses;
}
