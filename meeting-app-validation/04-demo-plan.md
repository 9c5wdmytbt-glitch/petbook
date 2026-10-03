# 4. Minimal demonstration plan

**Goal:** within 10 minutes at the end of an interview, show a buyer what lands in their inbox, and make them point at what is wrong with it. We are not demonstrating a product. We are testing whether the output is worth paying for.

## 4.1 What exists today (be explicit with buyers)

| Element | Status |
|---|---|
| Agenda, script and hand-prepared target minutes (`demo/`) | **Done.** Synthetic, hand-made |
| Recording of the synthetic meeting | **Not done.** Needs 5 to 6 volunteer readers, one room, one laptop or conference mic, and a Teams call for the "remote" director. About 30 minutes |
| Machine transcript of that recording | **Not done.** Needs an approved speech-to-text API account (cost: a few dollars) |
| Machine-drafted, evidence-linked minutes | **Not done.** Claude can produce this from the transcript using an LLM, then mark every place a human had to correct it |
| Clickable viewer (click a reference to play the audio) | **Not done.** Claude can build a local single-file HTML viewer. Hosting needs your approval |
| Word export in a client template | **Not done.** Claude can produce a .docx in the AJA house layout as a stand-in for a client template |
| Software a customer can log into | **Does not exist.** Not needed for validation |

## 4.2 Steps

1. **Record (week 1).** Volunteers read `demo/02-synthetic-transcript.md` naturally: interruptions allowed, one reader on Teams, real room noise. Each reader signs a one-line consent: "I agree to my voice being recorded for a product demonstration and test data set, which I can ask to have deleted."
2. **Transcribe (week 2).** Run the recording through one speech-to-text provider with diarisation (speaker separation) and word timestamps. Keep the raw output unedited.
3. **Draft (week 2).** Generate minutes against the agenda using the rules in the Development Prompt: facts first, every statement referenced, "not established" where the evidence is missing.
4. **Measure (week 2).** Time how long a careful human takes to correct the machine draft into the quality of `demo/03`. Count the errors: wrong decision, wrong vote, wrong name, wrong amount, invented fact, missed action. **This is our first real data point on editing effort.** Report it honestly even if it is bad.
5. **Package (week 2).** Show three things side by side: the raw transcript, the machine draft with its flags, and the corrected minutes in Word. Include one honest slide: "Here is what the machine got wrong."

## 4.3 The traps the demo deliberately contains

| Trap | Segment | Correct behaviour |
|---|---|---|
| Late joiner who was absent for one item | S10, S12, S18 | Attendance recorded per item |
| Declared conflict and withdrawal | S11 | Declaration minuted; director excluded from item 5 |
| Correction of previous minutes (an amount) | S06 | Correct figure carried through |
| Proposal that looks like a decision but was deferred | S14–S16 | "Deferred". No award minuted |
| Split vote, and a request to record it as unanimous | S21–S24 | Votes recorded as cast; instruction ignored |
| Vague deadline and a tentative owner | S17 | Date shown as inferred, owner flagged |
| Name slip | S16 | Flagged, not guessed silently |
| Setswana phrase | S20 | Flagged for translation |
| Inaudible audio | S26 | Gap shown; nothing invented |

**What would impress a company secretary is these traps handled correctly, not fluent prose.**
