import type { Annotation } from '../helpers/annotation-metadata';

type Permissions = Annotation['permissions'];

/**
 * Return true if an annotation with the given permissions is private.
 */
export function isPrivate(perms: Permissions): boolean {
  return !perms.read.some(principal => principal.startsWith('group:'));
}
