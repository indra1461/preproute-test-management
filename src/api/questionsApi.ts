import { api } from "./baseApi";
import type { ApiResponse, CreateQuestionPayload, Question } from "@/types";

export const questionsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    bulkCreateQuestions: builder.mutation<Question[], CreateQuestionPayload[]>({
      query: (questions) => ({
        url: "/questions/bulk",
        method: "POST",
        body: { questions },
      }),
      transformResponse: (response: ApiResponse<Question[]>) => response.data,
      invalidatesTags: [{ type: "Test", id: "LIST" }],
    }),

    fetchBulkQuestions: builder.query<Question[], string[]>({
      query: (questionIds) => ({
        url: "/questions/fetchBulk",
        method: "POST",
        body: { question_ids: questionIds },
      }),
      transformResponse: (response: ApiResponse<Question[]>) => response.data,
    }),
  }),
});

export const { useBulkCreateQuestionsMutation, useFetchBulkQuestionsQuery } =
  questionsApi;
