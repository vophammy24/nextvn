import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';

export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationKey: ['auth', 'sign-out'],
    retry: false,
    mutationFn: async () => {
      await api.post('/auth/logout', {}, { withCredentials: true });
    },
    onSuccess: async () => {
      await queryClient.cancelQueries({ queryKey: ['auth'] });
      queryClient.removeQueries({ queryKey: ['auth'] });
      await navigate('/login', { replace: true });
    },
  });

  return {
    signOut: () => mutation.mutate(),
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
