// /api/mcp.js — GHL remote MCP server for claude.ai
// Env vars: GHL_API_KEY, GHL_LOCATION_ID

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
  const res  = await fetch(`https://services.leadconnectorhq.com${path}`, {
    method: "POST",
    headers: GHL_HEADERS,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || `GHL POST ${res.status}: ${path}`);
  return data;
}

// ── Tool definitions ──────────────────────────────────────────────────────────

const TOOLS = [
  // ── Contacts ──
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
    description: "List GHL contacts with a specific tag.",
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
    name: "ghl_count_contacts",
    description: "Count GHL contacts by membership status (Active, Inactive, Cancelled) or count all contacts.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["Active", "Inactive", "Cancelled", "all"], description: "Filter by membership status (default: all)" },
      },
    },
  },
  {
    name: "ghl_get_tasks",
    description: "Get tasks for a specific contact or all recent tasks for the location.",
    inputSchema: {
      type: "object",
      properties: {
        contactId: { type: "string", description: "Contact ID — omit to get all location tasks" },
        limit:     { type: "number", description: "Max results (default 20)" },
      },
    },
  },
  // ── Conversations ──
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
    name: "ghl_get_conversation_messages",
    description: "Get the actual messages inside a GHL conversation by conversation ID.",
    inputSchema: {
      type: "object",
      properties: {
        conversationId: { type: "string" },
        limit:          { type: "number", description: "Max messages (default 20)" },
      },
      required: ["conversationId"],
    },
  },
  // ── Opportunities / Pipeline ──
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
  // ── Calendars & Events ──
  {
    name: "ghl_get_calendars",
    description: "List all calendars in this GHL location.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_events",
    description: "Get calendar events/appointments. Optionally filter by calendar or date range.",
    inputSchema: {
      type: "object",
      properties: {
        calendarId: { type: "string", description: "Calendar ID — omit for all" },
        startTime:  { type: "string", description: "Start datetime ISO string (e.g. 2026-04-01T00:00:00Z)" },
        endTime:    { type: "string", description: "End datetime ISO string" },
        limit:      { type: "number", description: "Max results (default 20)" },
      },
    },
  },
  {
    name: "ghl_get_calendar_resources",
    description: "List calendar groups/resources (rooms, equipment) for this location.",
    inputSchema: { type: "object", properties: {} },
  },
  // ── Location / Settings ──
  {
    name: "ghl_get_custom_fields",
    description: "List all custom field definitions for this GHL location.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_custom_values",
    description: "List all custom values (snippets/merge tags) for this GHL location.",
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
  // ── Automation ──
  {
    name: "ghl_get_workflows",
    description: "List all GHL workflows — names, statuses, and IDs.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_campaigns",
    description: "List email and SMS campaigns in GHL.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_trigger_links",
    description: "List GHL trigger links (trackable links used in emails/SMS that fire workflows on click).",
    inputSchema: { type: "object", properties: {} },
  },
  // ── Forms & Surveys ──
  {
    name: "ghl_get_forms",
    description: "List all GHL forms — names and IDs.",
    inputSchema: { type: "object", properties: {} },
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
  {
    name: "ghl_get_surveys",
    description: "List all surveys in GHL.",
    inputSchema: { type: "object", properties: {} },
  },
  // ── Email / Templates ──
  {
    name: "ghl_get_email_templates",
    description: "List email templates built in GHL.",
    inputSchema: { type: "object", properties: {} },
  },
  // ── Products / E-commerce ──
  {
    name: "ghl_get_products",
    description: "List all products in this GHL location.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", description: "Max results (default 20)" } },
    },
  },
  {
    name: "ghl_get_product_prices",
    description: "Get prices for a specific GHL product.",
    inputSchema: {
      type: "object",
      properties: { productId: { type: "string" } },
      required: ["productId"],
    },
  },
  {
    name: "ghl_get_product_collections",
    description: "List product collections/categories in this GHL location.",
    inputSchema: { type: "object", properties: {} },
  },
  // ── Media ──
  {
    name: "ghl_get_media",
    description: "List media files (images, documents) in the GHL media library.",
    inputSchema: {
      type: "object",
      properties: {
        type:  { type: "string", description: "Filter by type: image, file, etc." },
        limit: { type: "number", description: "Max results (default 20)" },
      },
    },
  },
  // ── Courses / Memberships ──
  {
    name: "ghl_get_courses",
    description: "List all courses/membership products in this GHL location.",
    inputSchema: { type: "object", properties: {} },
  },
  // ── Documents ──
  {
    name: "ghl_get_documents",
    description: "List proposals, contracts, and documents sent from this GHL location.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", description: "Max results (default 20)" } },
    },
  },
  {
    name: "ghl_get_document_templates",
    description: "List document/contract templates in this GHL location.",
    inputSchema: { type: "object", properties: {} },
  },
  // ── Associations ──
  {
    name: "ghl_get_associations",
    description: "List contact/company associations in this GHL location.",
    inputSchema: { type: "object", properties: {} },
  },
  // ── Social Media Planner ──
  {
    name: "ghl_get_social_accounts",
    description: "List connected social media accounts in GHL.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_social_posts",
    description: "Get scheduled or published social media posts from GHL Social Planner.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["scheduled", "published", "failed", "draft"], description: "Filter by post status" },
        limit:  { type: "number", description: "Max results (default 20)" },
      },
    },
  },
  {
    name: "ghl_get_social_categories",
    description: "List social planner categories/labels in this GHL location.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_social_tags",
    description: "List social planner tags in this GHL location.",
    inputSchema: { type: "object", properties: {} },
  },
  // ── Blogs ──
  {
    name: "ghl_get_blog_posts",
    description: "Get blog posts published through GHL.",
    inputSchema: {
      type: "object",
      properties: {
        limit:  { type: "number", description: "Max results (default 20)" },
        status: { type: "string", description: "Filter by status: published, draft" },
      },
    },
  },
  {
    name: "ghl_get_blog_categories",
    description: "List blog categories for this GHL location.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_blog_authors",
    description: "List blog authors for this GHL location.",
    inputSchema: { type: "object", properties: {} },
  },
  // ── Funnels / Sites ──
  {
    name: "ghl_get_funnels",
    description: "List all funnels in this GHL location with page counts.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_funnel_pages",
    description: "Get pages inside a specific GHL funnel — useful for reading event page content.",
    inputSchema: {
      type: "object",
      properties: { funnelId: { type: "string" } },
      required: ["funnelId"],
    },
  },
  // ── Links ──
  {
    name: "ghl_get_links",
    description: "List all links/short links created in this GHL location.",
    inputSchema: { type: "object", properties: {} },
  },
  // ── Email / LC Email ──
  {
    name: "ghl_get_lc_email_stats",
    description: "Get LC Email sending stats and configuration for this location.",
    inputSchema: { type: "object", properties: {} },
  },
  // ── Conversation AI ──
  {
    name: "ghl_get_conversation_ai_bots",
    description: "List Conversation AI bots configured in this GHL location.",
    inputSchema: { type: "object", properties: {} },
  },
  // ── Voice AI ──
  {
    name: "ghl_get_voice_ai_agents",
    description: "List Voice AI agents configured in this GHL location.",
    inputSchema: { type: "object", properties: {} },
  },
  // ── Knowledge Base ──
  {
    name: "ghl_get_knowledge_base",
    description: "List knowledge base articles in this GHL location.",
    inputSchema: { type: "object", properties: {} },
  },
];

