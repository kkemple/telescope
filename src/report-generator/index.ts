import outdent from 'outdent'

import generatePRsReportForRepository from './pr-report-generator'
import generateIssuesReportForRepository from './issue-report-generator'

import type { RepositoryPRs } from './pr-report-generator'
import type { RepositoryIssues } from './issue-report-generator'

type Repository = RepositoryPRs & RepositoryIssues

const generateReportForRepository = (repository: Repository): string => {
  const title = `## ${repository.name}`;
  const prsReport = generatePRsReportForRepository(repository);
  const issuesReport = generateIssuesReportForRepository(repository);

  const report: string = outdent`
    ${title}

    ${prsReport}

    ${issuesReport}

    ___
  `;

  return report;
};

export default generateReportForRepository;
