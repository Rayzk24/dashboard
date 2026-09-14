import type { JSONContent } from '@tiptap/core';

type CleanupResult = {
  node: JSONContent | null;
  removed: number;
};

function isTaskItem(node: JSONContent) {
  return node.type === 'taskItem';
}

function taskCount(node: JSONContent): number {
  return (isTaskItem(node) ? 1 : 0)
    + (node.content ?? []).reduce((total, child) => total + taskCount(child), 0);
}

function hasUncheckedTask(node: JSONContent, includeSelf = true): boolean {
  if (includeSelf && isTaskItem(node) && node.attrs?.checked !== true) return true;
  return (node.content ?? []).some((child) => hasUncheckedTask(child));
}

function taskIndent(node: JSONContent) {
  const value = Number(node.attrs?.indentLevel ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function cleanTaskItem(node: JSONContent, preserveCheckedParent = false): CleanupResult {
  const hasUncheckedNestedTask = hasUncheckedTask(node, false);
  if (node.attrs?.checked === true && !preserveCheckedParent && !hasUncheckedNestedTask) {
    return { node: null, removed: taskCount(node) };
  }

  let removed = 0;
  const nextContent = (node.content ?? []).flatMap((child) => {
    const cleaned = cleanNode(child);
    removed += cleaned.removed;
    return cleaned.node ? [cleaned.node] : [];
  });

  if (node.type === 'taskList' && nextContent.length === 0) {
    return { node: null, removed };
  }

  const shouldUncheckParent = node.attrs?.checked === true
    && (preserveCheckedParent || hasUncheckedNestedTask);

  return {
    node: {
      ...node,
      ...(shouldUncheckParent ? { attrs: { ...node.attrs, checked: false } } : {}),
      ...(node.content ? { content: nextContent } : {}),
    },
    removed,
  };
}

function cleanTaskList(node: JSONContent): CleanupResult {
  const children = node.content ?? [];
  const nextContent: JSONContent[] = [];
  let removed = 0;

  for (let index = 0; index < children.length;) {
    const child = children[index];
    if (!isTaskItem(child)) {
      const cleaned = cleanNode(child);
      removed += cleaned.removed;
      if (cleaned.node) nextContent.push(cleaned.node);
      index += 1;
      continue;
    }

    const level = taskIndent(child);
    let branchEnd = index + 1;
    while (branchEnd < children.length
      && isTaskItem(children[branchEnd])
      && taskIndent(children[branchEnd]) > level) {
      branchEnd += 1;
    }
    const flatDescendants = children.slice(index + 1, branchEnd);
    const hasUncheckedFlatTask = flatDescendants.some((item) => hasUncheckedTask(item));

    if (child.attrs?.checked === true
      && !hasUncheckedTask(child, false)
      && !hasUncheckedFlatTask) {
      removed += children.slice(index, branchEnd).reduce((total, item) => total + taskCount(item), 0);
      index = branchEnd;
      continue;
    }

    const cleaned = cleanTaskItem(child, hasUncheckedFlatTask);
    removed += cleaned.removed;
    if (cleaned.node) nextContent.push(cleaned.node);
    index += 1;
  }

  return nextContent.length
    ? { node: { ...node, content: nextContent }, removed }
    : { node: null, removed };
}

function cleanNode(node: JSONContent): CleanupResult {
  if (node.type === 'taskList') return cleanTaskList(node);
  if (isTaskItem(node)) return cleanTaskItem(node);

  let removed = 0;
  const nextContent = (node.content ?? []).flatMap((child) => {
    const cleaned = cleanNode(child);
    removed += cleaned.removed;
    return cleaned.node ? [cleaned.node] : [];
  });

  return {
    node: {
      ...node,
      ...(node.content ? { content: nextContent } : {}),
    },
    removed,
  };
}

export function completedTaskCount(document: JSONContent) {
  let count = 0;
  const visit = (node: JSONContent) => {
    if (isTaskItem(node) && node.attrs?.checked === true) count += 1;
    node.content?.forEach(visit);
  };
  visit(document);
  return count;
}

export function removeCompletedTasks(document: JSONContent) {
  const cleaned = cleanNode(document);
  const node = cleaned.node ?? { type: 'doc', content: [{ type: 'paragraph' }] };
  if (node.type === 'doc' && (!node.content || node.content.length === 0)) {
    node.content = [{ type: 'paragraph' }];
  }
  return { document: node, removed: cleaned.removed };
}
