export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.NOTION_TOKEN;
  const dataSourceId = process.env.NOTION_DATA_SOURCE_ID;

  if (!token || !dataSourceId) {
    return res.status(500).json({ error: "Notion environment variables are missing" });
  }

  try {
    const counts = {};
    let startCursor;

    do {
      const body = { page_size: 100 };
      if (startCursor) body.start_cursor = startCursor;

      const response = await fetch(
        `https://api.notion.com/v1/data_sources/${dataSourceId}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Notion-Version": "2025-09-03",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          error: data.message || "Notion API request failed"
        });
      }

      for (const page of data.results || []) {
        const date = page.properties?.["发生时间"]?.date?.start;
        if (date) {
          counts[date] = (counts[date] || 0) + 1;
        }
      }

      startCursor = data.has_more ? data.next_cursor : null;
    } while (startCursor);

    return res.status(200).json({ counts });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
