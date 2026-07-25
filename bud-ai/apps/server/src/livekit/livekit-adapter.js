const { AccessToken, RoomServiceClient } = require("livekit-server-sdk");

function livekitConfig(env) {
  const source = env || process.env;
  return {
    url: source.LIVEKIT_URL || "",
    apiKey: source.LIVEKIT_API_KEY || "",
    apiSecret: source.LIVEKIT_API_SECRET || "",
    roomName: source.LIVEKIT_ROOM || "bud-demo-room"
  };
}

function requireConfig(config) {
  if (!config.url || !config.apiKey || !config.apiSecret) {
    const error = new Error("LiveKit is not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.");
    error.code = "LIVEKIT_NOT_CONFIGURED";
    throw error;
  }
}

async function createParticipantToken(input, env) {
  const config = livekitConfig(env);
  requireConfig(config);
  const participantId = String(input.participant_id || "").trim();
  const roomName = String(input.room_name || config.roomName).trim();
  const name = String(input.name || participantId).trim();

  if (!participantId || !roomName) {
    const error = new Error("participant_id and room_name are required");
    error.code = "LIVEKIT_INVALID_PARTICIPANT";
    throw error;
  }

  const token = new AccessToken(config.apiKey, config.apiSecret, {
    identity: participantId,
    name,
    ttl: "2m",
    metadata: JSON.stringify({
      workshop_id: roomName,
      participant_id: participantId,
      role: input.role === "teacher" ? "teacher" : "learner"
    })
  });
  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true
  });

  return {
    token: await token.toJwt(),
    url: config.url,
    room_name: roomName,
    participant_id: participantId
  };
}

async function ensureRoom(roomName, env) {
  const config = livekitConfig(env);
  requireConfig(config);
  const host = config.url.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
  const service = new RoomServiceClient(host, config.apiKey, config.apiSecret);
  try {
    return await service.createRoom({
      name: roomName || config.roomName,
      emptyTimeout: 300,
      departureTimeout: 120,
      maxParticipants: 20,
      metadata: JSON.stringify({ product: "bud-ai", lifecycle: "teacher-hosted-demo" })
    });
  } catch (error) {
    if (String(error.message || "").toLowerCase().indexOf("already exists") !== -1) {
      const rooms = await service.listRooms([roomName || config.roomName]);
      return rooms[0] || null;
    }
    throw error;
  }
}

module.exports = {
  livekitConfig,
  createParticipantToken,
  ensureRoom
};
