const fs=require('node:fs'),path=require('node:path');
const source=require.resolve('zxing-wasm/reader/zxing_reader.wasm');
const destination=path.resolve(__dirname,'../public/wasm');
fs.mkdirSync(destination,{recursive:true});
fs.copyFileSync(source,path.join(destination,'zxing_reader.wasm'));
fs.copyFileSync(path.resolve(path.dirname(source),'../../LICENSE'),path.join(destination,'ZXING-LICENSE.txt'));
