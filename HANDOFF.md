# Desk & Day AI Sales Assistant — Handoff (Bryan G)

Demo store password: `owheat`  
Store: https://1mfsbv-dg.myshopify.com/

## Live URLs

| App | URL |
|---|---|
| Chat client | https://shopify-ai-sales-assistant.vercel.app/ |
| Admin panel | https://shopify-ai-sales-assistant-34sp.vercel.app/ |
| API | https://shopify-ai-sales-assistant-54i6.vercel.app/ |
| Widget script | https://shopify-ai-sales-assistant.vercel.app/widget.js |
| Widget demo | https://shopify-ai-sales-assistant.vercel.app/embed-demo.html |
| API health | https://shopify-ai-sales-assistant-54i6.vercel.app/api/health |

**Admin login:** `admin@deskday.com` / `Admin@123`

---

## 1) Install widget on the Shopify demo store

1. Shopify Admin → **Online Store → Themes → … → Edit code**
2. Open `layout/theme.liquid`
3. Paste **before** `</body>`:

```html
<!-- Desk & Day AI assistant -->
<script
  src="https://shopify-ai-sales-assistant.vercel.app/widget.js"
  data-position="right"
  data-color="#a67c52"
  defer
></script>
```

4. Save → hard refresh the storefront (password page: `owheat`).
5. You should see a floating chat button (bottom-right).

Optional attributes: `data-position="left"`, `data-color="#a67c52"`, `data-ink="#1a1714"`.

Copy the same script anytime from **Admin → Settings → Embed widget**.

---

## 2) Conversation logging (admin)

Every shopper message is saved to Supabase (`shopify_store_database_conversations` + `shopify_store_database_messages`).

1. Open **Admin → Conversations**
2. Click a thread to read the full chat (shopper + AI + human replies)
3. Threads refresh automatically; use **Refresh** if needed

If a chat is missing: confirm the client/widget is hitting the live API (`…-54i6.vercel.app`) and that you sent at least one message.

---

## 3) Human escalation

Shopper can say e.g. *“Can I speak with a person?”*

What happens:
1. AI confirms escalation (does **not** refuse)
2. Conversation status → `handed_off`
3. A lead row is created/updated (follow-up contact)
4. Admin sees the thread under **Conversations** with status **handed off**
5. Admin types a reply → shopper receives it in the widget (polls every ~6s) labeled **Human operator**

Admin can also **Mark handed off** / **Resolve** from the thread panel.

---

## 4) Lead capture

AI collects **one field at a time**: name → email → phone → short note.

Leads appear in **Admin → Leads** (status: new / contacted / qualified).

Triggers include: contact requests, handoff, or interest in follow-up.

---

## 5) Update products & FAQs

1. **Admin → Knowledge Base**
   - Add/edit title, type (`product` / `policy` / `faq`), price, description, image, sort order
   - Mark **trained** when ready for the assistant
2. **Admin → Products** — quick view of product rows
3. Chat uses the database on every reply (no redeploy needed for content)

Images: upload in Knowledge Base, or keep files in Supabase Storage / API `/products/…`.

---

## 6) Configure API / keep demo running for recording

### Already configured (production)
- OpenAI key + model on the API Vercel project
- Supabase URL + service role on the API
- Client/admin call API URL hardcoded to `https://shopify-ai-sales-assistant-54i6.vercel.app`

### Before recording checklist
1. Open API health — `supabaseOk: true`, `hasOpenAIKey: true`, `products: 3`
2. Open admin → Knowledge shows 3 products + policies/FAQs
3. Send a test chat → appears in **Conversations**
4. Ask for a human → status **handed off** → reply from admin → appears in widget
5. Shopify theme has the widget script (section 1)

### Keep it running
- Vercel keeps client, admin, and API live (no laptop needed)
- Do not rotate/delete OpenAI or Supabase keys mid-recording
- OpenAI needs available credits

### Local (optional)
```bash
# server
cd server && npm i && cp .env.example .env   # fill secrets
npm run db:migrate && npm run db:migrate:messages && npm run db:seed
npm run dev

# client / admin
cd client && npm i && npm run dev
cd admin && npm i && npm run dev
```

---

## 7) Suggested tutorial script prompts

- What can I get for a desk setup under $100?
- Does the keyboard work with an iPad?
- What are the sample shipping and return rules?
- Can I speak with a person?
- (Admin) Open Conversations → reply as human
- (Admin) Knowledge Base → tweak an FAQ → ask again in chat

---

## Repo

https://github.com/Waqas56jb/shopify-ai-sales-assistant
