const { adapt } = require("./lib/adapter");
const handler = require("../../api/lawnmower-man-chat");

exports.handler = adapt(handler);
