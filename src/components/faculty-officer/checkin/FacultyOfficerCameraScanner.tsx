"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, CheckCircle2, CircleX } from "lucide-react";

import { scanActivityQr } from "@/server/actions/activities/scanActivityQr";

type ScanState = {
  ok: boolean;
  message: string;
};

export default function FacultyOfficerCameraScanner({
  activityId,
}: {
  activityId: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraGeneration = useRef(0);
  const scanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [starting, setStarting] = useState(false);
  const feedbackRef = useRef<HTMLDialogElement>(null);
  const lastPayloadRef = useRef("");
  const processingRef = useRef(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  const [running, setRunning] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [state, setState] = useState<ScanState>({
    ok: false,
    message: "",
  });

  useEffect(() => {
    const generation = cameraGeneration;

    return () => {
      generation.current++;
      if (scanTimer.current) clearTimeout(scanTimer.current);
      streamRef.current?.getTracks().forEach(track => track.stop());

      const audio = audioRef.current;
      audioRef.current = null;
      void audio?.close().catch(() => {});
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }

    };
  }, []);

  function flashMessage(nextState: ScanState) {
    setState(nextState);

    if (nextState.ok && audioRef.current) {
      const context = audioRef.current;
      void context.resume().then(() => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = 1400;
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.35, context.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.23);
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.start(); oscillator.stop(context.currentTime + 0.25);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      }).catch(() => {});
    }

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = setTimeout(() => {
      setState({
        ok: false,
        message: "",
      });
      lastPayloadRef.current = "";
    }, 3000);
  }

  function dismissFeedback() {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
    feedbackRef.current?.close();
    lastPayloadRef.current = "";
    setState({ ok: false, message: "" });
  }

  function stopScanner() {
    cameraGeneration.current++;
    if (scanTimer.current) clearTimeout(scanTimer.current);
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStarting(false);
    setRunning(false);
    lastPayloadRef.current = "";
  }

  useEffect(() => {
    const dialog = feedbackRef.current;
    if (state.message && !dialog?.open) dialog?.showModal();
    if (!state.message) dialog?.close();
  }, [state.message]);

  async function handleScan(payload: string) {
    payload = payload.trim();
    if (!payload || processingRef.current || payload === lastPayloadRef.current || feedbackRef.current?.open) return;
    processingRef.current = true;
    lastPayloadRef.current = payload;
    setProcessing(true);
    try {
      const result = await scanActivityQr(activityId, payload, "qr");
      flashMessage({ ok: result.ok, message: result.message });
    } catch {
      flashMessage({ ok: false, message: "Không thể gửi kết quả điểm danh. Vui lòng kiểm tra kết nối và quét lại." });
    } finally {
      processingRef.current = false;
      setProcessing(false);
    }
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const returnToPage = () => {
      const nativeVideo = video as HTMLVideoElement & { webkitExitFullscreen?: () => void };
      try { nativeVideo.webkitExitFullscreen?.(); } catch { /* Stop the stream below. */ }
      if (document.fullscreenElement === video) void document.exitFullscreen().catch(() => {});
      stopScanner();
      flashMessage({ ok: false, message: "Trình duyệt vừa chuyển camera sang toàn màn hình. Camera đã tắt để giữ trang quét; hãy mở link trực tiếp trong Safari và tải lại trang." });
    };
    video.addEventListener("webkitbeginfullscreen", returnToPage);
    const onFullscreenChange = () => { if (document.fullscreenElement === video) returnToPage(); };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      video.removeEventListener("webkitbeginfullscreen", returnToPage);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  async function startScanner() {
    if (running || starting) return;
    const agent = navigator.userAgent || "";
    if (/iPhone|iPod/i.test(agent) && /Zalo|FBAN|FBAV|Instagram|Line\//i.test(agent)) {
      flashMessage({ ok: false, message: "Trình duyệt trong ứng dụng có thể ép camera toàn màn hình. Hãy chọn Mở bằng Safari để quét trong khung của trang và nhận thông báo tại đây." });
      return;
    }
    if (!window.isSecureContext) {
      flashMessage({ok:false,message:"Camera trên điện thoại cần HTTPS. Địa chỉ HTTP qua IP mạng nội bộ không thể mở camera; hãy mở web bằng HTTPS hoặc nhập MSSV thủ công."});
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      flashMessage({ok:false,message:"Trình duyệt này không hỗ trợ camera. Hãy mở web bằng Chrome hoặc Safari."});
      return;
    }
    // Unlock sound in the user gesture before waiting for camera permission.
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
      if (session) { try { session.type = "playback"; } catch { /* Older browsers may reject this optional hint. */ } }
      if ((!audioRef.current || audioRef.current.state === "closed") && AudioContextClass) audioRef.current = new AudioContextClass();
      const context = audioRef.current;
      if (context) {
        // Start an actual silent source within the tap; resume alone can remain locked on iOS.
        const source = context.createBufferSource();
        source.buffer = context.createBuffer(1, 1, context.sampleRate);
        source.connect(context.destination);
        source.start(0);
        source.onended = () => source.disconnect();
        void context.resume().catch(() => {});
      }
    } catch { /* Camera remains usable when sound is unavailable. */ }
    setState({ ok: false, message: "" });
    const generation = ++cameraGeneration.current;
    setStarting(true);
    try {
      const decoder = await import("barcode-detector/ponyfill");
      await decoder.prepareZXingModule({ fireImmediately: true, overrides: { locateFile: path => path.endsWith(".wasm") ? "/wasm/zxing_reader.wasm" : path } });
      if (generation !== cameraGeneration.current) return;
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      if (generation !== cameraGeneration.current) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Không tìm thấy khung camera.");
      video.muted = true; video.defaultMuted = true; video.playsInline = true; video.controls = false;
      video.setAttribute("playsinline", ""); video.setAttribute("webkit-playsinline", "");
      video.disableRemotePlayback = true;
      video.setAttribute("x-webkit-airplay", "deny");
      video.setAttribute("controlslist", "nofullscreen noremoteplayback nodownload");
      video.srcObject = stream;
      await video.play();
      if (generation !== cameraGeneration.current) return;
      const detector = new decoder.BarcodeDetector({ formats: ["qr_code"] });
      const scanFrame = async () => {
        if (generation !== cameraGeneration.current) return;
        if (video.readyState >= 2 && !processingRef.current && !feedbackRef.current?.open) {
          try {
            const codes = await detector.detect(video);
            if (generation === cameraGeneration.current && codes[0]?.rawValue) await handleScan(codes[0].rawValue);
          } catch { /* An unreadable frame does not interrupt the camera. */ }
        }
        if (generation === cameraGeneration.current) scanTimer.current = setTimeout(() => void scanFrame(), 150);
      };
      setRunning(true);
      void scanFrame();
    } catch (error) {
      if (generation !== cameraGeneration.current) return;
      stopScanner();
      const name = error instanceof Error ? error.name : "";
      const message = name === "NotAllowedError" ? "Camera bị từ chối quyền truy cập. Hãy cho phép camera trong cài đặt của trình duyệt." : name === "NotFoundError" ? "Không tìm thấy camera trên thiết bị." : name === "NotReadableError" ? "Camera đang được ứng dụng khác sử dụng. Hãy đóng ứng dụng đó và thử lại." : "Không thể khởi tạo camera hoặc bộ đọc QR. Vui lòng tải lại trang và kiểm tra kết nối.";
      flashMessage({ ok: false, message });
    } finally {
      if (generation === cameraGeneration.current) setStarting(false);
    }
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Quét QR bằng camera
          </h2>
        </div>

        <div className="flex gap-2">
          {!running ? <button
            type="button"
            onClick={startScanner}
            disabled={starting}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
          >
            <Camera size={16} />
            Mở camera
          </button> :

          <button
            type="button"
            onClick={() => void stopScanner()}
            disabled={!running}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <CameraOff size={16} />
            Tắt camera
          </button>}
        </div>
      </div>

      <dialog ref={feedbackRef} aria-label="Kết quả điểm danh" onCancel={event => { event.preventDefault(); dismissFeedback(); }}
        onClick={event => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dismissFeedback();
        }}
        className={`fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border-2 p-6 shadow-xl backdrop:bg-slate-950/30 ${state.ok ? "border-emerald-400 bg-emerald-50 text-emerald-900" : "border-red-400 bg-red-50 text-red-900"}`}>
        <div className="flex items-start gap-3" role={state.ok ? "status" : "alert"}>
          {state.ok ? <CheckCircle2 size={30} className="shrink-0 text-emerald-600" /> : <CircleX size={30} className="shrink-0 text-red-600" />}
          <div><h3 className="font-semibold">{state.ok ? "Điểm danh thành công" : "Điểm danh không thành công"}</h3><p className="mt-2 text-sm">{state.message}</p></div>
        </div>
      </dialog>
      <div className="relative mt-4 flex justify-center">
        <div className="relative w-full max-w-md overflow-hidden rounded-none bg-slate-950 shadow-lg ring-1 ring-slate-200">
          <div className="qr-inline-camera relative aspect-square w-full">
            <video ref={videoRef} autoPlay muted playsInline controls={false} disablePictureInPicture
              className="absolute inset-0 block h-full w-full object-cover" aria-label="Camera quét mã QR" />
            {!running && <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-slate-300">{starting ? "Đang mở camera..." : <Camera size={48} />}</div>}
          </div>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="aspect-square w-[70%] max-w-65 rounded-none border-4 border-white/80" />
          </div>

          {processing ? (
            <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-none bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 shadow-lg ring-1 ring-blue-100">
              Đang xử lý QR...
            </div>
          ) : null}

        </div>
      </div>
    </section>
  );
}
