import { Children, Fragment, cloneElement, isValidElement, type CSSProperties, type ReactNode, type TableHTMLAttributes } from "react";
type CellProps={children?:ReactNode;className?:string;colSpan?:number;style?:CSSProperties;"data-column-align"?:"left"|"center"|"right";"data-nowrap"?:boolean};
function flat(children:ReactNode):ReactNode[]{return Children.toArray(children).flatMap(child=>isValidElement<CellProps>(child)&&child.type===Fragment?flat(child.props.children):[child]);}
function text(node:ReactNode):string{return flat(node).map(child=>typeof child==="string"||typeof child==="number"?String(child):isValidElement<CellProps>(child)?text(child.props.children):"").join(" ").trim();}
export function tableColumnAlignment(label:string):"left"|"center"|"right" {
 const value=label.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[đĐ]/g,"d").toLowerCase().replace(/\s+/g," ").trim();
 return /^(?:ten(?: |$)|tieu de(?: |$)|ho ten$|ho va ten$|ho dem$|ho lot$|last_name$|first_name$|full_name$|name$|description$|mo ta(?: |$)|noi dung(?: |$)|ghi chu$|ly do(?: |$)|sinh vien$|can bo$|nguoi dung$|nguoi thuc hien$|doi tuong bi tac dong$|dot xet$|hoat dong$|tieu chi$|tieu chuan$|muc goc$)/.test(value)?"left":"center";
}
function isStatusColumn(label:string) {
 const value=label.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[Ä‘Ä]/g,"d").toLowerCase().replace(/\s+/g," ").trim();
 return /^(?:trang thai|tinh trang)$/.test(value);
}
function isUnbreakableColumn(label:string) {
 const value=label.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[ÄĐ]/g,"d").toLowerCase().replace(/\s+/g," ").trim();
 return /^(?:stt|ma(?: |$)|mssv$|ma sv$|ma can bo$|lop$|khoa$|ngay(?: |$)|thoi gian(?: |$)|tu$|den$|trang thai$|tinh trang$|hinh thuc(?: |$)|diem danh$|thao tac$|vai tro$|doi tuong$|diem toi da$)/.test(value);
}
function statusLabel(value:ReactNode) {
 if(typeof value!=="string")return value;
 return ({passed:"Đạt",failed:"Không đạt",submitted_v1:"Chờ duyệt vòng 1",submitted_v2:"Chờ duyệt vòng 2",needs_revision_v1:"Cần chỉnh sửa",needs_revision_v2:"Cần chỉnh sửa",not_joined:"Chưa tham gia xét"} as Record<string,string>)[value]??value;
}
function statusBadgeClass(value:string) {
 const normalized=value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 if(["passed","dat","du dieu kien"].includes(normalized))return "bg-emerald-50 text-emerald-700";
 if(["failed","khong dat"].includes(normalized))return "bg-rose-50 text-rose-700";
 if(normalized.includes("cho duyet"))return "bg-blue-50 text-blue-700";
 if(normalized.includes("can chinh sua")||normalized.includes("tiem nang"))return "bg-amber-50 text-amber-700";
 if(normalized.includes("chua tham gia"))return "bg-slate-100 text-slate-600";
 return "bg-slate-100 text-slate-700";
}
export function alignTableChildren(children:ReactNode):ReactNode {
 const sections=flat(children);
 const head=sections.find(node=>isValidElement<CellProps>(node)&&node.type==='thead');
 const row=isValidElement<CellProps>(head)?flat(head.props.children).find(node=>isValidElement<CellProps>(node)&&node.type==='tr'):undefined;
 const alignments:Array<"left"|"center"|"right">=[];
 const statusColumns:boolean[]=[];
 const noWrapColumns:boolean[]=[];
 if(isValidElement<CellProps>(row))for(const cell of flat(row.props.children))if(isValidElement<CellProps>(cell)){
   const alignment=cell.props['data-column-align']??tableColumnAlignment(text(cell.props.children));
   const status=isStatusColumn(text(cell.props.children));
   const noWrap=isUnbreakableColumn(text(cell.props.children));
   for(let i=0;i<Number(cell.props.colSpan??1);i++){alignments.push(alignment);statusColumns.push(status);noWrapColumns.push(noWrap)}
 }
 function visit(node:ReactNode):ReactNode {
   if(!isValidElement<CellProps>(node))return node;
   if(node.type==='tr'){
     let column=0;
     return cloneElement(node,{},flat(node.props.children).map(cell=>{
       if(!isValidElement<CellProps>(cell)||!['td','th'].includes(String(cell.type)))return cell;
       const span=Number(cell.props.colSpan??1),alignment=cell.props['data-column-align']??(span>1?'center':alignments[column]??'center');
       column+=span;
       const index=column-span;
       const isStatus=String(cell.type)==='td' && statusColumns[index];
       const rawLabel=statusLabel(cell.props.children);
       const content=isStatus && isValidElement<CellProps>(cell.props.children) && String(cell.props.children.type)==='span'
         ? cloneElement(cell.props.children,{className:`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(text(cell.props.children.props.children))}`})
         : isStatus && !isValidElement(cell.props.children)
           ? <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(String(rawLabel))}`}>{rawLabel}</span>
           : cell.props.children;
       return cloneElement(cell,{'data-column-align':alignment,'data-nowrap':noWrapColumns[index]||undefined,style:{...cell.props.style,textAlign:alignment,verticalAlign:'middle'}},content);
     }));
   }
   if(['thead','tbody','tfoot'].includes(String(node.type)))return cloneElement(node,{},flat(node.props.children).map(visit));
   return node;
 }
 return sections.map(visit);
}
export default function DataTable({children,className,...props}:TableHTMLAttributes<HTMLTableElement>){return <table {...props} className={`responsive-data-table ${className??""}`.trim()}>{alignTableChildren(children)}</table>;}
