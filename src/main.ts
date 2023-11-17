import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import assert from 'assert';
import * as yaml from 'js-yaml';

async function run() {
  // Configuration parameters
  const token = getRequiredInput('repo-token');
  const metricsEnabled: boolean = await getMeticsEnabled(token);
  if (!metricsEnabled) {
    console.log('Metrics are not enabled, exiting.')
    return;
  }

  const LABELS = {
    A11Y: getRequiredInput('label-a11y'),
    BLOCKER: getRequiredInput('label-blocker'),
    CRITICAL: getRequiredInput('label-critical'),
    SERIOUS: getRequiredInput('label-serious'),
    MODERATE: getRequiredInput('label-moderate'),
    PRODUCTION: getRequiredInput('label-production'),
    RELEASED: getRequiredInput('label-released'),
  };

  // A client to load data from GitHub
  const issues = await findIssues(token, LABELS.A11Y)
  issues.forEach(issue => {
    const issue_number = issue.number

    const issue_date = issue.created_at

    const addLabel: string[] = []

    if(issueHasLabel(issue, LABELS.PRODUCTION)) {
      // Accessbilility Issues we missed and are in production already:
      if(issueHasLabel(issue, LABELS.BLOCKER) && isOlderThan4Weeks(issue_number, issue_date)) {
        addLabel.push('CAT1')
      } else if(issueHasLabel(issue, LABELS.CRITICAL) && isOlderThan10Weeks(issue_number, issue_date)) {
        addLabel.push('CAT2')
      } else if(issueHasLabel(issue, LABELS.SERIOUS) && isOlderThan20Weeks(issue_number, issue_date)) {
        addLabel.push('CAT3')
      } else if(issueHasLabel(issue, LABELS.MODERATE) && isOlderThan30Weeks(issue_number, issue_date)) {
        addLabel.push('CAT4')
      }  
    } else if (issueHasLabel(issue, LABELS.RELEASED)) {
      // Accessibility Issues we created in release cycle:
      if((issueHasLabel(issue, LABELS.BLOCKER) || issueHasLabel(issue, LABELS.CRITICAL) || issueHasLabel(issue, LABELS.SERIOUS))) {
        addLabel.push('CAT0')
      } else if(issueHasLabel(issue, LABELS.MODERATE) && isOlderThan10Weeks(issue_number, issue_date)) {
        addLabel.push('CAT2')
      }
    }
    
    if (addLabel.length > 0) {
      console.log(`Adding labels ${addLabel.toString()} to issue #${issue_number}`)
      addLabels(token, issue_number, addLabel)
    }
    
  });
}

function getRequiredInput(name: string): string {
  return core.getInput(name, { required: true });
}

function issueHasLabel(issue, label: string): number | undefined {
  if (issue) {
    return issue.labels.find(
      ({name: name}) => name === label
    );
  }
  return
}

async function findIssues(token: string, labels: string) {
  const issues = await getOctokit(token).paginate(
    getOctokit(token).rest.issues.listForRepo,
    {
      owner: context.repo.owner,
      repo: context.repo.repo,
      labels,
      state: 'open'
    });

  return issues;
}

async function addLabels(
  token: string,
  issue_number: number,
  labels: string[]
) {

  await getOctokit(token).rest.issues.addLabels({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: issue_number,
    labels: labels
  });
}

function isOlderThan4Weeks(issue_number: number, issue_date: string) {
  const fourWeeksAgo = new Date().getTime() - (4*7*24*60*60*1000)
  console.log(`Comparing issue ${issue_number} issue_date ${issue_date} : ${Date.parse(issue_date)} to 30 weeks ago ${new Date(fourWeeksAgo)} : ${fourWeeksAgo}`)
  return Date.parse(issue_date) < fourWeeksAgo
}

function isOlderThan10Weeks(issue_number: number, issue_date: string) {  
  const tenWeeksAgo = new Date().getTime() - (10*7*24*60*60*1000)
  console.log(`Comparing issue ${issue_number} issue_date ${issue_date} : ${Date.parse(issue_date)} to 30 weeks ago ${new Date(tenWeeksAgo)} : ${tenWeeksAgo}`)
  return Date.parse(issue_date) < tenWeeksAgo
}

function isOlderThan20Weeks(issue_number: number, issue_date: string) {  
  const twentyWeeksAgo = new Date().getTime() - (20*7*24*60*60*1000)
  console.log(`Comparing issue ${issue_number} issue_date ${issue_date} : ${Date.parse(issue_date)} to 30 weeks ago ${new Date(twentyWeeksAgo)} : ${twentyWeeksAgo}`)
  return Date.parse(issue_date) < twentyWeeksAgo
}

function isOlderThan30Weeks(issue_number: number, issue_date: string) { 
  const thirtyWeeksAgo = new Date().getTime() - (30*7*24*60*60*1000)
  console.log(`Comparing issue ${issue_number} issue_date ${issue_date} : ${Date.parse(issue_date)} to 30 weeks ago ${new Date(thirtyWeeksAgo)} : ${thirtyWeeksAgo}`)
  return Date.parse(issue_date) < thirtyWeeksAgo
}

interface ConfigObject {
  enabled: boolean;
}

async function getMeticsEnabled(
  token: string
): Promise<boolean> {
  const supportedFileExtensions = ['yaml', 'yml'];
  const result = false;

  for (const fileExtension of supportedFileExtensions) {
    const filePath = `.github/a11y-metrics.${fileExtension}`;
    const content = await fetchContent(token, filePath);

    if (content) {
      try {
        const configObject = yaml.load(content) as ConfigObject;
        
        assert.ok(
          configObject,
          `Invalid configuration in ${filePath}`
        )
        assert.strictEqual(
          typeof configObject.enabled,
          'boolean',
          `Invalid "enabled" property in ${filePath}`
        )

        return configObject.enabled;
      } catch (error) {
        console.log(`Invalid yaml in ${filePath}`)
      }
    }
  }

  return result;
}

async function fetchContent(
  token: string,
  path: string
): Promise<string | undefined> {
  try {
    const response: any = await getOctokit(token).rest.repos.getContent({
      owner: context.repo.owner,
      repo: context.repo.repo,
      path,
      ref: context.sha
    });
    return Buffer.from(response.data.content, response.data.encoding).toString();
  } catch (error) {
    return;
  }
}

run();
