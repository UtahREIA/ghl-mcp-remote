// /api/mcp.js — GHL remote MCP server for claude.ai
// Env vars: GHL_API_KEY, GHL_LOCATION_ID, MCP_SECRET (optional auth)

const TOKEN    = process.env.GHL_API_KEY;
const LOCATION = process.env.GHL_LOCATION_ID;

const GHL_HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
  Version: "2021-07-28",
};

async function ghl(path) {
  const res  = await fetch(`https://services.leadconnectorhq.com${path}`, { headers: GHL_HEADERS });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || `GHL ${res.status}: ${path}`);
  return data;
}

async function ghlPost(path, body) {
  const res  = await fetch(`https://services.leadconnectorhq.com${path}`, { method: "POST", headers: GHL_HEADERS, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || `GHL ${res.status}: ${path}`);
  return data;
}

// ── Tool definitions ──────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "ghl_search_contacts",
    description: "Search GHL contacts by name, email, or phone.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Name, email, or phone to search for" },
        limit: { type: "number", description: "Max results (default 10)" },
      },
      required: ["query"],
    },
  },
  {
    name: "ghl_get_contact",
    description: "Get full details for a GHL contact by ID.",
    inputSchema: {
      type: "object",
      properties: { contactId: { type: "string" } },
      required: ["contactId"],
    },
  },
  {
    name: "ghl_contacts_by_tag",
    description: "List GHL contacts with a specific tag (e.g. 'Active Member', 'Lead').",
    inputSchema: {
      type: "object",
      properties: {
        tag:   { type: "string", description: "Tag name to filter by" },
        limit: { type: "number", description: "Max results (default 20)" },
      },
      required: ["tag"],
    },
  },
  {
    name: "ghl_recent_contacts",
    description: "Get the most recently added contacts in GHL.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", description: "Max results (default 15)" } },
    },
  },
  {
    name: "ghl_get_conversations",
    description: "Get recent SMS, email, and call history for a GHL contact.",
    inputSchema: {
      type: "object",
      properties: {
        contactId: { type: "string" },
        limit:     { type: "number" },
      },
      required: ["contactId"],
    },
  },
  {
    name: "ghl_get_opportunities",
    description: "Get pipeline opportunities from GHL. Shows deal name, stage, value, and status.",
    inputSchema: {
      type: "object",
      properties: {
        pipelineId: { type: "string", description: "Pipeline ID — omit for all" },
        status:     { type: "string", enum: ["open", "won", "lost", "abandoned"], description: "Default: open" },
        limit:      { type: "number" },
      },
    },
  },
  {
    name: "ghl_get_custom_fields",
    description: "List all custom field definitions for this GHL location.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_tags",
    description: "List all tags used in this GHL location.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_location_info",
    description: "Get general info about this GHL location — name, address, timezone.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_calendars",
    description: "List all GHL calendars for this location.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_events",
    description: "Get upcoming or recent events from GHL calendars. Returns event name, date, location, and description.",
    inputSchema: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "Start date in YYYY-MM-DD format (default: today)" },
        endDate:   { type: "string", description: "End date in YYYY-MM-DD format (default: 90 days from today)" },
        calendarId: { type: "string", description: "Specific calendar ID — omit to get all" },
      },
    },
  },
  {
    name: "ghl_get_blog_posts",
    description: "Get event listings and blog posts published on the Utah REIA website through GHL. Use this to find upcoming events, past events, and event details like date, location, and description.",
    inputSchema: {
      type: "object",
      properties: {
        limit:  { type: "number", description: "Max results (default 10)" },
        blogId: { type: "string", description: "Specific blog ID — omit to search all blogs" },
      },
    },
  },
  {
    name: "ghl_get_workflows",
    description: "List all GHL workflows — names, statuses, and IDs.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_forms",
    description: "List all GHL forms — names and IDs.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_count_contacts",
    description: "Count total contacts in GHL, optionally filtered by membership status (Active, Inactive, Cancelled) or by tag name.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter by membership status: Active, Inactive, or Cancelled" },
        tag:    { type: "string", description: "Filter by tag name" },
      },
    },
  },
  {
    name: "ghl_get_form_submissions",
    description: "Get recent submissions for a specific GHL form.",
    inputSchema: {
      type: "object",
      properties: {
        formId: { type: "string" },
        limit:  { type: "number" },
      },
      required: ["formId"],
    },
  },
];

// ── Tool implementations ──────────────────────────────────────────────────────

