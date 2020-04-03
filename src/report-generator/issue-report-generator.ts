import outdent from 'outdent';
import { parseISO, differenceInDays, formatDistance } from 'date-fns';

type Issue = {
  title: string;
  url: string;
  bodyText: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string;
  comments: {
    totalCount: number;
    nodes: {
      createdAt: string;
    }[];
  };
  reactions: {
    totalCount: number;
  };
};

type Issues = {
  totalCount: number;
  nodes: Issue[];
};

export type RepositoryIssues = {
  name: string;
  closedIssuesForStats: Issues;
  openIssuesForStats: Issues;
  topTenStaleIssues: Issues;
  topTenActiveIssues: Issues;
};

const generateTopTenStaleIssuesText = (staleIssues: Issues) => {
  const staleIssuesText: string = staleIssues.nodes.reduce(
    (mem: string, val: Issue) => {
      const titleWithLink = `[${val.title}](${val.url})`;
      const truncatedBody = `${val.bodyText.substr(0, 140)}`;

      return `${mem}${titleWithLink}<br />${truncatedBody}...<br /><br />`;
    },
    ''
  );

  return outdent`
    **Top Stale Issues**

    ${staleIssuesText}
  `;
};

const generateTopTenActiveIssuesText = (activeIssues: Issues) => {
  const activeIssuesText: string = activeIssues.nodes.reduce(
    (mem: string, val: Issue) => {
      const titleWithLink = `[${val.title}](${val.url})`;
      const truncatedBody = `${val.bodyText.substr(0, 140)}`;
      const updatedAt = `${formatDistance(
        parseISO(val.updatedAt),
        new Date()
      )}`;
      const totalCommentCount = val.comments.totalCount
        ? val.comments.totalCount
        : 'no';
      const totalReactionCount = val.comments.totalCount
        ? val.comments.totalCount
        : 'no';
      const details = `**There are ${totalCommentCount} comments on this issue, and it has ${totalReactionCount} reactions. It was last updated ${updatedAt} ago.**`;

      return `${mem}${titleWithLink}<br />${details}<br />${truncatedBody}...<br /><br />`;
    },
    ''
  );

  return outdent`
    **Top Active Issues**

    ${activeIssuesText}
  `;
};

const generateAvgTimeToCloseIssuesText = (closedIssues: Issues) => {
  const totalDaysBetweenOpenandClose: number = closedIssues.nodes.reduce(
    (mem: number, val: Issue) => {
      return (
        mem + differenceInDays(parseISO(val.closedAt), parseISO(val.createdAt))
      );
    },
    0
  );

  const avg = totalDaysBetweenOpenandClose / closedIssues.nodes.length;

  return `On average it takes about ${Math.round(
    avg
  )} day(s) to close an issue.`;
};

const generateAvgTimeSinceLastUpdateText = (openIssues: Issues) => {
  const totalDaysSinceLastUpdate: number = openIssues.nodes.reduce(
    (mem: number, val: Issue) => {
      const createdAt: Date = parseISO(val.createdAt);
      const updatedAt: Date = parseISO(val.updatedAt);
      const diff = differenceInDays(updatedAt, createdAt);

      return mem + diff;
    },
    0
  );

  const avg = totalDaysSinceLastUpdate / openIssues.nodes.length;

  return `On average issues have not been updated in about ${Math.round(
    avg
  )} day(s).`;
};

const generateAvgTimeToRespondToIssuesText = (openIssues: Issues) => {
  const issuesWithoutComments: any = [];
  const issuesWithComments: any[] = [];

  openIssues.nodes.map((node: Issue) => {
    if (node.comments.totalCount) {
      issuesWithComments.push(node);
    } else {
      issuesWithoutComments.push(node);
    }
  });

  const totalDaysBetweenFirstResponse: number = issuesWithComments.reduce(
    (mem: number, val: Issue) => {
      return (
        mem +
        differenceInDays(
          parseISO(val.comments.nodes[0].createdAt),
          parseISO(val.createdAt)
        )
      );
    },
    0
  );

  const avg = totalDaysBetweenFirstResponse / issuesWithComments.length;

  return `On average it takes about ${Math.round(
    avg
  )} day(s) to respond to an issue. There are currently ${
    issuesWithoutComments.length
  } issues out of the last 100 that have not been responded to.`;
};

export default (repository: RepositoryIssues): string => {
  const numberOfOpenIssues: string = `There are ${repository.openIssuesForStats.totalCount} open issues currently.`;

  const avgTimeToCloseIssues: string = generateAvgTimeToCloseIssuesText(
    repository.closedIssuesForStats
  );

  const avgTimeToRespondToIssues: string = generateAvgTimeToRespondToIssuesText(
    repository.openIssuesForStats
  );

  const avgTimeSinceLastUpdate: string = generateAvgTimeSinceLastUpdateText(
    repository.openIssuesForStats
  );

  const topTenStaleIssues: string = generateTopTenStaleIssuesText(
    repository.topTenStaleIssues
  );

  const topTenActiveIssues: string = generateTopTenActiveIssuesText(
    repository.topTenActiveIssues
  );

  const report: string = outdent`
    ### Issues

    - ${numberOfOpenIssues}
    - ${avgTimeToRespondToIssues}
    - ${avgTimeSinceLastUpdate}
    - ${avgTimeToCloseIssues}

    ${topTenActiveIssues}

    ${topTenStaleIssues}
  `;

  return report;
};
