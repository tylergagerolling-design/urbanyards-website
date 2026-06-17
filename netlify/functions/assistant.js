const { adapt } = require("./lib/adapter");
const handler = require("../../api/assistant");

// Keep this wrapper touched when assistant internals change so Netlify rebuilds the function bundle.
exports.handler = adapt(handler);
