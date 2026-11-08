import { ChevronDown, Download } from "lucide-react";

export default function SubmissionExportButtons({url}:{url:string}){
  return <details className="relative"><summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-xl border border-blue-700 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 [&::-webkit-details-marker]:hidden"><Download size={16}/>Xuất<ChevronDown size={15}/></summary><div className="absolute right-0 z-20 mt-2 min-w-36 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"><a href={`${url}?format=word`} className="block px-4 py-2 text-sm font-medium text-slate-700 hover:bg-blue-50">Word</a><a href={`${url}?format=print`} target="_blank" rel="noreferrer" className="block px-4 py-2 text-sm font-medium text-slate-700 hover:bg-blue-50">PDF</a></div></details>;
}
