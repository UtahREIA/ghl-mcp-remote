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

async function ghlPut(path, body) {
  const res  = await fetch(`https://services.leadconnectorhq.com${path}`, { method: "PUT", headers: GHL_HEADERS, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || `GHL ${res.status}: ${path}`);
  return data;
}

async function ghlDelete(path) {
  const res = await fetch(`https://services.leadconnectorhq.com${path}`, { method: "DELETE", headers: GHL_HEADERS });
  if (res.status === 204) return { success: true };
  const data = await res.json().catch(() => ({}));
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
  // ── Tier 1: Write tools — Daily CRM operations ──────────────────────────────
  {
    name: "ghl_create_contact",
    description: "Create a new contact in GHL. At least one of email/phone is required.",
    inputSchema: {
      type: "object",
      properties: {
        firstName: { type: "string" },
        lastName:  { type: "string" },
        email:     { type: "string" },
        phone:     { type: "string", description: "E.164 format preferred (+15551234567)" },
        tags:      { type: "array", items: { type: "string" }, description: "Tags to apply on creation" },
        source:    { type: "string", description: "Source label (e.g. 'website', 'event signup')" },
      },
    },
  },
  {
    name: "ghl_update_contact",
    description: "Update fields on an existing GHL contact by ID.",
    inputSchema: {
      type: "object",
      properties: {
        contactId: { type: "string" },
        firstName: { type: "string" },
        lastName:  { type: "string" },
        email:     { type: "string" },
        phone:     { type: "string" },
        tags:      { type: "array", items: { type: "string" }, description: "Replaces existing tags" },
        customFields: { type: "array", description: "Array of {id, value} objects to update custom fields" },
      },
      required: ["contactId"],
    },
  },
  {
    name: "ghl_add_tag_to_contact",
    description: "Add one or more tags to a contact without removing existing tags.",
    inputSchema: {
      type: "object",
      properties: {
        contactId: { type: "string" },
        tags:      { type: "array", items: { type: "string" }, description: "Tags to add" },
      },
      required: ["contactId", "tags"],
    },
  },
  {
    name: "ghl_remove_tag_from_contact",
    description: "Remove one or more tags from a contact.",
    inputSchema: {
      type: "object",
      properties: {
        contactId: { type: "string" },
        tags:      { type: "array", items: { type: "string" }, description: "Tags to remove" },
      },
      required: ["contactId", "tags"],
    },
  },
  {
    name: "ghl_send_sms",
    description: "Send an SMS to a contact via GHL.",
    inputSchema: {
      type: "object",
      properties: {
        contactId: { type: "string" },
        message:   { type: "string" },
      },
      required: ["contactId", "message"],
    },
  },
  {
    name: "ghl_send_email",
    description: "Send an email to a contact via GHL.",
    inputSchema: {
      type: "object",
      properties: {
        contactId: { type: "string" },
        subject:   { type: "string" },
        html:      { type: "string", description: "HTML body" },
        text:      { type: "string", description: "Plain text body (used if html omitted)" },
        emailFrom: { type: "string", description: "From address (optional — uses location default)" },
      },
      required: ["contactId", "subject"],
    },
  },
  {
    name: "ghl_delete_contact",
    description: "DELETE a contact permanently. Requires confirm:true as a safety check.",
    inputSchema: {
      type: "object",
      properties: {
        contactId: { type: "string" },
        confirm:   { type: "boolean", description: "Must be true to proceed — prevents accidental deletion" },
      },
      required: ["contactId", "confirm"],
    },
  },

  // ── Tier 3: Write tools — Content / marketing ───────────────────────────────
  {
    name: "ghl_create_blog_post",
    description: "Create a new blog post in GHL.",
    inputSchema: {
      type: "object",
      properties: {
        blogId:      { type: "string", description: "Parent blog ID (get via ghl_get_blog_posts or ghl_get_blog_categories)" },
        title:       { type: "string" },
        rawHTML:     { type: "string", description: "Post body as HTML" },
        description: { type: "string", description: "Short description / excerpt" },
        imageUrl:    { type: "string", description: "Featured image URL" },
        urlSlug:     { type: "string" },
        author:      { type: "string", description: "Author ID (get via ghl_get_blog_authors)" },
        categories:  { type: "array", items: { type: "string" }, description: "Category IDs" },
        tags:        { type: "array", items: { type: "string" } },
        status:      { type: "string", enum: ["PUBLISHED", "DRAFT", "SCHEDULED"], description: "Default: DRAFT" },
        publishedAt: { type: "string", description: "ISO date for scheduled posts" },
      },
      required: ["blogId", "title", "rawHTML"],
    },
  },
  {
    name: "ghl_update_blog_post",
    description: "Update an existing blog post.",
    inputSchema: {
      type: "object",
      properties: {
        postId:      { type: "string" },
        blogId:      { type: "string" },
        title:       { type: "string" },
        rawHTML:     { type: "string" },
        description: { type: "string" },
        imageUrl:    { type: "string" },
        urlSlug:     { type: "string" },
        status:      { type: "string", enum: ["PUBLISHED", "DRAFT", "SCHEDULED"] },
      },
      required: ["postId", "blogId"],
    },
  },
  {
    name: "ghl_create_social_post",
    description: "Schedule a social media post via GHL Social Planner.",
    inputSchema: {
      type: "object",
      properties: {
        accountIds:  { type: "array", items: { type: "string" }, description: "Social account IDs to post from (get via ghl_get_social_accounts)" },
        summary:     { type: "string", description: "Post content" },
        scheduleDate:{ type: "string", description: "ISO datetime for scheduled posts (omit to post now)" },
        mediaUrls:   { type: "array", items: { type: "string" }, description: "Image/video URLs to attach" },
        categoryId:  { type: "string" },
        tags:        { type: "array", items: { type: "string" } },
      },
      required: ["accountIds", "summary"],
    },
  },
  {
    name: "ghl_send_document_link",
    description: "Send a document or contract signing link to a contact.",
    inputSchema: {
      type: "object",
      properties: {
        documentId:  { type: "string", description: "Document ID (get via ghl_get_documents)" },
        contactId:   { type: "string" },
        sentBy:      { type: "string", description: "User ID of sender (optional)" },
      },
      required: ["documentId", "contactId"],
    },
  },

  // ── Tier 2: Write tools — Pipeline / sales ──────────────────────────────────
  {
    name: "ghl_create_opportunity",
    description: "Create a new opportunity (deal) in a GHL pipeline.",
    inputSchema: {
      type: "object",
      properties: {
        pipelineId:      { type: "string", description: "Pipeline ID (get from ghl_get_opportunities response)" },
        pipelineStageId: { type: "string", description: "Stage ID within the pipeline" },
        name:            { type: "string", description: "Opportunity name (deal name)" },
        contactId:       { type: "string" },
        status:          { type: "string", enum: ["open", "won", "lost", "abandoned"], description: "Default: open" },
        monetaryValue:   { type: "number" },
        assignedTo:      { type: "string", description: "User ID to assign" },
        source:          { type: "string" },
        notes:           { type: "string" },
      },
      required: ["pipelineId", "pipelineStageId", "name", "contactId"],
    },
  },
  {
    name: "ghl_update_opportunity",
    description: "Update fields on an existing opportunity (name, value, status, notes, assignedTo).",
    inputSchema: {
      type: "object",
      properties: {
        opportunityId: { type: "string" },
        name:          { type: "string" },
        status:        { type: "string", enum: ["open", "won", "lost", "abandoned"] },
        monetaryValue: { type: "number" },
        assignedTo:    { type: "string" },
        notes:         { type: "string" },
      },
      required: ["opportunityId"],
    },
  },
  {
    name: "ghl_update_opportunity_stage",
    description: "Move an opportunity to a different stage in its pipeline.",
    inputSchema: {
      type: "object",
      properties: {
        opportunityId:   { type: "string" },
        pipelineStageId: { type: "string", description: "Target stage ID" },
      },
      required: ["opportunityId", "pipelineStageId"],
    },
  },

  // ── Tier 4: Write tools — Configuration ─────────────────────────────────────
  {
    name: "ghl_create_tag",
    description: "Create a new location-level tag in GHL.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Tag name" },
      },
      required: ["name"],
    },
  },
  {
    name: "ghl_update_custom_value",
    description: "Update a location-level custom value (variable) in GHL.",
    inputSchema: {
      type: "object",
      properties: {
        customValueId: { type: "string", description: "ID from ghl_get_custom_values" },
        name:          { type: "string" },
        value:         { type: "string" },
      },
      required: ["customValueId", "value"],
    },
  },
  {
    name: "ghl_create_custom_field",
    description: "Create a new custom field for contacts in this GHL location.",
    inputSchema: {
      type: "object",
      properties: {
        name:      { type: "string" },
        dataType:  { type: "string", enum: ["TEXT", "LARGE_TEXT", "NUMERICAL", "PHONE", "MONETORY", "CHECKBOX", "SINGLE_OPTIONS", "MULTIPLE_OPTIONS", "DATE", "RADIO", "TEXTBOX_LIST", "FILE_UPLOAD"], description: "Field data type" },
        position:  { type: "number", description: "Display position (optional)" },
        placeholder:{ type: "string" },
        options:   { type: "array", items: { type: "string" }, description: "Options for select/radio/checkbox fields" },
      },
      required: ["name", "dataType"],
    },
  },
  {
    name: "ghl_update_voice_ai_agent",
    description: "Update configuration of a Voice AI agent in GHL.",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string" },
        name:    { type: "string" },
        status:  { type: "string" },
        voiceId: { type: "string" },
        prompt:  { type: "string", description: "Agent system prompt / instructions" },
      },
      required: ["agentId"],
    },
  },
  {
    name: "ghl_update_agent_studio",
    description: "Update an AI agent in GHL Agent Studio.",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string" },
        name:    { type: "string" },
        status:  { type: "string" },
        prompt:  { type: "string", description: "Agent instructions" },
      },
      required: ["agentId"],
    },
  },

  // ── Extra Write: Calendar Appointments ──────────────────────────────────────
  {
    name: "ghl_create_appointment",
    description: "Book a calendar appointment for a contact.",
    inputSchema: {
      type: "object",
      properties: {
        calendarId:          { type: "string" },
        contactId:           { type: "string" },
        startTime:           { type: "string", description: "ISO datetime (e.g. 2026-05-20T14:00:00Z)" },
        endTime:             { type: "string", description: "ISO datetime" },
        title:               { type: "string" },
        appointmentStatus:   { type: "string", enum: ["new", "confirmed", "cancelled", "showed", "noshow"], description: "Default: confirmed" },
        assignedUserId:      { type: "string" },
        address:             { type: "string" },
        meetingLocationType: { type: "string", description: "e.g. 'custom', 'zoom', 'google'" },
      },
      required: ["calendarId", "contactId", "startTime", "endTime"],
    },
  },
  {
    name: "ghl_update_appointment",
    description: "Update an existing calendar appointment (reschedule, change status, etc).",
    inputSchema: {
      type: "object",
      properties: {
        eventId:           { type: "string" },
        startTime:         { type: "string" },
        endTime:           { type: "string" },
        title:             { type: "string" },
        appointmentStatus: { type: "string", enum: ["new", "confirmed", "cancelled", "showed", "noshow"] },
        assignedUserId:    { type: "string" },
        address:           { type: "string" },
      },
      required: ["eventId"],
    },
  },
  {
    name: "ghl_cancel_appointment",
    description: "Cancel (delete) a calendar appointment. Requires confirm:true.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        confirm: { type: "boolean", description: "Must be true to proceed" },
      },
      required: ["eventId", "confirm"],
    },
  },

  // ── Extra Write: Email Templates ────────────────────────────────────────────
  {
    name: "ghl_create_email_template",
    description: "Create a new email template in GHL.",
    inputSchema: {
      type: "object",
      properties: {
        name:    { type: "string" },
        subject: { type: "string" },
        html:    { type: "string", description: "Template HTML body" },
      },
      required: ["name", "html"],
    },
  },
  {
    name: "ghl_update_email_template",
    description: "Update an existing email template.",
    inputSchema: {
      type: "object",
      properties: {
        templateId: { type: "string" },
        name:       { type: "string" },
        subject:    { type: "string" },
        html:       { type: "string" },
      },
      required: ["templateId"],
    },
  },

  // ── Extra Write: Trigger Links / Media / Knowledge Base ─────────────────────
  {
    name: "ghl_create_trigger_link",
    description: "Create a trackable trigger link (used in emails/SMS that fire workflows on click).",
    inputSchema: {
      type: "object",
      properties: {
        name:       { type: "string" },
        redirectTo: { type: "string", description: "Destination URL" },
      },
      required: ["name", "redirectTo"],
    },
  },
  {
    name: "ghl_upload_media",
    description: "Upload a media file to GHL from a publicly hosted URL.",
    inputSchema: {
      type: "object",
      properties: {
        hostedUrl: { type: "string", description: "Public URL of the file to import" },
        name:      { type: "string", description: "File name (optional)" },
        parentId:  { type: "string", description: "Folder ID (optional)" },
      },
      required: ["hostedUrl"],
    },
  },
  {
    name: "ghl_create_kb_article",
    description: "Create a new knowledge base article.",
    inputSchema: {
      type: "object",
      properties: {
        title:           { type: "string" },
        content:         { type: "string", description: "Article body (HTML or markdown)" },
        knowledgeBaseId: { type: "string", description: "Parent KB ID" },
        categoryId:      { type: "string" },
        status:          { type: "string", enum: ["DRAFT", "PUBLISHED"], description: "Default: DRAFT" },
      },
      required: ["title", "content"],
    },
  },

  // ── Missing Read Tools ──────────────────────────────────────────────────────
  {
    name: "ghl_get_blogs",
    description: "List blog containers (sites) in GHL. Use this to get the blogId needed for ghl_create_blog_post.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", description: "Max results (default 50)" } },
    },
  },
  {
    name: "ghl_check_blog_slug",
    description: "Check if a blog post URL slug is available before publishing.",
    inputSchema: {
      type: "object",
      properties: {
        urlSlug: { type: "string" },
        postId:  { type: "string", description: "Existing post ID to exclude (optional, for updates)" },
      },
      required: ["urlSlug"],
    },
  },
  {
    name: "ghl_get_association_relations",
    description: "Get relations between custom objects/associations.",
    inputSchema: {
      type: "object",
      properties: {
        associationId: { type: "string", description: "Filter by association ID (optional)" },
      },
    },
  },
  {
    name: "ghl_get_voice_ai_agent_goals",
    description: "List Voice AI agent goals configured for this location.",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string", description: "Filter by agent ID (optional)" },
      },
    },
  },

  // ── Missing Write Tools ─────────────────────────────────────────────────────
  {
    name: "ghl_create_association",
    description: "Create a new association (custom object relationship type) in GHL.",
    inputSchema: {
      type: "object",
      properties: {
        key:         { type: "string", description: "Unique key for the association" },
        firstObjectLabel:  { type: "string" },
        firstObjectKey:    { type: "string" },
        secondObjectLabel: { type: "string" },
        secondObjectKey:   { type: "string" },
      },
      required: ["key", "firstObjectKey", "secondObjectKey"],
    },
  },
  {
    name: "ghl_create_association_relation",
    description: "Create a relation between two records using an existing association.",
    inputSchema: {
      type: "object",
      properties: {
        associationId: { type: "string" },
        firstRecordId: { type: "string" },
        secondRecordId:{ type: "string" },
      },
      required: ["associationId", "firstRecordId", "secondRecordId"],
    },
  },
  {
    name: "ghl_create_course",
    description: "Create a new course in GHL.",
    inputSchema: {
      type: "object",
      properties: {
        title:       { type: "string" },
        description: { type: "string" },
        isPublished: { type: "boolean", description: "Default: false (draft)" },
      },
      required: ["title"],
    },
  },
  {
    name: "ghl_update_course",
    description: "Update an existing GHL course.",
    inputSchema: {
      type: "object",
      properties: {
        courseId:    { type: "string" },
        title:       { type: "string" },
        description: { type: "string" },
        isPublished: { type: "boolean" },
      },
      required: ["courseId"],
    },
  },
  {
    name: "ghl_update_form",
    description: "Update a GHL form's name or settings.",
    inputSchema: {
      type: "object",
      properties: {
        formId: { type: "string" },
        name:   { type: "string" },
      },
      required: ["formId"],
    },
  },
  {
    name: "ghl_create_product",
    description: "Create a new product in GHL (used for order forms / e-commerce).",
    inputSchema: {
      type: "object",
      properties: {
        name:        { type: "string" },
        productType: { type: "string", enum: ["DIGITAL", "PHYSICAL", "SERVICE"], description: "Default: DIGITAL" },
        description: { type: "string" },
        image:       { type: "string", description: "Product image URL" },
        availableInStore: { type: "boolean" },
      },
      required: ["name"],
    },
  },
  {
    name: "ghl_update_product",
    description: "Update an existing product.",
    inputSchema: {
      type: "object",
      properties: {
        productId:   { type: "string" },
        name:        { type: "string" },
        description: { type: "string" },
        image:       { type: "string" },
        availableInStore: { type: "boolean" },
      },
      required: ["productId"],
    },
  },
  {
    name: "ghl_create_product_price",
    description: "Create a new price for an existing product.",
    inputSchema: {
      type: "object",
      properties: {
        productId: { type: "string" },
        name:      { type: "string", description: "Price tier name (e.g. 'Monthly', 'Annual')" },
        amount:    { type: "number", description: "Price in cents (e.g. 9900 = $99.00)" },
        currency:  { type: "string", description: "ISO currency code (default: USD)" },
        type:      { type: "string", enum: ["one_time", "recurring"], description: "Default: one_time" },
      },
      required: ["productId", "name", "amount"],
    },
  },
  {
    name: "ghl_create_product_collection",
    description: "Create a new product collection (grouping of products).",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        slug: { type: "string", description: "URL slug for the collection" },
      },
      required: ["name"],
    },
  },
  {
    name: "ghl_update_saas_subscription",
    description: "Update SaaS subscription settings for a sub-account.",
    inputSchema: {
      type: "object",
      properties: {
        planId: { type: "string" },
        status: { type: "string", description: "active, paused, cancelled, etc." },
      },
    },
  },
  {
    name: "ghl_create_social_category",
    description: "Create a new social media post category in GHL Social Planner.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
      },
      required: ["name"],
    },
  },
  {
    name: "ghl_create_social_tag",
    description: "Create a new social media tag in GHL Social Planner.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
      },
      required: ["name"],
    },
  },
  {
    name: "ghl_cancel_email_schedule",
    description: "Cancel a scheduled email send.",
    inputSchema: {
      type: "object",
      properties: {
        scheduleId: { type: "string" },
        confirm:    { type: "boolean", description: "Must be true to proceed" },
      },
      required: ["scheduleId", "confirm"],
    },
  },
  {
    name: "ghl_send_document_template_link",
    description: "Send a contract template signing link to a contact (uses a template).",
    inputSchema: {
      type: "object",
      properties: {
        templateId: { type: "string", description: "Document template ID (get via ghl_get_document_templates)" },
        contactId:  { type: "string" },
      },
      required: ["templateId", "contactId"],
    },
  },
  {
    name: "ghl_update_voice_ai_agent_goal",
    description: "Update a Voice AI agent goal configuration.",
    inputSchema: {
      type: "object",
      properties: {
        goalId:      { type: "string" },
        name:        { type: "string" },
        description: { type: "string" },
        prompt:      { type: "string" },
      },
      required: ["goalId"],
    },
  },
  {
    name: "ghl_update_conversation_ai",
    description: "Update Conversation AI (bot) settings for this location.",
    inputSchema: {
      type: "object",
      properties: {
        botId:   { type: "string", description: "Bot/agent ID" },
        name:    { type: "string" },
        prompt:  { type: "string", description: "System prompt for the bot" },
        enabled: { type: "boolean" },
      },
    },
  },
  {
    name: "ghl_create_social_oauth_url",
    description: "Generate an OAuth URL for connecting a new social media integration. Returns a URL the user must visit in their browser to complete the connection.",
    inputSchema: {
      type: "object",
      properties: {
        platform: { type: "string", enum: ["facebook", "instagram", "google", "linkedin", "tiktok", "twitter"], description: "Social platform to connect" },
      },
      required: ["platform"],
    },
  },

  // ── Ad Publishing ───────────────────────────────────────────────────────────
  {
    name: "ghl_publish_ad",
    description: "Publish a paid ad through GHL's ad publishing feature (Facebook/Instagram ads).",
    inputSchema: {
      type: "object",
      properties: {
        accountIds:      { type: "array", items: { type: "string" }, description: "Ad account IDs (get via ghl_get_social_accounts)" },
        primaryText:     { type: "string", description: "Main ad copy" },
        headline:        { type: "string", description: "Ad headline" },
        description:     { type: "string", description: "Ad description" },
        destinationUrl:  { type: "string", description: "URL the ad clicks through to" },
        mediaUrls:       { type: "array", items: { type: "string" }, description: "Image/video URLs for the ad creative" },
        callToAction:    { type: "string", description: "CTA button label (e.g. LEARN_MORE, SIGN_UP, SHOP_NOW)" },
        budget:          { type: "number", description: "Budget amount" },
        startDate:       { type: "string", description: "ISO datetime for ad start" },
        endDate:         { type: "string", description: "ISO datetime for ad end (optional)" },
      },
      required: ["accountIds", "primaryText", "destinationUrl"],
    },
  },

  // ── Users & Businesses ──────────────────────────────────────────────────────
  {
    name: "ghl_get_users",
    description: "List GHL users (sub-account team members) for this location.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_get_businesses",
    description: "List businesses associated with this GHL location.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghl_create_business",
    description: "Create a new business record in GHL.",
    inputSchema: {
      type: "object",
      properties: {
        name:        { type: "string" },
        phone:       { type: "string" },
        email:       { type: "string" },
        website:     { type: "string" },
        address:     { type: "string" },
        city:        { type: "string" },
        state:       { type: "string" },
        country:     { type: "string" },
        postalCode:  { type: "string" },
        description: { type: "string" },
      },
      required: ["name"],
    },
  },
  {
    name: "ghl_update_business",
    description: "Update an existing business record by ID.",
    inputSchema: {
      type: "object",
      properties: {
        businessId:  { type: "string" },
        name:        { type: "string" },
        phone:       { type: "string" },
        email:       { type: "string" },
        website:     { type: "string" },
        address:     { type: "string" },
        city:        { type: "string" },
        state:       { type: "string" },
        country:     { type: "string" },
        postalCode:  { type: "string" },
        description: { type: "string" },
      },
      required: ["businessId"],
    },
  },

  {
    name: "ghl_get_attribution_report",
    description: "Aggregate attribution report across all contacts. 'sessionSource' (recommended) reads lastAttributionSource.medium — the most populated field, showing values like Organic Search, Direct traffic, Client Portal, CRM UI. 'tag' groups by contact tags. 'leadSource' reads a Lead Source custom field. 'referrer' shows referring hostnames. 'campaign' reads UTM campaign (sparse unless UTMs are set up).",
    inputSchema: {
      type: "object",
      properties: {
        groupBy: {
          type: "string",
          enum: ["sessionSource", "tag", "leadSource", "referrer", "campaign"],
          description: "Dimension to group by. Default: sessionSource",
        },
      },
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
      // GHL returns one of: { messages: [...] }  OR  { messages: { messages: [...], lastMessageId, nextPage } }
      const msgs = Array.isArray(data.messages)
        ? data.messages
        : (data.messages?.messages || Object.values(data.messages || {}).filter(v => v && typeof v === "object" && v.id));
      return msgs.map(m => ({
        id: m.id,
        type: m.messageType || m.type,
        body: m.body || m.text || "",
        subject: m.subject || "",
        direction: m.direction,
        status: m.status || "",
        dateAdded: m.dateAdded,
      }));
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

    // ── Attribution Report ────────────────────────────────────────────────────
    case "ghl_get_attribution_report": {
      const { groupBy = "sessionSource" } = args;

      // Fetch all contacts across all pages
      const pages = Array.from({ length: 50 }, (_, i) => i + 1);
      const results = await Promise.all(pages.map(p => ghlPost("/contacts/search", { locationId: LOCATION, pageLimit: 100, page: p })));
      const all = results.flatMap(d => d.contacts || []);

      // Aggregate a single string key per contact
      function aggregateSingle(contacts, getKey) {
        const counts = {};
        let untracked = 0;
        for (const c of contacts) {
          const v = getKey(c);
          if (!v) { untracked++; continue; }
          counts[v] = (counts[v] || 0) + 1;
        }
        const sorted = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([label, contacts]) => ({ label, contacts }));
        if (untracked) sorted.push({ label: "(untracked)", contacts: untracked });
        return sorted;
      }

      // Aggregate multiple keys per contact (e.g. tags)
      function aggregateMulti(contacts, getKeys) {
        const counts = {};
        let untracked = 0;
        for (const c of contacts) {
          const keys = getKeys(c);
          if (!keys.length) { untracked++; continue; }
          for (const k of keys) counts[k] = (counts[k] || 0) + 1;
        }
        const sorted = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([label, contacts]) => ({ label, contacts }));
        if (untracked) sorted.push({ label: "(untracked)", contacts: untracked });
        return sorted;
      }

      const report = { totalContacts: all.length, groupBy };

      if (groupBy === "sessionSource") {
        // lastAttributionSource.sessionSource is the populated field in GHL —
        // values: "Organic Search", "Direct traffic", "Client Portal", "CRM UI / Manual", "Other / Phone API"
        report.breakdown = aggregateSingle(all, c => {
          const last = c.lastAttributionSource || {};
          const first = c.attributionSource || {};
          return last.sessionSource || first.sessionSource || last.medium || last.source || first.medium || first.source || "";
        });
        report.note = "Based on lastAttributionSource.sessionSource. 'Direct traffic' includes GHL SMS workflow link clicks (not true direct). ~50% of contacts may show as untracked if added via call/manual entry.";

      } else if (groupBy === "tag") {
        report.breakdown = aggregateMulti(all, c => c.tags || []);

      } else if (groupBy === "leadSource") {
        report.breakdown = aggregateSingle(all, c => {
          const f = (c.customFields || []).find(f =>
            (f.fieldKey || f.name || "").toLowerCase().includes("lead") ||
            (f.fieldKey || f.name || "").toLowerCase().includes("source")
          );
          return f?.value || "";
        });

      } else if (groupBy === "referrer") {
        report.breakdown = aggregateSingle(all, c => {
          const r = (c.lastAttributionSource || c.attributionSource || {}).referrer || "";
          if (!r) return "";
          try { return new URL(r).hostname; } catch { return r; }
        });

      } else if (groupBy === "campaign") {
        report.breakdown = aggregateSingle(all, c => {
          const last = c.lastAttributionSource || {};
          const first = c.attributionSource || {};
          return last.utmCampaign || last.campaign || first.utmCampaign || first.campaign || "";
        });
        report.note = "UTM campaign fields are null unless external links are tagged with ?utm_campaign=...";
      }

      return report;
    }

    // ── Tier 1 Write: Contacts ────────────────────────────────────────────────
    case "ghl_create_contact": {
      const { firstName, lastName, email, phone, tags, source } = args;
      if (!email && !phone) throw new Error("ghl_create_contact requires at least one of email or phone");
      const body = { locationId: LOCATION };
      if (firstName) body.firstName = firstName;
      if (lastName)  body.lastName  = lastName;
      if (email)     body.email     = email;
      if (phone)     body.phone     = phone;
      if (tags)      body.tags      = tags;
      if (source)    body.source    = source;
      const data = await ghlPost("/contacts/", body);
      return data.contact || data;
    }

    case "ghl_update_contact": {
      const { contactId, ...fields } = args;
      const body = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined && v !== null) body[k] = v;
      }
      const data = await ghlPut(`/contacts/${contactId}`, body);
      return data.contact || data;
    }

    case "ghl_add_tag_to_contact": {
      const { contactId, tags } = args;
      const data = await ghlPost(`/contacts/${contactId}/tags`, { tags });
      return data;
    }

    case "ghl_remove_tag_from_contact": {
      const { contactId, tags } = args;
      // GHL's tag-removal endpoint uses DELETE with a body — fetch directly
      const res = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/tags`, {
        method: "DELETE",
        headers: GHL_HEADERS,
        body: JSON.stringify({ tags }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `GHL ${res.status}: remove tags`);
      return data;
    }

    case "ghl_delete_contact": {
      const { contactId, confirm } = args;
      if (confirm !== true) throw new Error("Refusing to delete: pass confirm:true to proceed");
      return await ghlDelete(`/contacts/${contactId}`);
    }

    // ── Tier 1 Write: Messaging ───────────────────────────────────────────────
    case "ghl_send_sms": {
      const { contactId, message } = args;
      const data = await ghlPost("/conversations/messages", {
        type: "SMS",
        contactId,
        message,
      });
      return data;
    }

    case "ghl_send_email": {
      const { contactId, subject, html, text, emailFrom } = args;
      const body = {
        type: "Email",
        contactId,
        subject,
      };
      if (html) body.html = html;
      if (text) body.message = text;
      if (emailFrom) body.emailFrom = emailFrom;
      const data = await ghlPost("/conversations/messages", body);
      return data;
    }

    // ── Tier 3 Write: Blog ────────────────────────────────────────────────────
    case "ghl_create_blog_post": {
      const { blogId, title, rawHTML, description, imageUrl, urlSlug, author, categories, tags, status = "DRAFT", publishedAt } = args;
      const body = {
        locationId: LOCATION,
        blogId,
        title,
        rawHTML,
        status,
      };
      if (description) body.description = description;
      if (imageUrl)    body.imageUrl    = imageUrl;
      if (urlSlug)     body.urlSlug     = urlSlug;
      if (author)      body.author      = author;
      if (categories)  body.categories  = categories;
      if (tags)        body.tags        = tags;
      if (publishedAt) body.publishedAt = publishedAt;
      const data = await ghlPost("/blogs/posts", body);
      return data.blogPost || data;
    }

    case "ghl_update_blog_post": {
      const { postId, ...fields } = args;
      const body = { locationId: LOCATION };
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined && v !== null) body[k] = v;
      }
      const data = await ghlPut(`/blogs/posts/${postId}`, body);
      return data.blogPost || data;
    }

    // ── Tier 3 Write: Social ──────────────────────────────────────────────────
    case "ghl_create_social_post": {
      const { accountIds, summary, scheduleDate, mediaUrls, categoryId, tags } = args;
      const body = {
        accountIds,
        summary,
        type: scheduleDate ? "scheduled" : "now",
      };
      if (scheduleDate) body.scheduleDate = scheduleDate;
      if (mediaUrls)    body.mediaUrls    = mediaUrls;
      if (categoryId)   body.categoryId   = categoryId;
      if (tags)         body.tags         = tags;
      const data = await ghlPost(`/social-media-posting/${LOCATION}/posts`, body);
      return data.post || data;
    }

    // ── Tier 3 Write: Documents ───────────────────────────────────────────────
    case "ghl_send_document_link": {
      const { documentId, contactId, sentBy } = args;
      const body = {
        locationId: LOCATION,
        contactId,
      };
      if (sentBy) body.sentBy = sentBy;
      const data = await ghlPost(`/documents/${documentId}/send`, body);
      return data;
    }

    // ── Tier 2 Write: Opportunities ───────────────────────────────────────────
    case "ghl_create_opportunity": {
      const { pipelineId, pipelineStageId, name: oppName, contactId, status = "open", monetaryValue, assignedTo, source, notes } = args;
      const body = {
        locationId: LOCATION,
        pipelineId,
        pipelineStageId,
        name: oppName,
        contactId,
        status,
      };
      if (monetaryValue !== undefined) body.monetaryValue = monetaryValue;
      if (assignedTo) body.assignedTo = assignedTo;
      if (source)     body.source     = source;
      if (notes)      body.notes      = notes;
      const data = await ghlPost("/opportunities/", body);
      return data.opportunity || data;
    }

    case "ghl_update_opportunity": {
      const { opportunityId, ...fields } = args;
      const body = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined && v !== null) body[k] = v;
      }
      const data = await ghlPut(`/opportunities/${opportunityId}`, body);
      return data.opportunity || data;
    }

    case "ghl_update_opportunity_stage": {
      const { opportunityId, pipelineStageId } = args;
      const data = await ghlPut(`/opportunities/${opportunityId}`, { pipelineStageId });
      return data.opportunity || data;
    }

    // ── Tier 4 Write: Configuration ───────────────────────────────────────────
    case "ghl_create_tag": {
      const data = await ghlPost(`/locations/${LOCATION}/tags`, { name: args.name });
      return data.tag || data;
    }

    case "ghl_update_custom_value": {
      const { customValueId, name: cvName, value } = args;
      const body = { value };
      if (cvName) body.name = cvName;
      const data = await ghlPut(`/locations/${LOCATION}/customValues/${customValueId}`, body);
      return data.customValue || data;
    }

    case "ghl_create_custom_field": {
      const { name: fName, dataType, position, placeholder, options } = args;
      const body = { name: fName, dataType };
      if (position !== undefined) body.position = position;
      if (placeholder) body.placeholder = placeholder;
      if (options)     body.options     = options;
      const data = await ghlPost(`/locations/${LOCATION}/customFields`, body);
      return data.customField || data;
    }

    case "ghl_update_voice_ai_agent": {
      const { agentId, ...fields } = args;
      const body = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined && v !== null) body[k] = v;
      }
      const data = await ghlPut(`/voice-ai/agents/${agentId}`, body);
      return data.agent || data;
    }

    case "ghl_update_agent_studio": {
      const { agentId, ...fields } = args;
      const body = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined && v !== null) body[k] = v;
      }
      const data = await ghlPut(`/agent-studio/agents/${agentId}`, body);
      return data.agent || data;
    }

    // ── Extra Write: Calendar Appointments ────────────────────────────────────
    case "ghl_create_appointment": {
      const { calendarId, contactId, startTime, endTime, title, appointmentStatus = "confirmed", assignedUserId, address, meetingLocationType } = args;
      const body = {
        locationId: LOCATION,
        calendarId,
        contactId,
        startTime,
        endTime,
        appointmentStatus,
      };
      if (title)               body.title               = title;
      if (assignedUserId)      body.assignedUserId      = assignedUserId;
      if (address)             body.address             = address;
      if (meetingLocationType) body.meetingLocationType = meetingLocationType;
      const data = await ghlPost("/calendars/events/appointments", body);
      return data.event || data.appointment || data;
    }

    case "ghl_update_appointment": {
      const { eventId, ...fields } = args;
      const body = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined && v !== null) body[k] = v;
      }
      const data = await ghlPut(`/calendars/events/appointments/${eventId}`, body);
      return data.event || data.appointment || data;
    }

    case "ghl_cancel_appointment": {
      const { eventId, confirm } = args;
      if (confirm !== true) throw new Error("Refusing to cancel: pass confirm:true to proceed");
      return await ghlDelete(`/calendars/events/${eventId}`);
    }

    // ── Extra Write: Email Templates ──────────────────────────────────────────
    case "ghl_create_email_template": {
      const { name: tName, subject, html } = args;
      const body = { locationId: LOCATION, name: tName, html };
      if (subject) body.subject = subject;
      const data = await ghlPost("/emails/builder", body);
      return data.template || data.data || data;
    }

    case "ghl_update_email_template": {
      const { templateId, ...fields } = args;
      const body = { locationId: LOCATION };
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined && v !== null) body[k] = v;
      }
      const data = await ghlPut(`/emails/builder/${templateId}`, body);
      return data.template || data;
    }

    // ── Extra Write: Trigger Links ────────────────────────────────────────────
    case "ghl_create_trigger_link": {
      const { name: linkName, redirectTo } = args;
      const data = await ghlPost("/links/", { locationId: LOCATION, name: linkName, redirectTo });
      return data.link || data;
    }

    // ── Extra Write: Media Upload ─────────────────────────────────────────────
    case "ghl_upload_media": {
      const { hostedUrl, name: mediaName, parentId } = args;
      const formData = new FormData();
      formData.append("hosted", "true");
      formData.append("fileUrl", hostedUrl);
      if (mediaName) formData.append("name", mediaName);
      if (parentId)  formData.append("parentId", parentId);
      const res = await fetch(`https://services.leadconnectorhq.com/medias/upload-file?locationId=${LOCATION}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Version: "2021-07-28",
        },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `GHL ${res.status}: upload media`);
      return data;
    }

    // ── Extra Write: Knowledge Base Article ───────────────────────────────────
    case "ghl_create_kb_article": {
      const { title: kbTitle, content, knowledgeBaseId, categoryId, status = "DRAFT" } = args;
      const body = {
        locationId: LOCATION,
        title: kbTitle,
        content,
        status,
      };
      if (knowledgeBaseId) body.knowledgeBaseId = knowledgeBaseId;
      if (categoryId)      body.categoryId      = categoryId;
      const data = await ghlPost("/knowledge-base/", body);
      return data.article || data;
    }

    // ── Missing Read Tools ────────────────────────────────────────────────────
    case "ghl_get_blogs": {
      const { limit = 50 } = args;
      const data = await ghl(`/blogs/site?locationId=${LOCATION}&limit=${limit}&skip=0`);
      return (data.data || data.blogs || []).map(b => ({
        id: b._id || b.id,
        name: b.name || b.title || "",
        urlSlug: b.urlSlug || "",
        description: b.description || "",
      }));
    }

    case "ghl_check_blog_slug": {
      const { urlSlug, postId } = args;
      let url = `/blogs/posts/url-slug-exists?locationId=${LOCATION}&urlSlug=${encodeURIComponent(urlSlug)}`;
      if (postId) url += `&postId=${postId}`;
      const data = await ghl(url);
      return { available: !data.exists, ...data };
    }

    case "ghl_get_association_relations": {
      const { associationId } = args;
      let url = `/associations/relations?locationId=${LOCATION}`;
      if (associationId) url += `&associationId=${associationId}`;
      const data = await ghl(url);
      return data.relations || data;
    }

    case "ghl_get_voice_ai_agent_goals": {
      const { agentId } = args;
      let url = agentId
        ? `/voice-ai/agents/${agentId}/goals`
        : `/voice-ai/agent-goals?locationId=${LOCATION}`;
      const data = await ghl(url);
      return data.goals || data;
    }

    // ── Missing Write Tools ───────────────────────────────────────────────────
    case "ghl_create_association": {
      const body = { locationId: LOCATION, ...args };
      const data = await ghlPost("/associations/", body);
      return data.association || data;
    }

    case "ghl_create_association_relation": {
      const body = { locationId: LOCATION, ...args };
      const data = await ghlPost("/associations/relations", body);
      return data.relation || data;
    }

    case "ghl_create_course": {
      const { title, description, isPublished = false } = args;
      const body = { locationId: LOCATION, title, isPublished };
      if (description) body.description = description;
      const data = await ghlPost("/courses/", body);
      return data.course || data;
    }

    case "ghl_update_course": {
      const { courseId, ...fields } = args;
      const body = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined && v !== null) body[k] = v;
      }
      const data = await ghlPut(`/courses/${courseId}`, body);
      return data.course || data;
    }

    case "ghl_update_form": {
      const { formId, ...fields } = args;
      const body = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined && v !== null) body[k] = v;
      }
      const data = await ghlPut(`/forms/${formId}`, body);
      return data.form || data;
    }

    case "ghl_create_product": {
      const { name: pName, productType = "DIGITAL", description, image, availableInStore } = args;
      const body = { locationId: LOCATION, name: pName, productType };
      if (description)              body.description       = description;
      if (image)                    body.image             = image;
      if (availableInStore !== undefined) body.availableInStore = availableInStore;
      const data = await ghlPost("/products/", body);
      return data.product || data;
    }

    case "ghl_update_product": {
      const { productId, ...fields } = args;
      const body = { locationId: LOCATION };
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined && v !== null) body[k] = v;
      }
      const data = await ghlPut(`/products/${productId}`, body);
      return data.product || data;
    }

    case "ghl_create_product_price": {
      const { productId, name: priceName, amount, currency = "USD", type = "one_time" } = args;
      const body = {
        locationId: LOCATION,
        name: priceName,
        amount,
        currency,
        type,
      };
      const data = await ghlPost(`/products/${productId}/price`, body);
      return data.price || data;
    }

    case "ghl_create_product_collection": {
      const { name: cName, slug } = args;
      const body = { locationId: LOCATION, name: cName };
      if (slug) body.slug = slug;
      const data = await ghlPost("/products/collections/", body);
      return data.collection || data;
    }

    case "ghl_update_saas_subscription": {
      const body = {};
      for (const [k, v] of Object.entries(args)) {
        if (v !== undefined && v !== null) body[k] = v;
      }
      const data = await ghlPut(`/saas/location/${LOCATION}`, body);
      return data;
    }

    case "ghl_create_social_category": {
      const data = await ghlPost(`/social-media-posting/categories?locationId=${LOCATION}`, { name: args.name });
      return data.category || data;
    }

    case "ghl_create_social_tag": {
      const data = await ghlPost(`/social-media-posting/tags?locationId=${LOCATION}`, { name: args.name });
      return data.tag || data;
    }

    case "ghl_cancel_email_schedule": {
      const { scheduleId, confirm } = args;
      if (confirm !== true) throw new Error("Refusing to cancel: pass confirm:true to proceed");
      return await ghlDelete(`/emails/schedule/${scheduleId}`);
    }

    case "ghl_send_document_template_link": {
      const { templateId, contactId } = args;
      const data = await ghlPost(`/documents/templates/${templateId}/send`, {
        locationId: LOCATION,
        contactId,
      });
      return data;
    }

    case "ghl_update_voice_ai_agent_goal": {
      const { goalId, ...fields } = args;
      const body = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined && v !== null) body[k] = v;
      }
      const data = await ghlPut(`/voice-ai/goals/${goalId}`, body);
      return data.goal || data;
    }

    case "ghl_update_conversation_ai": {
      const body = { locationId: LOCATION };
      for (const [k, v] of Object.entries(args)) {
        if (v !== undefined && v !== null) body[k] = v;
      }
      const data = await ghlPut(`/conversation-ai/settings`, body);
      return data.settings || data;
    }

    case "ghl_create_social_oauth_url": {
      const { platform } = args;
      // GHL returns an OAuth start URL that the user opens in a browser
      const data = await ghl(`/social-media-posting/oauth/${platform}/start?locationId=${LOCATION}`);
      return {
        platform,
        oauthUrl: data.url || data.oauthUrl || data,
        instructions: "Open this URL in a browser to complete the OAuth connection. Once authorized, the social account will appear in ghl_get_social_accounts.",
      };
    }

    // ── Ad Publishing ─────────────────────────────────────────────────────────
    case "ghl_publish_ad": {
      const { accountIds, primaryText, headline, description, destinationUrl, mediaUrls, callToAction, budget, startDate, endDate } = args;
      const body = {
        locationId: LOCATION,
        accountIds,
        primaryText,
        destinationUrl,
      };
      if (headline)       body.headline       = headline;
      if (description)    body.description    = description;
      if (mediaUrls)      body.mediaUrls      = mediaUrls;
      if (callToAction)   body.callToAction   = callToAction;
      if (budget)         body.budget         = budget;
      if (startDate)      body.startDate      = startDate;
      if (endDate)        body.endDate        = endDate;
      const data = await ghlPost(`/ad-publishing/${LOCATION}/ads`, body);
      return data.ad || data;
    }

    // ── Users & Businesses ────────────────────────────────────────────────────
    case "ghl_get_users": {
      const data = await ghl(`/users/search?companyId=&locationId=${LOCATION}`);
      return (data.users || []).map(u => ({
        id: u.id,
        name: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
        email: u.email || "",
        phone: u.phone || "",
        role: u.roles?.role || u.role || "",
        type: u.type || "",
      }));
    }

    case "ghl_get_businesses": {
      const data = await ghl(`/businesses/?locationId=${LOCATION}`);
      return (data.businesses || []).map(b => ({
        id: b.id,
        name: b.name,
        phone: b.phone || "",
        email: b.email || "",
        website: b.website || "",
        address: b.address || "",
      }));
    }

    case "ghl_create_business": {
      const body = { locationId: LOCATION };
      for (const [k, v] of Object.entries(args)) {
        if (v !== undefined && v !== null) body[k] = v;
      }
      const data = await ghlPost("/businesses/", body);
      return data.business || data;
    }

    case "ghl_update_business": {
      const { businessId, ...fields } = args;
      const body = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined && v !== null) body[k] = v;
      }
      const data = await ghlPut(`/businesses/${businessId}`, body);
      return data.business || data;
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
