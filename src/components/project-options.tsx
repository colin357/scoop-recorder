export type ProjectChoice = { id: string; name: string };

/** Lists longer than this get a "Recent" group on top of the alphabetical list. */
export const GROUP_THRESHOLD = 8;
export const RECENT_COUNT = 5;

/**
 * <option>s for a project <select>. `projects` must be most-recently-used
 * first. `extra` keeps a project that is not in the list (for example an
 * archived one a task still belongs to) selectable so the value shows.
 */
export function ProjectOptions({ projects, extra }: { projects: ProjectChoice[]; extra?: ProjectChoice | null }) {
  const all = [...projects].sort((a, b) => a.name.localeCompare(b.name));
  const keep = extra && !projects.some((p) => p.id === extra.id) ? <option value={extra.id}>{extra.name} (archived)</option> : null;
  if (projects.length <= GROUP_THRESHOLD) return <>{keep}{all.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</>;
  return (
    <>
      {keep}
      <optgroup label="Recent">{projects.slice(0, RECENT_COUNT).map((p) => <option key={`r-${p.id}`} value={p.id}>{p.name}</option>)}</optgroup>
      <optgroup label="All projects">{all.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>
    </>
  );
}
