"use strict";

function formatTicketNumber(sequence, date = new Date()) {
  const year = date instanceof Date ? date.getUTCFullYear() : new Date(date).getUTCFullYear();
  const numeric = Number(sequence);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw new Error("Ticket sequence must be a positive integer.");
  }
  return `UY-${year}-${String(numeric).padStart(5, "0")}`;
}

module.exports = {
  formatTicketNumber
};
