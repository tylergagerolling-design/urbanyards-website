const { adapt } = require("./lib/adapter");
const handler = require("../../api/health");

exports.handler = adapt(handler);
