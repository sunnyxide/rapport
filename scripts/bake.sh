#!/usr/bin/env bash
# Bake demo gallery caches (live engine, high effort) with chemistry vs Sunwoo.
# Live cold-run remains the hero; these power the instant gallery + encore fallback.
set -u
BASE="http://localhost:3011/api/persona"
ME="me-sunwoo-ju-orbt"

bake () {
  local name="$1" company="$2" url="$3" ctx="$4"
  echo "=== baking: $name ($company) ==="
  curl -sN -X POST "$BASE" -H 'Content-Type: application/json' \
    -d "{\"name\":\"$name\",\"company\":\"$company\",\"linkedin_url\":\"$url\",\"meeting_context\":\"$ctx\",\"output_lang\":\"en\",\"me_slug\":\"$ME\"}" \
    | python3 -c "import sys,json
for l in sys.stdin:
  l=l.strip()
  if not l: continue
  e=json.loads(l)
  if e.get('stage')=='done': print('  DONE',e.get('durationMs'),'ms',e.get('nSources'),'src status',e['persona'].get('status'),'chem',('y' if e.get('chemistry') else 'n'),'slug',e.get('slug'))
  elif e.get('stage')=='needs_disambiguation': print('  NEEDS_DISAMBIGUATION')
  elif e.get('stage')=='error': print('  ERROR',e.get('message'))"
}

bake "Hannah Moran" "Anthropic" "https://www.linkedin.com/in/hannahemoran/" "Orbt is meeting Anthropic Applied AI about Claude adoption and prompting best-practices."
bake "Dongjin Jang" "Anthropic" "https://www.linkedin.com/in/dongjin-jang-kr/" "Orbt is meeting about agentic / deep-research architecture on Claude."
bake "Christian Ryan" "Anthropic" "https://www.linkedin.com/in/christian-ryan-38549ab4/" "Orbt is meeting Anthropic Applied AI about prompting and Claude adoption."
bake "Yeop Lee" "Anthropic" "https://www.linkedin.com/in/yeoplee927/" "Orbt is pitching a startup partnership / Claude adoption."
echo "=== bake complete ==="
