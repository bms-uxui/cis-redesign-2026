import { useLocation } from "react-router";
import { useDictationContext } from "../contexts/DictationContext";
import LiveCaption from "./LiveCaption";

/**
 * Bridges the DictationContext to the LiveCaption modal so the modal lives
 * at AppShell level. This way navigating between pages doesn't unmount the
 * transcript — recording continues and the compact pill stays visible.
 */
export default function GlobalLiveCaption() {
  const { pathname } = useLocation();
  // /patient/new renders the transcript inline so the modal would be a
  // duplicate. Suppress it on that route.
  const suppressOnRoute = pathname === "/patient/new";

  const {
    status,
    segments,
    isProcessing,
    isRecording,
    source,
    minimized,
    setMinimized,
    reviewing,
    normalizedSegments,
    isNormalizing,
    summaryUi,
    isSummarizing,
    icdUi,
    isIcdLoading,
    stopSession,
    handleSummarize,
    handleSuggestIcd,
    handleSummaryAction,
    handleClose,
  } = useDictationContext();

  const isBusy = status === "transcribing" || status === "requesting";
  const modalVisible = (isRecording || isBusy || reviewing) && !suppressOnRoute;
  const displaySegments = normalizedSegments ?? segments;
  const reviewReady = reviewing && !isRecording && !isBusy && !isNormalizing;

  return (
    <LiveCaption
      visible={modalVisible}
      segments={displaySegments}
      status={status}
      source={source}
      isProcessing={isProcessing || isNormalizing}
      onStop={isRecording ? () => void stopSession() : undefined}
      onClose={reviewing && !isRecording && !isBusy ? handleClose : undefined}
      onSummarize={reviewReady ? handleSummarize : undefined}
      summaryUi={summaryUi}
      onSummaryAction={handleSummaryAction}
      isSummarizing={isSummarizing}
      onSuggestIcd={reviewReady ? handleSuggestIcd : undefined}
      icdUi={icdUi}
      isIcdLoading={isIcdLoading}
      minimized={minimized}
      onMinimize={() => setMinimized(true)}
      onExpand={() => setMinimized(false)}
    />
  );
}