// ── Tool implementations ──────────────────────────────────────────────────────

const STATUS_FIELD = "pVjzZbTLHlgbSX5IVbhc";

async function callTool(name, args) {
  switch (name) {

    // ── Contacts ──────────────────────────────────────────────────────────────
    case "ghl_search_contacts": {
      const { query, limit = 10 } = args;
      const data = await ghl(`/contacts/search?locationId=${LOCATION}&query=${encodeURIComponent(query)}&page=1&pageLimit=${limit}`);
      return (data.contacts || []).map(c => ({ id: c.id, name: c.name || "", email: c.email || "", phone: c.phone || "", tags: c.tags || [], customFields: c.customFields || [], createdAt: c.dateAdded }));
    }
    case "ghl_get_contact": {
      const data = await ghl(`/contacts/${args.contactId}`);
      return data.contact || data;
    }
    case "ghl_contacts_by_tag": {
      const { tag, limit = 20 } = args;
      const pages = Array.from({ length: 50 }, (_, i) => i + 1);
      const results = await Promise.all(pages.map(p => ghlPost("/contacts/search", { locationId: LOCATION, pageLimit: 100, page: p }).catch(() => ({ contacts: [] }))));
      const all = results.flatMap(d => d.contacts || []);
      const tagLower = tag.toLowerCase();
      const filtered = all.filter(c => (c.tags || []).some(t => t.toLowerCase() === tagLower));
      return filtered.slice(0, limit).map(c => ({ id: c.id, name: c.name || "", email: c.email || "", phone: c.phone || "", tags: c.tags || [] }));
    }
    case "ghl_recent_contacts": {
      const { limit = 15 } = args;
      const data = await ghlPost("/contacts/search", { locationId: LOCATION, pageLimit: limit, page: 1 });
      const sorted = (data.contacts || []).sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
      return sorted.slice(0, limit).map(c => ({ id: c.id, name: c.name || "", email: c.email || "", phone: c.phone || "", tags: c.tags || [], createdAt: c.dateAdded }));
    }
    case "ghl_count_contacts": {
      const { status = "all" } = args;
      const pages = Array.from({ length: 50 }, (_, i) => i + 1);
      const results = await Promise.all(pages.map(p => ghlPost("/contacts/search", { locationId: LOCATION, pageLimit: 100, page: p }).catch(() => ({ contacts: [] }))));
      const all = results.flatMap(d => d.contacts || []);
      if (status === "all") return { total: all.length };
      const filtered = all.filter(c => {
        const field = (c.customFields || []).find(f => f.id === STATUS_FIELD);
        return (field?.value || "").toLowerCase() === status.toLowerCase();
      });
      return { status, count: filtered.length, total: all.length };
    }
    case "ghl_get_tasks": {
      const { contactId, limit = 20 } = args;
      if (contactId) {
        const data = await ghl(`/contacts/${contactId}/tasks`);
        return data.tasks || [];
      }
      const data = await ghl(`/contacts/tasks?locationId=${LOCATION}&limit=${limit}`);
      return data.tasks || [];
    }

    // ── Conversations ─────────────────────────────────────────────────────────
    case "ghl_get_conversations": {
      const { contactId, limit = 10 } = args;
      const data = await ghl(`/conversations/search?locationId=${LOCATION}&contactId=${contactId}&limit=${limit}`);
      return data.conversations || [];
    }
    case "ghl_get_conversation_messages": {
      const { conversationId, limit = 20 } = args;
      const data = await ghl(`/conversations/${conversationId}/messages?limit=${limit}`);
      return (data.messages || []).map(m => ({ id: m.id, type: m.messageType || m.type, body: m.body || m.text || "", direction: m.direction, dateAdded: m.dateAdded }));
    }

    // ── Opportunities ─────────────────────────────────────────────────────────
    case "ghl_get_opportunities": {
      const { pipelineId, status = "open", limit = 20 } = args;
      let url = `/opportunities/search?location_id=${LOCATION}&status=${status}&limit=${limit}`;
      if (pipelineId) url += `&pipeline_id=${pipelineId}`;
      const data = await ghl(url);
      return (data.opportunities || []).map(o => ({ id: o.id, name: o.name, stage: o.pipelineStage?.name || "", monetaryValue: o.monetaryValue, status: o.status, contact: { id: o.contact?.id, name: o.contact?.name }, assignedTo: o.assignedTo, createdAt: o.createdAt }));
    }

    // ── Calendars & Events ────────────────────────────────────────────────────
    case "ghl_get_calendars": {
      const data = await ghl(`/calendars/?locationId=${LOCATION}`);
      return (data.calendars || []).map(c => ({ id: c.id, name: c.name, description: c.description, isActive: c.isActive }));
    }
    case "ghl_get_events": {
      const { calendarId, startTime, endTime, limit = 20 } = args;
      let url = `/calendars/events?locationId=${LOCATION}&limit=${limit}`;
      if (calendarId) url += `&calendarId=${calendarId}`;
      if (startTime)  url += `&startTime=${encodeURIComponent(startTime)}`;
      if (endTime)    url += `&endTime=${encodeURIComponent(endTime)}`;
      const data = await ghl(url);
      return (data.events || data.appointments || []).map(e => ({ id: e.id, title: e.title, startTime: e.startTime, endTime: e.endTime, calendarId: e.calendarId, contactId: e.contactId, status: e.appointmentStatus || e.status }));
    }
    case "ghl_get_calendar_resources": {
      const data = await ghl(`/calendars/groups?locationId=${LOCATION}`);
      return data.groups || data.resources || data;
    }

    // ── Location / Settings ───────────────────────────────────────────────────
    case "ghl_get_custom_fields": {
      const data = await ghl(`/locations/${LOCATION}/customFields`);
      return (data.customFields || []).map(f => ({ id: f.id, name: f.name, key: f.fieldKey, type: f.dataType }));
    }
    case "ghl_get_custom_values": {
      const data = await ghl(`/locations/${LOCATION}/customValues`);
      return (data.customValues || []).map(v => ({ id: v.id, name: v.name, value: v.value }));
    }
    case "ghl_get_tags": {
      const data = await ghl(`/locations/${LOCATION}/tags`);
      return data.tags || [];
    }
    case "ghl_get_location_info": {
      const data = await ghl(`/locations/${LOCATION}`);
      return data.location || data;
    }

    // ── Automation ────────────────────────────────────────────────────────────
    case "ghl_get_workflows": {
      const data = await ghl(`/workflows/?locationId=${LOCATION}`);
      return (data.workflows || []).map(w => ({ id: w.id, name: w.name, status: w.status }));
    }
    case "ghl_get_campaigns": {
      const data = await ghl(`/campaigns/?locationId=${LOCATION}`);
      return (data.campaigns || []).map(c => ({ id: c.id, name: c.name, status: c.status || "", type: c.campaignType || "" }));
    }
    case "ghl_get_trigger_links": {
      const data = await ghl(`/links/?locationId=${LOCATION}`);
      return (data.links || []).map(l => ({ id: l.id, name: l.name, url: l.redirectTo || l.url || "" }));
    }

    // ── Forms & Surveys ───────────────────────────────────────────────────────
    case "ghl_get_forms": {
      const data = await ghl(`/forms/?locationId=${LOCATION}`);
      return (data.forms || []).map(f => ({ id: f.id, name: f.name }));
    }
    case "ghl_get_form_submissions": {
      const { formId, limit = 10 } = args;
      const data = await ghl(`/forms/submissions?locationId=${LOCATION}&formId=${formId}&limit=${limit}`);
      return data.submissions || [];
    }
    case "ghl_get_surveys": {
      const data = await ghl(`/surveys/?locationId=${LOCATION}`);
      return (data.surveys || []).map(s => ({ id: s.id, name: s.name }));
    }

    // ── Email / Templates ─────────────────────────────────────────────────────
    case "ghl_get_email_templates": {
      const data = await ghl(`/emails/builder?locationId=${LOCATION}&limit=50`);
      return (data.templates || data.data || []).map(t => ({ id: t.id, name: t.name || t.title || "", updatedAt: t.updatedAt || "" }));
    }

    // ── Products ──────────────────────────────────────────────────────────────
    case "ghl_get_products": {
      const { limit = 20 } = args;
      const data = await ghl(`/products/?locationId=${LOCATION}&limit=${limit}`);
      return (data.products || []).map(p => ({ id: p._id || p.id, name: p.name, description: p.description, price: p.price, type: p.productType }));
    }
    case "ghl_get_product_prices": {
      const { productId } = args;
      const data = await ghl(`/products/${productId}/price?locationId=${LOCATION}`);
      return data.prices || data;
    }
    case "ghl_get_product_collections": {
      const data = await ghl(`/products/collections/?locationId=${LOCATION}`);
      return data.collections || data;
    }

    // ── Media ─────────────────────────────────────────────────────────────────
    case "ghl_get_media": {
      const { type, limit = 20 } = args;
      let url = `/medias/?altId=${LOCATION}&altType=location&limit=${limit}`;
      if (type) url += `&type=${type}`;
      const data = await ghl(url);
      return (data.medias || data.files || []).map(m => ({ id: m.id, name: m.name, url: m.url, type: m.type, size: m.size }));
    }

    // ── Courses ───────────────────────────────────────────────────────────────
    case "ghl_get_courses": {
      const data = await ghl(`/courses/?locationId=${LOCATION}`);
      return (data.courses || []).map(c => ({ id: c.id, title: c.title, description: c.description, isPublished: c.isPublished }));
    }

    // ── Documents ─────────────────────────────────────────────────────────────
    case "ghl_get_documents": {
      const { limit = 20 } = args;
      const data = await ghl(`/documents/?locationId=${LOCATION}&limit=${limit}`);
      return (data.documents || data.proposals || []);
    }
    case "ghl_get_document_templates": {
      const data = await ghl(`/documents/templates?locationId=${LOCATION}`);
      return data.templates || data;
    }

    // ── Associations ──────────────────────────────────────────────────────────
    case "ghl_get_associations": {
      const data = await ghl(`/associations/?locationId=${LOCATION}`);
      return data.associations || data;
    }

    // ── Social Media Planner ──────────────────────────────────────────────────
    case "ghl_get_social_accounts": {
      const data = await ghl(`/social-media-posting/accounts?locationId=${LOCATION}`);
      return (data.accounts || []).map(a => ({ id: a.id, name: a.name, platform: a.platform, username: a.username }));
    }
    case "ghl_get_social_posts": {
      const { status, limit = 20 } = args;
      const data = await ghl(`/social-media-posting/${LOCATION}/posts?limit=${limit}${status ? `&status=${status}` : ""}`);
      return (data.posts || data.data || []).map(p => ({ id: p.id, content: p.summary || p.content || "", platform: p.platform || "", scheduledAt: p.scheduledAt || "", status: p.status || "" }));
    }
    case "ghl_get_social_categories": {
      const data = await ghl(`/social-media-posting/categories?locationId=${LOCATION}`);
      return data.categories || data;
    }
    case "ghl_get_social_tags": {
      const data = await ghl(`/social-media-posting/tags?locationId=${LOCATION}`);
      return data.tags || data;
    }

    // ── Blogs ─────────────────────────────────────────────────────────────────
    case "ghl_get_blog_posts": {
      const { limit = 20, status } = args;
      let url = `/blogs/posts?locationId=${LOCATION}&limit=${limit}`;
      if (status) url += `&status=${status}`;
      const data = await ghl(url);
      return (data.posts || data.blogs || []).map(p => ({ id: p.id, title: p.title, status: p.status, publishedAt: p.publishedAt, author: p.author?.name || "", category: p.category?.title || "" }));
    }
    case "ghl_get_blog_categories": {
      const data = await ghl(`/blogs/categories/?locationId=${LOCATION}`);
      return data.categories || data;
    }
    case "ghl_get_blog_authors": {
      const data = await ghl(`/blogs/authors/?locationId=${LOCATION}`);
      return data.authors || data;
    }

    // ── Funnels / Sites ───────────────────────────────────────────────────────
    case "ghl_get_funnels": {
      const data = await ghl(`/funnels/funnel/list?locationId=${LOCATION}&limit=50`);
      return (data.funnels || []).map(f => ({ id: f._id || f.id, name: f.name, domain: f.domain, pageCount: (f.steps || []).length, isPublished: f.isPublished }));
    }
    case "ghl_get_funnel_pages": {
      const { funnelId } = args;
      const data = await ghl(`/funnels/page?funnelId=${funnelId}&locationId=${LOCATION}&limit=50`);
      return (data.pages || data.list || []).map(p => ({ id: p._id || p.id, name: p.name, path: p.path || p.slug || "", url: p.url || "" }));
    }

    // ── Links ─────────────────────────────────────────────────────────────────
    case "ghl_get_links": {
      const data = await ghl(`/links/?locationId=${LOCATION}`);
      return (data.links || []).map(l => ({ id: l.id, name: l.name, redirectTo: l.redirectTo, shortUrl: l.shortUrl }));
    }

    // ── LC Email ──────────────────────────────────────────────────────────────
    case "ghl_get_lc_email_stats": {
      const data = await ghl(`/email-isv/verify?locationId=${LOCATION}`);
      return data;
    }

    // ── Conversation AI ───────────────────────────────────────────────────────
    case "ghl_get_conversation_ai_bots": {
      const data = await ghl(`/conversation-ai/settings?locationId=${LOCATION}`);
      return data.bots || data.settings || data;
    }

    // ── Voice AI ──────────────────────────────────────────────────────────────
    case "ghl_get_voice_ai_agents": {
      const data = await ghl(`/voice-ai/agents?locationId=${LOCATION}`);
      return (data.agents || []).map(a => ({ id: a.id, name: a.name, status: a.status, voiceId: a.voiceId }));
    }

    // ── Knowledge Base ────────────────────────────────────────────────────────
    case "ghl_get_knowledge_base": {
      const data = await ghl(`/knowledge-base/?locationId=${LOCATION}`);
      return data.articles || data.items || data;
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
