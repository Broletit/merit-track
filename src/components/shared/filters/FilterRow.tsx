"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

type FilterRowProps = {
  children: ReactNode;
  className?: string;
};

function flatten(node: ReactNode): ReactNode[] {
  return Children.toArray(node).flatMap((child) =>
    isValidElement<{ children?: ReactNode }>(child) && child.type === "" ? flatten(child.props.children) : [child]
  );
}

function text(node: ReactNode): string {
  return flatten(node)
    .map((child) => (typeof child === "string" || typeof child === "number" ? String(child) : ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function labelFromText(value: string) {
  const normalized = value.replace(/^Tất cả\s+/i, "").replace(/^Lọc theo\s+/i, "").trim();
  if (/^tìm\b/i.test(value)) return "Tìm kiếm";
  if (/^sắp xếp\b/i.test(value)) return "Sắp xếp";
  return normalized ? normalized[0].toUpperCase() + normalized.slice(1) : "Bộ lọc";
}

function findControl(node: ReactNode): { label?: string } | null {
  if (!isValidElement<Record<string, unknown>>(node)) return null;
  const props = node.props;
  const explicitLabel = props["data-filter-label"];
  if (typeof explicitLabel === "string" && explicitLabel.trim()) {
    return { label: explicitLabel };
  }
  const type = typeof node.type === "string" ? node.type : "";
  if (type === "input" || type === "select" || type === "textarea") {
    const firstOption = type === "select"
      ? flatten(props.children as ReactNode).find((child): child is ReactElement<{ children?: ReactNode }> => isValidElement(child) && child.type === "option")
      : null;
    return {
      label: String(props["data-filter-label"] ?? props["aria-label"] ?? props.placeholder ?? (firstOption ? text(firstOption.props.children) : "")),
    };
  }
  if (typeof node.type !== "string") {
    const componentName = (node.type as { name?: string }).name;
    if (componentName === "CohortFilter") return { label: "Khóa" };
  }
  for (const child of flatten(props.children as ReactNode)) {
    const control = findControl(child);
    if (control) return control;
  }
  return null;
}

export default function FilterRow({ children, className = "" }: FilterRowProps) {
  return (
    <div className={`filter-row ${className}`}>
      {Children.toArray(children).map((child, index) => {
        if (!isValidElement<{ className?: string }>(child)) return child;
        if (child.props.className?.includes("filter-field")) return child;
        const label = labelFromText(findControl(child)?.label ?? "");
        const gridSpan = child.props.className
          ?.split(/\s+/)
          .filter((name) => /(?:^|:)col-span-\d+$/.test(name))
          .join(" ");
        return (
          <div key={child.key ?? index} className={`filter-field ${gridSpan ?? ""}`}>
            <span className="filter-field-label">{label}</span>
            {cloneElement(child)}
          </div>
        );
      })}
    </div>
  );
}
