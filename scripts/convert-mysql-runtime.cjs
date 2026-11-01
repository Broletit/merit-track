// One-time, reviewable source migration. Does not access or modify application data.
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]); }
const files = walk('src').filter(f => /\.tsx?$/.test(f));
function apply(file, edits) {
  if (!edits.length) return;
  let source = fs.readFileSync(file, 'utf8');
  for (const edit of edits.sort((a, b) => b.start - a.start || b.end - a.end)) source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  fs.writeFileSync(file, source);
}
function sqlText(sql) {
  return sql.replace(/datetime\(\s*'now'\s*\)/gi, 'CURRENT_TIMESTAMP(3)')
    .replace(/\bINSERT OR IGNORE\b/gi, 'INSERT IGNORE')
    .replace(/\bON CONFLICT\s*\([^)]*\)\s*DO UPDATE SET\b/gi, 'ON DUPLICATE KEY UPDATE')
    .replace(/\bexcluded\.(\w+)/gi, 'VALUES($1)')
    .replace(/\browid\b/gi, 'id');
}
function unwrap(n) { while (ts.isParenthesizedExpression(n)) n = n.expression; return n; }
for (const file of files) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const statements = new Map(), transactions = new Set(), edits = [];
  function collect(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && ts.isCallExpression(node.initializer) && ts.isPropertyAccessExpression(node.initializer.expression)) {
      const init = node.initializer;
      if (init.expression.name.text === 'prepare') statements.set(node.name.text, { db: init.expression.expression.getText(source), sql: init.arguments[0].getText(source), declaration: node });
      if (init.expression.name.text === 'transaction') transactions.add(node.name.text);
    }
    ts.forEachChild(node, collect);
  }
  collect(source);
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && ['get', 'all', 'run'].includes(node.expression.name.text)) {
      const receiver = unwrap(node.expression.expression);
      let statement;
      if (ts.isCallExpression(receiver) && ts.isPropertyAccessExpression(receiver.expression) && receiver.expression.name.text === 'prepare') statement = { db: receiver.expression.expression.getText(source), sql: receiver.arguments[0].getText(source) };
      else if (ts.isIdentifier(receiver)) statement = statements.get(receiver.text);
      if (statement) {
        const method = { get: 'first', all: 'rows', run: 'execute' }[node.expression.name.text];
        edits.push({ start: node.getStart(source), end: node.end, text: `(await ${statement.db}.${method}(${sqlText(statement.sql)}, [${node.arguments.map(a => a.getText(source)).join(', ')}]))` });
        return;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  for (const statement of statements.values()) {
    const list = statement.declaration.parent;
    if (list.declarations.length !== 1) throw new Error(`Review multi-statement declaration: ${file}`);
    edits.push({ start: list.parent.getStart(source), end: list.parent.end, text: '' });
  }
  apply(file, edits);
  let text = fs.readFileSync(file, 'utf8');
  text = text.replaceAll('@/server/db/sqlite', '@/server/db/mysql').replace(/\bgetDb\b/g, 'getDatabase').replace(/Database\.Database/g, 'Database')
    .replace(/import type Database from ["']better-sqlite3["'];?/g, 'import type { Database } from "@/server/db/mysql";')
    .replace(/\.lastInsertRowid\b/g, '.insertId');
  // Preserve lazy transaction execution while replacing the SQLite immediate/deferred API.
  text = text.replace(/\.transaction\(/g, '.transactionPlaceholder(');
  for (const name of transactions) text = text.replace(new RegExp('\\b' + name + '\\.(?:immediate|deferred|exclusive)\\(', 'g'), name + '(');
  if (text !== fs.readFileSync(file, "utf8")) fs.writeFileSync(file, text);
}
// Transaction calls are closures in the old API; retain their invocation point.
for (const file of files) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true), edits = [];
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'transactionPlaceholder') {
      edits.push({ start: node.getStart(source), end: node.end, text: `(() => ${node.expression.expression.getText(source)}.withTransaction(${node.arguments[0].getText(source)}))` });
      return;
    }
    if (ts.isPropertyAccessExpression(node) && ['immediate', 'deferred', 'exclusive'].includes(node.name.text) && node.expression.getText(source).includes('transactionPlaceholder')) {
      edits.push({ start: node.expression.end, end: node.end, text: '' });
    }
    ts.forEachChild(node, visit);
  }
  visit(source); apply(file, edits);
}
console.log('Converted query calls. Run async propagation and SQL review before starting the app.');
