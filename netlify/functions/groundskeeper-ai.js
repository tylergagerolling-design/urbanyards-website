const { adapt } = require("./lib/adapter");
const handler = require("../../api/groundskeeper-ai");

exports.handler = adapt(handler);
