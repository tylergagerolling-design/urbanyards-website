const { adapt } = require("./lib/adapter");
const handler = require("../../api/quote");

exports.handler = adapt(handler);
