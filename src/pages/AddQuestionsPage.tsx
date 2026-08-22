import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import Papa from "papaparse";
import {
  BarChart3,
  Check,
  Clock,
  Download,
  FileQuestion,
  Pencil,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useGetTestByIdQuery, useUpdateTestMutation } from "@/api/testsApi";
import {
  useBulkCreateQuestionsMutation,
  useFetchBulkQuestionsQuery,
} from "@/api/questionsApi";
import { useGetSubjectsQuery } from "@/api/subjectsApi";
import { useGetTopicsBySubjectQuery } from "@/api/topicsApi";
import {
  useGetSubTopicsByTopicQuery,
  useGetSubTopicsByTopicsQuery,
} from "@/api/subTopicsApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn, getErrorMessage } from "@/lib/utils";
import type { CreateQuestionPayload } from "@/types";

const difficultyBadgeStyles: Record<string, string> = {
  easy: "bg-success-50 text-success-600",
  medium: "bg-warning-50 text-warning-500",
  difficult: "bg-danger-50 text-danger-500",
};

const questionSchema = z.object({
  question: z.string().min(1, "Question text is required"),
  option1: z.string().min(1, "Required"),
  option2: z.string().min(1, "Required"),
  option3: z.string().min(1, "Required"),
  option4: z.string().min(1, "Required"),
  correct_option: z.enum(["option1", "option2", "option3", "option4"]),
  explanation: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "difficult"]).optional(),
  media_url: z.string().optional(),
  topic: z.string().optional(),
  sub_topic: z.string().optional(),
});

type QuestionFormValues = z.infer<typeof questionSchema>;
// "id" hai to matlab ye question pehle se server pe saved hai (read-only);
// nahi hai to ye is session me naya bana hai (editable)
type QuestionItem = QuestionFormValues & { id?: string };

const emptyQuestion: QuestionFormValues = {
  question: "",
  option1: "",
  option2: "",
  option3: "",
  option4: "",
  correct_option: "option1",
  explanation: "",
  difficulty: undefined,
  media_url: "",
  topic: "",
  sub_topic: "",
};

const CORRECT_OPTION_VALUES = [
  "option1",
  "option2",
  "option3",
  "option4",
] as const;

// CSV row -> form-shape question. question/option1-4/correct_option required;
// correct_option must be one of the 4 option keys — anything else, skip the row.
function parseCsvRow(row: Record<string, string>): QuestionFormValues | null {
  const question = row.question?.trim();
  const option1 = row.option1?.trim();
  const option2 = row.option2?.trim();
  const option3 = row.option3?.trim();
  const option4 = row.option4?.trim();
  const correctOption = row.correct_option?.trim();

  if (!question || !option1 || !option2 || !option3 || !option4) return null;
  if (
    !CORRECT_OPTION_VALUES.includes(
      correctOption as (typeof CORRECT_OPTION_VALUES)[number],
    )
  ) {
    return null;
  }

  const difficultyRaw = row.difficulty?.trim().toLowerCase();
  const difficulty =
    difficultyRaw === "easy" ||
    difficultyRaw === "medium" ||
    difficultyRaw === "difficult"
      ? difficultyRaw
      : undefined;

  return {
    question,
    option1,
    option2,
    option3,
    option4,
    correct_option: correctOption as (typeof CORRECT_OPTION_VALUES)[number],
    explanation: row.explanation?.trim() ?? "",
    difficulty,
    media_url: "",
    topic: row.topic?.trim() ?? "",
    sub_topic: row.sub_topic?.trim() ?? "",
  };
}

const SAMPLE_CSV_CONTENT =
  "question,option1,option2,option3,option4,correct_option,explanation,difficulty,topic,sub_topic\n" +
  '"What is the capital of France?","London","Paris","Berlin","Madrid","option2","Paris is the capital of France.","easy","",""\n';

