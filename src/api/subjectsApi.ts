import { api } from "./baseApi";
import type { ApiResponse, Subject } from "@/types";

export const subjectsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getSubjects: builder.query<Subject[], void>({
      query: () => "/subjects",
      transformResponse: (response: ApiResponse<Subject[]>) => response.data,
    }),
  }),
});

export const { useGetSubjectsQuery } = subjectsApi;
