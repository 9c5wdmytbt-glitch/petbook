# 2. 30-day validation plan (inside the US$5,000 ceiling)

Status: **proposal.** None of this money is committed. Each spending line needs your approval before anyone spends it. No contractors have been identified, and no meetings have been booked.

## 2.1 Founder time: the 1 hour a week is not enough for 30 days

Twelve interviews at about 40 minutes each, plus introductions and four decision reviews, comes to **about 11 to 12 hours in the month**. One hour a week gives you 4 to 5 hours.

Choose one:

| Option | Founder time | Calendar | Recommendation |
|---|---|---|---|
| A. Compressed | About 3 hours a week for 4 weeks (about 12 hours, valued at US$4,560) | 30 days | Use this if you can protect the time. You learn fastest by hearing the buyers yourself. |
| B. Stretched | 1 to 1.5 hours a week | 8 to 10 weeks | Same work at a slower pace. The risk is losing momentum. |
| C. Delegated | About 1 hour a week (introductions and decisions only) | 30 days | Needs a credible interviewer, such as a senior company secretary on contract. Not yet identified. Weakest evidence. |

**My recommendation is Option A.** The plan below assumes it.

## 2.2 Cash allocation (planning ceilings, not quotes)

| # | Line | Ceiling (US$) | Notes | Owner |
|---|---|---:|---|---|
| 1 | Pilot operator: a part-time person to run assisted pilot minutes (transcript QA, drafting, evidence links, delivery) | 1,800 | Roughly 50 to 60 hours. Rate unknown until sourced. Spent only once a pilot is signed. | Founder approves; operator to be identified |
| 2 | Speech-to-text and LLM API usage for demos and pilots | 300 | Typical metered rates should keep the cost per recorded hour in single dollars. Verify the chosen provider's price and data terms first. | Claude prepares; founder approves the account |
| 3 | Demo recording: synthetic board meeting read by volunteers, plus basic mic | 150 | Uses the synthetic script in `demo/`. Get a written consent note from each reader. | Founder arranges readers |
| 4 | Demo polish: a simple clickable evidence-linked minutes viewer | 600 | Claude can build a local version at no cash cost. Spend only if a contractor needs to host or polish it. | Claude, then contractor if needed |
| 5 | Data-protection and pilot-terms review (Botswana DPA 2024, processor terms, provider terms) | 600 | Your firm can draft. Reserve covers a second opinion or any regulator fees. | Founder / AJA |
| 6 | Admin: domain, business email, file storage with a Botswana copy, e-signature | 300 | Only once the venture vehicle is decided. | Founder approves |
| 7 | Interview costs: travel, coffee | 250 | | Founder |
| 8 | Contingency | 1,000 | Held back. Release only by your decision. | Founder |
| | **Total** | **5,000** | | |

**Cash coming back:** three pilots at the US$600 hypothesis would return US$1,800 (before tax and fees). This is a test result, not a forecast.

**Direct cost of a pilot meeting:** operator time of 2 to 3 hours plus API costs of about US$5 per meeting means the US$100-per-meeting pilot price is roughly break-even. That is acceptable for validation. It is **not** acceptable at scale. The pilot must show the operator time falling.

## 2.3 Week-by-week plan

| Week | Activities | Owner | Output |
|---|---|---|---|
| 0 (now) | Review this pack. Confirm Option A, B or C. Write a list of 20 candidate buyers (name, firm, roughly how many client boards). Approve the outreach text. Confirm the venture vehicle and conflict approach (see 2.4). | Founder (about 1.5 hours) | Prospect list, approvals |
| 1 | You send 15 to 20 personal introductions (drafts in `07-outreach-drafts.md`). Claude logs responses and prepares a one-page brief for each booked interview. Volunteers record the synthetic demo meeting. | Founder sends; Claude prepares | First 4 interviews booked; demo audio |
| 2 | Interviews 1 to 6 using the script. No pitch until the final section. Claude runs the demo audio through a speech-to-text API (once you approve the account) and produces evidence-linked minutes. | Founder interviews; Claude builds the demo | 6 scored interviews; working demo |
| 3 | Interviews 7 to 12. Show the demo at the end of each qualified interview. Make the pilot offer to everyone who scores "hot". Draft a data-processing addendum. | Founder; AJA for terms | 12 interviews; pilot offers out |
| 4 | Follow up on the offers. Sign and invoice the pilots. Hold the first pilot kickoff (baseline timing of the current method). Hold the decision review against the gates. | Founder; operator once engaged | Decision: proceed, change or stop |

**Weekly 30-minute decision review:** Claude prepares a one-page scorecard (interviews completed, scores, objections, offers made, money received, spend to date). You decide.

## 2.4 Things that need settling before the first interview

1. **Separate vehicle and hat.** Approach prospects as the founder of a separate venture, not as their attorney. Do not use any client's confidential information to target or pitch them. Check whether Law Society of Botswana conduct rules restrict your involvement or soliciting from firm clients. *Not reviewed here.*
2. **Real recordings.** No pilot customer's real board audio is processed until three things are in place: a signed pilot agreement with a data-processing addendum, the customer's confirmation that participants were notified, and a provider route that satisfies the Data Protection Act, 2024 position on transfers and on keeping a local copy. Until then, use only the synthetic demo.
3. **Provider terms.** The chosen speech-to-text and LLM providers must not train on customer data, and their retention must be known. Check this before any real audio is sent.

## 2.5 What Claude can and cannot do

**Claude can:** prepare all scripts, briefs, scorecards, demo outputs, a local prototype viewer, draft terms and analysis.

**Claude cannot:** send messages, book meetings, sign up for paid services, take payments, or run interviews. It also cannot reach several vendor websites from this environment; BoardPro, Diligent and BusinessTech were blocked.
