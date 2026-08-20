import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import { useGetSubjectsQuery } from "@/api/subjectsApi";
import { useGetTopicsBySubjectQuery } from "@/api/topicsApi";
import {
  useGetSubTopicsByTopicQuery,
  useGetSubTopicsByTopicsQuery,
} from "@/api/subTopicsApi";
import {
  useCreateTestMutation,
  useGetTestByIdQuery,
  useUpdateTestMutation,
} from "@/api/testsApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { cn } from "@/lib/utils";

const testFormSchema = z.object({
  type: z.enum(["chapterwise", "pyq", "mock"]),
  name: z.string().min(1, "Test name is required"),
  subject: z.string().min(1, "Subject is required"),
  topics: z.array(z.string()).min(1, "Select at least one topic"),
  sub_topics: z.array(z.string()).optional(),
  difficulty: z.enum(["easy", "medium", "difficult"]),
  total_time: z.coerce.number().min(1, "Duration is required"),
  correct_marks: z.coerce.number(),
  wrong_marks: z.coerce.number(),
  unattempt_marks: z.coerce.number(),
  total_questions: z.coerce.number().min(1, "Number of questions is required"),
  total_marks: z.coerce.number().min(1, "Total marks is required"),
});

type TestFormInput = z.input<typeof testFormSchema>;
type TestFormOutput = z.output<typeof testFormSchema>;

const typeTabs: { value: TestFormInput["type"]; label: string }[] = [
  { value: "chapterwise", label: "Chapter Wise" },
  { value: "pyq", label: "PYQ" },
  { value: "mock", label: "Mock Test" },
];

const difficultyOptions: {
  value: TestFormInput["difficulty"];
  label: string;
}[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "difficult", label: "Difficult" },
];

