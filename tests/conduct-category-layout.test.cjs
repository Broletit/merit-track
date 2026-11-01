const fs = require('fs');
const ts = require('typescript');
const Module = require('module');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const assert = require('assert/strict');
const source = fs.readFileSync('src/components/admin/activities/ConductCategoryManager.tsx', 'utf8');
function render(editingId) {
  const mocks = {
    react: { ...React, useState: () => [editingId, () => {}], useTransition: () => [false, () => {}] },
    './ConductCategoryManager.module.css': { default: { panel: 'panel', form: 'category-form', code: 'code', name: 'name', parent: 'parent', score: 'score', actions: 'category-actions' } },
    '@/components/common/RequiredMark': { default: () => null },
    '@/components/admin/shared/DeleteEntityButton': { default: () => null },
    'react-hot-toast': { default: {} },
    '@/server/actions/conduct/createConductCategory': {},
    '@/server/actions/conduct/updateConductCategory': {},
    '@/server/actions/conduct/deleteConductCategory': { deleteConductCategory: () => {} },
  };
  const m = new Module('conduct-layout', module);
  m.paths = module.paths;
  m.require = id => Object.hasOwn(mocks, id) ? mocks[id] : require(id);
  m._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, 'conduct-layout');
  return renderToStaticMarkup(React.createElement(m.exports.default, { termId: 1, canManage: true, items: [{ id: 1, parentId: null, code: 'I', name: 'Category', scoreMax: 10, depth: 0 }] }));
}
const initial = render(null), editing = render(1);
assert.equal((initial.match(/class="category-form/g) || []).length, 1);
assert.equal((editing.match(/class="category-form/g) || []).length, 2);
assert.equal((editing.match(/class="category-actions/g) || []).length, 2, 'Create and edit share action positioning');
for (const field of ['code', 'name', 'parentId', 'scoreMax']) assert(editing.includes('name="' + field + '"'));
assert(!initial.includes('data-field-error'), 'No blank errors rendered initially');
assert(!/xl:mt-7|order-4|col-span-2/.test(source), 'No stale viewport-order overrides in category forms');
const css = fs.readFileSync('src/components/admin/activities/ConductCategoryManager.module.css', 'utf8');
assert(css.includes('@container conduct-categories'));
assert(css.includes('align-items: start'));
assert(!/font-size:\s*(?:10|11|12)px/.test(css));
console.log('Passed: create/edit category forms share responsive layout, required controls retained, no reserved errors or tiny mobile text.');