async function callTool(name, args) {
  switch (name) {
    case "ghl_search_contacts": {
      const { query, limit = 10 } = args;
      const data = await ghl(`/contacts/search?locationId=${LOCATION}&query=${encodeURIComponent(query)}&page=1&pageLimit=${limit}`);
      return (data.contacts || []).map(c => ({ id: c.id, name: c.name || "", email: c.email || "", phone: c.phone || "", tags: c.tags || [], memberStatus: c.memberStatus || "", customFields: c.customFields || [], createdAt: c.dateAdded }));
    }
    case "ghl_get_contact": {
      const data = await ghl(`/contacts/${args.contactId}`);
      return data.contact || data;
    }
    case "ghl_contacts_by_tag": {
      const { tag, limit = 100 } = args;
      // GHL doesn't support server-side tag filtering — paginate in parallel and filter client-side
      const STATUS_FIELD = "pVjzZbTLHlgbSX5IVbhc"; // contact.status custom field ID
      const isStatusQuery = ["active", "inactive", "cancelled"].some(s => tag.toLowerCase().includes(s));

      if (isStatusQuery) {
        // Use the known Status custom field for membership queries
        const statusValue = tag.toLowerCase().includes("active") ? "Active"
          : tag.toLowerCase().includes("inactive") ? "Inactive" : "Cancelled";
        const pages = Array.from({ length: 50 }, (_, i) => i + 1);
        const results = await Promise.all(
          pages.map(p => ghlPost("/contacts/search", { locationId: LOCATION, pageLimit: 100, page: p }))
        );
        const all = results.flatMap(d => d.contacts || []);
        const matched = all.filter(c => c.customFields?.some(f => f.id === STATUS_FIELD && f.value === statusValue));
        return {
          count: matched.length,
          contacts: matched.slice(0, limit).map(c => ({ id: c.id, name: `${c.firstName||""} ${c.lastName||""}`.trim(), email: c.email || "", phone: c.phone || "", tags: c.tags || [] }))
        };
      }

      // Regular tag filter — paginate in parallel
      const pages = Array.from({ length: 50 }, (_, i) => i + 1);
      const results = await Promise.all(
        pages.map(p => ghlPost("/contacts/search", { locationId: LOCATION, pageLimit: 100, page: p }))
      );
      const all = results.flatMap(d => d.contacts || []);
      const matched = all.filter(c => c.tags?.some(t => t.toLowerCase() === tag.toLowerCase()));
      return {
        count: matched.length,
        contacts: matched.slice(0, limit).map(c => ({ id: c.id, name: `${c.firstName||""} ${c.lastName||""}`.trim(), email: c.email || "", phone: c.phone || "", tags: c.tags || [] }))
      };
    }
    case "ghl_recent_contacts": {
      const { limit = 15 } = args;
      const data = await ghl(`/contacts/?locationId=${LOCATION}&limit=${limit}&sortBy=date_added&sortOrder=desc`);
      return (data.contacts || []).map(c => ({ id: c.id, name: c.name || "", email: c.email || "", phone: c.phone || "", tags: c.tags || [], createdAt: c.dateAdded }));
    }
    case "ghl_get_conversations": {
      const { contactId, limit = 10 } = args;
      const data = await ghl(`/conversations/search?locationId=${LOCATION}&contactId=${contactId}&limit=${limit}`);
      return data.conversations || [];
    }
    case "ghl_get_opportunities": {
      const { pipelineId, status = "open", limit = 20 } = args;
      let url = `/opportunities/search?location_id=${LOCATION}&status=${status}&limit=${limit}`;
      if (pipelineId) url += `&pipeline_id=${pipelineId}`;
      const data = await ghl(url);
      return (data.opportunities || []).map(o => ({ id: o.id, name: o.name, stage: o.pipelineStage?.name || "", monetaryValue: o.monetaryValue, status: o.status, contact: { id: o.contact?.id, name: o.contact?.name }, assignedTo: o.assignedTo, createdAt: o.createdAt }));
    }
    case "ghl_get_custom_fields": {
      const data = await ghl(`/locations/${LOCATION}/customFields`);
      return (data.customFields || []).map(f => ({ id: f.id, name: f.name, key: f.fieldKey, type: f.dataType }));
    }
    case "ghl_get_tags": {
      const data = await ghl(`/locations/${LOCATION}/tags`);
      return data.tags || [];
    }
    case "ghl_get_location_info": {
      const data = await ghl(`/locations/${LOCATION}`);
      return data.location || data;
    }
    case "ghl_get_calendars": {
      const data = await ghl(`/calendars/?locationId=${LOCATION}`);
      return (data.calendars || []).map(c => ({ id: c.id, name: c.name, description: c.description || "" }));
    }
    case "ghl_get_events": {
      const { calendarId, startDate, endDate } = args;
      const start = startDate ? new Date(startDate) : new Date();
      const end   = endDate   ? new Date(endDate)   : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      const startMs = start.getTime();
      const endMs   = end.getTime();
      let url = `/calendars/events?locationId=${LOCATION}&startTime=${startMs}&endTime=${endMs}`;
      if (calendarId) url += `&calendarId=${calendarId}`;
      const data = await ghl(url);
      return (data.events || data.listEvents || []).map(e => ({
        id:          e.id,
        title:       e.title || e.name || "",
        startTime:   e.startTime || e.start,
        endTime:     e.endTime   || e.end,
        location:    e.location  || e.address || "",
        description: e.notes     || e.description || "",
        calendarId:  e.calendarId,
        status:      e.appointmentStatus || e.status || "",
      }));
    }
    case "ghl_get_blog_posts": {
      const { limit = 10, blogId } = args;
      // First get all blogs for this location, then fetch posts
      const blogsData = await ghl(`/blogs/?locationId=${LOCATION}`);
      const blogs = blogsData.blogs || [];
      const targetBlogs = blogId ? blogs.filter(b => b.id === blogId) : blogs;

      const allPosts = [];
      for (const blog of targetBlogs) {
        const postsData = await ghl(`/blogs/${blog.id}/posts?locationId=${LOCATION}&limit=${limit}`);
        const posts = postsData.posts || postsData.data || [];
        posts.forEach(p => allPosts.push({
          id:          p.id,
          title:       p.title || "",
          publishedAt: p.publishedAt || p.createdAt || "",
          status:      p.status || "",
          url:         p.url || p.slug || "",
          description: p.description || p.excerpt || "",
          blogName:    blog.name,
        }));
      }

      allPosts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
      return allPosts.slice(0, limit);
    }
    case "ghl_get_workflows": {
      const data = await ghl(`/workflows/?locationId=${LOCATION}`);
      return (data.workflows || []).map(w => ({ id: w.id, name: w.name, status: w.status }));
    }
    case "ghl_get_forms": {
      const data = await ghl(`/forms/?locationId=${LOCATION}`);
      return (data.forms || []).map(f => ({ id: f.id, name: f.name }));
    }
    case "ghl_count_contacts": {
      const { status, tag } = args;
      const STATUS_FIELD = "pVjzZbTLHlgbSX5IVbhc";
      const pages = Array.from({ length: 50 }, (_, i) => i + 1);
      const results = await Promise.all(
        pages.map(p => ghlPost("/contacts/search", { locationId: LOCATION, pageLimit: 100, page: p }))
      );
      const all = results.flatMap(d => d.contacts || []);
      const total = all.length;

      if (status) {
        const matched = all.filter(c => c.customFields?.some(f => f.id === STATUS_FIELD && f.value === status));
        return { total, [`${status.toLowerCase()}_members`]: matched.length };
      }
      if (tag) {
        const matched = all.filter(c => c.tags?.some(t => t.toLowerCase() === tag.toLowerCase()));
        return { total, [`tag_${tag}`]: matched.length };
      }
      return { total };
    }
    case "ghl_get_form_submissions": {
      const { formId, limit = 10 } = args;
      const data = await ghl(`/forms/submissions?locationId=${LOCATION}&formId=${formId}&limit=${limit}`);
      return data.submissions || [];
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── JSON-RPC handler ──────────────────────────────────────────────────────────

function jsonrpc(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function jsonrpcError(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

// ── Main Vercel handler ───────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body;
  const { method, id, params } = body || {};

  try {
    switch (method) {
      case "initialize":
        return res.status(200).json(jsonrpc(id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "ghl", version: "1.0.0" },
        }));

      case "notifications/initialized":
        return res.status(200).end();

      case "tools/list":
        return res.status(200).json(jsonrpc(id, { tools: TOOLS }));

      case "tools/call": {
        const { name, arguments: args = {} } = params || {};
        const result = await callTool(name, args);
        return res.status(200).json(jsonrpc(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        }));
      }

      default:
        return res.status(200).json(jsonrpcError(id, -32601, `Method not found: ${method}`));
    }
  } catch (err) {
    console.error("[GHL-MCP]", err);
    return res.status(200).json(jsonrpcError(id, -32603, err.message));
  }
}