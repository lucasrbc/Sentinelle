import { apiFetch } from './api';
import { createClient } from './supabase/client';

/**
 * Appel à l'API depuis le navigateur en joignant le jeton Supabase courant.
 * Lève « NOT_AUTHENTICATED » si aucune session active.
 */
export async function authedFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const {
    data: { session },
  } = await createClient().auth.getSession();
  if (!session) {
    throw new Error('NOT_AUTHENTICATED');
  }
  return apiFetch(path, session.access_token, init);
}
