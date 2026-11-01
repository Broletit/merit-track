import {getDatabase} from "@/server/db/mysql";
import {evaluateSubmissionRequirements} from "./evaluateSubmissionRequirements";
export async function evaluateSubmissionFinal(submissionId:number){
 const result=(await evaluateSubmissionRequirements(getDatabase(),submissionId,"approved"));
 return {submissionPassed:result.valid,groupResults:result.groupResults.map(group=>({groupCode:group.code,passed:group.passed,passedCount:group.achieved,required:group.required}))};
}
