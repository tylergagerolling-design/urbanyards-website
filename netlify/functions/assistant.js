const assistantHandler = require("../../api/assistant");

exports.handler = async (event) => {
  let body = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (error) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON" })
    };
  }

  const req = {
    method: event.httpMethod,
    body
  };

  const response = {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = JSON.stringify(payload);
      return this;
    }
  };

  const result = await assistantHandler(req, response);
  return {
    statusCode: result.statusCode,
    headers: result.headers,
    body: result.body
  };
};
