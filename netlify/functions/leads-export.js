const { adapt } = require("./lib/adapter");
const handler = require("../../api/leads-export");

exports.handler = adapt(handler);
