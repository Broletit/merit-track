const fs = require('fs'), path = require('path'), ts = require('typescript');
const walk = p => fs.readdirSync(p, {withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);
function splitArgs(text) {
  let quote='', depth=0, start=0; const parts=[];
  for(let i=0;i<text.length;i++) { const c=text[i]; if(quote){if(c===quote){if(text[i+1]===quote)i++;else quote='';}continue;}if(c==="'"||c==='"'){quote=c;continue;}if(c==='(')depth++;if(c===')')depth--;if(c===','&&!depth){parts.push(text.slice(start,i).trim());start=i+1;} }
  parts.push(text.slice(start).trim());return parts;
}
function functions(sql) {
  let result='', i=0;
  while(i<sql.length) {
    if(sql[i]==="'"||sql[i]==='"') {const quote=sql[i],start=i++;while(i<sql.length){if(sql[i]===quote){if(sql[i+1]===quote){i+=2;continue;}i++;break;}i++;}result+=sql.slice(start,i);continue;}
    const match=/^(datetime|strftime|printf|group_concat|json_group_array|unicode_contains|min|max)\s*\(/i.exec(sql.slice(i));
    if(!match){result+=sql[i++];continue;}
    const start=i+match[0].length;let j=start,depth=1,quote='';
    for(;j<sql.length&&depth;j++){const c=sql[j];if(quote){if(c===quote){if(sql[j+1]===quote)j++;else quote='';}continue;}if(c==="'"||c==='"')quote=c;else if(c==='(')depth++;else if(c===')')depth--;}
    if(depth){result+=sql[i++];continue;}
    const args=splitArgs(sql.slice(start,j-1)).map(functions),name=match[1].toLowerCase();let replacement;
    if(name==='datetime') {replacement=args[0]==="'now'"?'CURRENT_TIMESTAMP(3)':`CAST(${args[0]} AS DATETIME(3))`;if(args.length===2){const modifier=/^'([+-]?\d+) (days?|hours?|minutes?|seconds?)'$/.exec(args[1]);if(!modifier)throw Error('Review datetime modifier '+args[1]);replacement=`DATE_ADD(${replacement}, INTERVAL ${Number(modifier[1])} ${modifier[2].replace(/s$/,'').toUpperCase()})`;}else if(args.length!==1)throw Error('Review datetime modifiers');}
    else if(name==='strftime') {if(args.length!==2)throw Error('Review strftime: '+sql.slice(i,j));replacement=args[0]==="'%s'"?`UNIX_TIMESTAMP(${args[1]})`:`DATE_FORMAT(${args[1]}, ${args[0].replaceAll('%M','%i').replaceAll('%S','%s')})`;}
    else if(name==='printf') {if(args[0]!=="'%08d'")throw Error('Review printf '+sql.slice(i,j));replacement=`LPAD(CAST(${args[1]} AS CHAR), 8, '0')`;}
    else if(name==='group_concat') replacement=args.length===2?`GROUP_CONCAT(${args[0]} SEPARATOR ${args[1]})`:`GROUP_CONCAT(${args.join(', ')})`;
    else if(name==='json_group_array') {if(/^DISTINCT\s/i.test(args[0]))throw Error('Review distinct JSON aggregation');replacement=`JSON_ARRAYAGG(${args[0]})`;}
    else if(name==='unicode_contains') replacement=`(LOCATE(LOWER(${args[1]}) COLLATE utf8mb4_0900_as_ci, LOWER(${args[0]}) COLLATE utf8mb4_0900_as_ci)>0)`;
    else replacement=`${args.length>1?(name==='min'?'LEAST':'GREATEST'):name.toUpperCase()}(${args.join(', ')})`;
    result+=replacement;i=j;
  }
  return result;
}
function concat(sql) {
  // Tokenize strings/identifiers/parentheses so SQL string delimiters containing || stay intact.
  const tokenRx=/'(?:''|[^'])*'|"(?:""|[^"])*"|\|\||[A-Za-z_][A-Za-z0-9_.]*|\d+|[^\s]/g;
  for(let pass=0;pass<100;pass++) {
    const tokens=[...sql.matchAll(tokenRx)],at=tokens.findIndex(t=>t[0]==='||');if(at<0)return sql;
    let left=at-1,right=at+1;
    if(tokens[left]?.[0]===')'){let depth=1;while(--left>=0){if(tokens[left][0]===')')depth++;if(tokens[left][0]==='('&&! --depth)break;}
      if(left>0&&/^[A-Za-z_]\w*$/.test(tokens[left-1][0]))left--;
    }
    if(tokens[right+1]?.[0]==='('){right++;let depth=1;while(++right<tokens.length){if(tokens[right][0]==='(')depth++;if(tokens[right][0]===')'&&!--depth)break;}}
    else if(tokens[right]?.[0]==='('){let depth=1;while(++right<tokens.length){if(tokens[right][0]==='(')depth++;if(tokens[right][0]===')'&&!--depth)break;}}
    if(left<0||right>=tokens.length)throw Error('Invalid concatenation');
    const start=tokens[left].index,end=tokens[right].index+tokens[right][0].length;
    sql=sql.slice(0,start)+`CONCAT(${sql.slice(start,tokens[at].index).trim()}, ${sql.slice(tokens[at].index+2,end).trim()})`+sql.slice(end);
  }
  throw Error('Concatenation did not converge');
}
function rewrite(sql) {
  sql=sql.replace(/\bON CONFLICT\s+DO UPDATE SET\b/gi,'ON DUPLICATE KEY UPDATE').replace(/\bINSERT OR IGNORE\b/gi,'INSERT IGNORE').replace(/\browid\b/gi,'id');
  if(/\b(?:SELECT|INSERT|UPDATE|DELETE|WHERE|FROM|ORDER BY|datetime|strftime|printf|unicode_contains|GROUP_CONCAT)\b/i.test(sql))sql=concat(functions(sql));
  return sql;
}
for(const file of walk('src').filter(f=>/\.tsx?$/.test(f))) {
  const text=fs.readFileSync(file,'utf8'),source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true),edits=[];
  function visit(node){
    if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)){
      const updated=rewrite(node.text);if(updated!==node.text)edits.push({start:node.getStart(source),end:node.end,text:ts.isStringLiteral(node)?JSON.stringify(updated):'`'+updated+'`'});return;
    }
    if(ts.isTemplateExpression(node)){
      for(const part of [node.head,...node.templateSpans.map(s=>s.literal)]){const original=part.text,updated=rewrite(original);if(original!==updated){const offset=ts.isTemplateHead(part)?1:1;edits.push({start:part.getStart(source)+offset,end:part.end-(ts.isTemplateTail(part)?1:2),text:updated});}}
      for(const span of node.templateSpans)visit(span.expression);return;
    }
    ts.forEachChild(node,visit);
  }
  visit(source);let output=text;for(const edit of edits.sort((a,b)=>b.start-a.start))output=output.slice(0,edit.start)+edit.text+output.slice(edit.end);
  if(output!==text)fs.writeFileSync(file,output);
}
console.log('Converted SQLite date, aggregation, scalar min/max, search and concatenation SQL.');
