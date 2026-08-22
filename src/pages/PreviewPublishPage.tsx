import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useGetTestByIdQuery, useUpdateTestMutation } from "@/api/testsApi";
import { useFetchBulkQuestionsQuery } from "@/api/questionsApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn, getErrorMessage } from "@/lib/utils";

type LiveUntilOption =
  | "always"
  | "1_week"
  | "2_weeks"
  | "3_weeks"
  | "1_month"
  | "custom";

const LIVE_UNTIL_OPTIONS: { value: LiveUntilOption; label: string }[] = [
  { value: "always", label: "Always Available" },
  { value: "1_week", label: "1 Week" },
  { value: "2_weeks", label: "2 Weeks" },
  { value: "3_weeks", label: "3 Weeks" },
  { value: "1_month", label: "1 Month" },
  { value: "custom", label: "Custom Duration" },
];

interface ScheduleDetails {
  scheduledAt: string;
  liveUntil: LiveUntilOption;
  customLiveUntil?: string;
}

interface PublishModalProps {
  open: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onPublishNow: () => void;
  onSchedulePublish: (details: ScheduleDetails) => void;
}

function PublishModal({
  open,
  isSubmitting,
  onClose,
  onPublishNow,
  onSchedulePublish,
}: PublishModalProps) {
  const [tab, setTab] = useState<"now" | "schedule">("now");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [liveUntil, setLiveUntil] = useState<LiveUntilOption>("always");
  const [customEndDate, setCustomEndDate] = useState("");
  const [customEndTime, setCustomEndTime] = useState("");

  if (!open) return null;

  const handleConfirm = () => {
    if (tab === "now") {
      onPublishNow();
      return;
    }

    if (!date || !time) {
      toast.error("Please select a schedule date and time.");
      return;
    }
    if (liveUntil === "custom" && (!customEndDate || !customEndTime)) {
      toast.error("Please select a custom end date and time.");
      return;
    }

    onSchedulePublish({
      scheduledAt: new Date(`${date}T${time}`).toISOString(),
      liveUntil,
      customLiveUntil:
        liveUntil === "custom"
          ? new Date(`${customEndDate}T${customEndTime}`).toISOString()
          : undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="publish-modal-title"
          className="text-lg font-semibold text-ink-900"
        >
          Publish Test
        </h2>

        <div className="mt-4 inline-flex rounded-lg border border-line-200 p-1">
          <button
            type="button"
            onClick={() => setTab("now")}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium",
              tab === "now"
                ? "bg-brand-50 text-brand-600"
                : "text-ink-500 hover:text-ink-700",
            )}
          >
            Publish Now
          </button>
          <button
            type="button"
            onClick={() => setTab("schedule")}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium",
              tab === "schedule"
                ? "bg-brand-50 text-brand-600"
                : "text-ink-500 hover:text-ink-700",
            )}
          >
            Schedule Publish
          </button>
        </div>

        {tab === "schedule" && (
          <div className="mt-5 space-y-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input
                label="Select Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <Input
                label="Select Time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>

            <div>
              <p className="text-sm font-medium text-ink-700">Live Until</p>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                {LIVE_UNTIL_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 text-sm text-ink-700"
                  >
                    <input
                      type="radio"
                      name="live_until"
                      checked={liveUntil === opt.value}
                      onChange={() => setLiveUntil(opt.value)}
                      className="accent-brand-500"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {liveUntil === "custom" && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input
                  label="Select End Date"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
                <Input
                  label="Select End Time"
                  type="time"
                  value={customEndTime}
                  onChange={(e) => setCustomEndTime(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} isLoading={isSubmitting}>
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PreviewPublishPage() {
  const { id: testId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: test, isLoading: isLoadingTest } = useGetTestByIdQuery(
    testId ?? "",
    { skip: !testId },
  );

  // Jab tak test.questions (IDs ka array) na aa jaye, ye query nahi chalegi —
  // isliye dono queries "chained/dependent" hai
  const { data: questions, isLoading: isLoadingQuestions } =
    useFetchBulkQuestionsQuery(test?.questions ?? [], {
      skip: !test?.questions?.length,
    });

  const [updateTest, { isLoading: isPublishing }] = useUpdateTestMutation();
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  const handlePublishNow = async () => {
    if (!testId) return;
    try {
      // PUT hamesha PARTIAL update hoti hai — sirf status field bhej rahe
      // hai, baaki test data waisa hi rahega
      await updateTest({ id: testId, body: { status: "live" } }).unwrap();
      toast.success("Test published!");
      setIsPublishModalOpen(false);
      navigate("/dashboard");
    } catch (err) {
      toast.error(
        getErrorMessage(err, "Could not publish the test. Please try again."),
      );
    }
  };

  const handleSchedulePublish = async ({
    scheduledAt,
    liveUntil,
    customLiveUntil,
  }: ScheduleDetails) => {
    if (!testId) return;
    try {
      // Best-guess payload — scheduled_at/live_until aren't documented, see
      // the UpdateTestPayload comment in types/index.ts
      await updateTest({
        id: testId,
        body: {
          status: "scheduled",
          scheduled_at: scheduledAt,
          live_until: liveUntil,
          ...(customLiveUntil ? { custom_live_until: customLiveUntil } : {}),
        },
      }).unwrap();
      toast.success("Test scheduled!");
      setIsPublishModalOpen(false);
      navigate("/dashboard");
    } catch (err) {
      // Backend may not accept the undocumented scheduling fields — fall
      // back to just the status so the test is at least marked scheduled.
      try {
        await updateTest({ id: testId, body: { status: "scheduled" } }).unwrap();
        toast.success(
          "Test marked as scheduled. Exact schedule time may not be saved — the provided API doesn't document this field.",
        );
        setIsPublishModalOpen(false);
        navigate("/dashboard");
      } catch (fallbackErr) {
        toast.error(
          getErrorMessage(
            fallbackErr,
            "Could not schedule the test. Please try again.",
          ),
        );
      }
    }
  };

  if (isLoadingTest)
    return <p className="text-sm text-ink-500">Loading test…</p>;
  if (!test) return <p className="text-sm text-danger-500">Test not found.</p>;

  const linkedQuestionsCount = test.questions?.length ?? 0;
  const allQuestionsDone = linkedQuestionsCount === test.total_questions;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">
          Preview & Publish
        </h1>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => navigate(`/tests/${testId}/edit`)}
          >
            Edit Test
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate(`/tests/${testId}/questions`)}
          >
            Edit Questions
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-medium text-ink-500">Test created</p>
        {allQuestionsDone ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-3 py-1 text-xs font-medium text-success-600">
            <CheckCircle2 size={14} /> All {test.total_questions} Questions
            done
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-50 px-3 py-1 text-xs font-medium text-warning-500">
            <AlertCircle size={14} /> {linkedQuestionsCount}/
            {test.total_questions} Questions done
          </span>
        )}
      </div>

      <div className="rounded-xl border border-line-200 bg-white p-6">
        <p className="text-lg font-semibold text-ink-900">{test.name}</p>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-500">
          <span>Subject: {test.subject}</span>
          <span className="capitalize">Difficulty: {test.difficulty}</span>
          <span>Duration: {test.total_time} Min</span>
          <span>Total Marks: {test.total_marks}</span>
          <span>Questions: {test.total_questions}</span>
        </div>
        <div className="mt-3 flex gap-4 text-xs text-ink-500">
          <span>Correct: +{test.correct_marks}</span>
          <span>Wrong: {test.wrong_marks}</span>
          <span>Unattempted: +{test.unattempt_marks}</span>
        </div>
      </div>

      <div className="space-y-4">
        {isLoadingQuestions && (
          <p className="text-sm text-ink-500">Loading questions…</p>
        )}
        {questions?.map((q, index) => (
          <div
            key={q.id}
            className="rounded-xl border border-line-200 bg-white p-5"
          >
            <p className="text-sm font-medium text-ink-900">
              {index + 1}.{" "}
              {/* Safe: `q.question` HTML only ever comes from the admin's own
                  Bold/Italic/Underline editor on Add Questions — never from an
                  external/untrusted source. Rendering raw HTML from
                  untrusted input via dangerouslySetInnerHTML would be an
                  XSS risk. */}
              <span
                dangerouslySetInnerHTML={{ __html: q.question }}
              />
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              {(["option1", "option2", "option3", "option4"] as const).map(
                (key) => (
                  <div
                    key={key}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm",
                      q.correct_option === key
                        ? "border-success-500 bg-success-50 text-success-600"
                        : "border-line-200 text-ink-700",
                    )}
                  >
                    {q[key]}
                  </div>
                ),
              )}
            </div>
            {q.explanation && (
              <p className="mt-3 text-xs text-ink-500">
                Explanation: {q.explanation}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          disabled={isPublishing}
          onClick={() => setIsPublishModalOpen(true)}
        >
          Publish Test
        </Button>
      </div>

      <PublishModal
        open={isPublishModalOpen}
        isSubmitting={isPublishing}
        onClose={() => setIsPublishModalOpen(false)}
        onPublishNow={handlePublishNow}
        onSchedulePublish={handleSchedulePublish}
      />
    </div>
  );
}
