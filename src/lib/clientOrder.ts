export function reconcileClientOrder(clientIds: string[], storedOrder: string[]) {
  const available = new Set(clientIds);
  const ordered = storedOrder.filter(
    (id, index) => available.has(id) && storedOrder.indexOf(id) === index,
  );
  return [...ordered, ...clientIds.filter((id) => !ordered.includes(id))];
}

export function moveClientInOrder(
  order: string[],
  clientId: string,
  direction: -1 | 1,
) {
  const index = order.indexOf(clientId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= order.length) return order;
  const next = [...order];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
