import { useState, useEffect, useCallback } from "react";
import api from "../utils/api";

export function useFetch(endpoint, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    setLoading(true);
    api.get(endpoint)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Error al cargar datos"))
      .finally(() => setLoading(false));
  }, [...deps, tick]);

  return { data, loading, error, refetch };
}

export function useDashboardStats(filters = {}) {
  const query = new URLSearchParams(filters).toString();
  return useFetch(`/dashboard/stats?${query}`, [JSON.stringify(filters)]);
}

export function useSalesByHour(filters = {}) {
  const query = new URLSearchParams(filters).toString();
  return useFetch(`/dashboard/sales-by-hour?${query}`, [JSON.stringify(filters)]);
}

export function useOrders(filters = {}) {
  const query = new URLSearchParams(filters).toString();
  return useFetch(`/orders?${query}`, [JSON.stringify(filters)]);
}

export function useProducts(filters = {}) {
  const query = new URLSearchParams(filters).toString();
  return useFetch(`/products?${query}`, [JSON.stringify(filters)]);
}

export function useCategories() {
  return useFetch("/categories");
}

export function useUsers() {
  return useFetch("/auth/users");
}