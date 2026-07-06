const { adapt } = require("./lib/adapter");
const handler = require("../../api/assistant");

exports.handler = adapt(handler);
