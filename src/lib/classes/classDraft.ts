export function normalizeClassText(value:string) { return value.normalize("NFC").trim().replace(/\s+/g," ").toLocaleLowerCase("vi"); }
export function classDraftErrors(classes:Array<{code:string;name:string}>,code:string,name:string,faculty:string) {
 const normalizedCode=normalizeClassText(code), normalizedName=normalizeClassText(name);
 return {
 code:!normalizedCode?"Vui lòng nhập mã lớp.":classes.some(item=>normalizeClassText(item.code)===normalizedCode)?"Mã lớp đã tồn tại.":"",
 name:!normalizedName?"Vui lòng nhập tên lớp.":classes.some(item=>normalizeClassText(item.name)===normalizedName)?"Tên lớp đã tồn tại.":"",
 faculty:!faculty.trim()?"Vui lòng chọn hoặc nhập ngành.":"",
 };
}
