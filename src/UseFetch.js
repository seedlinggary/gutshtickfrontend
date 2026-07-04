import { useState, useEffect } from "react";
import { clearAuth } from "./auth";

const useFetch = (url, options) => {
  const [data, setData] = useState(null);
  const [isPending, setIsPending] = useState(true);
  const [error, setError] = useState(null);
  const backend = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

  useEffect(() => {
    const abortCont = new AbortController();
    const opts = { ...options, signal: abortCont.signal };

    fetch(backend + url, opts)
      .then((res) => {
        if (res.status === 401) {
          clearAuth();
          window.location.href = "/signin";
          return;
        }
        if (!res.ok) throw new Error("Could not fetch data");
        return res.json();
      })
      .then((d) => {
        if (d !== undefined) {
          setData(d);
          setIsPending(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setIsPending(false);
          setError(err.message);
        }
      });

    return () => abortCont.abort();
  }, [url]);

  return { data, isPending, error };
};

export default useFetch;
