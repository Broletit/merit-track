const ts = require('typescript'), fs = require('fs');
function safeWrite(file,text){for(let attempt=0;;attempt++){try{fs.writeFileSync(file,text);return;}catch(error){if(attempt>=5||!['UNKNOWN','EBUSY','EPERM'].includes(error.code))throw error;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,100);}}}
const configFile = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, process.cwd());
function asyncFunction(node) { return node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword); }
function callable(node) { return ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node) || ts.isMethodDeclaration(node); }
function directAwait(node) {
  let found = false;
  function walk(n) { if (n !== node && callable(n)) return; if (ts.isAwaitExpression(n)) found = true; ts.forEachChild(n, walk); }
  walk(node); return found;
}
function isAwaited(node) {
  let parent = node.parent;
  while (ts.isParenthesizedExpression(parent) || ts.isAsExpression(parent)) parent = parent.parent;
  return ts.isAwaitExpression(parent);
}
for (let pass = 0; pass < 30; pass++) {
  const program = ts.createProgram(config.fileNames, config.options), checker = program.getTypeChecker();
  let modified = 0;
  for (const source of program.getSourceFiles().filter(s => /[/\\]src[/\\]/.test(s.fileName) && !s.fileName.includes('node_modules') && !s.isDeclarationFile)) {
    if (/^\s*["']use client["'];/.test(source.text)) continue;
    const edits = [], needsHelpers = new Set();
    function walk(node) {
      if (callable(node) && node.body && !asyncFunction(node) && directAwait(node.body)) {
        const start = node.modifiers?.length ? node.modifiers[node.modifiers.length - 1].end : node.getStart(source);
        edits.push({ start, end: start, text: node.modifiers?.length ? ' async' : 'async ' });
        if (node.type && !/^Promise\s*</.test(node.type.getText(source))) edits.push({ start: node.type.getStart(source), end: node.type.end, text: `Promise<${node.type.getText(source)}>` });
      }
      if (ts.isCallExpression(node) && !isAwaited(node)) {
        const declaration = checker.getResolvedSignature(node)?.declaration;
        if (declaration && asyncFunction(declaration) && /[/\\]src[/\\]/.test(declaration.getSourceFile().fileName) && !declaration.getSourceFile().fileName.includes('node_modules')) {
          edits.push({ start: node.getStart(source), end: node.getStart(source), text: '(await ' }, { start: node.end, end: node.end, text: ')' });
        }
        if (ts.isPropertyAccessExpression(node.expression) && node.arguments.some(a => callable(a) && asyncFunction(a))) {
          const method = node.expression.name.text;
          const alreadyCollected = ts.isCallExpression(node.parent) && ts.isPropertyAccessExpression(node.parent.expression) && node.parent.expression.getText(source) === 'Promise.all';
          if (['map', 'flatMap'].includes(method) && !alreadyCollected) {
            if (method === 'flatMap') edits.push({ start: node.expression.name.getStart(source), end: node.expression.name.end, text: 'map' });
            edits.push({ start: node.getStart(source), end: node.getStart(source), text: '(await Promise.all(' }, { start: node.end, end: node.end, text: method === 'flatMap' ? ')).flat()' : '))' });
          }
          if (['forEach', 'filter', 'some', 'every', 'find'].includes(method)) {
            const helper = `async${method[0].toUpperCase()}${method.slice(1)}`; needsHelpers.add(helper);
            edits.push({ start: node.expression.getStart(source), end: node.expression.end, text: `(await ${helper}` });
            edits.push({ start: node.arguments.pos, end: node.arguments.pos, text: node.expression.expression.getText(source) + ', ' });
            edits.push({ start: node.end, end: node.end, text: ')' });
          }
        }
      }
      ts.forEachChild(node, walk);
    }
    walk(source);
    if (!edits.length) continue;
    let text = source.text;
    for (const edit of edits.sort((a, b) => b.start - a.start || b.end - a.end)) text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
    if (needsHelpers.size) {
      const at = /^\s*["']use (?:client|server)["'];/.exec(text)?.[0].length || 0;
      text = text.slice(0, at) + '\nimport { ' + [...needsHelpers].join(', ') + ' } from "@/server/db/asyncCollections";\n' + text.slice(at);
    }
    safeWrite(source.fileName, text); modified++;
  }
  console.log(`Async pass ${pass + 1}: ${modified} files`);
  if (!modified) break;
  if (pass === 29) throw new Error('Async propagation did not converge; review before proceeding.');
}
