import { formatRepoGrant, parseRepoGrant } from './ProjectGitHubSettings';

let failures = 0;

const check = (label: string, condition: boolean, detail?: unknown) => {
  if (!condition) {
    failures += 1;
    console.error(`FAIL ${label}`, detail ?? '');
  } else {
    console.log(`ok ${label}`);
  }
};

const grant = parseRepoGrant(
  '{"permissions":["metadata","contents","issues","pull_requests"],"selection":"selected"}',
) as { permissions?: string[]; selection?: string };

check(
  'repo grant parser preserves permissions',
  Array.isArray(grant.permissions) && grant.permissions.includes('issues'),
  grant,
);
check('repo grant parser preserves selection', grant.selection === 'selected', grant);
check('empty repo grant becomes null', parseRepoGrant('') === null);
check(
  'repo grant formatter exposes repo_grant_json content',
  formatRepoGrant({ permissions: ['metadata'] }).includes('"permissions"'),
);

let invalidJsonFailed = false;
try {
  parseRepoGrant('{invalid');
} catch {
  invalidJsonFailed = true;
}
check('invalid repo grant JSON is rejected before submit', invalidJsonFailed);

if (failures > 0) process.exit(1);
