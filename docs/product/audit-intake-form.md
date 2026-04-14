

# Audit Intake Form

## Purpose

This form is the transition point between the **preaudit** and the **full audit**.

Its job is to collect the minimum business context needed to turn a public-facing preaudit into a deeper, more accurate business audit.

This is the stage where a lead becomes an active consulting client.

---

## Role in the product flow

```txt
Website URL
→ Preaudit
→ Report
→ Audit Intake Form
→ Audit
→ Orchestrator
→ Specialized Agents
```

The intake form should:
- reuse everything already learned in preaudit
- ask only for the missing information needed for a better audit
- reduce friction for the client
- improve routing quality for the orchestrator

---

## Design principles

- Keep the form short enough to complete in 5–10 minutes.
- Autofill everything that can be inferred from preaudit.
- Separate **required** fields from **optional but valuable** fields.
- Use business language, not technical jargon.
- Ask for information that changes decisions, not just “nice to know” context.

---

## Form sections

### 1. Business Profile

#### Required
- Business name
- Industry
- Primary location / market
- Main business model

#### Optional
- Number of locations
- Team size
- Years in business

#### Autofill candidates
- Business name
- Industry guess
- Website
- Social profiles detected
- Location guess

#### Why this matters
This determines which audit framework applies and avoids mismatches between business type and recommendations.

---

### 2. Primary Business Goal

#### Required
- What do you want to improve first?

#### Suggested options
- More qualified leads
- More bookings / reservations
- More closed sales
- Better conversion from website traffic
- Faster response to inbound leads
- Better visibility into which channels generate revenue
- Less manual follow-up
- Better operational efficiency

#### Optional
- What would success look like in the next 90 days?

#### Why this matters
The audit should optimize for the client’s real priority, not a generic checklist.

---

### 3. Current Problems / Symptoms

#### Required
- What feels broken or inefficient today?

#### Suggested prompts
- We don’t know where good leads come from
- Follow-up is manual
- Website is not converting well
- Response times are slow
- The team is overloaded
- We lose leads between inquiry and close
- We do not have clear reporting

#### Optional
- Which of these problems is most urgent right now?

#### Why this matters
The audit should work from both external facts and internal pain signals.

---

### 4. Lead / Sales Process

#### Required
- Where do leads or inquiries come from today?
- How are they handled today?

#### Suggested fields
- Main lead sources
- First response channel
- Who follows up
- Whether there is a defined sales process

#### Optional
- Approximate response time
- Approximate close rate
- Main reasons leads do not convert

#### Why this matters
This is critical for deciding whether **sales** or **operations** should be prioritized.

---

### 5. Systems and Tools

#### Required
- What tools or systems do you currently use?

#### Suggested options
- WhatsApp
- Email
- Spreadsheets
- CRM
- Booking platform
- PMS / ERP / POS
- Google Ads
- Meta Ads
- Google Analytics
- Tag Manager

#### Optional
- Which system is the source of truth today?
- Which tools are actually used consistently?

#### Why this matters
The audit needs to know what data exists and how realistic automation or instrumentation will be.

---

### 6. Available Data

#### Required
- What business data do you currently have access to?

#### Suggested examples
- Leads
- Bookings
- Sales pipeline
- Invoices / payments
- Customer lists
- Ads reports
- Website analytics
- Call logs

#### Optional
- Format of the data (CSV, spreadsheet, CRM, PDF, etc.)
- Time period available

#### Why this matters
This determines audit depth and what later tools/modules can be used.

---

### 7. Constraints

#### Required
- What constraints should we consider?

#### Suggested prompts
- Small team
- Limited budget
- No CRM
- No time to manually manage leads
- Low confidence in current data
- Dependence on one person

#### Optional
- What can realistically change in the next 30–60 days?

#### Why this matters
A correct audit should recommend realistic next steps, not idealized ones.

---

### 8. Stakeholders / Decision Context

#### Optional but recommended
- Who will review this audit?
- Who makes implementation decisions?
- Who currently owns sales / operations / follow-up?

#### Why this matters
This makes later implementation and orchestration more realistic.

---

## Minimum viable intake

The minimum viable intake required to run a useful audit is:

- Business name
- Industry
- Main business model
- Primary business goal
- 2–3 known pains
- Current lead handling summary
- Systems currently used

If these are missing, the audit can still run, but recommendations will be less accurate.

---

## Required vs optional fields

### Required to unlock audit
- Business name
- Industry
- Main business model
- At least 1 business goal
- At least 2 known pains or symptoms
- At least 1 current system/tool
- Basic lead handling summary

### Optional but high value
- Approximate lead volume
- Approximate response time
- Main lead sources
- Team size
- Constraints
- Stakeholders
- Available exports / reports

---

## Autofill strategy

The form should autofill whenever possible from:
- preaudit validated output
- detected social profiles
- tracking markers
- website URL
- company summary
- priority alerts

### Safe autofill examples
- business name
- industry guess
- website
- detected social channels
- tracking markers
- preaudit scores
- top visible issues

### Never autofill as fact unless confirmed
- business goals
- internal pains
- actual systems in use
- close rate
- response time
- team constraints
- sales process maturity

---

## Output of the intake stage

The completed form should feed the audit ingestion layer and produce a normalized object like:

```json
{
  "company_profile": {
    "name": "Morales Propiedades",
    "industry": "real_estate",
    "business_model": "property management and rental intermediation",
    "location": "Coquimbo, Chile"
  },
  "business_goals": [
    "increase qualified inquiries",
    "improve conversion from website and WhatsApp"
  ],
  "known_pains": [
    "follow-up is mostly manual",
    "we do not know which channels bring the best leads"
  ],
  "available_assets": [
    "website",
    "whatsapp",
    "instagram"
  ],
  "available_systems": [
    "spreadsheets"
  ],
  "notes": "Primary interest is improving sales performance and commercial efficiency."
}
```

---

## UX implications

In the future product UX, this form should appear **after the preaudit report** and before the full audit.

The ideal experience is:
- show value first through preaudit
- prefill the intake form automatically
- ask the client to confirm or complete missing information
- then unlock the deeper audit

This is the moment where the prospect becomes an active consulting client.

---

## Future extensions

Later versions of this intake can support:
- file upload (CSV, PDF)
- CRM connection
- ads account connection
- calendar / booking system connection
- guided branching logic by industry

But V1 should stay focused on the minimum viable business intake.