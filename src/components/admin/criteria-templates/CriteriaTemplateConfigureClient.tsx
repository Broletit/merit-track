"use client";

import { useState } from "react";
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

  return (
    <>
      <CriteriaGroupCreateForm
        templateId={templateId}
        editingGroup={editingGroup}
        onCancelEdit={() => setEditingGroup(null)}
        onSaved={() => setEditingGroup(null)}
      />

      <CriteriaTemplateStructureTable
        templateId={templateId}
        templateForType={templateForType}
        groups={groups}
        criteria={criteria}
        activities={activities}
        editingGroupCode={editingGroup?.code ?? null}
        onEditGroup={setEditingGroup}
        onCancelGroupEdit={() => setEditingGroup(null)}
      />
    </>
  );
}