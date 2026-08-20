import { api } from "./baseApi";
import type {
  ApiResponse,
  CreateTestPayload,
  Test,
  UpdateTestPayload,
} from "@/types";

export const testsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getTests: builder.query<Test[], void>({
      query: () => "/tests",
      transformResponse: (response: ApiResponse<Test[]>) => response.data,

      providesTags: (result) =>
        result
          ? [
              ...result.map((t) => ({ type: "Test" as const, id: t.id })),
              { type: "Test" as const, id: "LIST" },
            ]
          : [{ type: "Test" as const, id: "LIST" }],
    }),

    getTestById: builder.query<Test, string>({
      query: (id) => `/tests/${id}`,
      transformResponse: (response: ApiResponse<Test>) => response.data,
      providesTags: (_result, _error, id) => [{ type: "Test", id }],
    }),

    createTest: builder.mutation<Test, CreateTestPayload>({
      query: (body) => ({ url: "/tests", method: "POST", body }),
      transformResponse: (response: ApiResponse<Test>) => response.data,

      invalidatesTags: [{ type: "Test", id: "LIST" }],
    }),

    updateTest: builder.mutation<Test, { id: string; body: UpdateTestPayload }>(
      {
        query: ({ id, body }) => ({ url: `/tests/${id}`, method: "PUT", body }),
        transformResponse: (response: ApiResponse<Test>) => response.data,

        invalidatesTags: (_result, _error, { id }) => [
          { type: "Test", id },
          { type: "Test", id: "LIST" },
        ],
      },
    ),

    deleteTest: builder.mutation<void, string>({
      query: (id) => ({ url: `/tests/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Test", id: "LIST" }],
    }),
  }),
});

export const {
  useGetTestsQuery,
  useGetTestByIdQuery,
  useCreateTestMutation,
  useUpdateTestMutation,
  useDeleteTestMutation,
} = testsApi;
