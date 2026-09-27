"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { scanActivityQr } from "@/server/actions/activities/scanActivityQr";
import ActionFeedback from "@/components/shared/ActionFeedback";

type ScanState = {
  ok: boolean;
  message: string;
};

export default function FacultyOfficerCameraScanner({
  activityId,
}: {
  activityId: number;
}) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastPayloadRef = useRef("");
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const beepRef = useRef<HTMLAudioElement | null>(null);

  const [running, setRunning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [state, setState] = useState<ScanState>({
    ok: false,
    message: "",
  });

  const readerId = `faculty-checkin-reader-${activityId}`;

  useEffect(() => {
    beepRef.current = new Audio("/beep.mp3");

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }

      const scanner = scannerRef.current;
      scannerRef.current = null;

      if (scanner) {
        void (async () => {
          try {
            if (scanner.isScanning) await scanner.stop();
            await scanner.clear();
          } catch {
            // The scanner may already have been released during unmount.
          }
        })();
      }
    };
  }, []);

  function flashMessage(nextState: ScanState) {
    setState(nextState);

    if (nextState.ok && beepRef.current) {
      beepRef.current.currentTime = 0;
      void beepRef.current.play().catch(() => {});
    }

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = setTimeout(() => {
      setState({
        ok: false,
        message: "",
      });
    }, 2500);
  }

  async function stopScanner() {
    const scanner = scannerRef.current;

    if (scanner) {
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }

        await scanner.clear();
      } catch {
        // ignore
      }
    }

    scannerRef.current = null;
    setRunning(false);
  }

  async function startScanner() {
    if (running) return;

    setState({ ok: false, message: "" });

    const scanner = new Html5Qrcode(readerId);
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: {
            width: 300,
            height: 300,
          },
        },
        async (decodedText) => {
          const payload = decodedText.trim();

          if (!payload) return;
          if (processing) return;
          if (payload === lastPayloadRef.current) return;

          lastPayloadRef.current = payload;
          setProcessing(true);

          const result = await scanActivityQr(activityId, payload, "qr");

          flashMessage({
            ok: result.ok,
            message: result.message,
          });

          setProcessing(false);

          setTimeout(() => {
            lastPayloadRef.current = "";
          }, 1200);
        },
        () => {
          // Bỏ qua lỗi đọc từng frame.
        }
      );

      setRunning(true);
    } catch {
      flashMessage({
        ok: false,
        message:
          "Không mở được camera. Hãy kiểm tra quyền camera hoặc nhập MSSV thủ công.",
      });

      await stopScanner();
    }
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <ActionFeedback pending={processing} message={state.message} ok={state.ok} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Quét QR bằng camera
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Căn mã QR cá nhân của sinh viên vào khung vuông để điểm danh.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={startScanner}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
          >
            <Camera size={16} />
            Mở camera
          </button>

          <button
            type="button"
            onClick={() => void stopScanner()}
            disabled={!running}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <CameraOff size={16} />
            Tắt camera
          </button>
        </div>
      </div>

      <div className="relative mt-6 flex justify-center">
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-slate-950 shadow-lg ring-1 ring-slate-200">
          <div id={readerId} className="h-90 w-full" />

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-65 w-65 rounded-2xl border-4 border-white/80 shadow-[0_0_0_999px_rgba(2,6,23,0.35)]" />
          </div>

          {processing ? (
            <div className="pointer-events-none absolute bottom-4 left-1/2 z-9998 -translate-x-1/2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 shadow-lg ring-1 ring-blue-100">
              Đang xử lý QR...
            </div>
          ) : null}

        </div>
      </div>
    </section>
  );
}
