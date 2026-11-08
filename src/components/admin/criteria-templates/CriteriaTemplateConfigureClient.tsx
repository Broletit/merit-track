"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
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
  saveControl,
}: {
  templateId: number;
  templateForType: string;
  groups: CriteriaTemplateGroupItem[];
  criteria: CriteriaTemplateCriteriaItem[];
  activities: CriteriaTemplateActivityOption[];
  saveControl?: ReactNode;
}) {
  const [editingGroup, setEditingGroup] =
    useState<CriteriaTemplateGroupItem | null>(null);
  const router = useRouter();

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
        saveControl={saveControl}
        onDataChanged={() => router.refresh()}
        editingGroupCode={editingGroup?.code ?? null}
        onAddGroup={() => { setEditingGroup(null); setGroupFormOpen(true); }}
        groupForm={groupFormOpen ? <CriteriaGroupCreateForm key={editingGroup?.code ?? "create"}
        templateId={templateId}
        templateForType={templateForType}
        editingGroup={editingGroup}
        mandatoryCount={editingGroup ? criteria.filter(item=>item.groupCode===editingGroup.code && item.isRequired).length : 0}
        criteriaCount={editingGroup ? criteria.filter(item=>item.groupCode===editingGroup.code).length : 0}
        onCancelEdit={closeGroupForm}
        onSaved={() => { closeGroupForm(); toast.success("Đã lưu tiêu chuẩn."); router.refresh(); }}
      /> : null}
        onEditGroup={group => { setEditingGroup(group); setGroupFormOpen(true); }}
        onCancelGroupEdit={closeGroupForm}
      />
    </>
  );
}
