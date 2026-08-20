export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
export interface User {
  id: string;
  userId?: string;
  name?: string;
  role?: string;
}

export interface Subject {
  id: string;
  name: string;
}

export interface Topic {
  id: string;
  name: string;
  subject_id: string;
}

export interface SubTopic {
  id: string;
  name: string;
  topic_id: string;
}

export type TestType = "chapterwise" | "pyq" | "mock";
export type Difficulty = "easy" | "medium" | "difficult";
export type TestStatus = "draft" | "live" | null;

export interface Test {
  id: string;
  name: string;
  type: TestType;
  subject: string;
  topics: string[];
  sub_topics?: string[];
  correct_marks: number;
  wrong_marks: number;
  unattempt_marks: number;
  difficulty: Difficulty;
  total_time: number;
  total_marks: number;
  total_questions: number;
  status: TestStatus;
  questions?: string[];
  created_at?: string;
}

export type CreateTestPayload = Omit<Test, "id" | "created_at" | "questions">;

export type UpdateTestPayload = Partial<CreateTestPayload> & {
  questions?: string[];
};

export type QuestionOptionKey = "option1" | "option2" | "option3" | "option4";

export interface Question {
  id: string;
  type: "mcq";
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_option: QuestionOptionKey;
  explanation?: string;
  difficulty?: Difficulty;
  topic?: string;
  sub_topic?: string;
  media_url?: string;
  test_id: string;
}

export type CreateQuestionPayload = Omit<Question, "id">;
