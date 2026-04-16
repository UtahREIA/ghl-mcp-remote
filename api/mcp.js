// /api/mcp.js
//
// Remote MCP server for GoHighLevel — connects to claude.ai integrations.
//
// Required env vars (set in Vercel):
//   GHL_API_KEY      — GHL Private Integration key
//   GHL_LOCATION_ID  — GHL Location ID
//
// Optional env vars:
//   MCP_SECRET       — Bearer token claude.ai sends in Authorization header

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const TOKEN    = process.env.GHL_API_KEY;
const LOCATION = process.env.GHL_LOCATION_ID;

const GHL_HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
  Version: "2021-07-28",
};

const BASE = "https://services.leadconnectorhq.com";

async function ghl(path) {
  const res  = await fetch(`${BASE}${path}`, { headers: GHL_HEADERS });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || `GHL ${res.status}: ${path}`);
  return data;
}

function text(obj) {
  return { content: [{ type: "text", text: JSON.stringify(obj, null, 2) }] };
}

function createServer() {
  const server = new McpServer({ name: "ghl", version: "1.0.0" });

  // ── Search contacts ─────────────────────────────────────────────────────────
  server.tool(
    "ghl_search_contacts",
    "Search GHL contacts by name, email, or phone. Returns id, name, email, phone, tags, and custom fields.",
    {
      query: z.string().describe("Name, email, or phone to search for"),
      limit: z.number().optional().default(10),
    },
    async ({ query, limit }) => {
      const data = await ghl(
        `/contacts/search?locationId=${LOCATION}&query=${encodeURIComponent(query)}&page=1&pageLimit=${limit}`
      );
      return text((data.contacts || []).map(c => ({
        id:           c.id,
        name:         c.name  || "",
        email:        c.email || "",
        phone:        c.phone || "",
        tags:         c.tags  || [],
        memberStatus: c.memberStatus || "",
        customFields: c.customFields || [],
        createdAt:    c.dateAdded,
      })));
    }
  );

  // ── Get full contact details ────────────────────────────────────────────────
  server.tool(
    "ghl_get_contact",
    "Get full details for a GHL contact by ID — all fields, tags, custom values, and metadata.",
    { contactId: z.string() },
    async ({ contactId }) => {
      const data = await ghl(`/contacts/${contactId}`);
      return text(data.contact || data);
    }
  );

  // ── List contacts by tag ────────────────────────────────────────────────────
  server.tool(
    "ghl_contacts_by_tag",
    "List GHL contacts that have a specific tag (e.g. 'Active Member', 'Lead', 'Subscriber').",
    {
      tag:   z.string().describe("Tag name to filter by"),
      limit: z.number().optional().default(20),
    },
    async ({ tag, limit }) => {
      const data = await ghl(
        `/contacts/?locationId=${LOCATION}&tags=${encodeURIComponent(tag)}&limit=${limit}`
      );
      return text((data.contacts || []).map(c => ({
        id:    c.id,
        name:  c.name  || "",
        email: c.email || "",
        phone: c.phone || "",
        tags:  c.tags  || [],
      })));
    }
  );

  // ── Get recent contacts ─────────────────────────────────────────────────────
  server.tool(
    "ghl_recent_contacts",
    "Get the most recently added contacts in GHL.",
    { limit: z.number().optional().default(15) },
    async ({ limit }) => {
      const data = await ghl(
        `/contacts/?locationId=${LOCATION}&limit=${limit}&sortBy=date_added&sortOrder=desc`
      );
      return text((data.contacts || []).map(c => ({
        id:        c.id,
        name:      c.name  || "",
        email:     c.email || "",
        phone:     c.phone || "",
        tags:      c.tags  || [],
        createdAt: c.dateAdded,
      })));
    }
  );

  // ── Get contact conversations ───────────────────────────────────────────────
  server.tool(
    "ghl_get_conversations",
    "Get recent conversations for a GHL contact. Shows SMS, email, and call history.",
    {
      contactId: z.string().describe("GHL contact ID"),
      limit:     z.number().optional().default(10),
    },
    async ({ contactId, limit }) => {
      const data = await ghl(
        `/conversations/search?locationId=${LOCATION}&contactId=${contactId}&limit=${limit}`
      );
      return text(data.conversations || []);
    }
  );

  // ── Get pipeline opportunities ──────────────────────────────────────────────
  server.tool(
    "ghl_get_opportunities",
    "Get opportunities from a GHL pipeline. Shows deal name, stage, value, contact, and status.",
    {
      pipelineId: z.string().optional().describe("Pipeline ID — omit to get all"),
      status:     z.enum(["open", "won", "lost", "abandoned"]).optional().default("open"),
      limit:      z.number().optional().default(20),
    },
    async ({ pipelineId, status, limit }) => {
      let url = `/opportunities/search?location_id=${LOCATION}&status=${status}&limit=${limit}`;
      if (pipelineId) url += `&pipeline_id=${pipelineId}`;
      const data = await ghl(url);
      return text((data.opportunities || []).map(o => ({
        id:            o.id,
        name:          o.name,
        stage:         o.pipelineStage?.name || "",
        monetaryValue: o.monetaryValue,
        status:        o.status,
        contact:       { id: o.contact?.id, name: o.contact?.name },
        assignedTo:    o.assignedTo,
        createdAt:     o.createdAt,
      })));
    }
  );

  // ── Get custom fields ───────────────────────────────────────────────────────
  server.tool(
    "ghl_get_custom_fields",
    "List all custom field definitions for this GHL location — field names, keys, and types.",
    {},
    async () => {
      const data = await ghl(`/locations/${LOCATION}/customFields`);
      return text((data.customFields || []).map(f => ({
        id:   f.id,
        name: f.name,
        key:  f.fieldKey,
        type: f.dataType,
      })));
    }
  );

  // ── Get tags ────────────────────────────────────────────────────────────────
  server.tool(
    "ghl_get_tags",
    "List all tags used in this GHL location.",
    {},
    async () => {
      const data = await ghl(`/locations/${LOCATION}/tags`);
      return text(data.tags || []);
    }
  );

  // ── Get location info ───────────────────────────────────────────────────────
  server.tool(
    "ghl_get_location_info",
    "Get general info about this GHL location — name, address, timezone, settings.",
    {},
    async () => {
      const data = await ghl(`/locations/${LOCATION}`);
      return text(data.location || data);
    }
  );

  // ── Get workflows ───────────────────────────────────────────────────────────
  server.tool(
    "ghl_get_workflows",
    "List all GHL workflows for this location — names, statuses, and IDs.",
    {},
    async () => {
      const data = await ghl(`/workflows/?locationId=${LOCATION}`);
      return text((data.workflows || []).map(w => ({
        id:     w.id,
        name:   w.name,
        status: w.status,
      })));
    }
  );

  // ── Get forms ───────────────────────────────────────────────────────────────
  server.tool(
    "ghl_get_forms",
    "List all GHL forms for this location — names and IDs.",
    {},
    async () => {
      const data = await ghl(`/forms/?locationId=${LOCATION}`);
      return text((data.forms || []).map(f => ({
        id:   f.id,
        name: f.name,
      })));
    }
  );

  // ── Get form submissions ────────────────────────────────────────────────────
  server.tool(
    "ghl_get_form_submissions",
    "Get recent submissions for a specific GHL form.",
    {
      formId: z.string().describe("GHL form ID"),
      limit:  z.number().optional().default(10),
    },
    async ({ formId, limit }) => {
      const data = await ghl(
        `/forms/submissions?locationId=${LOCATION}&formId=${formId}&limit=${limit}`
      );
      return text(data.submissions || []);
    }
  );

  return server;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id");

  if (req.method === "OPTIONS") return res.status(200).end();

  // Optional bearer token auth
  const secret = process.env.MCP_SECRET;
  if (secret) {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const server    = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless — no session tracking needed
    });

    res.on("finish", () => server.close().catch(() => {}));

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("[GHL-MCP]", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
