import * as core from '@actions/core';
import * as github from '@actions/github';

async function run() {
  // Configuration parameters
  const token = core.getInput('repo-token', { required: true });
  // A client to load data from GitHub
  const issues = await findIssues(token)
  issues.forEach(issue => {
    const issue_number = issue.number

    const issue_date = issue.created_at

    const addLabel: string[] = []

    if(issueHasLabel(issue, 'Production')) {
      // Accessbilility Issues we missed and are in production already:
      if(issueHasLabel(issue, 'Blocker') && isOlderThan4Weeks(issue_date)) {
        addLabel.push('CAT1')
      } else if(issueHasLabel(issue, 'Critical') && isOlderThan10Weeks(issue_date)) {
        addLabel.push('CAT2')
      } else if(issueHasLabel(issue, 'Serious') && isOlderThan20Weeks(issue_date)) {
        addLabel.push('CAT3')
      } else if(issueHasLabel(issue, 'Moderate') && isOlderThan30Weeks(issue_date)) {
        addLabel.push('CAT4')
      }  
    } else if (issueHasLabel(issue, 'Released')) {
      // Accessibility Issues we created in release cycle:
      if((issueHasLabel(issue, 'Blocker') || issueHasLabel(issue, 'Critical') || issueHasLabel(issue, 'Serious'))) {
        addLabel.push('CAT0')
      } else if(issueHasLabel(issue, 'Moderate') && isOlderThan10Weeks(issue_date)) {
        addLabel.push('CAT2')
      }
    }
    
    if (addLabel.length > 0) {
      console.log(`Adding labels ${addLabel.toString()} to issue #${issue_number}`)
      addLabels(token, issue_number, addLabel)
    }
    
  });
}

function issueHasLabel(issue, label: string): number | undefined {
  if (issue) {
    return issue.labels.find(
      ({name: name}) => name === label
    );
  }
  return
}

async function findIssues(token: string) {
  const issues = await github.getOctokit(token).paginate(
    github.getOctokit(token).rest.issues.listForRepo,
    {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      labels: 'A11Y',
      state: 'open'
    });

  return issues;
}

async function addLabels(
  token: string,
  issue_number: number,
  labels: string[]
) {

  await github.getOctokit(token).rest.issues.addLabels({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: issue_number,
    labels: labels
  });
}

function isOlderThan4Weeks(issue_date: string) {
  const fourWeeksAgo = new Date().getTime() - (4*7*24*60*60*1000)
  console.log(`Comparing issue_date ${issue_date} to 4 weeks ago ${fourWeeksAgo}`)
  return Date.parse(issue_date) < fourWeeksAgo
}

function isOlderThan10Weeks(issue_date: string) {  
  const tenWeeksAgo = new Date().getTime() - (10*7*24*60*60*1000)
  console.log(`Comparing issue_date ${issue_date} to 10 weeks ago ${tenWeeksAgo}`)
  return Date.parse(issue_date) < tenWeeksAgo
}

function isOlderThan20Weeks(issue_date: string) {  
  const twentyWeeksAgo = new Date().getTime() - (20*7*24*60*60*1000)
  console.log(`Comparing issue_date ${issue_date} to 20 weeks ago ${twentyWeeksAgo}`)
  return Date.parse(issue_date) < twentyWeeksAgo
}

function isOlderThan30Weeks(issue_date: string) { 
  const thirtyWeeksAgo = new Date().getTime() - (30*7*24*60*60*1000)
  console.log(`Comparing issue_date ${issue_date} to 30 weeks ago ${thirtyWeeksAgo}`)
  return Date.parse(issue_date) < thirtyWeeksAgo
}

run();

