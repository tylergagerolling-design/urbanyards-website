const { actorFromHeaders, json } = require("./lib/dashboard-auth");
const { handleAvatarDelete, withAvatarErrors } = require("./lib/avatar-storage");

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST" && event.httpMethod !== "DELETE") return json(405, { error: "Method not allowed." });
  const actor = await actorFromHeaders(event.headers);
  if (!actor) return json(401, { error: "Unauthorized." });

  return withAvatarErrors(event, actor, "user-delete-avatar", () => handleAvatarDelete(event, actor));
};
