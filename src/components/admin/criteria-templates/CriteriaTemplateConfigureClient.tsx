"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import CriteriaGroupCreateForm from "./CriteriaGroupCreateForm";
import CriteriaTemplateStructureTable from "./CriteriaTemplateStructureTable";
import type {
  CriteriaTemplateActivityOption,
  CriteriaTemplateCriteriaItem,
  CriteriaTemplateGroupItem,
} from "./types";

export default function CriteriaTemplateConfigureClient({
  templateId,
  templateForType,
  groups,
  criteria,
  activities,
}: {
  templateId: number;
  templateForType: string;
  groups: CriteriaTemplateGroupItem[];
  criteria: CriteriaTemplateCriteriaItem[];
  activities: CriteriaTemplateActivityOption[];
}) {
  const [editingGroup, setEditingGroup] =
    useState<CriteriaTemplateGroupItem | null>(null);

  const [groupFormOpen, setGroupFormOpen] = useState(false);
  function closeGroupForm() { setEditingGroup(null); setGroupFormOpen(false); }

  return (
    <>


      <CriteriaTemplateStructureTable
        templateId={templateId}
        templateForType={templateForType}
        groups={groups}
        criteria={criteria}
        activities={activities}
        editingGroupCode={editingGroup?.code ?? null}
        onAddGroup={() => { setEditingGroup(null); setGroupFormOpen(true); }}
        groupForm={groupFormOpen ? <CriteriaGroupCreateForm key={editingGroup?.code ?? "create"}
        templateId={templateId}
        templateForType={templateForType}
        editingGroup={editingGroup}
        mandatoryCount={editingGroup ? criteria.filter(item=>item.groupCode===editingGroup.code && item.isRequired).length : 0}
        criteriaCount={editingGroup ? criteria.filter(item=>item.groupCode===editingGroup.code).length : 0}
        onCancelEdit={closeGroupForm}
        onSaved={() => { closeGroupForm(); toast.success("Đã lưu tiêu chuẩn."); }}
      /> : null}
        onEditGroup={group => { setEditingGroup(group); setGroupFormOpen(true); }}
        onCancelGroupEdit={closeGroupForm}
      />
    </>
  );
}
