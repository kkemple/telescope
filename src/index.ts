import './env';
import 'isomorphic-fetch';
import { ApolloClient, HttpLink, InMemoryCache, gql } from '@apollo/client';
import { parseISO, differenceInDays, formatDistance, format } from 'date-fns';

// Make into real types
type GitHubResponse = any;

const QUERY = gql`
  query GitHubData($activeSince: String) {
    organization(login: "apollographql") {
      repository(name: "apollo-tooling") {
        openIssuesForStats: issues(last: 100, states: OPEN) {
          totalCount
          nodes {
            createdAt
            updatedAt
            url
            assignees {
              totalCount
            }
            comments(first: 100) {
              totalCount
              nodes {
                createdAt
              }
            }
          }
        }
        closedIssuesForStats: issues(last: 100, states: CLOSED) {
          nodes {
            createdAt
            closedAt
            comments(first: 1) {
              nodes {
                createdAt
              }
            }
          }
        }
        topTenActiveIssues: issues(
          last: 10
          states: OPEN
          filterBy: { since: $activeSince }
        ) {
          nodes {
            updatedAt
            url
            title
            bodyText
            reactions {
              totalCount
            }
            comments {
              totalCount
            }
          }
        }
        topTenStaleIssues: issues(
          first: 10
          states: OPEN
          filterBy: { assignee: null }
        ) {
          nodes {
            title
            bodyText
            url
          }
        }
      }
    }
  }
`;

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: new HttpLink({
    uri: 'https://api.github.com/graphql',
    headers: {
      authorization: `bearer ${process.env.GITHUB_TOKEN}`,
    },
  }),
});

const generateTopTenStaleIssuesText = (staleIssues: any) => {
  const staleIssuesText: string = staleIssues.nodes.reduce(
    (mem: string, val: any) => {
      const titleWithLink = `[${val.title}](${val.url})`;
      const truncatedBody = `${val.bodyText.substr(0, 140)}`;

      return `${mem}${titleWithLink}<br />${truncatedBody}...<br /><br />`;
    },
    ''
  );

  return `
### Top Stale Issues
${staleIssuesText}
`;
};

const generateTopTenActiveIssuesText = (activeIssues: any) => {
  const activeIssuesText: string = activeIssues.nodes.reduce(
    (mem: string, val: any) => {
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
      const details = `There are ${totalCommentCount} comments on this issue, and it has ${totalReactionCount} reactions. It was last updated ${updatedAt} ago.`;

      return `${mem}${titleWithLink}<br />${details}<br />${truncatedBody}...<br /><br />`;
    },
    ''
  );

  return `
### Top Active Issues
${activeIssuesText}
`;
};

const generateAvgTimeToCloseIssuesText = (closedIssues: any) => {
  const totalDaysBetweenOpenandClose: number = closedIssues.nodes.reduce(
    (mem: number, val: any) => {
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

const generateAvgTimeSinceLastUpdateText = (openIssues: any) => {
  const totalDaysSinceLastUpdate: number = openIssues.nodes.reduce(
    (mem: number, val: any) => {
      const createdAt = parseISO(val.createdAt);
      const updatedAt = parseISO(val.updatedAt);
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

const generateAvgTimeToRespondToIssuesText = (openIssues: any) => {
  const issuesWithoutComments: any = [];
  const issuesWithComments: any[] = [];

  openIssues.nodes.map((node: any) => {
    if (node.comments.totalCount) {
      issuesWithComments.push(node);
    } else {
      issuesWithoutComments.push(node);
    }
  });

  const totalDaysBetweenFirstResponse: number = issuesWithComments.reduce(
    (mem: number, val: any) => {
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

async function main(): Promise<void> {
  try {
    const {
      data: {
        organization: { repository },
      },
    }: GitHubResponse = await client.query({ query: QUERY });

    /**
     * Number of open PRs
     * Avg time to merge PRs
     * Avg time to review PRs
     * Avg time between review and merge
     */

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

    const title = `Repo Metrics for \`apollo-tooling\` - ${format(
      new Date(),
      'MMMM do, yyyy'
    )}`;

    const report: string = `
## ${title}

- ${numberOfOpenIssues}
- ${avgTimeToRespondToIssues}
- ${avgTimeSinceLastUpdate}
- ${avgTimeToCloseIssues}

${topTenActiveIssues}

${topTenStaleIssues}
`;

    if (process.env.ZAPIER_WEBHOOK_URL) {
      fetch(process.env.ZAPIER_WEBHOOK_URL, {
        method: 'POST',
        body: JSON.stringify({ title, report }),
      });
    }
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}

main();
