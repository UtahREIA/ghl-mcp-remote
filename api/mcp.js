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
    description: "Get upcoming or recent appointments/events from GHL calendars.",
    inputSchema: {
      type: "object",
      properties: {
        startDate:  { type: "string", description: "Start date YYYY-MM-DD (default: today)" },
        endDate:    { type: "string", description: "End date YYYY-MM-DD (default: 90 days out)" },
        calendarId: { type: "string", description: "Specific calendar ID — omit for all" },
      },
    },
  },
  {
    name: "ghl_get_funnels",
    description: "List all GHL funnels and website pages. Useful for finding event listing pages on utahreia.org.",
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
  {
    name: "ghl_get_blog_posts",
    description: "Get blog posts published through GHL.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", description: "Max results (default 10)" } },
    },
  },
  {
    name: "ghl_get_campaigns",
    description: "List email and SMS campaigns in GHL.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_email_templates",
    description: "List email templates built in GHL.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_surveys",
    description: "List all surveys in GHL.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_trigger_links",
    description: "List GHL trigger links (trackable links used in emails/SMS that fire workflows on click).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_social_posts",
    description: "Get scheduled or published social media posts from GHL Social Planner.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", description: "Max results (default 20)" } },
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
    name: "ghl_count_contacts",
    description: "Count total contacts in GHL, optionally filtered by membership status (Active, Inactive, Cancelled) or tag.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter by membership status: Active, Inactive, or Cancelled" },
        tag:    { type: "string", description: "Filter by tag name" },
      },
    },
  },
  // ── New tools from expanded scopes ───────────────────────────────────────────
  {
    name: "ghl_get_tasks",
    description: "Get tasks assigned in this GHL location.",
    inputSchema: {
      type: "object",
      properties: {
        contactId: { type: "string", description: "Filter tasks by contact ID (optional)" },
        limit:     { type: "number" },
      },
    },
  },
  {
    name: "ghl_get_custom_values",
    description: "Get custom values (location-level variables) set for this GHL location.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_calendar_resources",
    description: "List calendar resources (rooms, equipment) in GHL.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_courses",
    description: "List courses and memberships in GHL.",
    inputSchema: { type: "object", properties: { limit: { type: "number" } } },
  },
  {
    name: "ghl_get_media",
    description: "List media files (images, videos, documents) uploaded to GHL.",
    inputSchema: {
      type: "object",
      properties: {
        type:  { type: "string", description: "Filter by type: image, video, document" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "ghl_get_products",
    description: "List products in GHL (used for order forms and ecommerce).",
    inputSchema: { type: "object", properties: { limit: { type: "number" } } },
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
    description: "List product collections in GHL.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_associations",
    description: "List contact/object associations in GHL.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_documents",
    description: "List contracts and documents in GHL.",
    inputSchema: { type: "object", properties: { limit: { type: "number" } } },
  },
  {
    name: "ghl_get_document_templates",
    description: "List contract/document templates in GHL.",
    inputSchema: { type: "object", properties: { limit: { type: "number" } } },
  },
  {
    name: "ghl_get_knowledge_base",
    description: "List knowledge base articles in GHL.",
    inputSchema: { type: "object", properties: { limit: { type: "number" } } },
  },
  {
    name: "ghl_get_conversation_ai",
    description: "Get Conversation AI (bot) settings and configuration for this GHL location.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_agent_studio",
    description: "List AI agents configured in GHL Agent Studio.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_voice_ai_agents",
    description: "List Voice AI agents in GHL.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_voice_ai_dashboard",
    description: "Get Voice AI dashboard stats and overview for this GHL location.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_social_accounts",
    description: "List connected social media accounts in GHL Social Planner.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_social_categories",
    description: "List social media post categories in GHL Social Planner.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_social_tags",
    description: "List social media tags in GHL Social Planner.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_social_stats",
    description: "Get social media planner statistics for this GHL location.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_email_schedules",
    description: "List scheduled emails in GHL.",
    inputSchema: { type: "object", properties: { limit: { type: "number" } } },
  },
  {
    name: "ghl_get_blog_categories",
    description: "List blog categories in GHL.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_blog_authors",
    description: "List blog authors in GHL.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_lc_email",
    description: "Get LC Email (LeadConnector Email) campaigns and stats for this GHL location.",
    inputSchema: { type: "object", properties: { limit: { type: "number" } } },
  },
  {
    name: "ghl_get_funnel_page_counts",
    description: "Get page count statistics for GHL funnels.",
    inputSchema: { type: "object", properties: {} },
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
      const STATUS_FIELD = "pVjzZbTLHlgbSX5IVbhc";
      const isStatusQuery = ["active", "inactive", "cancelled"].some(s => tag.toLowerCase().includes(s));
      if (isStatusQuery) {
        const statusValue = tag.toLowerCase().includes("active") ? "Active"
          : tag.toLowerCase().includes("inactive") ? "Inactive" : "Cancelled";
        const pages = Array.from({ length: 50 }, (_, i) => i + 1);
        const results = await Promise.all(pages.map(p => ghlPost("/contacts/search", { locationId: LOCATION, pageLimit: 100, page: p })));
        const all = results.flatMap(d => d.contacts || []);
        const matched = all.filter(c => c.customFields?.some(f => f.id === STATUS_FIELD && f.value === statusValue));
        return { count: matched.length, contacts: matched.slice(0, limit).map(c => ({ id: c.id, name: `${c.firstName||""} ${c.lastName||""}`.trim(), email: c.email || "", phone: c.phone || "", tags: c.tags || [] })) };
      }
      const pages = Array.from({ length: 50 }, (_, i) => i + 1);
      const results = await Promise.all(pages.map(p => ghlPost("/contacts/search", { locationId: LOCATION, pageLimit: 100, page: p })));
      const all = results.flatMap(d => d.contacts || []);
      const matched = all.filter(c => c.tags?.some(t => t.toLowerCase() === tag.toLowerCase()));
      return { count: matched.length, contacts: matched.slice(0, limit).map(c => ({ id: c.id, name: `${c.firstName||""} ${c.lastName||""}`.trim(), email: c.email || "", phone: c.phone || "", tags: c.tags || [] })) };
    }
    case "ghl_recent_contacts": {
      const { limit = 15 } = args;
      const data = await ghlPost("/contacts/search", { locationId: LOCATION, pageLimit: 100, page: 1 });
      return (data.contacts || [])
        .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
        .slice(0, limit)
        .map(c => ({ id: c.id, name: `${c.firstName||""} ${c.lastName||""}`.trim(), email: c.email || "", phone: c.phone || "", tags: c.tags || [], createdAt: c.dateAdded }));
    }
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
      let url = `/calendars/events?locationId=${LOCATION}&startTime=${start.getTime()}&endTime=${end.getTime()}`;
      if (calendarId) url += `&calendarId=${calendarId}`;
      const data = await ghl(url);
      return (data.events || data.listEvents || []).map(e => ({ id: e.id, title: e.title || e.name || "", startTime: e.startTime || e.start, endTime: e.endTime || e.end, location: e.location || e.address || "", description: e.notes || e.description || "", calendarId: e.calendarId, status: e.appointmentStatus || e.status || "" }));
    }
    case "ghl_get_funnels": {
      const data = await ghl(`/funnels/funnel/list?locationId=${LOCATION}&limit=50`);
      return (data.funnels || data.list || []).map(f => ({ id: f._id || f.id, name: f.name, domain: f.domain || "", pageCount: f.pageCount || 0 }));
    }
    case "ghl_get_funnel_pages": {
      const { funnelId } = args;
      const data = await ghl(`/funnels/page?funnelId=${funnelId}&locationId=${LOCATION}&limit=50`);
      return (data.pages || data.list || []).map(p => ({ id: p._id || p.id, name: p.name, path: p.path || p.slug || "", url: p.url || "" }));
    }
    case "ghl_get_blog_posts": {
      const { limit = 10 } = args;
      const blogsData = await ghl(`/blogs/posts?locationId=${LOCATION}&limit=${limit}`);
      return (blogsData.posts || blogsData.data || []).map(p => ({ id: p.id, title: p.title || "", publishedAt: p.publishedAt || p.createdAt || "", status: p.status || "", url: p.url || p.slug || "", description: p.description || p.excerpt || "" }));
    }
    case "ghl_get_campaigns": {
      const data = await ghl(`/campaigns/?locationId=${LOCATION}`);
      return (data.campaigns || []).map(c => ({ id: c.id, name: c.name, status: c.status || "", type: c.campaignType || "" }));
    }
    case "ghl_get_email_templates": {
      const data = await ghl(`/emails/builder?locationId=${LOCATION}&limit=50`);
      return (data.templates || data.data || []).map(t => ({ id: t.id, name: t.name || t.title || "", updatedAt: t.updatedAt || "" }));
    }
    case "ghl_get_surveys": {
      const data = await ghl(`/surveys/?locationId=${LOCATION}`);
      return (data.surveys || []).map(s => ({ id: s.id, name: s.name }));
    }
    case "ghl_get_trigger_links": {
      const data = await ghl(`/links/?locationId=${LOCATION}`);
      return (data.links || []).map(l => ({ id: l.id, name: l.name, url: l.redirectTo || l.url || "" }));
    }
    case "ghl_get_social_posts": {
      const { limit = 20 } = args;
      const data = await ghl(`/social-media-posting/${LOCATION}/posts?limit=${limit}`);
      return (data.posts || data.data || []).map(p => ({ id: p.id, content: p.summary || p.content || "", platform: p.platform || "", scheduledAt: p.scheduledAt || "", status: p.status || "" }));
    }
    case "ghl_get_workflows": {
      const data = await ghl(`/workflows/?locationId=${LOCATION}`);
      return (data.workflows || []).map(w => ({ id: w.id, name: w.name, status: w.status }));
    }
    case "ghl_get_forms": {
      const data = await ghl(`/forms/?locationId=${LOCATION}`);
      return (data.forms || []).map(f => ({ id: f.id, name: f.name }));
    }
    case "ghl_get_form_submissions": {
      const { formId, limit = 10 } = args;
      const data = await ghl(`/forms/submissions?locationId=${LOCATION}&formId=${formId}&limit=${limit}`);
      return data.submissions || [];
    }
    case "ghl_count_contacts": {
      const { status, tag } = args;
      const STATUS_FIELD = "pVjzZbTLHlgbSX5IVbhc";
      const pages = Array.from({ length: 50 }, (_, i) => i + 1);
      const results = await Promise.all(pages.map(p => ghlPost("/contacts/search", { locationId: LOCATION, pageLimit: 100, page: p })));
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
    // ── Tasks ─────────────────────────────────────────────────────────────────
    case "ghl_get_tasks": {
      const { contactId, limit = 20 } = args;
      if (contactId) {
        const data = await ghl(`/contacts/${contactId}/tasks`);
        return data.tasks || [];
      }
      const data = await ghl(`/contacts/tasks?locationId=${LOCATION}&limit=${limit}`);
      return data.tasks || [];
    }

    // ── Calendar Resources ────────────────────────────────────────────────────
    case "ghl_get_calendar_resources": {
      const data = await ghl(`/calendars/groups?locationId=${LOCATION}`);
      return data.groups || data.resources || data;
    }

    // ── Custom Values ─────────────────────────────────────────────────────────
    case "ghl_get_custom_values": {
      const data = await ghl(`/locations/${LOCATION}/customValues`);
      return (data.customValues || []).map(v => ({ id: v.id, name: v.name, value: v.value }));
    }

    // ── Courses ───────────────────────────────────────────────────────────────
    case "ghl_get_courses": {
      const data = await ghl(`/courses/?locationId=${LOCATION}`);
      return (data.courses || []).map(c => ({ id: c.id, title: c.title, description: c.description, isPublished: c.isPublished }));
    }

    // ── Media ─────────────────────────────────────────────────────────────────
    case "ghl_get_media": {
      const { type, limit = 20 } = args;
      let url = `/medias/?altId=${LOCATION}&altType=location&limit=${limit}`;
      if (type) url += `&type=${type}`;
      const data = await ghl(url);
      return (data.medias || data.files || []).map(m => ({ id: m.id, name: m.name, url: m.url, type: m.type, size: m.size }));
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

    // ── Associations ──────────────────────────────────────────────────────────
    case "ghl_get_associations": {
      const data = await ghl(`/associations/?locationId=${LOCATION}`);
      return data.associations || data;
    }

    // ── Documents ─────────────────────────────────────────────────────────────
    case "ghl_get_documents": {
      const { limit = 20 } = args;
      const data = await ghl(`/documents/?locationId=${LOCATION}&limit=${limit}`);
      return data.documents || data.proposals || [];
    }
    case "ghl_get_document_templates": {
      const data = await ghl(`/documents/templates?locationId=${LOCATION}`);
      return data.templates || data;
    }

    // ── Social Media Planner ──────────────────────────────────────────────────
    case "ghl_get_social_accounts": {
      const data = await ghl(`/social-media-posting/accounts?locationId=${LOCATION}`);
      return (data.accounts || []).map(a => ({ id: a.id, name: a.name, platform: a.platform, username: a.username }));
    }
    case "ghl_get_social_categories": {
      const data = await ghl(`/social-media-posting/categories?locationId=${LOCATION}`);
      return data.categories || data;
    }
    case "ghl_get_social_tags": {
      const data = await ghl(`/social-media-posting/tags?locationId=${LOCATION}`);
      return data.tags || data;
    }
    case "ghl_get_social_stats": {
      const data = await ghl(`/social-media-posting/stats?locationId=${LOCATION}`);
      return data.stats || data;
    }

    // ── Blog ──────────────────────────────────────────────────────────────────
    case "ghl_get_blog_categories": {
      const data = await ghl(`/blogs/categories/?locationId=${LOCATION}`);
      return data.categories || data;
    }
    case "ghl_get_blog_authors": {
      const data = await ghl(`/blogs/authors/?locationId=${LOCATION}`);
      return data.authors || data;
    }

    // ── Funnel Page Counts ────────────────────────────────────────────────────
    case "ghl_get_funnel_page_counts": {
      const data = await ghl(`/funnels/funnel/list?locationId=${LOCATION}&limit=50`);
      return (data.funnels || []).map(f => ({ id: f._id || f.id, name: f.name, pageCount: (f.steps || f.pages || []).length }));
    }

    // ── Email Schedules ───────────────────────────────────────────────────────
    case "ghl_get_email_schedules": {
      const data = await ghl(`/emails/schedule?locationId=${LOCATION}`);
      return data.schedules || data.data || data;
    }

    // ── LC Email ──────────────────────────────────────────────────────────────
    case "ghl_get_lc_email": {
      const data = await ghl(`/email-isv/verify?locationId=${LOCATION}`);
      return data;
    }

    // ── Conversation AI ───────────────────────────────────────────────────────
    case "ghl_get_conversation_ai": {
      const data = await ghl(`/conversation-ai/settings?locationId=${LOCATION}`);
      return data.bots || data.settings || data;
    }

    // ── Agent Studio ──────────────────────────────────────────────────────────
    case "ghl_get_agent_studio": {
      const data = await ghl(`/agent-studio/agents?locationId=${LOCATION}`);
      return data.agents || data;
    }

    // ── Voice AI ──────────────────────────────────────────────────────────────
    case "ghl_get_voice_ai_agents": {
      const data = await ghl(`/voice-ai/agents?locationId=${LOCATION}`);
      return (data.agents || []).map(a => ({ id: a.id, name: a.name, status: a.status, voiceId: a.voiceId }));
    }
    case "ghl_get_voice_ai_dashboard": {
      const data = await ghl(`/voice-ai/dashboard?locationId=${LOCATION}`);
      return data.stats || data.dashboard || data;
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
