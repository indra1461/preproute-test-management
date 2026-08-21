import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useGetTestByIdQuery } from "@/api/testsApi";
import { useBulkCreateQuestionsMutation } from "@/api/questionsApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { getErrorMessage } from "@/lib/utils";
import type { CreateQuestionPayload } from "@/types";

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
});

type QuestionFormValues = z.infer<typeof questionSchema>;

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
};

export default function AddQuestionsPage() {
  const { id: testId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: test } = useGetTestByIdQuery(testId ?? "", { skip: !testId });
  const [bulkCreateQuestions, { isLoading: isSaving }] =
    useBulkCreateQuestionsMutation();

  const [questions, setQuestions] = useState<QuestionFormValues[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: emptyQuestion,
  });

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

  const onSaveAndContinue = async () => {
    if (questions.length === 0) {
      toast.error("Add at least 1 question before continuing.");
      return;
    }
    if (!testId) return;

    const payload: CreateQuestionPayload[] = questions.map((q) => ({
      type: "mcq",
      test_id: testId,
      subject: test?.subject ?? "",
      ...q,
    }));

    try {
      await bulkCreateQuestions(payload).unwrap();
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
    <div className="mx-auto max-w-4xl space-y-6">
      {test && (
        <div className="rounded-xl border border-line-200 bg-white p-4">
          <p className="text-sm font-semibold text-ink-900">{test.name}</p>
          <p className="mt-1 text-xs text-ink-500">
            {test.subject} · {test.total_time} Min · {test.total_marks} Marks
          </p>
        </div>
      )}

      <div className="rounded-xl border border-line-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-ink-900">
          Question{" "}
          {editingIndex !== null ? editingIndex + 1 : questions.length + 1}
        </h2>

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
                className="flex items-center justify-between py-3"
              >
                <span className="line-clamp-1 text-sm text-ink-700">
                  {index + 1}. {q.question}
                </span>
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
  );
}
