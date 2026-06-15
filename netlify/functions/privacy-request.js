const { adapt } = require("./lib/adapter");
const handler = require("../../api/privacy-request");

exports.handler = adapt(handler);
