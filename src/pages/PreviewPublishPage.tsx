import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useGetTestByIdQuery, useUpdateTestMutation } from "@/api/testsApi";
import { useFetchBulkQuestionsQuery } from "@/api/questionsApi";
import { Button } from "@/components/ui/Button";
import { cn, getErrorMessage } from "@/lib/utils";

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

  const handlePublish = async () => {
    if (!testId) return;
    try {
      // PUT hamesha PARTIAL update hoti hai — sirf status field bhej rahe
      // hai, baaki test data waisa hi rahega
      await updateTest({ id: testId, body: { status: "live" } }).unwrap();
      toast.success("Test published!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(
        getErrorMessage(err, "Could not publish the test. Please try again."),
      );
    }
  };

  if (isLoadingTest)
    return <p className="text-sm text-ink-500">Loading test…</p>;
  if (!test) return <p className="text-sm text-danger-500">Test not found.</p>;

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
              {index + 1}. {q.question}
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
        <Button isLoading={isPublishing} onClick={handlePublish}>
          Publish Test
        </Button>
      </div>
    </div>
  );
}
