"use client";
import { useEffect, useState } from "react";
import { COHORTS } from "@/lib/cohorts/cohorts";

export default function useCohorts() {
  const [cohorts, setCohorts] = useState<number[]>([...COHORTS]);
  useEffect(() => {
    let active = true;
    fetch("/api/cohorts").then(response => response.ok ? response.json() : null)
      .then(data => { if (active && Array.isArray(data?.cohorts)) setCohorts(data.cohorts); })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  return { cohorts, setCohorts };
}
