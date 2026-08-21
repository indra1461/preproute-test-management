import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  useGetTestByIdQuery,
  useCreateTestMutation,
  useUpdateTestMutation,
} from "@/api/testsApi";
import { useGetSubjectsQuery } from "@/api/subjectsApi";
import { useGetTopicsBySubjectQuery } from "@/api/topicsApi";
import {
  useGetSubTopicsByTopicQuery,
  useGetSubTopicsByTopicsQuery,
} from "@/api/subTopicsApi";
import type { TestStatus } from "@/types";
import { getErrorMessage } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Button } from "@/components/ui/Button";

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

export default function CreateEditTestPage() {
  const { id: testId } = useParams<{ id: string }>();
  const isEditMode = Boolean(testId);
  const navigate = useNavigate();

  const { data: existingTest } = useGetTestByIdQuery(testId ?? "", {
    skip: !isEditMode,
  });
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
      name: "",
      subject: "",
      topics: [],
      sub_topics: [],
      difficulty: "easy",
      total_time: 0,
      correct_marks: 0,
      wrong_marks: 0,
      unattempt_marks: 0,
      total_questions: 0,
      total_marks: 0,
    },
  });

  const selectedSubject = watch("subject");
  const selectedTopics = watch("topics") ?? [];

  const { data: subjects } = useGetSubjectsQuery();
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

  // ---- Edit-mode prefill: 3-stage chain ----
  // Stage 1: basic fields + subject. GET /tests/:id returns `subject` as a NAME, but our
  // <select> stores it by ID, so we look up the matching subject's ID from the already-
  // loaded `subjects` list. topics/sub_topics start empty — their option lists don't
  // exist yet, since they only fetch once `selectedSubject` is set.
  useEffect(() => {
    if (existingTest && subjects) {
      const matchedSubject = subjects.find(
        (s) => s.name === existingTest.subject,
      );
      reset({
        type: existingTest.type,
        name: existingTest.name,
        subject: matchedSubject?.id ?? "",
        topics: [],
        sub_topics: [],
        difficulty: existingTest.difficulty,
        total_time: existingTest.total_time,
        correct_marks: existingTest.correct_marks,
        wrong_marks: existingTest.wrong_marks,
        unattempt_marks: existingTest.unattempt_marks,
        total_questions: existingTest.total_questions,
        total_marks: existingTest.total_marks,
      });
    }
  }, [existingTest, subjects, reset]);

  const [hasPrefilledTopics, setHasPrefilledTopics] = useState(false);
  const [hasPrefilledSubTopics, setHasPrefilledSubTopics] = useState(false);

  // Stage 2: once the topics list for the resolved subject arrives, match
  // existingTest.topics against it (checking both id and name, since we're not fully
  // sure which one the backend sends) and set the real IDs on the form.
  useEffect(() => {
    if (existingTest && topics && topics.length > 0 && !hasPrefilledTopics) {
      const matchedTopicIds = existingTest.topics
        .map(
          (value) => topics.find((t) => t.id === value || t.name === value)?.id,
        )
        .filter((id): id is string => Boolean(id));

      if (matchedTopicIds.length > 0) {
        setValue("topics", matchedTopicIds);
      }
      setHasPrefilledTopics(true); // run once — don't fight the user's manual edits later
    }
  }, [existingTest, topics, hasPrefilledTopics, setValue]);

  // Stage 3: once sub-topics for the resolved topics arrive, same matching pattern.
  useEffect(() => {
    if (
      existingTest &&
      hasPrefilledTopics &&
      subTopics &&
      subTopics.length > 0 &&
      !hasPrefilledSubTopics
    ) {
      const matchedSubTopicIds = (existingTest.sub_topics ?? [])
        .map(
          (value) =>
            subTopics.find((st) => st.id === value || st.name === value)?.id,
        )
        .filter((id): id is string => Boolean(id));

      setValue("sub_topics", matchedSubTopicIds);
      setHasPrefilledSubTopics(true);
    }
  }, [
    existingTest,
    subTopics,
    hasPrefilledTopics,
    hasPrefilledSubTopics,
    setValue,
  ]);

  const saveTest = async (values: TestFormOutput, status: TestStatus = "draft") => {
    const payload = { ...values, status };

    if (isEditMode && testId) {
      await updateTest({ id: testId, body: payload }).unwrap();
      return testId;
    }
    const created = await createTest(payload).unwrap();
    return created.id;
  };

  const onSaveDraft = handleSubmit(async (values) => {
    try {
      await saveTest(values, "draft");
      toast.success("Draft saved.");
      navigate("/dashboard");
    } catch (err) {
      toast.error(
        getErrorMessage(err, "Could not save draft. Please try again."),
      );
    }
  });

  const onNext = handleSubmit(async (values) => {
    try {
      const id = await saveTest(values);
      toast.success("Test details saved.");
      navigate(`/tests/${id}/questions`);
    } catch (err) {
      toast.error(
        getErrorMessage(err, "Could not save test details. Please try again."),
      );
    }
  });

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold text-ink-900">
        {isEditMode ? "Edit Test" : "Create Test"}
      </h1>

      <form className="mt-6 flex flex-col gap-4">
        <Select
          label="Test Type"
          error={errors.type?.message}
          {...register("type")}
        >
          <option value="chapterwise">Chapterwise</option>
          <option value="pyq">PYQ</option>
          <option value="mock">Mock</option>
        </Select>

        <Input
          label="Test Name"
          placeholder="Enter test name"
          error={errors.name?.message}
          {...register("name")}
        />

        <Select
          label="Subject"
          error={errors.subject?.message}
          {...register("subject", {
            onChange: () => {
              setValue("topics", []);
              setValue("sub_topics", []);
            },
          })}
        >
          <option value="">Select subject</option>
          {subjects?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>

        <Controller
          name="topics"
          control={control}
          render={({ field }) => (
            <MultiSelect
              label="Topics"
              options={topics ?? []}
              value={field.value ?? []}
              onChange={(next) => {
                field.onChange(next);
                setValue("sub_topics", []);
              }}
              error={errors.topics?.message}
              disabled={!selectedSubject}
            />
          )}
        />

        <Controller
          name="sub_topics"
          control={control}
          render={({ field }) => (
            <MultiSelect
              label="Sub-topics"
              options={subTopics ?? []}
              value={field.value ?? []}
              onChange={field.onChange}
              error={errors.sub_topics?.message}
              disabled={selectedTopics.length === 0}
            />
          )}
        />

        <Select
          label="Difficulty"
          error={errors.difficulty?.message}
          {...register("difficulty")}
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="difficult">Difficult</option>
        </Select>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Duration (minutes)"
            type="number"
            error={errors.total_time?.message}
            {...register("total_time")}
          />
          <Input
            label="Number of Questions"
            type="number"
            error={errors.total_questions?.message}
            {...register("total_questions")}
          />
          <Input
            label="Correct Marks"
            type="number"
            error={errors.correct_marks?.message}
            {...register("correct_marks")}
          />
          <Input
            label="Wrong Marks"
            type="number"
            error={errors.wrong_marks?.message}
            {...register("wrong_marks")}
          />
          <Input
            label="Unattempt Marks"
            type="number"
            error={errors.unattempt_marks?.message}
            {...register("unattempt_marks")}
          />
          <Input
            label="Total Marks"
            type="number"
            error={errors.total_marks?.message}
            {...register("total_marks")}
          />
        </div>

        <div className="mt-4 flex gap-3">
          <Button
            type="button"
            variant="secondary"
            isLoading={isSaving}
            onClick={onSaveDraft}
          >
            Save as Draft
          </Button>
          <Button type="button" isLoading={isSaving} onClick={onNext}>
            Save & Next
          </Button>
        </div>
      </form>
    </div>
  );
}
