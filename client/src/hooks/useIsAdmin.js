import { useAuth } from '../context/AuthContext'

/**
 * Returns whether the currently signed-in user is an admin.
 * Reads from the profile already fetched by AuthContext, so there
 * is no extra network request on every render.
 *
 * Usage:
 *   const { isAdmin, isLoading } = useIsAdmin()
 */
export function useIsAdmin() {
  const { isAdmin, profileLoading } = useAuth()
  return { isAdmin: !!isAdmin, isLoading: profileLoading }
}

export default useIsAdmin
