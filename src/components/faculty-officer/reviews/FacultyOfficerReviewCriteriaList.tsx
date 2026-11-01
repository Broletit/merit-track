import SubmissionCriteriaDetailList from "@/components/shared/submissions/SubmissionCriteriaDetailList";
type Item = {
  code: string;
  title: string;
  description: string | null;
  group_code: string;
  group_title: string;
  min_required?: number;
  is_required?: number;
  file_id?: number | null;
  auto_passed: number | null;
  auto_message: string | null;
  content_text: string | null;
  file_name: string | null;
  file_path: string | null;
};

export default function FacultyOfficerReviewCriteriaList({items}:{items:Item[]}){
 return <SubmissionCriteriaDetailList items={items.map(item=>({...item,min_required:Number(item.min_required??0),is_required:Number(item.is_required??0),evidence_type:"manual",file_count:item.file_id?1:0,evidence_files:item.file_id?[{id:item.file_id,fileName:item.file_name??"Minh chứng",mimeType:""}]:[]}))}/>;
}
