// Writes the unit-test coverage summary as a Markdown table (for the GitHub job summary).
// Coverage is reported only and never fails the build (implementation plan §1).
import { readFileSync } from 'node:fs';

const GOAL = 80;
const { total } = JSON.parse(readFileSync('coverage/app/coverage-summary.json', 'utf8'));

const rows = ['lines', 'statements', 'branches', 'functions'].map((metric) => {
  const { pct, covered, total: count } = total[metric];
  const mark = metric === 'lines' ? (pct >= GOAL ? ' ✅' : ' ⚠️') : '';
  return `| ${metric} | ${pct} %${mark} | ${covered} / ${count} |`;
});

console.log(
  [
    `### Unit test coverage (soft goal: ${GOAL} % lines)`,
    '',
    '| Metric | Coverage | Covered |',
    '|--------|----------|---------|',
    ...rows,
  ].join('\n'),
);
