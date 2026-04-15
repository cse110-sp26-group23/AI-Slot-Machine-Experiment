# AI-Slot-Machine-Experiment

**Harness:** Claude Code 
**Model:** Opus 4.6 (High)

# Notes
Other files:
- `RUBRIC.md` = rubric used to judge product quality and code quality
- `STEP1-RESULTS.md` to `STEP4-RESULTS.md` = reasoning for each narrowing round
- `FINAL-REPORT.md` = final summary of what we found
- `metrics.md` = template used for tracking each run
- 
## How We Evaluated Candidates
We used two main categories from our rubric: product and code.

For product, we looked at whether the app worked, whether the slot machine loop was clear, whether the UI made sense, and whether the AI/token joke theme actually showed up in the experience.

For code, we looked at whether the code was readable, whether it had some structure, whether HTML/CSS/JS were separated when possible, and whether the logic was understandable.

In general, the stronger candidates had better UI, clearer feedback, and a more consistent AI sarcasm theme.

## Final Winner
Our final selected candidate was:

- `step5/candidate-010-refinement-4`

### Setting up Status Line

From inside Claude Code, run `/statusline make my statusline <path to statusline-command.sh>` where the path is the absolute path to the file in this repo at `./statusline-command.sh`.