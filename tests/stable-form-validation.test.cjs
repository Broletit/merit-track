
const fs=require('fs'),ts=require('typescript'),Module=require('module'),assert=require('assert/strict');
let effect,cleanup;const listeners={};
class Element {
 constructor(tag){this.tagName=tag.toUpperCase();this.dataset={};this.attributes={};this.children=[];this.isConnected=true;this.textContent='';}
 appendChild(node){this.children.push(node);node.parentElement=this;return node;}
 hasAttribute(name){return name==='data-field-error'?!!this.dataset.fieldError:Object.hasOwn(this.attributes,name);}
 getAttribute(name){return this.attributes[name]??null;}
 setAttribute(name,value){this.attributes[name]=value;}
 removeAttribute(name){delete this.attributes[name];}
 querySelector(selector){return selector==='[data-field-error]'?this.children.find(n=>n.dataset.fieldError)||null:null;}
 querySelectorAll(){return this.children.filter(n=>n instanceof Input);}
 closest(selector){if(selector==='[data-no-validation-reserve]')return this.noReserve?form:null;return selector==='label'?this.parentElement:null;}
 insertAdjacentElement(position,node){const list=this.parentElement.children;list.splice(list.indexOf(this)+1,0,node);node.parentElement=this.parentElement;}
 remove(){this.parentElement.children=this.parentElement.children.filter(n=>n!==this);}
}
class Input extends Element {constructor(){super('input');this.type='text';this.required=true;this.name='field';this.validity={valueMissing:true,valid:false};this.labels=[];this.validationMessage='Required';}focus(){}}
const fields=[new Input(),new Input()],wrappers=fields.map(field=>{const label=new Element('label');label.appendChild(field);return label;});
const form={noValidate:false,compact:false,hasAttribute:name=>name==="data-compact-validation"&&form.compact,querySelector:()=>fields[0],querySelectorAll:()=>fields};
const saved={};for(const key of ['document','window','HTMLElement','HTMLInputElement','HTMLSelectElement','HTMLTextAreaElement','MutationObserver','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])saved[key]=global[key];
Object.assign(global,{HTMLElement:Element,HTMLInputElement:Input,HTMLSelectElement:class extends Element{},HTMLTextAreaElement:class extends Element{},document:{body:{},querySelectorAll:()=>[form],createElement:tag=>new Element(tag),addEventListener:(name,fn)=>listeners[name]=fn,removeEventListener(){}},window:{addEventListener(){},removeEventListener(){}},MutationObserver:class{constructor(fn){observe=fn;}observe(){}disconnect(){}},getComputedStyle:node=>({display:node.display||'block',flexDirection:'row'}),requestAnimationFrame:()=>1,cancelAnimationFrame(){}});
const m=new Module('guard',module);m.paths=module.paths;m.require=id=>id==='react'?{useEffect:fn=>effect=fn}:require(id);m._compile(ts.transpileModule(fs.readFileSync('src/components/shared/FormUxGuard.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,'guard');
m.exports.default();cleanup=effect();

assert(wrappers.every(w=>w.children.length===1),'No empty error rows before validation');
listeners.invalid({target:fields[0],preventDefault(){}});
const error=wrappers[0].children[1];
assert(error.textContent.length>0);assert.equal(error.getAttribute('role'),'alert');
assert.equal(fields[0].getAttribute('aria-invalid'),'true');
assert(!/h-\d|overflow-y|absolute/.test(error.className),'Errors grow naturally');
listeners.invalid({target:fields[0],preventDefault(){}});assert.equal(wrappers[0].children.length,2,'Repeated error reuses one row');
fields[0].validity={valid:true,valueMissing:false};listeners.input({target:fields[0]});
assert.equal(wrappers[0].children.length,1);assert.equal(fields[0].getAttribute('aria-describedby'),null);
const late=new Input(),lateWrapper=new Element('label');lateWrapper.appendChild(late);
listeners.invalid({target:late,preventDefault(){}});assert.equal(lateWrapper.children.length,2,'New fields work without registration');
const decorated=new Input(),row=new Element('div'),label=new Element('label');row.display='flex';row.appendChild(decorated);label.appendChild(row);
decorated.closest=selector=>selector==='label'?label:null;
listeners.invalid({target:decorated,preventDefault(){}});assert.equal(row.children.length,1);assert.equal(label.children.length,2,'Error goes below decorated control row');
cleanup();assert.equal(lateWrapper.children.length,1);assert.equal(label.children.length,1);
for(const[key,value]of Object.entries(saved)){if(value===undefined)delete global[key];else global[key]=value;}
console.log('Passed: no reserved whitespace, errors added on demand, repeated validation, clearing, dynamic forms and decorated controls.');
