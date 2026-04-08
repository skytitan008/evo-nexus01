#!/usr/bin/env python3
"""ADW: Weekly Review — Weekly review via Clawdia"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from runner import run_claude, banner, summary

PROMPT = """Run the full weekly review:

1. **Week's meetings** — use /int-sync-meetings with the week's period
2. **Tasks** — use /prod-review-todoist, then list completed, overdue, and next week
3. **Next week's agenda** — use /gog-calendar to list events
4. **Memory** — review the week's daily logs, consolidate decisions/learnings

Save the report in two formats:
- **HTML:** read the template '.claude/templates/html/weekly-review.html', fill all {{PLACEHOLDER}} with collected data and save to 'workspace/daily-logs/[C] YYYY-WXX-weekly-review.html'
- **MD:** also save the markdown version to 'workspace/daily-logs/[C] YYYY-WXX-weekly-review.md' using the template in .claude/templates/weekly-review.md

Create the directory 'workspace/daily-logs/' if it doesn't exist."""

def main():
    banner("📊 Weekly Review", "Meetings • Tasks • Agenda • Memory | @clawdia")
    results = []
    results.append(run_claude(PROMPT, log_name="weekly-review", timeout=900, agent="clawdia-assistant"))
    summary(results, "Weekly Review")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⚠ Cancelled.")
