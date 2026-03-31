import { useMutation, useQueryClient } from "@tanstack/react-query";

type QueryKey = readonly (string | number | boolean | undefined)[];

export function useAdminMutation<TData, TVariables>(
  mutationFn: (vars: TVariables) => Promise<TData>,
  invalidateKeys: QueryKey[],
  extraInvalidate?: (data: TData, variables: TVariables) => QueryKey[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (data, variables) => {
      await Promise.all(
        invalidateKeys.map((key) => queryClient.invalidateQueries({ queryKey: key })),
      );
      if (extraInvalidate) {
        await Promise.all(
          extraInvalidate(data, variables).map((key) =>
            queryClient.invalidateQueries({ queryKey: key }),
          ),
        );
      }
    },
  });
}

