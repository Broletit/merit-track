import { requireAdminContext } from "@/server/auth/guards";
import CriteriaTemplateCreateForm from "@/components/admin/criteria-templates/CriteriaTemplateCreateForm";
import CriteriaTemplateFormHeader from "@/components/admin/criteria-templates/CriteriaTemplateFormHeader";

export default async function AdminCreateCriteriaTemplatePage() {
  await requireAdminContext();

  return (
    <main className="space-y-6">
      <CriteriaTemplateFormHeader />
      <CriteriaTemplateCreateForm />
    </main>
  );
}