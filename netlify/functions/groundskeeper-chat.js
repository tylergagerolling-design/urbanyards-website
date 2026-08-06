const { adapt } = require("./lib/adapter");
const handler = require("../../api/groundskeeper-chat");

exports.handler = adapt(handler);