export default function CreateEditTestPage() {
  const navigate = useNavigate();
  const { id: testId } = useParams<{ id: string }>();
  const isEditMode = Boolean(testId);

  const { data: subjects } = useGetSubjectsQuery();
  const { data: existingTest, isLoading: isLoadingTest } = useGetTestByIdQuery(
    testId ?? "",
    { skip: !testId },
  );

  const [createTest, { isLoading: isCreating }] = useCreateTestMutation();
  const [updateTest, { isLoading: isUpdating }] = useUpdateTestMutation();
  const isSaving = isCreating || isUpdating;

  const {
    register,
    control,
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<TestFormInput, unknown, TestFormOutput>({
    resolver: zodResolver(testFormSchema),
    defaultValues: {
      type: "chapterwise",
      difficulty: "easy",
      wrong_marks: -1,
      unattempt_marks: 0,
      correct_marks: 5,
      topics: [],
      sub_topics: [],
    },
  });

  const selectedType = watch("type");
  const selectedSubject = watch("subject");
  const selectedTopics = watch("topics");

  // Cascading calls — 'skip' se batate hai "jab tak ID na ho, call mat karo"
  const { data: topics } = useGetTopicsBySubjectQuery(selectedSubject, {
    skip: !selectedSubject,
  });
  const { data: subTopicsSingle } = useGetSubTopicsByTopicQuery(
    selectedTopics[0] ?? "",
    {
      skip: selectedTopics.length !== 1,
    },
  );
  const { data: subTopicsMulti } = useGetSubTopicsByTopicsQuery(
    selectedTopics,
    {
      skip: selectedTopics.length < 2,
    },
  );
  const subTopics =
    selectedTopics.length === 1
      ? subTopicsSingle
      : selectedTopics.length > 1
        ? subTopicsMulti
        : [];

  // Edit mode: jab existing test data aa jaye, form ko usse pre-fill karo
  useEffect(() => {
    if (existingTest) {
      reset({
        type: existingTest.type,
        name: existingTest.name,
        subject: existingTest.subject,
        topics: existingTest.topics,
        sub_topics: existingTest.sub_topics ?? [],
        difficulty: existingTest.difficulty,
        total_time: existingTest.total_time,
        correct_marks: existingTest.correct_marks,
        wrong_marks: existingTest.wrong_marks,
        unattempt_marks: existingTest.unattempt_marks,
        total_questions: existingTest.total_questions,
        total_marks: existingTest.total_marks,
      });
    }
  }, [existingTest, reset]);

  const saveTest = async (data: TestFormOutput) => {
    if (isEditMode && testId) {
      return await updateTest({ id: testId, body: data }).unwrap();
    }
    return await createTest({ ...data, status: null }).unwrap();
  };

  const onSaveDraft = handleSubmit(async (data) => {
    await saveTest(data);
    navigate("/dashboard");
  });

  const onNext = handleSubmit(async (data) => {
    const test = await saveTest(data);
    navigate(`/tests/${test.id}/questions`);
  });

  if (isEditMode && isLoadingTest) {
    return <p className="text-sm text-ink-500">Loading test…</p>;
  }

  return (
    <div className="mx-auto max-w-4xl rounded-xl border border-line-200 bg-white p-6">
      <h1 className="text-lg font-semibold text-ink-900">Test creation</h1>

      <div className="mt-4 inline-flex rounded-lg bg-line-100 p-1">
        {typeTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setValue("type", tab.value)}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              selectedType === tab.value
                ? "bg-white text-brand-600 shadow-sm"
                : "text-ink-500",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
        <Select
          label="Subject"
          error={errors.subject?.message}
          {...register("subject", {
            // Subject badalte hi purane Topics/Sub-topics clear kar do —
            // ye sirf ASLI user interaction pe chalta hai, form.reset() pe nahi
            onChange: () => {
              setValue("topics", []);
              setValue("sub_topics", []);
            },
          })}
        >
          <option value="">Choose from Drop-down</option>
          {subjects?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>

        <Input
          label="Name of Test"
          placeholder="Enter name of Test"
          error={errors.name?.message}
          {...register("name")}
        />

        <Controller
          name="topics"
          control={control}
          render={({ field }) => (
            <MultiSelect
              label="Topic"
              options={topics ?? []}
              value={field.value}
              disabled={!selectedSubject}
              error={errors.topics?.message}
              onChange={(next) => {
                field.onChange(next);
                setValue("sub_topics", []); // topics badle to sub-topics bhi reset
              }}
            />
          )}
        />

        <Controller
          name="sub_topics"
          control={control}
          render={({ field }) => (
            <MultiSelect
              label="Sub Topic"
              options={subTopics ?? []}
              value={field.value ?? []}
              disabled={selectedTopics.length === 0}
              onChange={field.onChange}
            />
          )}
        />

        <Input
          label="Duration (Minutes)"
          type="number"
          placeholder="Enter the time"
          error={errors.total_time?.message}
          {...register("total_time")}
        />

        <div>
          <p className="text-sm font-medium text-ink-700">
            Test Difficulty Level
          </p>
          <div className="mt-2 flex gap-6">
            {difficultyOptions.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 text-sm text-ink-700"
              >
                <input
                  type="radio"
                  value={opt.value}
                  {...register("difficulty")}
                  className="accent-brand-500"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <p className="mb-2 text-sm font-medium text-ink-700">
            Marking Scheme:
          </p>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Wrong Answer"
              type="number"
              {...register("wrong_marks")}
            />
            <Input
              label="Unattempted"
              type="number"
              {...register("unattempt_marks")}
            />
            <Input
              label="Correct Answer"
              type="number"
              {...register("correct_marks")}
            />
          </div>
        </div>

        <Input
          label="No of Questions"
          type="number"
          placeholder="Ex: 50"
          error={errors.total_questions?.message}
          {...register("total_questions")}
        />
        <Input
          label="Total Marks"
          type="number"
          placeholder="Ex: 250"
          error={errors.total_marks?.message}
          {...register("total_marks")}
        />

        <div className="mt-2 flex justify-end gap-3 md:col-span-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/dashboard")}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            isLoading={isSaving}
            onClick={onSaveDraft}
          >
            Save as Draft
          </Button>
          <Button type="button" isLoading={isSaving} onClick={onNext}>
            Next: Add Questions
          </Button>
        </div>
      </div>
    </div>
  );
}
