const GRAPHQL_ENDPOINT = "https://api.politicsandwar.com/graphql";

export async function fetchGraphQL(query, variables = {}, options = {}) {
  const apiKey = process.env.PNW_API_KEY;
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : 30000;

  if (!apiKey) {
    throw new Error("PNW_API_KEY is not configured");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res;

  try {
    res = await fetch(`${GRAPHQL_ENDPOINT}?api_key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
      body: JSON.stringify({
        query,
        variables,
      }),
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`GraphQL request timed out after ${timeoutMs}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    throw new Error(`GraphQL request failed with status ${res.status}`);
  }

  const json = await res.json();

  if (json.errors?.length) {
    const message = json.errors.map((error) => error.message).join("; ");
    throw new Error(message || "GraphQL Error");
  }

  return json.data;
}