export default function AddQuestionsPage() {
  const { id: testId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: test } = useGetTestByIdQuery(testId ?? "", { skip: !testId });

  // Test ke saath pehle se jude questions (agar hai) — sirf IDs milte hai
  // GET /tests/:id se, isliye fetchBulk se poora data nikal rahe hai
  const { data: existingQuestions } = useFetchBulkQuestionsQuery(
    test?.questions ?? [],
    {
      skip: !test?.questions?.length,
    },
  );

  const [bulkCreateQuestions, { isLoading: isSaving }] =
    useBulkCreateQuestionsMutation();
  const [updateTest] = useUpdateTestMutation();

  // Per-question Topic/Sub-topic dropdowns — options scoped to the test's
  // subject, same lookup chain CreateEditTestPage uses (GET /tests/:id
  // returns `subject` as a NAME, but the topics endpoint wants an ID)
  const { data: subjects } = useGetSubjectsQuery();
  const subjectId = subjects?.find((s) => s.name === test?.subject)?.id;
  const { data: topics } = useGetTopicsBySubjectQuery(subjectId ?? "", {
    skip: !subjectId,
  });

  // Summary card display only — resolve the test's topics/sub-topics (which
  // may come back from the API as either ids or names, same ambiguity noted
  // in CreateEditTestPage) to their names for the tag pills.
  const matchedTestTopics = (test?.topics ?? [])
    .map((value) => topics?.find((t) => t.id === value || t.name === value))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));
  const testTopicIds = matchedTestTopics.map((t) => t.id);
  const { data: testSubTopicsList } = useGetSubTopicsByTopicsQuery(
    testTopicIds,
    { skip: testTopicIds.length === 0 },
  );
  const matchedTestSubTopics = (test?.sub_topics ?? [])
    .map((value) =>
      testSubTopicsList?.find((st) => st.id === value || st.name === value),
    )
    .filter((st): st is NonNullable<typeof st> => Boolean(st));

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [hasLoadedExisting, setHasLoadedExisting] = useState(false);
  const questionRefs = useRef<(HTMLLIElement | null)[]>([]);

  // Existing questions ko form-shape me convert karke ek hi baar list me
  // daal do. "hasLoadedExisting" guard isliye — warna agar ye query kabhi
  // dobara refetch ho (RTK Query cache invalidate hone pe), to user ke
  // abhi-abhi add kiye naye questions overwrite ho jayenge
  useEffect(() => {
    if (existingQuestions && !hasLoadedExisting) {
      setQuestions(
        existingQuestions.map((q) => ({
          id: q.id,
          question: q.question,
          option1: q.option1,
          option2: q.option2,
          option3: q.option3,
          option4: q.option4,
          correct_option: q.correct_option,
          explanation: q.explanation ?? "",
          difficulty: q.difficulty,
          media_url: q.media_url ?? "",
          topic: q.topic ?? "",
          sub_topic: q.sub_topic ?? "",
        })),
      );
      setHasLoadedExisting(true);
    }
  }, [existingQuestions, hasLoadedExisting]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: emptyQuestion,
  });

  const selectedTopic = watch("topic");
  const { data: subTopics } = useGetSubTopicsByTopicQuery(
    selectedTopic ?? "",
    { skip: !selectedTopic },
  );

  const onAddQuestion = handleSubmit((values) => {
    if (editingIndex !== null) {
      setQuestions((prev) =>
        prev.map((q, i) => (i === editingIndex ? values : q)),
      );
      setEditingIndex(null);
    } else {
      setQuestions((prev) => [...prev, values]);
    }
    reset(emptyQuestion);
  });

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    reset(questions[index]);
  };

  const handleDelete = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      reset(emptyQuestion);
    }
  };

  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleCsvButtonClick = () => {
    csvInputRef.current?.click();
  };

  // Client-side only — parsed rows are appended to the same local `questions`
  // state manual "Add Another Question" writes to, without an `id`, so they
  // flow through the exact same save/bulk-create logic untouched.
  const handleCsvFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          toast.error(
            "Could not parse the CSV file. Please check the format and try again.",
          );
          return;
        }

        const imported: QuestionFormValues[] = [];
        let skipped = 0;
        for (const row of results.data) {
          const parsed = parseCsvRow(row);
          if (parsed) {
            imported.push(parsed);
          } else {
            skipped += 1;
          }
        }

        if (imported.length > 0) {
          setQuestions((prev) => [...prev, ...imported]);
        }
        toast.success(
          `${imported.length} questions imported, ${skipped} rows skipped (invalid data).`,
        );
      },
      error: () => {
        toast.error(
          "Could not parse the CSV file. Please check the format and try again.",
        );
      },
    });
  };

  const handleDownloadSampleCsv = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "questions_sample.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const onSaveAndContinue = async () => {
    if (questions.length === 0) {
      toast.error("Add at least 1 question before continuing.");
      return;
    }
    if (!testId) return;

    const newQuestions = questions.filter((q) => !q.id);

    if (newQuestions.length === 0) {
      navigate(`/tests/${testId}/preview`);
      return;
    }

    const payload: CreateQuestionPayload[] = newQuestions.map(
      ({ id, ...q }) => ({
        type: "mcq",
        test_id: testId,
        subject: test?.subject ?? "",
        ...q,
      }),
    );

    try {
      // Step 1: naye questions create karo — server unki id return karta hai
      const created = await bulkCreateQuestions(payload).unwrap();

      // Step 2: test ke "questions" array me purani + nayi IDs jodke,
      // explicitly link karo — YE MISSING STEP THA
      const existingIds = test?.questions ?? [];
      const newIds = created.map((q) => q.id);
      await updateTest({
        id: testId,
        body: {
          questions: [...existingIds, ...newIds],
          total_questions: existingIds.length + newIds.length,
        },
      }).unwrap();

      toast.success("Questions saved!");
      navigate(`/tests/${testId}/preview`);
    } catch (err) {
      console.error(err);
      toast.error(
        getErrorMessage(err, "Could not save questions. Please try again."),
      );
    }
  };

  return (
    <div className="mx-auto max-w-6xl md:flex md:items-start md:gap-6">
      {/* Left question navigator — desktop only, form stays single-column on mobile */}
      <aside className="hidden shrink-0 md:sticky md:top-6 md:block md:w-56">
        <div className="rounded-xl border border-line-200 bg-white p-4">
          <p className="text-sm font-semibold text-ink-900">
            Total Questions: {questions.length}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {questions.length === 0 && (
              <p className="text-xs text-ink-300">No questions added yet.</p>
            )}
            {questions.map((q, index) => (
              <button
                key={index}
                type="button"
                onClick={() =>
                  questionRefs.current[index]?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  })
                }
                aria-label={`Jump to question ${index + 1}`}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium",
                  q.id
                    ? "border-success-500 bg-success-50 text-success-600"
                    : "border-line-200 text-ink-500 hover:bg-line-100",
                )}
              >
                {q.id ? <Check size={14} /> : index + 1}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-6">
        {test && (
        <div className="rounded-xl border border-line-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-ink-900">
                {test.name}
              </p>
              <p className="mt-1 text-sm text-ink-500">{test.subject}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-ink-900 px-3 py-1 text-xs font-medium capitalize text-white">
                {test.type}
              </span>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium capitalize",
                  difficultyBadgeStyles[test.difficulty],
                )}
              >
                {test.difficulty}
              </span>
            </div>
          </div>

          {matchedTestTopics.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-ink-500">Topics</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {matchedTestTopics.map((t) => (
                  <span
                    key={t.id}
                    className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-600"
                  >
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {matchedTestSubTopics.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-ink-500">Sub-topics</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {matchedTestSubTopics.map((st) => (
                  <span
                    key={st.id}
                    className="rounded-full border border-line-200 px-2.5 py-1 text-xs font-medium text-ink-700"
                  >
                    {st.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-line-200 pt-4 text-sm text-ink-500">
            <span className="flex items-center gap-1.5">
              <Clock size={14} /> {test.total_time} Min
            </span>
            <span className="flex items-center gap-1.5">
              <FileQuestion size={14} /> {test.total_questions} Q's
            </span>
            <span className="flex items-center gap-1.5">
              <BarChart3 size={14} /> {test.total_marks} Marks
            </span>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-line-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink-900">
            Question{" "}
            {editingIndex !== null ? editingIndex + 1 : questions.length + 1}
          </h2>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadSampleCsv}
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              Download sample CSV
            </button>
            <button
              type="button"
              onClick={handleCsvButtonClick}
              className="flex items-center gap-1.5 rounded-lg border border-line-200 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-line-100"
            >
              <Download size={14} /> CSV
            </button>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCsvFileChange}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          <Input
            label="Question"
            placeholder="Type here"
            error={errors.question?.message}
            {...register("question")}
          />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {(["option1", "option2", "option3", "option4"] as const).map(
              (key, idx) => (
                <div key={key} className="flex items-center gap-2">
                  <input
                    type="radio"
                    value={key}
                    {...register("correct_option")}
                    className="accent-brand-500"
                  />
                  <Input
                    placeholder={`Option ${idx + 1}`}
                    error={errors[key]?.message}
                    {...register(key)}
                  />
                </div>
              ),
            )}
          </div>

          <Input
            label="Explanation (optional)"
            placeholder="Type here"
            {...register("explanation")}
          />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Select label="Difficulty (optional)" {...register("difficulty")}>
              <option value="">Select</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="difficult">Difficult</option>
            </Select>
            <Input
              label="Media URL (optional)"
              placeholder="https://..."
              {...register("media_url")}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Select
              label="Topic (optional)"
              {...register("topic", {
                onChange: () => setValue("sub_topic", ""),
              })}
            >
              <option value="">Select topic</option>
              {topics?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <Select
              label="Sub-topic (optional)"
              disabled={!selectedTopic}
              {...register("sub_topic")}
            >
              <option value="">Select sub-topic</option>
              {subTopics?.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </Select>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={onAddQuestion}
            className="self-start"
          >
            {editingIndex !== null ? "Update Question" : "Add Another Question"}
          </Button>
        </div>
      </div>

      {questions.length > 0 && (
        <div className="rounded-xl border border-line-200 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-ink-900">
            Added Questions ({questions.length})
          </p>
          <ul className="divide-y divide-line-200">
            {questions.map((q, index) => (
              <li
                key={index}
                ref={(el) => {
                  questionRefs.current[index] = el;
                }}
                className="flex items-center justify-between py-3"
              >
                <span className="line-clamp-1 text-sm text-ink-700">
                  {index + 1}. {q.question}
                </span>
                {q.id ? (
                  <span className="text-xs text-ink-300">Saved</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(index)}
                      className="rounded-lg p-2 text-ink-500 hover:bg-line-100"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(index)}
                      className="rounded-lg p-2 text-danger-500 hover:bg-danger-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/dashboard")}
        >
          Exit
        </Button>
        <Button type="button" isLoading={isSaving} onClick={onSaveAndContinue}>
          Save & Continue
        </Button>
      </div>
      </div>
    </div>
  );
}
