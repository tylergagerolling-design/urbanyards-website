const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const inventoryPath = path.join(__dirname, "..", "supabase", "DATABASE_INVENTORY_READONLY.sql");
const safetyPlanPath = path.join(__dirname, "..", "docs", "DATABASE_REBUILD_SAFETY_PLAN.md");

test("database inventory script is read-only", () => {
  const sql = fs.readFileSync(inventoryPath, "utf8");
  const normalized = sql
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .toLowerCase();

  const forbidden = [
    /\balter\b/,
    /\bcreate\b/,
    /\bdelete\b/,
    /\bdrop\b/,
    /\binsert\b/,
    /\breindex\b/,
    /\btruncate\b/,
    /\bupdate\b/,
    /\bvacuum\b/
  ];

  for (const pattern of forbidden) {
    assert.equal(pattern.test(normalized), false, `Inventory script contains forbidden SQL: ${pattern}`);
  }

  assert.match(normalized, /\bselect\b/);
  assert.match(normalized, /pg_policies/);
  assert.match(normalized, /storage\.buckets/);
  assert.match(normalized, /auth\.users/);
});

test("database safety plan documents backup, inventory, RLS, and staged migration requirements", () => {
  const plan = fs.readFileSync(safetyPlanPath, "utf8");
  assert.match(plan, /DATABASE_INVENTORY_READONLY\.sql/);
  assert.match(plan, /backup/i);
  assert.match(plan, /Row Level Security/);
  assert.match(plan, /Staged Migration Rule/);
  assert.match(plan, /Never drop a table/);
});
