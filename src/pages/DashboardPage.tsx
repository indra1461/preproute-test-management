import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Plus, Pencil, Eye, Trash2 } from "lucide-react";
import { useGetTestsQuery, useDeleteTestMutation } from "@/api/testsApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { Test } from "@/types";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/utils";

const columnHelper = createColumnHelper<Test>();

const statusStyles: Record<string, string> = {
  live: "bg-success-50 text-success-600",
  draft: "bg-warning-50 text-warning-500",
};

export default function DashboardPage() {
  const { data: tests, isLoading, isError } = useGetTestsQuery();
  const [deleteTest] = useDeleteTestMutation();
  const [search, setSearch] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  const filteredTests = useMemo(() => {
    if (!tests) return [];
    return tests.filter((t) =>
      t.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [tests, search]);

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await deleteTest(deleteTargetId).unwrap();
      toast.success("Test deleted.");
      setDeleteTargetId(null);
    } catch (err) {
      toast.error(
        getErrorMessage(err, "Could not delete the test. Please try again."),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Test Name",
        cell: (info) => (
          <span className="font-medium text-ink-900">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("subject", { header: "Subject" }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const status = info.getValue() ?? "draft";
          return (
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[status] ?? statusStyles.draft}`}
            >
              {status}
            </span>
          );
        },
      }),
      columnHelper.accessor("created_at", {
        header: "Created",
        cell: (info) => {
          const value = info.getValue();
          return value ? new Date(value).toLocaleDateString() : "-";
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (info) => {
          const test = info.row.original; // is row ka poora Test object
          return (
            <div className="flex items-center gap-2">
              <Link
                to={`/tests/${test.id}/preview`}
                className="rounded-lg p-2 text-ink-500 hover:bg-line-100"
                aria-label="View"
              >
                <Eye size={16} />
              </Link>
              <Link
                to={`/tests/${test.id}/edit`}
                className="rounded-lg p-2 text-ink-500 hover:bg-line-100"
                aria-label="Edit"
              >
                <Pencil size={16} />
              </Link>
              <button
                type="button"
                onClick={() => setDeleteTargetId(test.id)}
                className="rounded-lg p-2 text-danger-500 hover:bg-danger-50"
                aria-label="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        },
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: filteredTests,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">Dashboard</h1>
        <Button onClick={() => navigate("/tests/new")}>
          <Plus size={16} /> Create New Test
        </Button>
      </div>

      <div className="mt-4 max-w-xs">
        <Input
          placeholder="Search tests by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line-200 bg-white">
        {isLoading && (
          <p className="p-6 text-sm text-ink-500">Loading tests…</p>
        )}
        {isError && (
          <p className="p-6 text-sm text-danger-500">
            Could not load tests. Please try again.
          </p>
        )}

        {!isLoading && !isError && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line-200 bg-line-100/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 font-medium text-ink-500"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-line-200 last:border-0"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-10 text-center text-ink-300"
                  >
                    No tests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmModal
        open={deleteTargetId !== null}
        title="Delete this test?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
