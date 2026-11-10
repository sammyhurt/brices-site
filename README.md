# Meredith & Bernie: hotel partnerships

Public site and private admin for Meredith & Bernie Brice's hotel content partnerships.

- **Site:** a scroll-scrubbed hero video, then About, Quiet luxury, Past partnerships (Willow Tree House, Catskills and Casa Bianca, each with its own page and photo lightbox), Couples content (links to TikTok), Reach, Ideas to film, The package, an inquiry form and the media kit PDF.
- **Admin:** open `/admin` and enter the Meredith Studio passcode. It has three tabs: Hotel pipeline, Site visits and Settings.

All copy and numbers come from the media kit. To change them, edit `src/site/data.ts`.

## How it connects

| Piece | Where |
| --- | --- |
| Visits, inquiries, admin | n8n workflow "Brices — Site visits and admin" (webhooks `brices-visit`, `brices-admin`) |
| Daily hotel scan | n8n workflow "Brices — Hotel scan (daily)", runs at 10:41 AM New York time and drafts only |
| Sending and replies | n8n workflow "Brices — Send approved emails and track replies". It stays off until Meredith's Gmail is connected |
| Data | n8n tables Brices Prospects, Brices Visits and Brices Settings |
| Inquiry form | Netlify Forms (form name `inquiry`), with a copy saved to the admin as an inbound lead |

## Go live

1. Create a GitHub repo, push this folder to it, and import the repo into Netlify. Netlify reads the build settings from `netlify.toml`.
2. In Netlify, go to Forms and turn on email notifications for the `inquiry` form so that Meredith gets an email for each inquiry.
3. When the domain is ready, add it in Netlify. Then open `/admin`, go to Settings and enter the site address.
4. In Settings, also enter the mailing address. The law requires a postal address in marketing emails.
5. In n8n, connect Meredith's Gmail as a new credential named "Meredith Gmail":
   1. Select it on the **Send Email** and **Find Replies** nodes.
   2. Turn both nodes back on.
   3. Publish the workflow.
6. In the admin, open Settings and turn sending on.

## Develop

```
npm install
npm run dev
```
