"use client";

import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import useConfirmation from "@/components/shared/useConfirmation";
import { discardCriteriaTemplateEdit } from "@/server/actions/criteria-templates/discardCriteriaTemplateEdit";

export default function CriteriaTemplateEditNavigationGuard({ templateId }: { templateId: number }) {
  const { confirm, modal } = useConfirmation();
  const confirmRef = useRef(confirm);
  const bypass = useRef(false);

  useEffect(() => {
    confirmRef.current = confirm;
  }, [confirm]);

  useEffect(() => {
    const currentUrl = window.location.href;
    window.history.pushState({ criteriaTemplateEditGuard: true }, "", currentUrl);

    async function confirmLeave() {
      const leave = await confirmRef.current({
        title: "Rời trang?",
        message: "Các chỉnh sửa chưa áp dụng sẽ bị xóa.",
        confirmLabel: "Rời trang",
        cancelLabel: "Tiếp tục",
      });
      if (leave === null) return false;
      try {
        await discardCriteriaTemplateEdit(templateId);
        return true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể hủy bản chỉnh sửa.");
        return false;
      }
    }

    function handleClick(event: MouseEvent) {
      if (bypass.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void confirmLeave().then(leave => {
        if (!leave) return;
        bypass.current = true;
        window.location.assign(destination.href);
      });
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (bypass.current) return;
      event.preventDefault();
      event.returnValue = "";
    }

    function handlePageHide() {
      if (bypass.current) return;
      navigator.sendBeacon(`/api/admin/criteria-templates/${templateId}/discard-draft`, new Blob());
    }

    function handlePopState() {
      if (bypass.current) return;
      window.history.pushState({ criteriaTemplateEditGuard: true }, "", currentUrl);
      void confirmLeave().then(leave => {
        if (!leave) return;
        bypass.current = true;
        window.history.go(-2);
      });
    }

    document.addEventListener("click", handleClick, true);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("popstate", handlePopState);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [templateId]);

  return modal;
}
